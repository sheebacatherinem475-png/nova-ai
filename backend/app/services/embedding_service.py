import os
import chromadb
from google import genai
from app.core.config import settings

CHROMA_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'chroma_db')

# Use PersistentClient for local ChromaDB storage
try:
    chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = chroma_client.get_or_create_collection(name="documents")
except Exception as e:
    print(f"Warning: Failed to initialize ChromaDB. Make sure it is installed. Error: {e}")
    collection = None

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200):
    """Simple text chunker."""
    chunks = []
    start = 0
    text_length = len(text)
    while start < text_length:
        end = min(start + chunk_size, text_length)
        chunks.append(text[start:end])
        if end == text_length:
            break
        start += chunk_size - overlap
    return chunks

def store_document_chunks(doc_id: str, filename: str, text: str):
    if collection is None:
        return
        
    chunks = chunk_text(text)
    if not chunks:
        return
        
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    embeddings = []
    ids = []
    metadatas = []
    documents = []
    
    # Process chunks in small batches if there are many, but for simplicity, we iterate
    # Gemini embed_content supports batching depending on the client version.
    for i, chunk in enumerate(chunks):
        chunk_id = f"{doc_id}_{i}"
        
        response = client.models.embed_content(
            model='gemini-embedding-2',
            contents=chunk,
        )
        
        embeddings.append(response.embeddings[0].values)
        ids.append(chunk_id)
        # We store filename and page_number (fake for now if txt, we can improve later)
        # We will use doc_id to delete easily
        metadatas.append({
            "doc_id": doc_id,
            "filename": filename,
            "chunk_index": i
        })
        documents.append(chunk)
        
    collection.add(
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )

def retrieve_relevant_chunks(query: str, top_k: int = 5):
    if collection is None:
        return []
        
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    response = client.models.embed_content(
        model='gemini-embedding-2',
        contents=query,
    )
    query_embedding = response.embeddings[0].values
    
    # We must ensure there are documents in the collection, else it throws
    if collection.count() == 0:
        return []
        
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count())
    )
    
    retrieved = []
    if results and results.get('documents') and results['documents'][0]:
        for i, doc in enumerate(results['documents'][0]):
            meta = results['metadatas'][0][i]
            retrieved.append({
                "text": doc,
                "filename": meta.get("filename", "Unknown"),
                "doc_id": meta.get("doc_id", "")
            })
            
    return retrieved

def delete_document_chunks(doc_id: str):
    if collection is None:
        return
    collection.delete(
        where={"doc_id": doc_id}
    )

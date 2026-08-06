import os
import sys

# Patch sqlite3 for ChromaDB on platforms with older SQLite versions (like Render)
try:
    __import__('pysqlite3')
    sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')
except ImportError:
    pass

import chromadb
from google import genai
from app.core.config import settings

CHROMA_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'chroma_db')

# Use PersistentClient for local ChromaDB storage
chroma_init_error = None
try:
    chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = chroma_client.get_or_create_collection(name="documents")
except Exception as e:
    print(f"Warning: Failed to initialize ChromaDB. Make sure it is installed. Error: {e}")
    chroma_init_error = str(e)
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

import time

def _embed_with_retry(client, contents: str, model: str = 'gemini-embedding-2', max_retries: int = 4):
    for attempt in range(max_retries):
        try:
            return client.models.embed_content(
                model=model,
                contents=contents,
            )
        except Exception as e:
            err_msg = str(e).lower()
            if "503" in err_msg or "429" in err_msg or "quota" in err_msg or "high demand" in err_msg:
                if attempt == max_retries - 1:
                    raise e
                time.sleep((attempt + 1) * 3) # Backoff: 3s, 6s, 9s
            else:
                raise e

def store_document_chunks(doc_id: str, filename: str, text: str):
    if collection is None:
        error_msg = f"Vector database is not initialized. Initialization error: {chroma_init_error}"
        raise Exception(error_msg)
        
    chunks = chunk_text(text)
    if not chunks:
        raise Exception("Could not extract any text from the document. If this is a scanned PDF or image, text extraction is not supported.")
        
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    embeddings = []
    ids = []
    metadatas = []
    documents = []
    
    for i, chunk in enumerate(chunks):
        chunk_id = f"{doc_id}_{i}"
        
        response = _embed_with_retry(client, chunk)
        
        embeddings.append(response.embeddings[0].values)
        ids.append(chunk_id)
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
    response = _embed_with_retry(client, query)
    
    query_embedding = response.embeddings[0].values
    
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

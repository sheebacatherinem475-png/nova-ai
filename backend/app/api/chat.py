import os
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from google import genai
from google.genai import types
from app.core.config import settings
from sqlalchemy.orm import Session
from fastapi import Depends
from app.core.db_sqlalchemy import get_db
from app.models.document import Document
from app.services.embedding_service import retrieve_relevant_chunks

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = []

@router.post("")
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "placeholder_key_replace_me":
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured on the server.")
        
    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        # Check if the user is confirming a general AI fallback
        is_fallback_confirmation = False
        if len(request.history) > 0:
            last_msg = request.history[-1]
            if last_msg.get("role") == "model" and "I couldn't find this in your uploaded documents" in last_msg.get("content", ""):
                # Basic check if user agreed
                lower_msg = request.message.lower()
                if "yes" in lower_msg or "sure" in lower_msg or "go ahead" in lower_msg or "general" in lower_msg:
                    is_fallback_confirmation = True

        docs_count = db.query(Document).count()
        use_rag = docs_count > 0 and not is_fallback_confirmation
        
        system_instruction = ""
        context_text = ""
        
        if use_rag:
            chunks = retrieve_relevant_chunks(request.message, top_k=5)
            if chunks:
                context_parts = []
                for chunk in chunks:
                    context_parts.append(f"Source: [{chunk['filename']}]\nContent:\n{chunk['text']}")
                context_text = "\n\n---\n\n".join(context_parts)
                
                system_instruction = f"""You are a document-aware AI assistant. 
You must answer the user's query using ONLY the provided document context below.
If the provided context does not contain the answer, reply EXACTLY with 'NO_RELEVANT_CONTEXT' and nothing else.
If you can answer using the context, you MUST cite your sources at the end of relevant sentences using the exact filename provided, e.g. [{chunks[0]['filename']}] or [{chunks[0]['filename']} - Page X] if you infer page numbers.

Context:
{context_text}
"""
            else:
                # No chunks retrieved (empty db but docs exist?)
                system_instruction = "Reply EXACTLY with 'NO_RELEVANT_CONTEXT'."
        else:
            if is_fallback_confirmation:
                system_instruction = "You are a helpful AI assistant. The user has explicitly requested a general knowledge answer. Start your response with exactly this label: '**General AI Response (not from uploaded documents)**\\n\\n', then answer their query."
            else:
                system_instruction = "You are a helpful AI assistant."

        contents = []
        for msg in request.history:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append(
                types.Content(role=role, parts=[types.Part.from_text(text=msg.get("content", ""))])
            )
            
        contents.append(
            types.Content(role="user", parts=[types.Part.from_text(text=request.message)])
        )
        
        def generate():
            try:
                response = client.models.generate_content_stream(
                    model='gemini-2.5-flash',
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                    )
                )
                
                accumulated = ""
                for chunk in response:
                    if chunk.text:
                        accumulated += chunk.text
                        
                        # We need to intercept NO_RELEVANT_CONTEXT
                        if use_rag and len(accumulated) >= 19 and "NO_RELEVANT_CONTEXT" in accumulated:
                            msg = "I couldn't find this in your uploaded documents. Would you like me to answer using my general knowledge?"
                            yield f"data: {json.dumps({'chunk': msg})}\n\n"
                            return
                            
                        # If we haven't matched NO_RELEVANT_CONTEXT yet, but we are accumulating...
                        if use_rag and "NO_RELEVANT_CONTEXT".startswith(accumulated):
                            continue # wait for more tokens to see if it matches
                            
                        yield f"data: {json.dumps({'chunk': chunk.text})}\n\n"
                        
                if not accumulated.strip():
                    yield f"data: {json.dumps({'error': 'The AI provider returned an empty response. Please try rephrasing your request.'})}\n\n"
                    
                # Final debug chunk
                if use_rag:
                    yield f"data: {json.dumps({'debug': {'retrieved_chunks': chunks}})}\n\n"
                        
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                
        return StreamingResponse(generate(), media_type="text/event-stream")
            
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

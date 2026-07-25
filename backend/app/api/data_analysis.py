import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from google import genai
from google.genai import types
from app.core.config import settings
from app.services.data_service import get_dataset_context

router = APIRouter()

class DataAnalyzeRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = []
    dataset_id: str

@router.post("/analyze")
async def analyze_data(request: DataAnalyzeRequest):
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "placeholder_key_replace_me":
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured on the server.")
        
    try:
        # Get the structured pandas summary for context
        dataset_context = get_dataset_context(request.dataset_id)
        
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        system_instruction = f"""You are an expert Data Analyst AI.
You have been provided with the statistical summary and schema of a dataset uploaded by the user. 
Answer the user's questions about the dataset in simple, clear language.

If the user asks for a chart, graph, or visualization (e.g. bar chart, line chart, scatter plot, pie chart), you MUST generate it by returning a JSON configuration block surrounded by ```chart and ``` tags.
The JSON must follow this exact format:
```chart
{{
  "type": "bar", // can be "bar", "line", "scatter", "pie"
  "data": [
    {{"name": "Category A", "value": 10}},
    {{"name": "Category B", "value": 15}}
  ],
  "xKey": "name", // The key in data for the X axis (or name for Pie chart)
  "yKey": "value", // The key in data for the Y axis (or value for Pie chart)
  "title": "Chart Title Here"
}}
```
Ensure you use the provided statistical summary to estimate or plot the chart data accurately.

Dataset Information:
{dataset_context}
"""

        contents = []
        
        # Populate history
        for msg in request.history:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append(
                types.Content(role=role, parts=[types.Part.from_text(text=msg.get("content", ""))])
            )

        # Add current message
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=request.message)]))

        def generate():
            try:
                response = client.models.generate_content_stream(
                    model='gemini-2.5-flash',
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                    )
                )
                
                for chunk in response:
                    if chunk.text:
                        yield f"data: {json.dumps({'chunk': chunk.text})}\n\n"
                        
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                
        return StreamingResponse(generate(), media_type="text/event-stream")
            
    except Exception as e:
        print(f"Error in data analyze endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

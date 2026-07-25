import os
from pypdf import PdfReader
import docx

def extract_text_from_file(file_path: str, filename: str) -> str:
    """Extracts text from TXT, PDF, or DOCX files."""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == '.txt':
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
            
    elif ext == '.pdf':
        text = []
        try:
            reader = PdfReader(file_path)
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    # Simple heuristic to include page numbers
                    text.append(f"\n--- Page {i+1} ---\n{page_text}")
            return "\n".join(text)
        except Exception as e:
            print(f"Error extracting PDF: {e}")
            return ""
            
    elif ext == '.docx':
        try:
            doc = docx.Document(file_path)
            full_text = []
            for para in doc.paragraphs:
                full_text.append(para.text)
            return '\n'.join(full_text)
        except Exception as e:
            print(f"Error extracting DOCX: {e}")
            return ""
            
    else:
        raise ValueError(f"Unsupported file type: {ext}")

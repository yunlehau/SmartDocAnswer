# services/chat_service.py

import os
import PyPDF2
from io import BytesIO
from fastapi import UploadFile, HTTPException
from openai import OpenAI
from typing import Optional, Union
from uuid import uuid4
from services.text_to_speech import text_to_speech
from services.image_to_text import ocr_page
from services.file_service import (
    save_file_to_disk,
    calculate_file_hash,
    save_db_to_disk,
    documents_db,
    versions_db,
    Document,
    DocumentVersion
)
from services.vector_db_service import process_and_store_document, query_documents

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "sk-AYhG3o4Rp99ETzn7FlkEZw")
OPENAI_ENDPOINT = "https://aiportalapi.stu-platform.live/use"
MODEL_NAME = "GPT-4.1"

UPLOAD_FOLDER = "uploaded_files"

client = OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_ENDPOINT)

def extract_text_from_file_path(file_path: str) -> str:
    text = ""
    try:
        if file_path.lower().endswith(".txt"):
            with open(file_path, "r", encoding="utf-8") as f:
                text += f.read()
        elif file_path.lower().endswith(".pdf"):
            with open(file_path, "rb") as f:
                pdf_reader = PyPDF2.PdfReader(f)
                for page in pdf_reader.pages:
                    extracted_text = page.extract_text()
                    if extracted_text:
                        text += extracted_text + "\n"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read fallback file: {str(e)}")
    return text

async def handle_chat_request(file: Optional[UploadFile], user_input: str, tts_enabled: bool = True) -> dict:
    DOCUMENT_CONTEXT = ""
    chroma_inserted = False
    # Nếu có file upload
    if file and hasattr(file, 'filename') and file.filename:
        if not file.filename.lower().endswith((".txt", ".pdf", ".jpg", ".jpeg", ".png")):
            raise HTTPException(status_code=400, detail="Only .txt, .pdf or .png, .jpg, .jpeg files are supported")
        try:
            # Save uploaded file via full CMS logic
            doc = Document(
                title=f"Chat Upload - {file.filename}",
                file_name=file.filename,
                tags=["chat-upload"],
                language="en",
                category="chat",
                uploaded_by="chat-service"
            )
            file_path = save_file_to_disk(file, doc.id)
            file_hash = calculate_file_hash(file_path)
            version = DocumentVersion(doc.id, version_number=1, file_path=file_path, file_hash=file_hash)
            doc.versions.append(version.id)
            documents_db[doc.id] = doc
            versions_db[version.id] = version
            save_db_to_disk()
            # Kiểm tra file đã có trong ChromaDB chưa (dựa trên file_path)
            # Nếu chưa thì insert vào ChromaDB
            # (ChromaDB không có API check trực tiếp, nên sẽ insert lại nếu chưa có)
            chroma_inserted = process_and_store_document(file_path, None, is_uploaded=False)
            # Query context từ ChromaDB
            DOCUMENT_CONTEXT = query_documents(user_input, n_results=3)
            if not DOCUMENT_CONTEXT.strip():
                raise HTTPException(status_code=400, detail="No relevant context found in ChromaDB")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to process file with ChromaDB: {str(e)}")
    elif file and user_input:
        # Fallback: Query context từ ChromaDB với user_input
        DOCUMENT_CONTEXT = query_documents(user_input, n_results=3)
        if not DOCUMENT_CONTEXT.strip():
            DOCUMENT_CONTEXT = "No relevant document context found."
    else:
        DOCUMENT_CONTEXT = query_documents(user_input, n_results=3)
        if not DOCUMENT_CONTEXT.strip():
            DOCUMENT_CONTEXT = "No relevant document context found."
    prompt = (
        f"You are an assistant that answers questions based on the following document content or general knowledge:\n\n"
        f"{DOCUMENT_CONTEXT}\n\n"
        f"If the answer is not found in the document, respond with 'Information not available in the provided document.'\n"
        f"Now, answer the following question: {user_input} \n\n"
        f"Should reponse in english, the response should be modified into a human-readable format as plain text avoid markdown format"
    )
    try:
        print('text', prompt)
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that answers based on the given context."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.2
        )
        llm_response = response.choices[0].message.content
        if tts_enabled:
            audio_io = text_to_speech(llm_response)
            return {
                "response": llm_response,
                "audio": audio_io,
                "status": "success"
            }
        else:
            return {
                "response": llm_response,
                "status": "success"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API call failed: {str(e)}")
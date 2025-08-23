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

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_ENDPOINT = os.getenv("OPENAI_ENDPOINT")
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
    source_info = []
    # Nếu có file upload
    if file and hasattr(file, 'filename') and file.filename:
        if not file.filename.lower().endswith((".txt", ".pdf", ".jpg", ".jpeg", ".png")):
            raise HTTPException(status_code=400, detail="Only .txt, .pdf or .png, .jpg, .jpeg files are supported")
        try:
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
            chroma_inserted = process_and_store_document(file_path, None, is_uploaded=False)
            # Query context từ ChromaDB
            context_results = query_documents(user_input, n_results=10)
            # Nếu context trả về dạng list các đoạn, loại bỏ trùng lặp
            if isinstance(context_results, list):
                unique = []
                seen = set()
                for c in context_results:
                    key = (c.get("text", ""), c.get("source", file.filename), c.get("page", None))
                    if key not in seen and c.get("text", "").strip():
                        unique.append(c)
                        seen.add(key)
                DOCUMENT_CONTEXT = "\n".join([c.get("text", "") for c in unique])
                for c in unique:
                    source_info.append({
                        "file": c.get("source", file.filename),
                        "page": c.get("page", None)
                    })
            else:
                DOCUMENT_CONTEXT = context_results
            if not DOCUMENT_CONTEXT.strip():
                raise HTTPException(status_code=400, detail="No relevant context found in ChromaDB")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to process file with ChromaDB: {str(e)}")
    elif file and user_input:
        context_results = query_documents(user_input, n_results=3)
        if isinstance(context_results, list):
            unique = []
            seen = set()
            for c in context_results:
                key = (c.get("text", ""), c.get("source", None), c.get("page", None))
                if key not in seen and c.get("text", "").strip():
                    unique.append(c)
                    seen.add(key)
            DOCUMENT_CONTEXT = "\n".join([c.get("text", "") for c in unique])
            for c in unique:
                source_info.append({
                    "file": c.get("source", None),
                    "page": c.get("page", None)
                })
        else:
            DOCUMENT_CONTEXT = context_results
        if not DOCUMENT_CONTEXT.strip():
            DOCUMENT_CONTEXT = "No relevant document context found."
    else:
        context_results = query_documents(user_input, n_results=3)
        if isinstance(context_results, list):
            unique = []
            seen = set()
            for c in context_results:
                key = (c.get("text", ""), c.get("source", None), c.get("page", None))
                if key not in seen and c.get("text", "").strip():
                    unique.append(c)
                    seen.add(key)
            DOCUMENT_CONTEXT = "\n".join([c.get("text", "") for c in unique])
            for c in unique:
                source_info.append({
                    "file": c.get("source", None),
                    "page": c.get("page", None)
                })
        else:
            DOCUMENT_CONTEXT = context_results
        if not DOCUMENT_CONTEXT.strip():
            DOCUMENT_CONTEXT = "No relevant document context found."

    # Tạo prompt kèm thông tin nguồn
    source_str = "\n".join([
        f"Source: {s['file']}{' - Page: ' + str(s['page']) if s['page'] else ''}" for s in source_info if s.get('file')
    ])
    prompt = (
        f"You are an assistant that answers questions based on the following document content or general knowledge:\n\n"
        f"{DOCUMENT_CONTEXT}\n\n"
        f"If the answer is found in the document, you must clearly state the source (file name and page number if available) in your answer.\n"
        f"Sources:\n{source_str}\n"
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
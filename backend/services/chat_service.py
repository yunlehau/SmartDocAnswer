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

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "sk-3fv-EeXCjYP3xeigsr9O3w")
OPENAI_ENDPOINT = "https://aiportalapi.stu-platform.live/jpe"
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

            file.file.seek(0)
            if file.filename.lower().endswith(".txt"):
                DOCUMENT_CONTEXT = (await file.read()).decode("utf-8")
            elif file.filename.lower().endswith(".pdf"):
                pdf_reader = PyPDF2.PdfReader(BytesIO(await file.read()))
                for page in pdf_reader.pages:
                    extracted_text = page.extract_text()
                    if extracted_text:
                        DOCUMENT_CONTEXT += extracted_text + "\n"
            elif file.filename.lower().endswith((".jpg", ".jpeg", ".png")):
                image_path = save_file_to_disk(file, doc.id)
                DOCUMENT_CONTEXT += ocr_page(image_path, client, MODEL_NAME)

            if not DOCUMENT_CONTEXT.strip():
                raise HTTPException(status_code=400, detail="Uploaded file is empty or no text could be extracted")

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read uploaded file: {str(e)}")

    elif file and user_input:
        # Fallback: Read from uploaded_files folder
        if not os.path.exists(UPLOAD_FOLDER):
            DOCUMENT_CONTEXT = "The user did not upload a file, and no fallback documents are available."
        else:
            for filename in os.listdir(UPLOAD_FOLDER):
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                if filename.lower().endswith((".txt", ".pdf")):
                    DOCUMENT_CONTEXT += extract_text_from_file_path(filepath)

        if not DOCUMENT_CONTEXT.strip():
            DOCUMENT_CONTEXT = ""

    else:
        DOCUMENT_CONTEXT = ""

    prompt = (
        f"You are an assistant that answers questions based on the following document content or general knowledge:\n\n"
        f"{DOCUMENT_CONTEXT}\n\n"
        f"If the answer is not found in the document, respond with 'Information not available in the provided document.'\n"
        f"Now, answer the following question: {user_input} \n\n"
        f"Should reponse in english, the response should be modified into a human-readable format as plain text avoid markdown format"
    )

    try:

        print('text', prompt);
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that answers based on the given context."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        llm_response = response.choices[0].message.content

        # If TTS is enabled, generate speech and return both text and audio
        if tts_enabled:
            audio_io = text_to_speech(llm_response)  # Generate speech
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
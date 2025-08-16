# services/file_service.py

import os
import json
import hashlib
import shutil
from fastapi import UploadFile
from models.document import Document, DocumentVersion
from services.vector_db_service import process_and_store_document

UPLOAD_DIR = "./uploaded_files"
DB_CACHE_FILE = "./cms_data.json"
os.makedirs(UPLOAD_DIR, exist_ok=True)

documents_db = {}
versions_db = {}

def save_file_to_disk(upload_file: UploadFile, doc_id: str) -> str:
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{upload_file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    # Thêm vào vector DB sau khi lưu file
    try:
        if file_path.lower().endswith((".txt", ".pdf")):
            with open(file_path, "rb") as f:
                file_content = f.read() if file_path.lower().endswith('.pdf') else None
            process_and_store_document(file_path, file_content, is_uploaded=False)
    except Exception as e:
        print(f"[VectorDB] Error indexing file: {file_path}: {str(e)}")
    return file_path

def calculate_file_hash(file_path: str) -> str:
    with open(file_path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()

def save_db_to_disk():
    data = {
        "documents": {k: vars(v) for k, v in documents_db.items()},
        "versions": {k: vars(v) for k, v in versions_db.items()}
    }
    with open(DB_CACHE_FILE, "w") as f:
        json.dump(data, f, default=str, indent=2)

def load_db_from_disk():
    if not os.path.exists(DB_CACHE_FILE):
        return
    with open(DB_CACHE_FILE, "r") as f:
        data = json.load(f)
    for k, v in data.get("documents", {}).items():
        doc = Document(**v)
        documents_db[k] = doc
    for k, v in data.get("versions", {}).items():
        ver = DocumentVersion(**v)
        versions_db[k] = ver

# Load data when service is imported
load_db_from_disk()

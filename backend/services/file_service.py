# services/file_service.py

import os
import json
import hashlib
import shutil
from fastapi import UploadFile
from models.document import Document, DocumentVersion
from services.embedding_service import embed_document

UPLOAD_DIR = "./uploaded_files"
DB_CACHE_FILE = "./cms_data.json"
os.makedirs(UPLOAD_DIR, exist_ok=True)

documents_db = {}
versions_db = {}

def save_file_to_disk(upload_file: UploadFile, doc_id: str) -> str:
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{upload_file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    return file_path

def calculate_file_hash(file_path: str) -> str:
    with open(file_path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()

def generate_embedding_for_file(file_path: str):
    """
    Generate embedding for a file and return embedding data
    
    Args:
        file_path: Path to the file
        
    Returns:
        Dictionary with embedding information
    """
    # Only process supported file types
    if not (file_path.lower().endswith('.txt') or file_path.lower().endswith('.pdf')):
        return {
            "success": False,
            "error": "Unsupported file type for embedding",
            "embedding": None,
            "model": None
        }
        
    return embed_document(file_path)

def process_file_upload(upload_file: UploadFile, doc_id: str, generate_embeddings: bool = True):
    """
    Process a file upload including embedding generation
    
    Args:
        upload_file: The uploaded file
        doc_id: The document ID
        generate_embeddings: Whether to generate embeddings
        
    Returns:
        Tuple of (file_path, file_hash, embedding_result)
    """
    # Save file to disk
    file_path = save_file_to_disk(upload_file, doc_id)
    file_hash = calculate_file_hash(file_path)
    
    # Generate embedding if requested and file type is supported
    embedding_result = None
    if generate_embeddings:
        embedding_result = generate_embedding_for_file(file_path)
    
    return file_path, file_hash, embedding_result

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

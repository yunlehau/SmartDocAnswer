# routes/files.py

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import FileResponse
from models.document import Document, DocumentVersion
from services.file_service import (
    documents_db, versions_db,
    save_file_to_disk, calculate_file_hash,
    process_file_upload, generate_embedding_for_file,
    save_db_to_disk
)
from datetime import datetime
from uuid import uuid4
import os

router = APIRouter()

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    title: str = Form(...),
    tags: str = Form(""),
    language: str = Form("en"),
    category: str = Form("general"),
    uploaded_by: str = Form("system"),
    generate_embeddings: bool = Form(True)
):
    # Create document record
    doc = Document(title, file.filename, tags.split(","), language, category, uploaded_by)
    
    # Process file upload with embedding
    file_path, file_hash, embedding_result = process_file_upload(
        file, doc.id, generate_embeddings
    )
    
    # Create version record with embedding if available
    if embedding_result and embedding_result["success"]:
        version = DocumentVersion(
            document_id=doc.id,
            version_number=1,
            file_path=file_path,
            file_hash=file_hash,
            embedded=True,
            embedding=embedding_result["embedding"],
            embedding_model=embedding_result["model"],
            embedding_metadata=embedding_result["metadata"]
        )
    else:
        version = DocumentVersion(
            document_id=doc.id,
            version_number=1,
            file_path=file_path,
            file_hash=file_hash
        )
    
    doc.versions.append(version.id)
    
    # Add to database
    documents_db[doc.id] = doc
    versions_db[version.id] = version
    save_db_to_disk()
    
    # Prepare response
    response = {
        "document_id": doc.id,
        "version_id": version.id,
        "message": "File uploaded and version created."
    }
    
    # Add embedding info to response if available
    if generate_embeddings:
        if embedding_result and embedding_result["success"]:
            response["embedding_status"] = "success"
            response["embedding_dimensions"] = embedding_result["metadata"]["embedding_dimensions"]
        else:
            response["embedding_status"] = "failed"
            response["embedding_error"] = embedding_result["error"] if embedding_result else "No embedding generated"
    
    return response

@router.get("")
def list_files():
    return [{
        "id": doc.id,
        "title": doc.title,
        "file_name": doc.file_name,
        "language": doc.language,
        "category": doc.category,
        "tags": doc.tags,
        "created_at": doc.created_at,
        "status": doc.status
    } for doc in documents_db.values()]

@router.get("/{doc_id}")
def get_file(doc_id: str):
    if doc_id not in documents_db:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = documents_db[doc_id]
    return {
        "id": doc.id,
        "title": doc.title,
        "file_name": doc.file_name,
        "tags": doc.tags,
        "language": doc.language,
        "category": doc.category,
        "versions": doc.versions,
        "status": doc.status,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at
    }

@router.get("/{doc_id}/preview")
def preview_file(doc_id: str):
    if doc_id not in documents_db:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = documents_db[doc_id]
    if not doc.versions:
        raise HTTPException(status_code=400, detail="No versions found for document")
    version = versions_db[doc.versions[0]]
    if not os.path.exists(version.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(version.file_path, media_type='application/octet-stream', filename=doc.file_name)

@router.get("/{doc_id}/versions")
def get_versions(doc_id: str):
    if doc_id not in documents_db:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = documents_db[doc_id]
    
    # Filter out embedding data from response to avoid large responses
    versions = []
    for vid in doc.versions:
        version_data = dict(vars(versions_db[vid]))
        # Replace embedding with metadata about the embedding
        if version_data.get('embedding'):
            dimensions = len(version_data['embedding'])
            version_data['embedding'] = f"<Embedding vector with {dimensions} dimensions>"
        versions.append(version_data)
    
    return versions

@router.delete("/{doc_id}")
def delete_file(doc_id: str):
    if doc_id not in documents_db:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = documents_db.pop(doc_id)
    for vid in doc.versions:
        version = versions_db.pop(vid)
        if os.path.exists(version.file_path):
            os.remove(version.file_path)
    save_db_to_disk()
    return {"message": f"Document {doc_id} and its versions deleted."}

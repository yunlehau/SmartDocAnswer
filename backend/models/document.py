# models/document.py

from uuid import uuid4
from datetime import datetime
from typing import List, Optional, Dict, Any

class Document:
    def __init__(self, title, file_name, tags, language, category, uploaded_by,
                 id=None, created_at=None, updated_at=None, versions=None, status='uploaded'):
        self.id = id or str(uuid4())
        self.title = title
        self.file_name = file_name
        self.tags = tags
        self.language = language
        self.category = category
        self.uploaded_by = uploaded_by
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or self.created_at
        self.versions = versions or []
        self.status = status

class DocumentVersion:
    def __init__(self, document_id, version_number, file_path, file_hash,
                 id=None, embedded=False, embedding=None, embedding_model=None, 
                 embedding_metadata=None, created_at=None):
        self.id = id or str(uuid4())
        self.document_id = document_id
        self.version_number = version_number
        self.file_path = file_path
        self.file_hash = file_hash
        self.embedded = embedded
        self.embedding = embedding  # The embedding vector
        self.embedding_model = embedding_model  # Model used for embedding
        self.embedding_metadata = embedding_metadata or {}  # Additional metadata about embedding
        self.created_at = created_at or datetime.utcnow()

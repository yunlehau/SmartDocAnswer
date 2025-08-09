import os
from openai import OpenAI
from typing import List, Dict, Any, Optional
import numpy as np
import PyPDF2
from io import BytesIO

# OpenAI API configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "sk-0J774A4x7GhS5yCB12IWjw")
OPENAI_ENDPOINT = os.getenv("OPENAI_ENDPOINT", "https://aiportalapi.stu-platform.live/jpe")
EMBEDDING_MODEL = "text-embedding-3-small"

# Initialize OpenAI client
client = OpenAI(
    api_key=OPENAI_API_KEY,
    base_url=OPENAI_ENDPOINT
)

def extract_text_from_file(file_path: str) -> str:
    """Extract text content from a file based on its extension"""
    if file_path.lower().endswith('.txt'):
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    elif file_path.lower().endswith('.pdf'):
        text = ""
        with open(file_path, 'rb') as f:
            pdf_reader = PyPDF2.PdfReader(f)
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
    else:
        # For unsupported file types
        return ""

def generate_embedding(text: str) -> List[float]:
    """
    Generate an embedding vector for the provided text using OpenAI API
    
    Args:
        text: The text to generate an embedding for
        
    Returns:
        A list of floats representing the embedding vector
    """
    if not text.strip():
        # Return empty embedding for empty text
        return []
    
    # Truncate text if too long - embedding models typically have token limits
    if len(text) > 32000:  # Approximation for token limit
        text = text[:32000]
    
    try:
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=text
        )
        
        embedding_vector = response.data[0].embedding
        return embedding_vector
    except Exception as e:
        print(f"Error generating embedding: {str(e)}")
        # Return empty list if embedding generation fails
        return []

def embed_document(file_path: str) -> Dict[str, Any]:
    """
    Extract text from a document and generate an embedding
    
    Args:
        file_path: Path to the document file
        
    Returns:
        Dictionary containing embedding information
    """
    try:
        # Extract text from file
        text = extract_text_from_file(file_path)
        
        if not text.strip():
            return {
                "success": False,
                "error": "No text content could be extracted from the file",
                "embedding": None,
                "model": None
            }
        
        # Generate embedding
        embedding_vector = generate_embedding(text)
        
        if not embedding_vector:
            return {
                "success": False,
                "error": "Failed to generate embedding",
                "embedding": None,
                "model": None
            }
        
        return {
            "success": True,
            "embedding": embedding_vector,
            "model": EMBEDDING_MODEL,
            "metadata": {
                "text_length": len(text),
                "embedding_dimensions": len(embedding_vector)
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "embedding": None,
            "model": None
        } 
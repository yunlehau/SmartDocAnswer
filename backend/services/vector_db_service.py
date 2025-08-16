import os
import uuid
import PyPDF2
from io import BytesIO
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# Khởi tạo ChromaDB client với persistent storage
os.makedirs("./chroma_data", exist_ok=True)

chroma_client = chromadb.PersistentClient(path="./chroma_data")
collection_name = "document_collection"
try:
    collection = chroma_client.get_collection(name=collection_name)
except Exception:
    collection = chroma_client.create_collection(name=collection_name)

# Khởi tạo sentence transformer cho embedding
embedder = SentenceTransformer('all-MiniLM-L6-v2')

DOCUMENTS_FOLDER = os.path.join(os.path.dirname(__file__), '../uploaded_files')


def chunk_text(text, max_chunk_size=500):
    sentences = text.split('. ')
    chunks = []
    current_chunk = ""
    for sentence in sentences:
        if len(current_chunk) + len(sentence) < max_chunk_size:
            current_chunk += sentence + ". "
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence + ". "
    if current_chunk:
        chunks.append(current_chunk.strip())
    return chunks


def process_and_store_document(file_path, file_content=None, is_uploaded=False):
    """Xử lý tài liệu và lưu vào vector DB"""
    try:
        text = ""
        if file_path.lower().endswith('.txt'):
            if is_uploaded and file_content:
                text = file_content.decode('utf-8')
            else:
                with open(file_path, 'r', encoding='utf-8') as f:
                    text = f.read()
        elif file_path.lower().endswith('.pdf'):
            if is_uploaded and file_content:
                pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
                for page in pdf_reader.pages:
                    extracted_text = page.extract_text()
                    if extracted_text:
                        text += extracted_text + "\n"
            else:
                with open(file_path, 'rb') as f:
                    pdf_reader = PyPDF2.PdfReader(f)
                    for page in pdf_reader.pages:
                        extracted_text = page.extract_text()
                        if extracted_text:
                            text += extracted_text + "\n"
        if not text.strip():
            return False
        chunks = chunk_text(text)
        embeddings = embedder.encode(chunks).tolist()
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            collection.add(
                documents=[chunk],
                embeddings=[embedding],
                ids=[f"{os.path.basename(file_path)}_{i}_{uuid.uuid4()}"],
                metadatas=[{"source": file_path}]
            )
        return True
    except Exception as e:
        print(f"Error processing document {file_path}: {str(e)}")
        return False


def query_documents(user_input, n_results=3):
    query_embedding = embedder.encode([user_input])[0].tolist()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results
    )
    if results['documents']:
        return "\n".join(results['documents'][0])
    return "No relevant document context found."

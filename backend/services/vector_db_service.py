import os
import uuid
import PyPDF2
from io import BytesIO
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

import json
from models.document import Document, DocumentVersion

def compare_document_versions(document_id, cms_data_path="./cms_data.json"):
    """
    So sánh nội dung giữa các version của một tài liệu.
    Trả về danh sách sự khác biệt kèm nguồn: tên tài liệu, version, số trang/đoạn.
    """
    with open(cms_data_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Tìm các version của document_id
    versions = [v for v in data.get("versions", {}).values() if v["document_id"] == document_id]
    if len(versions) < 2:
        return {"error": "Tài liệu chưa có nhiều version để so sánh."}
    # Lấy tên tài liệu
    doc_info = next((d for d in data.get("documents", {}).values() if d["id"] == document_id), None)
    title = doc_info["title"] if doc_info else "Unknown"
    # Đọc nội dung từng version
    contents = []
    for v in sorted(versions, key=lambda x: x["version_number"]):
        file_path = v["file_path"].replace("./", "./")
        if file_path.lower().endswith(".pdf"):
            try:
                with open(file_path, "rb") as f:
                    pdf_reader = PyPDF2.PdfReader(f)
                    pages = [page.extract_text() or "" for page in pdf_reader.pages]
            except Exception:
                pages = []
        elif file_path.lower().endswith(".txt"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    text = f.read()
                pages = text.split("\n\n")
            except Exception:
                pages = []
        else:
            pages = []
        contents.append({
            "version": v["version_number"],
            "file_path": file_path,
            "pages": pages
        })
    # So sánh từng trang giữa các version
    diffs = []
    for i in range(1, len(contents)):
        prev = contents[i-1]
        curr = contents[i]
        max_pages = max(len(prev["pages"]), len(curr["pages"]))
        for p in range(max_pages):
            prev_text = prev["pages"][p] if p < len(prev["pages"]) else ""
            curr_text = curr["pages"][p] if p < len(curr["pages"]) else ""
            if prev_text != curr_text:
                diffs.append({
                    "page": p+1,
                    "title": title,
                    "version_from": prev["version"],
                    "version_to": curr["version"],
                    "file_from": prev["file_path"],
                    "file_to": curr["file_path"],
                    "diff_from": prev_text,
                    "diff_to": curr_text
                })
    return diffs

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
        # Nếu là PDF, lưu thông tin page
        page_info = []
        if file_path.lower().endswith('.pdf'):
            try:
                with open(file_path, 'rb') as f:
                    pdf_reader = PyPDF2.PdfReader(f)
                    page_info = [i+1 for i in range(len(pdf_reader.pages))]
            except Exception:
                page_info = [None]*len(chunks)
        else:
            page_info = [None]*len(chunks)
        # Lấy version nếu có
        version = None
        # Nếu file_path có dạng ..._vX_YYYY.pdf thì lấy X làm version
        import re
        m = re.search(r'_v(\d+)', file_path)
        if m:
            version = int(m.group(1))
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            meta = {
                "source": file_path,
                "file": os.path.basename(file_path),
                "page": page_info[i] if i < len(page_info) and page_info[i] is not None else 0,
                "version": version if version is not None else 1
            }
            collection.add(
                documents=[chunk],
                embeddings=[embedding],
                ids=[f"{os.path.basename(file_path)}_{i}_{uuid.uuid4()}"],
                metadatas=[meta]
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

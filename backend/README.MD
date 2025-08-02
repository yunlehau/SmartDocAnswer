# 📁 RAG File CMS API with OpenAI Chat

A modular FastAPI-based Content Management System that enables file upload, versioning, preview, and OpenAI-powered document Q&A chat.

---

## 🚀 Features

- Upload files (PDF, DOCX, TXT, etc.) with metadata
- File versioning support
- File preview and download
- Persistent local storage using JSON (no database required)
- OpenAI GPT-4.1 integration for document-based Q&A
- Modular FastAPI backend with best practices
- Swagger UI at `/docs`
- CORS enabled for frontend access

---

## 📦 Project Structure

```
cms_backend/
├── main.py                     # FastAPI app entry point
├── models/
│   └── document.py             # Document and Version models
├── routes/
│   ├── files.py                # File upload, list, preview, delete
│   └── chat.py                 # Chat endpoint using OpenAI
├── services/
│   ├── file_service.py         # File saving, hashing, DB load/save
│   └── chat_service.py         # OpenAI integration + file parsing
├── uploaded_files/             # Where user files are stored
├── cms_data.json               # Metadata persistence
```

---

## 🧪 Local Setup

### 1. Create Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install fastapi uvicorn python-multipart PyPDF2 openai
```

### 3. Run the Server
```bash
uvicorn main:app --reload
```

### 4. Visit Swagger Docs
[http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📂 API Endpoints

### 📁 File Management

| Method | Endpoint                          | Description                            |
|--------|-----------------------------------|----------------------------------------|
| POST   | `/api/files/upload`               | Upload a new file with metadata        |
| GET    | `/api/files`                      | List all uploaded documents            |
| GET    | `/api/files/{doc_id}`             | Get metadata for a specific document   |
| GET    | `/api/files/{doc_id}/preview`     | Download/preview a document            |
| GET    | `/api/files/{doc_id}/versions`    | View version history                   |
| DELETE | `/api/files/{doc_id}`             | Delete a document and its versions     |

---

### 💬 Chat (OpenAI-powered)

| Method | Endpoint     | Description                                 |
|--------|--------------|---------------------------------------------|
| POST   | `/api/chat`  | Ask a question based on uploaded document   |
| GET    | `/api/health`| Health check                                |

### 🔧 Example Usage (Chat)

```bash
curl -X POST http://localhost:8000/api/chat \
  -F context_file=@example.pdf \
  -F message="What is the purpose of this document?"
```

---

## 🔐 Environment Variables

| Key              | Description                        |
|------------------|------------------------------------|
| `OPENAI_API_KEY` | Your OpenAI API key                |
| `OPENAI_ENDPOINT`| Custom endpoint (if using a proxy) |

---

## 🧱 Future Enhancements

- Dockerfile + Docker Compose support
- Role-based authentication & admin UI
- Vector DB integration (Qdrant / Pinecone)
- Streaming answer support via SSE
- React frontend integration

---

## 👨‍💻 Author

Built with ❤️ using FastAPI + OpenAI. Ready for enterprise-scale document Q&A.


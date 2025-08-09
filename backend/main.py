# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from routes.files import router as file_router
from routes.chat import router as chat_router

app = FastAPI(
    title="RAG File CMS API",
    description="API for uploading, previewing, and managing files for RAG training",
    version="1.0.0"
)

# CORS configuration (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # <-- In production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include file management API routes
app.include_router(file_router, prefix="/api/files", tags=["File Management"])
app.include_router(chat_router, prefix="/api", tags=["Chat"])
# Optional: custom Swagger UI path
@app.get("/docs", include_in_schema=False)
def custom_swagger_ui():
    return app.get_swagger_ui_html(openapi_url=app.openapi_url, title=app.title + " - Swagger UI")

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
from services.chat_service import handle_chat_request

router = APIRouter()

@router.post("/chat")
async def chat(
    message: str = Form(...),
    context_file: Optional[UploadFile] = File(default=None, description="Optional .txt or .pdf file")
):
    try:
        result = await handle_chat_request(context_file, message)
        return JSONResponse(content={"response": result, "status": "success"})
    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        return JSONResponse(content={"error": str(e), "status": "error"}, status_code=500)

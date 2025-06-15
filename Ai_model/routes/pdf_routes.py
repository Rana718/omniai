from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from core import process_files, answer_question
from utils.id_gen import generate_doc_id
from services.grpc_func import ServiceClient

app = APIRouter()

@app.post("/upload")
async def upload_files(
    request: Request, 
    files: list[UploadFile] = File(...), 
    doc_id: str = Form(None), 
    doc_name: str = Form(None)
):
    userid = request.state.user_id
    
    if not doc_id:
        doc_id = generate_doc_id()
        if doc_name is None:
            doc_name = "NEW DOCUMENT"

    # Validate files
    if not files or len(files) == 0:
        raise HTTPException(
            status_code=400, 
            detail="No files provided"
        )
    
    supported_extensions = {'.pdf', '.txt', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.tiff', '.bmp'}
    invalid_files = []
    
    for file in files:
        if not file.filename:
            invalid_files.append("Unnamed file")
            continue
            
        file_ext = '.' + file.filename.split('.')[-1].lower()
        if file_ext not in supported_extensions:
            invalid_files.append(file.filename)
    
    if invalid_files:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file types: {', '.join(invalid_files)}. Supported: PDF, TXT, DOC, DOCX, PNG, JPG, JPEG, TIFF, BMP"
        )
    
    try:
        result = await process_files(userid, doc_id, files, doc_name)
        
        if result.get("error"):
            raise HTTPException(
                status_code=400,
                detail=result["error"]
            )
        
        return {
            "message": "Files processed and embeddings stored successfully.", 
            "doc_id": doc_id,
            "files_processed": len(files),
            "total_words": result.get("total_words", 0),
            "status": "success"
        }
        
    except HTTPException as he:
        print(f"HTTP Exception in upload_files: {he.detail}")
        raise he
    except Exception as e:
        print(f"Unexpected error in upload_files: {e}")
        return{
            "error": f"Failed to process files: {str(e)}"
        }

@app.post("/ask")
async def ask_question(
    request: Request, 
    doc_id: str = Form(None), 
    question: str = Form(...),
    context_only: str = Form("false")  # Changed to str
):
    userid = request.state.user_id
    
    if not question.strip():
        raise HTTPException(
            status_code=400, 
            detail="Question cannot be empty"
        )
    
    # Convert string to boolean
    context_only_bool = context_only.lower() in ('true', '1', 'yes', 'on')
    
    # Create a new doc_id if not provided (normal chat)
    is_normal_chat = False
    if not doc_id:
        is_normal_chat = True
        doc_id = generate_doc_id()
        try:
            # Create a new chat via gRPC
            client = ServiceClient()
            response = await client.create_chat(doc_id, userid, doc_text="Normal Chat")
            if not response:
                print(f"⚠️ Failed to create normal chat via gRPC")
        except Exception as e:
            print(f"⚠️ Error creating normal chat: {e}")
    
    answer = await answer_question(
        userid, 
        doc_id, 
        question, 
        is_normal_chat=is_normal_chat,
        context_only=context_only_bool  # Pass as boolean
    )
    return {"answer": answer, "doc_id": doc_id}
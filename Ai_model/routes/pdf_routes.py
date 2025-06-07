from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from core.Pdf_Agent import process_pdf_files, answer_question
from utils.id_gen import generate_doc_id


app = APIRouter()

@app.post("/upload")
async def upload_pdf(userid:str = Form(...), files: list[UploadFile] = File(...), doc_id: str = Form(None), doc_name: str = Form(None)):
    
    if not doc_id:
        doc_id = generate_doc_id()
        if doc_name is None:
            doc_name = "NEW DOCUMENT"

    await process_pdf_files(userid, doc_id, files, doc_name)
    return {"message": "PDFs processed and embeddings stored.", "doc_id": doc_id}


@app.post("/ask")
async def ask_question(userid:str = Form(...), doc_id: str = Form(...), question: str = Form(...)):
    answer = await answer_question(userid, doc_id, question)
    return {"answer": answer}
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from core.Pdf_Agent import process_pdf_files, answer_question
from models.models import Chat, QAHistory
from utils.id_gen import generate_doc_id

app = APIRouter()


@app.get("/")
async def get_all_docs(request: Request):
    user = request.state.user
    userid = user.email
    chats = await Chat.find(Chat.user_email == userid).to_list()
    return [chat.model_dump(include={"doc_id", "doc_text", "created_at"}) for chat in chats]

@app.post("/upload")
async def upload_pdf(request:Request, files: list[UploadFile] = File(...), doc_id: str = Form(None), doc_name: str = Form(None)):
    userid = request.state.user.email

    if not doc_id:
        doc_id = generate_doc_id()
        if doc_name is None:
            doc_name = "NEW DOCUMENT"

    await process_pdf_files(userid, doc_id, files, doc_name)
    return {"message": "PDFs processed and embeddings stored.", "doc_id": doc_id}


@app.post("/ask")
async def ask_question(request:Request, doc_id: str = Form(...), question: str = Form(...)):
    user = request.state.user
    userid = user.email
    answer = await answer_question(userid, doc_id, question)
    return {"answer": answer}


@app.get("/history/{chat_id}")
async def get_chat_history(chat_id: str):
    chat = await Chat.find_one(Chat.doc_id == chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    history = await QAHistory.find(QAHistory.chat.id == chat.id).to_list()

    doc_text = chat.doc_text 

    return {
        "docsname": doc_text,
        "history": [
            h.model_dump(include={"question", "answer", "timestamp"})
            for h in history
        ]
    }
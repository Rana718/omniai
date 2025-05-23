from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from core.Pdf_Agent import process_pdf_files, answer_question
from models.models import Chat, QAHistory

app = APIRouter()


@app.get("/")
async def get_all_docs(request:Request):
    user = request.state.user
    userid = user.email
    chats = await Chat.find(Chat.user_email == userid).to_list()
    return [{"doc_id": chat.doc_id, "doc_text": chat.doc_text} for chat in chats]

@app.post("/upload")
async def upload_pdf(request:Request, doc_id: str = Form(...), files: list[UploadFile] = File(...)):
    user = request.state.user
    userid = user.email
    await process_pdf_files(userid, doc_id, files)
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
    return [{"question": h.question, "answer": h.answer, "timestamp": h.timestamp} for h in history]
    
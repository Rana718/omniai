from fastapi import FastAPI, UploadFile, File, Form
from core.Pdf_Agent import process_pdf_files, answer_question
import uvicorn

app = FastAPI()


@app.get("/")
async def root():
    return {"message": "Welcome to the PDF processing API!"}

@app.post("/upload/")
async def upload_pdf(userid: str = Form(...), doc_id: str = Form(...), files: list[UploadFile] = File(...)):
    await process_pdf_files(userid, doc_id, files)
    return {"message": "PDFs processed and embeddings stored."}


@app.post("/ask/")
async def ask_question(userid: str = Form(...), doc_id: str = Form(...), question: str = Form(...)):
    answer = await answer_question(userid, doc_id, question)
    return {"answer": answer}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
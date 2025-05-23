import os
import shutil
import json
from models.models import Chat, QAHistory

BASE_DIR = "storage"
HISTORY_FILE = os.path.join(BASE_DIR, "history.json")

def save_files(userid, doc_id, files):
    folder = os.path.join(BASE_DIR, "uploads", userid, doc_id)
    os.makedirs(folder, exist_ok=True)

    for file in files:
        with open(os.path.join(folder, file.filename), "wb") as f:
            shutil.copyfileobj(file.file, f)

    return folder

async def append_history(doc_id, question, answer):
    chat = await Chat.find_one(Chat.doc_id == doc_id)
    print(chat)
    if not chat:
        raise Exception("Chat not found")
    
    qa = QAHistory(chat=chat, question=question, answer=answer)
    await qa.insert()

    if not os.path.exists(HISTORY_FILE):
        history = {}
    else:
        with open(HISTORY_FILE, "r") as f:
            history = json.load(f)

    history.setdefault(doc_id, []).append({"question": question, "answer": answer, "timestamp": qa.timestamp.isoformat()})

    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=4)

def load_history(doc_id):
    if not os.path.exists(HISTORY_FILE):
        return []
    with open(HISTORY_FILE, "r") as f:
        history = json.load(f)
    return history.get(doc_id, [])

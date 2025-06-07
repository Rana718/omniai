import os
import shutil
import json
from services.grpc_func import ServiceClient
from services.producer import produce_qa_history
from datetime import datetime
from .redis_config import get_redis, is_redis_connected
from .id_gen import generate_doc_id

clinet = ServiceClient()

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
    chat = await clinet.get_chat(doc_id)
    print(chat)
    if not chat:
        raise Exception("Chat not found")
    
    hisid = generate_doc_id()
    
    timestamp = datetime.now().isoformat()
    await store_in_redis_cache(doc_id, question, answer, hisid, timestamp)
    
    # Send to RabbitMQ for database persistence
    produce_qa_history(doc_id, question, answer, hisid, timestamp)
    
    # Also store in JSON file as backup
    store_in_json_file(doc_id, question, answer)

def store_in_json_file(doc_id, question, answer):
    """Store in JSON file as backup"""
    try:
        if not os.path.exists(HISTORY_FILE):
            history = {}
        else:
            with open(HISTORY_FILE, "r") as f:
                history = json.load(f)

        history.setdefault(doc_id, []).append({
            "question": question, 
            "answer": answer, 
            "timestamp": datetime.now().isoformat()
        })

        with open(HISTORY_FILE, "w") as f:
            json.dump(history, f, indent=4)
            
        print(f"✅ Stored in JSON file for doc_id: {doc_id}")
    except Exception as e:
        print(f"❌ Error storing in JSON file: {e}")

def load_history(doc_id):
    if not os.path.exists(HISTORY_FILE):
        return []
    with open(HISTORY_FILE, "r") as f:
        history = json.load(f)
    return history.get(doc_id, [])

async def store_in_redis_cache(doc_id, question, answer, hisid, timestamp):
    """Store QA data in Redis for real-time access"""
    redis_client = get_redis()
    
    if not await is_redis_connected():
        print("⚠️ Redis not connected, skipping cache storage")
        return
        
    try:
        qa_data = {
            "id": hisid,
            "question": question,
            "answer": answer,
            "timestamp": timestamp,
        }
        
        redis_key = f"chat_history_temp:{doc_id}"
        qa_json = json.dumps(qa_data)
        
        await redis_client.lpush(redis_key, qa_json)
        await redis_client.expire(redis_key, 600) 
        
        print(f"✅ Stored QA in Redis for doc_id: {doc_id}")
    except Exception as e:
        print(f"❌ Error storing in Redis: {type(e).__name__}: {e}")

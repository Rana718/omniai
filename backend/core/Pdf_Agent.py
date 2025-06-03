import os
import re
import time
import pickle
import pytesseract
from PyPDF2 import PdfReader
from collections import Counter
from models.models import User, Chat
from PIL import ImageFilter, ImageOps
from langchain.schema import Document
from pdf2image import convert_from_path
from config.redis_config import get_redis
from concurrent.futures import ThreadPoolExecutor
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from utils.file_utils import save_files, append_history, load_history
from utils.ChainManager import OptimizedChainManager, get_cached_embeddings


DATA_DIR = "storage/faiss_index"

chain_manager = OptimizedChainManager()
user_patterns_cache = {}

async def get_cached_vector_store(doc_id):
    redis = get_redis()
    key = f"vector_store:{doc_id}"
    try:
        cached = await redis.get(key)
        if cached:
            return pickle.loads(cached.encode('latin-1'))
    except: pass
    try:
        embeddings = await get_cached_embeddings()
        store = FAISS.load_local(os.path.join(DATA_DIR, doc_id), embeddings, allow_dangerous_deserialization=True)
        try:
            await redis.setex(key, 2700, pickle.dumps(store).decode('latin-1'))
        except: pass
        return store
    except Exception as e:
        raise e

async def get_cached_document_content(doc_id):
    try:
        return await get_redis().get(f"document_content:{doc_id}")
    except: return None

async def cache_document_content(doc_id, content):
    try:
        await get_redis().setex(f"document_content:{doc_id}", 7200, content)
    except: pass

async def get_cached_response(doc_id, question):
    try:
        return await get_redis().get(f"response:{doc_id}:{hash(question.lower().strip())}")
    except: return None

async def cache_response(doc_id, question, answer):
    try:
        await get_redis().setex(f"response:{doc_id}:{hash(question.lower().strip())}", 3600, answer)
    except: pass

def preprocess_image(img):
    return ImageOps.autocontrast(ImageOps.grayscale(img).filter(ImageFilter.SHARPEN))

def extract_text_from_pdf(path):
    text = ""
    try:
        reader = PdfReader(path)
        images = convert_from_path(path)
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if not page_text.strip():
                page_text = pytesseract.image_to_string(preprocess_image(images[i]))
            text += page_text + "\n"
    except: pass
    return text

def extract_text_from_all_pdfs(folder):
    files = [os.path.join(folder, f) for f in os.listdir(folder)]
    with ThreadPoolExecutor(max_workers=6) as executor:
        return "\n".join(executor.map(extract_text_from_pdf, files))

def get_text_chunks(text):
    return RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200).split_text(text)

async def learn_user_patterns(user_id, question, _):
    data = user_patterns_cache.setdefault(user_id, {
        'typo_patterns': {}, 'question_styles': [], 'preferred_length': 'medium', 'common_words': Counter()
    })
    if len(data['question_styles']) >= 10:
        data['question_styles'].pop(0)
    data['question_styles'].append(question.lower())
    data['common_words'].update(re.findall(r'\b\w+\b', question.lower()))
    if len(data['common_words']) > 50:
        data['common_words'] = Counter(dict(data['common_words'].most_common(50)))
    q = question.lower()
    if any(w in q for w in ['brief', 'short', 'quickly']):
        data['preferred_length'] = 'short'
    elif any(w in q for w in ['detail', 'explain', 'comprehensive']):
        data['preferred_length'] = 'long'

async def optimized_content_search(question, content, store):
    vector_docs = store.similarity_search(question, k=3)
    q_words = set(re.findall(r'\b\w{3,}\b', question.lower()))
    sentences = re.split(r'[.!?]+', content)
    matches = [s.strip() for s in sentences[:200] if len(s.strip()) >= 20 and sum(1 for w in q_words if w in s.lower()) >= 2]
    combined = [d.page_content for d in vector_docs] + matches[:2]
    return combined[:4]

async def process_pdf_files(user_id, doc_id, files, name):
    user = await User.find_one(User.email == user_id)
    if not user:
        raise Exception("User not found")
    chat = await Chat.find_one(Chat.doc_id == doc_id) or Chat(user=user, doc_id=doc_id, doc_text=name)
    if not chat.id:
        await chat.insert()
    folder = save_files(user_id, doc_id, files)
    full_text = extract_text_from_all_pdfs(folder)
    await cache_document_content(doc_id, full_text)
    chunks = get_text_chunks(full_text)
    embeddings = await get_cached_embeddings()
    path = os.path.join(DATA_DIR, doc_id)
    if os.path.exists(path):
        existing = FAISS.load_local(path, embeddings, allow_dangerous_deserialization=True)
        new = FAISS.from_texts(chunks, embedding=embeddings)
        existing.merge_from(new)
        existing.save_local(path)
        try:
            await get_redis().setex(f"vector_store:{doc_id}", 2700, pickle.dumps(existing).decode('latin-1'))
        except: pass
    else:
        store = FAISS.from_texts(chunks, embedding=embeddings)
        store.save_local(path)
        try:
            await get_redis().setex(f"vector_store:{doc_id}", 2700, pickle.dumps(store).decode('latin-1'))
        except: pass

async def answer_question(user_id, doc_id, question):
    start = time.time()
    cached = await get_cached_response(doc_id, question)
    if cached:
        return cached
    content = await get_cached_document_content(doc_id)
    if not content:
        try:
            store = await get_cached_vector_store(doc_id)
            content = "\n".join([d.page_content for d in store.similarity_search("", k=15)])
            await cache_document_content(doc_id, content)
        except:
            content = ""
    if any(k in question.lower() for k in ["model name", "what model", "your name", "who are you", "what are you", "ur name", "wat r u"]):
        answer = "My name is Jack. I'm an AI assistant designed to help you understand and analyze your PDF documents."
        await cache_response(doc_id, question, answer)
        await learn_user_patterns(user_id, question, "identity")
        return answer
    store = await get_cached_vector_store(doc_id)
    context = await optimized_content_search(question, content, store)
    history = load_history(doc_id)[-3:]
    history_str = "\n".join([f"Q: {h['question']}\nA: {h['answer']}" for h in history])
    docs = [Document(page_content=c) for c in context]
    chain = await chain_manager.get_chain(doc_id)
    try:
        response = chain({"input_documents": docs, "question": question, "history": history_str}, return_only_outputs=True)
        answer = response["output_text"].strip()
        await cache_response(doc_id, question, answer)
        await learn_user_patterns(user_id, question, answer)
        await append_history(doc_id, question, answer)
        return answer
    except:
        fallback = "I apologize, but I encountered an issue processing your question. Could you please try rephrasing it?"
        await append_history(doc_id, question, fallback)
        return fallback

import os
import re
import time
import pytesseract
from PyPDF2 import PdfReader
from collections import Counter
from PIL import ImageFilter, ImageOps
from langchain.schema import Document
from pdf2image import convert_from_path
from utils.redis_config import get_redis
from utils.pinecone import get_pinecone_index, get_pinecone_stats
from concurrent.futures import ThreadPoolExecutor
from langchain.text_splitter import RecursiveCharacterTextSplitter
from utils.file_utils import save_files, append_history, load_history
from utils.ChainManager import OptimizedChainManager, get_cached_embeddings, get_pinecone_vector_store
import uuid
from services.grpc_func import ServiceClient

clinet = ServiceClient()

chain_manager = OptimizedChainManager()
user_patterns_cache = {}

async def get_cached_vector_store(doc_id):
    """Get vector store from Pinecone with Redis caching"""
    redis_client = get_redis()
    cache_key = f"pinecone_store:{doc_id}"
    
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            print(f"✅ Vector store metadata found in Redis for doc_id: {doc_id}")
    except Exception as e:
        print(f"⚠️ Redis cache check failed: {e}")
    
    try:
        embeddings = await get_cached_embeddings()
        vector_store = await get_pinecone_vector_store(doc_id, embeddings)
        
        try:
            await redis_client.setex(cache_key, 3600, "exists")
            print(f"✅ Cached vector store metadata for {doc_id}")
        except Exception:
            pass
        
        return vector_store
        
    except Exception as e:
        print(f"❌ Error getting vector store for {doc_id}: {e}")
        raise

async def get_cached_document_content(doc_id):
    """Get cached document content from Redis"""
    try:
        content = await get_redis().get(f"document_content:{doc_id}")
        if content:
            print(f"✅ Retrieved document content for {doc_id} from Redis")
        return content
    except Exception:
        return None

async def cache_document_content(doc_id, content):
    """Cache document content in Redis"""
    try:
        await get_redis().setex(f"document_content:{doc_id}", 7200, content)
        print(f"✅ Cached document content for {doc_id}")
    except Exception:
        pass

async def get_cached_response(doc_id, question):
    """Get cached response for frequently asked questions"""
    try:
        response = await get_redis().get(f"response:{doc_id}:{hash(question.lower().strip())}")
        if response:
            print("✅ Retrieved cached response")
        return response
    except Exception:
        return None

async def cache_response(doc_id, question, answer):
    """Cache response for future use"""
    try:
        await get_redis().setex(f"response:{doc_id}:{hash(question.lower().strip())}", 3600, answer)
        print("✅ Cached response for future use")
    except Exception:
        pass

def preprocess_image(img):
    """Preprocess image for better OCR"""
    return ImageOps.autocontrast(ImageOps.grayscale(img).filter(ImageFilter.SHARPEN))

def extract_text_from_pdf(path):
    """Extract text from PDF using PyPDF2 and OCR fallback"""
    text = ""
    try:
        reader = PdfReader(path)
        images = convert_from_path(path)
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if not page_text.strip() and i < len(images):
                page_text = pytesseract.image_to_string(preprocess_image(images[i]))
            text += page_text + "\n"
    except Exception as e:
        print(f"❌ PDF extraction failed for {path}: {e}")
    return text

def extract_text_from_all_pdfs(folder):
    """Extract text from all PDFs in folder using ThreadPoolExecutor"""
    files = [os.path.join(folder, f) for f in os.listdir(folder) if f.lower().endswith('.pdf')]
    with ThreadPoolExecutor(max_workers=6) as executor:
        texts = list(executor.map(extract_text_from_pdf, files))
    return "\n".join(texts)

def get_text_chunks(text):
    """Split text into chunks for vector storage"""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, 
        chunk_overlap=200,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
    return splitter.split_text(text)

async def learn_user_patterns(user_id, question, _):
    """Learn user patterns for better responses"""
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

async def optimized_content_search(question, vector_store, top_k=4):
    """Optimized content search using Pinecone - FIXED VERSION"""
    try:
        print(f"🔍 Searching for: '{question}' in Pinecone")
        docs = vector_store.similarity_search(
            question, 
            k=top_k
        )
        content = []
        for doc in docs:
            if doc.page_content and doc.page_content.strip():
                content.append(doc.page_content.strip())
                print(f"📄 Found relevant content: {doc.page_content[:100]}...")
        
        print(f"✅ Found {len(content)} relevant documents from Pinecone")
        return content[:top_k]
        
    except Exception as e:
        print(f"❌ Error in content search: {e}")
        
        try:
            print("🔄 Trying alternative search method...")
            results = vector_store.similarity_search_with_score(question, k=top_k)
            content = [doc.page_content.strip() for doc, score in results if doc.page_content.strip()]
            print(f"✅ Alternative search found {len(content)} documents")
            return content[:top_k]
        except Exception as e2:
            print(f"❌ Alternative search also failed: {e2}")
            return []

async def process_pdf_files(user_id, doc_id, files, name):
    """Process PDF files and store in Pinecone"""
    start_time = time.time()
    
    chat = await clinet.get_chat(doc_id)
    if not chat:
        response = await clinet.create_chat(doc_id, user_id, doc_text=name)
        if not response:
            raise Exception("Failed to create chat")
        print(f"✅ Created new chat for doc_id: {doc_id}")
    else:
        print(f"✅ Using existing chat for doc_id: {doc_id}")
    
    folder = save_files(user_id, doc_id, files)
    full_text = extract_text_from_all_pdfs(folder)
    
    if not full_text.strip():
        raise Exception("No text could be extracted from the uploaded files")
    
    print(f"📄 Extracted text from {len(files)} files")
    
    await cache_document_content(doc_id, full_text)
    chunks = get_text_chunks(full_text)

    print(f"📄 Created {len(chunks)} text chunks")
    if chunks:
        print(f"📝 First chunk preview: {chunks[0][:200]}...")
    embeddings = await get_cached_embeddings()
    vector_store = await get_pinecone_vector_store(doc_id, embeddings)
    
    try:
        index = get_pinecone_index()
        namespace = f"doc_{doc_id}"
        try:
            existing_docs = index.query(
                vector=[0.0] * 768, 
                namespace=namespace,
                top_k=1,
                include_metadata=True
            )
            
            if existing_docs.get('matches'):
                print(f"📝 Adding to existing document collection in Pinecone")
            else:
                print(f"📝 Creating new document collection in Pinecone")
        except Exception as e:
            print(f"⚠️ Could not check existing docs: {e}")
        
        texts_with_metadata = []
        metadatas = []
        ids = []
        
        for i, chunk in enumerate(chunks):
            if chunk.strip(): 
                chunk_id = f"{doc_id}_chunk_{i}_{uuid.uuid4().hex[:8]}"
                texts_with_metadata.append(chunk.strip())
                metadatas.append({
                    "doc_id": doc_id,
                    "chunk_id": i,
                    "user_id": user_id,
                    "doc_name": name,
                    "timestamp": time.time()
                })
                ids.append(chunk_id)
        
        if texts_with_metadata:
            vector_store.add_texts(
                texts=texts_with_metadata,
                metadatas=metadatas,
                ids=ids
            )
            
            processing_time = time.time() - start_time
            print(f"✅ Successfully processed {len(files)} files in {processing_time:.2f}s")
            print(f"📊 Added {len(texts_with_metadata)} chunks to Pinecone for doc_id: {doc_id}")
        else:
            print("⚠️ No valid chunks found to add to Pinecone")

        stats = get_pinecone_stats()
        if stats and not stats.get('error'):
            print(f"📈 Pinecone Index Stats: {stats.get('total_vector_count', 'N/A')} total vectors")
        
    except Exception as e:
        print(f"❌ Error adding documents to Pinecone: {e}")
        raise

async def answer_question(user_id, doc_id, question):
    """Answer question using Pinecone vector store"""
    
    print(f"🤖 Processing question: '{question}' for doc_id: {doc_id}")
    cached = await get_cached_response(doc_id, question)
    if cached:
        return cached
    
    identity_keywords = ["model name", "what model", "your name", "who are you", "what are you", "ur name", "wat r u"]
    if any(k in question.lower() for k in identity_keywords):
        answer = "My name is Jack. I'm an AI assistant designed to help you understand and analyze your PDF documents."
        await cache_response(doc_id, question, answer)
        await learn_user_patterns(user_id, question, "identity")
        return answer
    
    try:
        vector_store = await get_cached_vector_store(doc_id)
        context = await optimized_content_search(question, vector_store, top_k=4)
        
        if not context:
            try:
                sample_docs = vector_store.similarity_search("", k=1)  
                if sample_docs:
                    print(f"📝 Sample content available: {sample_docs[0].page_content[:100]}...")
                else:
                    print("❌ No documents found in vector store")
            except Exception as e:
                print(f"❌ Error getting sample content: {e}")
            
            fallback = "I couldn't find relevant information in the document to answer your question. Could you try rephrasing it or asking about specific topics from your document?"
            await cache_response(doc_id, question, fallback)
            return fallback
        
        print(f"📚 Using {len(context)} context pieces for answer generation")
        
       
        history = load_history(doc_id)[-3:]
        history_str = "\n".join([f"Q: {h['question']}\nA: {h['answer']}" for h in history])
        docs = [Document(page_content=c) for c in context]
        chain = await chain_manager.get_chain(doc_id)
        
        response = chain({
            "input_documents": docs, 
            "question": question, 
            "history": history_str
        }, return_only_outputs=True)
        
        answer = response["output_text"].strip()
        
        if not answer or len(answer) < 10:
            answer = "I found relevant information but couldn't generate a comprehensive answer. Could you try asking more specifically?"
        
        await cache_response(doc_id, question, answer)
        await learn_user_patterns(user_id, question, answer)
        await append_history(doc_id, question, answer)
        
        return answer
        
    except Exception as e:
        print(f"❌ Error in answer_question: {e}")
        fallback = "I apologize, but I encountered an issue processing your question. Could you please try rephrasing it?"
        await append_history(doc_id, question, fallback)
        return fallback
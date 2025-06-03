import os
import pytesseract
from pdf2image import convert_from_path
from PyPDF2 import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain.chains.question_answering import load_qa_chain
from langchain.prompts import PromptTemplate
from utils.file_utils import save_files, append_history, load_history
import google.generativeai as genai
from PIL import ImageFilter, ImageOps
from dotenv import load_dotenv
from models.models import User, Chat
from concurrent.futures import ThreadPoolExecutor
import re
from fuzzywuzzy import fuzz, process
from collections import Counter
import json
import asyncio
import time
import pickle
from config.redis_config import get_redis
import random
from functools import lru_cache

load_dotenv()

DATA_DIR = "storage/faiss_index"

# API Key Management System
class APIKeyManager:
    def __init__(self):
        self.api_keys = []

        index = 1
        while True:
            key_name = f"GOOGLE_API_KEY{index}"
            key_value = os.getenv(key_name)
            if key_value:
                self.api_keys.append(key_value)
                index += 1
            else:
                break  

        if not self.api_keys:
            fallback_key = os.getenv("GOOGLE_API_KEY")
            if fallback_key:
                self.api_keys.append(fallback_key)

        if not self.api_keys:
            raise ValueError("❌ No valid Google API keys found in environment variables.")

        self.current_index = 0
        self.key_usage_count = {key: 0 for key in self.api_keys}
        self.key_errors = {key: 0 for key in self.api_keys}
        self.last_used = {key: 0 for key in self.api_keys}

        print(f"✅ Initialized API Key Manager with {len(self.api_keys)} keys")
    
    def get_next_key(self):
        """Get next API key using round-robin with error tracking"""
        current_time = time.time()
        
        best_key = None
        best_score = float('inf')
        
        for key in self.api_keys:
            if self.key_errors[key] > 10 and current_time - self.last_used[key] < 300:
                continue
            
            score = (
                self.key_usage_count[key] * 1.0 +  
                self.key_errors[key] * 2.0 +       
                max(0, 60 - (current_time - self.last_used[key])) * 0.1  
            )
            
            if score < best_score:
                best_score = score
                best_key = key
        
        if not best_key:
            best_key = self.api_keys[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.api_keys)
        
        # Update tracking
        self.key_usage_count[best_key] += 1
        self.last_used[best_key] = current_time
        
        return best_key
    
    def report_error(self, api_key):
        """Report an error for a specific API key"""
        if api_key in self.key_errors:
            self.key_errors[api_key] += 1
            print(f"⚠️ API Key error count for {api_key[-10:]}: {self.key_errors[api_key]}")
    
    def reset_error_counts(self):
        """Reset error counts (called periodically)"""
        self.key_errors = {key: max(0, count - 1) for key, count in self.key_errors.items()}

# Global API key manager
api_key_manager = APIKeyManager()

# Global cache for chains and embeddings
chain_cache = {}
embedding_cache = {}
document_cache = {}
user_patterns_cache = {}

# Chain timeout in seconds (5 minutes)
CHAIN_TIMEOUT = 300

# Response cache for frequently asked questions
response_cache = {}

class OptimizedChainManager:
    def __init__(self):
        self.chains = {}
        self.last_used = {}
        self.cleanup_task = None
        self.model_pool = {}  # Pool of pre-created models
        
    async def get_chain(self, doc_id: str):
        """Get or create a chain for a document"""
        current_time = time.time()
        
        # Check if chain exists and is still valid
        if doc_id in self.chains and doc_id in self.last_used:
            if current_time - self.last_used[doc_id] < CHAIN_TIMEOUT:
                self.last_used[doc_id] = current_time
                print(f"♻️ Reusing existing chain for doc_id: {doc_id}")
                return self.chains[doc_id]
            else:
                # Chain expired, remove it
                await self._remove_chain(doc_id)
        
        # Create new chain with optimizations
        chain = await self._create_optimized_chain(doc_id)
        self.chains[doc_id] = chain
        self.last_used[doc_id] = current_time
        
        # Start cleanup task if not running
        if self.cleanup_task is None or self.cleanup_task.done():
            self.cleanup_task = asyncio.create_task(self._cleanup_expired_chains())
        
        return chain
    
    async def _create_optimized_chain(self, doc_id: str):
        """Create a new optimized QA chain"""
        try:
            # Get embeddings (cached)
            embeddings = await get_cached_embeddings()
            
            # Get or create model from pool
            model = await self._get_pooled_model()
            
            # Optimized prompt template (shorter for faster processing)
            prompt_template = """Answer directly using the context. Be concise but complete.

            History: {history}
            Context: {context}
            Question: {question}

            Answer:"""
            
            prompt = PromptTemplate(
                template=prompt_template,
                input_variables=["context", "question", "history"]
            )
            
            chain = load_qa_chain(model, chain_type="stuff", prompt=prompt)
            print(f"✅ Created optimized chain for doc_id: {doc_id}")
            return chain
            
        except Exception as e:
            print(f"❌ Error creating chain for {doc_id}: {e}")
            raise
    
    async def _get_pooled_model(self):
        """Get a model from the pool or create a new one"""
        api_key = api_key_manager.get_next_key()
        
        if api_key not in self.model_pool:
            try:
                model = ChatGoogleGenerativeAI(
                    model="gemini-2.0-flash",
                    temperature=0.1,  # Lower temperature for faster, more deterministic responses
                    google_api_key=api_key,
                    max_tokens=512,   # Limit response length for speed
                )
                self.model_pool[api_key] = model
                print(f"✅ Created new model for API key: {api_key[-10:]}")
            except Exception as e:
                api_key_manager.report_error(api_key)
                print(f"❌ Error creating model with API key {api_key[-10:]}: {e}")
                raise
        
        return self.model_pool[api_key]
    
    async def _remove_chain(self, doc_id: str):
        """Remove a chain from cache"""
        if doc_id in self.chains:
            del self.chains[doc_id]
        if doc_id in self.last_used:
            del self.last_used[doc_id]
        print(f"🗑️ Removed expired chain for doc_id: {doc_id}")
    
    async def _cleanup_expired_chains(self):
        """Cleanup expired chains every minute"""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                current_time = time.time()
                expired_docs = []
                
                for doc_id, last_used_time in self.last_used.items():
                    if current_time - last_used_time > CHAIN_TIMEOUT:
                        expired_docs.append(doc_id)
                
                for doc_id in expired_docs:
                    await self._remove_chain(doc_id)
                
                # Reset API key error counts periodically
                api_key_manager.reset_error_counts()
                    
                # If no chains left, stop the cleanup task
                if not self.chains:
                    print("🧹 No active chains, stopping cleanup task")
                    break
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"❌ Error in cleanup task: {e}")

# Global optimized chain manager instance
chain_manager = OptimizedChainManager()

@lru_cache(maxsize=1)
def get_cached_embeddings_sync():
    """Synchronous cached embeddings creation"""
    api_key = api_key_manager.get_next_key()
    return GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=api_key
    )

async def get_cached_embeddings():
    """Get cached embeddings from Redis or create new ones"""
    redis_client = get_redis()
    cache_key = "embeddings:google_generative_ai_v2"
    
    try:
        # Try to get from Redis cache
        cached_embeddings = await redis_client.get(cache_key)
        if cached_embeddings:
            print("✅ Retrieved embeddings from Redis cache")
            # Return a new instance with round-robin API key
            return get_cached_embeddings_sync()
    except Exception as e:
        print(f"⚠️ Redis cache miss for embeddings: {e}")
    
    # Create new embeddings with round-robin API key
    embeddings = get_cached_embeddings_sync()
    
    try:
        # Cache embeddings marker in Redis for 2 hours
        await redis_client.setex(cache_key, 7200, "cached")
        print("✅ Cached embeddings marker in Redis")
    except Exception as e:
        print(f"⚠️ Failed to cache embeddings marker in Redis: {e}")
    
    return embeddings

async def get_cached_vector_store(doc_id: str):
    """Get cached vector store from Redis or load from disk"""
    redis_client = get_redis()
    cache_key = f"vector_store:{doc_id}"
    
    try:
        # Try to get from Redis cache
        cached_store = await redis_client.get(cache_key)
        if cached_store:
            store_data = pickle.loads(cached_store.encode('latin-1'))
            print(f"✅ Retrieved vector store for {doc_id} from Redis cache")
            return store_data
    except Exception as e:
        print(f"⚠️ Redis cache miss for vector store {doc_id}: {e}")
    
    # Load from disk
    try:
        embeddings = await get_cached_embeddings()
        vector_store = FAISS.load_local(
            os.path.join(DATA_DIR, doc_id),
            embeddings,
            allow_dangerous_deserialization=True
        )
        
        # Cache in Redis for 45 minutes
        try:
            store_serialized = pickle.dumps(vector_store).decode('latin-1')
            await redis_client.setex(cache_key, 2700, store_serialized)
            print(f"✅ Cached vector store for {doc_id} in Redis")
        except Exception as e:
            print(f"⚠️ Failed to cache vector store in Redis: {e}")
        
        return vector_store
        
    except Exception as e:
        print(f"❌ Error loading vector store for {doc_id}: {e}")
        raise

async def get_cached_document_content(doc_id: str):
    """Get cached document content from Redis"""
    redis_client = get_redis()
    cache_key = f"document_content:{doc_id}"
    
    try:
        cached_content = await redis_client.get(cache_key)
        if cached_content:
            print(f"✅ Retrieved document content for {doc_id} from Redis cache")
            return cached_content
    except Exception as e:
        print(f"⚠️ Redis cache miss for document content {doc_id}: {e}")
    
    return None

async def cache_document_content(doc_id: str, content: str):
    """Cache document content in Redis"""
    redis_client = get_redis()
    cache_key = f"document_content:{doc_id}"
    
    try:
        # Cache for 2 hours
        await redis_client.setex(cache_key, 7200, content)
        print(f"✅ Cached document content for {doc_id} in Redis")
    except Exception as e:
        print(f"⚠️ Failed to cache document content in Redis: {e}")

async def get_cached_response(doc_id: str, question: str):
    """Get cached response for frequently asked questions"""
    redis_client = get_redis()
    question_hash = hash(question.lower().strip())
    cache_key = f"response:{doc_id}:{question_hash}"
    
    try:
        cached_response = await redis_client.get(cache_key)
        if cached_response:
            print(f"✅ Retrieved cached response for question")
            return cached_response
    except Exception as e:
        print(f"⚠️ Redis cache miss for response: {e}")
    
    return None

async def cache_response(doc_id: str, question: str, answer: str):
    """Cache response for future use"""
    redis_client = get_redis()
    question_hash = hash(question.lower().strip())
    cache_key = f"response:{doc_id}:{question_hash}"
    
    try:
        # Cache for 1 hour
        await redis_client.setex(cache_key, 3600, answer)
        print(f"✅ Cached response for future use")
    except Exception as e:
        print(f"⚠️ Failed to cache response: {e}")

def preprocess_image(img):
    gray = ImageOps.grayscale(img)
    sharpened = gray.filter(ImageFilter.SHARPEN)
    enhanced = ImageOps.autocontrast(sharpened)
    return enhanced

def extract_text_from_pdf(file_path: str) -> str:
    full_text = ""
    try:
        reader = PdfReader(file_path)
        images = convert_from_path(file_path)
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if not page_text.strip():
                processed_img = preprocess_image(images[i])
                page_text = pytesseract.image_to_string(processed_img)
            full_text += page_text + "\n"
    except Exception as e:
        print(f"❌ PDF extraction failed: {e}")
    return full_text

def extract_text_from_all_pdfs(folder):
    files = [os.path.join(folder, f) for f in os.listdir(folder)]
    with ThreadPoolExecutor(max_workers=6) as executor:  # Increased workers
        texts = list(executor.map(extract_text_from_pdf, files))
    return "\n".join(texts)

def get_text_chunks(text):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,    # Reduced chunk size for faster processing
        chunk_overlap=200   # Reduced overlap
    )
    return splitter.split_text(text)

async def learn_user_patterns(userid, question, answer):
    """Optimized dynamic learning from user interactions"""
    if userid not in user_patterns_cache:
        user_patterns_cache[userid] = {
            'typo_patterns': {},
            'question_styles': [],
            'preferred_length': 'medium',
            'common_words': Counter()
        }
    
    user_data = user_patterns_cache[userid]
    
    # Learn question patterns (limit to last 10 for memory efficiency)
    if len(user_data['question_styles']) >= 10:
        user_data['question_styles'].pop(0)
    user_data['question_styles'].append(question.lower())
    
    words = re.findall(r'\b\w+\b', question.lower())
    user_data['common_words'].update(words)
    
    # Keep only top 50 words for memory efficiency
    if len(user_data['common_words']) > 50:
        user_data['common_words'] = Counter(dict(user_data['common_words'].most_common(50)))
    
    if any(word in question.lower() for word in ['brief', 'short', 'quickly']):
        user_data['preferred_length'] = 'short'
    elif any(word in question.lower() for word in ['detail', 'explain', 'comprehensive']):
        user_data['preferred_length'] = 'long'

async def optimized_content_search(question, document_content, vector_store):
    """Optimized content search with reduced complexity"""
    
    # Strategy 1: Vector similarity search (reduced k for speed)
    vector_docs = vector_store.similarity_search(question, k=3)
    
    # Strategy 2: Simple keyword matching
    question_words = set(re.findall(r'\b\w{3,}\b', question.lower()))
    sentences = re.split(r'[.!?]+', document_content)
    
    keyword_matches = []
    for sentence in sentences[:200]:  # Limit sentences for speed
        if len(sentence.strip()) < 20:
            continue
            
        sentence_lower = sentence.lower()
        matching_words = sum(1 for word in question_words if word in sentence_lower)
        
        if matching_words >= 2:  # At least 2 matching words
            keyword_matches.append(sentence.strip())
    
    # Combine results (limited for speed)
    combined_content = [doc.page_content for doc in vector_docs]
    combined_content.extend(keyword_matches[:2])
    
    return combined_content[:4]  # Return top 4 most relevant pieces

async def process_pdf_files(userid, doc_id, files, doc_name):
    user = await User.find_one(User.email == userid)
    if not user:
        raise Exception("User not found")

    chat = await Chat.find_one(Chat.doc_id == doc_id)
    if not chat:
        chat = Chat(user=user, doc_id=doc_id, doc_text=doc_name)
        await chat.insert()
    else:
        print(f"Adding files to existing chat: {doc_id}")

    folder = save_files(userid, doc_id, files)
    full_text = extract_text_from_all_pdfs(folder)
    
    # Cache the document content in Redis
    await cache_document_content(doc_id, full_text)
    
    chunks = get_text_chunks(full_text)

    embeddings = await get_cached_embeddings()
    
    # Check if vector store exists for merging
    vector_store_path = os.path.join(DATA_DIR, doc_id)
    if os.path.exists(vector_store_path):
        existing_vector_store = FAISS.load_local(
            vector_store_path,
            embeddings,
            allow_dangerous_deserialization=True
        )
        new_vector_store = FAISS.from_texts(chunks, embedding=embeddings)
        existing_vector_store.merge_from(new_vector_store)
        existing_vector_store.save_local(vector_store_path)
        
        # Update Redis cache
        try:
            redis_client = get_redis()
            cache_key = f"vector_store:{doc_id}"
            store_serialized = pickle.dumps(existing_vector_store).decode('latin-1')
            await redis_client.setex(cache_key, 2700, store_serialized)
            print(f"✅ Updated vector store cache for {doc_id}")
        except Exception as e:
            print(f"⚠️ Failed to update vector store cache: {e}")
    else:
        vector_store = FAISS.from_texts(chunks, embedding=embeddings)
        vector_store.save_local(vector_store_path)
        
        # Cache in Redis
        try:
            redis_client = get_redis()
            cache_key = f"vector_store:{doc_id}"
            store_serialized = pickle.dumps(vector_store).decode('latin-1')
            await redis_client.setex(cache_key, 2700, store_serialized)
            print(f"✅ Cached new vector store for {doc_id}")
        except Exception as e:
            print(f"⚠️ Failed to cache vector store: {e}")

async def answer_question(userid, doc_id, question):
    start_time = time.time()
    
    # Check for cached response first
    cached_response = await get_cached_response(doc_id, question)
    if cached_response:
        print(f"⚡ Returned cached response in {time.time() - start_time:.2f}s")
        return cached_response
    
    # Get document content from Redis cache
    document_content = await get_cached_document_content(doc_id)
    if not document_content:
        # Load from vector store if not cached
        try:
            vector_store = await get_cached_vector_store(doc_id)
            temp_docs = vector_store.similarity_search("", k=15)  # Reduced from 20
            document_content = "\n".join([doc.page_content for doc in temp_docs])
            await cache_document_content(doc_id, document_content)
        except Exception as e:
            print(f"❌ Error loading document content: {e}")
            document_content = ""
    
    # Handle model identity questions
    identity_keywords = ["model name", "what model", "your name", "who are you", "what are you", "ur name", "wat r u"]
    if any(keyword in question.lower() for keyword in identity_keywords):
        answer = "My name is Jack. I'm an AI assistant designed to help you understand and analyze your PDF documents."
        await cache_response(doc_id, question, answer)
        await learn_user_patterns(userid, question, "identity")
        print(f"⚡ Identity response in {time.time() - start_time:.2f}s")
        return answer
    
    # Get cached vector store
    vector_store = await get_cached_vector_store(doc_id)
    
    # Optimized content search (using original question directly without typo correction)
    relevant_content = await optimized_content_search(question, document_content, vector_store)
    
    # Get conversation history (limited for speed)
    full_history = load_history(doc_id)
    last_3_history = full_history[-3:] if len(full_history) > 3 else full_history  # Reduced from 5
    history = "\n".join([f"Q: {h['question']}\nA: {h['answer']}" for h in last_3_history])
    
    # Create document objects
    from langchain.schema import Document
    docs = [Document(page_content=content) for content in relevant_content]
    
    # Get or create persistent chain for this document
    chain = await chain_manager.get_chain(doc_id)

    try:
        response = chain(
            {"input_documents": docs, "question": question, "history": history},  # Using original question
            return_only_outputs=True
        )
        
        answer = response["output_text"].strip()
        
        # Cache the response
        await cache_response(doc_id, question, answer)
        
        # Learn from this interaction
        await learn_user_patterns(userid, question, answer)
        
        await append_history(doc_id, question, answer)
        
        print(f"⚡ Generated response in {time.time() - start_time:.2f}s")
        return answer
        
    except Exception as e:
        print(f"❌ Error in answer_question: {e}")
        fallback_answer = "I apologize, but I encountered an issue processing your question. Could you please try rephrasing it?"
        await append_history(doc_id, question, fallback_answer)
        return fallback_answer
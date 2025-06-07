from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain.chains.question_answering import load_qa_chain
from langchain.prompts import PromptTemplate
from langchain_pinecone import PineconeVectorStore
import asyncio
import time
from utils.redis_config import get_redis
from utils.pinecone import get_pinecone_index
from functools import lru_cache
from .api_key import APIKeyManager
import os

CHAIN_TIMEOUT = 300
api_key_manager = APIKeyManager()

class OptimizedChainManager:
    def __init__(self):
        self.chains = {}
        self.last_used = {}
        self.cleanup_task = None
        self.model_pool = {}

    async def get_chain(self, doc_id: str):
        current_time = time.time()
        if doc_id in self.chains and doc_id in self.last_used:
            if current_time - self.last_used[doc_id] < CHAIN_TIMEOUT:
                self.last_used[doc_id] = current_time
                print(f"♻️ Reusing existing chain for doc_id: {doc_id}")
                return self.chains[doc_id]
            else:
                await self._remove_chain(doc_id)

        chain = await self._create_optimized_chain(doc_id)
        self.chains[doc_id] = chain
        self.last_used[doc_id] = current_time

        if self.cleanup_task is None or self.cleanup_task.done():
            self.cleanup_task = asyncio.create_task(self._cleanup_expired_chains())

        return chain

    async def _create_optimized_chain(self, doc_id: str):
        try:
            embeddings = await get_cached_embeddings()
            model = await self._get_pooled_model()
            
            # Enhanced prompt template for better context understanding
            prompt_template = """You are Jack, a helpful AI assistant. Answer the user's question using the provided context and conversation history.

            INSTRUCTIONS:
            - Be direct and informative
            - Use the context to provide accurate answers
            - If information isn't in the context, say so clearly
            - Maintain conversation continuity using the history

            CONVERSATION HISTORY:
            {history}

            DOCUMENT CONTEXT:
            {context}

            USER QUESTION: {question}

            ANSWER:"""
            
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
        api_key = api_key_manager.get_next_key()
        if api_key not in self.model_pool:
            try:
                model = ChatGoogleGenerativeAI(
                    model="gemini-2.0-flash",
                    temperature=0.1,
                    google_api_key=api_key,
                    max_tokens=512,
                )
                self.model_pool[api_key] = model
                print(f"✅ Created new model for API key: {api_key[-10:]}")
            except Exception as e:
                api_key_manager.report_error(api_key)
                print(f"❌ Error creating model with API key {api_key[-10:]}: {e}")
                raise
        return self.model_pool[api_key]

    async def _remove_chain(self, doc_id: str):
        if doc_id in self.chains:
            del self.chains[doc_id]
        if doc_id in self.last_used:
            del self.last_used[doc_id]
        print(f"🗑️ Removed expired chain for doc_id: {doc_id}")

    async def _cleanup_expired_chains(self):
        while True:
            try:
                await asyncio.sleep(60)
                current_time = time.time()
                expired_docs = []

                for doc_id, last_used_time in self.last_used.items():
                    if current_time - last_used_time > CHAIN_TIMEOUT:
                        expired_docs.append(doc_id)

                for doc_id in expired_docs:
                    await self._remove_chain(doc_id)

                api_key_manager.reset_error_counts()

                if not self.chains:
                    print("🧹 No active chains, stopping cleanup task")
                    break

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"❌ Error in cleanup task: {e}")

@lru_cache(maxsize=1)
def get_cached_embeddings_sync():
    api_key = api_key_manager.get_next_key()
    return GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=api_key
    )

async def get_cached_embeddings():
    redis_client = get_redis()
    cache_key = "embeddings:google_generative_ai_v2"

    try:
        cached_embeddings = await redis_client.get(cache_key)
        if cached_embeddings:
            print("✅ Retrieved embeddings from Redis cache")
            return get_cached_embeddings_sync()
    except Exception as e:
        print(f"⚠️ Redis cache miss for embeddings: {e}")

    embeddings = get_cached_embeddings_sync()

    try:
        await redis_client.setex(cache_key, 7200, "cached")
        print("✅ Cached embeddings marker in Redis")
    except Exception as e:
        print(f"⚠️ Failed to cache embeddings marker in Redis: {e}")

    return embeddings

async def get_pinecone_vector_store(doc_id: str, embeddings):
    """Get or create Pinecone vector store for document"""
    try:
        index = get_pinecone_index()
        
        # Create namespace for the document
        namespace = f"doc_{doc_id}"
        
        # Create PineconeVectorStore
        vector_store = PineconeVectorStore(
            index=index,
            embedding=embeddings,
            namespace=namespace,
            text_key="text"
        )
        
        print(f"✅ Connected to Pinecone vector store for doc_id: {doc_id}")
        return vector_store
        
    except Exception as e:
        print(f"❌ Error getting Pinecone vector store for {doc_id}: {e}")
        raise
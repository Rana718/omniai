import re
import hashlib
from collections import Counter
from utils.redis_config import get_redis

user_patterns_cache = {}

def _generate_cache_key(doc_id, question, context_only=False):
    """Generate consistent cache key using SHA-256 hash"""
    normalized_question = question.lower().strip()
    cache_string = f"{doc_id}:{context_only}:{normalized_question}"
    question_hash = hashlib.sha256(cache_string.encode('utf-8')).hexdigest()[:16]
    return f"response:{doc_id}:{context_only}:{question_hash}"

async def get_cached_response(doc_id, question, context_only=False):
    """Get cached response for frequently asked questions with context_only awareness"""
    try:
        redis_client = get_redis()
        cache_key = _generate_cache_key(doc_id, question, context_only)
        response = await redis_client.get(cache_key)
        if response:
            print(f"✅ Retrieved cached response (context_only={context_only})")
            return response
        return None
    except Exception as e:
        print(f"⚠️ Failed to get cached response: {e}")
        return None

async def cache_response(doc_id, question, answer, context_only=False):
    """Cache response for future use with context_only awareness"""
    try:
        redis_client = get_redis()
        cache_key = _generate_cache_key(doc_id, question, context_only)
        await redis_client.setex(cache_key, 3600, answer)
        print(f"✅ Cached response for future use (context_only={context_only})")
    except Exception as e:
        print(f"⚠️ Failed to cache response: {e}")

async def learn_user_patterns(user_id, question, _):
    """Learn user patterns for better responses"""
    try:
        data = user_patterns_cache.setdefault(user_id, {
            'typo_patterns': {}, 
            'question_styles': [], 
            'preferred_length': 'medium', 
            'common_words': Counter()
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
            
    except Exception as e:
        print(f"⚠️ Error learning user patterns: {e}")

async def optimized_content_search(question, vector_store, top_k=4):
    """Optimized content search using Pinecone"""
    try:
        print(f"🔍 Searching for: '{question}' in Pinecone")
        docs = vector_store.similarity_search(question, k=top_k)
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
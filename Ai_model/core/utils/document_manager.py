import time
import uuid
from langchain.text_splitter import RecursiveCharacterTextSplitter
from utils.redis_config import get_redis
from utils.pinecone import get_pinecone_index
from utils.file_utils import save_files
from utils.ChainManager import get_cached_embeddings, get_pinecone_vector_store
from services.grpc_func import ServiceClient
from core import extract_text_from_all_files, count_words

client = ServiceClient()

def get_text_chunks(text):
    """Split text into chunks for vector storage"""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, 
        chunk_overlap=200,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
    return splitter.split_text(text)

async def cache_document_content(doc_id, content):
    """Cache document content in Redis"""
    try:
        redis_client = get_redis()
        await redis_client.setex(f"document_content:{doc_id}", 7200, content)
        print(f"✅ Cached document content for {doc_id}")
    except Exception as e:
        print(f"⚠️ Failed to cache document content: {e}")

async def get_cached_document_content(doc_id):
    """Get cached document content from Redis"""
    try:
        redis_client = get_redis()
        content = await redis_client.get(f"document_content:{doc_id}")
        if content:
            print(f"✅ Retrieved document content for {doc_id} from Redis")
        return content
    except Exception as e:
        print(f"⚠️ Failed to get cached document content: {e}")
        return None

async def process_files(user_id, doc_id, files, name):
    """Process multiple file types and store in Pinecone"""
    start_time = time.time()
    
    # Ensure name is not None or empty
    if not name or name.strip() == "":
        name = "Untitled Document"
    
    # Try to get or create chat (with error handling)
    try:
        chat = await client.get_chat(doc_id)
        if not chat:
            try:
                response = await client.create_chat(doc_id, user_id, doc_text=name)
                if not response:
                    print(f"⚠️ Failed to create chat via gRPC, proceeding without chat creation")
                else:
                    print(f"✅ Created new chat for doc_id: {doc_id}")
            except Exception as grpc_error:
                print(f"⚠️ gRPC connection failed: {grpc_error}")
                return{
                    "error": "Chat service unavailable. Please try again later."
                }
        else:
            print(f"✅ Using existing chat for doc_id: {doc_id}")
    except Exception as e:
        print(f"⚠️ Chat service unavailable: {e}")
        print("📝 Proceeding with file processing without chat creation")
    
    # Process files
    try:
        folder = save_files(user_id, doc_id, files)
        full_text = extract_text_from_all_files(folder)
        
        if not full_text.strip():
            print(f"❌ No text extracted from {len(files)} files")
            # Log file details for debugging
            for file in files:
                print(f"📄 File: {file.filename}, Size: {file.size if hasattr(file, 'size') else 'unknown'}")
            
            return {
                "error": "No text could be extracted from the uploaded files. Please ensure your files contain readable text or try uploading different file formats (PDF, TXT, DOC, DOCX, or images with text)."
            }
        
        # Count words in extracted text
        word_count = count_words(full_text)
        print(f"📊 Extracted {word_count} words from {len(files)} files")
        
        # Check minimum word requirement
        if word_count < 20:
            return {
                "error": f"The extracted text contains only {word_count} words. A minimum of 20 words is required for processing. Please upload files with more text content."
            }
        
        print(f"✅ Text validation passed: {word_count} words extracted")
        
        await cache_document_content(doc_id, full_text)
        chunks = get_text_chunks(full_text)

        print(f"📄 Created {len(chunks)} text chunks")
        if chunks:
            print(f"📝 First chunk preview: {chunks[0][:200]}...")
            
        embeddings = await get_cached_embeddings()
        vector_store = await get_pinecone_vector_store(doc_id, embeddings)
        
        # Store in Pinecone
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
        
        # Get valid file types, ensuring no None values
        file_types = []
        for f in files:
            if f.filename and '.' in f.filename:
                file_types.append(f.filename.split('.')[-1].lower())
            else:
                file_types.append('unknown')
        
        for i, chunk in enumerate(chunks):
            if chunk.strip(): 
                chunk_id = f"{doc_id}_chunk_{i}_{uuid.uuid4().hex[:8]}"
                texts_with_metadata.append(chunk.strip())
                
                # Ensure all metadata values are valid (no None values)
                metadata = {
                    "doc_id": str(doc_id),
                    "chunk_id": i,
                    "user_id": str(user_id),
                    "doc_name": str(name),  # Ensure it's a string
                    "timestamp": float(time.time()),
                    "file_types": file_types,  # List of strings
                    "total_words": int(word_count)
                }
                
                metadatas.append(metadata)
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
            
            return {
                "success": True,
                "total_words": word_count,
                "chunks_created": len(texts_with_metadata),
                "files_processed": len(files)
            }
        else:
            return {
                "error": "No valid chunks could be created from the extracted text."
            }
        
    except Exception as e:
        print(f"❌ Error in file processing: {e}")
        return {
            "error": f"Failed to process files: {str(e)}"
        }

async def get_cached_vector_store(doc_id):
    """Get vector store from Pinecone with Redis caching"""
    cache_key = f"pinecone_store:{doc_id}"
    
    try:
        redis_client = get_redis()
        cached = await redis_client.get(cache_key)
        if cached:
            print(f"✅ Vector store metadata found in Redis for doc_id: {doc_id}")
    except Exception as e:
        print(f"⚠️ Redis cache check failed: {e}")
    
    try:
        embeddings = await get_cached_embeddings()
        vector_store = await get_pinecone_vector_store(doc_id, embeddings)
        
        try:
            redis_client = get_redis()
            await redis_client.setex(cache_key, 3600, "exists")
            print(f"✅ Cached vector store metadata for {doc_id}")
        except Exception as e:
            print(f"⚠️ Failed to cache vector store metadata: {e}")
        
        return vector_store
        
    except Exception as e:
        print(f"❌ Error getting vector store for {doc_id}: {e}")
        raise
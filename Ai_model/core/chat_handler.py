from langchain.schema import Document
from utils.file_utils import append_history, load_history
from utils.ChainManager import OptimizedChainManager
from core import get_cached_vector_store, get_cached_response, cache_response, learn_user_patterns, optimized_content_search


chain_manager = OptimizedChainManager()

async def answer_question(user_id, doc_id, question, is_normal_chat=False, context_only=False):
    """Answer question using unified approach with direct model calls for hybrid mode
    
    Args:
        user_id: The user ID
        doc_id: The document ID
        question: The user's question
        is_normal_chat: Whether this is a normal chat without document context
        context_only: If True, only use embedded data; if False, use Gemini directly
    """
    
    print(f"🤖 Processing question: '{question}' for doc_id: {doc_id}, normal_chat: {is_normal_chat}, context_only: {context_only}")
    
    cached = await get_cached_response(doc_id, question, context_only)
    if cached:
        return cached
    
    identity_keywords = ["model name", "what model", "your name", "who are you", "what are you", "ur name", "wat r u"]
    if any(k in question.lower() for k in identity_keywords):
        answer = "My name is Jack. I'm an AI assistant designed to help you understand and analyze your documents."
        await cache_response(doc_id, question, answer, context_only)
        await learn_user_patterns(user_id, question, "identity")
        await append_history(doc_id, question, answer)
        return answer
    
    try:
        # For normal chat (without document context)
        if is_normal_chat:
            if context_only:
                answer = "I can't provide a context-only answer for a normal chat as there's no document context available. Please upload a document first or ask questions about your documents."
                await cache_response(doc_id, question, answer, context_only)
                await append_history(doc_id, question, answer)
                return answer
                
            print(f"💬 Processing as normal chat for doc_id: {doc_id}")
            # Use direct model call for normal chat - clean prompt without history
            model = await chain_manager.get_direct_model(doc_id)
            
            prompt = f"""You are Jack, a helpful AI assistant. Answer the user's question directly and conversationally.

            User Question: {question}
            Answer:"""
            
            response = await model.ainvoke(prompt)
            answer = response.content.strip()
            
            if not answer or len(answer) < 10:
                answer = "I'm not sure I understand your question. Could you please provide more details?"
            
            await cache_response(doc_id, question, answer, context_only)
            await learn_user_patterns(user_id, question, answer)
            await append_history(doc_id, question, answer)
            
            return answer
        
        # For document-based chat
        if context_only:
            print("📄 Using context-only mode - searching embedded data only")
            vector_store = await get_cached_vector_store(doc_id)
            context = await optimized_content_search(question, vector_store, top_k=4)
            
            # Get conversation history for context-only mode
            history = load_history(doc_id)[-3:]
            history_str = "\n".join([f"Q: {h['question']}\nA: {h['answer']}" for h in history])
            
            # Get context-only chain
            chain = await chain_manager.get_chain(doc_id, context_only=True)
            
            if not context:
                docs = []
            else:
                docs = [Document(page_content=c) for c in context]
            
            response = chain({
                "input_documents": docs, 
                "question": question, 
                "history": history_str
            }, return_only_outputs=True)
            
            answer = response["output_text"].strip()
            
            if not answer or len(answer) < 10:
                answer = "The provided documents do not contain sufficient information to answer your question. Please try asking about topics that are specifically covered in your documents."
            
            await cache_response(doc_id, question, answer, context_only)
            await learn_user_patterns(user_id, question, "context_only")
            await append_history(doc_id, question, answer)
            return answer
        
        else:
            print("🔄 Using hybrid mode - Pure Gemini response without document interference")
            
            # Get direct model for hybrid mode
            model = await chain_manager.get_direct_model(doc_id)
            
            # Create clean prompt for pure Gemini response without context or history interference
            prompt = f"""You are Jack, a helpful AI assistant. Answer the user's question directly using your knowledge.

            Instructions:
            - Provide a clear, direct answer to the question
            - Use your general knowledge to give the best response
            - Be conversational and helpful
            - Don't reference any documents or previous conversations

            User Question: {question}

            Answer:"""
            
            response = await model.ainvoke(prompt)
            answer = response.content.strip()
            
            if not answer or len(answer) < 10:
                answer = "I'm having trouble generating a response. Could you please try rephrasing your question?"
            
            await cache_response(doc_id, question, answer, context_only)
            await learn_user_patterns(user_id, question, answer)
            await append_history(doc_id, question, answer)
            
            return answer
        
    except Exception as e:
        print(f"❌ Error in answer_question: {e}")
        fallback = "I apologize, but I encountered an issue processing your question. Could you please try rephrasing it?"
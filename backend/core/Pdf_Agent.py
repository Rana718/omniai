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

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

DATA_DIR = "storage/faiss_index"
vector_cache = {}
document_cache = {}
user_patterns_cache = {} 


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
    with ThreadPoolExecutor(max_workers=4) as executor:
        texts = list(executor.map(extract_text_from_pdf, files))
    return "\n".join(texts)


def get_text_chunks(text):
    splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=300)
    return splitter.split_text(text)


def get_vector_store(doc_id, embeddings):
    if doc_id not in vector_cache:
        vector_store = FAISS.load_local(
            os.path.join(DATA_DIR, doc_id),
            embeddings,
            allow_dangerous_deserialization=True
        )
        vector_cache[doc_id] = vector_store
    return vector_cache[doc_id]


async def learn_user_patterns(userid, question, answer):
    """Dynamic learning from user interactions"""
    if userid not in user_patterns_cache:
        user_patterns_cache[userid] = {
            'typo_patterns': {},
            'question_styles': [],
            'preferred_length': 'medium',
            'common_words': Counter()
        }
    
    user_data = user_patterns_cache[userid]
    
    # Learn question patterns
    user_data['question_styles'].append(question.lower())
    
    words = re.findall(r'\b\w+\b', question.lower())
    user_data['common_words'].update(words)
    
    if any(word in question.lower() for word in ['brief', 'short', 'quickly']):
        user_data['preferred_length'] = 'short'
    elif any(word in question.lower() for word in ['detail', 'explain', 'comprehensive']):
        user_data['preferred_length'] = 'long'


async def dynamic_typo_correction(userid, question, document_content):
    """AI-powered dynamic typo correction using document context"""
    
    # Use AI to understand and correct the question
    correction_prompt = f"""
    The user wrote: "{question}"
    
    Available document contains words like: {' '.join(list(set(re.findall(r'\b\w+\b', document_content.lower())))[:50])}
    
    Common typing patterns to consider:
    - Missing letters (wht -> what)
    - Extra letters (whhat -> what)
    - Letter swaps (teh -> the)
    - Phonetic spelling (ur -> your)
    - Abbreviations (doc -> document)
    
    What did the user most likely mean? Provide only the corrected question without explanation:
    """
    
    try:
        correction_model = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            temperature=0.1,
        )
        
        corrected_response = correction_model.invoke(correction_prompt)
        corrected_question = corrected_response.content.strip()
        
        if corrected_question and len(corrected_question) > 3:
            return corrected_question
            
    except Exception as e:
        print(f"AI correction failed: {e}")
    
    return question  # Return original if correction fails


async def dynamic_content_search(question, document_content, vector_store):
    """Dynamic multi-strategy search"""
    
    # Strategy 1: Vector similarity search
    vector_docs = vector_store.similarity_search(question, k=4)
    
    # Strategy 2: Fuzzy text matching
    sentences = re.split(r'[.!?]+', document_content)
    question_words = re.findall(r'\b\w+\b', question.lower())
    
    fuzzy_matches = []
    for sentence in sentences:
        if len(sentence.strip()) < 20:
            continue
            
        sentence_words = re.findall(r'\b\w+\b', sentence.lower())
        
        # Calculate fuzzy match score
        total_score = 0
        for q_word in question_words:
            if len(q_word) > 2:
                best_match = process.extractOne(q_word, sentence_words)
                if best_match and best_match[1] > 60:
                    total_score += best_match[1]
        
        if total_score > 100:  # Threshold for relevance
            fuzzy_matches.append((sentence.strip(), total_score))
    
    # Sort fuzzy matches by score
    fuzzy_matches.sort(key=lambda x: x[1], reverse=True)
    
    # Strategy 3: Keyword extraction and matching
    all_words = re.findall(r'\b\w{3,}\b', document_content.lower())
    word_freq = Counter(all_words)
    important_words = [word for word, freq in word_freq.most_common(100) if freq > 2]
    
    keyword_matches = []
    for sentence in sentences:
        if len(sentence.strip()) < 20:
            continue
            
        sentence_lower = sentence.lower()
        score = 0
        
        for q_word in question_words:
            for imp_word in important_words:
                if fuzz.ratio(q_word, imp_word) > 75:
                    if imp_word in sentence_lower:
                        score += 2
        
        if score > 3:
            keyword_matches.append(sentence.strip())
    
    # Combine all results
    combined_content = [doc.page_content for doc in vector_docs]
    combined_content.extend([match[0] for match in fuzzy_matches[:3]])
    combined_content.extend(keyword_matches[:2])
    
    # Remove duplicates while preserving order
    seen = set()
    unique_content = []
    for content in combined_content:
        content_signature = content[:50]  # Use first 50 chars as signature
        if content_signature not in seen:
            unique_content.append(content)
            seen.add(content_signature)
    
    return unique_content[:6]  # Return top 6 most relevant pieces


async def generate_dynamic_prompt(userid, question, corrected_question, document_content, history):
    """Generate dynamic prompt based on user patterns and content"""
    
    user_data = user_patterns_cache.get(userid, {})
    preferred_length = user_data.get('preferred_length', 'medium')
    
    # Detect answer length requirement dynamically
    length_instruction = ""
    if re.search(r'\b(\d+)\s*words?\b', question):
        match = re.search(r'\b(\d+)\s*words?\b', question)
        word_count = match.group(1)
        length_instruction = f"Provide your answer in approximately {word_count} words."
    elif any(word in question.lower() for word in ['brief', 'short', 'quickly', 'summarize']):
        length_instruction = "Provide a brief answer (30-50 words)."
    elif any(word in question.lower() for word in ['detail', 'detailed', 'explain', 'comprehensive', 'elaborate']):
        length_instruction = "Provide a detailed and comprehensive answer (100-200 words)."
    elif preferred_length == 'short':
        length_instruction = "Provide a concise answer (40-80 words)."
    elif preferred_length == 'long':
        length_instruction = "Provide a thorough answer (80-150 words)."
    else:
        length_instruction = "Provide a clear and appropriately detailed answer."
    
    # Direct and clean prompt template
    prompt_template = f"""
    You are Jack. Answer the question directly using the provided context.
    
    INSTRUCTIONS:
    1. {length_instruction}
    2. Be direct and to the point
    3. Do not introduce yourself or mention being an AI assistant
    4. Do not use phrases like "Based on the context" or "According to the document"
    5. Do not use bullet points (*) or special formatting
    6. Present information in a clean, readable format
    7. Use proper grammar and spelling
    8. If the information isn't available, simply say "This information is not available in the document."
    
    CONVERSATION HISTORY:
    {{history}}
    
    DOCUMENT CONTEXT:
    {{context}}
    
    USER'S QUESTION: {{question}}
    
    Direct answer:
    """
    
    return prompt_template


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
    
    # Cache the document content
    document_cache[doc_id] = full_text
    
    chunks = get_text_chunks(full_text)

    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    
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
        vector_cache[doc_id] = existing_vector_store
    else:
        vector_store = FAISS.from_texts(chunks, embedding=embeddings)
        vector_store.save_local(vector_store_path)


async def answer_question(userid, doc_id, question):
    # Get document content
    document_content = document_cache.get(doc_id, "")
    if not document_content:
        # Load from vector store if not cached
        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        vector_store = get_vector_store(doc_id, embeddings)
        try:
            temp_docs = vector_store.similarity_search("", k=20)
            document_content = "\n".join([doc.page_content for doc in temp_docs])
            document_cache[doc_id] = document_content
        except:
            pass
    
    # Handle model identity questions
    identity_keywords = ["model name", "what model", "your name", "who are you", "what are you", "ur name", "wat r u"]
    if any(keyword in question.lower() for keyword in identity_keywords):
        await learn_user_patterns(userid, question, "identity")
        return "My name is Jack. I'm an AI assistant designed to help you understand and analyze your PDF documents. I can answer questions, provide summaries, and help you find specific information in your documents."
    
    # Dynamic typo correction
    corrected_question = await dynamic_typo_correction(userid, question, document_content)
    
    # Get embeddings and vector store
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    vector_store = get_vector_store(doc_id, embeddings)
    
    # Dynamic content search
    relevant_content = await dynamic_content_search(corrected_question, document_content, vector_store)
    
    # Get conversation history
    full_history = load_history(doc_id)
    last_5_history = full_history[-5:] if len(full_history) > 5 else full_history
    history = "\n".join([f"Q: {h['question']}\nA: {h['answer']}" for h in last_5_history])
    
    # Generate dynamic prompt
    prompt_template = await generate_dynamic_prompt(userid, question, corrected_question, document_content, history)
    
    # Create document objects
    from langchain.schema import Document
    docs = [Document(page_content=content) for content in relevant_content]
    
    model = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        temperature=0.2,
    )
    
    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["context", "question", "history"]
    )

    chain = load_qa_chain(model, chain_type="stuff", prompt=prompt)

    try:
        response = chain(
            {"input_documents": docs, "question": corrected_question, "history": history},
            return_only_outputs=True
        )
        
        answer = response["output_text"].strip()
        
        # Learn from this interaction
        await learn_user_patterns(userid, question, answer)
        
        await append_history(doc_id, question, answer)
        return answer
        
    except Exception as e:
        print(f"Error in answer_question: {e}")
        fallback_answer = "I apologize, but I encountered an issue processing your question. Could you please try rephrasing it?"
        await append_history(doc_id, question, fallback_answer)
        return fallback_answer
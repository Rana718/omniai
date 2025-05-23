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

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

DATA_DIR = "storage/faiss_index"
vector_cache = {} 


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
    splitter = RecursiveCharacterTextSplitter(chunk_size=3000, chunk_overlap=500)
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


async def process_pdf_files(userid, doc_id, files):
    user = await User.find_one(User.email == userid)
    if not user:
        raise Exception("User not found")

    chat = await Chat.find_one(Chat.doc_id == doc_id)
    if not chat:
        chat = Chat(user=user, doc_id=doc_id, doc_text="This is a test")
        await chat.insert()

    folder = save_files(userid, doc_id, files)
    full_text = extract_text_from_all_pdfs(folder)
    chunks = get_text_chunks(full_text)

    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    vector_store = FAISS.from_texts(chunks, embedding=embeddings)
    vector_store.save_local(os.path.join(DATA_DIR, doc_id))


async def answer_question(userid, doc_id, question):
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    vector_store = get_vector_store(doc_id, embeddings)

    docs = vector_store.similarity_search(question, k=3)  
    full_history = load_history(doc_id)
    last_3_history = full_history[-3:] if len(full_history) > 3 else full_history
    history = "\n".join([f"Q: {h['question']}\nA: {h['answer']}" for h in last_3_history])

    prompt_template = """
        Answer the question using only the context below and the previous Q&A history. 
        If not found, say "answer is not available in the context".

        History:
        {history}

        Context:
        {context}

        Question: {question}

        Answer:
    """
    model = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        temperature=0.3,
    )
    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["context", "question", "history"]
    )

    chain = load_qa_chain(model, chain_type="stuff", prompt=prompt)

    response = chain(
        {"input_documents": docs, "question": question, "history": history},
        return_only_outputs=True
    )

    await append_history(doc_id, question, response["output_text"])
    return response["output_text"]

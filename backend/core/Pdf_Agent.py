import os
import tempfile
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
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

DATA_DIR = "storage/faiss_index"


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF using both PyPDF2 and OCR with pytesseract."""
    full_text = ""

    print(f"\n🔍 Extracting from {file_path} using PyPDF2...")
    try:
        reader = PdfReader(file_path)
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            print(f"[PyPDF2] Page {i+1}: {repr(page_text)}")
            if page_text:
                full_text += page_text + "\n"
    except Exception as e:
        print(f"❌ PyPDF2 read error: {e}")

    print(f"🧠 Now performing OCR on images from {file_path}...")
    try:
        images = convert_from_path(file_path)
        for i, img in enumerate(images):
            ocr_text = pytesseract.image_to_string(img)
            print(f"[OCR] Page {i+1}: {repr(ocr_text[:200])}...")  # print first 200 chars
            full_text += ocr_text + "\n"
    except Exception as e:
        print(f"❌ OCR failed: {e}")

    return full_text


def get_text_chunks(text):
    splitter = RecursiveCharacterTextSplitter(chunk_size=10000, chunk_overlap=1000)
    return splitter.split_text(text)


async def process_pdf_files(userid, doc_id, files):
    folder = save_files(userid, doc_id, files)
    full_text = ""
    for f in os.listdir(folder):
        full_text += extract_text_from_pdf(os.path.join(folder, f))

    chunks = get_text_chunks(full_text)
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

    vector_store = FAISS.from_texts(chunks, embedding=embeddings)
    vector_store.save_local(os.path.join(DATA_DIR, doc_id))


async def answer_question(userid, doc_id, question):
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    vector_store = FAISS.load_local(
        os.path.join(DATA_DIR, doc_id),
        embeddings,
        allow_dangerous_deserialization=True
    )

    docs = vector_store.similarity_search(question)

    prompt_template = """
    Answer the question using only the context below. If not found, say "answer is not available in the context".

    Context:
    {context}

    Question: {question}

    Answer:
    """
    model = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.3)
    prompt = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
    chain = load_qa_chain(model, chain_type="stuff", prompt=prompt)

    response = chain({"input_documents": docs, "question": question}, return_only_outputs=True)

    append_history(doc_id, question, response["output_text"])

    return response["output_text"]

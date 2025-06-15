import os
import re
import pytesseract
import docx
import docx2txt
from PyPDF2 import PdfReader
from PIL import ImageFilter, ImageOps, Image
from pdf2image import convert_from_path
from concurrent.futures import ThreadPoolExecutor

def count_words(text):
    """Count words in text"""
    return len(re.findall(r'\b\w+\b', text.strip()))

def extract_text_from_txt(path):
    """Extract text from TXT file"""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        try:
            with open(path, 'r', encoding='latin-1') as f:
                return f.read()
        except Exception as e:
            print(f"❌ TXT extraction failed for {path}: {e}")
            return ""
    except Exception as e:
        print(f"❌ TXT extraction failed for {path}: {e}")
        return ""

def extract_text_from_docx(path):
    """Extract text from DOCX file"""
    try:
        doc = docx.Document(path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    except Exception as e:
        print(f"❌ DOCX extraction failed for {path}: {e}")
        return ""

def extract_text_from_doc(path):
    """Extract text from DOC file (requires python-docx2txt)"""
    try:
        return docx2txt.process(path)
    except ImportError:
        print("❌ docx2txt not installed. Cannot process .doc files")
        return ""
    except Exception as e:
        print(f"❌ DOC extraction failed for {path}: {e}")
        return ""

def preprocess_image(img):
    """Preprocess image for better OCR"""
    return ImageOps.autocontrast(ImageOps.grayscale(img).filter(ImageFilter.SHARPEN))

def extract_text_from_image(path):
    """Extract text from image using OCR"""
    try:
        img = Image.open(path)
        processed_img = preprocess_image(img)
        text = pytesseract.image_to_string(processed_img)
        return text
    except Exception as e:
        print(f"❌ Image OCR failed for {path}: {e}")
        return ""

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

def extract_text_from_file(path):
    """Extract text from any supported file type"""
    file_ext = os.path.splitext(path)[1].lower()
    
    extractors = {
        '.pdf': extract_text_from_pdf,
        '.txt': extract_text_from_txt,
        '.docx': extract_text_from_docx,
        '.doc': extract_text_from_doc,
        '.png': extract_text_from_image,
        '.jpg': extract_text_from_image,
        '.jpeg': extract_text_from_image,
        '.tiff': extract_text_from_image,
        '.bmp': extract_text_from_image,
    }
    
    extractor = extractors.get(file_ext)
    if extractor:
        print(f"📄 Extracting text from {file_ext} file: {os.path.basename(path)}")
        return extractor(path)
    else:
        print(f"❌ Unsupported file type: {file_ext}")
        return ""

def extract_text_from_all_files(folder):
    """Extract text from all supported files in folder using ThreadPoolExecutor"""
    supported_extensions = {'.pdf', '.txt', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.tiff', '.bmp'}
    files = []
    
    for f in os.listdir(folder):
        file_ext = '.' + f.split('.')[-1].lower()
        if file_ext in supported_extensions:
            files.append(os.path.join(folder, f))
    
    print(f"📁 Found {len(files)} supported files to process")
    
    with ThreadPoolExecutor(max_workers=4) as executor:
        texts = list(executor.map(extract_text_from_file, files))
    
    combined_text = "\n".join(filter(None, texts))
    return combined_text
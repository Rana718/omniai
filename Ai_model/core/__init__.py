from core.proces.file_process import extract_text_from_all_files, count_words
from core.utils.document_manager import process_files, get_cached_vector_store
from core.proces.search_engine import optimized_content_search, get_cached_response, cache_response, learn_user_patterns
from .chat_handler import answer_question

__all__ = [
    'extract_text_from_all_files',
    'count_words', 
    'process_files',
    'get_cached_vector_store',
    'optimized_content_search',
    'get_cached_response',
    'cache_response',
    'answer_question',
    'learn_user_patterns'
]
import json
import logging
from .rabbitmq import rabbitmq_manager

logger = logging.getLogger(__name__)

def produce_qa_history(doc_id, question, answer, hisid, timestamp):
    """Producer function to send QA history data to RabbitMQ queue"""
    try:
        message = {
            "doc_id": doc_id,
            "question": question,
            "answer": answer,
            "id": hisid,
            "timestamp": timestamp
        }
        
        message_json = json.dumps(message)
        
        success = rabbitmq_manager.publish_message("pdf_caht", message_json)
        
        if success:
            logger.info(f"QA history sent to queue for doc_id: {doc_id}")
        else:
            logger.error(f"Failed to send QA history for doc_id: {doc_id}")
            
    except Exception as e:
        logger.error(f"Error in produce_qa_history: {e}")
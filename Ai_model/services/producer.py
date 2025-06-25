import pika
import json
import logging
from datetime import datetime

def produce_qa_history(doc_id, question, answer, qa_id, timestamp):
    """Send QA history to RabbitMQ"""
    try:
        connection = pika.BlockingConnection(
            pika.URLParameters('amqp://guest:guest@localhost:5672/')
        )
        channel = connection.channel()
        
        channel.queue_declare(queue='pdf_chat', durable=True)
        
        message = {
            "doc_id": doc_id,
            "question": question,
            "answer": answer,
            "id": qa_id,
            "timestamp": timestamp
        }
        
        channel.basic_publish(
            exchange='',
            routing_key='pdf_chat',
            body=json.dumps(message),
            properties=pika.BasicProperties(
                delivery_mode=2,  
            )
        )
        
        connection.close()
        print(f"✅ Sent QA message to RabbitMQ for doc_id: {doc_id}")
        
    except Exception as e:
        print(f"❌ Error sending to RabbitMQ: {e}")
        logging.error(f"RabbitMQ producer error: {e}")
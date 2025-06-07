import pika
import os
import logging
from contextlib import contextmanager
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")

def get_connection_parameters():
    """Get RabbitMQ connection parameters from URL"""
    parsed_url = urlparse(RABBITMQ_URL)

    credentials = pika.PlainCredentials(parsed_url.username, parsed_url.password)
    return pika.ConnectionParameters(
        host=parsed_url.hostname,
        port=parsed_url.port or 5672,
        credentials=credentials,
        virtual_host=parsed_url.path[1:] if parsed_url.path else "/",
        heartbeat=600,
        blocked_connection_timeout=300,
    )

@contextmanager
def get_rabbitmq_channel():
    """Context manager for RabbitMQ channel with automatic cleanup"""
    connection = None
    channel = None
    try:
        connection = pika.BlockingConnection(get_connection_parameters())
        channel = connection.channel()

        # Declare queue
        channel.queue_declare(queue="pdf_caht", durable=True)

        yield channel

    except Exception as e:
        logger.error(f"RabbitMQ error: {e}")
        raise
    finally:
        if channel and not channel.is_closed:
            try:
                channel.close()
            except:
                pass
        if connection and not connection.is_closed:
            try:
                connection.close()
            except:
                pass

class RabbitMQManager:
    """RabbitMQ connection manager with retry logic"""

    def __init__(self, max_retries=3):
        self.max_retries = max_retries

    def publish_message(self, queue_name, message, retries=0):
        """Publish message with retry logic"""
        try:
            with get_rabbitmq_channel() as channel:
                channel.basic_publish(
                    exchange='',
                    routing_key=queue_name,
                    body=message,
                    properties=pika.BasicProperties(delivery_mode=2)
                )
                logger.info(f"Message published to {queue_name}")
                return True

        except Exception as e:
            logger.error(f"Failed to publish message (attempt {retries + 1}): {e}")

            if retries < self.max_retries:
                logger.info(f"Retrying... ({retries + 1}/{self.max_retries})")
                return self.publish_message(queue_name, message, retries + 1)
            else:
                logger.error(f"Max retries reached. Message not published.")
                return False

rabbitmq_manager = RabbitMQManager()

__all__ = ["rabbitmq_manager", "get_rabbitmq_channel"]

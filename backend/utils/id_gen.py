from datetime import datetime

def generate_doc_id(userid: str):
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    return f"{userid}-{timestamp}"

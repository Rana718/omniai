interface PreviousChat {
    doc_id: string;
    doc_text: string;
    created_at: string;
}

interface Message {
    id: string;
    type: "user" | "bot";
    content: string;
    timestamp: Date;
}

interface HistoryItem {
    question: string;
    answer: string;
    timestamp: string;
}

export type { PreviousChat, Message, HistoryItem };
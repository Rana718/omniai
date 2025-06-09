"use client";
import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2 } from "lucide-react";
import api from "@/lib/api";

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

function ChatPage() {
    const { id } = useParams();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const fetchChatHistory = async () => {
            if (!id) return;
            
            setIsLoading(true);
            try {
                const response = await api.get(`/api/pdfchat/${id}`);
                const history: HistoryItem[] = response.data;
                
                // Convert history to messages format
                const historyMessages: Message[] = [];
                history.forEach((item, index) => {
                    historyMessages.push({
                        id: `history-q-${index}`,
                        type: "user",
                        content: item.question,
                        timestamp: new Date(item.timestamp),
                    });
                    historyMessages.push({
                        id: `history-a-${index}`,
                        type: "bot",
                        content: item.answer,
                        timestamp: new Date(item.timestamp),
                    });
                });
                
                setMessages(historyMessages);
            } catch (error) {
                console.error("Error fetching chat history:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchChatHistory();
    }, [id]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isThinking) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            type: "user",
            content: inputMessage.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage("");
        setIsThinking(true);

        try {
            const formData = new FormData();
            formData.append("doc_id", id as string);
            formData.append("question", userMessage.content);

            const response = await api.post("/ai/pdfchat/ask", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            const botMessage: Message = {
                id: `bot-${Date.now()}`,
                type: "bot",
                content: response.data.answer,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                type: "bot",
                content: "Sorry, I encountered an error while processing your question. Please try again.",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const ThinkingAnimation = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center space-x-2 p-4 max-w-xs"
        >
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2 flex items-center space-x-1">
                <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    className="w-2 h-2 bg-gray-400 rounded-full"
                />
                <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 bg-gray-400 rounded-full"
                />
                <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    className="w-2 h-2 bg-gray-400 rounded-full"
                />
            </div>
        </motion.div>
    );

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex items-center space-x-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Loading chat history...</span>
                </div>
            </div>
        );
    }

    return (
        <div 
            className="min-h-screen transition-colors duration-300"
            style={{ background: "var(--background-gradient)" }}
        >
            <div className="max-w-4xl mx-auto flex flex-col h-screen">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                        PDF Chat - Document {id}
                    </h1>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <AnimatePresence>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div className={`flex items-start space-x-2 max-w-xs md:max-w-md lg:max-w-lg ${message.type === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>
                                    {/* Avatar */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        message.type === "user" 
                                            ? "bg-gradient-to-r from-indigo-500 to-purple-600" 
                                            : "bg-gradient-to-r from-blue-500 to-purple-600"
                                    }`}>
                                        {message.type === "user" ? (
                                            <User className="w-4 h-4 text-white" />
                                        ) : (
                                            <Bot className="w-4 h-4 text-white" />
                                        )}
                                    </div>

                                    {/* Message Bubble */}
                                    <div className={`rounded-2xl px-4 py-2 ${
                                        message.type === "user"
                                            ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                                            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                                    }`}>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                            {message.content}
                                        </p>
                                        <p className={`text-xs mt-1 ${
                                            message.type === "user" 
                                                ? "text-indigo-100" 
                                                : "text-gray-500 dark:text-gray-400"
                                        }`}>
                                            {message.timestamp.toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Thinking Animation */}
                    <AnimatePresence>
                        {isThinking && <ThinkingAnimation />}
                    </AnimatePresence>

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Section */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2">
                        <div className="flex-1 relative">
                            <textarea
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask a question about your PDF..."
                                disabled={isThinking}
                                className="w-full p-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
                                rows={1}
                                style={{ minHeight: "44px", maxHeight: "120px" }}
                            />
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSendMessage}
                            disabled={!inputMessage.trim() || isThinking}
                            className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isThinking ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </motion.button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChatPage;
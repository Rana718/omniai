"use client"
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, User, Bot, Send } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import ThinkingAnimation from '../ui/ThinkingAnimation'
import { Message } from '@/types'
import axiosInstance from '@/lib/api'

interface Chat_WindowProps {
    messages: Message[];
    isChatLoading: boolean;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    selectedChatId: string | null;
}

function Chat_window({
    messages,
    isChatLoading,
    setMessages,
    selectedChatId,
}: Chat_WindowProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isThinking, setIsThinking] = useState(false);
    const [inputMessage, setInputMessage] = useState("");

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isThinking || !selectedChatId) return;
        setIsThinking(true);
        scrollToBottom();
        const userMessage: Message = {
            id: `user-${Date.now()}`,
            type: "user",
            content: inputMessage.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage("");

        try {
            const formData = new FormData();
            formData.append("doc_id", selectedChatId);
            formData.append("question", userMessage.content);

            const response = await axiosInstance.post("/pdfchat/ask", formData, {
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
            setIsThinking(false);
            scrollToBottom();

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                type: "bot",
                content: "Sorry, I encountered an error while processing your question. Please try again.",
                timestamp: new Date(),
            };
            setIsThinking(false);
            scrollToBottom();
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background">
            {isChatLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center space-x-2">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <span className="text-foreground">Loading chat history...</span>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                        <AnimatePresence>
                            {messages.map((message) => (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div className={`flex items-start space-x-3 max-w-xs md:max-w-md lg:max-w-lg ${message.type === "user" ? "flex-row-reverse space-x-reverse" : "" }`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === "user"
                                            ? "bg-gradient-to-r from-indigo-500 to-purple-600"
                                            : "bg-gradient-to-r from-indigo-600 to-purple-600"
                                            }`}>
                                            {message.type === "user" ? (
                                                <User className="w-4 h-4 text-white" />
                                            ) : (
                                                <Bot className="w-4 h-4 text-white" />
                                            )}
                                        </div>

                                        <div className={`rounded-2xl px-4 py-2 min-w-0 ${message.type === "user"
                                            ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                                            : "bg-chat-bot text-chat-bot"
                                            }`}>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                                {message.content}
                                            </p>
                                            <p className={`text-xs mt-1 ${message.type === "user"
                                                ? "text-indigo-100"
                                                : "text-chat-timestamp"
                                                }`}>
                                                {message.timestamp.toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        <AnimatePresence>
                            {isThinking && <ThinkingAnimation />}
                        </AnimatePresence>

                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t border-custom flex-shrink-0">
                        <div className="flex items-center space-x-2">
                            <div className="flex-1 relative">
                                <textarea
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ask a question about your PDF..."
                                    disabled={isThinking}
                                    className="w-full p-3 pr-12 border border-custom rounded-xl resize-none focus:outline-none focus:ring-2 ring-custom transition-all bg-input text-foreground placeholder:text-input-placeholder"
                                    rows={1}
                                    onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                                    }}
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
                </>
            )}
        </div>
    )
}

export default Chat_window
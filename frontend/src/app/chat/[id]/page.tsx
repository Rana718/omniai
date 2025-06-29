"use client";
import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Loader2, ArrowLeft, Lock, Eye } from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Message {
    id: string;
    type: "user" | "bot";
    content: string;
    timestamp: Date;
    userName?: string;
}

interface HistoryItem {
    question: string;
    answer: string;
    timestamp: string;
}

function SharedChatPage() {
    const { id } = useParams();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [documentTitle, setDocumentTitle] = useState<string>("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // GSAP Animations
    useEffect(() => {
        // Animate header
        if (headerRef.current) {
            gsap.fromTo(headerRef.current, 
                { y: -50, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }
            );
        }

        // Animate messages container
        if (messagesRef.current) {
            gsap.fromTo(messagesRef.current,
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.3 }
            );
        }

        return () => {
            ScrollTrigger.getAll().forEach(trigger => trigger.kill());
        };
    }, []);

    useEffect(() => {
        const fetchChatHistory = async () => {
            if (!id) return;
            
            setIsLoading(true);
            setError(null);
            
            try {
                const response = await api.get(`/api/pdfchat/${id}`);
                const data = response.data;
                
                if (data.history && Array.isArray(data.history)) {
                    // Convert history to messages format
                    const historyMessages: Message[] = [];
                    data.history.forEach((item: HistoryItem, index: number) => {
                        historyMessages.push({
                            id: `history-q-${index}`,
                            type: "user",
                            content: item.question,
                            timestamp: new Date(item.timestamp),
                            userName: "Anonymous" // Default user name
                        });
                        historyMessages.push({
                            id: `history-a-${index}`,
                            type: "bot",
                            content: item.answer,
                            timestamp: new Date(item.timestamp),
                        });
                    });
                    
                    setMessages(historyMessages);
                    
                    // Set document title if available
                    if (data.doc_text) {
                        setDocumentTitle(data.doc_text);
                    }
                } else {
                    setError("No chat history found for this document.");
                }
            } catch (error: any) {
                console.error("Error fetching chat history:", error);
                if (error.response?.status === 404) {
                    setError("Chat not found. It may have been deleted or you don't have access to it.");
                } else if (error.response?.status === 403) {
                    setError("Access denied. You don't have permission to view this chat.");
                } else {
                    setError("Failed to load chat. Please try again later.");
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchChatHistory();
    }, [id]);

    const ThinkingAnimation = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2 p-4 max-w-xs"
        >
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <Bot className="w-5 h-5 text-white" />
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
            <div 
                className="min-h-screen flex items-center justify-center transition-colors duration-300"
                style={{ background: "var(--background-gradient)" }}
            >
                <motion.div 
                    className="flex flex-col items-center space-y-4"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="relative">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                        <div className="absolute inset-0 w-8 h-8 border-2 border-purple-200 rounded-full animate-pulse"></div>
                    </div>
                    <span className="text-lg font-medium bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Loading shared chat...
                    </span>
                </motion.div>
            </div>
        );
    }

    if (error) {
        return (
            <div 
                className="min-h-screen flex items-center justify-center transition-colors duration-300 p-4"
                style={{ background: "var(--background-gradient)" }}
            >
                <motion.div 
                    className="max-w-md text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <motion.div 
                        className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
                    >
                        <Lock className="w-8 h-8 text-white" />
                    </motion.div>
                    <h2 className="text-2xl font-bold mb-3 text-foreground">
                        Unable to Access Chat
                    </h2>
                    <p className="text-muted-foreground mb-6">
                        {error}
                    </p>
                    <Link href="/">
                        <motion.button
                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-shadow"
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Go to Home
                        </motion.button>
                    </Link>
                </motion.div>
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
                <motion.div 
                    ref={headerRef}
                    className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md"
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Link href="/">
                                <motion.button
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    title="Back to Home"
                                >
                                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                </motion.button>
                            </Link>
                            <div>
                                <h1 className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                    {documentTitle || `Shared Chat`}
                                </h1>
                                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                                    <Eye className="w-4 h-4" />
                                    <span>Read-only view</span>
                                </div>
                            </div>
                        </div>
                        
                        <motion.div 
                            className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full border border-indigo-200 dark:border-indigo-800"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: 0.4 }}
                        >
                            <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                                Shared Chat
                            </span>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Messages Container */}
                <motion.div 
                    ref={messagesRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                >
                    <AnimatePresence>
                        {messages.map((message, index) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div className={`flex items-start space-x-3 max-w-xs md:max-w-md lg:max-w-lg ${message.type === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>
                                    {/* Avatar */}
                                    <motion.div 
                                        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                                            message.type === "user" 
                                                ? "bg-gradient-to-r from-indigo-500 to-purple-600" 
                                                : "bg-gradient-to-r from-blue-500 to-purple-600"
                                        }`}
                                        whileHover={{ scale: 1.1 }}
                                        transition={{ type: "spring", stiffness: 300 }}
                                    >
                                        {message.type === "user" ? (
                                            <User className="w-5 h-5 text-white" />
                                        ) : (
                                            <Bot className="w-5 h-5 text-white" />
                                        )}
                                    </motion.div>

                                    <div className="flex flex-col space-y-1">
                                        {/* User Name / Bot Name */}
                                        <div className={`text-xs font-medium ${
                                            message.type === "user" 
                                                ? "text-indigo-600 dark:text-indigo-400 text-right" 
                                                : "text-blue-600 dark:text-blue-400"
                                        }`}>
                                            {message.type === "user" ? (message.userName || "Anonymous") : "Jack"}
                                        </div>

                                        {/* Message Bubble */}
                                        <motion.div 
                                            className={`rounded-2xl px-4 py-3 shadow-md ${
                                                message.type === "user"
                                                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                                                    : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                                            }`}
                                            whileHover={{ scale: 1.02 }}
                                            transition={{ type: "spring", stiffness: 300 }}
                                        >
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                {message.content}
                                            </p>
                                            <p className={`text-xs mt-2 ${
                                                message.type === "user" 
                                                    ? "text-indigo-100" 
                                                    : "text-gray-500 dark:text-gray-400"
                                            }`}>
                                                {message.timestamp.toLocaleTimeString([], { 
                                                    hour: '2-digit', 
                                                    minute: '2-digit' 
                                                })}
                                            </p>
                                        </motion.div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {messages.length === 0 && !isLoading && (
                        <motion.div 
                            className="flex-1 flex items-center justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="text-center text-gray-500 dark:text-gray-400">
                                <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No messages in this chat yet.</p>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </motion.div>

                {/* Footer Info */}
                <motion.div 
                    className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                >
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <Eye className="w-4 h-4" />
                        <span>You're viewing a shared chat in read-only mode.</span>
                        <Link href="/" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium">
                            Start your own chat
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export default SharedChatPage;

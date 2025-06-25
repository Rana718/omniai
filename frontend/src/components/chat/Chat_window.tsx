"use client"
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, User, Bot, Send, Plus, X, FileText, Upload, ArrowUp, Paperclip, MoreHorizontal } from 'lucide-react'
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isThinking, setIsThinking] = useState(false);
    const [inputMessage, setInputMessage] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [contextOnly, setContextOnly] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (selectedFiles.length > 0) {
                handleFileUpload();
            } else {
                handleSendMessage();
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            // Support multiple file types
            const supportedTypes = [
                'application/pdf',
                'text/plain',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'image/png',
                'image/jpeg',
                'image/jpg',
                'image/tiff',
                'image/bmp'
            ];
            
            const validFiles = files.filter(file => supportedTypes.includes(file.type));

            if (validFiles.length !== files.length) {
                alert("Some files were ignored. Supported formats: PDF, TXT, DOC, DOCX, PNG, JPG, JPEG, TIFF, BMP");
            }

            setSelectedFiles(prev => [...prev, ...validFiles]);
            setShowDropdown(false);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputMessage(e.target.value);
        adjustTextareaHeight();
    };

    const handleFileUpload = async () => {
        if (selectedFiles.length === 0) return;

        setIsUploading(true);

        // Create user message showing files being uploaded
        const fileNames = selectedFiles.map(f => f.name).join(', ');
        const userMessage: Message = {
            id: `user-${Date.now()}`,
            type: "user",
            content: `📎 Uploading: ${fileNames}`,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        const currentFiles = [...selectedFiles];
        setSelectedFiles([]);

        try {
            const formData = new FormData();
            
            // If no selectedChatId, this will create a new chat
            if (selectedChatId) {
                formData.append("doc_id", selectedChatId);
            }

            // Add files
            currentFiles.forEach((file) => {
                formData.append("files", file);
            });

            // Set doc_name from file names if no selectedChatId
            if (!selectedChatId) {
                const docName = currentFiles.length === 1 
                    ? currentFiles[0].name.replace(/\.[^/.]+$/, "")
                    : `${currentFiles.length} Documents`;
                formData.append("doc_name", docName);
            }

            const response = await axiosInstance.post("/ai/chat/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            const botMessage: Message = {
                id: `bot-${Date.now()}`,
                type: "bot",
                content: response.data.message || `✅ Successfully added ${currentFiles.length} file${currentFiles.length > 1 ? 's' : ''} to this chat. You can now ask questions about the content.`,
                timestamp: new Date(),
            };

            setIsUploading(false);
            scrollToBottom();
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error("Error uploading files:", error);
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                type: "bot",
                content: "Sorry, I encountered an error while uploading your files. Please try again.",
                timestamp: new Date(),
            };
            setIsUploading(false);
            scrollToBottom();
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isThinking) return;

        setIsThinking(true);
        scrollToBottom();

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            type: "user",
            content: inputMessage.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        const currentMessage = inputMessage.trim();
        setInputMessage("");
        
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        try {
            const formData = new FormData();
            
            if (selectedChatId) {
                formData.append("doc_id", selectedChatId);
            } else {
                const docName = currentMessage.length > 50 
                    ? currentMessage.substring(0, 50) + "..."
                    : currentMessage;
                formData.append("doc_name", docName);
            }
            
            formData.append("question", currentMessage);
            formData.append("context_only", contextOnly.toString());

            const response = await axiosInstance.post("/ai/chat/ask", formData, {
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
                content: "Sorry, I encountered an error while processing your request. Please try again.",
                timestamp: new Date(),
            };
            setIsThinking(false);
            scrollToBottom();
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    const canSend = inputMessage.trim() || selectedFiles.length > 0;

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
                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="w-full max-w-3xl mx-auto px-4 py-6 space-y-6">
                            {/* Welcome message for new chats */}
                            {messages.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center py-8"
                                >
                                    <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Bot className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2 text-foreground">
                                        How can I help you today?
                                    </h2>
                                    <p className="text-muted-foreground">
                                        Ask me anything or upload documents to chat about their content
                                    </p>
                                </motion.div>
                            )}

                            <AnimatePresence>
                                {messages.map((message) => (
                                    <motion.div
                                        key={message.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className={`flex w-full ${message.type === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div className={`flex items-start space-x-3 max-w-[85%] ${message.type === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === "user"
                                                ? "bg-gradient-to-r from-blue-500 to-blue-600"
                                                : "bg-gradient-to-r from-gray-600 to-gray-700"
                                                }`}>
                                                {message.type === "user" ? (
                                                    <User className="w-4 h-4 text-white" />
                                                ) : (
                                                    <Bot className="w-4 h-4 text-white" />
                                                )}
                                            </div>

                                            <div className={`rounded-lg px-4 py-3 min-w-0 ${message.type === "user"
                                                ? "bg-blue-500 text-white"
                                                : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                                }`}>
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                                    {message.content}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            <AnimatePresence>
                                {(isThinking || isUploading) && <ThinkingAnimation />}
                            </AnimatePresence>

                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Bottom Input Section */}
                    <div className="">
                        {/* File Upload Preview */}
                        {selectedFiles.length > 0 && (
                            <div className="w-full max-w-3xl mx-auto px-4 pt-4">
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 mb-3"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                                        </span>
                                        <button
                                            onClick={() => setSelectedFiles([])}
                                            className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="space-y-1 max-h-20 overflow-y-auto scrollbar-hide">
                                        {selectedFiles.map((file, index) => (
                                            <div key={index} className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-300">
                                                <FileText className="w-3 h-3 text-red-500" />
                                                <span className="truncate">{file.name}</span>
                                                <span className="text-gray-400 dark:text-gray-500">({formatFileSize(file.size)})</span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="w-full max-w-3xl mx-auto px-4 pb-6">
                            <div className="relative bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-2xl shadow-sm">
                                <div className="flex items-end p-3">
                                    {/* Dropdown Menu Button */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowDropdown(!showDropdown)}
                                            disabled={isThinking || isUploading}
                                            className="flex-shrink-0 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                            title="More options"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {showDropdown && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-50"
                                            >
                                                {/* File Upload Option */}
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                                                >
                                                    <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            Attach files
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            PDF, TXT, DOC, Images
                                                        </div>
                                                    </div>
                                                </button>

                                                {/* Context Only Toggle */}
                                                <div className="mt-2 p-2 border-t border-gray-200 dark:border-gray-700">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                Context Only
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                Only search in uploaded documents
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => setContextOnly(!contextOnly)}
                                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                                contextOnly ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                                                    contextOnly ? 'translate-x-5' : 'translate-x-1'
                                                                }`}
                                                            />
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Text Input */}
                                    <div className="flex-1 min-w-0 mx-2">
                                        <textarea
                                            ref={textareaRef}
                                            value={inputMessage}
                                            onChange={handleInputChange}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Message PDF Chatter..."
                                            disabled={isThinking || isUploading}
                                            className="w-full resize-none border-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-0 scrollbar-hide py-2 px-0 text-base leading-6"
                                            rows={1}
                                            style={{
                                                scrollbarWidth: 'none',
                                                msOverflowStyle: 'none',
                                                maxHeight: '120px'
                                            }}
                                        />
                                    </div>

                                    {/* Send Button */}
                                    <motion.button
                                        whileHover={canSend && !isThinking && !isUploading ? { scale: 1.05 } : {}}
                                        whileTap={canSend && !isThinking && !isUploading ? { scale: 0.95 } : {}}
                                        onClick={selectedFiles.length > 0 ? handleFileUpload : handleSendMessage}
                                        disabled={!canSend || isThinking || isUploading}
                                        className={`flex-shrink-0 p-2 rounded-full transition-all duration-200 ${
                                            canSend && !isThinking && !isUploading
                                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                        }`}
                                        title={selectedFiles.length > 0 ? "Upload files" : "Send message"}
                                    >
                                        {isThinking || isUploading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : selectedFiles.length > 0 ? (
                                            <Upload className="w-5 h-5" />
                                        ) : (
                                            <ArrowUp className="w-5 h-5" />
                                        )}
                                    </motion.button>
                                </div>
                            </div>

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.tiff,.bmp"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {/* Context only indicator */}
                            {contextOnly && (
                                <div className="mt-2 text-xs text-blue-500 dark:text-blue-400 text-center">
                                    Context Only mode: Searching only in uploaded documents
                                </div>
                            )}
                        </div>

                        {/* Click outside to close dropdown */}
                        {showDropdown && (
                            <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setShowDropdown(false)}
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

export default Chat_window
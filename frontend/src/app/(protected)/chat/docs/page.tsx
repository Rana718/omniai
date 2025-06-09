"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Home, Menu, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import axiosInstance from "@/lib/api";
import Sidebar from "@/components/chat/Sidebar";
import UploadFile from "@/components/chat/Upload";
import Chat_window from "@/components/chat/Chat_window";
import { HistoryItem, Message, PreviousChat } from "@/types";
import Link from "next/link";

export default function DocsPage() {
    const { data: session, status } = useSession();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const docId = searchParams.get("id");

    const [file, setFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previousChats, setPreviousChats] = useState<PreviousChat[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [documentNotFound, setDocumentNotFound] = useState(false);
    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fetchingRef = useRef(false);
    const initializedRef = useRef(false);

    // Handle page visibility changes
    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsVisible(!document.hidden);
        };

        const handleFocus = () => {
            setIsVisible(true);
        };

        const handleBlur = () => {
            setIsVisible(false);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    // Prevent multiple fetches
    const fetchPreviousChats = useCallback(async () => {
        if (fetchingRef.current || status !== "authenticated" || !session?.user?.accessToken) {
            return;
        }

        fetchingRef.current = true;
        setIsLoadingChats(true);
        
        try {
            const response = await axiosInstance.get("/api/pdfchat");
            const chats: PreviousChat[] = response.data;

            const sortedChats = chats.sort((a, b) => {
                const timestampA = new Date(a.created_at).getTime();
                const timestampB = new Date(b.created_at).getTime();
                return timestampB - timestampA;
            });

            setPreviousChats(sortedChats);
            setIsInitialLoadComplete(true);
            initializedRef.current = true;
        } catch (error) {
            console.error("Error fetching previous chats:", error);
            setIsInitialLoadComplete(true);
            initializedRef.current = true;
        } finally {
            setIsLoadingChats(false);
            fetchingRef.current = false;
        }
    }, [session?.user?.accessToken, status]);

    // Initial load effect
    useEffect(() => {
        if (status === "loading") return; // Wait for session to load
        if (initializedRef.current) return; // Prevent multiple initializations
        
        fetchPreviousChats();
    }, [fetchPreviousChats, status]);

    // Helper function to update URL without page reload
    const updateURL = useCallback((docId: string | null) => {
        const url = docId ? `${pathname}?id=${docId}` : pathname;
        router.replace(url, { scroll: false });
    }, [pathname, router]);

    // Handle docId changes
    useEffect(() => {
        if (!isInitialLoadComplete || status !== "authenticated") return;

        if (!docId) {
            setSelectedChatId(null);
            setDocumentNotFound(false);
            setMessages([]);
            return;
        }

        const foundChat = previousChats.find(chat => chat.doc_id === docId);
        
        if (foundChat) {
            setSelectedChatId(docId);
            fetchChatHistory(docId);
            setDocumentNotFound(false);
        } else {
            setDocumentNotFound(true);
            setSelectedChatId(null);
            setMessages([]);
        }
    }, [docId, previousChats, isInitialLoadComplete, status]);

    const handleChatClick = useCallback((chatId: string) => {
        setSelectedChatId(chatId);
        setDocumentNotFound(false);
        updateURL(chatId);
        fetchChatHistory(chatId);
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
    }, [updateURL]);

    const fetchChatHistory = useCallback(async (chatId: string) => {
        setIsChatLoading(true);
        try {
            const response = await axiosInstance.get(`/api/pdfchat/${chatId}`);
            const history: HistoryItem[] = response.data.history;

            const historyMessages: Message[] = [];
            if (Array.isArray(history)) {
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
            }

            setMessages(historyMessages);
        } catch (error) {
            console.error("Error fetching chat history:", error);
            // If chat history fails, it might be deleted
            if (docId) {
                setDocumentNotFound(true);
                setSelectedChatId(null);
            }
        } finally {
            setIsChatLoading(false);
        }
    }, [docId]);

    const handleNewChat = useCallback(() => {
        setSelectedChatId(null);
        setMessages([]);
        setFile(null);
        setUploadProgress(0);
        setDocumentNotFound(false);
        
        // Update URL to clear document ID
        updateURL(null);
    }, [updateURL]);

    const handleUploadSuccess = useCallback((newDocId: string) => {
        setSelectedChatId(newDocId);
        setDocumentNotFound(false);
        
        // Update URL with new document ID
        updateURL(newDocId);
        
        // Refresh chat list
        const fetchUpdatedChats = async () => {
            try {
                const response = await axiosInstance.get("/api/pdfchat");
                const chats: PreviousChat[] = response.data;
                const sortedChats = chats.sort((a, b) => {
                    const timestampA = new Date(a.created_at).getTime();
                    const timestampB = new Date(b.created_at).getTime();
                    return timestampB - timestampA;
                });
                setPreviousChats(sortedChats);
            } catch (error) {
                console.error("Error refreshing chats:", error);
            }
        };
        
        fetchUpdatedChats();
    }, [updateURL]);

    // Don't render anything while session is loading
    if (status === "loading") {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Document not found component
    const DocumentNotFoundComponent = () => (
        <div className="flex-1 flex items-center justify-center p-6 bg-background">
            <div className="max-w-md text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-3 text-foreground">
                    Document Not Found
                </h2>
                <p className="text-muted-foreground mb-6">
                    The document you're looking for might have been deleted or you don't have access to it.
                </p>
                <div className="space-y-3">
                    <button
                        onClick={handleNewChat}
                        className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-shadow"
                    >
                        Start New Chat
                    </button>
                    <Link
                        href="/"
                        className="block w-full px-6 py-3 border border-custom rounded-lg font-medium hover:bg-muted transition-colors text-center text-foreground"
                    >
                        Go to Home
                    </Link>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-screen flex overflow-hidden transition-colors duration-300 bg-background">
            <Sidebar
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                handleNewChat={handleNewChat}
                handleChatClick={handleChatClick}
                selectedChatId={selectedChatId}
                chats={previousChats}
                isLoadingChats={isLoadingChats}
            />

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 lg:hidden transition-opacity duration-200 bg-black/50"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <div className="flex-1 flex flex-col lg:ml-0 overflow-hidden bg-background">
                <header className="border-b border-custom px-4 py-3 flex-shrink-0 z-10 transition-colors duration-200 bg-background">
                    <div className="flex items-center justify-between gap-2">
                        {/* Left side - Menu button */}
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 transition-colors hover:opacity-80 text-muted-foreground hover:text-foreground flex-shrink-0"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        {/* Center - Title with enhanced truncation */}
                        <div className="flex-1 flex items-center justify-center lg:justify-start min-w-0">
                            <h2
                                className="text-lg font-semibold text-foreground truncate mobile-header-title text-center lg:text-left"
                                title={
                                    documentNotFound 
                                        ? 'Document Not Found'
                                        : selectedChatId
                                            ? previousChats.find(chat => chat.doc_id === selectedChatId)?.doc_text || 'Chat'
                                            : 'New Chat'
                                }
                            >
                                {documentNotFound 
                                    ? 'Document Not Found'
                                    : selectedChatId
                                        ? previousChats.find(chat => chat.doc_id === selectedChatId)?.doc_text || 'Chat'
                                        : 'New Chat'
                                }
                            </h2>
                        </div>
                        
                        <Link
                            href="/"
                            className="lg:hidden p-2 transition-colors hover:opacity-80 text-muted-foreground hover:text-foreground flex-shrink-0"
                            title="Go to Home"
                        >
                            <Home className="w-5 h-5" />
                        </Link>
                        
                        <div className="hidden lg:block w-12"></div>
                    </div>
                </header>

                {/* Main Content */}
                {documentNotFound ? (
                    <DocumentNotFoundComponent />
                ) : !selectedChatId ? (
                    <UploadFile
                        file={file}
                        uploadProgress={uploadProgress}
                        setFile={setFile}
                        setUploadProgress={setUploadProgress}
                        setSelectedChatId={setSelectedChatId}
                        setMessages={setMessages}
                        setPreviousChats={setPreviousChats}
                        onUploadSuccess={handleUploadSuccess}
                    />
                ) : (
                    <Chat_window
                        messages={messages}
                        isChatLoading={isChatLoading}
                        setMessages={setMessages}
                        selectedChatId={selectedChatId}
                    />
                )}
            </div>
        </div>
    );
}
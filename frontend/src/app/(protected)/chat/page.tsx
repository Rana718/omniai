"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Home, Menu, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import axiosInstance from "@/lib/api";
import Sidebar from "@/components/chat/Sidebar";
import Chat_window from "@/components/chat/Chat_window";
import { HistoryItem, Message, PreviousChat } from "@/types";
import Link from "next/link";

export default function DocsPage() {
    const { data: session, status } = useSession();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const docId = searchParams.get("id");
    const [previousChats, setPreviousChats] = useState<PreviousChat[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [documentNotFound, setDocumentNotFound] = useState(false);
    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
    const fetchingRef = useRef(false);
    const initializedRef = useRef(false);

    const updateURL = useCallback((docId: string | null, replace: boolean = true) => {
        const url = docId ? `${pathname}?id=${docId}` : pathname;
        if (replace) {
            router.replace(url, { scroll: false });
        } else {
            router.push(url, { scroll: false });
        }
    }, [pathname, router]);

    const fetchPreviousChats = useCallback(async (silent: boolean = false) => {
        if (fetchingRef.current || status !== "authenticated" || !session?.user?.accessToken) {
            return [];
        }

        fetchingRef.current = true;
        if (!silent) {
            setIsLoadingChats(true);
        }

        try {
            const response = await axiosInstance.get("/api/pdfchat");
            
            let chats: PreviousChat[] = [];
            
            if (response.data && Array.isArray(response.data)) {
                chats = response.data;
            } else if (response.data === null || response.data === undefined) {
                chats = [];
            } else {
                console.warn("Unexpected API response format:", response.data);
                chats = [];
            }

            const sortedChats = chats.length > 0 ? chats.sort((a, b) => {
                try {
                    const timestampA = new Date(a.created_at).getTime();
                    const timestampB = new Date(b.created_at).getTime();
                    
                    if (isNaN(timestampA) && isNaN(timestampB)) return 0;
                    if (isNaN(timestampA)) return 1;
                    if (isNaN(timestampB)) return -1;
                    
                    return timestampB - timestampA;
                } catch (error) {
                    console.warn("Error sorting chat timestamps:", error);
                    return 0;
                }
            }) : [];

            setPreviousChats(sortedChats);
            setIsInitialLoadComplete(true);
            initializedRef.current = true;
            
            return sortedChats;
        } catch (error) {
            console.error("Error fetching previous chats:", error);
            setPreviousChats([]);
            setIsInitialLoadComplete(true);
            initializedRef.current = true;
            return [];
        } finally {
            setIsLoadingChats(false);
            fetchingRef.current = false;
        }
    }, [session?.user?.accessToken, status]);

    // Initial load
    useEffect(() => {
        if (status === "loading") return;
        if (initializedRef.current) return; 

        fetchPreviousChats();
    }, [fetchPreviousChats, status]);

    const handleNewChatCreated = useCallback(async (newChatId: string) => {
        console.log("New chat created with ID:", newChatId);
        
        updateURL(newChatId, true);
        setSelectedChatId(newChatId);
        setDocumentNotFound(false);
        
        const updatedChats = await fetchPreviousChats(true);
        
        const newChat = updatedChats.find(chat => chat.doc_id === newChatId);
        if (!newChat) {
            setTimeout(async () => {
                await fetchPreviousChats(true);
            }, 1000);
        }
        
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
    }, [fetchPreviousChats, updateURL]);

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
        updateURL(chatId, true);
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
        setDocumentNotFound(false);
        updateURL(null, true);
    }, [updateURL]);

    const handleMessageSuccess = useCallback(async (response: any) => {
        if (response.doc_id && response.doc_id !== selectedChatId) {
            await handleNewChatCreated(response.doc_id);
        }
    }, [selectedChatId, handleNewChatCreated]);

    if (status === "loading") {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

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
                        
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 transition-colors hover:opacity-80 text-muted-foreground hover:text-foreground flex-shrink-0"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

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

                {documentNotFound ? (
                    <DocumentNotFoundComponent />
                ) : (
                    <Chat_window
                        messages={messages}
                        isChatLoading={isChatLoading}
                        setMessages={setMessages}
                        selectedChatId={selectedChatId}
                        onNewChatCreated={handleNewChatCreated}
                        onMessageSuccess={handleMessageSuccess}
                    />
                )}
            </div>
        </div>
    );
}

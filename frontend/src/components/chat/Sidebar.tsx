import { motion } from 'framer-motion';
import { FileText, X, Plus, Search, MessageSquare, Edit3, Trash2, User, LogOut, Home } from 'lucide-react';
import { useSession } from 'next-auth/react';
import React, { useState, useMemo } from 'react'
import ThemeToggle from '../ThemeToggle';
import Link from 'next/link';
import { PreviousChat } from '@/types';

interface SidebarProps {
    isSidebarOpen: boolean;
    setIsSidebarOpen: (open: boolean) => void;
    handleNewChat: () => void;
    handleChatClick: (docId: string) => void;
    selectedChatId: string | null;
    chats: PreviousChat[];
    isLoadingChats: boolean;
}

function Sidebar({
    isSidebarOpen,
    setIsSidebarOpen,
    handleNewChat,
    handleChatClick,
    selectedChatId,
    chats,
    isLoadingChats,
}: SidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // Memoized filtered and sorted chats with proper error handling
    const filteredChats = useMemo(() => {
        // Handle empty or invalid chats array
        if (!Array.isArray(chats) || chats.length === 0) {
            return [];
        }

        try {
            // Filter chats based on search query
            let filtered = chats.filter(chat => {
                // Handle cases where chat or doc_text might be null/undefined
                if (!chat || typeof chat.doc_text !== 'string') {
                    return false;
                }
                
                if (!searchQuery.trim()) {
                    return true;
                }
                
                return chat.doc_text.toLowerCase().includes(searchQuery.toLowerCase().trim());
            });

            // Sort chats by created_at in descending order (newest first)
            filtered.sort((a, b) => {
                try {
                    // Handle invalid or missing dates
                    const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
                    const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
                    
                    // Check if dates are valid
                    if (isNaN(dateA.getTime())) return 1;
                    if (isNaN(dateB.getTime())) return -1;
                    
                    return dateB.getTime() - dateA.getTime();
                } catch (error) {
                    console.warn('Error sorting chats by date:', error);
                    return 0;
                }
            });

            return filtered;
        } catch (error) {
            console.error('Error filtering/sorting chats:', error);
            return [];
        }
    }, [chats, searchQuery]);

    const formatDateOnly = (dateString: string) => {
        try {
            if (!dateString) {
                return 'No date';
            }
            
            const date = new Date(dateString);
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return 'Invalid date';
            }
            
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.warn('Error formatting date:', error);
            return 'Invalid date';
        }
    };

    const { data: session } = useSession();

    // Helper function to truncate text safely
    const truncateText = (text: string, maxLength: number = 50) => {
        if (!text || typeof text !== 'string') {
            return 'Untitled Chat';
        }
        
        if (text.length <= maxLength) {
            return text;
        }
        
        return text.substring(0, maxLength).trim() + '...';
    };

    return (
        <div className={`
            fixed inset-y-0 left-0 z-50 w-80 transition-transform duration-200 ease-in-out border-r border-custom bg-card
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:relative lg:translate-x-0
        `}>
            <div className="flex flex-col h-full">
                {/* Sidebar Header */}
                <div className="flex items-center justify-between p-4 flex-shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-semibold text-card-foreground">
                            PDF Chat
                        </h1>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="lg:hidden p-1 transition-colors hover:opacity-80 text-muted-foreground"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* New Chat Button */}
                <div className="px-4 pb-4 flex-shrink-0">
                    <button
                        onClick={handleNewChat}
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg border border-custom transition-all hover:opacity-90 bg-secondary text-secondary-foreground"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Chat</span>
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 pb-4 flex-shrink-0">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-custom rounded-lg focus:outline-none focus:ring-2 ring-custom transition-all bg-background text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                </div>

                {/* Chats List - Only this section scrolls */}
                <div className="flex-1 min-h-0">
                    <div className="h-full overflow-y-auto px-4">
                        <div className="space-y-2 pb-4">
                            {isLoadingChats ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                </div>
                            ) : !Array.isArray(chats) ? (
                                <div className="text-center py-8">
                                    <div className="text-destructive mb-2">
                                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Error loading chats</p>
                                    </div>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="text-xs text-muted-foreground hover:text-foreground underline"
                                    >
                                        Try refreshing the page
                                    </button>
                                </div>
                            ) : filteredChats.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    {searchQuery ? (
                                        <div>
                                            <p className="text-sm mb-1">No chats found</p>
                                            <p className="text-xs">Try a different search term</p>
                                        </div>
                                    ) : chats.length === 0 ? (
                                        <div>
                                            <p className="text-sm mb-1">No chats yet</p>
                                            <p className="text-xs">Start a new conversation</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm mb-1">No matches found</p>
                                            <p className="text-xs">Try clearing the search</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                filteredChats.map((chat, index) => {
                                    // Additional safety check for individual chat items
                                    if (!chat || !chat.doc_id) {
                                        console.warn(`Invalid chat at index ${index}:`, chat);
                                        return null;
                                    }

                                    return (
                                        <motion.div
                                            key={chat.doc_id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileHover={{ scale: 1.02 }}
                                            onClick={() => handleChatClick(chat.doc_id)}
                                            className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border hover:bg-muted ${selectedChatId === chat.doc_id
                                                ? 'border-custom bg-secondary'
                                                : 'border-transparent bg-transparent'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <MessageSquare className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm truncate text-card-foreground" title={chat.doc_text || 'Untitled Chat'}>
                                                        {truncateText(chat.doc_text)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDateOnly(chat.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                            {/* Action buttons - uncomment if needed
                                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    className="p-1 transition-colors hover:opacity-80 text-muted-foreground"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Handle edit
                                                    }}
                                                >
                                                    <Edit3 className="w-3 h-3" />
                                                </button>
                                                <button 
                                                    className="p-1 transition-colors hover:opacity-80 text-destructive"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Handle delete
                                                    }}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div> */}
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* User Profile Section */}
                <div className="border-t border-custom p-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate text-card-foreground" title={session?.user?.name || session?.user?.email || 'User'}>
                                    {session?.user?.name || session?.user?.email || 'User'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                            <ThemeToggle />
                            <Link
                                href="/Home"
                                className="p-2 transition-colors hover:opacity-80 text-muted-foreground hover:text-foreground"
                                title="Go to Home"
                            >
                                <Home className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Sidebar
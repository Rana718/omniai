"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Settings, LogOut, Brain, Sparkles, Clock, ArrowRight, Menu, X, User, ChevronDown } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { chatOptions } from "@/const";
import ThemeToggle from "@/components/ThemeToggle";

interface ChatOption {
    id: string;
    title: string;
    description: string;
    icon: any;
    color: string;
    bgColor: string;
    comingSoon?: boolean;
    route?: string;
}

export default function HomePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const handleChatOptionClick = (option: ChatOption) => {
        if (option.comingSoon) {
            return;
        }
        if (option.route) {
            setIsLoading(true);
            router.push(option.route);
        }
    };

    const handleSignOut = async () => {
        await signOut({ callbackUrl: "/" });
    };

    const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User';

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-gradient transition-colors duration-300">
            {/* Header */}
            <header className="bg-header backdrop-blur-glass sticky top-0 z-50 transition-colors duration-300 border-b border-custom">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <motion.div 
                            className="flex items-center space-x-3"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="w-8 h-8 bg-hero-gradient rounded-lg flex items-center justify-center shadow-lg">
                                <Brain className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gradient-hero">
                                PDF Chatter
                            </span>
                        </motion.div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-4">
                            <ThemeToggle />
                            
                            {/* User Menu */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="flex items-center space-x-3 p-2 rounded-xl hover:bg-muted transition-colors group"
                                >
                                    <div className="w-8 h-8 bg-hero-gradient rounded-full flex items-center justify-center shadow-md">
                                        <User className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-sm font-medium text-foreground">
                                            {userName}
                                        </span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${
                                        isUserMenuOpen ? 'rotate-180' : ''
                                    }`} />
                                </button>

                                {/* User Dropdown Menu */}
                                <AnimatePresence>
                                    {isUserMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute right-0 mt-2 w-64 bg-card border border-custom rounded-xl shadow-custom overflow-hidden"
                                            onMouseLeave={() => setIsUserMenuOpen(false)}
                                        >
                                            {/* User Info */}
                                            <div className="p-4 bg-muted/50">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-12 h-12 bg-hero-gradient rounded-full flex items-center justify-center shadow-md">
                                                        <User className="w-6 h-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-card-foreground">
                                                            {userName}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {session?.user?.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Menu Items */}
                                            <div className="p-2">
                                                <button 
                                                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                                                    onClick={() => {
                                                        setIsUserMenuOpen(false);
                                                        // Handle settings
                                                    }}
                                                >
                                                    <Settings className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm text-card-foreground">Settings</span>
                                                </button>
                                                
                                                <button 
                                                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-destructive/10 transition-colors text-left"
                                                    onClick={() => {
                                                        setIsUserMenuOpen(false);
                                                        handleSignOut();
                                                    }}
                                                >
                                                    <LogOut className="w-4 h-4 text-red-500" />
                                                    <span className="text-sm text-red-500">Sign Out</span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 rounded-xl hover:bg-muted transition-colors"
                        >
                            {isMobileMenuOpen ? (
                                <X className="w-5 h-5 text-foreground" />
                            ) : (
                                <Menu className="w-5 h-5 text-foreground" />
                            )}
                        </button>
                    </div>

                    {/* Mobile Menu */}
                    <AnimatePresence>
                        {isMobileMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="md:hidden py-4 border-t border-custom"
                            >
                                <div className="flex flex-col space-y-4">
                                    {/* User Info */}
                                    <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-xl">
                                        <div className="w-10 h-10 bg-hero-gradient rounded-full flex items-center justify-center shadow-md">
                                            <User className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">
                                                {userName}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {session?.user?.email}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Mobile Menu Items */}
                                    <div className="flex flex-col space-y-2">
                                        <div className="flex items-center justify-between px-3">
                                            <span className="text-sm text-muted-foreground">Theme</span>
                                            <ThemeToggle />
                                        </div>
                                        
                                        <button className="flex items-center space-x-3 p-3 rounded-xl hover:bg-muted transition-colors text-left">
                                            <Settings className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm text-foreground">Settings</span>
                                        </button>
                                        
                                        <button
                                            onClick={handleSignOut}
                                            className="flex items-center space-x-3 p-3 rounded-xl hover:bg-destructive/10 transition-colors text-left"
                                        >
                                            <LogOut className="w-4 h-4 text-destructive" />
                                            <span className="text-sm text-destructive">Sign Out</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <motion.h1
                        className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        Welcome to Your{" "}
                        <span className="text-gradient-hero">
                            AI Workspace
                        </span>
                    </motion.h1>
                    <motion.p
                        className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        Choose your preferred way to interact with AI. Upload
                        documents, ask questions, or start a conversation on any
                        topic.
                    </motion.p>
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="mb-16"
                >
                    <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {chatOptions.map((option, index) => (
                            <motion.div
                                key={option.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.6,
                                    delay: 0.1 + index * 0.1,
                                }}
                                whileHover={{ y: -8, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`relative group cursor-pointer rounded-2xl p-6 bg-card border border-custom shadow-custom hover:shadow-lg transition-all duration-300 ${
                                    option.comingSoon ? "opacity-75" : ""
                                }`}
                                onClick={() => handleChatOptionClick(option)}
                            >
                                {option.comingSoon && (
                                    <div className="absolute top-4 right-4">
                                        <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-full font-medium">
                                            Coming Soon
                                        </span>
                                    </div>
                                )}

                                <div
                                    className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-gradient-to-r ${option.color} group-hover:scale-110 transition-transform shadow-lg`}
                                >
                                    <option.icon className="w-7 h-7 text-white" />
                                </div>

                                <h3 className="text-lg font-semibold text-card-foreground mb-3">
                                    {option.title}
                                </h3>

                                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                                    {option.description}
                                </p>

                                {!option.comingSoon && (
                                    <div className="flex items-center text-primary group-hover:text-primary/80 transition-colors">
                                        <span className="text-sm font-medium">
                                            Get Started
                                        </span>
                                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Features Overview */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="bg-hero-gradient rounded-3xl p-8 md:p-12 text-white shadow-custom"
                >
                    <div className="text-center mb-12">
                        <motion.h2
                            className="text-3xl md:text-4xl font-bold mb-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.6 }}
                        >
                            Powered by Advanced AI
                        </motion.h2>
                        <motion.p
                            className="text-white/90 max-w-2xl mx-auto text-lg"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.8 }}
                        >
                            Experience the next generation of document
                            interaction with our intelligent AI assistant
                        </motion.p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Zap,
                                title: "Lightning Fast",
                                description: "Get instant responses to your questions"
                            },
                            {
                                icon: Sparkles,
                                title: "Smart Understanding",
                                description: "Advanced comprehension of your documents"
                            },
                            {
                                icon: Clock,
                                title: "Always Available",
                                description: "24/7 access to your AI assistant"
                            }
                        ].map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                className="text-center"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 1 + index * 0.1 }}
                            >
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                    <feature.icon className="w-8 h-8" />
                                </div>
                                <h3 className="font-semibold mb-3 text-lg">
                                    {feature.title}
                                </h3>
                                <p className="text-white/80 text-sm leading-relaxed">
                                    {feature.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Loading State */}
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                    >
                        <div className="bg-card rounded-2xl p-6 flex items-center space-x-4 shadow-custom">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            <span className="text-foreground font-medium">Loading...</span>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
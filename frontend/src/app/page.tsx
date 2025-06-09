"use client";
import React from "react";
import { motion } from "framer-motion";
import { FileText, ArrowRight, Sparkles, Image, Globe, FileImage, FileCode, Files, Brain } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { Feature } from "@/const";

function LandingPage() {
    const fadeInUp = {
        initial: { opacity: 0, y: 60 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6 },
    };

    const staggerContainer = {
        initial: {},
        animate: {
            transition: {
                staggerChildren: 0.2,
            },
        },
    };

    const scaleOnHover = {
        whileHover: { scale: 1.05 },
        whileTap: { scale: 0.95 },
    };

    const floatingIcons = [
        { icon: FileText, x: "10%", y: "20%", delay: 0, color: "from-red-500 to-red-600" },
        { icon: Image, x: "85%", y: "15%", delay: 0.5, color: "from-blue-500 to-blue-600" },
        { icon: Globe, x: "15%", y: "70%", delay: 1, color: "from-green-500 to-green-600" },
        { icon: FileImage, x: "80%", y: "65%", delay: 1.5, color: "from-purple-500 to-purple-600" },
        { icon: FileCode, x: "5%", y: "45%", delay: 2, color: "from-orange-500 to-orange-600" },
        { icon: Files, x: "90%", y: "40%", delay: 2.5, color: "from-pink-500 to-pink-600" },
    ];

    return (
        <div
            className="min-h-screen transition-colors duration-300"
            style={{ background: "var(--background-gradient)" }}
        >
            {/* Navigation */}
            <motion.nav
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 md:px-8 lg:px-12 xl:px-20 backdrop-blur-md bg-white/10 dark:bg-black/10 border-b border-white/20 dark:border-white/10"
            >
                <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <Brain className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        OmniAI
                    </span>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4">
                    <ThemeToggle />
                    <Link href="/sign-in">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="hidden sm:block px-3 py-2 sm:px-4 transition-colors hover:opacity-80 text-sm sm:text-base"
                            style={{ color: "var(--muted-foreground)" }}
                        >
                            Sign In
                        </motion.button>
                    </Link>
                    <Link href="/home">
                        <motion.button
                            {...scaleOnHover}
                            className="px-3 py-2 sm:px-6 text-xs sm:text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow"
                        >
                            <span className="hidden sm:inline">
                                Get Started
                            </span>
                            <span className="sm:hidden">Start</span>
                        </motion.button>
                    </Link>
                </div>
            </motion.nav>

            {/* Hero Section */}
            <section className="relative px-4 py-12 sm:px-6 sm:py-16 md:px-8 md:py-20 lg:px-12 xl:px-20 pt-24 sm:pt-28 md:pt-32">
                
                <div className="hidden lg:block absolute inset-0 pointer-events-none">
                    {floatingIcons.map((item, index) => (
                        <motion.div
                            key={index}
                            className="absolute"
                            style={{ left: item.x, top: item.y }}
                            initial={{ opacity: 0, scale: 0, rotate: 0 }}
                            animate={{
                                opacity: [0.4, 0.7, 0.4],
                                scale: [0.8, 1.2, 0.8],
                                rotate: [0, 180, 360],
                                y: [0, -30, 0],
                            }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                repeatType: "loop",
                                ease: "easeInOut",
                                delay: item.delay,
                            }}
                        >
                            <div className={`w-16 h-16 xl:w-20 xl:h-20 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-sm`}>
                                <item.icon className="w-8 h-8 xl:w-10 xl:h-10 text-white" />
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="text-center"
                    >
                        <motion.div
                            variants={fadeInUp}
                            className="mb-8"
                        >
                            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-800 backdrop-blur-sm"
                                style={{ color: "var(--foreground)" }}>
                                <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                                Powered by Advanced AI
                            </span>
                        </motion.div>

                        <motion.h1
                            variants={fadeInUp}
                            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold mb-4 sm:mb-6 leading-tight px-2"
                            style={{ color: "var(--foreground)" }}
                        >
                            Chat with Your
                            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                {" "}
                                PDFs
                            </span>
                            <br />
                            Like Never Before
                        </motion.h1>

                        <motion.p
                            variants={fadeInUp}
                            className="text-sm sm:text-base md:text-lg lg:text-xl mb-6 sm:mb-8 max-w-xs sm:max-w-2xl lg:max-w-3xl mx-auto leading-relaxed px-4"
                            style={{ color: "var(--muted-foreground)" }}
                        >
                            Transform your PDF documents into interactive
                            conversations. Upload, ask questions, and get
                            instant answers powered by advanced AI technology.
                        </motion.p>

                        <motion.div
                            variants={fadeInUp}
                            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4"
                        >
                            <Link href="/home">
                                <motion.button
                                    {...scaleOnHover}
                                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-sm sm:text-base lg:text-lg shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
                                >
                                    Start Chatting Now
                                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                                </motion.button>
                            </Link>
                            <motion.button
                                {...scaleOnHover}
                                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 rounded-xl font-semibold text-sm sm:text-base lg:text-lg transition-colors"
                                style={{
                                    borderColor: "var(--border)",
                                    color: "var(--foreground)",
                                }}
                            >
                                Watch Demo
                            </motion.button>
                        </motion.div>
                    </motion.div>
                </div>
            </section>


            {/* Features Section */}
            <section
                className="px-4 py-12 sm:px-6 sm:py-16 md:px-8 md:py-20 lg:px-12 xl:px-20"
                style={{ backgroundColor: "var(--muted)" }}
            >
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="text-center mb-8 sm:mb-12 lg:mb-16"
                    >
                        <h2
                            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 px-4"
                            style={{ color: "var(--foreground)" }}
                        >
                            Why Choose PDF Chatter?
                        </h2>
                        <p
                            className="text-sm sm:text-base md:text-lg lg:text-xl max-w-xs sm:max-w-xl lg:max-w-2xl mx-auto px-4"
                            style={{ color: "var(--muted-foreground)" }}
                        >
                            Experience the future of document interaction with
                            our cutting-edge features
                        </p>
                    </motion.div>

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
                    >
                        {Feature.map((feature, index) => (
                            <motion.div
                                key={index}
                                variants={fadeInUp}
                                whileHover={{ y: -5 }}
                                className="group rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border"
                                style={{
                                    backgroundColor: "var(--card)",
                                    borderColor: "var(--border)",
                                }}
                            >
                                <div
                                    className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform`}
                                >
                                    <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                                <h3
                                    className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3"
                                    style={{ color: "var(--card-foreground)" }}
                                >
                                    {feature.title}
                                </h3>
                                <p
                                    className="text-sm sm:text-base leading-relaxed"
                                    style={{ color: "var(--muted-foreground)" }}
                                >
                                    {feature.description}
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="px-4 py-12 sm:px-6 sm:py-16 md:px-8 md:py-20 lg:px-12 xl:px-20">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 lg:p-16 text-white"
                    >
                        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">
                            Ready to Transform Your PDF Experience?
                        </h2>
                        <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-6 sm:mb-8 opacity-90">
                            Join thousands of users who are already chatting
                            with their documents
                        </p>
                        <Link href="/sign-up">
                            <motion.button
                                {...scaleOnHover}
                                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-indigo-600 rounded-xl font-semibold text-sm sm:text-base lg:text-lg shadow-lg hover:shadow-xl transition-shadow"
                            >
                                Get Started for Free
                            </motion.button>
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[var(--secondary)] text-[var(--secondary-foreground)] px-6 py-10 sm:px-8 sm:py-12 md:px-12 md:py-16 lg:px-20">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-0">
                        <p className="text-center text-sm text-[var(--muted-foreground)]">
                            © 2025{" "}
                            <span className="font-semibold">PDF Chatter</span>.
                            All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default LandingPage;

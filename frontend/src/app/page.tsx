"use client";
import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FileText, ArrowRight, Sparkles, Image, Globe, FileImage, FileCode, Files, Brain, Star, Quote, Twitter, Github, Linkedin, Mail, Shield, Zap, Users, TrendingUp, Award, CheckCircle } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { Feature } from "@/const";
import { useSession } from "next-auth/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function LandingPage() {
    const { data: session } = useSession();
    // Testimonials data
    const testimonials = [
        {
            name: "Sarah Johnson",
            role: "Research Analyst",
            company: "TechCorp",
            image: "/api/placeholder/64/64",
            content: "OmniAI has revolutionized how I analyze research papers. I can now extract insights from hundreds of PDFs in minutes instead of hours.",
            rating: 5
        },
        {
            name: "Michael Chen",
            role: "Legal Advisor",
            company: "LawFirm Pro",
            image: "/api/placeholder/64/64",
            content: "The accuracy and speed of document analysis is incredible. It's like having a legal assistant that never sleeps.",
            rating: 5
        },
        {
            name: "Emily Rodriguez",
            role: "Student",
            company: "Harvard University",
            image: "/api/placeholder/64/64",
            content: "This tool has transformed my study sessions. I can quickly understand complex academic papers and get instant clarifications.",
            rating: 5
        },
        {
            name: "David Kim",
            role: "Product Manager",
            company: "InnovateTech",
            image: "/api/placeholder/64/64",
            content: "Game-changer for our team. We process technical documentation 10x faster now.",
            rating: 5
        }
    ];

    const stats = [
        { number: "10K+", label: "Happy Users", icon: Users },
        { number: "1M+", label: "PDFs Processed", icon: FileText },
        { number: "99%", label: "Accuracy Rate", icon: Award },
        { number: "24/7", label: "Support", icon: Shield }
    ];

    useEffect(() => {
        // GSAP Animations
        const tl = gsap.timeline();

        // Hero section animations
        gsap.set(".hero-title", { y: 100, opacity: 0 });
        gsap.set(".hero-subtitle", { y: 80, opacity: 0 });
        gsap.set(".hero-buttons", { y: 60, opacity: 0 });
        gsap.set(".floating-element", { scale: 0, rotation: -180 });

        tl.to(".hero-title", { y: 0, opacity: 1, duration: 1, ease: "power3.out" })
            .to(".hero-subtitle", { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, "-=0.5")
            .to(".hero-buttons", { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, "-=0.3")
            .to(".floating-element", {
                scale: 1,
                rotation: 0,
                duration: 1.2,
                ease: "elastic.out(1, 0.5)",
                stagger: 0.1
            }, "-=0.8");

        // Floating animations for elements
        gsap.to(".floating-element", {
            y: "random(-20, 20)",
            x: "random(-10, 10)",
            rotation: "random(-15, 15)",
            duration: "random(3, 5)",
            ease: "power1.inOut",
            repeat: -1,
            yoyo: true,
            stagger: {
                amount: 2,
                from: "random"
            }
        });

        // Stats counter animation
        ScrollTrigger.create({
            trigger: ".stats-section",
            start: "top 80%",
            onEnter: () => {
                document.querySelectorAll('.stat-number').forEach((stat, index) => {
                    const finalValue = stat.textContent || "";
                    const isPercentage = finalValue.includes('%');
                    const isPlus = finalValue.includes('+');
                    const isSlash = finalValue.includes('/');

                    let numericValue = parseInt(finalValue.replace(/[^\d]/g, ''));

                    gsap.fromTo(stat,
                        { textContent: 0 },
                        {
                            textContent: numericValue,
                            duration: 2,
                            delay: index * 0.2,
                            ease: "power2.out",
                            snap: { textContent: 1 },
                            onUpdate: function () {
                                const currentValue = Math.round(this.targets()[0].textContent);
                                if (isPercentage) {
                                    stat.textContent = currentValue + "%";
                                } else if (isPlus) {
                                    stat.textContent = currentValue + "K+";
                                } else if (isSlash) {
                                    stat.textContent = "24/7";
                                } else {
                                    stat.textContent = currentValue + "M+";
                                }
                            }
                        }
                    );
                });
            }
        });

        // Features animation
        ScrollTrigger.create({
            trigger: ".features-grid",
            start: "top 80%",
            onEnter: () => {
                gsap.fromTo(".feature-card", {
                    y: 50,
                    opacity: 0,
                    scale: 0.9
                }, {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    duration: 0.6,
                    stagger: 0.1,
                    ease: "power3.out"
                });
            }
        });

        // Testimonials animation
        ScrollTrigger.create({
            trigger: ".testimonials-section",
            start: "top 80%",
            onEnter: () => {
                gsap.fromTo(".testimonial-card", {
                    y: 80,
                    opacity: 0,
                    rotationY: -15
                }, {
                    y: 0,
                    opacity: 1,
                    rotationY: 0,
                    duration: 0.8,
                    stagger: 0.15,
                    ease: "power3.out"
                });
            }
        });

        return () => {
            ScrollTrigger.getAll().forEach(trigger => trigger.kill());
        };
    }, []);

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
            <motion.nav
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 md:px-8 lg:px-12 xl:px-20 backdrop-blur-xl bg-white/5 dark:bg-black/5 border-b border-white/10 dark:border-white/5"
                style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    backdropFilter: "blur(20px) saturate(200%)",
                    WebkitBackdropFilter: "blur(20px) saturate(200%)",
                    borderImage: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent) 1"
                }}
            >
                <motion.div
                    className="flex items-center space-x-3"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                    <div className="relative">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                            <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-pink-400 to-red-400 rounded-full animate-pulse"></div>
                    </div>
                    <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                        OmniAI
                    </span>
                </motion.div>

                <div className="hidden md:flex items-center space-x-8">
                    <nav className="flex space-x-6">
                        {["Features", "Pricing", "About", "Contact"].map((item) => (
                            <motion.a
                                key={item}
                                href={`#${item.toLowerCase()}`}
                                className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors relative"
                                whileHover={{ y: -2 }}
                                whileTap={{ y: 0 }}
                            >
                                {item}
                                <motion.div
                                    className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600"
                                    whileHover={{ width: "100%" }}
                                    transition={{ duration: 0.3 }}
                                />
                            </motion.a>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center space-x-3">
                    <ThemeToggle />
                    {session ? (
                        <Link href="/chat">
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white rounded-xl overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-100 group-hover:opacity-90 transition-opacity"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <span className="relative z-10 flex items-center">
                                    Start Chatting
                                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 ml-2 animate-pulse" />
                                </span>
                            </motion.button>
                        </Link>
                    ) : (
                        <Link href="/sign-in">
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white rounded-xl overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-100 group-hover:opacity-90 transition-opacity"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <span className="relative z-10">Sign In</span>
                            </motion.button>
                        </Link>
                    )}
                </div>
            </motion.nav>

            <section className="relative px-4 py-12 sm:px-6 sm:py-16 md:px-8 md:py-20 lg:px-12 xl:px-20 pt-24 sm:pt-28 md:pt-32 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-20 left-10 w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                    <div className="absolute top-40 right-20 w-1 h-1 bg-purple-500 rounded-full animate-ping"></div>
                    <div className="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce"></div>
                    <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                </div>

                <div className="hidden lg:block absolute inset-0 pointer-events-none">
                    {floatingIcons.map((item, index) => (
                        <div
                            key={index}
                            className={`floating-element absolute`}
                            style={{ left: item.x, top: item.y }}
                        >
                            <div className={`w-16 h-16 xl:w-20 xl:h-20 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-sm border border-white/20`}>
                                <item.icon className="w-8 h-8 xl:w-10 xl:h-10 text-white" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="text-center">
                        <div className="mb-8">
                            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-800 backdrop-blur-sm hero-subtitle"
                                style={{ color: "var(--foreground)" }}>
                                <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                                Powered by Advanced AI
                            </span>
                        </div>

                        <h1
                            className="hero-title text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold mb-4 sm:mb-6 leading-tight px-2"
                            style={{ color: "var(--foreground)" }}
                        >
                            Chat with Your
                            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                {" "}
                                PDFs
                            </span>
                            <br />
                            Like Never Before
                        </h1>

                        <p
                            className="hero-subtitle text-sm sm:text-base md:text-lg lg:text-xl mb-6 sm:mb-8 max-w-xs sm:max-w-2xl lg:max-w-3xl mx-auto leading-relaxed px-4"
                            style={{ color: "var(--muted-foreground)" }}
                        >
                            Transform your PDF documents into interactive
                            conversations. Upload, ask questions, and get
                            instant answers powered by advanced AI technology.
                        </p>

                        <div className="hero-buttons flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
                            <Link href="/home">
                                <motion.button
                                    whileHover={{ scale: 1.05, y: -3 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="relative w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-white rounded-xl font-semibold text-sm sm:text-base lg:text-lg shadow-lg hover:shadow-xl transition-all overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <span className="relative z-10 flex items-center justify-center">
                                        Start Chatting Now
                                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </motion.button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <section className="stats-section px-4 py-8 sm:px-6 sm:py-12 md:px-8 lg:px-12 xl:px-20 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border-y border-indigo-100 dark:border-indigo-900/30">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center group">
                                <div className="relative mb-4">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                        <stat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-pink-400 to-red-400 rounded-full animate-pulse"></div>
                                </div>
                                <div className="stat-number text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                                    {stat.number}
                                </div>
                                <div className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            <section
                className="features-section px-4 py-12 sm:px-6 sm:py-16 md:px-8 md:py-20 lg:px-12 xl:px-20"
                style={{ backgroundColor: "var(--muted)" }}
            >
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-8 sm:mb-12 lg:mb-16">
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
                    </div>

                    <div className="features-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                        {Feature.map((feature, index) => (
                            <div
                                key={index}
                                className="feature-card group rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border backdrop-blur-sm"
                                style={{
                                    backgroundColor: "var(--card)",
                                    borderColor: "var(--border)",
                                }}
                            >
                                <div className="relative">
                                    <div
                                        className={`w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform shadow-lg`}
                                    >
                                        <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-pink-400 to-red-400 rounded-full opacity-0 group-hover:opacity-100 animate-pulse transition-opacity"></div>
                                </div>
                                <h3
                                    className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
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
                                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <motion.div
                                        className="w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                                        initial={{ width: 0 }}
                                        whileInView={{ width: "100%" }}
                                        transition={{ duration: 1, delay: index * 0.1 }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="testimonials-section px-4 py-12 sm:px-6 sm:py-16 md:px-8 md:py-20 lg:px-12 xl:px-20 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/10 dark:via-gray-950 dark:to-purple-950/10">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-8 sm:mb-12 lg:mb-16">
                        <h2
                            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 px-4"
                            style={{ color: "var(--foreground)" }}
                        >
                            What Our Users Say
                        </h2>
                        <p
                            className="text-sm sm:text-base md:text-lg lg:text-xl max-w-xs sm:max-w-xl lg:max-w-2xl mx-auto px-4"
                            style={{ color: "var(--muted-foreground)" }}
                        >
                            Join thousands of satisfied users who have transformed their document workflow
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                        {testimonials.map((testimonial, index) => (
                            <div
                                key={index}
                                className="testimonial-card group relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50"
                            >
                                <div className="absolute -top-4 left-6">
                                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                                        <Quote className="w-4 h-4 text-white" />
                                    </div>
                                </div>

                                <div className="flex items-center mb-4 mt-2">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                                    ))}
                                </div>

                                <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed italic">
                                    "{testimonial.content}"
                                </p>

                                <div className="flex items-center space-x-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
                                            {testimonial.name.charAt(0)}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-900"></div>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            {testimonial.name}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {testimonial.role} at {testimonial.company}
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-12">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all cursor-pointer"
                        >
                            <span>Join 10,000+ Happy Users</span>
                            <ArrowRight className="w-4 h-4" />
                        </motion.div>
                    </div>
                </div>
            </section>

            <section className="px-4 py-12 sm:px-6 sm:py-16 md:px-8 md:py-20 lg:px-12 xl:px-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-10"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.1)_100%)]"></div>

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 md:p-12 lg:p-16 text-white relative overflow-hidden"
                    >
                        <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
                        <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/5 rounded-full animate-bounce"></div>
                        <div className="absolute top-1/2 left-8 w-2 h-2 bg-white/30 rounded-full animate-ping"></div>
                        <div className="absolute top-8 left-1/3 w-1 h-1 bg-white/40 rounded-full animate-pulse"></div>

                        <div className="relative z-10">
                            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
                                Ready to Transform Your PDF Experience?
                            </h2>
                            <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 opacity-90 leading-relaxed">
                                Join thousands of users who are already chatting with their documents
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <Link href="/chat">
                                    <motion.button
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="w-full sm:w-auto px-8 py-4 bg-white text-indigo-600 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2"
                                    >
                                        <span>Get Started for Free</span>
                                        <Sparkles className="w-5 h-5" />
                                    </motion.button>
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            <footer className="relative bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 text-white overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0 bg-gradient-radial from-transparent to-white/10"></div>
                    <div
                        className="absolute top-0 left-0 w-full h-full"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        }}
                    ></div>
                </div>

                <div className="relative z-10 px-6 pt-12 pb-6 sm:px-8 md:px-12 lg:px-20">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10 items-center">
                            <div>
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="relative">
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                                            <Brain className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gradient-to-r from-pink-400 to-red-400 rounded-full animate-pulse"></div>
                                    </div>
                                    <span className="text-xl font-semibold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                                        OmniAI
                                    </span>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed mb-4 max-w-sm">
                                    Turn your PDFs into smart conversations. Unlock document insights with AI that understands context.
                                </p>
                                <div className="flex space-x-3">
                                    {[
                                        { icon: Twitter, href: "#", color: "hover:text-blue-400" },
                                        { icon: Github, href: "https://github.com/Rana718", color: "hover:text-gray-300" },
                                        { icon: Linkedin, href: "#", color: "hover:text-blue-500" },
                                        { icon: Mail, href: "#", color: "hover:text-green-400" }
                                    ].map((social, index) => (
                                        <motion.a
                                            key={index}
                                            href={social.href}
                                            whileHover={{ scale: 1.15, y: -1 }}
                                            whileTap={{ scale: 0.95 }}
                                            className={`w-9 h-9 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm transition-all ${social.color} hover:bg-white/20`}
                                        >
                                            <social.icon className="w-4.5 h-4.5" />
                                        </motion.a>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
                            <p className="text-center md:text-left">
                                © 2025 <span className="font-medium text-white">OmniAI PDF Chatter</span>. All rights reserved.
                            </p>
                            <div className="flex flex-wrap justify-center md:justify-end gap-4">
                                {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((link) => (
                                    <motion.a
                                        key={link}
                                        href="#"
                                        whileHover={{ y: -1 }}
                                        className="hover:text-white transition-colors"
                                    >
                                        {link}
                                    </motion.a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute top-16 left-10 w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                <div className="absolute top-32 right-20 w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping"></div>
                <div className="absolute bottom-24 left-1/4 w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce"></div>
            </footer>

        </div>
    );
}

export default LandingPage;

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { Loader2, Lock, Mail, FileText, Eye, EyeOff, Brain, Sparkles, ArrowRight } from "lucide-react";

export default function SignIn() {
    const router = useRouter();
    const { status } = useSession();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const api_key = process.env.NEXT_PUBLIC_API;

    useEffect(() => {
        if (status === "authenticated") {
            router.push("/chat");
        }
        console.log("api_key", api_key);
    }, [status, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                redirect: false,
                email,
                password,
            });

            if (result?.error) {
                setError("Invalid email or password");
                setIsLoading(false);
                return;
            }
        } catch (error) {
            console.error("Sign in error:", error);
            setError("An unexpected error occurred");
            setIsLoading(false);
        }
    };

    const fadeInUp = {
        initial: { opacity: 0, y: 60 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.8, ease: "easeOut" },
    };

    const slideInFromLeft = {
        initial: { opacity: 0, x: -50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.8, delay: 0.2, ease: "easeOut" },
    };

    const floatingElements = [
        { size: "w-32 h-32", position: "top-20 left-20", delay: 0, color: "bg-blue-500/10" },
        { size: "w-24 h-24", position: "top-40 right-32", delay: 1, color: "bg-purple-500/10" },
        { size: "w-40 h-40", position: "bottom-32 left-16", delay: 2, color: "bg-indigo-500/10" },
        { size: "w-28 h-28", position: "bottom-20 right-20", delay: 1.5, color: "bg-pink-500/10" },
    ];

    return (
        <div
            className="min-h-screen flex transition-colors duration-300 relative overflow-hidden"
            style={{ background: "var(--background-gradient)" }}
        >
            {/* Animated Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                {floatingElements.map((element, index) => (
                    <motion.div
                        key={index}
                        className={`absolute ${element.size} ${element.position} ${element.color} rounded-full blur-3xl`}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                            opacity: [0.3, 0.6, 0.3],
                            scale: [0.8, 1.2, 0.8],
                            rotate: [0, 180, 360],
                        }}
                        transition={{
                            duration: 8,
                            repeat: Infinity,
                            repeatType: "loop",
                            ease: "easeInOut",
                            delay: element.delay,
                        }}
                    />
                ))}
            </div>

            {/* Left Panel */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 opacity-95"></div>
                
                {/* Floating Icons */}
                <div className="absolute inset-0">
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute"
                            style={{
                                left: `${15 + (i % 3) * 25}%`,
                                top: `${20 + Math.floor(i / 3) * 30}%`,
                            }}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{
                                opacity: [0.4, 0.8, 0.4],
                                y: [0, -20, 0],
                                rotate: [0, 360],
                            }}
                            transition={{
                                duration: 6,
                                repeat: Infinity,
                                delay: i * 0.5,
                                ease: "easeInOut",
                            }}
                        >
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="relative z-10 flex items-center justify-center w-full h-full">
                    <motion.div
                        variants={slideInFromLeft}
                        initial="initial"
                        animate="animate"
                        className="flex flex-col items-center justify-center text-center px-8 text-white max-w-lg"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.5, type: "spring" }}
                            className="flex items-center justify-center mb-8"
                        >
                            <div className="w-20 h-20 bg-gradient-to-r from-white/30 to-white/10 backdrop-blur-lg rounded-3xl flex items-center justify-center mr-4 shadow-2xl">
                                <Brain className="w-10 h-10 text-white" />
                            </div>
                            <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                                OmniAI
                            </h1>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8, duration: 0.6 }}
                            className="mb-6"
                        >
                            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm border border-white/30">
                                <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                                Welcome Back
                            </span>
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1, duration: 0.6 }}
                            className="text-3xl font-bold mb-4"
                        >
                            Continue Your Journey
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.2, duration: 0.6 }}
                            className="text-lg opacity-90 leading-relaxed"
                        >
                            Sign in to continue your intelligent conversations with PDF documents and unlock the power of AI-driven insights.
                        </motion.p>
                    </motion.div>
                </div>
            </div>

            {/* Right Panel */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">
                <motion.div
                    variants={fadeInUp}
                    initial="initial"
                    animate="animate"
                    className="w-full max-w-md space-y-8 backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-3xl p-8 shadow-2xl"
                >
                    <div className="text-center space-y-3">
                        <motion.h2
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3, type: "spring" }}
                            className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
                        >
                            Welcome Back
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-base"
                            style={{ color: "var(--muted-foreground)" }}
                        >
                            Don't have an account?{" "}
                            <Link
                                href="/sign-up"
                                className="font-semibold transition-all duration-300 hover:underline bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
                            >
                                Sign up here
                            </Link>
                        </motion.p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="p-4 rounded-2xl border-2 text-sm backdrop-blur-sm"
                            style={{
                                backgroundColor: "var(--destructive)",
                                color: "var(--destructive-foreground)",
                                borderColor: "var(--destructive)",
                            }}
                        >
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-current"></div>
                                <span>{error}</span>
                            </div>
                        </motion.div>
                    )}

                    <motion.form
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="space-y-6"
                        onSubmit={handleSubmit}
                    >
                        <div className="space-y-5">
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileFocus={{ scale: 1.02 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-semibold mb-3"
                                    style={{ color: "var(--foreground)" }}
                                >
                                    Email Address
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 transition-colors group-focus-within:text-indigo-500">
                                        <Mail className="h-5 w-5" style={{ color: "var(--muted-foreground)" }} />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full p-4 rounded-2xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 backdrop-blur-sm"
                                        style={{
                                            backgroundColor: "var(--input)",
                                            borderColor: "var(--border)",
                                            color: "var(--foreground)",
                                        }}
                                        placeholder="Enter your email address"
                                    />
                                </div>
                            </motion.div>

                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileFocus={{ scale: 1.02 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-semibold mb-3"
                                    style={{ color: "var(--foreground)" }}
                                >
                                    Password
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 transition-colors group-focus-within:text-indigo-500">
                                        <Lock className="h-5 w-5" style={{ color: "var(--muted-foreground)" }} />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full p-4 rounded-2xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 backdrop-blur-sm"
                                        style={{
                                            backgroundColor: "var(--input)",
                                            borderColor: "var(--border)",
                                            color: "var(--foreground)",
                                        }}
                                        placeholder="Enter your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-4 transition-colors hover:text-indigo-500"
                                        style={{ color: "var(--muted-foreground)" }}
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </motion.div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed shadow-2xl hover:shadow-indigo-500/25 text-lg"
                        >
                            <div className="flex items-center justify-center">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                                        Signing you in...
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </div>
                        </motion.button>
                    </motion.form>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="text-center"
                    >
                        <Link
                            href="#"
                            className="text-sm font-medium transition-all duration-300 hover:underline bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
                        >
                            Forgot your password?
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Loader2, Lock, Mail, User, FileText, Eye, EyeOff } from "lucide-react";
import axios from "axios";

export default function SignUp() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const api_key = process.env.NEXT_PUBLIC_API;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            await axios.post(`${api_key}/auth/signup/`, {
                email,
                password,
                name,
            });

            const result = await signIn("credentials", {
                redirect: false,
                email,
                password,
            });

            if (result?.error) {
                setError(
                    "Registration successful, but could not log in automatically",
                );
                setIsLoading(false);
                return;
            }

            router.push("/home");
            router.refresh();
        } catch (error: any) {
            console.error("Registration error:", error);
            setError(error.response?.data?.detail || "Registration failed");
            setIsLoading(false);
        }
    };

    const fadeInUp = {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6 },
    };

    const slideInFromLeft = {
        initial: { opacity: 0, x: -30 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.5, delay: 0.2 },
    };

    return (
        <div
            className="min-h-screen flex transition-colors duration-300"
            style={{ background: "var(--background-gradient)" }}
        >
            {/* Left side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                {/* Background Gradient Layer */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 opacity-90"></div>

                {/* Foreground Content Layer */}
                <div className="relative z-10 flex items-center justify-center w-full h-full px-6 text-white">
                    <motion.div
                        variants={slideInFromLeft}
                        initial="initial"
                        animate="animate"
                        className="flex flex-col items-center justify-center text-center max-w-lg"
                    >
                        <div className="flex items-center justify-center mb-8">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center mr-4">
                                <FileText className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-4xl font-bold">PDF Chatter</h1>
                        </div>
                        <h2 className="text-2xl font-semibold mb-4">
                            Join Us Today!
                        </h2>
                        <p className="text-lg opacity-90">
                            Create your account and start having intelligent
                            conversations with your PDF documents.
                        </p>

                        {/* Floating elements */}
                        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-float"></div>
                        <div
                            className="absolute bottom-20 right-20 w-40 h-40 bg-white/5 rounded-full blur-3xl animate-float"
                            style={{ animationDelay: "1s" }}
                        ></div>
                    </motion.div>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
                <motion.div
                    variants={fadeInUp}
                    initial="initial"
                    animate="animate"
                    className="w-full max-w-md space-y-8 border rounded-xl p-8 shadow-lg"
                >
                    <div className="text-center space-y-2">
                        <motion.h2
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-3xl font-bold"
                            style={{ color: "var(--foreground)" }}
                        >
                            Create Account
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-sm"
                            style={{ color: "var(--muted-foreground)" }}
                        >
                            Already have an account?{" "}
                            <Link
                                href="/sign-in"
                                className="font-medium transition-colors"
                                style={{ color: "var(--primary)" }}
                            >
                                Sign in
                            </Link>
                        </motion.p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="p-4 rounded-xl border text-sm"
                            style={{
                                backgroundColor: "var(--destructive)",
                                color: "var(--destructive-foreground)",
                                borderColor: "var(--destructive)",
                            }}
                        >
                            {error}
                        </motion.div>
                    )}

                    <motion.form
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="space-y-6"
                        onSubmit={handleSubmit}
                    >
                        <div className="space-y-4">
                            <motion.div
                                whileFocus={{ scale: 1.02 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <label
                                    htmlFor="name"
                                    className="block text-sm font-medium mb-2"
                                    style={{ color: "var(--foreground)" }}
                                >
                                    Full Name
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                                        <User
                                            className="h-5 w-5"
                                            style={{
                                                color: "var(--muted-foreground)",
                                            }}
                                        />
                                    </div>
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        autoComplete="name"
                                        required
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2"
                                        style={
                                            {
                                                backgroundColor: "var(--input)",
                                                borderColor: "var(--border)",
                                                color: "var(--foreground)",
                                                "--tw-ring-color":
                                                    "var(--ring)",
                                            } as React.CSSProperties
                                        }
                                        placeholder="Enter your full name"
                                    />
                                </div>
                            </motion.div>

                            <motion.div
                                whileFocus={{ scale: 1.02 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium mb-2"
                                    style={{ color: "var(--foreground)" }}
                                >
                                    Email address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                                        <Mail
                                            className="h-5 w-5"
                                            style={{
                                                color: "var(--muted-foreground)",
                                            }}
                                        />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2"
                                        style={
                                            {
                                                backgroundColor: "var(--input)",
                                                borderColor: "var(--border)",
                                                color: "var(--foreground)",
                                                "--tw-ring-color":
                                                    "var(--ring)",
                                            } as React.CSSProperties
                                        }
                                        placeholder="Enter your email"
                                    />
                                </div>
                            </motion.div>

                            <motion.div
                                whileFocus={{ scale: 1.02 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium mb-2"
                                    style={{ color: "var(--foreground)" }}
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                                        <Lock
                                            className="h-5 w-5"
                                            style={{
                                                color: "var(--muted-foreground)",
                                            }}
                                        />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        autoComplete="new-password"
                                        required
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        className="w-full pl-12 pr-12 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2"
                                        style={
                                            {
                                                backgroundColor: "var(--input)",
                                                borderColor: "var(--border)",
                                                color: "var(--foreground)",
                                                "--tw-ring-color":
                                                    "var(--ring)",
                                            } as React.CSSProperties
                                        }
                                        placeholder="Create a password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className="absolute inset-y-0 right-0 flex items-center pr-4 transition-colors"
                                        style={{
                                            color: "var(--muted-foreground)",
                                        }}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                                <p
                                    className="mt-2 text-xs"
                                    style={{ color: "var(--muted-foreground)" }}
                                >
                                    Password should be at least 8 characters
                                    long
                                </p>
                            </motion.div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                            style={
                                {
                                    "--tw-ring-color": "var(--ring)",
                                } as React.CSSProperties
                            }
                        >
                            <div className="flex items-center justify-center">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Creating account...
                                    </>
                                ) : (
                                    "Create Account"
                                )}
                            </div>
                        </motion.button>
                    </motion.form>

                    {/* Terms and Privacy */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="text-center text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                    >
                        By creating an account, you agree to our{" "}
                        <Link
                            href="#"
                            className="transition-colors"
                            style={{ color: "var(--primary)" }}
                        >
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link
                            href="#"
                            className="transition-colors"
                            style={{ color: "var(--primary)" }}
                        >
                            Privacy Policy
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}

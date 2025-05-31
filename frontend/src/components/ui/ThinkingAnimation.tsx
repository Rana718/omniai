import { motion } from 'framer-motion'
import { Bot } from 'lucide-react'
import React from 'react'

function ThinkingAnimation() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center space-x-2 p-4 max-w-xs"
        >
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
            </div>
            <div
                className="rounded-2xl px-4 py-2 flex items-center space-x-1"
                style={{ backgroundColor: 'var(--muted)' }}
            >
                <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--muted-foreground)' }}
                />
                <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--muted-foreground)' }}
                />
                <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--muted-foreground)' }}
                />
            </div>
        </motion.div>
    )
}

export default ThinkingAnimation
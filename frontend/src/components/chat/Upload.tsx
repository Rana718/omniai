import axiosInstance from '@/lib/api'
import { Message, PreviousChat } from '@/types'
import { motion } from 'framer-motion'
import { FileText, X, Send, Upload, Plus, Edit2 } from 'lucide-react'
import React, { useState } from 'react'

interface UploadProps {
    file: File | null
    uploadProgress: number
    setFile: (file: File | null) => void
    setUploadProgress: (progress: number) => void
    setSelectedChatId: (docId: string) => void
    setPreviousChats: (chats: PreviousChat[]) => void
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>
    onUploadSuccess?: (docId: string) => void
}

export default function UploadFile({
    file,
    uploadProgress,
    setFile,
    setUploadProgress,
    setSelectedChatId,
    setPreviousChats,
    setMessages,
    onUploadSuccess,
}: UploadProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [chatName, setChatName] = useState("");
    const [isCustomName, setIsCustomName] = useState(false);

    const handleFileUpload = async () => {
        if (selectedFiles.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();

            selectedFiles.forEach((file) => {
                formData.append("files", file);
            });

            const finalChatName = chatName.trim() ||
                (selectedFiles.length === 1
                    ? selectedFiles[0].name.replace('.pdf', '')
                    : `${selectedFiles.length} Documents`);

            formData.append("doc_name", finalChatName);

            const response = await axiosInstance.post(
                "/pdfchat/upload",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const progress = Math.round(
                                (progressEvent.loaded * 100) /
                                progressEvent.total,
                            );
                            setUploadProgress(progress);
                        }
                    },
                },
            );

            setIsUploading(false);
            setSelectedChatId(response.data.doc_id);
            onUploadSuccess?.(response.data.doc_id);

            const updatedResponse = await axiosInstance.get("/pdfchat");
            const updatedChats: PreviousChat[] = updatedResponse.data;
            const sortedUpdatedChats = updatedChats.sort((a, b) => {
                const timestampA = new Date(a.created_at).getTime();
                const timestampB = new Date(b.created_at).getTime();
                return timestampB - timestampA;
            });
            setPreviousChats(sortedUpdatedChats);
            setSelectedFiles([]);
            setChatName("");
            setIsCustomName(false);
            setFile(null);
            setUploadProgress(0);
            setMessages([]);
        } catch (error) {
            console.error("Upload failed:", error);
            setIsUploading(false);
            alert("Upload failed. Please try again.");
        }
    };

    const removeFile = (index: number) => {
        const newFiles = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(newFiles);

        if (newFiles.length === 0) {
            setFile(null);
            setChatName("");
            setIsCustomName(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        handleFilesSelect(files);
    };

    const handleFilesSelect = (files: File[]) => {
        const pdfFiles = files.filter(file => file.type === "application/pdf");

        if (pdfFiles.length === 0) {
            alert("Please select PDF files only");
            return;
        }

        if (pdfFiles.length !== files.length) {
            alert("Some files were ignored. Only PDF files are supported.");
        }

        setSelectedFiles(pdfFiles);
        setFile(pdfFiles[0]); 

        if (!isCustomName) {
            if (pdfFiles.length === 1) {
                setChatName(pdfFiles[0].name.replace('.pdf', ''));
            } else {
                setChatName(`${pdfFiles.length} Documents`);
            }
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getTotalSize = () => {
        return selectedFiles.reduce((total, file) => total + file.size, 0);
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background">
            <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
                <div className="max-w-2xl w-full">
                    {selectedFiles.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center"
                        >
                            <div className="mb-8">
                                <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-white" />
                                </div>
                                <h1 className="text-3xl font-bold mb-2 text-foreground">
                                    Upload PDFs to start chatting
                                </h1>
                                <p className="text-muted-foreground">
                                    Upload one or more PDF documents and start having a conversation about their content
                                </p>
                            </div>

                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`relative border-2 border-dashed rounded-xl p-12 transition-all duration-300 cursor-pointer hover-upload-zone ${isDragOver
                                    ? 'border-primary-custom upload-drag-active'
                                    : 'border-custom'
                                    }`}
                            >
                                <div className="space-y-4">
                                    <div className="w-12 h-12 mx-auto text-muted-foreground">
                                        <Upload className="w-12 h-12" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium mb-2 text-foreground">
                                            Drop your PDFs here, or click to browse
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Supports multiple PDF files, up to 10MB each
                                        </p>
                                    </div>
                                    <label className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-shadow cursor-pointer">
                                        <Upload className="w-4 h-4 mr-2" />
                                        Choose Files
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            multiple
                                            onChange={(e) =>
                                                e.target.files && handleFilesSelect(Array.from(e.target.files))
                                            }
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            {/* Chat Name Input */}
                            <div className="rounded-xl p-6 border border-custom bg-card">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-card-foreground">Chat Name</h3>
                                    <button
                                        onClick={() => setIsCustomName(!isCustomName)}
                                        className="flex items-center space-x-2 text-sm text-primary hover:text-primary/80 transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                        <span>{isCustomName ? 'Use Auto' : 'Customize'}</span>
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={chatName}
                                    onChange={(e) => {
                                        setChatName(e.target.value);
                                        setIsCustomName(true);
                                    }}
                                    placeholder="Enter chat name..."
                                    className="w-full p-3 border border-custom rounded-lg focus:outline-none focus:ring-2 ring-custom transition-all bg-input text-foreground placeholder:text-input-placeholder"
                                />
                                {!isCustomName && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Auto-generated from file names
                                    </p>
                                )}
                            </div>

                            {/* Selected Files */}
                            <div className="rounded-xl p-6 border border-custom bg-card">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-card-foreground">
                                        Selected Files ({selectedFiles.length})
                                    </h3>
                                    <div className="text-sm text-muted-foreground">
                                        Total: {formatFileSize(getTotalSize())}
                                    </div>
                                </div>

                                <div className="space-y-3 max-h-48 overflow-y-auto">
                                    {selectedFiles.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r from-red-500 to-pink-500">
                                                    <FileText className="w-4 h-4 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-card-foreground text-sm">
                                                        {file.name}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatFileSize(file.size)}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeFile(index)}
                                                className="p-1 transition-colors hover:opacity-80 text-muted-foreground hover:text-destructive"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Add More Files Button */}
                                <div className="mt-4 pt-4 border-t border-custom">
                                    <label className="inline-flex items-center px-4 py-2 border border-custom rounded-lg text-sm font-medium hover:bg-muted transition-colors cursor-pointer">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add More Files
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            multiple
                                            onChange={(e) => {
                                                if (e.target.files) {
                                                    const newFiles = Array.from(e.target.files);
                                                    const pdfFiles = newFiles.filter(file => file.type === "application/pdf");
                                                    setSelectedFiles([...selectedFiles, ...pdfFiles]);
                                                }
                                            }}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                {isUploading && (
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between text-sm mb-2 text-foreground">
                                            <span>Uploading files...</span>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <div className="w-full rounded-full h-2 bg-muted">
                                            <div
                                                className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="text-center">
                                <button
                                    onClick={handleFileUpload}
                                    disabled={isUploading || selectedFiles.length === 0 || !chatName.trim()}
                                    className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Processing {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            Start Chat with {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    )
}
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { signInWithGoogle } from "@/lib/supabase";

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            await signInWithGoogle();
        } catch {
            setError("ログインに失敗しました。もう一度お試しください。");
            setLoading(false);
        }
    };

    return (
        <div
            className="flex min-h-dvh flex-col items-center justify-center px-6"
            style={{ background: "linear-gradient(180deg, #0B1026 0%, #12122A 100%)" }}
        >
            {/* 背景の光 */}
            <div
                className="pointer-events-none fixed inset-0"
                style={{
                    background:
                        "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(250,188,45,0.08) 0%, transparent 70%)",
                }}
            />

            {/* ロゴ・タイトル */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="mb-14 text-center"
            >
                {/* 蛍アイコン */}
                <motion.div
                    animate={{
                        scale: [1, 1.12, 1],
                        opacity: [0.8, 1, 0.8],
                    }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                    className="mb-6 text-6xl"
                    style={{ filter: "drop-shadow(0 0 18px rgba(250,188,45,0.7))" }}
                >
                    🌟
                </motion.div>

                <h1
                    className="text-5xl font-bold tracking-tight"
                    style={{ color: "#FABC2D" }}
                >
                    Hotaru
                </h1>
                <p
                    className="mt-2 text-sm tracking-widest"
                    style={{ color: "#666A8A" }}
                >
                    蛍
                </p>
                <p
                    className="mt-6 text-sm leading-relaxed"
                    style={{ color: "#9095B8" }}
                >
                    あなたの旅の記憶を、
                    <br />
                    どこからでも。
                </p>
            </motion.div>

            {/* ログインボタン */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 }}
                className="flex w-full max-w-xs flex-col items-center gap-4"
            >
                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-full text-sm font-semibold transition-all active:scale-95 disabled:opacity-60"
                    style={{
                        background: loading ? "#E8E8E8" : "#FFFFFF",
                        color: "#1A1A1A",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
                    }}
                >
                    {/* Google ロゴ */}
                    {!loading && (
                        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                            <path
                                fill="#EA4335"
                                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                            />
                            <path
                                fill="#4285F4"
                                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                            />
                            <path
                                fill="#34A853"
                                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                            />
                        </svg>
                    )}
                    {loading ? "ログイン中..." : "Googleでログイン"}
                </button>

                {error && (
                    <p className="text-center text-xs" style={{ color: "#FF6B6B" }}>
                        {error}
                    </p>
                )}

                <p className="mt-6 text-center text-xs" style={{ color: "#555880" }}>
                    続けることで、利用規約とプライバシーポリシーに
                    <br />
                    同意したことになります。
                </p>
            </motion.div>

            {/* 底面グロー */}
            <div
                className="pointer-events-none fixed bottom-0 left-0 right-0 h-32"
                style={{
                    background:
                        "linear-gradient(to top, rgba(250,188,45,0.05) 0%, transparent 100%)",
                }}
            />
        </div>
    );
}

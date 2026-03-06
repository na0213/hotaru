"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GOLD, BG_CARD, WHITE, GRAY } from "@/constants/colors";

interface TitleInputModalProps {
    onConfirm: (title: string) => void;
}

export function TitleInputModal({ onConfirm }: TitleInputModalProps) {
    const now = new Date();
    const defaultTitle = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")} の旅`;
    const [title, setTitle] = useState(defaultTitle);

    return (
        <>
            {/* オーバーレイ */}
            <div className="fixed inset-0 z-[2000] bg-black/70" />

            {/* モーダル */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="fixed inset-0 z-[2001] flex items-center justify-center px-6"
            >
                <div
                    className="w-full max-w-sm rounded-3xl p-6"
                    style={{ background: BG_CARD }}
                >
                    <h2
                        className="mb-2 text-center text-lg font-bold"
                        style={{ color: WHITE }}
                    >
                        旅のタイトル
                    </h2>
                    <p
                        className="mb-5 text-center text-xs"
                        style={{ color: GRAY }}
                    >
                        この旅に名前をつけましょう
                    </p>

                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="例：京都の旅、東京散歩..."
                        className="mb-5 w-full rounded-xl border-none px-4 py-3 text-sm outline-none"
                        style={{
                            background: "#0B1026",
                            color: WHITE,
                            border: `1px solid ${GRAY}30`,
                        }}
                    />

                    <div
                        role="button"
                        onClick={() => onConfirm(title || defaultTitle)}
                        className="flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl text-sm font-bold text-black transition-transform active:scale-95"
                        style={{
                            background: `linear-gradient(135deg, ${GOLD}, #FBBF24)`,
                        }}
                    >
                        ✨ この旅を記録する
                    </div>
                </div>
            </motion.div>
        </>
    );
}

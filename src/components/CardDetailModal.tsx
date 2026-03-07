"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EMOTIONS, type Emotion } from "@/types";
import { BG_CARD, WHITE, GRAY } from "@/constants/colors";
import type { Database } from "@/lib/database.types";

type SpotRow = Database["public"]["Tables"]["spots"]["Row"];
type LoveRow = Database["public"]["Tables"]["loves"]["Row"];
export type LoveWithSpot = LoveRow & { spots: SpotRow | null };

const EMOTION_COLORS: Record<Emotion, string> = {
    tanoshii: "#F97316",
    utsukushii: "#38BDF8",
    nokoshitai: "#F472B6",
};

function formatDatetime(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface CardDetailModalProps {
    love: LoveWithSpot;
    onClose: () => void;
    onEmotionChange: (love: LoveWithSpot, newEmotion: Emotion) => Promise<void>;
}

export function CardDetailModal({ love, onClose, onEmotionChange }: CardDetailModalProps) {
    const [showEmotionPicker, setShowEmotionPicker] = useState(false);
    const [changing, setChanging] = useState(false);

    const emotion = love.emotion as Emotion;
    const emo = EMOTIONS[emotion] ?? EMOTIONS.tanoshii;
    const color = EMOTION_COLORS[emotion] ?? EMOTION_COLORS.tanoshii;

    const handleEmotionSelect = async (newEmotion: Emotion) => {
        if (newEmotion === emotion || changing) return;
        setChanging(true);
        await onEmotionChange(love, newEmotion);
        setChanging(false);
        setShowEmotionPicker(false);
    };

    return (
        <div
            className="fixed inset-0 z-[4000] flex items-center justify-center p-5"
            style={{ background: "rgba(0,0,0,0.8)" }}
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-sm rounded-3xl overflow-hidden"
                style={{
                    background: BG_CARD,
                    boxShadow: `0 0 40px ${color}40`,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 閉じるボタン */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full text-sm"
                    style={{ background: "rgba(0,0,0,0.5)", color: WHITE }}
                >
                    ✕
                </button>

                {/* 感情変更ボタン */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowEmotionPicker(true);
                    }}
                    className="absolute top-3 right-12 z-10 w-8 h-8 flex items-center justify-center rounded-full text-sm"
                    style={{ background: "rgba(0,0,0,0.5)" }}
                >
                    ✏️
                </button>

                {/* 写真エリア */}
                <div
                    className="relative flex items-center justify-center"
                    style={{
                        height: 208,
                        background: `linear-gradient(135deg, ${color}30, ${color}10)`,
                    }}
                >
                    {love.photo_url ? (
                        <img
                            src={love.photo_url}
                            alt="love"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-6xl">{emo.emoji}</span>
                    )}
                </div>

                {/* 情報エリア */}
                <div className="p-5">
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mb-3"
                        style={{ background: `${color}20`, color }}
                    >
                        {emo.emoji} {emo.label}
                    </span>

                    {love.spots?.place_name && (
                        <p className="text-sm font-medium mb-2" style={{ color: WHITE }}>
                            📍 {love.spots.place_name}
                        </p>
                    )}

                    <p className="text-xs mb-2" style={{ color: GRAY }}>
                        🕐 {formatDatetime(love.recorded_at)}
                    </p>

                    {love.spots?.love_count !== undefined && love.spots.love_count > 0 && (
                        <p className="text-xs" style={{ color: GRAY }}>
                            🌟 {love.spots.love_count}人が光を灯した場所
                        </p>
                    )}
                </div>

                {/* 感情変更オーバーレイ */}
                <AnimatePresence>
                    {showEmotionPicker && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl"
                            style={{ background: "rgba(11,16,38,0.95)" }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <p className="text-sm font-bold mb-2" style={{ color: WHITE }}>
                                感情を変更
                            </p>
                            {(["tanoshii", "utsukushii", "nokoshitai"] as Emotion[]).map((key) => {
                                const e = EMOTIONS[key];
                                const c = EMOTION_COLORS[key];
                                const isSelected = key === emotion;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => handleEmotionSelect(key)}
                                        disabled={changing}
                                        className="w-44 py-3 rounded-2xl text-sm font-bold transition-transform active:scale-95"
                                        style={{
                                            background: isSelected ? `${c}30` : "transparent",
                                            color: c,
                                            border: `2px solid ${isSelected ? c : c + "40"}`,
                                            opacity: changing ? 0.5 : 1,
                                        }}
                                    >
                                        {e.emoji} {e.label}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setShowEmotionPicker(false)}
                                className="mt-2 text-xs"
                                style={{ color: GRAY }}
                            >
                                キャンセル
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}

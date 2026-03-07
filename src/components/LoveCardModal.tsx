"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Database } from "@/lib/database.types";
import { EMOTIONS, type Emotion } from "@/types";
import { GOLD, WHITE, GRAY } from "@/constants/colors";

type LoveRow = Database["public"]["Tables"]["loves"]["Row"];
type SpotRow = Database["public"]["Tables"]["spots"]["Row"];

const EMOTION_COLORS: Record<string, string> = {
    tanoshii: "#F97316",
    utsukushii: "#38BDF8",
    nokoshitai: "#F472B6",
};

interface Props {
    loves: LoveRow[];
    initialIndex: number;
    spot: SpotRow;
    onClose: () => void;
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function LoveCardModal({ loves, initialIndex, spot, onClose }: Props) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    const love = loves[currentIndex];
    if (!love) return null;

    const emotionDef = EMOTIONS[love.emotion as Emotion] ?? {
        emoji: "✨",
        label: love.emotion,
        color: "#F59E0B",
    };
    const color = EMOTION_COLORS[love.emotion] ?? "#F59E0B";

    const goNext = () => setCurrentIndex((i) => Math.min(i + 1, loves.length - 1));
    const goPrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 1100,
                background: "rgba(0,0,0,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
            onClick={onClose}
        >
            {/* ✕ ボタン */}
            <div
                role="button"
                style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: WHITE,
                    fontSize: 14,
                    zIndex: 1101,
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            >
                ✕
            </div>

            {/* カード */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 0.92, x: 0 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.18 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => {
                        if (info.offset.x < -50) goNext();
                        else if (info.offset.x > 50) goPrev();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: 300,
                        borderRadius: 20,
                        background: "#12122A",
                        border: `2px solid ${color}50`,
                        overflow: "hidden",
                        cursor: "grab",
                        boxShadow: `0 0 40px ${color}30`,
                        userSelect: "none",
                    }}
                >
                    {/* 写真エリア */}
                    <div
                        style={{
                            height: 280,
                            background: `linear-gradient(135deg, ${color}30, ${color}10)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {love.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={love.photo_url}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                draggable={false}
                            />
                        ) : (
                            <span style={{ fontSize: 64 }}>{emotionDef.emoji}</span>
                        )}
                    </div>

                    {/* 情報エリア */}
                    <div style={{ padding: "12px 16px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 20 }}>{emotionDef.emoji}</span>
                            <span style={{ color, fontWeight: 700, fontSize: 14 }}>{emotionDef.label}</span>
                        </div>
                        <p style={{ color: GRAY, fontSize: 11, marginBottom: 10 }}>
                            {formatDate(love.recorded_at)}
                        </p>

                        {/* 場所名 or 座標 */}
                        <p style={{ color: GRAY, fontSize: 11, marginBottom: 12 }}>
                            📍{" "}
                            {spot.place_name
                                ? spot.place_name
                                : `${spot.lat.toFixed(5)}, ${spot.lng.toFixed(5)}`}
                        </p>

                        {/* ここへいくボタン */}
                        <div
                            role="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(
                                    `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`,
                                    "_blank"
                                );
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "100%",
                                height: 44,
                                borderRadius: 999,
                                background: GOLD,
                                color: "#000",
                                fontWeight: 700,
                                fontSize: 14,
                                cursor: "pointer",
                            }}
                        >
                            🗺️ ここへいく
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* ページインジケーター */}
            {loves.length > 1 && (
                <div
                    style={{
                        position: "absolute",
                        bottom: 40,
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                    }}
                >
                    {loves.map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: i === currentIndex ? 16 : 6,
                                height: 6,
                                borderRadius: 3,
                                background: i === currentIndex ? WHITE : "rgba(255,255,255,0.3)",
                                transition: "width 0.2s",
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

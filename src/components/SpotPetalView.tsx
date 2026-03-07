"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { EMOTIONS, type Emotion } from "@/types";
import { BG_CARD, GOLD, WHITE, GRAY } from "@/constants/colors";
import type { Database } from "@/lib/database.types";

type SpotRow = Database["public"]["Tables"]["spots"]["Row"];

interface SpotPetalViewProps {
    spot: SpotRow | null;
    onClose: () => void;
}

export function SpotPetalView({ spot, onClose }: SpotPetalViewProps) {
    const [showPlaceName, setShowPlaceName] = useState(false);

    if (!spot) return null;

    const emotionKey = spot.primary_emotion as Emotion;
    const emotionDef = EMOTIONS[emotionKey] ?? {
        label: spot.primary_emotion,
        emoji: "✨",
        color: GOLD,
    };

    const handleWantToGo = () => {
        setShowPlaceName(true);
        const url = `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;
        window.open(url, "_blank");
    };

    return (
        <AnimatePresence>
            {spot && (
                <>
                    {/* オーバーレイ */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[1000] bg-black/60"
                    />

                    {/* モーダル本体 */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-[1001] max-h-[80vh] overflow-y-auto rounded-t-3xl"
                        style={{ background: BG_CARD }}
                    >
                        {/* ハンドル */}
                        <div className="flex justify-center pb-2 pt-3">
                            <div
                                className="h-1 w-10 rounded-full"
                                style={{ background: GRAY }}
                            />
                        </div>

                        {/* 閉じるボタン */}
                        <div className="absolute right-4 top-3">
                            <div
                                role="button"
                                onClick={onClose}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-sm"
                                style={{ background: "#ffffff15", color: WHITE }}
                            >
                                ✕
                            </div>
                        </div>

                        <div className="px-5 pb-6">
                            {/* 写真 or グラデーション */}
                            <div
                                className="mb-4 overflow-hidden rounded-2xl"
                                style={{ height: 192 }}
                            >
                                {spot.first_photo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={spot.first_photo_url}
                                        alt="スポットの写真"
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                        }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            background: `linear-gradient(135deg, ${emotionDef.color}40, ${emotionDef.color}10)`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: 48,
                                        }}
                                    >
                                        {emotionDef.emoji}
                                    </div>
                                )}
                            </div>

                            {/* 感情ラベル */}
                            <div className="mb-3 flex items-center gap-2">
                                <span className="text-2xl">{emotionDef.emoji}</span>
                                <span
                                    className="text-base font-bold"
                                    style={{ color: emotionDef.color }}
                                >
                                    {emotionDef.label}
                                </span>
                            </div>

                            {/* love_count */}
                            <p className="mb-4 text-sm" style={{ color: GRAY }}>
                                ✨ {spot.love_count}人が光を灯した場所
                            </p>

                            {/* place_name（行きたいボタンを押した後のみ表示） */}
                            {showPlaceName && spot.place_name && (
                                <motion.p
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-4 text-xs"
                                    style={{ color: GRAY }}
                                >
                                    📍 {spot.place_name}
                                </motion.p>
                            )}

                            {/* 行きたいボタン */}
                            <div
                                role="button"
                                onClick={handleWantToGo}
                                className="flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl text-sm font-bold transition-transform active:scale-95"
                                style={{
                                    background: `linear-gradient(135deg, ${GOLD}, #FBBF24)`,
                                    color: "#000",
                                }}
                            >
                                🗺️ 行きたい
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

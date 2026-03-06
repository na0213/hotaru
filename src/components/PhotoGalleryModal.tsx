"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Database } from "@/lib/database.types";
import { WHITE, GRAY } from "@/constants/colors";

type SpotPhoto = Database["public"]["Tables"]["spot_photos"]["Row"];

interface PhotoGalleryModalProps {
    photos: SpotPhoto[];
    initialIndex: number;
    spot: { lat: number; lng: number; place_name: string | null };
    onClose: () => void;
}

export function PhotoGalleryModal({ photos, initialIndex, spot, onClose }: PhotoGalleryModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    const goTo = (index: number) => {
        if (index >= 0 && index < photos.length) setCurrentIndex(index);
    };

    const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
        if (info.offset.x < -50) goTo(currentIndex + 1);
        else if (info.offset.x > 50) goTo(currentIndex - 1);
    };

    const photo = photos[currentIndex];
    const photoColor = photo.emotion
        ? ({ tanoshii: "#F97316", utsukushii: "#38BDF8", nokoshitai: "#F472B6" }[photo.emotion] ?? "#F59E0B")
        : "#F59E0B";

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 2000,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
            }}
            onClick={onClose}
        >
            {/* 内側: フェードアニメーション層（背景色もここで持つ） */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0, 0, 0, 0.85)",
                }}
            />

            {/* 閉じるボタン */}
            <button
                style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    cursor: "pointer",
                    background: "rgba(255,255,255,0.15)",
                    color: WHITE,
                    zIndex: 1,
                }}
                onClick={(e) => { e.stopPropagation(); onClose(); }}
            >
                ✕
            </button>

            {/* コンテンツ（flexbox 中央配置） */}
            <div
                style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 写真 */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={handleDragEnd}
                        style={{ width: "85vw", maxWidth: 500, borderRadius: 16, overflow: "hidden" }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={photo.photo_url}
                            alt={photo.caption ?? "写真"}
                            style={{
                                width: "100%",
                                aspectRatio: "4/3",
                                borderRadius: 16,
                                display: "block",
                                objectFit: "cover",
                                border: `3px solid ${photoColor}`,
                                boxShadow: `0 0 16px ${photoColor}66`,
                            }}
                        />
                        {photo.caption && (
                            <p className="mt-2 text-center text-sm" style={{ color: WHITE }}>
                                {photo.caption}
                            </p>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* ドットインジケーター */}
                <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                    {photos.map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: i === currentIndex ? 8 : 6,
                                height: i === currentIndex ? 8 : 6,
                                borderRadius: "50%",
                                background: i === currentIndex ? WHITE : GRAY,
                                transition: "all 0.2s",
                            }}
                        />
                    ))}
                </div>

                {/* ここへ行くボタン */}
                <a
                    href={`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        display: "inline-block",
                        marginTop: 16,
                        padding: "10px 24px",
                        background: "rgba(245, 158, 11, 0.9)",
                        color: "#0B1026",
                        borderRadius: 9999,
                        fontSize: 14,
                        fontWeight: 700,
                        textDecoration: "none",
                        boxShadow: "0 0 12px rgba(245, 158, 11, 0.4)",
                    }}
                >
                    ここへ行く
                </a>
            </div>
        </div>
    );
}

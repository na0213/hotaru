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

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] flex flex-col items-center justify-center"
            style={{ background: "rgba(0,0,0,0.85)" }}
            onClick={onClose}
        >
            {/* 閉じるボタン */}
            <button
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-sm"
                style={{ background: "rgba(255,255,255,0.15)", color: WHITE }}
                onClick={onClose}
            >
                ✕
            </button>

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
                    className="overflow-hidden"
                    style={{ width: "85vw", borderRadius: 16 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={photo.photo_url}
                        alt={photo.caption ?? "写真"}
                        style={{ width: "100%", borderRadius: 16, display: "block" }}
                    />
                    {photo.caption && (
                        <p className="mt-2 text-center text-sm" style={{ color: WHITE }}>
                            {photo.caption}
                        </p>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* ドットインジケーター */}
            <div className="mt-4 flex gap-2">
                {photos.map((_, i) => (
                    <div
                        key={i}
                        className="rounded-full transition-all"
                        style={{
                            width: i === currentIndex ? 8 : 6,
                            height: i === currentIndex ? 8 : 6,
                            background: i === currentIndex ? WHITE : GRAY,
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
        </motion.div>
    );
}

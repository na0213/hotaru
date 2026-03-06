"use client";

import { motion } from "framer-motion";
import type { Database } from "@/lib/database.types";
import { GOLD, GRAY } from "@/constants/colors";

type SpotRow = Database["public"]["Tables"]["spots"]["Row"];
type SpotPhoto = Database["public"]["Tables"]["spot_photos"]["Row"];

const EMOTION_COLORS: Record<string, string> = {
    tanoshii: "#F97316",
    utsukushii: "#38BDF8",
    nokoshitai: "#F472B6",
};

interface SpotPhotoBubblesProps {
    spot: SpotRow;
    photos: SpotPhoto[];
    centerPosition: { x: number; y: number };
    onClose: () => void;
    onPhotoClick: (index: number) => void;
}

function getLayout(count: number): { radius: number; indices: number[] }[] {
    if (count <= 3) {
        return [{ radius: 80, indices: Array.from({ length: count }, (_, i) => i) }];
    } else if (count <= 6) {
        return [{ radius: 100, indices: Array.from({ length: count }, (_, i) => i) }];
    } else {
        const half = Math.ceil(count / 2);
        return [
            { radius: 80, indices: Array.from({ length: half }, (_, i) => i) },
            { radius: 140, indices: Array.from({ length: count - half }, (_, i) => i + half) },
        ];
    }
}

export function SpotPhotoBubbles({
    spot,
    photos,
    centerPosition,
    onClose,
    onPhotoClick,
}: SpotPhotoBubblesProps) {
    const color = EMOTION_COLORS[spot.primary_emotion] ?? GOLD;
    const layout = getLayout(photos.length);

    const positioned: { photo: SpotPhoto; x: number; y: number; index: number; delay: number }[] = [];
    let delayIndex = 0;
    for (const ring of layout) {
        const count = ring.indices.length;
        ring.indices.forEach((photoIndex, i) => {
            const angle = (2 * Math.PI * i) / count - Math.PI / 2;
            positioned.push({
                photo: photos[photoIndex],
                x: centerPosition.x + ring.radius * Math.cos(angle),
                y: centerPosition.y + ring.radius * Math.sin(angle),
                index: photoIndex,
                delay: delayIndex * 0.05,
            });
            delayIndex++;
        });
    }

    return (
        <div
            className="fixed inset-0 z-[1000]"
            style={{ backdropFilter: "blur(4px)", background: "rgba(0,0,0,0.5)" }}
            onClick={onClose}
        >
            {/* 中心ラベル */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="pointer-events-none absolute flex flex-col items-center"
                style={{
                    left: centerPosition.x,
                    top: centerPosition.y,
                    transform: "translate(-50%, -50%)",
                }}
            >
                <span className="text-xs font-bold drop-shadow" style={{ color: GOLD }}>
                    {spot.place_name ?? "スポット"}
                </span>
                <span className="text-xs" style={{ color: GRAY }}>
                    ✨ {spot.love_count}
                </span>
            </motion.div>

            {/* 写真0枚フォールバック */}
            {photos.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute flex h-16 w-16 items-center justify-center rounded-full text-xs"
                    style={{
                        left: centerPosition.x,
                        top: centerPosition.y - 80,
                        transform: "translate(-50%, -50%)",
                        background: "#1A1A35",
                        border: `2px solid ${color}`,
                        color: GRAY,
                    }}
                >
                    写真なし
                </motion.div>
            ) : null}

            {/* 写真バブル */}
            {positioned.map(({ photo, x, y, index, delay }) => {
                const photoColor = photo.emotion
                    ? (EMOTION_COLORS[photo.emotion] ?? "#F59E0B")
                    : "#F59E0B";
                return (
                <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay, type: "spring", stiffness: 400, damping: 20 }}
                    className="absolute cursor-pointer overflow-hidden"
                    style={{
                        left: x,
                        top: y,
                        width: 55,
                        height: 55,
                        borderRadius: "50%",
                        transform: "translate(-50%, -50%)",
                        border: `2px solid ${photoColor}`,
                        boxShadow: `0 0 12px ${photoColor}88, 0 0 24px ${photoColor}44`,
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onPhotoClick(index);
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={photo.photo_url}
                        alt={photo.caption ?? "スポットの写真"}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                </motion.div>
                );
            })}
        </div>
    );
}

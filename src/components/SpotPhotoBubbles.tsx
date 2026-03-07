"use client";

import { motion } from "framer-motion";
import type { Database } from "@/lib/database.types";
import { GOLD, GRAY } from "@/constants/colors";

type LoveRow = Database["public"]["Tables"]["loves"]["Row"];
type SpotRow = Database["public"]["Tables"]["spots"]["Row"];

const EMOTION_COLORS: Record<string, string> = {
    tanoshii: "#F97316",
    utsukushii: "#38BDF8",
    nokoshitai: "#F472B6",
};

interface Props {
    spot: SpotRow;
    loves: LoveRow[];
    centerPosition: { x: number; y: number };
    onClose: () => void;
    onPhotoClick: (index: number) => void;
}

export function SpotPhotoBubbles({ spot, loves, centerPosition, onClose, onPhotoClick }: Props) {
    const RADIUS = 80;
    const count = loves.length;

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

            {/* 写真バブル */}
            {loves.map((love, i) => {
                const angle = count > 0 ? (2 * Math.PI * i) / count - Math.PI / 2 : 0;
                const x = centerPosition.x + RADIUS * Math.cos(angle);
                const y = centerPosition.y + RADIUS * Math.sin(angle);
                const color = EMOTION_COLORS[love.emotion] ?? GOLD;

                return (
                    <motion.div
                        key={love.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.05, type: "spring", stiffness: 400, damping: 20 }}
                        className="absolute cursor-pointer overflow-hidden"
                        style={{
                            left: x,
                            top: y,
                            width: 50,
                            height: 50,
                            borderRadius: "50%",
                            transform: "translate(-50%, -50%)",
                            border: `2px solid ${color}`,
                            boxShadow: `0 0 10px ${color}88, 0 0 20px ${color}44`,
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onPhotoClick(i);
                        }}
                    >
                        {love.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={love.photo_url}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                        ) : (
                            <div style={{ width: "100%", height: "100%", background: color }} />
                        )}
                    </motion.div>
                );
            })}

            {/* 写真なしフォールバック */}
            {count === 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute flex items-center justify-center rounded-full text-lg"
                    style={{
                        left: centerPosition.x,
                        top: centerPosition.y - 80,
                        width: 50,
                        height: 50,
                        transform: "translate(-50%, -50%)",
                        background: "#1A1A35",
                        border: `2px solid ${GOLD}`,
                        color: GRAY,
                    }}
                >
                    📷
                </motion.div>
            )}
        </div>
    );
}

"use client";

import { motion } from "framer-motion";
import { EMOTIONS, type Emotion } from "@/types";
import { GOLD, WHITE, GRAY } from "@/constants/colors";
import type { Database } from "@/lib/database.types";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];

/** 感情カラー */
const EMOTION_COLORS: Record<Emotion, string> = {
    tanoshii: "#F97316",
    utsukushii: "#38BDF8",
    nokoshitai: "#F472B6",
};

interface TripSummaryModalProps {
    trip: TripRow;
    onClose: () => void;
}

export function TripSummaryModal({ trip, onClose }: TripSummaryModalProps) {
    const counts: { key: Emotion; count: number }[] = [
        { key: "tanoshii", count: trip.tanoshii_count },
        { key: "utsukushii", count: trip.utsukushii_count },
        { key: "nokoshitai", count: trip.nokoshitai_count },
    ];

    const total = counts.reduce((s, c) => s + c.count, 0);
    const maxCount = Math.max(...counts.map((c) => c.count));

    // 最多感情の色（蛍の色）
    const topEmotion = counts.find((c) => c.count === maxCount && maxCount > 0);
    const fireflyColor =
        total === 0 || !topEmotion || counts.filter((c) => c.count === maxCount).length > 1
            ? GOLD
            : EMOTION_COLORS[topEmotion.key];

    // 最も多い感情のメッセージ
    const getMessage = (): string => {
        if (total === 0) return "素敵な旅でしたね。";
        const topEmotions = counts.filter((c) => c.count === maxCount);
        if (topEmotions.length > 1) return "素敵な旅でしたね。";
        switch (topEmotions[0].key) {
            case "tanoshii":
                return "笑顔あふれる旅でしたね。";
            case "utsukushii":
                return "美しさに出会えた旅でしたね。";
            case "nokoshitai":
                return "大切な場所に出会えた旅でしたね。";
        }
    };

    // 円のサイズ（40〜80px、count=0は40px）
    const getRadius = (count: number): number => {
        if (maxCount === 0) return 40;
        return 40 + (count / maxCount) * 40;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[3000] flex flex-col items-center justify-center px-6"
            style={{ background: "#0B1026" }}
        >
            {/* タイトル */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-2 text-center"
            >
                <p className="text-xs" style={{ color: GRAY }}>
                    今回の旅
                </p>
                <h1
                    className="mt-1 text-2xl font-bold"
                    style={{ color: GOLD }}
                >
                    {trip.title || "無題の旅"}
                </h1>
            </motion.div>

            {/* 感情の円 */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="my-8 flex items-center justify-center gap-5"
            >
                {counts.map(({ key, count }) => {
                    const r = getRadius(count);
                    const color = EMOTION_COLORS[key];
                    const emo = EMOTIONS[key];

                    return (
                        <div
                            key={key}
                            className="flex flex-col items-center gap-2"
                        >
                            <div
                                className="flex items-center justify-center rounded-full"
                                style={{
                                    width: r,
                                    height: r,
                                    background: `${color}30`,
                                    border: `2px solid ${color}`,
                                    opacity: count === 0 ? 0.3 : 1,
                                    transition: "all 0.3s",
                                }}
                            >
                                <span className="text-lg">{emo.emoji}</span>
                            </div>
                            <span
                                className="text-[10px] font-medium"
                                style={{ color, opacity: count === 0 ? 0.3 : 1 }}
                            >
                                {emo.label}
                            </span>
                            <span
                                className="text-sm font-bold"
                                style={{ color: WHITE, opacity: count === 0 ? 0.3 : 1 }}
                            >
                                × {count}
                            </span>
                        </div>
                    );
                })}
            </motion.div>

            {/* 蛍が生まれる瞬間 */}
            <motion.div
                className="relative mb-4 flex flex-col items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0, y: 0 }}
                    animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.5, 1, 0.5], y: -150 }}
                    transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: fireflyColor,
                        boxShadow: `0 0 16px ${fireflyColor}, 0 0 32px ${fireflyColor}60`,
                    }}
                />
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.8 }}
                    className="text-xs mt-1"
                    style={{ color: fireflyColor }}
                >
                    新しい蛍が森に帰りました
                </motion.p>
            </motion.div>

            {/* メッセージ */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mb-10 text-center"
            >
                <p
                    className="text-base font-medium"
                    style={{ color: WHITE }}
                >
                    {getMessage()}
                </p>
                <p
                    className="mt-3 text-xs leading-relaxed"
                    style={{ color: GRAY }}
                >
                    おつかれさまでした。
                    <br />
                    あなたの愛は、次の旅人を照らします。
                </p>
            </motion.div>

            {/* おわるボタン */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.1 }}
            >
                <div
                    role="button"
                    onClick={onClose}
                    className="cursor-pointer rounded-full px-8 py-2.5 text-sm font-medium transition-transform active:scale-95"
                    style={{
                        color: GRAY,
                        border: `1px solid ${GRAY}40`,
                    }}
                >
                    おわる
                </div>
            </motion.div>
        </motion.div>
    );
}

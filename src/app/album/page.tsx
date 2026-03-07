"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { getUserId } from "@/lib/userId";
import { getCurrentTripId } from "@/lib/tripSession";
import { EMOTIONS, type Emotion } from "@/types";
import { BG, BG_CARD, GOLD, WHITE, GRAY, ORANGE, BLUE, PINK } from "@/constants/colors";
import type { Database } from "@/lib/database.types";
import { CardDetailModal, type LoveWithSpot } from "@/components/CardDetailModal";
import { EmotionBar } from "@/components/EmotionBar";
import { FireflyForest } from "@/components/FireflyForest";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];

const EMOTION_COLORS: Record<Emotion, string> = {
    tanoshii: ORANGE,
    utsukushii: BLUE,
    nokoshitai: PINK,
};

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/* ── カード ── */
function LoveCard({ love, onTap }: { love: LoveWithSpot; onTap: () => void }) {
    const emotion = love.emotion as Emotion;
    const emo = EMOTIONS[emotion] ?? EMOTIONS.tanoshii;
    const color = EMOTION_COLORS[emotion] ?? EMOTION_COLORS.tanoshii;

    return (
        <motion.div
            role="button"
            onClick={onTap}
            whileTap={{ scale: 1.05 }}
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex-none cursor-pointer rounded-2xl overflow-hidden"
            style={{
                width: 160,
                height: 220,
                background: BG_CARD,
                boxShadow: `0 0 12px rgba(${color === ORANGE ? "249,115,22" : color === BLUE ? "56,189,248" : "244,114,182"}, 0.3)`,
                border: `2px solid rgba(${color === ORANGE ? "249,115,22" : color === BLUE ? "56,189,248" : "244,114,182"}, 0.7)`,
            }}
        >
            {/* 写真エリア（上130px） */}
            <div
                className="flex items-center justify-center overflow-hidden"
                style={{
                    height: 130,
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
                    <span className="text-4xl">🌟</span>
                )}
            </div>

            {/* 情報エリア（下90px） */}
            <div className="px-3 py-2" style={{ height: 90 }}>
                <span
                    className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1"
                    style={{ background: `${color}20`, color }}
                >
                    {emo.emoji} {emo.label}
                </span>
                {love.spots?.place_name && (
                    <p
                        className="text-[11px] leading-tight line-clamp-2"
                        style={{ color: GRAY }}
                    >
                        📍 {love.spots.place_name}
                    </p>
                )}
            </div>
        </motion.div>
    );
}

/* ── 旅セクション ── */
function TripSection({
    trip,
    loves,
    onCardTap,
}: {
    trip: TripRow;
    loves: LoveWithSpot[];
    onCardTap: (love: LoveWithSpot) => void;
}) {
    return (
        <div id={`trip-${trip.id}`} className="mb-8">
            <div className="px-6 mb-3">
                <h2 className="text-base font-bold" style={{ color: WHITE }}>
                    {trip.title || "無題の旅"}
                </h2>
                <p className="text-xs mt-1" style={{ color: GRAY }}>
                    {formatDate(trip.start_time)}
                </p>
                <div style={{ margin: "6px 0", width: "60%" }}>
                    <EmotionBar
                        tanoshii={trip.tanoshii_count}
                        utsukushii={trip.utsukushii_count}
                        nokoshitai={trip.nokoshitai_count}
                    />
                </div>
            </div>

            <div className="flex gap-3 overflow-x-auto px-6 pb-2 [&::-webkit-scrollbar]:hidden">
                {loves.length === 0 ? (
                    <p className="text-xs py-2" style={{ color: GRAY }}>
                        まだ記録がありません
                    </p>
                ) : (
                    loves.map((love) => (
                        <LoveCard key={love.id} love={love} onTap={() => onCardTap(love)} />
                    ))
                )}
            </div>
        </div>
    );
}

/* ── メインページ ── */
export default function AlbumPage() {
    const router = useRouter();
    const [trips, setTrips] = useState<TripRow[]>([]);
    const [lovesByTrip, setLovesByTrip] = useState<Record<string, LoveWithSpot[]>>({});
    const [activeTripId, setActiveTripId] = useState<string | null>(null);
    const [selectedLove, setSelectedLove] = useState<LoveWithSpot | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        const userId = getUserId();
        const currentTripId = getCurrentTripId();
        setActiveTripId(currentTripId);

        const [{ data: tripsData }, { data: lovesData }] = await Promise.all([
            supabase
                .from("trips")
                .select("*")
                .eq("user_id", userId)
                .not("end_time", "is", null)
                .order("start_time", { ascending: false }),
            supabase
                .from("loves")
                .select("*, spots(*)")
                .eq("user_id", userId)
                .order("recorded_at", { ascending: false }),
        ]);

        const loves = (lovesData ?? []) as LoveWithSpot[];
        const grouped = loves.reduce((acc, love) => {
            const key = love.trip_id;
            if (!acc[key]) acc[key] = [];
            acc[key].push(love);
            return acc;
        }, {} as Record<string, LoveWithSpot[]>);

        setTrips(tripsData ?? []);
        setLovesByTrip(grouped);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleEmotionChange = useCallback(
        async (love: LoveWithSpot, newEmotion: Emotion) => {
            const oldEmotion = love.emotion as Emotion;
            const { spot_id: spotId, trip_id: tripId } = love;

            await supabase.from("loves").update({ emotion: newEmotion }).eq("id", love.id);

            await Promise.all([
                supabase.rpc("decrement_emotion", { p_spot_id: spotId, p_emotion: oldEmotion }),
                supabase.rpc("increment_emotion", { p_spot_id: spotId, p_emotion: newEmotion }),
            ]);

            // tripsテーブルの感情カウントを再計算
            const { data: allLoves } = await supabase
                .from("loves")
                .select("emotion")
                .eq("trip_id", tripId);

            if (allLoves) {
                await supabase
                    .from("trips")
                    .update({
                        tanoshii_count: allLoves.filter((l) => l.emotion === "tanoshii").length,
                        utsukushii_count: allLoves.filter((l) => l.emotion === "utsukushii").length,
                        nokoshitai_count: allLoves.filter((l) => l.emotion === "nokoshitai").length,
                    })
                    .eq("id", tripId);
            }

            await fetchData();
            setSelectedLove((prev) =>
                prev?.id === love.id ? { ...prev, emotion: newEmotion } : prev
            );
        },
        [fetchData]
    );

    const totalLoves = Object.values(lovesByTrip).reduce((s, ls) => s + ls.length, 0);
    const activeLoves = activeTripId ? (lovesByTrip[activeTripId] ?? []) : [];


    if (loading) {
        return (
            <div
                className="flex min-h-dvh items-center justify-center"
                style={{ background: BG }}
            >
                <p className="text-sm" style={{ color: GRAY }}>
                    読み込み中...
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-dvh pb-16" style={{ background: BG }}>
            {/* ヘッダー */}
            <div
                className="sticky top-0 z-10 px-6 pt-12 pb-4"
                style={{ background: `${BG}ee` }}
            >
                <button
                    onClick={() => router.back()}
                    className="mb-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
                    style={{
                        color: GRAY,
                        background: "rgba(255,255,255,0.06)",
                        border: `1px solid rgba(255,255,255,0.1)`,
                        backdropFilter: "blur(8px)",
                    }}
                >
                    🏠 ホーム
                </button>

                <h1 className="text-xl font-bold" style={{ color: GOLD }}>
                    カードアルバム
                </h1>
                <p className="text-xs mt-1" style={{ color: GRAY }}>
                    {totalLoves}箇所に光を灯しました
                </p>
            </div>

            {/* 蛍の森 */}
            {trips.length > 0 && (
                <div className="px-6 mb-6">
                    <p className="text-sm font-bold mb-3" style={{ color: GOLD }}>
                        旅から生まれた蛍たち
                    </p>
                    <FireflyForest trips={trips} />
                </div>
            )}

            {/* 旅の記録中セクション */}
            {activeTripId && (
                <div className="mb-8">
                    <div className="px-6 mb-3">
                        <span
                            className="inline-block text-xs font-bold px-3 py-1 rounded-full"
                            style={{ background: `${GOLD}20`, color: GOLD }}
                        >
                            🌟 旅の記録中...
                        </span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto px-6 pb-2 [&::-webkit-scrollbar]:hidden">
                        {activeLoves.length === 0 ? (
                            <p className="text-xs py-2" style={{ color: GRAY }}>
                                まだ記録がありません
                            </p>
                        ) : (
                            activeLoves.map((love) => (
                                <LoveCard
                                    key={love.id}
                                    love={love}
                                    onTap={() => setSelectedLove(love)}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* 完了した旅セクション */}
            {trips.length === 0 && !activeTripId ? (
                <div className="flex flex-col items-center justify-center py-20 px-6">
                    <p className="text-4xl mb-4">🌟</p>
                    <p className="text-sm text-center" style={{ color: GRAY }}>
                        まだ旅の記録がありません。
                        <br />
                        旅をはじめて、愛を灯しましょう。
                    </p>
                </div>
            ) : (
                trips.map((trip) => (
                    <TripSection
                        key={trip.id}
                        trip={trip}
                        loves={lovesByTrip[trip.id] ?? []}
                        onCardTap={setSelectedLove}
                    />
                ))
            )}

            {/* カード詳細モーダル */}
            <AnimatePresence>
                {selectedLove && (
                    <CardDetailModal
                        love={selectedLove}
                        onClose={() => setSelectedLove(null)}
                        onEmotionChange={handleEmotionChange}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

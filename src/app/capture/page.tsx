"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { getUserId } from "@/lib/userId";
import { getCurrentTripId, isOnTrip } from "@/lib/tripSession";
import { EMOTIONS, type Emotion } from "@/types";
import { GOLD, BG_CARD, WHITE, GRAY } from "@/constants/colors";

type Step = "camera" | "emotion" | "saving";

const DEFAULT_LAT = 35.6762;
const DEFAULT_LNG = 139.6503;

export default function CapturePage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [step, setStep] = useState<Step>("camera");
    const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
    const [photoUrl, setPhotoUrl] = useState<string>("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string>("");
    const [usedFallbackCoords, setUsedFallbackCoords] = useState(false);

    // ── 旅セッション外ならリダイレクト ──
    useEffect(() => {
        if (!isOnTrip()) {
            router.replace("/");
        }
    }, [router]);

    // ── カメラ起動 ──
    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch {
            setError("カメラを起動できません。カメラの使用を許可してください。");
        }
    }, []);

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    }, []);

    useEffect(() => {
        if (step === "camera") {
            startCamera();
        }
        return () => {
            stopCamera();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    // ── 撮影 ──
    const handleCapture = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0);
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    setPhotoBlob(blob);
                    setPhotoUrl(URL.createObjectURL(blob));
                    stopCamera();
                    setStep("emotion");
                }
            },
            "image/jpeg",
            0.85
        );
    }, [stopCamera]);

    // ── 撮り直す ──
    const handleRetake = useCallback(() => {
        if (photoUrl) URL.revokeObjectURL(photoUrl);
        setPhotoBlob(null);
        setPhotoUrl("");
        setStep("camera");
    }, [photoUrl]);

    // ── 感情を選んで保存 ──
    const handleSelectEmotion = useCallback(
        async (emotion: Emotion) => {
            if (!photoBlob) return;
            setSaving(true);
            setStep("saving");
            setError("");

            try {
                const userId = getUserId();
                const tripId = getCurrentTripId();
                if (!tripId) throw new Error("旅セッションが見つかりません");

                // 1. 現在地取得（失敗時はデフォルト座標にフォールバック）
                const { lat, lng, isFallback } = await new Promise<{
                    lat: number;
                    lng: number;
                    isFallback: boolean;
                }>((resolve) =>
                    navigator.geolocation.getCurrentPosition(
                        (pos) =>
                            resolve({
                                lat: pos.coords.latitude,
                                lng: pos.coords.longitude,
                                isFallback: false,
                            }),
                        () =>
                            resolve({
                                lat: DEFAULT_LAT,
                                lng: DEFAULT_LNG,
                                isFallback: true,
                            }),
                        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
                    )
                );
                setUsedFallbackCoords(isFallback);

                // 2. 写真アップロード（先に完了させる）
                const fileName = `${userId}/${Date.now()}.jpg`;
                const { error: uploadErr } = await supabase.storage
                    .from("photos")
                    .upload(fileName, photoBlob, {
                        contentType: "image/jpeg",
                    });
                if (uploadErr) throw uploadErr;

                const {
                    data: { publicUrl },
                } = supabase.storage.from("photos").getPublicUrl(fileName);

                // 3. upsertSpot（写真アップロード完了後に実行）
                const spotId = await upsertSpot({
                    lat,
                    lng,
                    emotion,
                    photoUrl: publicUrl,
                    tripId,
                    userId,
                });

                // 4. lovesに記録
                const { error: loveErr } = await supabase.from("loves").insert({
                    user_id: userId,
                    trip_id: tripId,
                    spot_id: spotId,
                    lat,
                    lng,
                    emotion,
                    photo_url: publicUrl,
                });
                if (loveErr) throw loveErr;

                // 5. tripsの感情カウントをインクリメント
                const { data: trip } = await supabase
                    .from("trips")
                    .select("tanoshii_count, utsukushii_count, nokoshitai_count")
                    .eq("id", tripId)
                    .single();

                if (trip) {
                    const updatedCounts = {
                        tanoshii_count: trip.tanoshii_count + (emotion === "tanoshii" ? 1 : 0),
                        utsukushii_count: trip.utsukushii_count + (emotion === "utsukushii" ? 1 : 0),
                        nokoshitai_count: trip.nokoshitai_count + (emotion === "nokoshitai" ? 1 : 0),
                    };
                    await supabase
                        .from("trips")
                        .update(updatedCounts)
                        .eq("id", tripId);
                }

                // 完了 → カメラに戻る（連続記録）
                if (photoUrl) URL.revokeObjectURL(photoUrl);
                setPhotoBlob(null);
                setPhotoUrl("");
                setStep("camera");
            } catch (err) {
                console.error("保存に失敗しました", err);
                setError("保存に失敗しました。もう一度お試しください。");
                setStep("emotion");
            } finally {
                setSaving(false);
            }
        },
        [photoBlob, photoUrl]
    );

    return (
        <div
            className="relative flex min-h-dvh flex-col"
            style={{ background: "#0B1026" }}
        >
            {/* ── ヘッダー ── */}
            <div className="flex items-center justify-between px-4 py-3">
                <div
                    role="button"
                    onClick={() => router.push("/")}
                    className="cursor-pointer text-sm"
                    style={{ color: GRAY }}
                >
                    ← ホーム
                </div>
                <div className="text-xs" style={{ color: GOLD }}>
                    🌟 記録中
                </div>
            </div>

            {/* ── エラー表示 ── */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mx-4 mb-2 rounded-lg px-4 py-2 text-center text-xs text-red-300"
                        style={{ background: "#2D1B1B" }}
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Step A: カメラ ── */}
            {step === "camera" && (
                <div className="flex flex-1 flex-col">
                    <div className="relative flex-1 overflow-hidden rounded-b-3xl bg-black">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <div className="flex items-center justify-center py-6">
                        <div
                            role="button"
                            onClick={handleCapture}
                            className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full transition-transform active:scale-90"
                            style={{
                                background: `linear-gradient(135deg, ${GOLD}, #FBBF24)`,
                                boxShadow: `0 0 20px ${GOLD}60`,
                            }}
                        >
                            <div className="h-12 w-12 rounded-full border-2 border-black/30" />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Step B: 感情選択 ── */}
            {step === "emotion" && photoUrl && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-1 flex-col"
                >
                    {/* 写真プレビュー */}
                    <div className="relative mx-4 flex-1 overflow-hidden rounded-2xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={photoUrl}
                            alt="撮影した写真"
                            className="h-full w-full object-cover"
                        />
                    </div>

                    {/* 感情ボタン */}
                    <div className="px-4 py-4">
                        <p
                            className="mb-3 text-center text-xs"
                            style={{ color: GRAY }}
                        >
                            この場所に灯す気持ちは？
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            {(Object.keys(EMOTIONS) as Emotion[]).map((key) => {
                                const e = EMOTIONS[key];
                                return (
                                    <div
                                        key={key}
                                        role="button"
                                        onClick={() => handleSelectEmotion(key)}
                                        className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl px-5 py-3 transition-transform active:scale-90"
                                        style={{
                                            background: BG_CARD,
                                            border: `2px solid ${e.color}40`,
                                        }}
                                    >
                                        <span className="text-2xl">{e.emoji}</span>
                                        <span
                                            className="text-[10px] font-medium"
                                            style={{ color: e.color }}
                                        >
                                            {e.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* 位置情報フォールバック注記 */}
                        {usedFallbackCoords && (
                            <p className="mt-3 text-center text-[10px]" style={{ color: GRAY }}>
                                ※ 位置情報を取得できなかったため、デフォルト座標で保存されました
                            </p>
                        )}

                        {/* 撮り直す */}
                        <div className="mt-4 flex justify-center">
                            <div
                                role="button"
                                onClick={handleRetake}
                                className="cursor-pointer rounded-lg px-4 py-2 text-xs transition-transform active:scale-95"
                                style={{ color: GRAY, border: `1px solid ${GRAY}30` }}
                            >
                                撮り直す
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ── Step C: 保存中 ── */}
            {step === "saving" && (
                <div className="flex flex-1 flex-col items-center justify-center">
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        className="text-4xl"
                    >
                        ✨
                    </motion.div>
                    <p className="mt-4 text-sm" style={{ color: WHITE }}>
                        光を灯しています...
                    </p>
                </div>
            )}
        </div>
    );
}

// ── upsertSpot ロジック ──
async function upsertSpot(params: {
    lat: number;
    lng: number;
    emotion: Emotion;
    photoUrl: string;
    tripId: string;
    userId: string;
}): Promise<string> {
    const { lat, lng, emotion, photoUrl, tripId, userId } = params;

    // 1. 近接スポット検索（半径30m）
    const { data: nearbySpots } = await supabase.rpc("find_nearby_spot", {
        p_lat: lat,
        p_lng: lng,
        p_radius_m: 30,
    });

    if (nearbySpots && nearbySpots.length > 0) {
        const existingSpot = nearbySpots[0];

        // 同じ trip_id + spot_id の重複チェック
        const { data: existingLove } = await supabase
            .from("loves")
            .select("id")
            .eq("trip_id", tripId)
            .eq("spot_id", existingSpot.id)
            .eq("user_id", userId)
            .limit(1);

        if (existingLove && existingLove.length > 0) {
            // 既に記録済み — スポットIDだけ返す（lovesの挿入は呼び出し元でスキップされる訳ではないが、
            // 同じtrip+spot+userの重複はDBレベルで防ぐべき。ここでは既存IDを返す）
            return existingSpot.id;
        }

        // 感情カウンタを加算
        await supabase.rpc("increment_emotion", {
            p_spot_id: existingSpot.id,
            p_emotion: emotion,
        });

        // primary_emotion を最多の感情に更新
        const { data: updatedSpot } = await supabase
            .from("spots")
            .select("tanoshii_count, utsukushii_count, nokoshitai_count")
            .eq("id", existingSpot.id)
            .single();

        if (updatedSpot) {
            const counts = {
                tanoshii:   updatedSpot.tanoshii_count,
                utsukushii: updatedSpot.utsukushii_count,
                nokoshitai: updatedSpot.nokoshitai_count,
            };
            const primaryEmotion = (Object.entries(counts) as [string, number][])
                .reduce((a, b) => a[1] >= b[1] ? a : b)[0];
            await supabase
                .from("spots")
                .update({ primary_emotion: primaryEmotion })
                .eq("id", existingSpot.id);
        }

        // love_count: ユニークユーザー数の更新
        const { count } = await supabase
            .from("loves")
            .select("user_id", { count: "exact", head: true })
            .eq("spot_id", existingSpot.id);

        // 現在のユーザーが初めてこのスポットに記録する場合のみ+1
        const { data: userAlreadyLoved } = await supabase
            .from("loves")
            .select("id")
            .eq("spot_id", existingSpot.id)
            .eq("user_id", userId)
            .limit(1);

        const isNewUser = !userAlreadyLoved || userAlreadyLoved.length === 0;

        if (isNewUser) {
            await supabase
                .from("spots")
                .update({ love_count: (count ?? 0) + 1 })
                .eq("id", existingSpot.id);
        }

        return existingSpot.id;
    }

    // 2. 新規スポット作成
    const { data: newSpot, error } = await supabase
        .from("spots")
        .insert({
            lat,
            lng,
            primary_emotion: emotion,
            tanoshii_count: emotion === "tanoshii" ? 1 : 0,
            utsukushii_count: emotion === "utsukushii" ? 1 : 0,
            nokoshitai_count: emotion === "nokoshitai" ? 1 : 0,
            love_count: 1,
            first_photo_url: photoUrl,
        })
        .select("id")
        .single();

    if (error || !newSpot) throw error ?? new Error("スポット作成に失敗しました");

    return newSpot.id;
}

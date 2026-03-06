"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { subscribePush, unsubscribePush } from "@/lib/pushSubscription";
import { startNearbyWatch, stopNearbyWatch } from "@/lib/nearbyCheck";
import { BG, GOLD, WHITE, GRAY, BG_CARD, ORANGE, BLUE, PINK } from "@/constants/colors";

type Emotion = "tanoshii" | "utsukushii" | "nokoshitai";

const EMOTION_OPTIONS: { key: Emotion; emoji: string; label: string; color: string }[] = [
    { key: "tanoshii",   emoji: "😆", label: "たのしい",   color: ORANGE },
    { key: "utsukushii", emoji: "✨", label: "うつくしい", color: BLUE },
    { key: "nokoshitai", emoji: "💛", label: "のこしたい", color: PINK },
];

export default function SettingsPage() {
    const router = useRouter();
    const [enabled, setEnabled] = useState(false);
    const [selectedEmotions, setSelectedEmotions] = useState<Emotion[]>([
        "tanoshii", "utsukushii", "nokoshitai",
    ]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    // 初期状態をlocalStorageから復元
    useEffect(() => {
        const saved = localStorage.getItem("hotaru_push_enabled");
        if (saved !== null) {
            setEnabled(saved === "true");
        } else if ("Notification" in window && Notification.permission === "granted") {
            setEnabled(true);
            localStorage.setItem("hotaru_push_enabled", "true");
        }

        const savedEmotions = localStorage.getItem("hotaru_notify_emotions");
        if (savedEmotions) {
            try {
                setSelectedEmotions(JSON.parse(savedEmotions));
            } catch {}
        }
    }, []);

    // enabled 変化時に nearbyWatch を開始/停止
    useEffect(() => {
        if (enabled) {
            startNearbyWatch();
        } else {
            stopNearbyWatch();
        }
    }, [enabled]);

    const handleToggle = async () => {
        if (loading) return;
        setLoading(true);
        setMessage(null);

        try {
            if (!enabled) {
                // ON にする
                if (!("Notification" in window)) {
                    setMessage("このブラウザは通知に対応していません");
                    return;
                }
                const permission = await Notification.requestPermission();
                if (permission !== "granted") {
                    setMessage("通知が許可されませんでした");
                    return;
                }
                await subscribePush();
                localStorage.setItem("hotaru_push_enabled", "true");
                setEnabled(true);
                setMessage("通知をONにしました");
            } else {
                // OFF にする
                await unsubscribePush();
                localStorage.setItem("hotaru_push_enabled", "false");
                setEnabled(false);
                setMessage("通知をOFFにしました");
            }
        } catch (e) {
            console.error(e);
            setMessage("エラーが発生しました。PWAとしてホーム画面から開いてください。");
        } finally {
            setLoading(false);
        }
    };

    const toggleEmotion = (key: Emotion) => {
        setSelectedEmotions((prev) => {
            const next = prev.includes(key)
                ? prev.filter((e) => e !== key)
                : [...prev, key];
            localStorage.setItem("hotaru_notify_emotions", JSON.stringify(next));
            return next;
        });
    };

    return (
        <div className="min-h-dvh pb-16" style={{ background: BG }}>
            {/* ヘッダー */}
            <div className="px-6 pt-12 pb-4">
                <div
                    role="button"
                    onClick={() => router.back()}
                    className="mb-4 text-xs cursor-pointer"
                    style={{ color: GRAY }}
                >
                    ← 戻る
                </div>
                <h1 className="text-xl font-bold" style={{ color: GOLD }}>
                    ⚙️ 設定
                </h1>
            </div>

            <div className="px-6 space-y-6">
                {/* 通知トグル */}
                <div
                    className="rounded-2xl p-5"
                    style={{ background: BG_CARD, border: `1px solid ${GRAY}20` }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold" style={{ color: WHITE }}>
                                近くに蛍がいるよ通知
                            </p>
                            <p className="text-xs mt-1" style={{ color: GRAY }}>
                                半径100m以内にスポットがあると通知
                            </p>
                        </div>

                        {/* トグルスイッチ（div.onClick、input不使用） */}
                        <div
                            role="button"
                            onClick={handleToggle}
                            className="cursor-pointer flex-none"
                            style={{
                                width: 52,
                                height: 30,
                                borderRadius: 9999,
                                background: enabled ? GOLD : `${GRAY}40`,
                                position: "relative",
                                transition: "background 0.2s",
                                opacity: loading ? 0.6 : 1,
                            }}
                        >
                            <div
                                style={{
                                    position: "absolute",
                                    top: 3,
                                    left: enabled ? 24 : 3,
                                    width: 24,
                                    height: 24,
                                    borderRadius: "50%",
                                    background: WHITE,
                                    transition: "left 0.2s",
                                    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                                }}
                            />
                        </div>
                    </div>

                    {message && (
                        <p
                            className="text-xs mt-3"
                            style={{ color: message.includes("エラー") || message.includes("許可") ? "#F87171" : GOLD }}
                        >
                            {message}
                        </p>
                    )}
                </div>

                {/* 感情カテゴリ選択 */}
                <div
                    className="rounded-2xl p-5"
                    style={{
                        background: BG_CARD,
                        border: `1px solid ${GRAY}20`,
                        opacity: enabled ? 1 : 0.4,
                        pointerEvents: enabled ? "auto" : "none",
                    }}
                >
                    <p className="text-sm font-bold mb-3" style={{ color: WHITE }}>
                        通知する感情カテゴリ
                    </p>
                    <div className="flex gap-3 flex-wrap">
                        {EMOTION_OPTIONS.map(({ key, emoji, label, color }) => {
                            const isSelected = selectedEmotions.includes(key);
                            return (
                                <div
                                    key={key}
                                    role="button"
                                    onClick={() => toggleEmotion(key)}
                                    className="flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all"
                                    style={{
                                        background: isSelected ? `${color}25` : "transparent",
                                        border: `1px solid ${isSelected ? color : GRAY + "40"}`,
                                        color: isSelected ? color : GRAY,
                                    }}
                                >
                                    <span>{emoji}</span>
                                    <span>{label}</span>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-xs mt-3" style={{ color: GRAY }}>
                        選択した感情のスポットが近くにある時のみ通知します
                    </p>
                </div>

                {/* 注意書き */}
                <p className="text-xs text-center" style={{ color: GRAY }}>
                    通知はPWA（ホーム画面追加後）でのみ動作します
                </p>
            </div>
        </div>
    );
}

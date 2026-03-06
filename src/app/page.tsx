"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { getUserId } from "@/lib/userId";
import {
  isOnTrip,
  getCurrentTripId,
  startTrip,
  endTrip,
} from "@/lib/tripSession";
import { GOLD, BG_CARD, WHITE, GRAY } from "@/constants/colors";
import { TitleInputModal } from "@/components/TitleInputModal";
import { TripSummaryModal } from "@/components/TripSummaryModal";
import type { Database } from "@/lib/database.types";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];

export default function Home() {
  const router = useRouter();
  const [onTrip, setOnTrip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState<TripRow | null>(null);

  useEffect(() => {
    setOnTrip(isOnTrip());
  }, []);

  // ── 旅をはじめる ──
  const handleStartTrip = useCallback(async () => {
    setLoading(true);
    try {
      const userId = getUserId();
      const { data, error } = await supabase
        .from("trips")
        .insert({ user_id: userId })
        .select("id")
        .single();

      if (error) throw error;
      startTrip(data.id);
      setOnTrip(true);
    } catch (err) {
      console.error("旅の開始に失敗しました", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 旅をおわる → タイトル入力モーダルを表示 ──
  const handleEndTrip = useCallback(() => {
    setShowTitleModal(true);
  }, []);

  // ── タイトル確定 → Supabase更新 → サマリーモーダル ──
  const handleTitleConfirm = useCallback(async (title: string) => {
    setLoading(true);
    try {
      const tripId = getCurrentTripId();
      if (!tripId) return;

      const { data: trip } = await supabase
        .from("trips")
        .update({ title, end_time: new Date().toISOString() })
        .eq("id", tripId)
        .select()
        .single();

      endTrip();
      setShowTitleModal(false);

      if (trip) {
        setSummaryData(trip);
        setShowSummaryModal(true);
      } else {
        setOnTrip(false);
      }
    } catch (err) {
      console.error("旅の終了に失敗しました", err);
      setShowTitleModal(false);
      setOnTrip(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── サマリーを閉じる → ホーム復帰 ──
  const handleSummaryClose = useCallback(() => {
    setShowSummaryModal(false);
    setSummaryData(null);
    setOnTrip(false);
  }, []);

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-6"
      style={{ background: `linear-gradient(180deg, #0B1026 0%, #12122A 100%)` }}
    >
      {/* 旅セッション中バナー */}
      <AnimatePresence>
        {onTrip && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-3"
            style={{ background: GOLD }}
          >
            <span className="text-sm font-bold text-black">
              🌟 旅の記録中...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* タイトル */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12 text-center"
      >
        <h1 className="text-4xl font-bold tracking-tight">
          <span style={{ color: GOLD }}>Hotaru</span>
          <span className="ml-2 text-lg" style={{ color: GRAY }}>
            蛍
          </span>
        </h1>
        <p className="mt-3 text-sm" style={{ color: GRAY }}>
          旅の記憶を、蛍の光として灯す。
        </p>
      </motion.div>

      {/* メインボタン群 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex w-full max-w-xs flex-col items-center gap-4"
      >
        {!onTrip ? (
          /* ── 旅をしていない状態 ── */
          <>
            <div
              role="button"
              onClick={handleStartTrip}
              className="flex h-14 w-full cursor-pointer items-center justify-center rounded-2xl text-base font-bold text-black transition-transform active:scale-95"
              style={{
                background: loading
                  ? GRAY
                  : `linear-gradient(135deg, ${GOLD}, #FBBF24)`,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "開始中..." : "🌟 旅をはじめる"}
            </div>

            <NavButton
              label="🗺️ 地図を見る"
              onClick={() => router.push("/map")}
            />
            <NavButton
              label="🃏 カードアルバム"
              onClick={() => router.push("/album")}
            />
            <NavButton
              label="⚙️ 設定"
              onClick={() => router.push("/settings")}
              small
            />
          </>
        ) : (
          /* ── 旅の記録中 ── */
          <>
            <div
              role="button"
              onClick={() => router.push("/capture")}
              className="flex h-16 w-full cursor-pointer items-center justify-center rounded-2xl text-lg font-bold text-black transition-transform active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${GOLD}, #FBBF24)`,
              }}
            >
              ✨ 光を灯す
            </div>

            <NavButton
              label="🗺️ 地図を見る"
              onClick={() => router.push("/map")}
            />
            <NavButton
              label="🃏 カードアルバム"
              onClick={() => router.push("/album")}
            />

            <div
              role="button"
              onClick={handleEndTrip}
              className="mt-4 cursor-pointer rounded-xl px-6 py-2 text-sm transition-transform active:scale-95"
              style={{
                color: GRAY,
                border: `1px solid ${GRAY}40`,
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? "終了中..." : "旅をおわる"}
            </div>
          </>
        )}
      </motion.div>

      {/* ── タイトル入力モーダル ── */}
      <AnimatePresence>
        {showTitleModal && (
          <TitleInputModal onConfirm={handleTitleConfirm} />
        )}
      </AnimatePresence>

      {/* ── サマリーモーダル ── */}
      <AnimatePresence>
        {showSummaryModal && summaryData && (
          <TripSummaryModal trip={summaryData} onClose={handleSummaryClose} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── ナビゲーションボタン ── */
function NavButton({
  label,
  onClick,
  small,
}: {
  label: string;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <div
      role="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-center rounded-2xl text-sm font-medium transition-transform active:scale-95"
      style={{
        height: small ? 40 : 48,
        background: BG_CARD,
        color: WHITE,
        border: `1px solid ${GRAY}20`,
      }}
    >
      {label}
    </div>
  );
}

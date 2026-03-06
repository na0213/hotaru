"use client";

import { useState, useEffect, useCallback } from "react";
import {
    MapContainer,
    TileLayer,
    CircleMarker,
    GeoJSON,
} from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import "leaflet/dist/leaflet.css";

import { supabase } from "@/lib/supabase";
import { EMOTIONS, type Emotion } from "@/types";
import { GOLD, BG_CARD, WHITE, GRAY } from "@/constants/colors";
import { EnableTap } from "@/components/EnableTap";
import { SpotPetalView } from "@/components/SpotPetalView";
import type { Database } from "@/lib/database.types";

type SpotRow = Database["public"]["Tables"]["spots"]["Row"];

/** 感情カラーマップ */
const EMOTION_COLORS: Record<string, string> = {
    tanoshii: "#F97316",
    utsukushii: "#38BDF8",
    nokoshitai: "#F472B6",
};

type FilterType = Emotion | "all";

/** デフォルト: 日本全体 */
const DEFAULT_CENTER: [number, number] = [36.5, 137.5];
const DEFAULT_ZOOM = 5;
const LOCATED_ZOOM = 13;

export default function MapView() {
    const [spots, setSpots] = useState<SpotRow[]>([]);
    const [filter, setFilter] = useState<FilterType>("all");
    const [selectedSpot, setSelectedSpot] = useState<SpotRow | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [japanGeo, setJapanGeo] = useState<any>(null);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(true);

    // ── 現在地取得 ──
    useEffect(() => {
        if (!navigator.geolocation) {
            setLoadingLocation(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation([pos.coords.latitude, pos.coords.longitude]);
                setLoadingLocation(false);
            },
            () => {
                setLoadingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    }, []);

    // ── spots取得 ──
    useEffect(() => {
        (async () => {
            const { data, error } = await supabase
                .from("spots")
                .select("*")
                .order("created_at", { ascending: false });
            if (!error && data) setSpots(data);
        })();
    }, []);

    // ── japan.geojson読み込み（オプション） ──
    useEffect(() => {
        fetch("/japan.geojson")
            .then((r) => {
                if (!r.ok) throw new Error("not found");
                return r.json();
            })
            .then(setJapanGeo)
            .catch(() => {
                /* 無視 */
            });
    }, []);

    // ── フィルター済みスポット ──
    const filteredSpots =
        filter === "all"
            ? spots
            : spots.filter((s) => s.primary_emotion === filter);

    const handleSpotClick = useCallback((spot: SpotRow) => {
        setSelectedSpot(spot);
    }, []);

    const filterOptions: { key: FilterType; label: string; color: string }[] = [
        { key: "all", label: "全て", color: GOLD },
        {
            key: "tanoshii",
            label: EMOTIONS.tanoshii.emoji,
            color: EMOTION_COLORS.tanoshii,
        },
        {
            key: "utsukushii",
            label: EMOTIONS.utsukushii.emoji,
            color: EMOTION_COLORS.utsukushii,
        },
        {
            key: "nokoshitai",
            label: EMOTIONS.nokoshitai.emoji,
            color: EMOTION_COLORS.nokoshitai,
        },
    ];

    const mapCenter = userLocation ?? DEFAULT_CENTER;
    const mapZoom = userLocation ? LOCATED_ZOOM : DEFAULT_ZOOM;

    // ── ローディング中 ──
    if (loadingLocation) {
        return (
            <div
                className="flex h-dvh w-full flex-col items-center justify-center gap-3"
                style={{ background: "#0B1026" }}
            >
                <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-3xl"
                >
                    🌟
                </motion.div>
                <p className="text-xs" style={{ color: GRAY }}>
                    現在地を取得中...
                </p>
            </div>
        );
    }

    return (
        <div className="relative h-dvh w-full" style={{ background: "#0B1026" }}>
            {/* ── 地図 ── */}
            <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                className="h-full w-full"
                zoomControl={false}
                attributionControl={false}
            >
                <EnableTap />

                {/* ダークタイル */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />

                {/* 日本地図GeoJSON（あれば） */}
                {japanGeo && (
                    <GeoJSON
                        data={japanGeo}
                        style={() => ({
                            color: "#F59E0B20",
                            weight: 1,
                            fillColor: "#F59E0B08",
                            fillOpacity: 1,
                        })}
                    />
                )}

                {/* ── 蛍マーカー ── */}
                {filteredSpots.map((spot) => {
                    const color = EMOTION_COLORS[spot.primary_emotion] ?? GOLD;
                    const radius = Math.min(6 + spot.love_count * 0.3, 20);

                    return (
                        <CircleMarker
                            key={spot.id}
                            center={[spot.lat, spot.lng]}
                            radius={radius}
                            pathOptions={{
                                fillColor: color,
                                fillOpacity: 0.8,
                                color: color,
                                opacity: 1,
                                weight: 0,
                            }}
                            eventHandlers={{
                                click: () => handleSpotClick(spot),
                            }}
                        />
                    );
                })}

                {/* ── 現在地マーカー ── */}
                {userLocation && (
                    <CircleMarker
                        center={userLocation}
                        radius={8}
                        pathOptions={{
                            fillColor: "#60A5FA",
                            fillOpacity: 1,
                            color: "white",
                            opacity: 1,
                            weight: 2,
                        }}
                    />
                )}
            </MapContainer>

            {/* ── ヘッダー ── */}
            <div className="absolute left-0 right-0 top-0 z-[500] flex items-center justify-between px-4 py-3">
                <a
                    href="/"
                    className="text-sm no-underline"
                    style={{ color: GRAY }}
                >
                    ← ホーム
                </a>
                <span className="text-xs font-bold" style={{ color: GOLD }}>
                    ✨ {spots.length} spots
                </span>
            </div>

            {/* ── 感情フィルター ── */}
            <div className="absolute bottom-6 left-0 right-0 z-[500] flex justify-center px-4">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center gap-2 rounded-full px-3 py-2"
                    style={{
                        background: `${BG_CARD}E0`,
                        backdropFilter: "blur(10px)",
                        border: `1px solid ${GRAY}20`,
                    }}
                >
                    {filterOptions.map((opt) => {
                        const isActive = filter === opt.key;
                        return (
                            <div
                                key={opt.key}
                                role="button"
                                onClick={() => setFilter(opt.key)}
                                className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-all"
                                style={{
                                    background: isActive ? `${opt.color}25` : "transparent",
                                    color: isActive ? opt.color : GRAY,
                                    border: isActive
                                        ? `1px solid ${opt.color}50`
                                        : "1px solid transparent",
                                }}
                            >
                                {opt.label}
                            </div>
                        );
                    })}
                </motion.div>
            </div>

            {/* ── SpotPetalView モーダル ── */}
            <AnimatePresence>
                {selectedSpot && (
                    <SpotPetalView
                        spot={selectedSpot}
                        onClose={() => setSelectedSpot(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

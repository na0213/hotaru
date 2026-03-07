"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    MapContainer,
    TileLayer,
    CircleMarker,
    GeoJSON,
    useMap,
} from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";

import { supabase } from "@/lib/supabase";
import { getUserId } from "@/lib/userId";
import { type Emotion } from "@/types";
import { GOLD, BG_CARD, WHITE, GRAY } from "@/constants/colors";
import { EnableTap } from "@/components/EnableTap";
import { SpotPhotoBubbles } from "@/components/SpotPhotoBubbles";
import { LoveCardModal } from "@/components/LoveCardModal";
import { HotaruGlow } from "@/components/HotaruGlow";
import type { Database } from "@/lib/database.types";

type SpotRow = Database["public"]["Tables"]["spots"]["Row"];
type LoveRow = Database["public"]["Tables"]["loves"]["Row"];
type SpotPhotoRow = Database["public"]["Tables"]["spot_photos"]["Row"];

/** バブル表示用の統合型 */
export type PhotoBubble = {
    id: string;
    photo_url: string | null;
    emotion: string;
    recorded_at: string;
};

/** 感情カラーマップ */
const EMOTION_COLORS: Record<string, string> = {
    tanoshii: "#F97316",
    utsukushii: "#38BDF8",
    nokoshitai: "#F472B6",
};

type EmotionFilter = Emotion | "all";

/** デフォルト: 日本全体 */
const DEFAULT_CENTER: [number, number] = [36.5, 137.5];
const DEFAULT_ZOOM = 5;
const LOCATED_ZOOM = 13;

/** MapContainer内でmap instanceをrefと状態の両方に保持するヘルパー */
function MapRefCapture({
    mapRef,
    onMap,
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mapRef: React.MutableRefObject<any>;
    onMap: (map: LeafletMap) => void;
}) {
    const map = useMap();
    useEffect(() => {
        mapRef.current = map;
        onMap(map);
    }, [map, mapRef, onMap]);
    return null;
}

export default function MapView() {
    const [spots, setSpots] = useState<SpotRow[]>([]);
    const [showMyOnly, setShowMyOnly] = useState(false);
    const [emotionFilter, setEmotionFilter] = useState<'all' | 'tanoshii' | 'utsukushii' | 'nokoshitai'>('all');
    const [selectedSpot, setSelectedSpot] = useState<SpotRow | null>(null);
    const [spotScreenPos, setSpotScreenPos] = useState<{ x: number; y: number } | null>(null);
    const [bubbles, setBubbles] = useState<PhotoBubble[]>([]);
    const [selectedBubbleIndex, setSelectedBubbleIndex] = useState<number | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [japanGeo, setJapanGeo] = useState<any>(null);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(true);
    const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
    const [mySpotIds, setMySpotIds] = useState<string[]>([]);
    const [loadingSpot, setLoadingSpot] = useState(false);
    const [glowReady, setGlowReady] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRef = useRef<any>(null);

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

    // ── spots 取得 ──
    useEffect(() => {
        (async () => {
            const { data, error } = await supabase
                .from("spots")
                .select("*")
                .order("created_at", { ascending: false });
            if (!error && data) setSpots(data);
        })();
    }, []);

    // ── 自分のloves（spot_id）取得 ──
    useEffect(() => {
        const fetchMySpotIds = async () => {
            const userId = getUserId();
            const { data } = await supabase
                .from("loves")
                .select("spot_id")
                .eq("user_id", userId);
            setMySpotIds(data?.map((l) => l.spot_id as string) ?? []);
        };
        fetchMySpotIds();
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
    const filteredSpots = spots.filter((spot) => {
        if (showMyOnly) return mySpotIds.includes(spot.id);
        if (emotionFilter !== "all") return spot.primary_emotion === emotionFilter;
        return true;
    });

    // ── デバッグログ ──
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        console.log(
            "[filter] showMyOnly:", showMyOnly,
            "emotionFilter:", emotionFilter,
            "filteredSpots:", filteredSpots.length
        );
    }, [showMyOnly, emotionFilter, filteredSpots]);

    const handleSpotClick = useCallback(async (spot: SpotRow) => {
        setSelectedBubbleIndex(null);
        setBubbles([]);
        setSelectedSpot(spot);
        setLoadingSpot(true);

        if (mapRef.current) {
            const point = mapRef.current.latLngToContainerPoint([spot.lat, spot.lng]);
            setSpotScreenPos({ x: point.x, y: point.y });
        }

        // loves と spot_photos を並行取得
        const [{ data: lovesData, error: lovesErr }, { data: photosData, error: photosErr }] =
            await Promise.all([
                supabase
                    .from("loves")
                    .select("*")
                    .eq("spot_id", spot.id)
                    .order("recorded_at", { ascending: false })
                    .limit(8),
                supabase
                    .from("spot_photos")
                    .select("*")
                    .eq("spot_id", spot.id)
                    .order("sort_order", { ascending: true })
                    .limit(8),
            ]);

        console.log("[Hotaru] spot tap", {
            spotId: spot.id,
            loves: lovesData,
            lovesErr,
            spot_photos: photosData,
            photosErr,
        });

        // spot_photos をキューとして loves の写真がない場合に割り当て
        const photoQueue: SpotPhotoRow[] = [...(photosData ?? [])];

        const result: PhotoBubble[] = (lovesData ?? []).map((l) => {
            const photoUrl = l.photo_url ?? photoQueue.shift()?.photo_url ?? spot.first_photo_url ?? null;
            return { id: l.id, photo_url: photoUrl, emotion: l.emotion, recorded_at: l.recorded_at };
        });

        // loves が 0 件なら spot_photos をそのまま使う
        if (result.length === 0) {
            (photosData ?? []).slice(0, 8).forEach((p) => {
                result.push({
                    id: p.id,
                    photo_url: p.photo_url,
                    emotion: p.emotion ?? spot.primary_emotion,
                    recorded_at: p.created_at,
                });
            });
        }

        console.log("[Hotaru] bubbles to display:", result);
        setBubbles(result);
        setLoadingSpot(false);
    }, [mapRef]);

    const handleBubbleClose = useCallback(() => {
        setSelectedSpot(null);
        setSpotScreenPos(null);
        setBubbles([]);
        setSelectedBubbleIndex(null);
    }, []);

    const handleMapReady = useCallback((map: LeafletMap) => {
        setMapInstance(map);
        map.whenReady(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    map.invalidateSize();
                    setMapReady(true);
                });
            });
        });
    }, []);

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
                zoomAnimation={true}
                zoomAnimationThreshold={4}
                fadeAnimation={true}
                markerZoomAnimation={true}
                inertia={true}
                inertiaDeceleration={3000}
                inertiaMaxSpeed={1500}
                easeLinearity={0.2}
                wheelDebounceTime={40}
                wheelPxPerZoomLevel={60}
                dragging={true}
                touchZoom={true}
                bounceAtZoomLimits={false}
            >
                <EnableTap />
                <MapRefCapture mapRef={mapRef} onMap={handleMapReady} />

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

                {/* ── クリック用透明マーカー（Three.jsに描画を委譲） ── */}
                {mapReady && spots.length > 0 && filteredSpots.map((spot) => {
                    const radius = Math.max(Math.min(5 + Math.sqrt(spot.love_count) * 1.2, 25), 30);
                    return (
                        <CircleMarker
                            key={`${spot.id}-${mapReady}-${spots.length}`}
                            center={[spot.lat, spot.lng]}
                            radius={radius}
                            pathOptions={{
                                fillColor: "transparent",
                                fillOpacity: 0,
                                color: "transparent",
                                opacity: 0,
                                weight: 30,
                            }}
                            eventHandlers={{
                                click: () => { handleSpotClick(spot); },
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

            {/* ── 光の粒子レイヤー（Three.js） ── */}
            {mapReady && (
                <HotaruGlow
                    spots={filteredSpots}
                    mapInstance={mapInstance}
                    onReady={() => setGlowReady(true)}
                />
            )}

            {/* ── ローディングオーバーレイ ── */}
            {(!mapReady || !glowReady || spots.length === 0) && (
                <div
                    className="absolute inset-0 z-[600] flex flex-col items-center justify-center gap-3"
                    style={{ background: "#0B1026CC" }}
                >
                    <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="text-3xl"
                    >
                        🌟
                    </motion.div>
                    <p className="text-xs" style={{ color: "#94A3B8" }}>
                        蛍を呼んでいます...
                    </p>
                </div>
            )}

            {/* ── ヘッダー ── */}
            <div className="absolute left-0 right-0 top-0 z-[500] flex items-center justify-between px-4 py-3">
                <a
                    href="/"
                    className="no-underline flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
                    style={{
                        color: GRAY,
                        background: "rgba(255,255,255,0.06)",
                        border: `1px solid rgba(255,255,255,0.1)`,
                        backdropFilter: "blur(8px)",
                    }}
                >
                    🏠 ホーム
                </a>
                {/* 日本全体ボタン ← 追加 */}
                <div
                    role="button"
                    onClick={() => {
                        if (mapInstance) {
                            mapInstance.setView([36.5, 137.5], 5, { animate: true });
                        }
                    }}
                    className="cursor-pointer flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
                    style={{
                        color: GRAY,
                        background: "rgba(255,255,255,0.08)",
                        border: `1px solid rgba(255,255,255,0.1)`,
                        backdropFilter: "blur(8px)",
                    }}
                >
                    🗾 全体
                </div>
                <span className="text-xs font-bold" style={{ color: GOLD }}>
                    ✨ {spots.length} spots
                </span>
            </div>

            {/* ── 感情フィルター ── */}
            <div className="absolute bottom-6 left-0 right-0 z-[500] flex justify-center px-4">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center gap-3 rounded-full px-4 py-2.5"
                    style={{
                        background: `${BG_CARD}E0`,
                        backdropFilter: "blur(10px)",
                        border: `1px solid ${GRAY}20`,
                    }}
                >
                    {/* ALL ボタン */}
                    <div
                        role="button"
                        onClick={() => { setShowMyOnly(false); setEmotionFilter("all"); }}
                        className="cursor-pointer rounded-full px-3 py-1 text-xs font-bold tracking-wider transition-all"
                        style={{
                            color: !showMyOnly && emotionFilter === "all" ? WHITE : GRAY,
                            background: !showMyOnly && emotionFilter === "all" ? "rgba(255,255,255,0.15)" : "transparent",
                        }}
                    >
                        ALL
                    </div>

                    {/* MY ボタン */}
                    <div
                        role="button"
                        onClick={() => setShowMyOnly((prev) => !prev)}
                        className="cursor-pointer rounded-full px-3 py-1 text-xs font-bold tracking-wider transition-all"
                        style={{
                            color: showMyOnly ? "#F59E0B" : GRAY,
                            background: showMyOnly ? "rgba(245, 158, 11, 0.15)" : "transparent",
                            border: showMyOnly ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid transparent",
                        }}
                    >
                        MY
                    </div>

                    {/* 感情ドット */}
                    {(["tanoshii", "utsukushii", "nokoshitai"] as const).map((emotion) => {
                        const isActive = emotionFilter === emotion;
                        const color = EMOTION_COLORS[emotion];
                        const label = emotion === "tanoshii" ? "たのしい" : emotion === "utsukushii" ? "うつくしい" : "のこしたい";

                        return (
                            <motion.div
                                key={emotion}
                                role="button"
                                onClick={() => {
                                    const next = emotionFilter === emotion ? 'all' : emotion;
                                    setEmotionFilter(next);
                                    setShowMyOnly(false);
                                }}
                                className="flex cursor-pointer items-center gap-1.5 rounded-full transition-all"
                                style={{
                                    padding: isActive ? "4px 12px 4px 8px" : "4px",
                                    background: isActive ? `${color}20` : "transparent",
                                }}
                                layout
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                                <motion.span
                                    className="inline-block flex-shrink-0 rounded-full"
                                    style={{
                                        width: isActive ? 10 : 14,
                                        height: isActive ? 10 : 14,
                                        background: color,
                                        boxShadow: `0 0 ${isActive ? 10 : 6}px ${color}${isActive ? "AA" : "66"}`,
                                    }}
                                    layout
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.span
                                            initial={{ width: 0, opacity: 0 }}
                                            animate={{ width: "auto", opacity: 1 }}
                                            exit={{ width: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            style={{
                                                color: color,
                                                fontSize: 11,
                                                fontWeight: 600,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                display: "inline-block",
                                            }}
                                        >
                                            {label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>

            {/* ── 写真バブルオーバーレイ ── */}
            <AnimatePresence>
                {selectedSpot && spotScreenPos && (
                    <SpotPhotoBubbles
                        spot={selectedSpot}
                        bubbles={bubbles}
                        centerPosition={spotScreenPos}
                        onClose={handleBubbleClose}
                        onPhotoClick={(index) => setSelectedBubbleIndex(index)}
                        isLoading={loadingSpot}
                    />
                )}
            </AnimatePresence>

            {/* ── 写真カードモーダル ── */}
            <AnimatePresence>
                {selectedBubbleIndex !== null && bubbles.length > 0 && selectedSpot && (
                    <LoveCardModal
                        bubbles={bubbles}
                        initialIndex={selectedBubbleIndex}
                        spot={selectedSpot}
                        onClose={() => setSelectedBubbleIndex(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

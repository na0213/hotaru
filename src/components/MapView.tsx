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
import { PhotoGalleryModal } from "@/components/PhotoGalleryModal";
import { HotaruGlow } from "@/components/HotaruGlow";
import type { Database } from "@/lib/database.types";

type SpotRow = Database["public"]["Tables"]["spots"]["Row"];
type SpotPhoto = Database["public"]["Tables"]["spot_photos"]["Row"];

/** 感情カラーマップ */
const EMOTION_COLORS: Record<string, string> = {
    tanoshii: "#F97316",
    utsukushii: "#38BDF8",
    nokoshitai: "#F472B6",
};

type FilterType = Emotion | "all" | "my";

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
    const [spotPhotos, setSpotPhotos] = useState<Record<string, SpotPhoto[]>>({});
    const [filter, setFilter] = useState<FilterType>("all");
    const [selectedSpot, setSelectedSpot] = useState<SpotRow | null>(null);
    const [spotScreenPos, setSpotScreenPos] = useState<{ x: number; y: number } | null>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<{ photos: SpotPhoto[]; index: number } | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [japanGeo, setJapanGeo] = useState<any>(null);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(true);
    const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
    const [mySpotIds, setMySpotIds] = useState<Set<string>>(new Set());
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

    // ── spots + spot_photos 取得 ──
    useEffect(() => {
        (async () => {
            const [{ data, error }, { data: photosData }] = await Promise.all([
                supabase.from("spots").select("*").order("created_at", { ascending: false }),
                supabase.from("spot_photos").select("*").order("sort_order", { ascending: true }),
            ]);
            if (!error && data) setSpots(data);
            if (photosData) {
                const map: Record<string, SpotPhoto[]> = {};
                photosData.forEach((p) => {
                    if (!map[p.spot_id]) map[p.spot_id] = [];
                    map[p.spot_id].push(p);
                });
                setSpotPhotos(map);
            }
        })();
    }, []);

    // ── 自分のloves（spot_id）取得 ──
    useEffect(() => {
        (async () => {
            const { data } = await supabase
                .from("loves")
                .select("spot_id")
                .eq("user_id", getUserId());
            if (data) setMySpotIds(new Set(data.map((d) => d.spot_id)));
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
            : filter === "my"
            ? spots.filter((s) => mySpotIds.has(s.id))
            : spots.filter((s) => s.primary_emotion === filter);

    const handleSpotClick = useCallback((spot: SpotRow) => {
        setSelectedSpot(spot);
        if (mapRef.current) {
            const point = mapRef.current.latLngToContainerPoint([spot.lat, spot.lng]);
            setSpotScreenPos({ x: point.x, y: point.y });
        }
    }, []);

    const handleMapReady = useCallback((map: LeafletMap) => {
        setMapInstance(map);
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
                {filteredSpots.map((spot) => {
                    const radius = Math.max(Math.min(5 + Math.sqrt(spot.love_count) * 1.2, 25), 15);
                    return (
                        <CircleMarker
                            key={spot.id}
                            center={[spot.lat, spot.lng]}
                            radius={radius}
                            pathOptions={{
                                fillColor: "transparent",
                                fillOpacity: 0,
                                color: "transparent",
                                opacity: 0,
                                weight: 15,
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

            {/* ── 光の粒子レイヤー（Three.js） ── */}
            <HotaruGlow spots={filteredSpots} mapInstance={mapInstance} />

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
                        onClick={() => setFilter("all")}
                        className="cursor-pointer rounded-full px-3 py-1 text-xs font-bold tracking-wider transition-all"
                        style={{
                            color: filter === "all" ? WHITE : GRAY,
                            background: filter === "all" ? "rgba(255,255,255,0.15)" : "transparent",
                        }}
                    >
                        ALL
                    </div>

                    {/* MY ボタン */}
                    <div
                        role="button"
                        onClick={() => setFilter(filter === "my" ? "all" : "my")}
                        className="cursor-pointer rounded-full px-3 py-1 text-xs font-bold tracking-wider transition-all"
                        style={{
                            color: filter === "my" ? "#F59E0B" : GRAY,
                            background: filter === "my" ? "rgba(245, 158, 11, 0.15)" : "transparent",
                            border: filter === "my" ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid transparent",
                        }}
                    >
                        MY
                    </div>

                    {/* 感情ドット */}
                    {(["tanoshii", "utsukushii", "nokoshitai"] as const).map((emotion) => {
                        const isActive = filter === emotion;
                        const color = EMOTION_COLORS[emotion];
                        const label = emotion === "tanoshii" ? "たのしい" : emotion === "utsukushii" ? "うつくしい" : "のこしたい";

                        return (
                            <motion.div
                                key={emotion}
                                role="button"
                                onClick={() => setFilter(isActive ? "all" : emotion)}
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
                        photos={spotPhotos[selectedSpot.id] ?? []}
                        centerPosition={spotScreenPos}
                        onClose={() => {
                            setSelectedSpot(null);
                            setSpotScreenPos(null);
                        }}
                        onPhotoClick={(index) => {
                            setSelectedPhoto({
                                photos: spotPhotos[selectedSpot.id] ?? [],
                                index,
                            });
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ── 写真ギャラリーモーダル ── */}
            <AnimatePresence>
                {selectedPhoto && selectedSpot && (
                    <PhotoGalleryModal
                        photos={selectedPhoto.photos}
                        initialIndex={selectedPhoto.index}
                        spot={selectedSpot}
                        onClose={() => setSelectedPhoto(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

"use client";

import { useMap } from "react-leaflet";
import { useEffect } from "react";

/**
 * Leaflet の iOS タップ問題を解決するコンポーネント。
 * MapContainer 内に配置して使用する。
 */
export function EnableTap() {
    const map = useMap();
    useEffect(() => {
        if (!map) return;
        const container = map.getContainer();
        container.style.touchAction = "manipulation";
    }, [map]);
    return null;
}

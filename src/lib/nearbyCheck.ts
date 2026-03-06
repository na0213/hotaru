import { supabase } from "@/lib/supabase";
import { getUserId } from "@/lib/userId";

const NOTIFY_INTERVAL_MS = 3 * 60 * 1000;   // 3分間隔
const NOTIFY_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 同スポットは1日1回

let lastCheckTime = 0;
let watchId: number | null = null;

function getNotifiedSpots(): Record<string, number> {
    try {
        return JSON.parse(localStorage.getItem("hotaru_notified_spots") ?? "{}");
    } catch {
        return {};
    }
}

function markNotified(spotId: string): void {
    const notified = getNotifiedSpots();
    notified[spotId] = Date.now();
    // 期限切れエントリを削除
    const now = Date.now();
    for (const id of Object.keys(notified)) {
        if (now - notified[id] > NOTIFY_COOLDOWN_MS) delete notified[id];
    }
    localStorage.setItem("hotaru_notified_spots", JSON.stringify(notified));
}

function wasRecentlyNotified(spotId: string): boolean {
    const notified = getNotifiedSpots();
    const ts = notified[spotId];
    return ts !== undefined && Date.now() - ts < NOTIFY_COOLDOWN_MS;
}

async function checkNearby(lat: number, lng: number): Promise<void> {
    const now = Date.now();
    if (now - lastCheckTime < NOTIFY_INTERVAL_MS) return;
    lastCheckTime = now;

    const enabledCategories: string[] = JSON.parse(
        localStorage.getItem("hotaru_notify_emotions") ??
        '["tanoshii","utsukushii","nokoshitai"]'
    );

    const { data: spots } = await supabase.rpc("find_nearby_spot", {
        p_lat: lat,
        p_lng: lng,
        p_radius_m: 100,
    });

    if (!spots?.length) return;

    const spot = spots.find(
        (s) =>
            !wasRecentlyNotified(s.id) &&
            enabledCategories.includes(s.primary_emotion)
    );
    if (!spot) return;

    markNotified(spot.id);

    await fetch("/api/push-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getUserId(), spot }),
    });
}

export function startNearbyWatch(): void {
    if (typeof window === "undefined") return;
    if (!navigator.geolocation || watchId !== null) return;

    watchId = navigator.geolocation.watchPosition(
        (pos) => checkNearby(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: true }
    );
}

export function stopNearbyWatch(): void {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
}

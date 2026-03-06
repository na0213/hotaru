"use client";

const TRIP_KEY = "hotaru_current_trip_id";

/**
 * 現在アクティブな旅のIDを取得する。
 * 旅をしていなければ null を返す。
 */
export function getCurrentTripId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TRIP_KEY);
}

/**
 * 旅を開始し、tripId を localStorage に保存する。
 */
export function startTrip(tripId: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(TRIP_KEY, tripId);
}

/**
 * 旅を終了し、localStorage から tripId を削除する。
 */
export function endTrip(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TRIP_KEY);
}

/**
 * 現在旅をしているかどうかを返す。
 */
export function isOnTrip(): boolean {
    return getCurrentTripId() !== null;
}

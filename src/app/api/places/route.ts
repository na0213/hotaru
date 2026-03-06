import { NextRequest, NextResponse } from "next/server";

/**
 * Places API proxy — サーバーサイドで Google Places API を呼び出す
 * クライアントから /api/places?lat=...&lng=... で呼び出す
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
        return NextResponse.json(
            { error: "lat and lng are required" },
            { status: 400 }
        );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: "Google Places API key is not configured" },
            { status: 500 }
        );
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=ja`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status !== "OK") {
            return NextResponse.json(
                { error: data.status, results: [] },
                { status: 200 }
            );
        }

        // 最も詳細な結果を返す（広域エリアを除外）
        const filtered = (data.results || []).filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (r: any) => !isBroadArea(r.types || [])
        );

        const best = filtered[0] || null;

        return NextResponse.json({
            place_id: best?.place_id || null,
            place_name: best?.formatted_address || null,
            types: best?.types || [],
        });
    } catch (err) {
        console.error("Places API error:", err);
        return NextResponse.json(
            { error: "Failed to fetch place data" },
            { status: 500 }
        );
    }
}

/**
 * 広域地名かどうかを判定する。
 * Yokohama, Tokyo, Osaka 等のエリア名はスポット集約をスキップする。
 */
const BROAD_TYPES = new Set([
    "administrative_area_level_1",
    "administrative_area_level_2",
    "administrative_area_level_3",
    "locality",
    "sublocality",
    "sublocality_level_1",
    "sublocality_level_2",
    "political",
    "colloquial_area",
    "country",
]);

function isBroadArea(types: string[]): boolean {
    return types.every((t) => BROAD_TYPES.has(t));
}

/** 感情タイプ */
export type Emotion = "tanoshii" | "utsukushii" | "nokoshitai";

/** 感情定義 */
export const EMOTIONS: Record<
    Emotion,
    { label: string; emoji: string; color: string }
> = {
    tanoshii: { label: "たのしい", emoji: "😆", color: "#F59E0B" },
    utsukushii: { label: "うつくしい", emoji: "✨", color: "#38BDF8" },
    nokoshitai: { label: "のこしたい", emoji: "💛", color: "#F472B6" },
} as const;

/** 旅行セッション */
export type Trip = {
    id: string;
    user_id: string;
    title: string | null;
    start_time: string;
    end_time: string | null;
    tanoshii_count: number;
    utsukushii_count: number;
    nokoshitai_count: number;
};

/** スポット（蛍の光） */
export type Spot = {
    id: string;
    lat: number;
    lng: number;
    place_id: string | null;
    place_name: string | null;
    primary_emotion: string;
    love_count: number;
    tanoshii_count: number;
    utsukushii_count: number;
    nokoshitai_count: number;
    first_photo_url: string | null;
    created_at: string;
};

/** 愛の記録 */
export type Love = {
    id: string;
    user_id: string;
    trip_id: string;
    spot_id: string;
    lat: number;
    lng: number;
    emotion: string;
    photo_url: string | null;
    recorded_at: string;
};

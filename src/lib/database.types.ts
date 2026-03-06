/**
 * Hotaru v2.0 — Supabase Database 型定義
 *
 * Supabase CLI で自動生成する場合は上書きしてください:
 *   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 */

export type Database = {
    public: {
        Tables: {
            trips: {
                Row: {
                    id: string;
                    user_id: string;
                    title: string | null;
                    start_time: string;
                    end_time: string | null;
                    tanoshii_count: number;
                    utsukushii_count: number;
                    nokoshitai_count: number;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    title?: string | null;
                    start_time?: string;
                    end_time?: string | null;
                    tanoshii_count?: number;
                    utsukushii_count?: number;
                    nokoshitai_count?: number;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    title?: string | null;
                    start_time?: string;
                    end_time?: string | null;
                    tanoshii_count?: number;
                    utsukushii_count?: number;
                    nokoshitai_count?: number;
                };
                Relationships: [];
            };
            spots: {
                Row: {
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
                Insert: {
                    id?: string;
                    lat: number;
                    lng: number;
                    place_id?: string | null;
                    place_name?: string | null;
                    primary_emotion: string;
                    love_count?: number;
                    tanoshii_count?: number;
                    utsukushii_count?: number;
                    nokoshitai_count?: number;
                    first_photo_url?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    lat?: number;
                    lng?: number;
                    place_id?: string | null;
                    place_name?: string | null;
                    primary_emotion?: string;
                    love_count?: number;
                    tanoshii_count?: number;
                    utsukushii_count?: number;
                    nokoshitai_count?: number;
                    first_photo_url?: string | null;
                    created_at?: string;
                };
                Relationships: [];
            };
            loves: {
                Row: {
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
                Insert: {
                    id?: string;
                    user_id: string;
                    trip_id: string;
                    spot_id: string;
                    lat: number;
                    lng: number;
                    emotion: string;
                    photo_url?: string | null;
                    recorded_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    trip_id?: string;
                    spot_id?: string;
                    lat?: number;
                    lng?: number;
                    emotion?: string;
                    photo_url?: string | null;
                    recorded_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "loves_trip_id_fkey";
                        columns: ["trip_id"];
                        isOneToOne: false;
                        referencedRelation: "trips";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "loves_spot_id_fkey";
                        columns: ["spot_id"];
                        isOneToOne: false;
                        referencedRelation: "spots";
                        referencedColumns: ["id"];
                    },
                ];
            };
            spot_photos: {
                Row: {
                    id: string;
                    spot_id: string;
                    photo_url: string;
                    caption: string | null;
                    emotion: string | null;
                    sort_order: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    spot_id: string;
                    photo_url: string;
                    caption?: string | null;
                    emotion?: string | null;
                    sort_order?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    spot_id?: string;
                    photo_url?: string;
                    caption?: string | null;
                    emotion?: string | null;
                    sort_order?: number;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "spot_photos_spot_id_fkey";
                        columns: ["spot_id"];
                        isOneToOne: false;
                        referencedRelation: "spots";
                        referencedColumns: ["id"];
                    },
                ];
            };
            push_subscriptions: {
                Row: {
                    id: string;
                    user_id: string;
                    endpoint: string;
                    p256dh: string;
                    auth: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    endpoint: string;
                    p256dh: string;
                    auth: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    endpoint?: string;
                    p256dh?: string;
                    auth?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
        };
        Views: Record<string, never>;
        Functions: {
            find_nearby_spot: {
                Args: {
                    p_lat: number;
                    p_lng: number;
                    p_radius_m?: number;
                };
                Returns: Database["public"]["Tables"]["spots"]["Row"][];
            };
            increment_emotion: {
                Args: {
                    p_spot_id: string;
                    p_emotion: string;
                };
                Returns: undefined;
            };
            decrement_emotion: {
                Args: {
                    p_spot_id: string;
                    p_emotion: string;
                };
                Returns: undefined;
            };
        };
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
};

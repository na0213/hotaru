import { createServerSupabaseClient } from "@/lib/supabaseServer";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/MapView"), {
    ssr: false,
    loading: () => (
        <div
            className="flex h-dvh w-full items-center justify-center"
            style={{ background: "#0B1026" }}
        >
            <p className="text-sm text-slate-400">🗺️ 地図を読み込み中...</p>
        </div>
    ),
});

export default async function MapPage() {
    const supabase = await createServerSupabaseClient();
    const { data: initialSpots } = await supabase
        .from("spots")
        .select("*")
        .order("created_at", { ascending: false });

    return <MapView initialSpots={initialSpots ?? []} />;
}

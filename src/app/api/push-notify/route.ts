import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

const EMOTION_MAP: Record<string, { emoji: string; label: string }> = {
    tanoshii:   { emoji: "😆", label: "たのしい" },
    utsukushii: { emoji: "✨", label: "うつくしい" },
    nokoshitai: { emoji: "💛", label: "のこしたい" },
};

export async function POST(request: Request) {
    const { userId, spot } = await request.json() as {
        userId: string;
        spot: Database["public"]["Tables"]["spots"]["Row"];
    };

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: subscriptions } = await supabaseAdmin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", userId);

    if (!subscriptions?.length) {
        return NextResponse.json({ ok: false, reason: "no subscription" });
    }

    const emo = EMOTION_MAP[spot.primary_emotion] ?? { emoji: "✨", label: "素敵な" };
    const payload = JSON.stringify({
        title: "Hotaru 蛍",
        body: `近くに${emo.emoji}${emo.label}場所があります。あなたも押せますよ`,
        url: "/map",
    });

    const results = await Promise.allSettled(
        subscriptions.map((sub) =>
            webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload
            )
        )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r) => String(r.reason));

    if (failed.length) {
        console.error("[push-notify] failed:", failed);
    }

    return NextResponse.json({ ok: succeeded > 0, sent: succeeded, failed });
}

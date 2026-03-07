import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const origin = requestUrl.origin;

    console.log("[auth/callback] code:", code ? "exists" : "none");

    if (code) {
        const supabase = await createServerSupabaseClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        console.log("[auth/callback] exchange result:", error ? error.message : "success");
    }

    return NextResponse.redirect(`${origin}/`);
}

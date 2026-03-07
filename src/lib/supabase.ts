import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/** クライアントサイド（ブラウザ）用ファクトリ */
export function createClient() {
    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

/** 後方互換のシングルトン（クライアントコンポーネントから直接使う用） */
export const supabase = createClient();

export async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
        },
    });
    if (error) throw error;
}

export async function signOut() {
    await supabase.auth.signOut();
}

export async function getSession() {
    const {
        data: { session },
    } = await supabase.auth.getSession();
    return session;
}

"use client";

import { supabase } from "./supabase";

const STORAGE_KEY = "hotaru_user_id";

/**
 * ユーザーID を取得する。
 * localStorage に保存されていなければ新規生成して保存する。
 * Googleログイン後は syncUserId() を呼ぶことで Supabase の user.id に更新される。
 */
export function getUserId(): string {
    if (typeof window === "undefined") return "";

    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
}

/**
 * Googleログイン後にSupabaseのuser.idをlocalStorageに同期する。
 * セッションがない場合は従来の匿名IDを返す。
 */
export async function syncUserId(): Promise<string> {
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id) {
        localStorage.setItem(STORAGE_KEY, session.user.id);
        return session.user.id;
    }
    return getUserId();
}

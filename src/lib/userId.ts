"use client";

const STORAGE_KEY = "hotaru_user_id";

/**
 * 匿名ユーザーID を取得する。
 * localStorage に保存されていなければ新規生成して保存する。
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

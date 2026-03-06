import { supabase } from "@/lib/supabase";
import { getUserId } from "@/lib/userId";

export async function subscribePush(): Promise<void> {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });

    const p256dh = btoa(
        String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh")!))
    );
    const auth = btoa(
        String.fromCharCode(...new Uint8Array(subscription.getKey("auth")!))
    );

    await supabase.from("push_subscriptions").upsert({
        user_id: getUserId(),
        endpoint: subscription.endpoint,
        p256dh,
        auth,
    });
}

export async function unsubscribePush(): Promise<void> {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    await subscription.unsubscribe();
    await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", getUserId());
}

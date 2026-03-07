"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GOLD } from "@/constants/colors";

interface TripData {
    id: string;
    title: string | null;
    tanoshii_count: number;
    utsukushii_count: number;
    nokoshitai_count: number;
}

interface FireflyForestProps {
    trips: TripData[];
}

const CANVAS_HEIGHT = 240;

function getFireflyColor(trip: TripData): string {
    const { tanoshii_count: t, utsukushii_count: u, nokoshitai_count: n } = trip;
    const max = Math.max(t, u, n);
    if (max === 0 || (t === max && u === max && n === max)) return "#F59E0B";
    if (t === max && t > u && t > n) return "#F97316";
    if (u === max && u > t && u > n) return "#38BDF8";
    if (n === max && n > t && n > u) return "#F472B6";
    return "#F59E0B";
}

function hexToRgb(hex: string): [number, number, number] {
    return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ];
}

type Firefly = {
    tripIndex: number;
    color: string;
    baseX: number;
    baseY: number;
    ampX: number;
    ampY: number;
    phaseX: number;
    phaseY: number;
    speed: number;
    cx: number;
    cy: number;
};


function drawFirefly(ctx: CanvasRenderingContext2D, ff: Firefly, time: number) {
    const blink = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * ff.speed * 2.8 + ff.phaseX));
    const [r, g, b] = hexToRgb(ff.color);

    // 外側グロー
    const glowGrad = ctx.createRadialGradient(ff.cx, ff.cy, 0, ff.cx, ff.cy, 12);
    glowGrad.addColorStop(0, `rgba(${r},${g},${b},${(blink * 0.5).toFixed(2)})`);
    glowGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.beginPath();
    ctx.arc(ff.cx, ff.cy, 12, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    // 感情カラー円
    ctx.beginPath();
    ctx.arc(ff.cx, ff.cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${(blink * 0.55).toFixed(2)})`;
    ctx.fill();

    // 白い中心点
    ctx.beginPath();
    ctx.arc(ff.cx, ff.cy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${blink.toFixed(2)})`;
    ctx.fill();
}

export function FireflyForest({ trips }: FireflyForestProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);
    const firefliesRef = useRef<Firefly[]>([]);
    const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // キャンバスサイズ確定
        canvas.width = Math.max(canvas.clientWidth, 300);
        canvas.height = CANVAS_HEIGHT;
        const w = canvas.width;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // 蛍初期化（木のあたり padding を除いた範囲に配置）
        const pad = 120;
        firefliesRef.current = trips.map((trip, i) => ({
            tripIndex: i,
            color: getFireflyColor(trip),
            baseX: pad + Math.random() * Math.max(w - pad * 2, 60),
            baseY: 35 + Math.random() * (CANVAS_HEIGHT - 90),
            ampX: 30 + Math.random() * 50,
            ampY: 10 + Math.random() * 10,
            phaseX: Math.random() * Math.PI * 2,
            phaseY: Math.random() * Math.PI * 2,
            speed: 0.25 + Math.random() * 0.35,
            cx: 0,
            cy: 0,
        }));

        const startTime = Date.now();

        function animate() {
            rafRef.current = requestAnimationFrame(animate);
            const t = (Date.now() - startTime) * 0.001;
            const cw = canvas!.width;
            const ch = canvas!.height;
            ctx!.clearRect(0, 0, cw, ch);
            for (const ff of firefliesRef.current) {
                ff.cx = ff.baseX + Math.sin(t * ff.speed + ff.phaseX) * ff.ampX;
                ff.cy = ff.baseY + Math.cos(t * ff.speed * 0.7 + ff.phaseY) * ff.ampY;
                drawFirefly(ctx!, ff, t);
            }
        }
        animate();

        const ro = new ResizeObserver(() => {
            canvas.width = canvas.clientWidth;
            canvas.height = CANVAS_HEIGHT;
        });
        ro.observe(canvas);

        return () => {
            cancelAnimationFrame(rafRef.current);
            ro.disconnect();
        };
    }, [trips]);

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
            const my = (e.clientY - rect.top) * (canvas.height / rect.height);

            for (const ff of firefliesRef.current) {
                const dx = ff.cx - mx;
                const dy = ff.cy - my;
                if (Math.sqrt(dx * dx + dy * dy) < 20) {
                    const trip = trips[ff.tripIndex];
                    setTooltip({
                        text: `この蛍は「${trip.title ?? "無題の旅"}」から生まれました`,
                        // CSS座標に変換
                        x: (ff.cx / canvas.width) * rect.width,
                        y: (ff.cy / canvas.height) * rect.height,
                    });
                    setTimeout(() => setTooltip(null), 800);

                    const el = document.getElementById(`trip-${trip.id}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    break;
                }
            }
        },
        [trips]
    );

    return (
        <div
            className="relative overflow-hidden rounded-2xl"
            style={{
                height: CANVAS_HEIGHT,
                backgroundImage: "url('/firefly-forest.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            <canvas
                ref={canvasRef}
                onClick={handleClick}
                style={{
                    display: "block",
                    width: "100%",
                    height: CANVAS_HEIGHT,
                    cursor: "pointer",
                    background: "transparent",
                }}
            />

            <AnimatePresence>
                {tooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="pointer-events-none absolute rounded-xl px-3 py-1.5 text-xs font-medium"
                        style={{
                            left: tooltip.x,
                            top: tooltip.y - 40,
                            transform: "translateX(-50%)",
                            background: "rgba(11,16,38,0.92)",
                            color: GOLD,
                            border: `1px solid ${GOLD}40`,
                            whiteSpace: "nowrap",
                            backdropFilter: "blur(6px)",
                        }}
                    >
                        {tooltip.text}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

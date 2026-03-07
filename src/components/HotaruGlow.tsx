"use client";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import type { Map as LeafletMap } from "leaflet";

type Spot = {
    id: string;
    lat: number;
    lng: number;
    primary_emotion: string;
    love_count: number;
};

type Props = {
    spots: Spot[];
    mapInstance: LeafletMap | null;
    onReady?: () => void;
};

const EMOTION_RGB: Record<string, [number, number, number]> = {
    tanoshii: [0.976, 0.451, 0.086],
    utsukushii: [0.220, 0.741, 0.973],
    nokoshitai: [0.957, 0.447, 0.714],
};
const DEFAULT_RGB: [number, number, number] = [0.961, 0.620, 0.043];

const vertexShader = `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vBrightness;
  uniform float uTime;
  void main() {
    vColor = aColor;
    vAlpha = 0.8 + 0.2 * sin(uTime * 1.0 + aPhase);
    vBrightness = 0.6 + 0.4 * smoothstep(10.0, 80.0, aSize);
    vec3 pos = position;
    pos.x += sin(uTime * 0.7 + aPhase) * 1.5;
    pos.y += cos(uTime * 0.5 + aPhase * 1.3) * 1.5;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vBrightness;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float glow = exp(-dist * dist * 3.5);
    float core = exp(-dist * dist * 15.0) * vBrightness * 0.6;
    vec3 finalColor = mix(vColor, vec3(1.0), core);
    gl_FragColor = vec4(finalColor, glow * vAlpha * vBrightness);
  }
`;

// シーンを spots と map から再構築する純粋関数
function rebuildScene(
    scene: THREE.Scene,
    spots: Spot[],
    map: LeafletMap,
    canvas: HTMLCanvasElement,
    camera: THREE.OrthographicCamera,
    uniforms: { uTime: { value: number } }
) {
    // 既存オブジェクトを全破棄
    scene.children.slice().forEach((obj) => {
        if (obj instanceof THREE.Points) {
            obj.geometry.dispose();
            (obj.material as THREE.Material).dispose();
        }
        scene.remove(obj);
    });

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    camera.left = -w / 2;
    camera.right = w / 2;
    camera.top = h / 2;
    camera.bottom = -h / 2;
    camera.updateProjectionMatrix();

    if (spots.length === 0) return;

    const count = spots.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    const zoom = map.getZoom();

    spots.forEach((spot, i) => {
        const pt = map.latLngToContainerPoint([spot.lat, spot.lng]);
        positions[i * 3] = pt.x - w / 2;
        positions[i * 3 + 1] = -(pt.y - h / 2);
        positions[i * 3 + 2] = 0;

        const rgb = EMOTION_RGB[spot.primary_emotion] ?? DEFAULT_RGB;
        colors[i * 3] = rgb[0];
        colors[i * 3 + 1] = rgb[1];
        colors[i * 3 + 2] = rgb[2];

        const baseSize = Math.min(10 + Math.sqrt(spot.love_count) * 4, 80);
        const scale = Math.pow(1.25, zoom - 5);
        sizes[i] = Math.min(baseSize * scale, 80);
        phases[i] = (spot.id.charCodeAt(0) / 255) * Math.PI * 2;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    scene.add(new THREE.Points(geometry, material));
}

export function HotaruGlow({ spots, mapInstance, onReady }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const uniformsRef = useRef<{ uTime: { value: number } }>({ uTime: { value: 0 } });
    const readyRef = useRef(false);

    // ── Three.js 初期化（一度だけ）──
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || readyRef.current) return;
        readyRef.current = true;

        const w = canvas.clientWidth;
        const h = canvas.clientHeight;

        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: false, antialias: true });
        } catch { return; }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h);
        rendererRef.current = renderer;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 1000);
        camera.position.z = 100;
        cameraRef.current = camera;

        const startTime = Date.now();
        const animate = () => {
            rafRef.current = requestAnimationFrame(animate);
            uniformsRef.current.uTime.value = (Date.now() - startTime) * 0.001;
            renderer.render(scene, camera);
        };
        animate();
        onReady?.();

        const handleResize = () => {
            const nw = canvas.clientWidth;
            const nh = canvas.clientHeight;
            renderer.setSize(nw, nh);
        };
        window.addEventListener("resize", handleResize);

        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener("resize", handleResize);
            renderer.dispose();
            readyRef.current = false;
        };
    }, []);

    // ── spots または mapInstance が変わったら即リビルド ──
    // ※ spots を直接引数として渡すので古い値の問題なし
    useEffect(() => {
        const canvas = canvasRef.current;
        const scene = sceneRef.current;
        const camera = cameraRef.current;
        if (!canvas || !scene || !camera || !mapInstance) return;

        rebuildScene(scene, spots, mapInstance, canvas, camera, uniformsRef.current);
    }, [spots, mapInstance]);

    // ── 地図移動/ズームで位置を再計算 ──
    useEffect(() => {
        if (!mapInstance) return;
        const handler = () => {
            const canvas = canvasRef.current;
            const scene = sceneRef.current;
            const camera = cameraRef.current;
            if (!canvas || !scene || !camera) return;
            rebuildScene(scene, spots, mapInstance, canvas, camera, uniformsRef.current);
        };
        mapInstance.on("move", handler);
        mapInstance.on("zoom", handler);
        return () => {
            mapInstance.off("move", handler);
            mapInstance.off("zoom", handler);
        };
    }, [spots, mapInstance]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "absolute",
                top: 0, left: 0,
                width: "100%", height: "100%",
                pointerEvents: "none",
                zIndex: 400,
            }}
        />
    );
}

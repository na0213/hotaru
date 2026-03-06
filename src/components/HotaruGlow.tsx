"use client";
import { useRef, useEffect, useCallback } from "react";
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
};

const EMOTION_RGB: Record<string, [number, number, number]> = {
    tanoshii:   [0.976, 0.451, 0.086],
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
    // 明滅は控えめ（80%〜100%）
    vAlpha = 0.8 + 0.2 * sin(uTime * 1.0 + aPhase);
    // サイズが大きいほど明るい（0.6〜1.0）
    vBrightness = 0.6 + 0.4 * smoothstep(10.0, 80.0, aSize);
    // 微小な揺れ
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
    // より広いガウシアン減衰（柔らかく大きな光）
    float glow = exp(-dist * dist * 3.5);
    // 白いコア
    float core = exp(-dist * dist * 15.0) * vBrightness * 0.6;
    vec3 finalColor = mix(vColor, vec3(1.0), core);
    gl_FragColor = vec4(finalColor, glow * vAlpha * vBrightness);
  }
`;

export function HotaruGlow({ spots, mapInstance }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const pointsRef = useRef<THREE.Points | null>(null);
    const uniformsRef = useRef<{ uTime: { value: number } }>({ uTime: { value: 0 } });
    const rafRef = useRef<number>(0);

    const updatePositions = useCallback(() => {
        if (!mapInstance || !pointsRef.current || !cameraRef.current || !canvasRef.current) return;
        const geo = pointsRef.current.geometry;
        const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
        const sizeAttr = geo.getAttribute("aSize") as THREE.BufferAttribute;
        const w = canvasRef.current.clientWidth;
        const h = canvasRef.current.clientHeight;

        spots.forEach((spot, i) => {
            const pt = mapInstance.latLngToContainerPoint([spot.lat, spot.lng]);
            posAttr.setXYZ(i, pt.x - w / 2, -(pt.y - h / 2), 0);
            const zoom = mapInstance.getZoom();
            const baseSize = Math.min(10 + Math.sqrt(spot.love_count) * 4, 80);
            const scale = Math.pow(1.25, zoom - 5);
            sizeAttr.setX(i, Math.min(baseSize * scale, 80));
        });
        posAttr.needsUpdate = true;
        sizeAttr.needsUpdate = true;

        const cam = cameraRef.current;
        cam.left = -w / 2;
        cam.right = w / 2;
        cam.top = h / 2;
        cam.bottom = -h / 2;
        cam.updateProjectionMatrix();
    }, [spots, mapInstance]);

    useEffect(() => {
        if (!canvasRef.current || spots.length === 0) return;

        const canvas = canvasRef.current;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;

        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({
                canvas,
                alpha: true,
                premultipliedAlpha: false,
                antialias: true,
            });
        } catch {
            return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h);
        rendererRef.current = renderer;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 1000);
        camera.position.z = 100;
        cameraRef.current = camera;

        const count = spots.length;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const phases = new Float32Array(count);

        spots.forEach((spot, i) => {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;

            const rgb = EMOTION_RGB[spot.primary_emotion] ?? DEFAULT_RGB;
            colors[i * 3]     = rgb[0];
            colors[i * 3 + 1] = rgb[1];
            colors[i * 3 + 2] = rgb[2];

            sizes[i] = Math.min(10 + Math.sqrt(spot.love_count) * 4, 80);
            phases[i] = Math.random() * Math.PI * 2;
        });

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

        const uniforms = { uTime: { value: 0 } };
        uniformsRef.current = uniforms;

        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const points = new THREE.Points(geometry, material);
        scene.add(points);
        pointsRef.current = points;

        const startTime = Date.now();
        function animate() {
            rafRef.current = requestAnimationFrame(animate);
            uniforms.uTime.value = (Date.now() - startTime) * 0.001;
            renderer.render(scene, camera);
        }
        animate();

        const handleResize = () => {
            const nw = canvas.clientWidth;
            const nh = canvas.clientHeight;
            renderer.setSize(nw, nh);
            camera.left = -nw / 2;
            camera.right = nw / 2;
            camera.top = nh / 2;
            camera.bottom = -nh / 2;
            camera.updateProjectionMatrix();
            updatePositions();
        };
        window.addEventListener("resize", handleResize);

        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener("resize", handleResize);
            geometry.dispose();
            material.dispose();
            renderer.dispose();
        };
    }, [spots, updatePositions]);

    useEffect(() => {
        if (!mapInstance) return;
        const handler = () => updatePositions();
        mapInstance.on("move", handler);
        mapInstance.on("zoom", handler);
        updatePositions();
        return () => {
            mapInstance.off("move", handler);
            mapInstance.off("zoom", handler);
        };
    }, [mapInstance, updatePositions]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 400,
            }}
        />
    );
}

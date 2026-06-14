import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { motionTier, hasFinePointer } from '../lib/motion';

interface AgenticBackgroundProps {
    /** Chat world dims the background so content leads */
    dimmed: boolean;
}

/**
 * Wave-field background: a sea of GPU points displaced by layered sine
 * waves in the vertex shader. Calm zones stay near-invisible ink; wave
 * crests light up in the cyan/violet brand hues. One draw call — all the
 * motion lives on the GPU.
 */
const AgenticBackground: React.FC<AgenticBackgroundProps> = ({ dimmed }) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const dimmedRef = useRef(dimmed);

    useEffect(() => {
        dimmedRef.current = dimmed;
    }, [dimmed]);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        const tier = motionTier();

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, tier === 'full' ? 2 : 1.5));
        renderer.setClearColor(0x000000, 0);
        host.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
        camera.position.set(0, 2.2, 7.5);
        camera.lookAt(0, 0, 0);

        /* grid of points displaced by travelling waves in the vertex shader */
        const COLS = tier === 'full' ? 180 : 110;
        const ROWS = tier === 'full' ? 90 : 55;
        const FIELD_W = 26;
        const FIELD_H = 13;
        const count = COLS * ROWS;
        const positions = new Float32Array(count * 3);
        const seeds = new Float32Array(count);

        let i = 0;
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                positions[i * 3 + 0] = (x / (COLS - 1) - 0.5) * FIELD_W;
                positions[i * 3 + 1] = 0;
                positions[i * 3 + 2] = (y / (ROWS - 1) - 0.5) * FIELD_H;
                seeds[i] = Math.random();
                i++;
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

        const uniforms = {
            uTime: { value: 0 },
            uMouse: { value: new THREE.Vector2(0, 0) },
            uGlobal: { value: 1 }, // hero 1 ↔ chat 0.3
            uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
            // obsidian palette: faint ink in the calm zones, cyan→violet crests
            uColInk: { value: new THREE.Color('#2e2e2c') },
            uColA: { value: new THREE.Color('#22d3ee') },
            uColB: { value: new THREE.Color('#67e8f9') },
            uColC: { value: new THREE.Color('#0ea5e9') },
            uColD: { value: new THREE.Color('#a78bfa') },
        };

        const material = new THREE.ShaderMaterial({
            uniforms,
            transparent: true,
            depthWrite: false,
            vertexShader: /* glsl */ `
              uniform float uTime;
              uniform vec2 uMouse;
              uniform float uPixelRatio;
              attribute float aSeed;
              varying float vElev;
              varying float vSeed;
              varying vec2 vUvPos;

              void main() {
                vec3 p = position;

                // layered travelling waves
                float t = uTime * 0.55;
                float e = 0.0;
                e += sin(p.x * 0.55 + t) * 0.55;
                e += sin(p.z * 0.85 + t * 1.4) * 0.35;
                e += sin((p.x + p.z) * 0.35 + t * 0.8) * 0.45;

                // gentle swell that follows the cursor
                float mDist = distance(p.xz * vec2(1.0, 2.0), uMouse * vec2(13.0, 6.5));
                e += smoothstep(5.0, 0.0, mDist) * 1.0;

                p.y = e;
                vElev = e;
                vSeed = aSeed;
                vUvPos = vec2(position.x / 26.0 + 0.5, position.z / 13.0 + 0.5);

                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                gl_Position = projectionMatrix * mv;
                gl_PointSize = (1.6 + aSeed * 1.8) * uPixelRatio * (6.0 / -mv.z);
              }
            `,
            fragmentShader: /* glsl */ `
              uniform vec3 uColInk;
              uniform vec3 uColA;
              uniform vec3 uColB;
              uniform vec3 uColC;
              uniform vec3 uColD;
              uniform float uGlobal;
              varying float vElev;
              varying float vSeed;
              varying vec2 vUvPos;

              void main() {
                // round points
                float d = length(gl_PointCoord - 0.5);
                if (d > 0.5) discard;

                // cyan on the left, blue→violet on the right; ink in the calm zones
                vec3 warm = mix(uColA, uColB, vUvPos.y);
                vec3 cool = mix(uColC, uColD, vUvPos.y);
                vec3 hue = mix(warm, cool, smoothstep(0.25, 0.75, vUvPos.x));

                float energy = smoothstep(0.15, 1.3, abs(vElev));
                vec3 col = mix(uColInk, hue, energy);

                float alpha = (0.22 + energy * 0.6) * (0.55 + vSeed * 0.45) * uGlobal;
                gl_FragColor = vec4(col, alpha);
              }
            `,
        });

        const points = new THREE.Points(geometry, material);
        points.rotation.x = -0.12;
        scene.add(points);

        const resize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };
        resize();
        window.addEventListener('resize', resize);

        /* mouse → eased uniform + slight camera parallax */
        const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
        const onMove = (e: PointerEvent) => {
            mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
        };
        if (hasFinePointer() && tier === 'full') {
            window.addEventListener('pointermove', onMove, { passive: true });
        }

        const clock = new THREE.Clock();

        const frame = () => {
            const t = clock.getElapsedTime();
            uniforms.uTime.value = t;

            // ease layer opacity toward target (hero 1 ↔ chat 0.3)
            const target = dimmedRef.current ? 0.3 : 1;
            uniforms.uGlobal.value += (target - uniforms.uGlobal.value) * 0.04;

            mouse.x += (mouse.tx - mouse.x) * 0.05;
            mouse.y += (mouse.ty - mouse.y) * 0.05;
            uniforms.uMouse.value.set(mouse.x, mouse.y);

            camera.position.x = mouse.x * 0.5;
            camera.position.y = 2.2 + mouse.y * 0.25;
            camera.lookAt(0, 0, 0);

            renderer.render(scene, camera);
        };

        if (tier === 'off') {
            // single static frame — texture without motion
            uniforms.uTime.value = 3.0;
            uniforms.uGlobal.value = dimmedRef.current ? 0.3 : 1;
            renderer.render(scene, camera);
        } else {
            renderer.setAnimationLoop(frame);
        }

        return () => {
            renderer.setAnimationLoop(null);
            window.removeEventListener('resize', resize);
            window.removeEventListener('pointermove', onMove);
            geometry.dispose();
            material.dispose();
            renderer.dispose();
            host.removeChild(renderer.domElement);
        };
    }, []);

    return (
        <div
            ref={hostRef}
            aria-hidden
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 0,
                pointerEvents: 'none',
            }}
        />
    );
};

export default AgenticBackground;

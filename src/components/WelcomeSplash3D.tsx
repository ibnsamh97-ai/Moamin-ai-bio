import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface WelcomeSplash3DProps {
  isOpen: boolean;
  onEnterPlatform: () => void;
}

export const WelcomeSplash3D: React.FC<WelcomeSplash3DProps> = ({
  isOpen,
  onEnterPlatform,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Automatically close splash screen and open the platform after 2 seconds (2000ms)
  useEffect(() => {
    if (!isOpen) {
      setIsFadingOut(false);
      return;
    }

    const fadeTimer = window.setTimeout(() => {
      setIsFadingOut(true);
    }, 1700);

    const enterTimer = window.setTimeout(() => {
      onEnterPlatform();
    }, 2000);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(enterTimer);
    };
  }, [isOpen, onEnterPlatform]);

  // Subtle 3D glowing bio-particles background
  useEffect(() => {
    if (!isOpen || !mountRef.current) return;
    const container = mountRef.current;

    let renderer: THREE.WebGLRenderer | null = null;
    let animationFrameId = 0;

    try {
      const scene = new THREE.Scene();
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      camera.position.z = 26;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      const particleCount = 110;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 55;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 35;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 25;

        const isEmerald = i % 2 === 0;
        colors[i * 3] = isEmerald ? 0.06 : 0.02;
        colors[i * 3 + 1] = isEmerald ? 0.72 : 0.71;
        colors[i * 3 + 2] = isEmerald ? 0.5 : 0.83;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.42,
        vertexColors: true,
        transparent: true,
        opacity: 0.75,
      });

      const particles = new THREE.Points(geometry, material);
      scene.add(particles);

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        particles.rotation.y += 0.0025;
        particles.rotation.x += 0.001;
        renderer?.render(scene, camera);
      };

      animate();

      const handleResize = () => {
        if (!container || !renderer) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
        geometry.dispose();
        material.dispose();
        renderer?.dispose();
      };
    } catch {
      return undefined;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden select-none transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      data-testid="welcome-splash-3d"
      onClick={onEnterPlatform}
    >
      {/* 3D WebGL Floating Bio-Particles Canvas */}
      <div
        ref={mountRef}
        className="absolute inset-0 pointer-events-none opacity-80"
        aria-hidden="true"
      />

      {/* Ambient Radial Glow Behind Emblem */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.22) 0%, rgba(6, 182, 212, 0.08) 35%, rgba(2, 6, 23, 0.96) 75%)',
        }}
        aria-hidden="true"
      />

      {/* Minimalist Iconic Brand Emblem + EcoBio AI Title ONLY */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-900/90 border-2 border-emerald-500/50 flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.35)] mb-6">
          <svg
            viewBox="0 0 80 80"
            className="w-20 h-20 sm:w-22 sm:h-22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="EcoBio AI Brand Emblem"
          >
            {/* Outer Orbital Ring */}
            <circle
              cx="40"
              cy="40"
              r="34"
              stroke="url(#splashRingGrad)"
              strokeWidth="1.6"
              strokeDasharray="4 4"
            />
            {/* Water Droplet Silhouette */}
            <path
              d="M40 9C40 9 18 33 18 49C18 61.1503 27.8497 71 40 71C52.1503 71 62 61.1503 62 49C62 33 40 9 40 9Z"
              stroke="url(#splashDropGrad)"
              strokeWidth="2.8"
              fill="rgba(16, 185, 129, 0.14)"
            />
            {/* Cellular Hexagon */}
            <polygon
              points="40,27 52,34 52,48 40,55 28,48 28,34"
              stroke="#38bdf8"
              strokeWidth="2"
              fill="rgba(6, 182, 212, 0.16)"
            />
            {/* AI Neural Core & Synapses */}
            <circle cx="40" cy="41" r="4.2" fill="#10b981" />
            <circle cx="40" cy="27" r="2.5" fill="#38bdf8" />
            <circle cx="52" cy="34" r="2.5" fill="#38bdf8" />
            <circle cx="52" cy="48" r="2.5" fill="#38bdf8" />
            <circle cx="40" cy="55" r="2.5" fill="#38bdf8" />
            <circle cx="28" cy="48" r="2.5" fill="#38bdf8" />
            <circle cx="28" cy="34" r="2.5" fill="#38bdf8" />
            <line
              x1="40"
              y1="41"
              x2="40"
              y2="27"
              stroke="#10b981"
              strokeWidth="1.4"
            />
            <line
              x1="40"
              y1="41"
              x2="52"
              y2="34"
              stroke="#10b981"
              strokeWidth="1.4"
            />
            <line
              x1="40"
              y1="41"
              x2="52"
              y2="48"
              stroke="#10b981"
              strokeWidth="1.4"
            />
            <line
              x1="40"
              y1="41"
              x2="40"
              y2="55"
              stroke="#10b981"
              strokeWidth="1.4"
            />
            <line
              x1="40"
              y1="41"
              x2="28"
              y2="48"
              stroke="#10b981"
              strokeWidth="1.4"
            />
            <line
              x1="40"
              y1="41"
              x2="28"
              y2="34"
              stroke="#10b981"
              strokeWidth="1.4"
            />
            <defs>
              <linearGradient id="splashDropGrad" x1="18" y1="9" x2="62" y2="71">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="splashRingGrad" x1="6" y1="6" x2="74" y2="74">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1
          className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-cyan-400"
          dir="ltr"
        >
          EcoBio AI
        </h1>

        {/* Subtle 2-Second Progress Indicator */}
        <div className="mt-6 w-40 h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full"
            style={{
              animation: 'ecobioSplashProgress 2s ease-out forwards',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes ecobioSplashProgress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};

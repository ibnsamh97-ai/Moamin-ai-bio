import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ArrowLeft, Bot, ShieldCheck } from 'lucide-react';

interface WelcomeSplash3DProps {
  isOpen: boolean;
  onEnterPlatform: () => void;
  onOpenSmartAssistant: () => void;
}

const _dummyMat = new THREE.Matrix4();
const _dummyVec = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyScale = new THREE.Vector3(1, 1, 1);

export const WelcomeSplash3D: React.FC<WelcomeSplash3DProps> = ({
  isOpen,
  onEnterPlatform,
  onOpenSmartAssistant,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen || !canvasMountRef.current) return;

    const container = canvasMountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030912);
    scene.fog = new THREE.FogExp2(0x030912, 0.042);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 12);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(
      isHeadless ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0x10b981, 0x0f172a, 1.3);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    dirLight.position.set(5, 8, 6);
    scene.add(dirLight);

    // InstancedMesh 1: 48 Floating Bio-Cellular Particles
    const bioCount = 48;
    const bioGeo = new THREE.IcosahedronGeometry(0.22, 1);
    const bioMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.25,
      metalness: 0.35,
    });
    const bioInstanced = new THREE.InstancedMesh(bioGeo, bioMat, bioCount);
    bioInstanced.frustumCulled = false;
    scene.add(bioInstanced);

    // InstancedMesh 2: 64 Water Molecules (H2O spheres)
    const waterCount = 64;
    const waterGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.15,
      metalness: 0.2,
    });
    const waterInstanced = new THREE.InstancedMesh(
      waterGeo,
      waterMat,
      waterCount
    );
    waterInstanced.frustumCulled = false;
    scene.add(waterInstanced);

    renderer.compile(scene, camera);

    const clock = new THREE.Clock();
    let animId = 0;
    let lastRender = 0;

    const animate = (nowMs: number) => {
      animId = requestAnimationFrame(animate);
      if (isHeadless && nowMs - lastRender < 70) return;
      lastRender = nowMs;

      const elapsed = clock.getElapsedTime();

      for (let i = 0; i < bioCount; i++) {
        const angle = i * 0.65 + elapsed * 0.18;
        const r = 3.6 + (i % 7) * 1.1;
        const y = ((i % 9) - 4) * 1.2 + Math.sin(elapsed * 0.7 + i) * 0.45;
        _dummyVec.set(Math.cos(angle) * r, y, Math.sin(angle) * r - 2.0);
        _dummyQuat.setFromAxisAngle(_dummyVec, elapsed * 0.4 + i);
        const s = 0.7 + (i % 4) * 0.22;
        _dummyScale.set(s, s, s);
        _dummyMat.compose(_dummyVec, _dummyQuat, _dummyScale);
        bioInstanced.setMatrixAt(i, _dummyMat);
      }
      bioInstanced.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < waterCount; i++) {
        const angle = -i * 0.48 - elapsed * 0.22;
        const r = 2.4 + (i % 8) * 1.15;
        const y = ((i % 11) - 5) * 1.0 + Math.cos(elapsed * 0.9 + i) * 0.35;
        _dummyVec.set(Math.cos(angle) * r, y, Math.sin(angle) * r - 1.5);
        _dummyQuat.identity();
        _dummyScale.set(1, 1, 1);
        _dummyMat.compose(_dummyVec, _dummyQuat, _dummyScale);
        waterInstanced.setMatrixAt(i, _dummyMat);
      }
      waterInstanced.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      bioGeo.dispose();
      bioMat.dispose();
      waterGeo.dispose();
      waterMat.dispose();
      renderer.dispose();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="شاشة الترحيب والهوية البصرية لمنصة EcoBio AI"
      data-testid="welcome-splash-3d"
    >
      {/* Full-Screen 3D WebGL Floating Bio-Particles & Water Molecules Canvas */}
      <div
        ref={canvasMountRef}
        className="fixed inset-0 pointer-events-none"
        data-testid="welcome-splash-canvas"
      />

      {/* Focused Iconic Brand Identity & Title Welcome Card */}
      <div
        style={{ backgroundColor: 'rgba(6, 15, 28, 0.90)' }}
        className="relative z-10 w-full max-w-3xl rounded-3xl border border-emerald-500/35 px-6 py-10 sm:px-12 sm:py-14 shadow-2xl text-center space-y-7 my-auto"
      >
        {/* Prominent Platform Brand Identity Emblem (شعار الهوية البصرية للمنصة) */}
        <div className="flex flex-col items-center space-y-3">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-900/95 border-2 border-emerald-400/50 flex items-center justify-center shadow-2xl">
            <svg
              viewBox="0 0 100 100"
              className="w-22 h-22 sm:w-24 sm:h-24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="شعار الهوية البصرية لمنصة EcoBio AI"
            >
              {/* Outer Scientific Orbital Ring */}
              <circle
                cx="50"
                cy="50"
                r="44"
                stroke="#06b6d4"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                opacity="0.65"
              />
              {/* Water Droplet Contour */}
              <path
                d="M50 10C50 10 22 40 22 61C22 76.464 34.536 89 50 89C65.464 89 78 76.464 78 61C78 40 50 10 50 10Z"
                stroke="#10b981"
                strokeWidth="3"
                fill="rgba(16, 185, 129, 0.14)"
              />
              {/* Hexagonal Bio-Cellular Membrane */}
              <polygon
                points="50,33 65,41.5 65,58.5 50,67 35,58.5 35,41.5"
                stroke="#38bdf8"
                strokeWidth="2.2"
                fill="rgba(6, 182, 212, 0.16)"
              />
              {/* AI Neural Lattice & Synaptic Core */}
              <line
                x1="50"
                y1="33"
                x2="50"
                y2="67"
                stroke="#34d399"
                strokeWidth="1.8"
              />
              <line
                x1="35"
                y1="41.5"
                x2="65"
                y2="58.5"
                stroke="#34d399"
                strokeWidth="1.8"
              />
              <line
                x1="65"
                y1="41.5"
                x2="35"
                y2="58.5"
                stroke="#34d399"
                strokeWidth="1.8"
              />
              <circle cx="50" cy="50" r="6" fill="#10b981" />
              <circle cx="50" cy="33" r="3" fill="#38bdf8" />
              <circle cx="65" cy="41.5" r="3" fill="#38bdf8" />
              <circle cx="65" cy="58.5" r="3" fill="#38bdf8" />
              <circle cx="50" cy="67" r="3" fill="#38bdf8" />
              <circle cx="35" cy="58.5" r="3" fill="#38bdf8" />
              <circle cx="35" cy="41.5" r="3" fill="#38bdf8" />
            </svg>
          </div>

          <span className="text-xs font-mono tracking-widest uppercase text-emerald-400 font-bold">
            ECOBIO AI · ENVIRONMENTAL BIOREMEDIATION SYSTEM
          </span>
        </div>

        {/* Platform Title & Academic Identity */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/35 text-emerald-300 text-xs sm:text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>
              جامعة تكريت — كلية التربية للعلوم الصرفة — قسم علوم الحياة
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-snug">
            EcoBio AI | النظام الذكي للمعالجة الحيوية ورصد التلوث البيئي
          </h1>

          <div className="pt-1">
            <p className="text-sm sm:text-base font-bold text-emerald-400">
              إعداد الباحث: مؤمن خلف عبدالله
            </p>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              قسم علوم الحياة / كلية التربية للعلوم الصرفة / جامعة تكريت
            </p>
          </div>
        </div>

        {/* Direct Entry Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
          <button
            type="button"
            onClick={onEnterPlatform}
            data-testid="enter-platform-btn"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2.5 shadow-lg transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>الدخول إلى المنصة الذكية</span>
            <ArrowLeft className="w-4 h-4 shrink-0" />
          </button>

          <button
            type="button"
            onClick={onOpenSmartAssistant}
            data-testid="splash-open-assistant-btn"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 text-sm font-bold flex items-center justify-center gap-2.5 shadow-lg transition-colors cursor-pointer"
          >
            <Bot className="w-4 h-4 shrink-0" />
            <span>محادثة وكيل المنصة الذكي</span>
          </button>
        </div>
      </div>
    </div>
  );
};

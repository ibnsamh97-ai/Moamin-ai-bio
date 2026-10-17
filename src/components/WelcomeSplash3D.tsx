import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  Activity,
  Box,
  Cpu,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

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
    scene.background = new THREE.Color(0x040b14);
    scene.fog = new THREE.FogExp2(0x040b14, 0.045);

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
    renderer.toneMappingExposure = 1.1;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0x10b981, 0x0f172a, 1.2);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    dirLight.position.set(5, 8, 6);
    scene.add(dirLight);

    // InstancedMesh 1: 48 Floating Bio-Cellular Particles
    const bioCount = 48;
    const bioGeo = new THREE.IcosahedronGeometry(0.22, 1);
    const bioMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.25,
      metalness: 0.35,
      wireframe: false,
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
        const r = 3.5 + (i % 7) * 1.1;
        const y = ((i % 9) - 4) * 1.25 + Math.sin(elapsed * 0.7 + i) * 0.45;
        _dummyVec.set(
          Math.cos(angle) * r,
          y,
          Math.sin(angle) * r - 2.0
        );
        _dummyQuat.setFromAxisAngle(_dummyVec, elapsed * 0.4 + i);
        const s = 0.7 + (i % 4) * 0.22;
        _dummyScale.set(s, s, s);
        _dummyMat.compose(_dummyVec, _dummyQuat, _dummyScale);
        bioInstanced.setMatrixAt(i, _dummyMat);
      }
      bioInstanced.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < waterCount; i++) {
        const angle = -i * 0.48 - elapsed * 0.22;
        const r = 2.2 + (i % 8) * 1.15;
        const y = ((i % 11) - 5) * 1.0 + Math.cos(elapsed * 0.9 + i) * 0.35;
        _dummyVec.set(
          Math.cos(angle) * r,
          y,
          Math.sin(angle) * r - 1.5
        );
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
      aria-label="شاشة الترحيب السينمائية لمنصة EcoBio AI"
      data-testid="welcome-splash-3d"
    >
      {/* Full-Screen 3D WebGL Floating Bio-Particles & Water Molecules Canvas */}
      <div
        ref={canvasMountRef}
        className="fixed inset-0 pointer-events-none"
        data-testid="welcome-splash-canvas"
      />

      {/* Foreground Content Container (Solid RGBA surface to avoid WebGL backdrop-filter stall) */}
      <div
        style={{ backgroundColor: 'rgba(6, 15, 28, 0.90)' }}
        className="relative z-10 w-full max-w-5xl rounded-2xl border border-emerald-500/30 p-6 sm:p-10 shadow-2xl my-auto"
      >
        {/* Top Geometric SVG Emblem + Institution Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Custom Geometric SVG Logo: Water Droplet + Cellular Structure + AI Neural Lattice */}
          <div className="w-20 h-20 rounded-2xl bg-emerald-950/90 border border-emerald-400/40 flex items-center justify-center shadow-lg">
            <svg
              viewBox="0 0 80 80"
              className="w-14 h-14 text-emerald-400"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Water Droplet Outer Contour */}
              <path
                d="M40 8C40 8 16 34 16 51C16 64.2548 26.7452 75 40 75C53.2548 75 64 64.2548 64 51C64 34 40 8 40 8Z"
                stroke="#10b981"
                strokeWidth="2.5"
                fill="rgba(16, 185, 129, 0.12)"
              />
              {/* Hexagonal Cellular Membrane */}
              <polygon
                points="40,26 53,33.5 53,48.5 40,56 27,48.5 27,33.5"
                stroke="#06b6d4"
                strokeWidth="2"
                fill="rgba(6, 182, 212, 0.15)"
              />
              {/* AI Neural Nodes & Synaptic Links */}
              <line
                x1="40"
                y1="26"
                x2="40"
                y2="56"
                stroke="#34d399"
                strokeWidth="1.5"
              />
              <line
                x1="27"
                y1="33.5"
                x2="53"
                y2="48.5"
                stroke="#34d399"
                strokeWidth="1.5"
              />
              <line
                x1="53"
                y1="33.5"
                x2="27"
                y2="48.5"
                stroke="#34d399"
                strokeWidth="1.5"
              />
              <circle cx="40" cy="41" r="5" fill="#10b981" />
              <circle cx="40" cy="26" r="2.5" fill="#38bdf8" />
              <circle cx="53" cy="33.5" r="2.5" fill="#38bdf8" />
              <circle cx="53" cy="48.5" r="2.5" fill="#38bdf8" />
              <circle cx="40" cy="56" r="2.5" fill="#38bdf8" />
              <circle cx="27" cy="48.5" r="2.5" fill="#38bdf8" />
              <circle cx="27" cy="33.5" r="2.5" fill="#38bdf8" />
            </svg>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-md bg-emerald-950/90 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>
              جامعة تكريت — كلية التربية للعلوم الصرفة — قسم علوم الحياة
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            منصة EcoBio AI | النظام الذكي للمعالجة الحيوية ورصد التلوث البيئي
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-slate-300">
            <span className="font-bold text-emerald-400">
              إعداد الباحث: مؤمن خلف عبدالله
            </span>
            <span aria-hidden="true">|</span>
            <span>قسم علوم الحياة / كلية التربية للعلوم الصرفة / جامعة تكريت</span>
            <span aria-hidden="true">|</span>
            <span className="text-cyan-300 font-semibold">
              إشراف: اللجنة العلمية المشرفة على مشاريع التخرج
            </span>
          </div>
        </div>

        {/* 3 Onboarding Guide Cards with Clean Geometric SVG Icons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
          {/* Card 1 */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-2.5 hover:border-emerald-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400">
                STEP 01
              </span>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <h2 className="text-sm font-bold text-white">
              1. إدخال القراءات والإحصاء الحيوي
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              إدخال تراكيز الملوثات بثلاث مكررات (R1, R2, R3) لحساب المتوسط
              الحسابي والانحراف المعياري (±SD) ومعنوية الفروق (ANOVA / t-test عند
              مستوى P ≤ 0.05) مع حاسبة المحاليل القياسية ومؤشر WQI وسعة الامتزاز
              (qe).
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-2.5 hover:border-cyan-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">
                STEP 02
              </span>
              <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Box className="w-5 h-5" />
              </div>
            </div>
            <h2 className="text-sm font-bold text-white">
              2. استكشاف المختبر ثلاثي الأبعاد
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              محاكاة جزيئية تفاعلية بزاوية 360 درجة (Three.js OrbitControls)
              تجسد امتزاز المعادن الثقيلة، وتدمير الخلايا البكتيرية، وتنقية
              العكورة على السطح المسامي للطحالب والفحم الحيوي.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-2.5 hover:border-teal-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-teal-400">
                STEP 03
              </span>
              <div className="w-9 h-9 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <Cpu className="w-5 h-5" />
              </div>
            </div>
            <h2 className="text-sm font-bold text-white">
              3. تخصيص وتدريب المساعد الذكي
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              توجيه المساعد الذكي على تخصص البحث وتغذيته بالبيانات مع محرك خبير
              بيئي داخلي (Built-In Scientific Expert Engine) يضمن التفسير العلمي
              وإصدار التقرير الأكاديمي المزود برمز QR دون انقطاع.
            </p>
          </div>
        </div>

        {/* Action Buttons without Emojis */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={onEnterPlatform}
            data-testid="enter-platform-btn"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2.5 shadow-lg transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>الدخول إلى المنصة الذكية</span>
            <ArrowLeft className="w-4 h-4 shrink-0" />
          </button>

          <button
            type="button"
            onClick={onOpenSmartAssistant}
            data-testid="splash-open-assistant-btn"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-cyan-700 hover:bg-cyan-600 border border-cyan-400/30 text-white text-sm font-bold flex items-center justify-center gap-2.5 shadow-lg transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>تشغيل وتخصيص المساعد الذكي</span>
          </button>
        </div>
      </div>
    </div>
  );
};

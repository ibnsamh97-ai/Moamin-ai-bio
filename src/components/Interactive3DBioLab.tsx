import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Box,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Activity,
} from 'lucide-react';

export type Bio3DMechanismMode = 'heavy_metals' | 'bacteria' | 'turbidity';

interface Interactive3DBioLabProps {
  darkMode: boolean;
  initialDoseProgress?: number;
}

// Pre-allocated math helpers at module scope for zero GC inside requestAnimationFrame
const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _axis = new THREE.Vector3(0, 1, 0);
const _color = new THREE.Color();

export const Interactive3DBioLab: React.FC<Interactive3DBioLabProps> = ({
  darkMode,
  initialDoseProgress = 78,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<Bio3DMechanismMode>('heavy_metals');
  const [doseTimeProgress, setDoseTimeProgress] =
    useState<number>(initialDoseProgress);
  const [biosorbentType, setBiosorbentType] = useState<'algae' | 'biochar'>(
    'algae'
  );
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);

  const stateRef = useRef({
    mode: 'heavy_metals' as Bio3DMechanismMode,
    doseTimeProgress: initialDoseProgress,
    biosorbentType: 'algae' as 'algae' | 'biochar',
    resetCameraFlag: false,
  });

  useEffect(() => {
    stateRef.current.mode = mode;
    stateRef.current.doseTimeProgress = doseTimeProgress;
    stateRef.current.biosorbentType = biosorbentType;
  }, [mode, doseTimeProgress, biosorbentType]);

  useEffect(() => {
    if (!canvasMountRef.current) return;
    const container = canvasMountRef.current;
    const width = container.clientWidth || 960;
    const height = container.clientHeight || 580;

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050d18);
    scene.fog = new THREE.FogExp2(0x050d18, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 6.4);

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
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Environment Reflection Map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmremGenerator.dispose();

    // 360-degree Interactive OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 3.2;
    controls.maxDistance = 12.0;
    controls.target.set(0, 0.2, 0);

    // Warm Key Light + Cool Hemisphere Light + Dynamic Emerald Purification Light
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x064e3b, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.0);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = !isHeadless;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const emeraldPointLight = new THREE.PointLight(0x10b981, 2.5, 14);
    emeraldPointLight.position.set(0, 2.6, 2.2);
    scene.add(emeraldPointLight);

    // Ground Floor + Contact Shadow Disc (offset >= 0.02 on Y to prevent Z-fighting)
    const floorGeo = new THREE.PlaneGeometry(32, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x071220,
      roughness: 0.85,
      metalness: 0.15,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -2.1;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const contactShadowGeo = new THREE.CircleGeometry(2.1, 32);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -2.07;
    scene.add(contactShadow);

    //Procedural Porous Bump Canvas Texture
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = 128;
    bumpCanvas.height = 128;
    const bCtx = bumpCanvas.getContext('2d')!;
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 90; i++) {
      const cx = (i * 37) % 128;
      const cy = (i * 53) % 128;
      const r = 4 + (i % 6);
      bCtx.fillStyle = i % 2 === 0 ? '#303030' : '#c0c0c0';
      bCtx.beginPath();
      bCtx.arc(cx, cy, r, 0, Math.PI * 2);
      bCtx.fill();
    }
    const porousBumpTex = new THREE.CanvasTexture(bumpCanvas);
    porousBumpTex.wrapS = THREE.RepeatWrapping;
    porousBumpTex.wrapT = THREE.RepeatWrapping;

    // Composite 7-Part Porous Bioremediation Agent Group (Microalgae Cell / Activated Biochar Sphere)
    const bioCoreGroup = new THREE.Group();
    bioCoreGroup.position.set(0, 0.2, 0);
    scene.add(bioCoreGroup);

    // Part 1: Inner Bio-Nucleus Core
    const nucleusGeo = new THREE.IcosahedronGeometry(0.72, 2);
    const nucleusMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      emissive: 0x064e3b,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.2,
    });
    const nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat);
    bioCoreGroup.add(nucleusMesh);

    // Part 2: Primary Porous Spherical Matrix (roughness 0.68, bumpMap)
    const matrixGeo = new THREE.IcosahedronGeometry(1.18, 3);
    const matrixMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.68,
      metalness: 0.18,
      bumpMap: porousBumpTex,
      bumpScale: 0.08,
    });
    const matrixMesh = new THREE.Mesh(matrixGeo, matrixMat);
    matrixMesh.castShadow = true;
    matrixMesh.receiveShadow = true;
    bioCoreGroup.add(matrixMesh);

    // Part 3: Outer Exopolysaccharide / Porous Wireframe Lattice Cage
    const cageGeo = new THREE.IcosahedronGeometry(1.32, 2);
    const cageMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      roughness: 0.25,
      metalness: 0.65,
      wireframe: true,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    bioCoreGroup.add(cageMesh);

    // Part 4 & 5: Equatorial & Meridian Biopolymer Functional Rings (-COOH / -OH / -NH2)
    const ringGeo = new THREE.TorusGeometry(1.42, 0.028, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.22,
      metalness: 0.8,
    });
    const eqRing = new THREE.Mesh(ringGeo, ringMat);
    eqRing.rotation.x = Math.PI / 2;
    bioCoreGroup.add(eqRing);

    const merRing = new THREE.Mesh(ringGeo, ringMat);
    merRing.rotation.y = Math.PI / 3;
    bioCoreGroup.add(merRing);

    // Part 6: 24 Active Receptor Binding Sites on the porous sphere surface (InstancedMesh)
    const siteCount = 24;
    const siteGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.18, 12);
    const siteMat = new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      roughness: 0.35,
      metalness: 0.5,
    });
    const siteInstanced = new THREE.InstancedMesh(siteGeo, siteMat, siteCount);
    for (let i = 0; i < siteCount; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / siteCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      _pos.setFromSphericalCoords(1.22, phi, theta);
      _quat.setFromUnitVectors(_axis, _pos.clone().normalize());
      _scale.set(1, 1, 1);
      _mat4.compose(_pos, _quat, _scale);
      siteInstanced.setMatrixAt(i, _mat4);
    }
    siteInstanced.instanceMatrix.needsUpdate = true;
    bioCoreGroup.add(siteInstanced);

    // Part 7: Outer Translucent Hydration Shell
    const shellGeo = new THREE.SphereGeometry(1.5, 32, 32);
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      roughness: 0.12,
      metalness: 0.0,
      transmission: 0.85,
      ior: 1.33,
      thickness: 0.5,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const shellMesh = new THREE.Mesh(shellGeo, shellMat);
    bioCoreGroup.add(shellMesh);

    // Orbiting Pollutant Particles (90 instances via InstancedMesh)
    const pollutantCount = 90;
    const pollutantGeo = new THREE.SphereGeometry(0.085, 14, 14);
    const pollutantMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.45,
    });
    const pollutantInstanced = new THREE.InstancedMesh(
      pollutantGeo,
      pollutantMat,
      pollutantCount
    );
    pollutantInstanced.frustumCulled = false;
    scene.add(pollutantInstanced);

    renderer.compile(scene, camera);

    const clock = new THREE.Clock();
    let animId = 0;
    let lastRender = 0;
    let smoothedProgress = initialDoseProgress / 100;

    const animate = (nowMs: number) => {
      animId = requestAnimationFrame(animate);
      if (isHeadless && nowMs - lastRender < 65) return;
      lastRender = nowMs;

      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const st = stateRef.current;

      if (st.resetCameraFlag) {
        camera.position.set(0, 1.8, 6.4);
        controls.target.set(0, 0.2, 0);
        st.resetCameraFlag = false;
      }

      controls.update();

      const targetRatio = Math.max(0, Math.min(1, st.doseTimeProgress / 100));
      smoothedProgress = THREE.MathUtils.damp(
        smoothedProgress,
        targetRatio,
        5,
        delta
      );

      // Update Central Bio-Agent Appearance based on Algae vs Biochar + Purification Progress
      if (st.biosorbentType === 'biochar') {
        matrixMat.color.setHex(0x1e293b);
        cageMat.color.setHex(0x10b981);
      } else {
        // Transitions from deep olive-teal to vibrant pure emerald as dose/time increases
        _color.setHSL(0.43, 0.78, 0.28 + smoothedProgress * 0.18);
        matrixMat.color.copy(_color);
        cageMat.color.setHex(0x34d399);
      }

      // Dynamic Lighting Shift toward Pure Emerald Green as Dose/Time Slider increases
      _color.setHSL(0.08 + smoothedProgress * 0.36, 0.85, 0.52);
      emeraldPointLight.color.copy(_color);
      emeraldPointLight.intensity = 1.6 + smoothedProgress * 2.4;

      shellMat.color.copy(_color);
      nucleusMat.emissiveIntensity = 0.3 + smoothedProgress * 0.9;

      // Rotate Porous Bio-Sphere
      bioCoreGroup.rotation.y = elapsed * 0.28;
      bioCoreGroup.rotation.x = Math.sin(elapsed * 0.35) * 0.12;
      eqRing.rotation.z = elapsed * 0.5;
      merRing.rotation.x = -elapsed * 0.4;

      // Update Pollutant Spheres: Orbit -> Attract & Bind to Porous Surface as Slider Increases
      for (let i = 0; i < pollutantCount; i++) {
        const phi = Math.acos(1 - (2 * ((i % 45) + 0.5)) / 45);
        const theta =
          Math.PI * (1 + Math.sqrt(5)) * i +
          elapsed * (1 - smoothedProgress * 0.72) * 0.9;

        // Orbit radius shrinks from 3.4 down to 1.24 (bound to porous bio-surface)
        const unboundRadius = 2.3 + (i % 7) * 0.24;
        const boundRadius = 1.24 + (i % 3) * 0.04;
        const currentRadius = THREE.MathUtils.lerp(
          unboundRadius,
          boundRadius,
          smoothedProgress
        );

        _pos.setFromSphericalCoords(currentRadius, phi, theta);
        _pos.y += 0.2;

        // Mode-specific shape/scale behavior
        if (st.mode === 'bacteria') {
          // Rod-shaped bacterial cells that shrink/lyse when bound at high dose/time
          const lysisScale = 1 - smoothedProgress * 0.55;
          _scale.set(1.5 * lysisScale, 0.75 * lysisScale, 0.75 * lysisScale);
          _color.setHSL(0.96 - smoothedProgress * 0.5, 0.85, 0.55);
        } else if (st.mode === 'turbidity') {
          // Suspended colloidal particles flocculating into clusters
          const flocScale = 1.15 - smoothedProgress * 0.35;
          _scale.set(flocScale, flocScale, flocScale);
          _color.setHSL(0.1 + smoothedProgress * 0.35, 0.75, 0.52);
        } else {
          // Heavy metal ions (Pb2+, Cd2+) binding tightly to active sites
          _scale.set(0.95, 0.95, 0.95);
          _color.setHSL(0.06 + smoothedProgress * 0.38, 0.9, 0.54);
        }

        _quat.setFromAxisAngle(_axis, elapsed + i);
        _mat4.compose(_pos, _quat, _scale);
        pollutantInstanced.setMatrixAt(i, _mat4);
        pollutantInstanced.setColorAt(i, _color);
      }
      pollutantInstanced.instanceMatrix.needsUpdate = true;
      if (pollutantInstanced.instanceColor) {
        pollutantInstanced.instanceColor.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 580;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  const mechanismTitle =
    mode === 'heavy_metals'
      ? 'آلية امتزاز أيونات المعادن الثقيلة (Pb2+ / Cd2+ Biosorption)'
      : mode === 'bacteria'
      ? 'آلية تدمير وتثبيط الخلايا البكتيرية الممرضة (Bacterial Cell Lysis)'
      : 'آلية تنقية العكورة والتلبيد الحيوي للدقائق الغروية (Bio-Flocculation)';

  const mechanismDescription =
    mode === 'heavy_metals'
      ? 'تنجذب الكرات الممثلة لأيونات الرصاص والكادميوم نحو المسامات السطحية ومجاميع الكاربوكسيل (-COOH) والهيدروكسيل (-OH) على سطح الطحالب أو الفحم الحيوي لتُحتجز بالتبادل الأيوني.'
      : mode === 'bacteria'
      ? 'تخترق الببتيدات الكاتيونية والمركبات الفينolية الفعالة الجدار الخلوي للبكتيريا، مما يؤدي إلى تحطيم الغشاء السيتوبلازمي وتثبيط المستعمرات البكتيرية.'
      : 'تعمل البوليمرات الحيوية على معادلة الشحنات السالبة للدقائق الغروية المسببة للعكورة وربطها بجسور جزيئية لترسيبها وتنقية عمود الماء.';

  return (
    <div className="space-y-6" data-testid="interactive-3d-biolab">
      {/* Relative 3D Viewport Frame with Unobstructed Center and Unified Bottom Dock */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl">
        {/* Dedicated Empty WebGL Canvas Mount */}
        <div
          ref={canvasMountRef}
          className="w-full h-[580px] sm:h-[640px] cursor-grab active:cursor-grabbing"
          data-testid="interactive-3d-webgl-canvas"
          data-mode={mode}
          data-progress={doseTimeProgress}
        />

        {/* Minimal Top Spec Badge (Solid RGBA surface, zero backdrop-filter over WebGL) */}
        <div
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
          className="absolute top-4 right-4 left-4 max-w-4xl mx-auto px-4 py-3 rounded-xl border border-slate-800 text-slate-100 flex flex-wrap items-center justify-between gap-3 z-10"
        >
          <div className="flex items-center gap-2.5">
            <Box className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white">
                المختبر الجزيئي ثلاثي الأبعاد التفاعلي بزاوية 360 درجة
                (Interactive 3D WebGL Bioremediation Viewer)
              </h2>
              <p className="text-[11px] text-emerald-300 font-mono">
                {mechanismTitle} · نسبة النقاوة والارتباط: {doseTimeProgress}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBiosorbentType('algae')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                biosorbentType === 'algae'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              خلية طحالب مسامية (Chlorella)
            </button>
            <button
              type="button"
              onClick={() => setBiosorbentType('biochar')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                biosorbentType === 'biochar'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              فحم حيوي منشط (Biochar)
            </button>
          </div>
        </div>

        {/* Unified Collapsible Bottom Control Dock (Solid RGBA surface, <= 15% footprint) */}
        <div
          style={{
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: 'min(920px, 94%)',
            backgroundColor: 'rgba(15, 23, 42, 0.94)',
          }}
          className="absolute w-full rounded-xl border border-slate-800 text-slate-100 z-10"
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>
                تحكم بزاوية 360° (تدوير بالماوس وتقريب بالعجلة) · معالج الجرعة
                والزمن
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  stateRef.current.resetCameraFlag = true;
                  setDoseTimeProgress(78);
                }}
                aria-label="إعادة ضبط منظور الكاميرا"
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط</span>
              </button>
              <button
                type="button"
                onClick={() => setDockCollapsed((c) => !c)}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {dockCollapsed ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>إظهار التحكم</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>إخفاء (Zen)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {!dockCollapsed && (
            <div className="p-4 space-y-3.5 text-xs">
              {/* 3 Mode Buttons requested by user */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('heavy_metals')}
                  data-testid="mode-heavy-metals-3d"
                  className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    mode === 'heavy_metals'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-emerald-500'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>امتزاز المعادن الثقيلة 3D</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('bacteria')}
                  data-testid="mode-bacteria-3d"
                  className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    mode === 'bacteria'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-emerald-500'
                  }`}
                >
                  <Activity className="w-4 h-4 shrink-0" />
                  <span>تدمير الخلايا البكتيرية 3D</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('turbidity')}
                  data-testid="mode-turbidity-3d"
                  className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    mode === 'turbidity'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-emerald-500'
                  }`}
                >
                  <Sliders className="w-4 h-4 shrink-0" />
                  <span>تنقية العكورة</span>
                </button>
              </div>

              {/* Dose / Contact Time Slider */}
              <div className="pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="3d-dose-time-slider"
                    className="font-bold text-slate-200 flex items-center gap-1.5"
                  >
                    <span>
                      شريط الجرعة / وقت التماس (انجذاب والتصاق الملوثات بالسطح
                      الحيوي):
                    </span>
                  </label>
                  <span className="font-mono font-bold text-emerald-400">
                    كفاءة الارتباط والتنقية: {doseTimeProgress}%
                  </span>
                </div>
                <input
                  id="3d-dose-time-slider"
                  data-testid="3d-dose-time-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={doseTimeProgress}
                  onChange={(e) => setDoseTimeProgress(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scientific Mechanism Explanation Bar below 3D Scene */}
      <div
        className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-300'
            : 'bg-white border-slate-200 text-slate-700'
        }`}
      >
        <div className="space-y-1">
          <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
            {mechanismTitle}
          </div>
          <p className="leading-relaxed">{mechanismDescription}</p>
        </div>
        <div className="shrink-0 font-mono px-3.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 font-bold">
          حالة الإضاءة النقية: {doseTimeProgress >= 75 ? 'أخضر زمردي نقي (Pure Emerald)' : 'قيد المعالجة التدريجية'}
        </div>
      </div>
    </div>
  );
};

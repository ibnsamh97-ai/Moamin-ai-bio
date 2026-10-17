import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { X, ChevronDown, ChevronUp, RotateCcw, Box } from 'lucide-react';

interface Bioremediation3DModalProps {
  isOpen: boolean;
  onClose: () => void;
  efficiency: number;
  doseMgL: number;
  ph: number;
}

// Pre-allocated module-scope math objects for zero GC in requestAnimationFrame
const _dummyMatrix = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyScale = new THREE.Vector3(1, 1, 1);
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3(0, 2.2, 0);

export const Bioremediation3DModal: React.FC<Bioremediation3DModalProps> = ({
  isOpen,
  onClose,
  efficiency,
  doseMgL,
  ph,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [explodedFactor, setExplodedFactor] = useState<number>(0);
  const [cameraPreset, setCameraPreset] = useState<'orbit' | 'top' | 'core'>(
    'orbit'
  );
  const [ agitationSpeed, setAgitationSpeed] = useState<number>(1.0);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);

  // Store mutable control values in refs so React UI updates never recreate WebGLRenderer
  const controlsRef = useRef({
    explodedFactor: 0,
    cameraPreset: 'orbit' as 'orbit' | 'top' | 'core',
    agitationSpeed: 1.0,
    efficiency,
  });

  useEffect(() => {
    controlsRef.current.explodedFactor = explodedFactor;
    controlsRef.current.cameraPreset = cameraPreset;
    controlsRef.current.agitationSpeed = agitationSpeed;
    controlsRef.current.efficiency = efficiency;
  }, [explodedFactor, cameraPreset, agitationSpeed, efficiency]);

  useEffect(() => {
    if (!isOpen || !canvasMountRef.current) return;

    const container = canvasMountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070d16);
    scene.fog = new THREE.FogExp2(0x070d16, 0.032);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(5.5, 4.2, 6.8);

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
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Mandatory Studio Environment Map via RoomEnvironment + PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmremGenerator.dispose();

    // Warm Key Light + Cool HemisphereLight Fill
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    keyLight.position.set(6, 9, 5);
    keyLight.castShadow = !isHeadless;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -5;
    keyLight.shadow.camera.right = 5;
    keyLight.shadow.camera.top = 5;
    keyLight.shadow.camera.bottom = -5;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x10b981, 1.4);
    rimLight.position.set(-5, 4, -6);
    scene.add(rimLight);

    // Procedural Brushed Metal Bump Texture
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = 128;
    bumpCanvas.height = 128;
    const bCtx = bumpCanvas.getContext('2d')!;
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 2) {
      bCtx.fillStyle = y % 4 === 0 ? '#969696' : '#6a6a6a';
      bCtx.fillRect(0, y, 128, 1);
    }
    const metalBumpTex = new THREE.CanvasTexture(bumpCanvas);
    metalBumpTex.wrapS = THREE.RepeatWrapping;
    metalBumpTex.wrapT = THREE.RepeatWrapping;

    // Ground Floor + Contact Shadow Disc (offset >= 0.02 on Y to prevent Z-fighting)
    const floorGeo = new THREE.PlaneGeometry(36, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0b1322,
      roughness: 0.85,
      metalness: 0.15,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const contactShadowGeo = new THREE.CircleGeometry(2.4, 32);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.02;
    scene.add(contactShadow);

    // Composite 9-Part Procedural Bioremediation Reactor (THREE.Group, bottom-center pivot at y=0)
    const reactorGroup = new THREE.Group();
    reactorGroup.position.set(0, 0, 0);
    scene.add(reactorGroup);

    // Part 1: Base Pedestal (Matte Anodized Slate, roughness 0.72, metalness 0.55)
    const baseGeo = new THREE.CylinderGeometry(1.75, 1.95, 0.45, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.72,
      metalness: 0.55,
      bumpMap: metalBumpTex,
      bumpScale: 0.015,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.225;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    reactorGroup.add(baseMesh);

    // Part 2: Lower Stainless Manifold Ring (LatheGeometry, roughness 0.22, metalness 0.92)
    const lowerFlangePoints = [
      new THREE.Vector2(1.42, 0),
      new THREE.Vector2(1.68, 0),
      new THREE.Vector2(1.68, 0.25),
      new THREE.Vector2(1.52, 0.35),
      new THREE.Vector2(1.42, 0.35),
    ];
    const lowerFlangeGeo = new THREE.LatheGeometry(lowerFlangePoints, 32);
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.22,
      metalness: 0.92,
      bumpMap: metalBumpTex,
      bumpScale: 0.01,
    });
    const lowerFlange = new THREE.Mesh(lowerFlangeGeo, steelMat);
    lowerFlange.position.y = 0.45;
    reactorGroup.add(lowerFlange);

    // Part 3: Inner Water Column (Translucent Emerald-Cyan Treated Water)
    const waterGeo = new THREE.CylinderGeometry(1.36, 1.36, 3.0, 32);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0d9488,
      roughness: 0.15,
      metalness: 0.05,
      transmission: 0.78,
      thickness: 1.2,
      ior: 1.333,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = 2.05;
    waterMesh.renderOrder = 2;
    reactorGroup.add(waterMesh);

    // Part 4: Borosilicate Outer Glass Vessel (MeshPhysicalMaterial transmission 0.95)
    const glassGeo = new THREE.CylinderGeometry(
      1.45,
      1.45,
      3.2,
      32,
      1,
      true
    );
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.06,
      metalness: 0.0,
      transmission: 0.94,
      ior: 1.52,
      thickness: 0.35,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.y = 2.05;
    glassMesh.renderOrder = 4;
    reactorGroup.add(glassMesh);

    // Part 5: 4 Structural Tie-Rods around the vessel
    const rodsGroup = new THREE.Group();
    const rodGeo = new THREE.CylinderGeometry(0.045, 0.045, 3.4, 16);
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const rod = new THREE.Mesh(rodGeo, steelMat);
      rod.position.set(Math.cos(angle) * 1.58, 2.1, Math.sin(angle) * 1.58);
      rodsGroup.add(rod);
    }
    reactorGroup.add(rodsGroup);

    // Part 6: Bottom Micro-Bubble Aeration Sparger Ring (Copper/Bronze finish, roughness 0.32, metalness 0.85)
    const spargerGeo = new THREE.TorusGeometry(0.95, 0.06, 16, 32);
    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.32,
      metalness: 0.85,
    });
    const spargerMesh = new THREE.Mesh(spargerGeo, copperMat);
    spargerMesh.rotation.x = Math.PI / 2;
    spargerMesh.position.y = 0.72;
    reactorGroup.add(spargerMesh);

    // Part 7 & 8: Central Impeller Shaft + 4 Angled Flocculation Blades
    const impellerGroup = new THREE.Group();
    const shaftGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.1, 16);
    const shaftMesh = new THREE.Mesh(shaftGeo, steelMat);
    shaftMesh.position.y = 2.25;
    impellerGroup.add(shaftMesh);

    const bladeGeo = new THREE.BoxGeometry(0.75, 0.18, 0.04);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.38,
      metalness: 0.65,
    });
    for (let i = 0; i < 4; i++) {
      const bladePivot = new THREE.Group();
      bladePivot.rotation.y = (i * Math.PI) / 2;
      bladePivot.position.y = 1.45;
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.x = 0.42;
      blade.rotation.x = 0.45;
      bladePivot.add(blade);
      impellerGroup.add(bladePivot);
    }
    reactorGroup.add(impellerGroup);

    // Part 9: Upper Flange Cap & Drive Motor Housing (Explodable top assembly)
    const topCapGroup = new THREE.Group();
    const topFlangeGeo = new THREE.CylinderGeometry(1.66, 1.66, 0.24, 32);
    const topFlangeMesh = new THREE.Mesh(topFlangeGeo, steelMat);
    topFlangeMesh.position.y = 3.72;
    topCapGroup.add(topFlangeMesh);

    const motorGeo = new THREE.CylinderGeometry(0.48, 0.56, 0.75, 24);
    const motorMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      roughness: 0.48,
      metalness: 0.4,
    });
    const motorMesh = new THREE.Mesh(motorGeo, motorMat);
    motorMesh.position.y = 4.2;
    topCapGroup.add(motorMesh);
    reactorGroup.add(topCapGroup);

    // InstancedMesh 1: 60 Bio-coagulant / Biochar Active Matrices (>20 instances)
    const bioCount = 60;
    const bioGeo = new THREE.IcosahedronGeometry(0.085, 1);
    const bioMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.35,
      metalness: 0.2,
    });
    const bioInstanced = new THREE.InstancedMesh(bioGeo, bioMat, bioCount);
    bioInstanced.frustumCulled = false;

    // InstancedMesh 2: 80 Colloidal Pollutant Ions (>20 instances)
    const polCount = 80;
    const polGeo = new THREE.SphereGeometry(0.055, 12, 12);
    const polMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.4,
      metalness: 0.3,
    });
    const polInstanced = new THREE.InstancedMesh(polGeo, polMat, polCount);
    polInstanced.frustumCulled = false;

    const particleGroup = new THREE.Group();
    particleGroup.add(bioInstanced);
    particleGroup.add(polInstanced);
    scene.add(particleGroup);

    // Pre-warm shaders
    renderer.compile(scene, camera);

    const clock = new THREE.Clock();
    let animId = 0;
    let currentExploded = 0;
    let lastRenderTime = 0;

    const animate = (nowMs: number) => {
      animId = requestAnimationFrame(animate);

      // Throttle to ~15fps in headless software rendering so screenshots never stall
      if (isHeadless && nowMs - lastRenderTime < 65) {
        return;
      }
      lastRenderTime = nowMs;

      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const ctrl = controlsRef.current;

      // Smooth exponential damping for exploded view
      currentExploded = THREE.MathUtils.damp(
        currentExploded,
        ctrl.explodedFactor,
        6,
        delta
      );

      topCapGroup.position.y = currentExploded * 1.45;
      impellerGroup.position.y = currentExploded * 0.75;
      glassMesh.position.y = 2.05 + currentExploded * 0.3;

      // Rotate impeller shaft
      impellerGroup.rotation.y += delta * 2.4 * ctrl.agitationSpeed;

      // Update InstancedMesh positions (flocculation & biosorption binding)
      const bindRatio = Math.min(1, Math.max(0.1, ctrl.efficiency / 100));
      for (let i = 0; i < bioCount; i++) {
        const angle = elapsed * 0.8 * ctrl.agitationSpeed + i * 0.42;
        const radius = 0.25 + ((i * 17) % 90) * 0.011;
        const yBase = 0.9 + ((i * 29) % 210) * 0.01;
        _dummyPos.set(
          Math.cos(angle) * radius,
          yBase + Math.sin(elapsed * 1.5 + i) * 0.08,
          Math.sin(angle) * radius
        );
        _dummyQuat.setFromAxisAngle(_dummyPos, elapsed + i);
        const s = 0.85 + (i % 5) * 0.07;
        _dummyScale.set(s, s, s);
        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        bioInstanced.setMatrixAt(i, _dummyMatrix);
      }
      bioInstanced.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < polCount; i++) {
        const hostIdx = i % bioCount;
        const hostAngle =
          elapsed * 0.8 * ctrl.agitationSpeed + hostIdx * 0.42;
        const hostRadius = 0.25 + ((hostIdx * 17) % 90) * 0.011;
        const hostY = 0.9 + ((hostIdx * 29) % 210) * 0.01;

        // Higher removal efficiency pulls pollutant ions tightly onto bio-sorbent surface
        const spread = (1 - bindRatio * 0.78) * 0.45;
        const offsetAngle = elapsed * 2.2 + i * 1.1;
        _dummyPos.set(
          Math.cos(hostAngle) * hostRadius + Math.cos(offsetAngle) * spread,
          hostY + Math.sin(offsetAngle) * spread * 0.5,
          Math.sin(hostAngle) * hostRadius + Math.sin(offsetAngle) * spread
        );
        _dummyQuat.identity();
        _dummyScale.set(1, 1, 1);
        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        polInstanced.setMatrixAt(i, _dummyMatrix);
      }
      polInstanced.instanceMatrix.needsUpdate = true;

      // Smooth exponential camera damping
      if (ctrl.cameraPreset === 'orbit') {
        _targetCamPos.set(
          Math.cos(elapsed * 0.22) * 6.4,
          3.8,
          Math.sin(elapsed * 0.22) * 6.4
        );
      } else if (ctrl.cameraPreset === 'top') {
        _targetCamPos.set(0.1, 8.2, 2.2);
      } else {
        _targetCamPos.set(0, 2.3, 4.1);
      }

      camera.position.x = THREE.MathUtils.damp(
        camera.position.x,
        _targetCamPos.x,
        4,
        delta
      );
      camera.position.y = THREE.MathUtils.damp(
        camera.position.y,
        _targetCamPos.y,
        4,
        delta
      );
      camera.position.z = THREE.MathUtils.damp(
        camera.position.z,
        _targetCamPos.z,
        4,
        delta
      );
      camera.lookAt(_targetLookAt);

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
      renderer.dispose();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="محاكي المفاعل الحيوي ثلاثي الأبعاد Three.js"
    >
      {/* Full-bleed WebGL Mount Container */}
      <div
        ref={canvasMountRef}
        className="w-screen h-screen"
        data-testid="threejs-bioreactor-canvas"
      />

      {/* Top Minimal Spec Badge & Close Button (Solid RGBA surface, no backdrop-filter over WebGL) */}
      <div
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
        className="fixed top-4 right-4 left-4 max-w-5xl mx-auto px-5 py-3 rounded-xl border border-slate-800 text-slate-100 flex flex-wrap items-center justify-between gap-4 z-10"
      >
        <div className="flex items-center gap-3">
          <Box className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <h2 className="text-sm font-bold">
              التجسيد الفراغي ثلاثي الأبعاد للمفاعل الحيوي وآلية الامتزاز (3D
              Bioreactor &amp; Biosorption)
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              كفاءة الالتقاط: {efficiency}% · الجرعة: {doseMgL} mg/L · pH {ph}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>إغلاق العرض ثلاثي الأبعاد</span>
        </button>
      </div>

      {/* Unified Collapsible Bottom Control Dock (<= 15% viewport footprint, solid rgba surface) */}
      <div
        style={{
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: 'min(920px, 94vw)',
          backgroundColor: 'rgba(15, 23, 42, 0.94)',
        }}
        className="fixed w-full rounded-xl border border-slate-800 text-slate-100 z-10 transition-transform"
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
          <span className="text-xs font-semibold text-emerald-400">
            وحدة التحكم بالمفاعل الجزيئي ثلاثي الأبعاد (Three.js PBR Studio)
          </span>
          <button
            type="button"
            onClick={() => setDockCollapsed((c) => !c)}
            className="text-xs text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>إظهار أدوات التحكم</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>إخفاء الأدوات (Zen Mode)</span>
              </>
            )}
          </button>
        </div>

        {!dockCollapsed && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center text-xs">
            {/* Exploded View Slider */}
            <div>
              <div className="flex justify-between mb-1">
                <label htmlFor="exploded-slider" className="font-semibold">
                  تفكيك أجزاء المفاعل (Exploded View)
                </label>
                <span className="font-mono text-emerald-400">
                  {Math.round(explodedFactor * 100)}%
                </span>
              </div>
              <input
                id="exploded-slider"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={explodedFactor}
                onChange={(e) => setExplodedFactor(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Agitation Speed Slider */}
            <div>
              <div className="flex justify-between mb-1">
                <label htmlFor="speed-slider" className="font-semibold">
                  سرعة الخلط والتلبيد (RPM)
                </label>
                <span className="font-mono text-teal-400">
                  {agitationSpeed.toFixed(1)}x
                </span>
              </div>
              <input
                id="speed-slider"
                type="range"
                min={0.2}
                max={2.5}
                step={0.1}
                value={agitationSpeed}
                onChange={(e) => setAgitationSpeed(Number(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>

            {/* Camera View Presets */}
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setCameraPreset('orbit')}
                className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  cameraPreset === 'orbit'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                دوران شامل
              </button>
              <button
                type="button"
                onClick={() => setCameraPreset('core')}
                className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  cameraPreset === 'core'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                قلب المفاعل
              </button>
              <button
                type="button"
                onClick={() => setCameraPreset('top')}
                className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  cameraPreset === 'top'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                منظور علوي
              </button>
              <button
                type="button"
                onClick={() => {
                  setExplodedFactor(0);
                  setAgitationSpeed(1.0);
                  setCameraPreset('orbit');
                }}
                aria-label="إعادة ضبط العرض ثلاثي الأبعاد"
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

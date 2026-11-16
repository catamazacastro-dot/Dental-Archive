import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ATLAS_VISTA_INICIAL,
  type AtlasVistaPreset,
  resolveCraneoEstructura,
  type CraneoEstructuraInfo,
} from '../data/craneoAtlasData';

export interface LoadedMeshRecord {
  key: string;
  rawName: string;
  structureId: string | null;
  fmaId: string | null;
  info: CraneoEstructuraInfo | null;
  vertexCount: number;
  center: [number, number, number];
  boundingDirection: [number, number, number];
}

export interface AtlasModelSummary {
  sourceLabel: string;
  meshCount: number;
  isSingleMesh: boolean;
  meshes: LoadedMeshRecord[];
}

export interface AtlasSkullCanvasHandle {
  applyPresetView: (preset: AtlasVistaPreset) => void;
  resetView: () => void;
  zoomBy: (factor: number) => void;
  focusStructure: (meshKey: string) => void;
}

export interface AtlasSkullCanvasProps {
  modelSource:
    | { kind: 'url'; url: string; label: string }
    | { kind: 'buffer'; buffer: ArrayBuffer; label: string; basePath?: string };
  selectedKey: string | null;
  hoveredKey: string | null;
  hiddenKeys: string[];
  isolatedKey: string | null;
  translucentContext: boolean;
  examHighlightKey?: string | null;
  examResultState?: 'idle' | 'correct' | 'incorrect';
  examWrongKey?: string | null;
  onSelectMesh: (meshKey: string | null) => void;
  onHoverMesh: (meshKey: string | null) => void;
  onModelLoaded: (summary: AtlasModelSummary) => void;
  onModelError: (message: string) => void;
}

interface MeshEntry {
  key: string;
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  baseColor: THREE.Color;
  center: THREE.Vector3;
  radius: number;
}

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _box3 = new THREE.Box3();
const _pointer = new THREE.Vector2();

function detectSoftwareWebGL(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (!dbg) return false;
    const info = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
    return /swiftshader|llvmpipe|softpipe|microsoft basic/i.test(info);
  } catch {
    return false;
  }
}

function createSoftShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
    grad.addColorStop(0, 'rgba(62, 39, 34, 0.22)');
    grad.addColorStop(0.55, 'rgba(62, 39, 34, 0.08)');
    grad.addColorStop(1, 'rgba(62, 39, 34, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const AtlasSkullCanvas = React.forwardRef<
  AtlasSkullCanvasHandle,
  AtlasSkullCanvasProps
>(
  (
    {
      modelSource,
      selectedKey,
      hoveredKey,
      hiddenKeys,
      isolatedKey,
      translucentContext,
      examHighlightKey = null,
      examResultState = 'idle',
      examWrongKey = null,
      onSelectMesh,
      onHoverMesh,
      onModelLoaded,
      onModelError,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [loadingProgress, setLoadingProgress] = useState<number | null>(0);
    const [webglLost, setWebglLost] = useState(false);
    const [webglUnavailable, setWebglUnavailable] = useState(false);
    const [canvasEpoch, setCanvasEpoch] = useState(0);

    // Bridge props & callbacks via refs to avoid recreating WebGLRenderer
    const callbacksRef = useRef({
      onSelectMesh,
      onHoverMesh,
      onModelLoaded,
      onModelError,
    });
    callbacksRef.current = {
      onSelectMesh,
      onHoverMesh,
      onModelLoaded,
      onModelError,
    };

    const visualStateRef = useRef({
      selectedKey,
      hoveredKey,
      hiddenSet: new Set(hiddenKeys),
      isolatedKey,
      translucentContext,
      examHighlightKey,
      examResultState,
      examWrongKey,
    });
    visualStateRef.current = {
      selectedKey,
      hoveredKey,
      hiddenSet: new Set(hiddenKeys),
      isolatedKey,
      translucentContext,
      examHighlightKey,
      examResultState,
      examWrongKey,
    };

    const engineRef = useRef<{
      scene: THREE.Scene;
      camera: THREE.PerspectiveCamera;
      renderer: THREE.WebGLRenderer;
      controls: OrbitControls;
      modelGroup: THREE.Group;
      shadowDisc: THREE.Mesh;
      entries: MeshEntry[];
      entryByKey: Map<string, MeshEntry>;
      modelRadius: number;
      isSoftwareGl: boolean;
      transition: {
        active: boolean;
        camPos: THREE.Vector3;
        target: THREE.Vector3;
      };
      requestRender: () => void;
      applyVisualState: () => void;
      disposeLoadedModel: () => void;
      loader: GLTFLoader;
    } | null>(null);

    // Imperative camera / view methods
    useImperativeHandle(
      ref,
      () => ({
        applyPresetView(preset: AtlasVistaPreset) {
          const eng = engineRef.current;
          if (!eng) return;
          const dir = _vec3A.set(preset.direction[0], preset.direction[1], preset.direction[2]).normalize();
          const dist = eng.modelRadius * (preset.distanciaFactor || 1.95) * 1.45;
          eng.transition.target.set(0, 0, 0);
          eng.transition.camPos.copy(dir).multiplyScalar(dist);
          eng.transition.active = true;
          eng.requestRender();
        },
        resetView() {
          const eng = engineRef.current;
          if (!eng) return;
          const preset = ATLAS_VISTA_INICIAL;
          const dir = _vec3A
            .set(preset.direction[0], preset.direction[1], preset.direction[2])
            .normalize();
          const dist = eng.modelRadius * (preset.distanciaFactor || 1.92) * 1.45;
          eng.transition.target.set(0, 0, 0);
          eng.transition.camPos.copy(dir).multiplyScalar(dist);
          eng.transition.active = true;
          eng.requestRender();
        },
        zoomBy(factor: number) {
          const eng = engineRef.current;
          if (!eng) return;
          eng.transition.active = false;
          _vec3A.copy(eng.camera.position).sub(eng.controls.target);
          const currentLen = _vec3A.length();
          const nextLen = THREE.MathUtils.clamp(
            currentLen * factor,
            eng.controls.minDistance,
            eng.controls.maxDistance
          );
          _vec3A.normalize().multiplyScalar(nextLen);
          eng.camera.position.copy(eng.controls.target).add(_vec3A);
          eng.controls.update();
          eng.requestRender();
        },
        focusStructure(meshKey: string) {
          const eng = engineRef.current;
          if (!eng) return;
          const entry = eng.entryByKey.get(meshKey);
          if (!entry) return;
          _vec3A.copy(entry.center);
          // Direction from skull origin to bone center (fallback to anterior-upper if near origin like sphenoid/vomer)
          if (_vec3A.lengthSq() < 0.04) {
            _vec3A.set(0.35, 0.18, 0.92);
          }
          _vec3A.normalize();
          const dist = Math.max(eng.modelRadius * 1.8, entry.radius * 3.2);
          eng.transition.target.copy(entry.center).multiplyScalar(0.55);
          eng.transition.camPos.copy(eng.transition.target).addScaledVector(_vec3A, dist);
          eng.transition.active = true;
          eng.requestRender();
        },
      }),
      []
    );

    // Initialize Three.js WebGL stage once
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      let renderer: THREE.WebGLRenderer | null = null;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          powerPreference: 'default',
          alpha: false,
        });
      } catch {
        try {
          renderer = new THREE.WebGLRenderer({
            antialias: false,
            powerPreference: 'low-power',
            alpha: false,
          });
        } catch {
          setWebglUnavailable(true);
          return;
        }
      }

      const isSoftwareGl = detectSoftwareWebGL(renderer);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.02;

      const width = Math.max(container.clientWidth, 280);
      const height = Math.max(container.clientHeight, 240);
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#F6EFE6');

      const camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 50);
      camera.position.set(1.65, 0.68, 2.22);

      // Studio IBL via RoomEnvironment (skipped on software WebGL to avoid shader/VRAM crashes)
      let pmremGenerator: THREE.PMREMGenerator | null = null;
      let envRT: THREE.WebGLRenderTarget | null = null;
      if (!isSoftwareGl) {
        try {
          pmremGenerator = new THREE.PMREMGenerator(renderer);
          const roomEnv = new RoomEnvironment();
          envRT = pmremGenerator.fromScene(roomEnv, 0.04);
          scene.environment = envRT.texture;
          scene.environmentIntensity = 0.55;
          roomEnv.dispose();
        } catch {
          envRT?.dispose();
          pmremGenerator?.dispose();
          envRT = null;
          pmremGenerator = null;
        }
      }

      // 3-point academic osteology studio lighting (no dark blind spots on base/inferior view)
      const hemiLight = new THREE.HemisphereLight(0xfffaf2, 0xc7b9ab, 0.75);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xfff8ef, 1.35);
      keyLight.position.set(3.2, 4.4, 3.8);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xe5eee7, 0.68);
      fillLight.position.set(-4.0, 1.8, 1.4);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0xfff0e8, 0.55);
      rimLight.position.set(0.2, 2.5, -4.2);
      scene.add(rimLight);

      const baseBounceLight = new THREE.DirectionalLight(0xfff5ec, 0.52);
      baseBounceLight.position.set(0.0, -3.5, 0.8);
      scene.add(baseBounceLight);

      // Soft ground contact shadow disc (never raycasted)
      const shadowTex = createSoftShadowTexture();
      const shadowGeo = new THREE.PlaneGeometry(2.6, 2.6);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.9,
      });
      const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
      shadowDisc.rotation.x = -Math.PI / 2;
      shadowDisc.position.set(0, -1.12, 0);
      shadowDisc.raycast = () => {};
      scene.add(shadowDisc);

      const modelGroup = new THREE.Group();
      scene.add(modelGroup);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0, 0);
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.85;
      controls.zoomSpeed = 0.95;
      controls.panSpeed = 0.75;
      controls.minPolarAngle = 0; // Full 360° including superior & inferior base views
      controls.maxPolarAngle = Math.PI;
      controls.minDistance = 0.85;
      controls.maxDistance = 6.5;
      controls.update();

      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);

      const transition = {
        active: false,
        camPos: new THREE.Vector3(),
        target: new THREE.Vector3(),
      };

      let disposed = false;
      let rafId = 0;
      let needsRender = false;
      let softTimerId: number | null = null;
      let lastTime = performance.now();

      const applyVisualState = () => {
        const eng = engineRef.current;
        if (!eng) return;
        const st = visualStateRef.current;
        const isIsolated = Boolean(st.isolatedKey);

        for (const entry of eng.entries) {
          const isHidden = st.hiddenSet.has(entry.key);
          const isTargetIsolated = st.isolatedKey === entry.key;

          if (isHidden && !isTargetIsolated) {
            entry.mesh.visible = false;
            continue;
          }

          if (isIsolated && !isTargetIsolated) {
            if (st.translucentContext) {
              entry.mesh.visible = true;
              entry.material.transparent = true;
              entry.material.opacity = 0.11;
              entry.material.depthWrite = false;
              entry.material.color.copy(entry.baseColor);
              entry.material.emissive.setHex(0x000000);
              entry.material.emissiveIntensity = 0;
              entry.material.roughness = 0.8;
              continue;
            } else {
              entry.mesh.visible = false;
              continue;
            }
          }

          entry.mesh.visible = true;
          entry.material.transparent = false;
          entry.material.opacity = 1;
          entry.material.depthWrite = true;

          // Semantic highlight priority:
          // 1) Exam result / target, 2) Selected bone, 3) Hovered bone, 4) Base bone ivory
          if (st.examHighlightKey === entry.key) {
            if (st.examResultState === 'correct') {
              entry.material.color.setHex(0x478462);
              entry.material.emissive.setHex(0x1b432c);
              entry.material.emissiveIntensity = 0.42;
              entry.material.roughness = 0.42;
            } else {
              entry.material.color.setHex(0xd9822b);
              entry.material.emissive.setHex(0x7c3e08);
              entry.material.emissiveIntensity = 0.5;
              entry.material.roughness = 0.36;
            }
          } else if (st.examWrongKey === entry.key) {
            entry.material.color.setHex(0xb83b52);
            entry.material.emissive.setHex(0x521120);
            entry.material.emissiveIntensity = 0.38;
            entry.material.roughness = 0.44;
          } else if (st.selectedKey === entry.key) {
            entry.material.color.setHex(0xa3324d);
            entry.material.emissive.setHex(0x4e1022);
            entry.material.emissiveIntensity = 0.34;
            entry.material.roughness = 0.42;
          } else if (st.hoveredKey === entry.key) {
            entry.material.color.copy(entry.baseColor).lerp(new THREE.Color(0xc86b7d), 0.35);
            entry.material.emissive.setHex(0x6b1b2f);
            entry.material.emissiveIntensity = 0.16;
            entry.material.roughness = 0.52;
          } else {
            entry.material.color.copy(entry.baseColor);
            entry.material.emissive.setHex(0x000000);
            entry.material.emissiveIntensity = 0;
            entry.material.roughness = 0.66;
          }
        }
      };

      const renderFrame = (now: number) => {
        rafId = 0;
        if (disposed) return;

        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        let keepAnimating = false;

        if (transition.active) {
          if (isSoftwareGl) {
            camera.position.copy(transition.camPos);
            controls.target.copy(transition.target);
            transition.active = false;
          } else {
            const lambda = 9;
            camera.position.x = THREE.MathUtils.damp(
              camera.position.x,
              transition.camPos.x,
              lambda,
              dt
            );
            camera.position.y = THREE.MathUtils.damp(
              camera.position.y,
              transition.camPos.y,
              lambda,
              dt
            );
            camera.position.z = THREE.MathUtils.damp(
              camera.position.z,
              transition.camPos.z,
              lambda,
              dt
            );
            controls.target.x = THREE.MathUtils.damp(
              controls.target.x,
              transition.target.x,
              lambda,
              dt
            );
            controls.target.y = THREE.MathUtils.damp(
              controls.target.y,
              transition.target.y,
              lambda,
              dt
            );
            controls.target.z = THREE.MathUtils.damp(
              controls.target.z,
              transition.target.z,
              lambda,
              dt
            );

            const posDist = camera.position.distanceTo(transition.camPos);
            const tgtDist = controls.target.distanceTo(transition.target);
            if (posDist < 0.004 && tgtDist < 0.004) {
              camera.position.copy(transition.camPos);
              controls.target.copy(transition.target);
              transition.active = false;
            } else {
              keepAnimating = true;
            }
          }
        }

        const controlsChanged = controls.update();
        if (controlsChanged && controls.enableDamping) {
          keepAnimating = true;
        }

        renderer.render(scene, camera);

        if (keepAnimating || needsRender) {
          needsRender = false;
          if (isSoftwareGl) {
            if (softTimerId !== null) window.clearTimeout(softTimerId);
            softTimerId = window.setTimeout(() => {
              softTimerId = null;
              if (!disposed && rafId === 0) {
                lastTime = performance.now();
                rafId = window.requestAnimationFrame(renderFrame);
              }
            }, 0);
          } else {
            rafId = window.requestAnimationFrame(renderFrame);
          }
        }
      };

      const requestRender = () => {
        if (disposed) return;
        if (rafId !== 0) {
          needsRender = true;
          return;
        }
        lastTime = performance.now();
        rafId = window.requestAnimationFrame(renderFrame);
      };

      const disposeLoadedModel = () => {
        const eng = engineRef.current;
        if (!eng) return;
        for (const entry of eng.entries) {
          entry.mesh.geometry.dispose();
          const m = entry.material;
          m.map?.dispose();
          m.normalMap?.dispose();
          m.roughnessMap?.dispose();
          m.metalnessMap?.dispose();
          m.aoMap?.dispose();
          m.emissiveMap?.dispose();
          m.dispose();
        }
        eng.entries = [];
        eng.entryByKey.clear();
        modelGroup.clear();
      };

      engineRef.current = {
        scene,
        camera,
        renderer,
        controls,
        modelGroup,
        shadowDisc,
        entries: [],
        entryByKey: new Map(),
        modelRadius: 1.28,
        isSoftwareGl,
        transition,
        requestRender,
        applyVisualState,
        disposeLoadedModel,
        loader,
      };

      // Cancel camera preset transitions immediately when user starts interacting
      const handleControlsStart = () => {
        transition.active = false;
      };
      const handleControlsChange = () => {
        requestRender();
      };
      controls.addEventListener('start', handleControlsStart);
      controls.addEventListener('change', handleControlsChange);

      // Raycasting (pointer drag vs click threshold + throttled hover)
      const raycaster = new THREE.Raycaster();
      let downX = 0;
      let downY = 0;
      let isPointerDown = false;
      let lastHoverCheck = 0;

      const pickMeshAtClientXY = (clientX: number, clientY: number): string | null => {
        const eng = engineRef.current;
        if (!eng || eng.entries.length === 0) return null;
        const rect = renderer.domElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;

        _pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        _pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(_pointer, camera);

        const st = visualStateRef.current;
        const pickTargets: THREE.Mesh[] = [];
        for (const entry of eng.entries) {
          if (!entry.mesh.visible) continue;
          if (st.isolatedKey && st.translucentContext && entry.key !== st.isolatedKey) {
            continue;
          }
          pickTargets.push(entry.mesh);
        }

        const hits = raycaster.intersectObjects(pickTargets, false);
        if (hits.length === 0) return null;
        const hitMesh = hits[0].object as THREE.Mesh;
        return (hitMesh.userData.__atlasKey as string) || null;
      };

      const handlePointerDown = (e: PointerEvent) => {
        downX = e.clientX;
        downY = e.clientY;
        isPointerDown = true;
      };

      const handlePointerUp = (e: PointerEvent) => {
        if (!isPointerDown) return;
        isPointerDown = false;
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        const dx = e.clientX - downX;
        const dy = e.clientY - downY;
        if (dx * dx + dy * dy > 36) {
          // Was a drag/orbit gesture, not a tap/click selection
          return;
        }
        const picked = pickMeshAtClientXY(e.clientX, e.clientY);
        callbacksRef.current.onSelectMesh(picked);
      };

      const handlePointerMove = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse' || isPointerDown) return;
        const now = performance.now();
        if (now - lastHoverCheck < 50) return;
        lastHoverCheck = now;
        const hovered = pickMeshAtClientXY(e.clientX, e.clientY);
        if (hovered !== visualStateRef.current.hoveredKey) {
          renderer.domElement.style.cursor = hovered ? 'pointer' : 'grab';
          callbacksRef.current.onHoverMesh(hovered);
        }
      };

      const handlePointerLeave = () => {
        if (visualStateRef.current.hoveredKey !== null) {
          renderer.domElement.style.cursor = 'grab';
          callbacksRef.current.onHoverMesh(null);
        }
      };

      const dom = renderer.domElement;
      dom.style.cursor = 'grab';
      dom.addEventListener('pointerdown', handlePointerDown);
      dom.addEventListener('pointerup', handlePointerUp);
      dom.addEventListener('pointermove', handlePointerMove);
      dom.addEventListener('pointerleave', handlePointerLeave);

      // WebGL context lost / restored handlers
      const handleContextLost = (e: Event) => {
        e.preventDefault();
        if (rafId !== 0) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
        setWebglLost(true);
      };
      const handleContextRestored = () => {
        setWebglLost(false);
        requestRender();
      };
      dom.addEventListener('webglcontextlost', handleContextLost);
      dom.addEventListener('webglcontextrestored', handleContextRestored);

      // ResizeObserver
      const resizeObserver = new ResizeObserver((entries) => {
        if (disposed) return;
        for (const entry of entries) {
          const w = Math.max(Math.round(entry.contentRect.width), 200);
          const h = Math.max(Math.round(entry.contentRect.height), 200);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, false);
          requestRender();
        }
      });
      resizeObserver.observe(container);

      requestRender();

      return () => {
        disposed = true;
        if (rafId !== 0) window.cancelAnimationFrame(rafId);
        if (softTimerId !== null) window.clearTimeout(softTimerId);
        resizeObserver.disconnect();
        controls.removeEventListener('start', handleControlsStart);
        controls.removeEventListener('change', handleControlsChange);
        controls.dispose();
        dom.removeEventListener('pointerdown', handlePointerDown);
        dom.removeEventListener('pointerup', handlePointerUp);
        dom.removeEventListener('pointermove', handlePointerMove);
        dom.removeEventListener('pointerleave', handlePointerLeave);
        dom.removeEventListener('webglcontextlost', handleContextLost);
        dom.removeEventListener('webglcontextrestored', handleContextRestored);

        disposeLoadedModel();
        shadowGeo.dispose();
        shadowMat.dispose();
        shadowTex.dispose();
        scene.environment = null;
        scene.clear();
        envRT?.dispose();
        pmremGenerator?.dispose();
        dracoLoader.dispose();
        renderer.dispose();
        try {
          renderer.forceContextLoss();
        } catch {
          // Ignore if context already lost
        }
        if (dom.parentNode === container) {
          container.removeChild(dom);
        }
        engineRef.current = null;
      };
    }, [canvasEpoch]);

    // Load or swap GLB/GLTF model when modelSource changes
    useEffect(() => {
      const eng = engineRef.current;
      if (!eng) return;

      let cancelled = false;
      setLoadingProgress(0);

      const handleParsedGltf = (gltf: GLTF) => {
        if (cancelled || !engineRef.current) return;
        try {
          const currentEng = engineRef.current;
          currentEng.disposeLoadedModel();

          const root = gltf.scene;
          root.updateMatrixWorld(true);

          // Compute combined bounds across all meshes, normalize to maxExtent = 2.0 centered at (0,0,0)
          _box3.makeEmpty();
          let rawMeshCount = 0;
          root.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              rawMeshCount += 1;
              _box3.expandByObject(obj);
            }
          });

          if (rawMeshCount === 0 || _box3.isEmpty()) {
            setLoadingProgress(null);
            callbacksRef.current.onModelError(
              'El archivo 3D no contiene mallas geométricas visibles.'
            );
            return;
          }

          const size = _box3.getSize(_vec3A);
          const center = _box3.getCenter(_vec3B);
          const maxExtent = Math.max(size.x, size.y, size.z) || 1;
          const normScale = 2.0 / maxExtent;

          root.scale.multiplyScalar(normScale);
          root.position.set(
            -center.x * normScale,
            -center.y * normScale,
            -center.z * normScale
          );
          root.updateMatrixWorld(true);

          currentEng.modelGroup.add(root);

          // Compute final normalized bounds
          _box3.makeEmpty();
          _box3.expandByObject(currentEng.modelGroup);
          const finalSize = _box3.getSize(_vec3A);
          const modelRadius = finalSize.length() * 0.5 || 1.25;
          currentEng.modelRadius = modelRadius;
          currentEng.shadowDisc.position.set(0, _box3.min.y - 0.1, 0);

          const entries: MeshEntry[] = [];
          const loadedRecords: LoadedMeshRecord[] = [];
          const usedKeys = new Set<string>();

          let meshIdx = 0;
          root.traverse((obj) => {
            if (!(obj as THREE.Mesh).isMesh) return;
            const mesh = obj as THREE.Mesh;
            meshIdx += 1;

            const structureId =
              typeof mesh.userData?.structureId === 'string'
                ? mesh.userData.structureId
                : null;
            const fmaId =
              typeof mesh.userData?.fma === 'string' ? mesh.userData.fma : null;
            const rawName = mesh.name || structureId || `estructura-${meshIdx}`;
            const info = resolveCraneoEstructura(rawName, structureId);

            let key = info?.id || structureId || rawName;
            if (usedKeys.has(key)) {
              key = `${key}__${meshIdx}`;
            }
            usedKeys.add(key);
            mesh.userData.__atlasKey = key;

            // Replace material cleanly & dispose original materials we no longer use
            const srcMaterials = Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material];
            const primaryMat = srcMaterials[0];
            let mat: THREE.MeshStandardMaterial;
            if (primaryMat && (primaryMat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
              mat = (primaryMat as THREE.MeshStandardMaterial).clone();
            } else {
              mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#DDD0BC'),
                roughness: 0.66,
                metalness: 0.0,
              });
            }
            for (const oldM of srcMaterials) {
              if (oldM && typeof oldM.dispose === 'function') {
                oldM.dispose();
              }
            }

            // Harmonize realistic dry osteological ivory tone while keeping gentle suture contrast
            const rawHex = mat.color.getHex();
            const boneColor =
              rawHex < 0x907550 || rawHex === 0xffffff
                ? new THREE.Color(meshIdx % 2 === 0 ? '#DFD3BF' : '#D2C4AD')
                : mat.color.clone().lerp(new THREE.Color('#E3D7C3'), 0.45);
            mat.color.copy(boneColor);
            mat.roughness = 0.66;
            mat.metalness = 0.0;
            mesh.material = mat;

            mesh.geometry.computeBoundingBox();
            const meshBox = new THREE.Box3().setFromObject(mesh);
            const meshCenter = meshBox.getCenter(new THREE.Vector3());
            const meshRadius = meshBox.getSize(new THREE.Vector3()).length() * 0.5 || 0.3;

            entries.push({
              key,
              mesh,
              material: mat,
              baseColor: boneColor.clone(),
              center: meshCenter.clone(),
              radius: meshRadius,
            });
            currentEng.entryByKey.set(key, entries[entries.length - 1]);

            const dir = meshCenter.clone();
            if (dir.lengthSq() < 0.02) dir.set(0.3, 0.2, 0.9);
            dir.normalize();

            loadedRecords.push({
              key,
              rawName,
              structureId,
              fmaId: info?.fmaId || fmaId,
              info,
              vertexCount: mesh.geometry.attributes.position?.count || 0,
              center: [meshCenter.x, meshCenter.y, meshCenter.z],
              boundingDirection: [dir.x, dir.y, dir.z],
            });
          });

          currentEng.entries = entries;
          currentEng.controls.minDistance = modelRadius * 0.6;
          currentEng.controls.maxDistance = modelRadius * 4.8;

          // Frame initial 3/4 view cleanly
          const initDir = _vec3A
            .set(
              ATLAS_VISTA_INICIAL.direction[0],
              ATLAS_VISTA_INICIAL.direction[1],
              ATLAS_VISTA_INICIAL.direction[2]
            )
            .normalize();
          const initDist =
            modelRadius * (ATLAS_VISTA_INICIAL.distanciaFactor || 1.92) * 1.45;
          currentEng.controls.target.set(0, 0, 0);
          currentEng.camera.position.copy(initDir).multiplyScalar(initDist);
          currentEng.transition.active = false;
          currentEng.controls.update();

          currentEng.applyVisualState();
          currentEng.requestRender();
          setLoadingProgress(null);

          callbacksRef.current.onModelLoaded({
            sourceLabel: modelSource.label,
            meshCount: entries.length,
            isSingleMesh: entries.length <= 1,
            meshes: loadedRecords,
          });
        } catch (err) {
          setLoadingProgress(null);
          callbacksRef.current.onModelError(
            err instanceof Error
              ? `No se pudo procesar la geometría 3D (${err.message}).`
              : 'No se pudo procesar el modelo 3D seleccionado.'
          );
        }
      };

      if (modelSource.kind === 'url') {
        eng.loader.load(
          modelSource.url,
          handleParsedGltf,
          (xhr) => {
            if (cancelled) return;
            if (xhr.total > 0) {
              setLoadingProgress(Math.min(99, Math.round((xhr.loaded / xhr.total) * 100)));
            }
          },
          (err) => {
            if (cancelled) return;
            setLoadingProgress(null);
            callbacksRef.current.onModelError(
              err instanceof Error
                ? `No se pudo cargar el modelo 3D (${err.message}).`
                : 'No se pudo cargar el archivo GLB/GLTF.'
            );
          }
        );
      } else {
        eng.loader.parse(
          modelSource.buffer,
          modelSource.basePath || '',
          handleParsedGltf,
          (err) => {
            if (cancelled) return;
            setLoadingProgress(null);
            callbacksRef.current.onModelError(
              err instanceof Error
                ? `Archivo GLB/GLTF inválido (${err.message}).`
                : 'No se pudo interpretar el archivo 3D seleccionado.'
            );
          }
        );
      }

      return () => {
        cancelled = true;
      };
    }, [modelSource, canvasEpoch]);

    // Sync selection / hover / visibility / isolation / exam highlights without reloading geometry
    useEffect(() => {
      const eng = engineRef.current;
      if (!eng) return;
      eng.applyVisualState();
      eng.requestRender();
    }, [
      selectedKey,
      hoveredKey,
      hiddenKeys,
      isolatedKey,
      translucentContext,
      examHighlightKey,
      examResultState,
      examWrongKey,
    ]);

    if (webglUnavailable) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#F6EFE6] p-6 text-center">
          <p className="font-serif text-lg font-bold text-rose-950">
            WebGL no disponible en este navegador
          </p>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-600">
            Este dispositivo o navegador no tiene habilitada la aceleración WebGL necesaria para renderizar el cráneo tridimensional interactivo.
          </p>
        </div>
      );
    }

    return (
      <div className="relative h-full w-full overflow-hidden bg-[#F6EFE6]">
        <div
          ref={containerRef}
          aria-label="Visor anatómico 3D de cráneo humano"
          className="h-full w-full touch-none select-none"
        />

        {loadingProgress !== null && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-[#F6EFE6]/90 backdrop-blur-[2px]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-200 border-t-rose-900" />
            <p className="mt-3 text-xs font-semibold text-rose-950 tabular-nums">
              Cargando modelo osteológico 3D{loadingProgress > 0 ? ` · ${loadingProgress}%` : '...'}
            </p>
          </div>
        )}

        {webglLost && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F6EFE6]/95 p-6 text-center">
            <p className="text-sm font-bold text-rose-950">
              Contexto gráfico 3D pausado temporalmente
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Podés restaurar el visor osteológico con un toque.
            </p>
            <button
              type="button"
              onClick={() => {
                setWebglLost(false);
                setCanvasEpoch((e) => e + 1);
              }}
              className="mt-3 min-h-[38px] rounded-xl bg-rose-900 px-4 text-xs font-bold text-white hover:bg-rose-950"
            >
              Reintentar visor 3D
            </button>
          </div>
        )}
      </div>
    );
  }
);

AtlasSkullCanvas.displayName = 'AtlasSkullCanvas';

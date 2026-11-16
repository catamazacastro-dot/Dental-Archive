import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  describeCanalLayerName,
  type DentalVistaId,
  type ToothFrameManifest,
} from '../data/dentarioAtlasData';

export type CortePlanoTipo = 'ninguno' | 'vestibulo-lingual' | 'mesio-distal' | 'axial';

export interface LoadedDentalMeshRecord {
  key: string; // e.g. 'enamel-11', 'canal-mesiobuccal-1-16', or 'landmark-cuello'
  layerType: string; // 'enamel' | 'dentin-coronal' | 'dentin-radicular' | 'cementum' | 'pdl' | 'pulp-chamber' | 'canal' | 'landmark-cuello' | 'landmark-apice' | 'custom'
  label: string;
  subtitle: string;
  detail: string;
  vertexCount: number;
  isCanal: boolean;
  isLandmark: boolean;
}

export interface DentalModelSummary {
  sourceLabel: string;
  meshCount: number;
  isSingleMesh: boolean;
  meshes: LoadedDentalMeshRecord[];
}

export interface AtlasToothCanvasHandle {
  applyDentalView: (vista: DentalVistaId) => void;
  resetView: () => void;
  zoomBy: (factor: number) => void;
}

export interface AtlasToothCanvasProps {
  modelSource:
    | { kind: 'url'; url: string; label: string; fdi?: string }
    | { kind: 'buffer'; buffer: ArrayBuffer; label: string; fdi?: string };
  frameManifest: ToothFrameManifest | null;
  highlightedKeys: string[];
  hoveredKey: string | null;
  hiddenKeys: string[];
  isolatedKeys: string[] | null;
  translucentHardTissues: boolean;
  clipMode: CortePlanoTipo;
  clipOffset: number; // -0.95 to 0.95
  examHighlightKeys?: string[];
  onSelectMesh: (meshKey: string | null) => void;
  onHoverMesh: (meshKey: string | null) => void;
  onModelLoaded: (summary: DentalModelSummary) => void;
  onModelError: (message: string) => void;
}

interface ToothMeshEntry {
  key: string;
  layerType: string;
  mesh: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial;
  baseColor: THREE.Color;
  baseRoughness: number;
  baseEmissive: THREE.Color;
  baseEmissiveIntensity: number;
  isHardTissue: boolean;
  isLandmark: boolean;
}

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
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

function classifyDentalLayer(rawName: string): {
  layerType: string;
  isHardTissue: boolean;
  isCanal: boolean;
} {
  const n = rawName.toLowerCase();
  if (n.startsWith('enamel')) return { layerType: 'enamel', isHardTissue: true, isCanal: false };
  if (n.startsWith('dentin-coronal'))
    return { layerType: 'dentin-coronal', isHardTissue: true, isCanal: false };
  if (n.startsWith('dentin-radicular'))
    return { layerType: 'dentin-radicular', isHardTissue: true, isCanal: false };
  if (n.includes('dentin'))
    return { layerType: 'dentin-coronal', isHardTissue: true, isCanal: false };
  if (n.startsWith('cementum') || n.includes('cement'))
    return { layerType: 'cementum', isHardTissue: true, isCanal: false };
  if (n.startsWith('pdl')) return { layerType: 'pdl', isHardTissue: true, isCanal: false };
  if (n.startsWith('pulp-chamber') || n.includes('pulp'))
    return { layerType: 'pulp-chamber', isHardTissue: false, isCanal: false };
  if (n.startsWith('canal')) return { layerType: 'canal', isHardTissue: false, isCanal: true };
  return { layerType: 'custom', isHardTissue: true, isCanal: false };
}

function createToothShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 122);
    grad.addColorStop(0, 'rgba(72, 42, 34, 0.18)');
    grad.addColorStop(0.55, 'rgba(72, 42, 34, 0.06)');
    grad.addColorStop(1, 'rgba(72, 42, 34, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function computeViewDirection(
  vista: DentalVistaId,
  manifest: ToothFrameManifest | null
): THREE.Vector3 {
  const axis = manifest
    ? new THREE.Vector3(...manifest.frame.axis).normalize()
    : new THREE.Vector3(0, 1, 0);
  const buccal = manifest
    ? new THREE.Vector3(...manifest.frame.buccal).normalize()
    : new THREE.Vector3(0, 0, 1);
  const mesial = manifest
    ? new THREE.Vector3(...manifest.frame.mesial).normalize()
    : new THREE.Vector3(1, 0, 0);

  switch (vista) {
    case 'vestibular':
      return buccal.clone().addScaledVector(axis, 0.12).normalize();
    case 'lingual':
      return buccal.clone().negate().addScaledVector(axis, 0.12).normalize();
    case 'mesial':
      return mesial.clone().addScaledVector(axis, 0.08).normalize();
    case 'distal':
      return mesial.clone().negate().addScaledVector(axis, 0.08).normalize();
    case 'oclusal':
      // Slight buccal bias avoids gimbal lock when axis is near ±Y
      return axis.clone().addScaledVector(buccal, 0.12).normalize();
    case 'inicial':
    default:
      return buccal
        .clone()
        .multiplyScalar(0.76)
        .addScaledVector(mesial, 0.45)
        .addScaledVector(axis, 0.32)
        .normalize();
  }
}

export const AtlasToothCanvas = React.forwardRef<
  AtlasToothCanvasHandle,
  AtlasToothCanvasProps
>(
  (
    {
      modelSource,
      frameManifest,
      highlightedKeys,
      hoveredKey,
      hiddenKeys,
      isolatedKeys,
      translucentHardTissues,
      clipMode,
      clipOffset,
      examHighlightKeys = [],
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
      frameManifest,
      highlightedSet: new Set(highlightedKeys),
      hoveredKey,
      hiddenSet: new Set(hiddenKeys),
      isolatedSet: isolatedKeys ? new Set(isolatedKeys) : null,
      translucentHardTissues,
      clipMode,
      clipOffset,
      examHighlightSet: new Set(examHighlightKeys),
    });
    visualStateRef.current = {
      frameManifest,
      highlightedSet: new Set(highlightedKeys),
      hoveredKey,
      hiddenSet: new Set(hiddenKeys),
      isolatedSet: isolatedKeys ? new Set(isolatedKeys) : null,
      translucentHardTissues,
      clipMode,
      clipOffset,
      examHighlightSet: new Set(examHighlightKeys),
    };

    const engineRef = useRef<{
      scene: THREE.Scene;
      camera: THREE.PerspectiveCamera;
      renderer: THREE.WebGLRenderer;
      controls: OrbitControls;
      modelGroup: THREE.Group;
      landmarkGroup: THREE.Group;
      shadowDisc: THREE.Mesh;
      entries: ToothMeshEntry[];
      clipPlane: THREE.Plane;
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

    useImperativeHandle(
      ref,
      () => ({
        applyDentalView(vista: DentalVistaId) {
          const eng = engineRef.current;
          if (!eng) return;
          const dir = computeViewDirection(vista, visualStateRef.current.frameManifest);
          const dist = eng.modelRadius * 2.55;
          eng.transition.target.set(0, 0, 0);
          eng.transition.camPos.copy(dir).multiplyScalar(dist);
          eng.transition.active = true;
          eng.requestRender();
        },
        resetView() {
          const eng = engineRef.current;
          if (!eng) return;
          const dir = computeViewDirection('inicial', visualStateRef.current.frameManifest);
          const dist = eng.modelRadius * 2.55;
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
          const nextLen = THREE.MathUtils.clamp(
            _vec3A.length() * factor,
            eng.controls.minDistance,
            eng.controls.maxDistance
          );
          _vec3A.normalize().multiplyScalar(nextLen);
          eng.camera.position.copy(eng.controls.target).add(_vec3A);
          eng.controls.update();
          eng.requestRender();
        },
      }),
      []
    );

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
      renderer.toneMappingExposure = 1.04;
      renderer.localClippingEnabled = true;

      const width = Math.max(container.clientWidth, 280);
      const height = Math.max(container.clientHeight, 240);
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#F6EFE6');

      const camera = new THREE.PerspectiveCamera(38, width / height, 0.05, 40);
      camera.position.set(1.5, 0.9, 2.2);

      let pmremGenerator: THREE.PMREMGenerator | null = null;
      let envRT: THREE.WebGLRenderTarget | null = null;
      if (!isSoftwareGl) {
        try {
          pmremGenerator = new THREE.PMREMGenerator(renderer);
          const roomEnv = new RoomEnvironment();
          envRT = pmremGenerator.fromScene(roomEnv, 0.04);
          scene.environment = envRT.texture;
          scene.environmentIntensity = 0.65;
          roomEnv.dispose();
        } catch {
          envRT?.dispose();
          pmremGenerator?.dispose();
          envRT = null;
          pmremGenerator = null;
        }
      }

      // Balanced dental macro studio lighting
      const hemiLight = new THREE.HemisphereLight(0xfffcf6, 0xc7bab0, 0.72);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xfffaf2, 1.35);
      keyLight.position.set(2.8, 3.8, 3.6);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xe6efe8, 0.72);
      fillLight.position.set(-3.6, 1.4, 1.8);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0xfff3eb, 0.65);
      rimLight.position.set(0.0, 2.2, -3.8);
      scene.add(rimLight);

      const underLight = new THREE.DirectionalLight(0xfff7f0, 0.6);
      underLight.position.set(0.0, -3.5, 0.8);
      scene.add(underLight);

      const shadowTex = createToothShadowTexture();
      const shadowGeo = new THREE.PlaneGeometry(2.2, 2.2);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.85,
      });
      const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
      shadowDisc.rotation.x = -Math.PI / 2;
      shadowDisc.position.set(0, -1.16, 0);
      shadowDisc.raycast = () => {};
      scene.add(shadowDisc);

      const modelGroup = new THREE.Group();
      const landmarkGroup = new THREE.Group();
      scene.add(modelGroup);
      scene.add(landmarkGroup);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0, 0);
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.85;
      controls.zoomSpeed = 0.95;
      controls.panSpeed = 0.75;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI;
      controls.minDistance = 0.75;
      controls.maxDistance = 6.0;
      controls.update();

      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
      loader.setMeshoptDecoder(MeshoptDecoder);

      const clipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);

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

        // Update cross-section clipping plane
        const clipActive = st.clipMode !== 'ninguno';
        if (clipActive) {
          const mf = st.frameManifest;
          const axis = mf
            ? _vec3A.set(...mf.frame.axis).normalize()
            : _vec3A.set(0, 1, 0);
          const buccal = mf
            ? _vec3B.set(...mf.frame.buccal).normalize()
            : _vec3B.set(0, 0, 1);
          const mesial = mf
            ? _vec3C.set(...mf.frame.mesial).normalize()
            : _vec3C.set(1, 0, 0);

          if (st.clipMode === 'vestibulo-lingual') {
            clipPlane.normal.copy(buccal).negate();
          } else if (st.clipMode === 'mesio-distal') {
            clipPlane.normal.copy(mesial).negate();
          } else {
            clipPlane.normal.copy(axis).negate();
          }
          clipPlane.constant = st.clipOffset;
        }

        const isIsolated = st.isolatedSet !== null && st.isolatedSet.size > 0;

        for (const entry of eng.entries) {
          const isHidden = st.hiddenSet.has(entry.key);
          const isTargetIso = isIsolated && st.isolatedSet!.has(entry.key);

          if (isHidden && !isTargetIso) {
            entry.mesh.visible = false;
            continue;
          }

          if (isIsolated && !isTargetIso) {
            entry.mesh.visible = false;
            continue;
          }

          entry.mesh.visible = true;

          // Attach clipping plane ONLY to outer hard tissues so pulp chamber & canals remain cleanly exposed inside the slice
          if (clipActive && entry.isHardTissue && !entry.isLandmark) {
            entry.material.clippingPlanes = [clipPlane];
            entry.material.side = THREE.DoubleSide;
          } else {
            entry.material.clippingPlanes = null;
            entry.material.side = THREE.FrontSide;
          }

          const isExamTarget = st.examHighlightSet.has(entry.key);
          const isSelected = st.highlightedSet.has(entry.key);
          const isHovered = st.hoveredKey === entry.key;

          const translucent =
            st.translucentHardTissues &&
            entry.isHardTissue &&
            !entry.isLandmark &&
            !isSelected &&
            !isExamTarget;

          if (translucent) {
            entry.material.transparent = true;
            entry.material.opacity = entry.layerType === 'enamel' ? 0.2 : 0.14;
            entry.material.depthWrite = false;
          } else {
            entry.material.transparent = false;
            entry.material.opacity = 1;
            entry.material.depthWrite = true;
          }

          if (isExamTarget) {
            entry.material.color.setHex(0xd9822b);
            entry.material.emissive.setHex(0x7c3e08);
            entry.material.emissiveIntensity = 0.55;
            entry.material.roughness = 0.35;
          } else if (isSelected) {
            entry.material.color.copy(entry.baseColor).lerp(new THREE.Color(0x9b2c48), 0.55);
            entry.material.emissive.setHex(0x5c1125);
            entry.material.emissiveIntensity = 0.36;
            entry.material.roughness = Math.min(entry.baseRoughness, 0.38);
          } else if (isHovered) {
            entry.material.color.copy(entry.baseColor).lerp(new THREE.Color(0xc86b7d), 0.35);
            entry.material.emissive.setHex(0x6b1b2f);
            entry.material.emissiveIntensity = 0.18;
            entry.material.roughness = entry.baseRoughness;
          } else {
            entry.material.color.copy(entry.baseColor);
            entry.material.emissive.copy(entry.baseEmissive);
            entry.material.emissiveIntensity = entry.baseEmissiveIntensity;
            entry.material.roughness = entry.baseRoughness;
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

            if (
              camera.position.distanceTo(transition.camPos) < 0.004 &&
              controls.target.distanceTo(transition.target) < 0.004
            ) {
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
        modelGroup.clear();
        landmarkGroup.clear();
      };

      engineRef.current = {
        scene,
        camera,
        renderer,
        controls,
        modelGroup,
        landmarkGroup,
        shadowDisc,
        entries: [],
        clipPlane,
        modelRadius: 1.15,
        isSoftwareGl,
        transition,
        requestRender,
        applyVisualState,
        disposeLoadedModel,
        loader,
      };

      const handleControlsStart = () => {
        transition.active = false;
      };
      const handleControlsChange = () => {
        requestRender();
      };
      controls.addEventListener('start', handleControlsStart);
      controls.addEventListener('change', handleControlsChange);

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
          if (
            st.translucentHardTissues &&
            entry.isHardTissue &&
            !entry.isLandmark &&
            !st.highlightedSet.has(entry.key)
          ) {
            // Let clicks pass through translucent enamel/dentin straight to pulp chamber & canals!
            continue;
          }
          pickTargets.push(entry.mesh);
        }

        const hits = raycaster.intersectObjects(pickTargets, false);
        if (hits.length === 0) return null;
        for (const hit of hits) {
          // If clipping is enabled, skip hits on the clipped-away half
          if (
            st.clipMode !== 'ninguno' &&
            (hit.object.userData.__isHardTissue as boolean) &&
            eng.clipPlane.distanceToPoint(hit.point) < -0.002
          ) {
            continue;
          }
          return (hit.object.userData.__dentalKey as string) || null;
        }
        return null;
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
        if (dx * dx + dy * dy > 36) return;
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

    // Load tooth GLB/GLTF
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
              'El modelo dentario no contiene mallas visibles.'
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

          _box3.makeEmpty();
          _box3.expandByObject(currentEng.modelGroup);
          const finalSize = _box3.getSize(_vec3A);
          const modelRadius = finalSize.length() * 0.5 || 1.15;
          currentEng.modelRadius = modelRadius;
          currentEng.shadowDisc.position.set(0, _box3.min.y - 0.14, 0);

          const entries: ToothMeshEntry[] = [];
          const loadedRecords: LoadedDentalMeshRecord[] = [];
          const usedKeys = new Set<string>();
          let meshIdx = 0;

          root.traverse((obj) => {
            if (!(obj as THREE.Mesh).isMesh) return;
            const mesh = obj as THREE.Mesh;
            meshIdx += 1;

            const rawName = mesh.name || `capa-${meshIdx}`;
            let key = rawName;
            if (usedKeys.has(key)) key = `${key}__${meshIdx}`;
            usedKeys.add(key);

            const { layerType, isHardTissue, isCanal } = classifyDentalLayer(rawName);
            mesh.userData.__dentalKey = key;
            mesh.userData.__isHardTissue = isHardTissue;

            // Dispose source materials that we replace
            const oldMaterials = Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material];
            for (const oldM of oldMaterials) {
              if (oldM && typeof oldM.dispose === 'function') {
                oldM.dispose();
              }
            }

            let baseColorHex = 0xeee5d3;
            let roughness = 0.45;
            let clearcoat = 0;
            let emissiveHex = 0x000000;
            let emissiveIntensity = 0;

            if (layerType === 'enamel') {
              baseColorHex = 0xf4efe3;
              roughness = 0.18;
              clearcoat = 0.65;
            } else if (layerType === 'dentin-coronal' || layerType === 'dentin-radicular') {
              baseColorHex = 0xe3cf9f;
              roughness = 0.56;
            } else if (layerType === 'cementum') {
              baseColorHex = 0xcfb98f;
              roughness = 0.78;
            } else if (layerType === 'pdl') {
              baseColorHex = 0x9db4a1;
              roughness = 0.72;
            } else if (layerType === 'pulp-chamber' || layerType === 'canal') {
              baseColorHex = 0xb83349;
              roughness = 0.34;
              emissiveHex = 0x4a0d1c;
              emissiveIntensity = 0.2;
            }

            const mat = currentEng.isSoftwareGl
              ? new THREE.MeshStandardMaterial({
                  color: new THREE.Color(baseColorHex),
                  roughness,
                  metalness: 0.0,
                  emissive: new THREE.Color(emissiveHex),
                  emissiveIntensity,
                })
              : new THREE.MeshPhysicalMaterial({
                  color: new THREE.Color(baseColorHex),
                  roughness,
                  metalness: 0.0,
                  clearcoat,
                  clearcoatRoughness: 0.15,
                  emissive: new THREE.Color(emissiveHex),
                  emissiveIntensity,
                });
            mesh.material = mat;

            entries.push({
              key,
              layerType,
              mesh,
              material: mat,
              baseColor: mat.color.clone(),
              baseRoughness: roughness,
              baseEmissive: mat.emissive.clone(),
              baseEmissiveIntensity: emissiveIntensity,
              isHardTissue,
              isLandmark: false,
            });

            const desc = describeCanalLayerName(rawName);
            loadedRecords.push({
              key,
              layerType,
              label: desc.title,
              subtitle: desc.subtitle,
              detail: desc.detail,
              vertexCount: mesh.geometry.attributes.position?.count || 0,
              isCanal,
              isLandmark: false,
            });
          });

          // Build selectable 3D landmark indicators for Cuello (cervical-line) & Ápice (apex / apical-foramen-*)
          const mf = visualStateRef.current.frameManifest;
          if (mf && mf.landmarks) {
            const toNormalized = (pt: [number, number, number]) =>
              new THREE.Vector3(
                (pt[0] - center.x) * normScale,
                (pt[1] - center.y) * normScale,
                (pt[2] - center.z) * normScale
              );

            if (mf.landmarks['cervical-line']) {
              const cervPos = toNormalized(mf.landmarks['cervical-line']);
              const axisVec = new THREE.Vector3(...mf.frame.axis).normalize();
              const ringGeo = new THREE.TorusGeometry(0.42, 0.016, 12, 48);
              const ringMat = new THREE.MeshStandardMaterial({
                color: 0x5d7561,
                roughness: 0.4,
                metalness: 0.05,
                emissive: 0x212c23,
                emissiveIntensity: 0.2,
              });
              const ringMesh = new THREE.Mesh(ringGeo, ringMat);
              ringMesh.position.copy(cervPos);
              ringMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axisVec);
              ringMesh.userData.__dentalKey = 'landmark-cuello';
              ringMesh.userData.__isHardTissue = false;
              currentEng.landmarkGroup.add(ringMesh);

              entries.push({
                key: 'landmark-cuello',
                layerType: 'landmark-cuello',
                mesh: ringMesh,
                material: ringMat,
                baseColor: ringMat.color.clone(),
                baseRoughness: 0.4,
                baseEmissive: ringMat.emissive.clone(),
                baseEmissiveIntensity: 0.2,
                isHardTissue: false,
                isLandmark: true,
              });

              loadedRecords.push({
                key: 'landmark-cuello',
                layerType: 'landmark-cuello',
                label: 'Cuello dentario (línea cervical)',
                subtitle: 'Unión amelocementaria (UAC)',
                detail:
                  'Límite cervical entre esmalte coronario y cemento radicular.',
                vertexCount: ringGeo.attributes.position.count,
                isCanal: false,
                isLandmark: true,
              });
            }

            const foramenKeys = Object.keys(mf.landmarks).filter((k) =>
              k.startsWith('apical-foramen-')
            );
            const apexTargets =
              foramenKeys.length > 0
                ? foramenKeys
                : mf.landmarks.apex
                  ? ['apex']
                  : [];

            apexTargets.forEach((lk, idx) => {
              const pt = mf.landmarks[lk];
              if (!pt) return;
              const pos = toNormalized(pt);
              const sphGeo = new THREE.SphereGeometry(0.055, 16, 16);
              const sphMat = new THREE.MeshStandardMaterial({
                color: 0x7a1c33,
                roughness: 0.35,
                emissive: 0x4a0d1c,
                emissiveIntensity: 0.25,
              });
              const sphMesh = new THREE.Mesh(sphGeo, sphMat);
              sphMesh.position.copy(pos);
              const lkKey = idx === 0 ? 'landmark-apice' : `landmark-apice-${idx + 1}`;
              sphMesh.userData.__dentalKey = lkKey;
              sphMesh.userData.__isHardTissue = false;
              currentEng.landmarkGroup.add(sphMesh);

              entries.push({
                key: lkKey,
                layerType: 'landmark-apice',
                mesh: sphMesh,
                material: sphMat,
                baseColor: sphMat.color.clone(),
                baseRoughness: 0.35,
                baseEmissive: sphMat.emissive.clone(),
                baseEmissiveIntensity: 0.25,
                isHardTissue: false,
                isLandmark: true,
              });

              if (idx === 0) {
                loadedRecords.push({
                  key: lkKey,
                  layerType: 'landmark-apice',
                  label: 'Ápice y foramen apical',
                  subtitle: 'Extremo terminal radicular',
                  detail:
                    'Vértice anatómico de la raíz y abertura del foramen apical.',
                  vertexCount: sphGeo.attributes.position.count,
                  isCanal: false,
                  isLandmark: true,
                });
              }
            });
          }

          currentEng.entries = entries;
          currentEng.controls.minDistance = modelRadius * 0.65;
          currentEng.controls.maxDistance = modelRadius * 4.8;

          const initDir = computeViewDirection('inicial', mf);
          const initDist = modelRadius * 2.55;
          currentEng.controls.target.set(0, 0, 0);
          currentEng.camera.position.copy(initDir).multiplyScalar(initDist);
          currentEng.transition.active = false;
          currentEng.controls.update();

          currentEng.applyVisualState();
          currentEng.requestRender();
          setLoadingProgress(null);

          const realMeshesCount = loadedRecords.filter((r) => !r.isLandmark).length;
          callbacksRef.current.onModelLoaded({
            sourceLabel: modelSource.label,
            meshCount: realMeshesCount,
            isSingleMesh: realMeshesCount <= 1,
            meshes: loadedRecords,
          });
        } catch (err) {
          setLoadingProgress(null);
          callbacksRef.current.onModelError(
            err instanceof Error
              ? `No se pudo procesar la geometría dentaria (${err.message}).`
              : 'No se pudo procesar la pieza dentaria 3D.'
          );
        }
      };

      const startLoad = () => {
        if (cancelled) return;
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
                  ? `No se pudo cargar la pieza 3D (${err.message}).`
                  : 'No se pudo cargar el modelo dentario.'
              );
            }
          );
        } else {
          eng.loader.parse(
            modelSource.buffer,
            '',
            handleParsedGltf,
            (err) => {
              if (cancelled) return;
              setLoadingProgress(null);
              callbacksRef.current.onModelError(
                err instanceof Error
                  ? `Archivo GLB/GLTF inválido (${err.message}).`
                  : 'No se pudo leer el archivo GLB/GLTF cargado.'
              );
            }
          );
        }
      };

      Promise.resolve(MeshoptDecoder.ready)
        .then(startLoad)
        .catch(() => {
          if (cancelled) return;
          // Attempt load anyway in case file isn't meshopt-compressed
          startLoad();
        });

      return () => {
        cancelled = true;
      };
    }, [modelSource, canvasEpoch]);

    useEffect(() => {
      const eng = engineRef.current;
      if (!eng) return;
      eng.applyVisualState();
      eng.requestRender();
    }, [
      highlightedKeys,
      hoveredKey,
      hiddenKeys,
      isolatedKeys,
      translucentHardTissues,
      clipMode,
      clipOffset,
      examHighlightKeys,
    ]);

    if (webglUnavailable) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#F6EFE6] p-6 text-center">
          <p className="font-serif text-lg font-bold text-rose-950">
            WebGL no disponible en este navegador
          </p>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-600">
            Habilitá la aceleración WebGL para visualizar el atlas dentario tridimensional.
          </p>
        </div>
      );
    }

    return (
      <div className="relative h-full w-full overflow-hidden bg-[#F6EFE6]">
        <div
          ref={containerRef}
          aria-label="Visor anatómico 3D dentario"
          className="h-full w-full touch-none select-none"
        />

        {loadingProgress !== null && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-[#F6EFE6]/90">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-200 border-t-rose-900" />
            <p className="mt-3 text-xs font-semibold text-rose-950 tabular-nums">
              Cargando pieza dentaria 3D{loadingProgress > 0 ? ` · ${loadingProgress}%` : '...'}
            </p>
          </div>
        )}

        {webglLost && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F6EFE6]/95 p-6 text-center">
            <p className="text-sm font-bold text-rose-950">
              Contexto gráfico 3D pausado temporalmente
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Podés restaurar el visor dentario con un toque.
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

AtlasToothCanvas.displayName = 'AtlasToothCanvas';

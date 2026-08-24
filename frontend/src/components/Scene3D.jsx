import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Line, Html } from '@react-three/drei';
import * as THREE from 'three';

// ─── 1. WORLD REFERENCE FRAME ───────────────────────────────────────────────
function WorldReferenceFrame() {
  return (
    <group>
      {/* Origin Marker */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.8} />
      </mesh>
      <Html position={[0, -0.4, 0]} distanceFactor={22} center style={{ pointerEvents: 'none' }}>
        <div className="bg-slate-900/90 border border-cyan-500/40 text-cyan-400 font-mono text-[9px] px-1.5 py-0.5 rounded shadow-lg backdrop-blur-md whitespace-nowrap">
          ORIGIN [0, 0, 0]
        </div>
      </Html>

      {/* +X Axis (Azimuth / Right) - RED */}
      <group>
        <Line points={[[0, 0, 0], [8, 0, 0]]} color="#ef4444" lineWidth={3} />
        <mesh position={[8, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.25, 0.6, 12]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <Html position={[8.8, 0, 0]} distanceFactor={22} center style={{ pointerEvents: 'none' }}>
          <div className="bg-red-950/80 border border-red-500/50 text-red-400 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
            +X (AZIMUTH)
          </div>
        </Html>
      </group>

      {/* +Y Axis (Elevation / Up) - GREEN */}
      <group>
        <Line points={[[0, 0, 0], [0, 8, 0]]} color="#22c55e" lineWidth={3} />
        <mesh position={[0, 8, 0]}>
          <coneGeometry args={[0.25, 0.6, 12]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
        <Html position={[0, 8.6, 0]} distanceFactor={22} center style={{ pointerEvents: 'none' }}>
          <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
            +Y (ELEVATION)
          </div>
        </Html>
      </group>

      {/* +Z Axis (Range / Forward) - BLUE */}
      <group>
        <Line points={[[0, 0, 0], [0, 0, 22]]} color="#3b82f6" lineWidth={3} />
        <mesh position={[0, 0, 22]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.25, 0.6, 12]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
        <Html position={[0, 0, 22.8]} distanceFactor={22} center style={{ pointerEvents: 'none' }}>
          <div className="bg-blue-950/80 border border-blue-500/50 text-blue-400 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
            +Z (RANGE / BORESIGHT)
          </div>
        </Html>
      </group>

      {/* Ground Reference Grid */}
      <Grid
        args={[60, 60]}
        position={[0, 0, 0]}
        cellColor="#1e293b"
        sectionColor="#3b82f6"
        sectionSize={5}
        fadeDistance={50}
        infiniteGrid
      />

      {/* Optical Target Focal Plane (Z = 18m) Grid */}
      <group position={[0, 6, 18]}>
        <Grid
          args={[24, 24]}
          rotation={[Math.PI / 2, 0, 0]}
          cellColor="#0284c7"
          sectionColor="#06b6d4"
          sectionSize={4}
          fadeDistance={30}
        />
        <Html position={[0, 11, 0]} distanceFactor={25} center style={{ pointerEvents: 'none' }}>
          <div className="bg-sky-950/80 border border-sky-400/40 text-sky-300 font-mono text-[9px] px-2 py-0.5 rounded tracking-wider uppercase">
            TARGET FOCAL PLANE (Z = 100m)
          </div>
        </Html>
      </group>
    </group>
  );
}

// ─── 2. FSOC TERMINAL & GIMBAL ASSEMBLY ────────────────────────────────────
function FSOCTerminalGimbal({ pan, tilt, isLocked, inFOV }) {
  const panRad = (pan * Math.PI) / 180;
  const tiltRad = (tilt * Math.PI) / 180;

  const laserColor = isLocked ? '#22c55e' : inFOV ? '#06b6d4' : '#f59e0b';

  return (
    <group position={[0, 0, 0]}>
      {/* Heavy Station Pedestal Base */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[3.2, 0.5, 3.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* Base Flange Bolts */}
      {[-1.3, 1.3].map((x) =>
        [-1.3, 1.3].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.52, z]}>
            <cylinderGeometry args={[0.08, 0.08, 0.08, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.9} />
          </mesh>
        ))
      )}

      {/* Stationary Pedestal Cylinder */}
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.9, 1.1, 0.5, 32]} />
        <meshStandardMaterial color="#0284c7" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* ── PAN ASSEMBLY (Rotates around Y axis) ────────────────────────── */}
      <group position={[0, 1.0, 0]} rotation={[0, -panRad, 0]}>
        {/* Visible Pan Axis Ring */}
        <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.15, 0.05, 16, 64]} />
          <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.6} />
        </mesh>

        {/* Pan Indicator Tick */}
        <mesh position={[0, 0.05, 1.2]}>
          <boxGeometry args={[0.08, 0.12, 0.2]} />
          <meshBasicMaterial color="#00f0ff" />
        </mesh>

        {/* Gimbal Dual-Fork Yoke */}
        <mesh position={[-1.0, 0.45, 0]}>
          <boxGeometry args={[0.3, 0.8, 0.6]} />
          <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[1.0, 0.45, 0]}>
          <boxGeometry args={[0.3, 0.8, 0.6]} />
          <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* ── TILT ASSEMBLY (Rotates around local X axis) ──────────────── */}
        <group position={[0, 0.65, 0]} rotation={[-tiltRad, 0, 0]}>
          {/* Visible Tilt Axis Pivot Drums */}
          <mesh position={[-1.0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.25, 0.25, 0.35, 24]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[1.0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.25, 0.25, 0.35, 24]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
          </mesh>

          {/* Camera Payload Casing */}
          <mesh position={[0, 0, 0.3]}>
            <boxGeometry args={[1.3, 0.85, 1.4]} />
            <meshStandardMaterial color="#38bdf8" roughness={0.3} metalness={0.7} emissive="#0284c7" emissiveIntensity={0.2} />
          </mesh>

          {/* Optical Aperture Lens Barrel */}
          <mesh position={[0, 0, 1.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.35, 0.42, 0.6, 32]} />
            <meshStandardMaterial color="#7dd3fc" roughness={0.2} metalness={0.8} emissive="#38bdf8" emissiveIntensity={0.15} />
          </mesh>

          {/* Front Lens Glass Cap */}
          <mesh position={[0, 0, 1.41]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.34, 0.34, 0.02, 32]} />
            <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.8} transparent opacity={0.85} />
          </mesh>

          {/* BORESIGHT RAY (Center Optical Axis) */}
          <Line
            points={[[0, 0, 1.41], [0, 0, 20]]}
            color={laserColor}
            lineWidth={3}
          />
          {/* Boresight Axis Marker Crosshair at end */}
          <mesh position={[0, 0, 20]}>
            <ringGeometry args={[0.15, 0.2, 16]} />
            <meshBasicMaterial color={laserColor} side={THREE.DoubleSide} />
          </mesh>

          {/* Camera HUD Telemetry Label */}
          <Html position={[0, 1.1, 0]} distanceFactor={20} center style={{ pointerEvents: 'none' }}>
            <div className="bg-slate-950/90 border border-blue-500/50 text-blue-300 font-mono text-[10px] px-2 py-1 rounded shadow-xl backdrop-blur-md whitespace-nowrap">
              <div className="text-[9px] text-slate-400 border-b border-slate-700/60 pb-0.5 mb-0.5 tracking-wider font-semibold">
                FSOC TERMINAL GIMBAL
              </div>
              <div className="flex gap-2 text-cyan-400">
                <span>PAN: <strong className="text-white">{pan.toFixed(1)}°</strong></span>
                <span>TILT: <strong className="text-white">{tilt.toFixed(1)}°</strong></span>
              </div>
            </div>
          </Html>

          {/* Dynamic FOV Frustum Visualization (Attached inside Tilt Assembly) */}
          <CameraFOVFrustum fovX={60} fovY={45} range={16.6} inFOV={inFOV} isLocked={isLocked} />
        </group>
      </group>
    </group>
  );
}

// ─── 3. CAMERA FIELD OF VIEW (FOV) FRUSTUM ─────────────────────────────────
function CameraFOVFrustum({ fovX = 60, fovY = 45, range = 16.6, inFOV, isLocked }) {
  const halfFovXRad = (fovX * Math.PI) / 360;
  const halfFovYRad = (fovY * Math.PI) / 360;

  const w = 2 * range * Math.tan(halfFovXRad);
  const h = 2 * range * Math.tan(halfFovYRad);

  const origin = [0, 0, 1.41];
  const tr = [w / 2, h / 2, range + 1.41];
  const tl = [-w / 2, h / 2, range + 1.41];
  const br = [w / 2, -h / 2, range + 1.41];
  const bl = [-w / 2, -h / 2, range + 1.41];

  const edgeColor = isLocked ? '#22c55e' : inFOV ? '#06b6d4' : '#ef4444';
  const fillColor = isLocked ? '#22c55e' : inFOV ? '#06b6d4' : '#ef4444';
  const statusText = isLocked ? 'TARGET LOCKED [IN FOV]' : inFOV ? 'TARGET DETECTED [IN FOV]' : 'TARGET OUT OF FOV';

  // Build transparent 4-sided pyramid frustum mesh geometry
  const frustumMesh = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      // Side 1: Top (Origin -> TL -> TR)
      ...origin, ...tl, ...tr,
      // Side 2: Bottom (Origin -> BR -> BL)
      ...origin, ...br, ...bl,
      // Side 3: Left (Origin -> BL -> TL)
      ...origin, ...bl, ...tl,
      // Side 4: Right (Origin -> TR -> BR)
      ...origin, ...tr, ...br,
    ]);
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.computeVertexNormals();
    return geom;
  }, [range, w, h]);

  return (
    <group>
      {/* FOV Boundary Corner Edges */}
      <Line points={[origin, tr]} color={edgeColor} lineWidth={1.5} transparent opacity={0.6} />
      <Line points={[origin, tl]} color={edgeColor} lineWidth={1.5} transparent opacity={0.6} />
      <Line points={[origin, br]} color={edgeColor} lineWidth={1.5} transparent opacity={0.6} />
      <Line points={[origin, bl]} color={edgeColor} lineWidth={1.5} transparent opacity={0.6} />

      {/* FOV Boundary Far Rectangle Frame */}
      <Line points={[tr, tl, bl, br, tr]} color={edgeColor} lineWidth={2} transparent opacity={0.8} />

      {/* Volumetric Frustum Sides */}
      <mesh geometry={frustumMesh}>
        <meshBasicMaterial color={fillColor} transparent opacity={inFOV ? 0.06 : 0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* FOV Frustum Header Tag */}
      <Html position={[0, h / 2 + 0.5, range + 1.41]} distanceFactor={22} center style={{ pointerEvents: 'none' }}>
        <div className={`font-mono text-[9px] px-2 py-0.5 rounded border shadow-lg uppercase tracking-wider backdrop-blur-md ${
          inFOV ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300' : 'bg-red-950/90 border-red-500/70 text-red-300 animate-pulse'
        }`}>
          {statusText} (60°×45° FOV)
        </div>
      </Html>
    </group>
  );
}

// ─── 4. OPTICAL BEACON TARGET ──────────────────────────────────────────────
function OpticalBeacon({ position, beaconWorld, isLocked, inFOV }) {
  const meshRef = useRef();
  const innerGlowRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.material.emissiveIntensity = 2.5 + 1.2 * Math.sin(t * 8);
    }
    if (innerGlowRef.current) {
      innerGlowRef.current.scale.setScalar(1.0 + 0.15 * Math.sin(t * 6));
    }
  });

  const xVal = beaconWorld?.x || 0;
  const yVal = beaconWorld?.y || 0;
  const mainColor = isLocked ? '#22c55e' : '#00f0ff';
  const haloColor = isLocked ? '#4ade80' : '#38bdf8';

  return (
    <group position={position}>
      {/* Outer Atmospheric Soft Glow Halo (Large) */}
      <mesh>
        <sphereGeometry args={[3.2, 24, 24]} />
        <meshBasicMaterial color={haloColor} transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>

      {/* Mid Pulsing Glow Sphere */}
      <mesh ref={innerGlowRef}>
        <sphereGeometry args={[1.8, 24, 24]} />
        <meshBasicMaterial color={mainColor} transparent opacity={0.25} />
      </mesh>

      {/* Inner High-Intensity Glow Shield */}
      <mesh>
        <sphereGeometry args={[1.2, 24, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.45} />
      </mesh>

      {/* Large Bright Optical Core (Circular Beacon Sphere) */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={mainColor}
          emissiveIntensity={3.0}
          toneMapped={false}
        />
      </mesh>

      {/* Bright Circular Lens Disk / Target Aperture */}
      <mesh rotation={[0, 0, 0]}>
        <circleGeometry args={[1.4, 32]} />
        <meshBasicMaterial color={mainColor} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* Concentric Pulsing Pulse Rings */}
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[1.6, 1.78, 32]} />
        <meshBasicMaterial color={haloColor} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[2.2, 2.32, 32]} />
        <meshBasicMaterial color={mainColor} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Beacon Label HUD */}
      <Html position={[0, 2.4, 0]} distanceFactor={22} center style={{ pointerEvents: 'none' }}>
        <div className="bg-slate-950/95 border border-cyan-400 text-cyan-300 font-mono text-[10px] px-2.5 py-1.5 rounded-lg shadow-2xl backdrop-blur-md text-center whitespace-nowrap">
          <div className="font-bold flex items-center justify-center gap-1.5 text-cyan-300 text-[11px]">
            <span className={`w-2.5 h-2.5 rounded-full ${isLocked ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400 animate-pulse'}`} />
            SATELLITE OPTICAL BEACON
          </div>
          <div className="text-[9px] text-slate-300 mt-0.5">
            X: <span className="text-white font-bold">{xVal.toFixed(1)}m</span> | Y: <span className="text-white font-bold">{yVal.toFixed(1)}m</span> | Z: <span className="text-white font-bold">100m</span>
          </div>
        </div>
      </Html>
    </group>
  );
}

// ─── 5. BEACON ORBIT TRAIL IN FOCAL PLANE ──────────────────────────────────
function BeaconOrbitTrail({ radius = 7.0, height = 6.0, depth = 18.0 }) {
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        height + Math.sin(angle) * radius,
        depth
      ));
    }
    return pts;
  }, [radius, height, depth]);

  return <Line points={points} color="#06b6d4" lineWidth={1.5} transparent opacity={0.25} dashed dashSize={0.4} gapSize={0.2} />;
}

// ─── 6. ALIGNMENT & MISALIGNMENT VISUALIZATION ─────────────────────────────
function AlignmentVisualization({ gimbalPos, beaconPos, pan, tilt, errorDeg, errorPx, inFOV, isLocked }) {
  const panRad = (pan * Math.PI) / 180;
  const tiltRad = (tilt * Math.PI) / 180;

  // Compute boresight end point on target focal plane (Z = 18)
  // Direction vector starting from camera head aperture at local +Z
  const dirX = Math.sin(panRad) * Math.cos(tiltRad);
  const dirY = Math.sin(tiltRad);
  const dirZ = Math.cos(panRad) * Math.cos(tiltRad);

  const lensPos = [0, 1.65, 1.41];
  const targetDepth = 18.0;
  const t = (targetDepth - lensPos[2]) / Math.max(dirZ, 0.01);

  const boresightIntersection = [
    lensPos[0] + dirX * t,
    lensPos[1] + dirY * t,
    targetDepth,
  ];

  const isAligned = (errorDeg || 0) < 1.0;
  const errorLineColor = isAligned ? '#22c55e' : '#f59e0b';

  return (
    <group>
      {/* 1. True Target Line of Sight (LOS) Ray: Lens -> Beacon */}
      <Line
        points={[lensPos, beaconPos]}
        color="#a855f7"
        lineWidth={2}
        dashed
        dashSize={0.4}
        gapSize={0.2}
        transparent
        opacity={0.7}
      />

      {/* Target LOS Vector Label */}
      <Html position={[(lensPos[0] + beaconPos[0]) / 2, (lensPos[1] + beaconPos[1]) / 2 + 0.3, (lensPos[2] + beaconPos[2]) / 2]} distanceFactor={22} center style={{ pointerEvents: 'none' }}>
        <div className="bg-purple-950/80 border border-purple-500/40 text-purple-300 font-mono text-[8px] px-1.5 py-0.5 rounded">
          TARGET LOS VECTOR
        </div>
      </Html>

      {/* 2. Boresight Intersection Spot on Focal Plane */}
      <mesh position={boresightIntersection}>
        <ringGeometry args={[0.2, 0.3, 24]} />
        <meshBasicMaterial color="#00f0ff" side={THREE.DoubleSide} />
      </mesh>

      {/* 3. Focal Plane Misalignment Vector (Boresight Spot -> Actual Beacon) */}
      <Line
        points={[boresightIntersection, beaconPos]}
        color={errorLineColor}
        lineWidth={2.5}
        transparent
        opacity={0.9}
      />

      {/* Pointing Misalignment Telemetry Tag */}
      <Html position={[(boresightIntersection[0] + beaconPos[0]) / 2, (boresightIntersection[1] + beaconPos[1]) / 2 + 0.5, targetDepth]} distanceFactor={22} center style={{ pointerEvents: 'none' }}>
        <div className="bg-slate-950/95 border border-amber-500/60 text-amber-400 font-mono text-[9px] px-2 py-1 rounded shadow-2xl backdrop-blur-md whitespace-nowrap">
          <div className="font-bold text-amber-300 border-b border-slate-800 pb-0.5 mb-0.5">
            COARSE ALIGNMENT ERROR
          </div>
          <div>OFF-AXIS: <strong className="text-white">{(errorDeg || 0).toFixed(2)}°</strong></div>
          <div>DISPLACEMENT: <strong className="text-white">{(errorPx || 0).toFixed(1)} px</strong></div>
        </div>
      </Html>
    </group>
  );
}

// ─── MAIN SCENE3D COMPONENT ────────────────────────────────────────────────
import use3DSimulationState from '../hooks/use3DSimulationState';

export default function Scene3D({ telemetry, scenarioConfig }) {
  const { raw, derived } = use3DSimulationState(telemetry, scenarioConfig);

  const pan = raw.source.pan;
  const tilt = raw.source.tilt;
  const beaconPos = raw.target.worldPosition;
  const gimbalPos = raw.source.worldPosition;
  const isLocked = telemetry?.lock_state === 'LOCKED';

  // Use pure derived geometry from simState layer
  const inFOV = derived.isTargetInFOV;
  const errorDeg = derived.pointingErrorDeg;
  const errorPx = telemetry?.total_error_px || 0;

  return (
    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      {/* Visual Overlay Header */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-slate-900/80 border border-slate-700/60 px-3 py-1.5 rounded-lg backdrop-blur-md pointer-events-none">
        <div className={`w-2.5 h-2.5 rounded-full ${isLocked ? 'bg-emerald-400 animate-pulse' : inFOV ? 'bg-cyan-400' : 'bg-amber-400 animate-ping'}`} />
        <span className="font-mono text-xs font-semibold text-slate-200 tracking-wide">
          FSOC COARSE ALIGNMENT 3D VISUALIZER
        </span>
      </div>

      {/* Spatial Telemetry Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between bg-slate-900/85 border border-slate-800 px-3 py-1.5 rounded-lg backdrop-blur-md text-[10px] font-mono text-slate-300 pointer-events-none">
        <div>DISTANCE: <span className="text-cyan-400 font-bold">{derived.distance.toFixed(1)}m</span></div>
        <div>BEARING: <span className="text-purple-400 font-bold">AZ {derived.horizontalBearing.toFixed(1)}° | EL {derived.verticalBearing.toFixed(1)}°</span></div>
        <div>OFF-AXIS: <span className="text-amber-400 font-bold">{derived.pointingErrorDeg.toFixed(2)}°</span></div>
        <div>FOV: <span className={inFOV ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{inFOV ? "INSIDE" : "OUTSIDE"}</span></div>
      </div>

      <Canvas shadows gl={{ antialias: true }}>
        <color attach="background" args={['#060b17']} />
        <fog attach="fog" args={['#060b17', 25, 80]} />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 15]} intensity={0.8} color="#ffffff" />
        <pointLight position={[beaconPos[0], beaconPos[1], beaconPos[2]]} intensity={3.5} color={isLocked ? '#22c55e' : '#00f0ff'} distance={35} />

        {/* Camera Controls */}
        <PerspectiveCamera makeDefault position={[0, 14, 24]} fov={50} />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={6}
          maxDistance={70}
          target={[0, 4, 10]}
          maxPolarAngle={Math.PI / 1.75}
        />

        {/* 1. World Reference Frame & Grid */}
        <WorldReferenceFrame />

        {/* 2. FSOC Terminal Gimbal & Camera FOV */}
        <FSOCTerminalGimbal pan={pan} tilt={tilt} isLocked={isLocked} inFOV={inFOV} />

        {/* 3. Moving Optical Beacon */}
        <OpticalBeacon position={beaconPos} beaconWorld={telemetry?.beacon_world} isLocked={isLocked} inFOV={inFOV} />

        {/* 4. Target Trajectory Orbit Trail */}
        <BeaconOrbitTrail radius={7.0} height={6.0} depth={18.0} />

        {/* 5. Alignment & Misalignment Vector Rays */}
        <AlignmentVisualization
          gimbalPos={gimbalPos}
          beaconPos={beaconPos}
          pan={pan}
          tilt={tilt}
          errorDeg={errorDeg}
          errorPx={errorPx}
          inFOV={inFOV}
          isLocked={isLocked}
        />
      </Canvas>
    </div>
  );
}




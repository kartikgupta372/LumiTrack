import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Line, Sphere, Cone, Html } from '@react-three/drei';
import * as THREE from 'three';

// ─── Optical Beacon Sphere ─────────────────────────────────────────────────
function BeaconSphere({ position }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      meshRef.current.material.emissiveIntensity = 0.7 + 0.3 * Math.sin(t * 6);
    }
  });

  return (
    <group position={position}>
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.08} />
      </mesh>
      {/* Beacon core */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.6, 24, 24]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#06b6d4"
          emissiveIntensity={0.8}
          toneMapped={false}
        />
      </mesh>
      {/* Label */}
      <Html distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(6,182,212,0.15)',
          border: '1px solid rgba(6,182,212,0.5)',
          borderRadius: '4px',
          padding: '2px 6px',
          color: '#06b6d4',
          fontSize: '10px',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(4px)'
        }}>
          OPTICAL BEACON
        </div>
      </Html>
    </group>
  );
}

// ─── Camera Platform & Frustum ─────────────────────────────────────────────
function CameraPlatform({ pan, tilt }) {
  const panRad = (pan * Math.PI) / 180;
  const tiltRad = (tilt * Math.PI) / 180;

  return (
    <group position={[0, 0, 0]}>
      {/* Base platform */}
      <mesh position={[0, -0.4, 0]}>
        <boxGeometry args={[2.5, 0.3, 2.5]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.4} />
      </mesh>

      {/* Pan axis ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.9, 0.06, 8, 32]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* Camera head (rotates with pan + tilt) */}
      <group rotation={[0, panRad, 0]}>
        <group rotation={[tiltRad, 0, 0]}>
          {/* Camera body box */}
          <mesh position={[0, 0.3, 0.4]}>
            <boxGeometry args={[0.8, 0.6, 1.2]} />
            <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.6} />
          </mesh>

          {/* Camera lens cylinder */}
          <mesh position={[0, 0.3, 1.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.28, 0.32, 0.5, 20]} />
            <meshStandardMaterial color="#1e3a5f" roughness={0.2} metalness={0.9} />
          </mesh>

          {/* FOV Frustum wireframe */}
          <lineSegments position={[0, 0.3, 1.3]}>
            <edgesGeometry args={[new THREE.ConeGeometry(4, 10, 4)]} />
            <lineBasicMaterial color="#06b6d4" transparent opacity={0.25} />
          </lineSegments>

          {/* Camera label */}
          <Html position={[0, 1.2, 0]} distanceFactor={20} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.4)',
              borderRadius: '4px',
              padding: '2px 6px',
              color: '#3b82f6',
              fontSize: '10px',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
            }}>
              PAN: {pan.toFixed(1)}° | TILT: {tilt.toFixed(1)}°
            </div>
          </Html>
        </group>
      </group>
    </group>
  );
}

// ─── Beam Path Line ─────────────────────────────────────────────────────────
function BeamPath({ cameraPos, beaconPos, isLocked }) {
  const color = isLocked ? '#22c55e' : '#f59e0b';
  const opacity = isLocked ? 0.7 : 0.35;

  const points = useMemo(() => [
    new THREE.Vector3(...cameraPos),
    new THREE.Vector3(...beaconPos),
  ], [cameraPos, beaconPos]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={isLocked ? 2 : 1}
      transparent
      opacity={opacity}
      dashed={!isLocked}
      dashSize={0.5}
      gapSize={0.3}
    />
  );
}

// ─── Beacon Orbit Trail ───────────────────────────────────────────────────
function OrbitTrail({ radius = 20, height = 0 }) {
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        Math.cos(angle) * radius * 0.5,
        height,
        Math.sin(angle) * radius * 0.5,
      ));
    }
    return pts;
  }, [radius, height]);

  return <Line points={points} color="#06b6d4" lineWidth={1} transparent opacity={0.2} />;
}

// ─── Main Scene3D Component ─────────────────────────────────────────────────
export default function Scene3D({ telemetry }) {
  const pan = telemetry?.camera?.pan || 0;
  const tilt = telemetry?.camera?.tilt || 0;
  const isLocked = telemetry?.lock_state === 'LOCKED';

  // Map world beacon to scene coordinates (scale down, world is in meters at 100m range)
  const beaconX = (telemetry?.beacon_world?.x || 0) * 0.5;
  const beaconZ = (telemetry?.beacon_world?.y || 0) * 0.5;
  const beaconPos = [beaconX, 8, beaconZ];
  const cameraPos = [0, 0.5, 1.4];

  return (
    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-gray-800 bg-gray-950">
      <Canvas shadows gl={{ antialias: true }}>
        <color attach="background" args={["#060b17"]} />
        <fog attach="fog" args={["#060b17", 30, 120]} />

        {/* Lighting */}
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 20, 0]} intensity={0.6} color="#ffffff" />
        <pointLight position={[beaconX, 8, beaconZ]} intensity={0.8} color="#06b6d4" distance={20} />

        {/* Camera */}
        <PerspectiveCamera makeDefault position={[12, 10, 14]} fov={55} />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={5}
          maxDistance={60}
          maxPolarAngle={Math.PI / 1.8}
        />

        {/* Reference Grid */}
        <Grid
          args={[80, 80]}
          position={[0, -2, 0]}
          cellColor="#1e293b"
          sectionColor="#334155"
          sectionSize={10}
          fadeDistance={60}
          infiniteGrid
        />

        {/* Gimbal Camera Platform */}
        <CameraPlatform pan={pan} tilt={tilt} />

        {/* Moving Optical Beacon */}
        <BeaconSphere position={beaconPos} />

        {/* Optical Beam Path */}
        <BeamPath cameraPos={cameraPos} beaconPos={beaconPos} isLocked={isLocked} />

        {/* Beacon Orbit Trail */}
        <OrbitTrail radius={10} height={8} />

        {/* World Origin Axes */}
        <axesHelper args={[5]} />
      </Canvas>
    </div>
  );
}

"use client";

import React, { useRef, useMemo, Component, type ErrorInfo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";

// ─── Error boundary so a Three.js crash never blanks the whole page ──────────
class CanvasErrorBoundary extends Component<
  { children: React.ReactNode },
  { errored: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { errored: false };
  }
  static getDerivedStateFromError(): { errored: boolean } {
    return { errored: true };
  }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("[RobotScene] Canvas error:", err, info);
  }
  render() {
    if (this.state.errored) return null;
    return this.props.children;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getScroll(v: MotionValue<number> | number): number {
  return typeof v === "number" ? v : v.get();
}

// ─── Platform disc ───────────────────────────────────────────────────────────
function Platform() {
  return (
    <group position={[0, -1.72, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.15, 1.3, 0.2, 48]} />
        <meshStandardMaterial color="#c8d88a" roughness={0.7} metalness={0.05} />
      </mesh>
      {/* craters */}
      {[
        [0.38, 0.12, 0.32],
        [-0.32, 0.12, -0.24],
        [0.1, 0.12, -0.5],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.07 + i * 0.03, 0.1 + i * 0.03, 20]} />
          <meshStandardMaterial color="#a8b870" roughness={0.9} />
        </mesh>
      ))}
      {/* cyan rim glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[1.1, 1.32, 48]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={0.5}
          transparent
          opacity={0.45}
        />
      </mesh>
    </group>
  );
}

// ─── Floating particle ───────────────────────────────────────────────────────
function Particle({
  pos,
  color,
  shape,
  idx,
}: {
  pos: [number, number, number];
  color: string;
  shape: "box" | "tri";
  idx: number;
}) {
  const mesh = useRef<THREE.Mesh>(null!);
  const speed = useMemo(() => 0.28 + (idx % 5) * 0.08, [idx]);
  const phase = useMemo(() => idx * 0.9, [idx]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    mesh.current.rotation.x = t * speed + phase;
    mesh.current.rotation.y = t * speed * 0.7 + phase;
    mesh.current.position.y = pos[1] + Math.sin(t * 0.5 + phase) * 0.14;
  });

  return (
    <mesh ref={mesh} position={pos}>
      {shape === "box" ? (
        <boxGeometry args={[0.07, 0.07, 0.07]} />
      ) : (
        <tetrahedronGeometry args={[0.065]} />
      )}
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.9}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

// ─── Orbit ring ──────────────────────────────────────────────────────────────
function OrbitRing({ r, color, tilt, speed }: { r: number; color: string; tilt: number; speed: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    ref.current.rotation.z = clock.elapsedTime * speed;
  });
  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]}>
      <torusGeometry args={[r, 0.007, 6, 80]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.55} />
    </mesh>
  );
}

// ─── Robot ───────────────────────────────────────────────────────────────────
function Robot({ scroll }: { scroll: MotionValue<number> | number }) {
  const root = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const antOrb = useRef<THREE.Mesh>(null!);
  const eyeL = useRef<THREE.Mesh>(null!);
  const eyeR = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const sp = getScroll(scroll);
    root.current.position.y = Math.sin(t * 0.8) * 0.04;
    root.current.rotation.y = sp * Math.PI * 2.4 + Math.sin(t * 0.25) * 0.08;
    head.current.rotation.y = Math.sin(t * 0.45) * 0.14;
    head.current.rotation.x = Math.sin(t * 0.3) * 0.05;
    const pulse = 1.4 + Math.sin(t * 1.8) * 0.7;
    (antOrb.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
    (eyeL.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse * 0.9;
    (eyeR.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse * 0.9;
  });

  const body = { color: "#0d1526", roughness: 0.3, metalness: 0.75 } as const;
  const accent = { color: "#22d3ee", emissive: "#22d3ee" as const, emissiveIntensity: 1.3, roughness: 0.15, metalness: 0.85 } as const;

  return (
    <group ref={root}>
      {/* torso */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.7, 0.76, 0.44]} />
        <meshStandardMaterial {...body} />
      </mesh>
      {/* chest panel */}
      <mesh position={[0, 0.06, 0.222]}>
        <boxGeometry args={[0.48, 0.44, 0.018]} />
        <meshStandardMaterial color="#07101e" roughness={0.2} metalness={0.9} />
      </mesh>
      {/* chest lines */}
      <mesh position={[0, 0.17, 0.232]}><boxGeometry args={[0.3, 0.022, 0.008]} /><meshStandardMaterial {...accent} /></mesh>
      <mesh position={[0, 0.06, 0.232]}><boxGeometry args={[0.22, 0.022, 0.008]} /><meshStandardMaterial {...accent} /></mesh>
      <mesh position={[0, -0.04, 0.232]}>
        <boxGeometry args={[0.25, 0.022, 0.008]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={1.1} roughness={0.2} metalness={0.85} />
      </mesh>
      {/* core orb */}
      <mesh position={[0, -0.14, 0.232]}>
        <sphereGeometry args={[0.063, 14, 14]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2.2} roughness={0} metalness={1} />
      </mesh>
      {/* shoulders */}
      {[-0.44, 0.44].map((x, i) => (
        <mesh key={i} position={[x, 0.21, 0]}>
          <sphereGeometry args={[0.155, 14, 14]} />
          <meshStandardMaterial {...body} />
        </mesh>
      ))}
      {/* arms */}
      {[-0.53, 0.53].map((x, i) => (
        <group key={i}>
          <mesh position={[x, -0.09, 0]} rotation={[0, 0, i === 0 ? -0.14 : 0.14]}>
            <boxGeometry args={[0.2, 0.55, 0.22]} />
            <meshStandardMaterial {...body} />
          </mesh>
          <mesh position={[x, -0.01, 0.118]}>
            <boxGeometry args={[0.18, 0.038, 0.008]} />
            <meshStandardMaterial {...accent} />
          </mesh>
          {/* hand */}
          <mesh position={[x, -0.44, 0]}>
            <boxGeometry args={[0.18, 0.17, 0.17]} />
            <meshStandardMaterial {...body} />
          </mesh>
        </group>
      ))}
      {/* hip */}
      <mesh position={[0, -0.44, 0]}>
        <boxGeometry args={[0.62, 0.21, 0.4]} />
        <meshStandardMaterial {...body} />
      </mesh>
      {/* legs */}
      {[-0.21, 0.21].map((x, i) => (
        <group key={i}>
          <mesh position={[x, -0.86, 0]}>
            <boxGeometry args={[0.23, 0.55, 0.28]} />
            <meshStandardMaterial {...body} />
          </mesh>
          <mesh position={[x, -0.71, 0.148]}>
            <boxGeometry args={[0.18, 0.055, 0.008]} />
            <meshStandardMaterial {...accent} />
          </mesh>
          {/* foot */}
          <mesh position={[x, -1.19, 0.04]}>
            <boxGeometry args={[0.26, 0.13, 0.38]} />
            <meshStandardMaterial {...body} />
          </mesh>
        </group>
      ))}
      {/* neck */}
      <mesh position={[0, 0.44, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.14, 10]} />
        <meshStandardMaterial {...body} />
      </mesh>
      {/* head group */}
      <group ref={head} position={[0, 0.71, 0]}>
        {/* head box */}
        <mesh>
          <boxGeometry args={[0.62, 0.53, 0.53]} />
          <meshStandardMaterial {...body} />
        </mesh>
        {/* visor */}
        <mesh position={[0, 0.05, 0.272]}>
          <boxGeometry args={[0.45, 0.19, 0.016]} />
          <meshStandardMaterial color="#071428" roughness={0} metalness={1} />
        </mesh>
        {/* eyes */}
        <mesh ref={eyeL} position={[-0.13, 0.05, 0.278]}>
          <boxGeometry args={[0.105, 0.08, 0.008]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.5} />
        </mesh>
        <mesh ref={eyeR} position={[0.13, 0.05, 0.278]}>
          <boxGeometry args={[0.105, 0.08, 0.008]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.5} />
        </mesh>
        {/* mouth */}
        <mesh position={[0, -0.1, 0.272]}>
          <boxGeometry args={[0.23, 0.028, 0.008]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={1.2} />
        </mesh>
        {/* ear accents */}
        {[-0.315, 0.315].map((x, i) => (
          <mesh key={i} position={[x, 0.1, 0]}>
            <boxGeometry args={[0.008, 0.055, 0.18]} />
            <meshStandardMaterial {...accent} />
          </mesh>
        ))}
        {/* antenna stem */}
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.24, 8]} />
          <meshStandardMaterial {...body} />
        </mesh>
        {/* antenna orb */}
        <mesh ref={antOrb} position={[0, 0.505, 0]}>
          <sphereGeometry args={[0.052, 10, 10]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2.2} roughness={0} metalness={1} />
        </mesh>
        {/* satellite dish (small) */}
        <mesh position={[0.22, 0.32, 0]} rotation={[0, 0, Math.PI / 5]}>
          <cylinderGeometry args={[0.09, 0.04, 0.04, 12, 1, true]} />
          <meshStandardMaterial color="#1a2a3a" roughness={0.4} metalness={0.8} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.22, 0.35, 0]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.5} />
        </mesh>
      </group>
    </group>
  );
}

// ─── Particle config ─────────────────────────────────────────────────────────
const PARTICLES: Array<{ pos: [number, number, number]; color: string; shape: "box" | "tri" }> = [
  { pos: [-1.65, 0.82, -0.5], color: "#22d3ee", shape: "box" },
  { pos: [1.72, 0.5, -0.3], color: "#a855f7", shape: "tri" },
  { pos: [-1.42, -0.65, 0.2], color: "#22d3ee", shape: "tri" },
  { pos: [1.52, -0.82, 0.4], color: "#3b82f6", shape: "box" },
  { pos: [0.82, 1.45, -0.6], color: "#a855f7", shape: "box" },
  { pos: [-0.88, 1.22, 0.3], color: "#22d3ee", shape: "tri" },
  { pos: [1.22, 1.05, 0.5], color: "#3b82f6", shape: "tri" },
  { pos: [-1.85, 0.22, -0.4], color: "#a855f7", shape: "box" },
];

// ─── Scene ───────────────────────────────────────────────────────────────────
function Scene({ scroll }: { scroll: MotionValue<number> | number }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 8, 5]} intensity={0.9} />
      <pointLight position={[0, 2, 3]} intensity={2.2} color="#22d3ee" distance={9} />
      <pointLight position={[-3, 0, 2]} intensity={0.9} color="#a855f7" distance={11} />
      <pointLight position={[3, -1, 2]} intensity={0.7} color="#3b82f6" distance={11} />
      <Float speed={1.4} rotationIntensity={0} floatIntensity={0.28}>
        <Robot scroll={scroll} />
        <Platform />
      </Float>
      <OrbitRing r={1.82} color="#a855f7" tilt={Math.PI / 4} speed={0.13} />
      <OrbitRing r={2.24} color="#22d3ee" tilt={-Math.PI / 6} speed={-0.08} />
      {PARTICLES.map((p, i) => (
        <Particle key={i} {...p} idx={i} />
      ))}
    </>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────
export default function RobotScene({
  scroll,
  className = "",
}: {
  scroll: MotionValue<number> | number;
  className?: string;
}) {
  return (
    <CanvasErrorBoundary>
      <div className={`w-full h-full ${className}`}>
        <Canvas camera={{ position: [0, 0.2, 5.5], fov: 40 }} gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
          <Scene scroll={scroll} />
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
}

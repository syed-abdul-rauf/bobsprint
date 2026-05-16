"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { MotionValue } from "framer-motion";
import * as THREE from "three";

interface RobotProps {
  scrollProgress: MotionValue<number> | number;
}

function getScrollValue(v: MotionValue<number> | number): number {
  if (typeof v === "number") return v;
  return v.get();
}

function FloatingParticle({
  position,
  color,
  shape,
}: {
  position: [number, number, number];
  color: string;
  shape: "box" | "tetra";
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const speed = useMemo(() => 0.3 + Math.random() * 0.4, []);
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.x = state.clock.elapsedTime * speed + offset;
    mesh.current.rotation.y = state.clock.elapsedTime * speed * 0.7 + offset;
    mesh.current.position.y =
      position[1] + Math.sin(state.clock.elapsedTime * 0.5 + offset) * 0.15;
  });

  return (
    <mesh ref={mesh} position={position}>
      {shape === "box" ? (
        <boxGeometry args={[0.08, 0.08, 0.08]} />
      ) : (
        <tetrahedronGeometry args={[0.07]} />
      )}
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.8}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

function Platform() {
  return (
    <group position={[0, -1.7, 0]}>
      {/* Main disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.1, 1.25, 0.18, 48]} />
        <meshStandardMaterial
          color="#c8d98a"
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>
      {/* Crater ring 1 */}
      <mesh position={[0.35, 0.1, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.16, 24]} />
        <meshStandardMaterial color="#a8b870" roughness={0.8} />
      </mesh>
      {/* Crater ring 2 */}
      <mesh position={[-0.3, 0.1, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.07, 0.1, 24]} />
        <meshStandardMaterial color="#a8b870" roughness={0.8} />
      </mesh>
      {/* Rim glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.1, 1.28, 48]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={0.4}
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  );
}

function RobotBody({ scrollProgress }: RobotProps) {
  const group = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const antennaGlowRef = useRef<THREE.Mesh>(null);
  const eyeLeftRef = useRef<THREE.Mesh>(null);
  const eyeRightRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const sp = getScrollValue(scrollProgress);

    // Idle bob
    group.current.position.y = Math.sin(t * 0.8) * 0.04;

    // Scroll-driven rotation: 0 → full spin
    group.current.rotation.y = sp * Math.PI * 2.5 + Math.sin(t * 0.3) * 0.1;

    // Head gentle look around
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.5) * 0.15;
      headRef.current.rotation.x = Math.sin(t * 0.3) * 0.05;
    }

    // Antenna pulse
    if (antennaGlowRef.current) {
      const mat = antennaGlowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.5 + Math.sin(t * 2) * 0.8;
    }

    // Eye glow pulse
    if (eyeLeftRef.current && eyeRightRef.current) {
      const intensity = 1.2 + Math.sin(t * 1.5) * 0.5;
      (eyeLeftRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
      (eyeRightRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
    }
  });

  const bodyMat = { color: "#0d1526", roughness: 0.3, metalness: 0.7 };
  const accentMat = { color: "#22d3ee", emissive: "#22d3ee" as const, emissiveIntensity: 1.2, roughness: 0.2, metalness: 0.8 };

  return (
    <group ref={group}>
      {/* Torso */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.68, 0.75, 0.42]} />
        <meshStandardMaterial {...bodyMat} />
      </mesh>

      {/* Chest panel */}
      <mesh position={[0, 0.05, 0.215]}>
        <boxGeometry args={[0.46, 0.42, 0.02]} />
        <meshStandardMaterial color="#091020" roughness={0.2} metalness={0.9} />
      </mesh>

      {/* Chest accent lines */}
      <mesh position={[0, 0.15, 0.228]}>
        <boxGeometry args={[0.3, 0.025, 0.01]} />
        <meshStandardMaterial {...accentMat} />
      </mesh>
      <mesh position={[0, 0.05, 0.228]}>
        <boxGeometry args={[0.22, 0.025, 0.01]} />
        <meshStandardMaterial {...accentMat} />
      </mesh>
      <mesh position={[0, -0.05, 0.228]}>
        <boxGeometry args={[0.26, 0.025, 0.01]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={1.0} roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Core orb */}
      <mesh position={[0, -0.1, 0.228]}>
        <sphereGeometry args={[0.065, 16, 16]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} roughness={0} metalness={1} />
      </mesh>

      {/* Shoulders */}
      <mesh position={[-0.42, 0.2, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial {...bodyMat} />
      </mesh>
      <mesh position={[0.42, 0.2, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial {...bodyMat} />
      </mesh>

      {/* Arms */}
      <mesh position={[-0.52, -0.1, 0]} rotation={[0, 0, -0.15]}>
        <boxGeometry args={[0.2, 0.55, 0.22]} />
        <meshStandardMaterial {...bodyMat} />
      </mesh>
      <mesh position={[0.52, -0.1, 0]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[0.2, 0.55, 0.22]} />
        <meshStandardMaterial {...bodyMat} />
      </mesh>

      {/* Arm accent strips */}
      <mesh position={[-0.52, -0.02, 0.115]}>
        <boxGeometry args={[0.18, 0.04, 0.01]} />
        <meshStandardMaterial {...accentMat} />
      </mesh>
      <mesh position={[0.52, -0.02, 0.115]}>
        <boxGeometry args={[0.18, 0.04, 0.01]} />
        <meshStandardMaterial {...accentMat} />
      </mesh>

      {/* Hands */}
      <mesh position={[-0.53, -0.44, 0]}>
        <boxGeometry args={[0.18, 0.18, 0.18]} />
        <meshStandardMaterial {...bodyMat} />
      </mesh>
      <mesh position={[0.53, -0.44, 0]}>
        <boxGeometry args={[0.18, 0.18, 0.18]} />
        <meshStandardMaterial {...bodyMat} />
      </mesh>

      {/* Hip */}
      <mesh position={[0, -0.44, 0]}>
        <boxGeometry args={[0.6, 0.2, 0.38]} />
        <meshStandardMaterial {...bodyMat} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.2, -0.85, 0]}>
        <boxGeometry args={[0.22, 0.55, 0.28]} />
        <meshStandardMaterial {...bodyMat} />
      </mesh>
      <mesh position={[0.2, -0.85, 0]}>
        <boxGeometry args={[0.22, 0.55, 0.28]} />
        <meshStandardMaterial {...bodyMat} />
      </mesh>

      {/* Knee accents */}
      <mesh position={[-0.2, -0.7, 0.145]}>
        <boxGeometry args={[0.18, 0.06, 0.01]} />
        <meshStandardMaterial {...accentMat} />
      </mesh>
      <mesh position={[0.2, -0.7, 0.145]}>
        <boxGeometry args={[0.18, 0.06, 0.01]} />
        <meshStandardMaterial {...accentMat} />
      </mesh>

      {/* Feet */}
      <mesh position={[-0.2, -1.18, 0.04]}>
        <boxGeometry args={[0.26, 0.14, 0.38]} />
        <meshStandardMaterial {...bodyMat} />
      </mesh>
      <mesh position={[0.2, -1.18, 0.04]}>
        <boxGeometry args={[0.26, 0.14, 0.38]} />
        <meshStandardMaterial {...bodyMat} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 0.44, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.15, 12]} />
        <meshStandardMaterial {...bodyMat} />
      </mesh>

      {/* Head */}
      <mesh ref={headRef} position={[0, 0.7, 0]}>
        <boxGeometry args={[0.6, 0.52, 0.52]} />
        <meshStandardMaterial {...bodyMat} />

        {/* Visor */}
        <mesh position={[0, 0.04, 0.27]}>
          <boxGeometry args={[0.44, 0.18, 0.02]} />
          <meshStandardMaterial color="#0a192f" roughness={0.0} metalness={1} />
        </mesh>

        {/* Eyes */}
        <mesh ref={eyeLeftRef} position={[-0.13, 0.04, 0.275]}>
          <boxGeometry args={[0.1, 0.08, 0.01]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.5} />
        </mesh>
        <mesh ref={eyeRightRef} position={[0.13, 0.04, 0.275]}>
          <boxGeometry args={[0.1, 0.08, 0.01]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.5} />
        </mesh>

        {/* Mouth */}
        <mesh position={[0, -0.1, 0.27]}>
          <boxGeometry args={[0.22, 0.03, 0.01]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={1.2} />
        </mesh>

        {/* Antenna base */}
        <mesh position={[0, 0.29, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.22, 8]} />
          <meshStandardMaterial {...bodyMat} />
        </mesh>

        {/* Antenna orb */}
        <mesh ref={antennaGlowRef} position={[0, 0.44, 0]}>
          <sphereGeometry args={[0.055, 12, 12]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} roughness={0} metalness={1} />
        </mesh>

        {/* Head side accents */}
        <mesh position={[0.305, 0.1, 0]}>
          <boxGeometry args={[0.01, 0.06, 0.18]} />
          <meshStandardMaterial {...accentMat} />
        </mesh>
        <mesh position={[-0.305, 0.1, 0]}>
          <boxGeometry args={[0.01, 0.06, 0.18]} />
          <meshStandardMaterial {...accentMat} />
        </mesh>
      </mesh>
    </group>
  );
}

function OrbitRing({
  radius,
  color,
  tilt,
  speed,
}: {
  radius: number;
  color: string;
  tilt: number;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.z = state.clock.elapsedTime * speed;
  });

  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]}>
      <torusGeometry args={[radius, 0.008, 8, 80]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.7}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

const particles: Array<{ position: [number, number, number]; color: string; shape: "box" | "tetra" }> = [
  { position: [-1.6, 0.8, -0.5], color: "#22d3ee", shape: "box" },
  { position: [1.7, 0.5, -0.3], color: "#a855f7", shape: "tetra" },
  { position: [-1.4, -0.6, 0.2], color: "#22d3ee", shape: "tetra" },
  { position: [1.5, -0.8, 0.4], color: "#3b82f6", shape: "box" },
  { position: [0.8, 1.4, -0.6], color: "#a855f7", shape: "box" },
  { position: [-0.9, 1.2, 0.3], color: "#22d3ee", shape: "tetra" },
  { position: [1.2, 1.0, 0.5], color: "#3b82f6", shape: "tetra" },
  { position: [-1.8, 0.2, -0.4], color: "#a855f7", shape: "box" },
];

function Scene({ scrollProgress }: { scrollProgress: MotionValue<number> | number }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} color="#ffffff" />
      <pointLight position={[0, 2, 3]} intensity={2} color="#22d3ee" distance={8} />
      <pointLight position={[-3, 0, 2]} intensity={0.8} color="#a855f7" distance={10} />
      <pointLight position={[3, -1, 2]} intensity={0.6} color="#3b82f6" distance={10} />

      <Float speed={1.5} rotationIntensity={0} floatIntensity={0.3}>
        <RobotBody scrollProgress={scrollProgress} />
        <Platform />
      </Float>

      <OrbitRing radius={1.8} color="#a855f7" tilt={Math.PI / 4} speed={0.12} />
      <OrbitRing radius={2.2} color="#22d3ee" tilt={-Math.PI / 6} speed={-0.08} />

      {particles.map((p, i) => (
        <FloatingParticle key={i} {...p} />
      ))}
    </>
  );
}

interface RobotSceneProps {
  scrollProgress: MotionValue<number> | number;
  className?: string;
}

export default function RobotScene({ scrollProgress, className = "" }: RobotSceneProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0.2, 5.5], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Scene scrollProgress={scrollProgress} />
      </Canvas>
    </div>
  );
}

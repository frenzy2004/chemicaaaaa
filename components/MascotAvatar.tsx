import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { TrackingData } from '../types';

interface MascotModelProps {
  trackingData: React.MutableRefObject<TrackingData>;
}

const CYAN = '#5ff4f1';
const SOFT_CYAN = '#9ffdf8';
const INK = '#071016';
const SHELL = '#f3f7f6';
const SHELL_SHADE = '#b8c5c2';
const COAT = '#eef7f3';
const REAGENT = '#78f28b';
const AMBER = '#ffd166';

// Classroom-quest lab helper with a cleaner silhouette and expressive visor.
const MascotModel: React.FC<MascotModelProps> = ({ trackingData }) => {
  const headGroupRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);

  const visorShape = useMemo(() => {
    const width = 1.34;
    const height = 0.55;
    const radius = 0.24;
    const x = -width / 2;
    const y = -height / 2;
    const shape = new THREE.Shape();

    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);

    return shape;
  }, []);

  // Simple animation: subtle floating and looking around
  useFrame((state) => {
    // HEAD LOGIC (Rotation Tracking)
    if (headGroupRef.current) {
      // Look At Logic
      const data = trackingData.current;
      let targetX = 0;
      let targetY = 0;

      // Determine target based on hand presence
      if (data.left.isDetected && data.right.isDetected) {
        // Look at midpoint
        targetX = (data.left.position.x + data.right.position.x) / 2;
        targetY = (data.left.position.y + data.right.position.y) / 2;
      } else if (data.left.isDetected) {
        targetX = data.left.position.x;
        targetY = data.left.position.y;
      } else if (data.right.isDetected) {
        targetX = data.right.position.x;
        targetY = data.right.position.y;
      } else {
        // Idle: Look slightly around or center
        targetX = 0.5 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
        targetY = 0.5;
      }

      // NEW MAPPING
      // Avatar is positioned at Bottom-Right of screen.
      // Normalized Screen Coords: (1, 1) is Bottom-Right.
      // We use (0.9, 0.9) to approximate the center of the avatar widget.
      const AVATAR_SCREEN_X = 0.9;
      const AVATAR_SCREEN_Y = 0.9;

      // Calculate vector from Avatar to Target
      // X: Target < Avatar (Left) -> Negative
      const worldX = (targetX - AVATAR_SCREEN_X) * 6; 
      // Y: Target < Avatar (Up) -> Positive (since Screen Y is inverted vs 3D Y)
      const worldY = -(targetY - AVATAR_SCREEN_Y) * 6; 
      const worldZ = 3; // Depth scaling

      // Create a target vector
      const targetVec = new THREE.Vector3(worldX, worldY, worldZ);
      
      // Smoothly interpolate current look direction
      const currentRotation = headGroupRef.current.rotation.clone();
      headGroupRef.current.lookAt(targetVec);
      const targetRotation = headGroupRef.current.rotation.clone();

      // Clamp Vertical Rotation (Pitch / X-axis)
      // Prevent looking too far up (negative X) or down (positive X)
      // Revised request: Can turn down around 60 degrees (approx 1.0 rad)
      targetRotation.x = Math.max(-0.15, Math.min(1.0, targetRotation.x));

      // Clamp Horizontal Rotation (Yaw / Y-axis) if needed, though usually fine
      // targetRotation.y = Math.max(-1.0, Math.min(1.0, targetRotation.y));
      
      // Reset and lerp manually for smoothness
      headGroupRef.current.rotation.copy(currentRotation);
      
      // Simple Lerp for smooth following
      headGroupRef.current.rotation.x += (targetRotation.x - headGroupRef.current.rotation.x) * 0.1;
      headGroupRef.current.rotation.y += (targetRotation.y - headGroupRef.current.rotation.y) * 0.1;
      headGroupRef.current.rotation.z += (targetRotation.z - headGroupRef.current.rotation.z) * 0.1;
    }
  });

  return (
    <Float speed={1.8} rotationIntensity={0.12} floatIntensity={0.36}>
      <group scale={0.9} position={[0, -0.16, 0]}>
        {/* Soft contact shadow */}
        <mesh position={[0, -1.65, -0.12]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.15, 0.36, 1]}>
          <circleGeometry args={[1, 48]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.22} depthWrite={false} />
        </mesh>

        {/* --- HEAD GROUP (Rotates) --- */}
        <group ref={headGroupRef} position={[0, 0.18, 0]}>
          {/* Ears / side capsules */}
          <mesh position={[-0.86, -0.02, 0.03]} scale={[0.18, 0.33, 0.18]}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshStandardMaterial color={SHELL_SHADE} roughness={0.42} metalness={0.04} />
          </mesh>
          <mesh position={[0.86, -0.02, 0.03]} scale={[0.18, 0.33, 0.18]}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshStandardMaterial color={SHELL_SHADE} roughness={0.42} metalness={0.04} />
          </mesh>

          {/* Head shell */}
          <mesh scale={[0.98, 0.93, 0.94]}>
            <sphereGeometry args={[1, 48, 48]} />
            <meshStandardMaterial color={SHELL} roughness={0.34} metalness={0.02} />
          </mesh>

          {/* Gentle lower shell shading */}
          <mesh position={[0, -0.27, -0.02]} scale={[0.92, 0.48, 0.9]}>
            <sphereGeometry args={[1, 32, 20]} />
            <meshStandardMaterial color={SHELL_SHADE} roughness={0.6} metalness={0.02} transparent opacity={0.32} />
          </mesh>

          {/* Clean visor plate */}
          <mesh position={[0, 0.02, 0.955]} scale={[1, 0.92, 1]}>
            <shapeGeometry args={[visorShape]} />
            <meshStandardMaterial
              color={INK}
              roughness={0.22}
              metalness={0.28}
              emissive="#06161a"
              emissiveIntensity={0.35}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Visor shine */}
          <mesh position={[-0.21, 0.23, 0.965]} rotation={[0, 0, -0.08]} scale={[0.46, 0.045, 1]}>
            <circleGeometry args={[1, 32]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.18} depthWrite={false} />
          </mesh>

          {/* Eyes */}
          <mesh position={[-0.25, 0.03, 0.985]} scale={[0.13, 0.17, 1]}>
            <circleGeometry args={[1, 32]} />
            <meshBasicMaterial color={SOFT_CYAN} toneMapped={false} />
          </mesh>
          <mesh position={[0.25, 0.03, 0.985]} scale={[0.13, 0.17, 1]}>
            <circleGeometry args={[1, 32]} />
            <meshBasicMaterial color={SOFT_CYAN} toneMapped={false} />
          </mesh>
          <mesh position={[-0.29, 0.08, 0.995]} scale={[0.035, 0.045, 1]}>
            <circleGeometry args={[1, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} toneMapped={false} />
          </mesh>
          <mesh position={[0.21, 0.08, 0.995]} scale={[0.035, 0.045, 1]}>
            <circleGeometry args={[1, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} toneMapped={false} />
          </mesh>

          {/* Small friendly mouth indicator */}
          <mesh position={[0, -0.2, 0.99]} scale={[0.32, 0.026, 1]}>
            <circleGeometry args={[1, 24]} />
            <meshBasicMaterial color={CYAN} transparent opacity={0.75} toneMapped={false} />
          </mesh>

          {/* Cheek lights */}
          <mesh position={[-0.58, -0.08, 0.955]} scale={[0.075, 0.11, 1]}>
            <circleGeometry args={[1, 24]} />
            <meshBasicMaterial color={CYAN} transparent opacity={0.75} toneMapped={false} />
          </mesh>
          <mesh position={[0.58, -0.08, 0.955]} scale={[0.075, 0.11, 1]}>
            <circleGeometry args={[1, 24]} />
            <meshBasicMaterial color={CYAN} transparent opacity={0.75} toneMapped={false} />
          </mesh>

          {/* Antenna */}
          <mesh position={[0, 1.05, 0]} rotation={[0, 0, -0.18]}>
            <cylinderGeometry args={[0.035, 0.045, 0.38, 16]} />
            <meshStandardMaterial color={SHELL_SHADE} roughness={0.22} metalness={0.35} />
          </mesh>
          <mesh position={[0.07, 1.28, 0]}>
            <sphereGeometry args={[0.12, 20, 20]} />
            <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={1.8} toneMapped={false} />
          </mesh>
        </group>

        {/* --- BODY GROUP (Static) --- */}
        <group ref={bodyGroupRef}>
          {/* Neck ring */}
          <mesh position={[0, -0.71, 0]} scale={[0.58, 0.2, 0.58]}>
            <sphereGeometry args={[1, 32, 16]} />
            <meshStandardMaterial color={SHELL_SHADE} roughness={0.5} />
          </mesh>

          {/* Coat body */}
          <mesh position={[0, -1.18, 0]} scale={[1, 1, 0.78]}>
            <cylinderGeometry args={[0.55, 0.86, 0.88, 40]} />
            <meshStandardMaterial color={COAT} roughness={0.5} metalness={0.02} />
          </mesh>

          {/* Coat center panel */}
          <mesh position={[0, -1.18, 0.63]} scale={[0.2, 0.52, 0.045]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#dce9e5" roughness={0.52} />
          </mesh>

          {/* Collar flaps */}
          <mesh position={[-0.18, -0.85, 0.66]} rotation={[0, 0, -0.34]} scale={[0.22, 0.18, 0.055]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#ffffff" roughness={0.45} />
          </mesh>
          <mesh position={[0.18, -0.85, 0.66]} rotation={[0, 0, 0.34]} scale={[0.22, 0.18, 0.055]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#ffffff" roughness={0.45} />
          </mesh>

          {/* Reagent badge */}
          <mesh position={[0.32, -1.12, 0.68]} scale={[0.09, 0.09, 1]}>
            <circleGeometry args={[1, 24]} />
            <meshBasicMaterial color={REAGENT} toneMapped={false} />
          </mesh>
          <mesh position={[0.32, -1.12, 0.69]} scale={[0.04, 0.04, 1]}>
            <circleGeometry args={[1, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.65} toneMapped={false} />
          </mesh>

          {/* Stubby arms */}
          <mesh position={[-0.78, -1.18, 0.05]} rotation={[0, 0, -0.62]} scale={[0.14, 0.42, 0.14]}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshStandardMaterial color={SHELL_SHADE} roughness={0.5} />
          </mesh>
          <mesh position={[0.78, -1.18, 0.05]} rotation={[0, 0, 0.62]} scale={[0.14, 0.42, 0.14]}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshStandardMaterial color={SHELL_SHADE} roughness={0.5} />
          </mesh>

          {/* Little feet */}
          <mesh position={[-0.36, -1.67, 0.12]} scale={[0.26, 0.09, 0.22]}>
            <sphereGeometry args={[1, 20, 12]} />
            <meshStandardMaterial color={SHELL_SHADE} roughness={0.55} />
          </mesh>
          <mesh position={[0.36, -1.67, 0.12]} scale={[0.26, 0.09, 0.22]}>
            <sphereGeometry args={[1, 20, 12]} />
            <meshStandardMaterial color={SHELL_SHADE} roughness={0.55} />
          </mesh>

          {/* Tiny chemistry spark */}
          <mesh position={[-0.42, -0.98, 0.72]} scale={[0.055, 0.055, 1]}>
            <circleGeometry args={[1, 16]} />
            <meshBasicMaterial color={AMBER} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </Float>
  );
};

interface MascotAvatarProps {
  trackingData: React.MutableRefObject<TrackingData>;
}

const MascotAvatar: React.FC<MascotAvatarProps> = ({ trackingData }) => {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0.05, 4.9], fov: 36 }} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={1.25} />
        <directionalLight position={[3, 5, 5]} intensity={1.2} color="#ffffff" />
        <pointLight position={[-3, 1, 4]} intensity={1.4} color={CYAN} />
        <pointLight position={[3, -2, 2]} intensity={0.45} color={AMBER} />
        <MascotModel trackingData={trackingData} />
      </Canvas>
    </div>
  );
};

export default MascotAvatar;

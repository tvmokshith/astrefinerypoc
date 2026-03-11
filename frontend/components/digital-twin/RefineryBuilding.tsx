"use client";

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { Building } from '@/lib/types';
import { Activity, Zap, AlertTriangle } from 'lucide-react';

interface Props {
    building: Building;
    isSelected: boolean;
    onClick: (b: Building) => void;
}

export default function RefineryBuilding({ building, isSelected, onClick }: Props) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHover] = useState(false);

    useFrame((state) => {
        if (!meshRef.current) return;

        const t = state.clock.elapsedTime;

        if (building.id === 'flare') {
            meshRef.current.scale.y = 1 + Math.sin(t * 6) * 0.08;
        }

        if (building.status === 'critical') {
            meshRef.current.position.y = Math.sin(t * 6) * 0.15 + 0.1;
        } else {
            meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, 0, 0.1);
        }
    });

    const getStatusColor = () => {
        if (building.status === 'critical') return '#ef4444';
        if (building.status === 'warning') return '#f59e0b';
        return building.color || '#3b82f6';
    };

    const isReactor = building.name.includes('Reactor') || building.id === 'fcc';
    const isStorage = building.name.includes('Storage');
    const isCooling = building.name.toLowerCase().includes('cooling tower');
    const isFlare = building.id === 'flare';

    return (
        <group position={building.position} onClick={(e) => { e.stopPropagation(); onClick(building); }}>
            <mesh
                ref={meshRef}
                onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={(e) => { e.stopPropagation(); setHover(false); document.body.style.cursor = 'auto'; }}
            >
                {isFlare ? (
                    <cylinderGeometry args={[0.25, 0.25, 2.4, 18]} />
                ) : isCooling ? (
                    <cylinderGeometry args={[1.1, 0.9, 1.4, 20]} />
                ) : isStorage ? (
                    <cylinderGeometry args={[0.8, 0.8, 1.2, 16]} />
                ) : isReactor ? (
                    <capsuleGeometry args={[0.5, 1, 8, 16]} />
                ) : (
                    <boxGeometry args={[1.5, 1.2, 1.5]} />
                )}

                <meshStandardMaterial
                    color={getStatusColor()}
                    emissive={getStatusColor()}
                    emissiveIntensity={isSelected ? 0.9 : hovered ? 0.4 : 0.18}
                    roughness={0.25}
                    metalness={0.85}
                />
                <Edges scale={1.01} color={isSelected ? 'white' : 'black'} />
            </mesh>

            {/* Flare flame */}
            {isFlare && (
                <mesh position={[0, 1.4, 0]}>
                    <sphereGeometry args={[0.35, 16, 16]} />
                    <meshBasicMaterial color="#fb923c" transparent opacity={0.9} />
                </mesh>
            )}

            {/* Additional detail geometry per unit to make the site feel more like a refinery */}
            {/* CDU / VDU: multiple tall columns and a furnace block */}
            {building.id === 'cdu' && (
                <group>
                    <mesh position={[-0.9, 1.0, -0.3]}>
                        <cylinderGeometry args={[0.25, 0.25, 2.0, 20]} />
                        <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
                    </mesh>
                    <mesh position={[-0.3, 1.2, 0.5]}>
                        <cylinderGeometry args={[0.22, 0.22, 2.4, 20]} />
                        <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
                    </mesh>
                    <mesh position={[0.8, 0.4, 0]}>
                        <boxGeometry args={[1.0, 0.6, 0.8]} />
                        <meshStandardMaterial color="#991b1b" metalness={0.6} roughness={0.4} />
                    </mesh>
                </group>
            )}

            {building.id === 'vdu' && (
                <group>
                    <mesh position={[0.0, 1.4, 0]}>
                        <cylinderGeometry args={[0.3, 0.3, 2.8, 22]} />
                        <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
                    </mesh>
                    <mesh position={[0.9, 0.6, 0.4]}>
                        <boxGeometry args={[0.8, 0.5, 0.8]} />
                        <meshStandardMaterial color="#92400e" metalness={0.6} roughness={0.4} />
                    </mesh>
                </group>
            )}

            {/* FCC / Hydrotreater / Reformer clusters */}
            {building.id === 'fcc' && (
                <group>
                    <mesh position={[-0.6, 1.0, 0]}>
                        <capsuleGeometry args={[0.35, 1.4, 8, 16]} />
                        <meshStandardMaterial color="#4c1d95" metalness={0.7} roughness={0.25} />
                    </mesh>
                    <mesh position={[0.7, 0.9, 0.4]}>
                        <capsuleGeometry args={[0.28, 1.0, 8, 16]} />
                        <meshStandardMaterial color="#7e22ce" metalness={0.7} roughness={0.25} />
                    </mesh>
                    <mesh position={[0.4, 0.4, -0.7]}>
                        <cylinderGeometry args={[0.18, 0.18, 1.0, 16]} />
                        <meshStandardMaterial color="#fdba74" metalness={0.6} roughness={0.4} />
                    </mesh>
                </group>
            )}

            {building.id === 'hdt' && (
                <group>
                    <mesh position={[-0.4, 1.0, 0.2]}>
                        <capsuleGeometry args={[0.3, 1.2, 8, 16]} />
                        <meshStandardMaterial color="#0f766e" metalness={0.7} roughness={0.3} />
                    </mesh>
                    <mesh position={[0.7, 0.5, -0.4]}>
                        <boxGeometry args={[0.9, 0.5, 0.7]} />
                        <meshStandardMaterial color="#ea580c" metalness={0.6} roughness={0.4} />
                    </mesh>
                </group>
            )}

            {building.id === 'ref' && (
                <group>
                    <mesh position={[0.0, 1.0, 0]}>
                        <capsuleGeometry args={[0.3, 1.4, 8, 16]} />
                        <meshStandardMaterial color="#0369a1" metalness={0.7} roughness={0.3} />
                    </mesh>
                    <mesh position={[-0.9, 0.5, 0.2]}>
                        <boxGeometry args={[0.8, 0.5, 0.8]} />
                        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
                    </mesh>
                </group>
            )}

            {/* Hydrogen plant: tall reformer tubes */}
            {building.id === 'h2' && (
                <group>
                    <mesh position={[-0.6, 1.2, 0]}>
                        <cylinderGeometry args={[0.22, 0.22, 2.6, 20]} />
                        <meshStandardMaterial color="#f97316" metalness={0.8} roughness={0.25} />
                    </mesh>
                    <mesh position={[0.2, 1.1, 0.5]}>
                        <cylinderGeometry args={[0.18, 0.18, 2.2, 20]} />
                        <meshStandardMaterial color="#facc15" metalness={0.8} roughness={0.25} />
                    </mesh>
                    <mesh position={[0.9, 0.5, -0.3]}>
                        <boxGeometry args={[0.9, 0.5, 0.8]} />
                        <meshStandardMaterial color="#111827" metalness={0.7} roughness={0.4} />
                    </mesh>
                </group>
            )}

            {/* Storage: cluster of tanks */}
            {building.id === 'storage' && (
                <group>
                    <mesh position={[-0.9, 0.7, 0.4]}>
                        <cylinderGeometry args={[0.6, 0.6, 1.2, 20]} />
                        <meshStandardMaterial color="#047857" metalness={0.6} roughness={0.35} />
                    </mesh>
                    <mesh position={[0.4, 0.7, 0.6]}>
                        <cylinderGeometry args={[0.5, 0.5, 1.1, 20]} />
                        <meshStandardMaterial color="#10b981" metalness={0.6} roughness={0.35} />
                    </mesh>
                    <mesh position={[0.0, 0.7, -0.7]}>
                        <cylinderGeometry args={[0.55, 0.55, 1.0, 20]} />
                        <meshStandardMaterial color="#059669" metalness={0.6} roughness={0.35} />
                    </mesh>
                </group>
            )}

            {/* Utilities / cooling area: multiple cooling towers */}
            {building.id === 'util' && (
                <group>
                    <mesh position={[-0.8, 0.9, 0]}>
                        <cylinderGeometry args={[0.7, 0.5, 1.4, 24]} />
                        <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.4} />
                    </mesh>
                    <mesh position={[0.6, 0.9, 0.3]}>
                        <cylinderGeometry args={[0.7, 0.5, 1.4, 24]} />
                        <meshStandardMaterial color="#020617" metalness={0.6} roughness={0.4} />
                    </mesh>
                    <mesh position={[0, 1.6, 0.15]}>
                        <cylinderGeometry args={[0.25, 0.25, 1.0, 16]} />
                        <meshStandardMaterial color="#38bdf8" metalness={0.8} roughness={0.3} />
                    </mesh>
                </group>
            )}

            {/* Power block: turbine hall */}
            {building.id === 'power' && (
                <group>
                    <mesh position={[0, 0.7, 0]}>
                        <boxGeometry args={[2.2, 0.8, 1.2]} />
                        <meshStandardMaterial color="#030712" metalness={0.7} roughness={0.35} />
                    </mesh>
                    <mesh position={[-0.6, 1.3, 0.3]}>
                        <capsuleGeometry args={[0.35, 1.0, 8, 16]} />
                        <meshStandardMaterial color="#f97316" metalness={0.8} roughness={0.3} />
                    </mesh>
                    <mesh position={[0.9, 1.1, -0.2]}>
                        <capsuleGeometry args={[0.3, 0.9, 8, 16]} />
                        <meshStandardMaterial color="#22c55e" metalness={0.8} roughness={0.3} />
                    </mesh>
                </group>
            )}

            {/* Control center: low building with antenna */}
            {building.id === 'ctrl' && (
                <group>
                    <mesh position={[0, 0.5, 0]}>
                        <boxGeometry args={[1.8, 0.6, 1.2]} />
                        <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.4} />
                    </mesh>
                    <mesh position={[0.6, 1.1, -0.2]}>
                        <cylinderGeometry args={[0.06, 0.06, 1.2, 12]} />
                        <meshStandardMaterial color="#38bdf8" metalness={0.8} roughness={0.3} />
                    </mesh>
                </group>
            )}

            <Html position={[0, isReactor ? 1.8 : 1.4, 0]} center style={{ pointerEvents: 'none' }} className={`transition-opacity duration-300 ${isSelected || hovered || building.status === 'critical' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                <div className="bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/20 whitespace-nowrap shadow-xl flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: getStatusColor(), color: getStatusColor() }} />
                    <div>
                        <div className="text-white text-[10px] font-bold tracking-wider leading-none">{building.id.toUpperCase()}</div>
                        <div className="text-slate-400 text-[9px] leading-tight flex items-center mt-0.5 gap-1 font-mono">
                            {building.status === 'critical' && <AlertTriangle className="w-2.5 h-2.5 text-status-critical" />}
                            {building.status === 'warning' && <Zap className="w-2.5 h-2.5 text-status-warning" />}
                            {building.status === 'normal' && <Activity className="w-2.5 h-2.5 text-status-normal" />}
                            <span className="uppercase">{building.status}</span>
                        </div>
                    </div>
                </div>
            </Html>
        </group>
    );
}

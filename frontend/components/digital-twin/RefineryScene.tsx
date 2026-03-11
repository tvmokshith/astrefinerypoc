import React, { useState, useEffect } from "react";
import { Building } from "@/lib/types";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useDataStore } from "@/store/dataStore";
import { api } from "@/lib/api";

interface Props {
  onSelectBuilding: (b: Building | null) => void;
  selectedId?: string;
}

type Mode = "day" | "night";

// geographic fallback centre (unused when positions are provided)
const GEO_CENTER = { lon: 0, lat: 0 };

// reuse polygons and pipelines from original code, scaled for three.js
const ZONE_POLYGONS: Array<{
  id: string;
  name: string;
  color: string;
  coords: Array<[number, number]>;
}> = [
  {
    id: "zone-a",
    name: "Zone A",
    color: "#0ea5e9",
    coords: [
      [69.9848, 22.3342],
      [69.9928, 22.3340],
      [69.9932, 22.3388],
      [69.9850, 22.3389],
    ],
  },
  {
    id: "zone-b",
    name: "Zone B",
    color: "#a855f7",
    coords: [
      [69.9926, 22.3360],
      [69.9966, 22.3360],
      [69.9968, 22.3403],
      [69.9928, 22.3404],
    ],
  },
  {
    id: "zone-c",
    name: "Zone C",
    color: "#14b8a6",
    coords: [
      [69.9954, 22.3318],
      [69.9988, 22.3318],
      [69.9988, 22.3337],
      [69.9954, 22.3337],
    ],
  },
];

// ── PIPE ROUTES: rack-routed multi-segment pipelines (like a real refinery)
// All horizontal runs follow the verified corridor grid:
//   E-W z=437 (Corridor A), z=613 (Corridor B), z=150 (north access), z=900 (south access)
//   N-S x=268 (west arterial), x=434 (col1-2), x=605 (col2-3), x=815 (east arterial)
// Building centres (scene = backend pos × POSITION_SCALE=35):
//   storage(105,280)  cdu(350,350)  vdu(525,350)  fcc(700,350)
//   hdt(350,525)  ref(525,525)  h2(700,525)  dcoker(350,700)  sru(525,700)
//   util(105,525)  power(105,770)  flare(945,770)  marine(945,280)  ctrl(945,525)
const PIPE_ROUTES: Array<{ waypoints: number[][]; color: string; radius: number }> = [
  // ── CRUDE SUPPLY ─────────────────────────────────────────────────────────
  // Main crude: Tank Farm → west rack → Corridor A → CDU
  { waypoints: [[105,42,280],[268,42,280],[268,42,437],[350,42,437],[350,42,375]], color:"#64748b", radius:4.5 },
  // Second crude train (offset y+6)
  { waypoints: [[105,48,280],[268,48,280],[268,48,437],[350,48,437],[350,48,375]], color:"#5a6978", radius:3.5 },
  // Preheat return: CDU → west rack → Tank Farm
  { waypoints: [[350,37,375],[350,37,437],[268,37,437],[268,37,280],[105,37,280]], color:"#475569", radius:2.5 },
  // ── ATMOSPHERIC / VACUUM DISTILLATION ────────────────────────────────────
  // Atm residue: CDU → Corridor A → VDU (topped crude)
  { waypoints: [[350,53,375],[350,53,437],[434,53,437],[525,53,437],[525,53,375]], color:"#64748b", radius:4 },
  // HVGO: VDU → Corridor A → FCC
  { waypoints: [[525,58,375],[525,58,437],[605,58,437],[700,58,437],[700,58,375]], color:"#64748b", radius:3.5 },
  // Vacuum residue: VDU → Col1-2 → Corridor B → Coker
  { waypoints: [[525,44,375],[525,44,437],[434,44,437],[434,44,613],[350,44,613],[350,44,680]], color:"#475569", radius:3.5 },
  // ── CDU SIDE STREAMS ─────────────────────────────────────────────────────
  // CDU naphtha → Col1-2 → HDT
  { waypoints: [[350,36,375],[434,36,375],[434,36,525],[350,36,525]], color:"#94a3b8", radius:2.5 },
  // CDU kerosene → Col1-2 → Corridor A → east rack → Marine
  { waypoints: [[350,32,375],[434,32,375],[434,32,437],[605,32,437],[815,32,437],[815,32,280],[945,32,280]], color:"#94a3b8", radius:2.5 },
  // CDU diesel → north road → east rack → Marine
  { waypoints: [[350,28,375],[350,28,150],[434,28,150],[605,28,150],[815,28,150],[815,28,280],[945,28,280]], color:"#94a3b8", radius:2 },
  // ── FCC STREAMS ─────────────────────────────────────────────────────────
  // FCC gasoline → north road → east rack → Marine
  { waypoints: [[700,36,375],[700,36,150],[815,36,150],[815,36,280],[945,36,280]], color:"#94a3b8", radius:2.5 },
  // FCC LCO diesel → east rack → product blending
  { waypoints: [[700,41,375],[815,41,375],[815,41,280],[945,41,280]], color:"#94a3b8", radius:2 },
  // FCC slurry recycle → Corridor B → Coker
  { waypoints: [[700,38,525],[605,38,525],[605,38,613],[434,38,613],[350,38,613],[350,38,680]], color:"#1e293b", radius:2.5 },
  // ── HYDROTREATING / REFORMING ────────────────────────────────────────────
  // HDT product → Col1-2 → Corridor A → east rack → Marine
  { waypoints: [[350,40,525],[434,40,525],[434,40,437],[605,40,437],[815,40,437],[815,40,280],[945,40,280]], color:"#94a3b8", radius:2.5 },
  // REF feed: HDT → Corridor A → Col2-3 → REF
  { waypoints: [[350,45,525],[434,45,525],[434,45,437],[605,45,437],[605,45,525],[525,45,525]], color:"#94a3b8", radius:2.5 },
  // REF reformate → Col2-3 → east rack → Marine
  { waypoints: [[525,50,525],[605,50,525],[605,50,437],[815,50,437],[815,50,280],[945,50,280]], color:"#94a3b8", radius:2.5 },
  // ── COKER / SRU ─────────────────────────────────────────────────────────
  // Coker overhead vapors → Col1-2 → Corridor A → CDU (recycle)
  { waypoints: [[350,32,700],[434,32,700],[434,32,437],[350,32,437],[350,32,375]], color:"#94a3b8", radius:2 },
  // Coker gas oil → Corridor B → SRU treating
  { waypoints: [[350,49,700],[434,49,700],[434,49,613],[525,49,613],[525,49,680]], color:"#94a3b8", radius:2.5 },
  // SRU sour gas → Col2-3 → Corridor B → east rack → Flare
  { waypoints: [[525,55,680],[605,55,680],[605,55,613],[815,55,613],[815,55,770],[945,55,770]], color:"#f87171", radius:2.5 },
  // SRU sulphur liquid → east rack south → product loadout
  { waypoints: [[525,26,700],[605,26,700],[605,26,613],[815,26,613],[815,26,525],[945,26,525]], color:"#facc15", radius:2 },
  // ── HYDROGEN SYSTEM ─────────────────────────────────────────────────────
  // H2 to HDT: H2 plant → Col2-3 → Corridor A → Col1-2 → HDT
  { waypoints: [[700,60,525],[605,60,525],[605,60,437],[434,60,437],[434,60,525],[350,60,525]], color:"#38bdf8", radius:2.5 },
  // H2 to REF spur
  { waypoints: [[700,63,525],[605,63,525],[525,63,525]], color:"#38bdf8", radius:2 },
  // H2 recycle purge gas: HDT/REF → Col2-3 → H2 plant
  { waypoints: [[350,25,525],[434,25,525],[605,25,525],[700,25,525]], color:"#7dd3fc", radius:2 },
  // H2 plant feed gas from fuel gas header
  { waypoints: [[268,22,613],[268,22,525],[605,22,525],[700,22,525]], color:"#f59e0b", radius:2 },
  // ── STEAM DISTRIBUTION ──────────────────────────────────────────────────
  // HP steam: Power/Util → west rack → Corridor A east backbone
  { waypoints: [[105,54,525],[268,54,525],[268,54,437],[434,54,437],[605,54,437],[815,54,437]], color:"#fb923c", radius:3 },
  // HP steam spurs to CDU, VDU, FCC column heads
  { waypoints: [[350,54,437],[350,54,375]], color:"#fb923c", radius:2.5 },
  { waypoints: [[525,54,437],[525,54,375]], color:"#fb923c", radius:2.5 },
  { waypoints: [[700,54,437],[700,54,375]], color:"#fb923c", radius:2.5 },
  // MP steam: Util → west rack → Corridor B → south units
  { waypoints: [[105,59,525],[268,59,525],[268,59,613],[434,59,613],[605,59,613],[815,59,613]], color:"#fb923c", radius:2.5 },
  // Steam header to Power Plant
  { waypoints: [[105,49,525],[105,49,770]], color:"#fb923c", radius:3 },
  // Condensate return
  { waypoints: [[268,64,613],[268,64,525],[268,64,437],[268,64,280]], color:"#fdba74", radius:2 },
  // ── COOLING WATER ───────────────────────────────────────────────────────
  // CW supply: Util → west rack → Corridor A → east
  { waypoints: [[105,30,525],[268,30,525],[268,30,437],[434,30,437],[605,30,437],[700,30,437],[700,30,525]], color:"#0ea5e9", radius:3.5 },
  // CW supply south: Corridor A → Corridor B → Coker
  { waypoints: [[268,30,437],[268,30,613],[434,30,613],[525,30,613],[525,30,680]], color:"#0ea5e9", radius:2.5 },
  // CW return main
  { waypoints: [[700,25,525],[605,25,525],[434,25,525],[268,25,525],[105,25,525]], color:"#0284c7", radius:3 },
  // CW east spur to Marine/Ctrl
  { waypoints: [[815,30,437],[815,30,525],[945,30,525]], color:"#0ea5e9", radius:2 },
  // ── FLARE COLLECTION HEADERS ────────────────────────────────────────────
  // East flare header: FCC → east rack → Flare (all relief valves)
  { waypoints: [[700,66,375],[815,66,375],[815,66,437],[815,66,613],[815,66,770],[945,66,770]], color:"#f87171", radius:3.5 },
  // West process flare tie-in → Corridor A → east header
  { waypoints: [[350,66,375],[434,66,375],[434,66,437],[605,66,437],[815,66,437]], color:"#f87171", radius:2.5 },
  // South flare lines: Coker/SRU → Corridor B → east header
  { waypoints: [[350,66,700],[605,66,700],[605,66,613],[815,66,613]], color:"#ef4444", radius:2 },
  // ── PRODUCT EXPORT / CRUDE IMPORT ───────────────────────────────────────
  // Main product export: east rack → Marine Terminal
  { waypoints: [[815,34,525],[815,34,437],[815,34,280],[945,34,280]], color:"#22d3ee", radius:3.5 },
  // Crude import: Marine → east rack → north road → west rack → Tank Farm
  { waypoints: [[945,62,280],[815,62,280],[815,62,150],[268,62,150],[268,62,280],[105,62,280]], color:"#22d3ee", radius:3 },
  // LPG export via east rack
  { waypoints: [[605,30,437],[815,30,437],[815,30,280],[945,30,280]], color:"#22d3ee", radius:2 },
  // ── FUEL GAS HEADER ─────────────────────────────────────────────────────
  // Main fuel gas header along Corridor A (feeds all fired heaters)
  { waypoints: [[268,68,280],[268,68,437],[434,68,437],[605,68,437],[815,68,437]], color:"#f59e0b", radius:2.5 },
  // Fuel gas spurs to CDU, VDU, FCC furnace inlets
  { waypoints: [[350,68,437],[350,68,375]], color:"#f59e0b", radius:2 },
  { waypoints: [[525,68,437],[525,68,375]], color:"#f59e0b", radius:2 },
  { waypoints: [[700,68,437],[700,68,375]], color:"#f59e0b", radius:2 },
  // Off-gas recovery recycle → fuel gas header
  { waypoints: [[605,68,525],[525,68,525],[350,68,525],[350,68,437]], color:"#f59e0b", radius:2 },
  // ── INSTRUMENT AIR / BLOWDOWN ───────────────────────────────────────────
  // Instrument air: utility → west rack → Corridor A → all units
  { waypoints: [[105,22,525],[268,22,525],[268,22,437],[434,22,437],[605,22,437],[700,22,437]], color:"#e2e8f0", radius:1.5 },
  // Condensate / blowdown return
  { waypoints: [[434,20,437],[268,20,437],[268,20,525],[105,20,525]], color:"#94a3b8", radius:1.5 },
];

// convert a building's local position into scene coordinates
// positions are defined in the backend and should correspond to the
// layout used by the reference model.  A constant scale factor makes
// it easy to tweak the overall spacing without re‑exporting models.
const POSITION_SCALE = 35; // adjust if too large/small

function getCoords(building: Building) {
  // primary source: explicit position array
  if (building.position) {
    return {
      x: building.position[0] * POSITION_SCALE,
      y: building.position[1] ?? 0,
      z: building.position[2] * POSITION_SCALE,
    };
  }

  // fallback: approximate from lon/lat relative to center (legacy)
  if (building.lon != null && building.lat != null) {
    return {
      x: (building.lon - GEO_CENTER.lon) * 100000,
      y: building.elevation ?? 0,
      z: (building.lat - GEO_CENTER.lat) * 100000,
    };
  }

  // final fallback if nothing provided
  return { x: 0, y: 0, z: 0 };
}

function BuildingMesh({ building, selected, onSelect, unitSummaryMap }: { building: Building; selected: boolean; onSelect: (b: Building) => void; unitSummaryMap: Record<string, any> }) {
  const coords = getCoords(building);
  const gltf = building.modelUrl ? (useGLTF(building.modelUrl) as any) : null;
  const model = gltf?.scene || null;

  const summary = building.sensorUnit ? unitSummaryMap[building.sensorUnit] : undefined;
  const temp = summary?.avgTemperature != null ? `${summary.avgTemperature.toFixed(1)}C` : `${(building.temp ?? 0).toFixed(1)}C`;
  const pressure = summary?.avgPressure != null ? `${summary.avgPressure.toFixed(1)}bar` : `${(building.pressure ?? 0).toFixed(1)}bar`;
  const flow = summary?.avgFlow != null ? `${Math.round(summary.avgFlow)}bbl/h` : "n/a";
  const anomalies = summary ? summary.warningSensors + summary.criticalSensors : 0;

  // Status-based color: light grey (normal), amber (warning), red (critical)
  let sc = "#b0b8c1"; let se = "#8a9aaa";  // light grey for normal
  if (anomalies > 0) { sc = "#f59e0b"; se = "#d97706"; }  // amber warning
  if (anomalies > 3) { sc = "#ef4444"; se = "#dc2626"; }  // red critical

  const mat = { color: sc, emissive: se, emissiveIntensity: 0.25, metalness: 0.35, roughness: 0.55 };
  const steelDark = { color: "#5a6a7a", metalness: 0.7, roughness: 0.3 };
  const concMat = { color: sc, emissive: se, emissiveIntensity: 0.1, metalness: 0.05, roughness: 0.85 };

  const id = building.id;
  let labelH = 60;
  let content: React.ReactElement | null = null;

  // ── TANK FARM: 3 large flat-topped storage tanks ──────────────────────────
  if (id === "storage") {
    labelH = 105;
    content = (
      <>
        {([[-58, -45], [58, -45], [0, 52]] as [number,number][]).map(([tx, tz], i) => (
          <group key={i} position={[tx, 0, tz]}>
            <mesh position={[0, 47, 0]}><cylinderGeometry args={[42, 44, 94, 32]} /><meshStandardMaterial {...mat} /></mesh>
            {/* floating roof ring */}
            <mesh position={[0, 93, 0]}><torusGeometry args={[41, 2.5, 8, 32]} /><meshStandardMaterial color="#aaa" metalness={0.5} roughness={0.4} /></mesh>
            {/* flat top cap */}
            <mesh position={[0, 95, 0]}><cylinderGeometry args={[42, 42, 3, 32]} /><meshStandardMaterial color="#ccc" metalness={0.4} roughness={0.5} /></mesh>
            {/* base ring */}
            <mesh position={[0, 3, 0]}><torusGeometry args={[44, 3, 8, 32]} /><meshStandardMaterial {...steelDark} /></mesh>
            {/* ladder strip */}
            <mesh position={[43, 47, 0]}><boxGeometry args={[2, 94, 3]} /><meshStandardMaterial color="#888" metalness={0.6} roughness={0.4} /></mesh>
          </group>
        ))}
      </>
    );

  // ── CDU: Tall fractionating column with ring platforms ────────────────────
  } else if (id === "cdu") {
    const ch = 155; labelH = ch + 30;
    content = (
      <>
        {/* main column */}
        <mesh position={[0, ch/2, 0]}><cylinderGeometry args={[11, 14, ch, 16]} /><meshStandardMaterial {...mat} /></mesh>
        {/* 5 ring platforms */}
        {[0.18,0.34,0.5,0.66,0.82].map((f, i) => (
          <group key={i}>
            <mesh position={[0, ch*f, 0]}><torusGeometry args={[16, 2.5, 8, 24]} /><meshStandardMaterial color="#999" metalness={0.5} roughness={0.5} /></mesh>
            <mesh position={[20, ch*f, 0]}><boxGeometry args={[12, 2, 8]} /><meshStandardMaterial color="#888" metalness={0.3} roughness={0.7} /></mesh>
          </group>
        ))}
        {/* overhead condenser drum */}
        <mesh position={[0, ch+14, 0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[9,9,22,12]} /><meshStandardMaterial color="#ccc" metalness={0.5} roughness={0.5} /></mesh>
        {/* bottom reboiler, horizontal */}
        <mesh position={[35, 18, 0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[13,13,48,12]} /><meshStandardMaterial color="#bbb" metalness={0.4} roughness={0.6} /></mesh>
        {/* side downcomer pipe */}
        <mesh position={[15, ch*0.5, 0]}><cylinderGeometry args={[2,2,ch*0.85,8]} /><meshStandardMaterial color="#777" metalness={0.65} roughness={0.4} /></mesh>
      </>
    );

  // ── VDU: Similar column, slightly shorter, different platform spacing ──────
  } else if (id === "vdu") {
    const ch = 130; labelH = ch + 30;
    content = (
      <>
        <mesh position={[0, ch/2, 0]}><cylinderGeometry args={[12, 15, ch, 16]} /><meshStandardMaterial {...mat} /></mesh>
        {[0.2,0.4,0.6,0.8].map((f, i) => (
          <group key={i}>
            <mesh position={[0, ch*f, 0]}><torusGeometry args={[17, 2.5, 8, 24]} /><meshStandardMaterial color="#999" metalness={0.5} roughness={0.5} /></mesh>
            <mesh position={[-22, ch*f, 0]}><boxGeometry args={[12, 2, 8]} /><meshStandardMaterial color="#888" metalness={0.3} roughness={0.7} /></mesh>
          </group>
        ))}
        {/* vacuum condenser box */}
        <mesh position={[30, ch*0.7, 0]}><boxGeometry args={[25, 22, 18]} /><meshStandardMaterial color="#bbb" metalness={0.4} roughness={0.6} /></mesh>
        {/* vacuum ejector stacks */}
        {[-8,0,8].map((z,i) => (
          <mesh key={i} position={[42, ch*0.75, z]}><cylinderGeometry args={[2.5,2.5,18,8]} /><meshStandardMaterial color="#888" metalness={0.5} roughness={0.5} /></mesh>
        ))}
        <mesh position={[15, ch*0.5, 0]}><cylinderGeometry args={[2,2,ch*0.85,8]} /><meshStandardMaterial color="#777" metalness={0.65} roughness={0.4} /></mesh>
      </>
    );

  // ── FCC: Open steel lattice scaffold frame ────────────────────────────────
  } else if (id === "fcc") {
    const fh = 145; const fw = 60; labelH = fh + 25;
    const posts: [number,number][] = [[-fw/2,-fw/2],[fw/2,-fw/2],[-fw/2,fw/2],[fw/2,fw/2]];
    content = (
      <>
        {/* 4 corner columns */}
        {posts.map(([px,pz],i) => (
          <mesh key={`p${i}`} position={[px, fh/2, pz]}><boxGeometry args={[5,fh,5]} /><meshStandardMaterial {...steelDark} /></mesh>
        ))}
        {/* horizontal beams at 4 levels */}
        {[0.25,0.5,0.75,1.0].map((f,li) => (
          <group key={`l${li}`}>
            <mesh position={[0, fh*f, -fw/2]}><boxGeometry args={[fw+5,3.5,3.5]} /><meshStandardMaterial {...steelDark} /></mesh>
            <mesh position={[0, fh*f,  fw/2]}><boxGeometry args={[fw+5,3.5,3.5]} /><meshStandardMaterial {...steelDark} /></mesh>
            <mesh position={[-fw/2, fh*f, 0]}><boxGeometry args={[3.5,3.5,fw+5]} /><meshStandardMaterial {...steelDark} /></mesh>
            <mesh position={[ fw/2, fh*f, 0]}><boxGeometry args={[3.5,3.5,fw+5]} /><meshStandardMaterial {...steelDark} /></mesh>
            {/* floor grating */}
            <mesh position={[0, fh*f+1, 0]}><boxGeometry args={[fw,1,fw]} /><meshStandardMaterial color="#6a7a8a" metalness={0.5} roughness={0.5} transparent opacity={0.6} /></mesh>
          </group>
        ))}
        {/* reactor vessel inside frame */}
        <mesh position={[-12, fh*0.5, 0]}><cylinderGeometry args={[14,16,fh*0.85,16]} /><meshStandardMaterial {...mat} /></mesh>
        {/* regenerator */}
        <mesh position={[20, fh*0.38, 5]}><cylinderGeometry args={[11,13,fh*0.62,16]} /><meshStandardMaterial {...mat} /></mesh>
        {/* status beacon at apex */}
        <mesh position={[0, fh+10, 0]}><sphereGeometry args={[6,12,12]} /><meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={1.0} /></mesh>
      </>
    );

  // ── HDT: Tall reactor vessel with hemispherical heads ─────────────────────
  } else if (id === "hdt") {
    const rh = 100; labelH = rh + 30;
    content = (
      <>
        <mesh position={[0, rh/2, 0]}><cylinderGeometry args={[18,20,rh,16]} /><meshStandardMaterial {...mat} /></mesh>
        {/* domed top */}
        <mesh position={[0, rh, 0]} rotation={[Math.PI,0,0]}><sphereGeometry args={[18,16,8,0,Math.PI*2,0,Math.PI/2]} /><meshStandardMaterial {...mat} /></mesh>
        {/* support skirt */}
        <mesh position={[0,10,0]}><cylinderGeometry args={[21,23,20,16]} /><meshStandardMaterial color="#4a5a6a" metalness={0.5} roughness={0.5} /></mesh>
        {/* side nozzles */}
        {[20,45,70,95].map((y,i) => (
          <mesh key={i} position={[22,y,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[3,3,14,8]} /><meshStandardMaterial color="#777" metalness={0.6} roughness={0.4} /></mesh>
        ))}
        {/* adjacent heat exchanger bundle */}
        <mesh position={[38, 30, 0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[10,10,45,12]} /><meshStandardMaterial color="#ccc" metalness={0.4} roughness={0.5} /></mesh>
      </>
    );

  // ── REF: Reformer furnace with tube array and stack ───────────────────────
  } else if (id === "ref") {
    const rfh = 90; labelH = rfh + 40;
    content = (
      <>
        {/* furnace box */}
        <mesh position={[0, rfh*0.44, 0]}><boxGeometry args={[72, rfh*0.88, 58]} /><meshStandardMaterial {...concMat} /></mesh>
        {/* reformer tubes */}
        {[-22,-8,8,22].map((x,i) => (
          <mesh key={i} position={[x, rfh*0.44, 0]}><cylinderGeometry args={[3.5,3.5,rfh*0.95,8]} /><meshStandardMaterial color="#888" metalness={0.65} roughness={0.3} /></mesh>
        ))}
        {/* flue stack */}
        <mesh position={[0, rfh+25, 0]}><cylinderGeometry args={[8,10,50,12]} /><meshStandardMaterial color="#555" metalness={0.4} roughness={0.6} /></mesh>
        {/* waste heat boiler box */}
        <mesh position={[0, rfh+10, 35]}><boxGeometry args={[50,20,30]} /><meshStandardMaterial color="#999" metalness={0.4} roughness={0.6} /></mesh>
      </>
    );

  // ── H2 PLANT: Steam reformer with multiple tall parallel tubes ────────────
  } else if (id === "h2") {
    const hh = 135; labelH = hh + 35;
    content = (
      <>
        {/* reformer box */}
        <mesh position={[0, hh*0.42, 0]}><boxGeometry args={[58, hh*0.82, 48]} /><meshStandardMaterial {...concMat} /></mesh>
        {/* reformer tube rows */}
        {([-18,-6,6,18] as number[]).flatMap((x) => ([-14,0,14] as number[]).map((z,j) => (
          <mesh key={`${x}-${j}`} position={[x, hh*0.42, z]}><cylinderGeometry args={[2.5,2.5,hh*0.88,8]} /><meshStandardMaterial color="#777" metalness={0.7} roughness={0.3} /></mesh>
        )))}
        {/* tall flue chimney */}
        <mesh position={[32, hh*0.62, 0]}><cylinderGeometry args={[6,8,hh*0.82,12]} /><meshStandardMaterial color="#4a4a4a" metalness={0.3} roughness={0.7} /></mesh>
        {/* PSA unit */}
        <mesh position={[-42, 22, 0]}><boxGeometry args={[28,40,32]} /><meshStandardMaterial {...mat} /></mesh>
        {/* PSA horizontal vessels */}
        {[-8,8].map((z,i) => (
          <mesh key={i} position={[-42,36,z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[7,7,22,10]} /><meshStandardMaterial color="#ccc" metalness={0.5} roughness={0.5} /></mesh>
        ))}
      </>
    );

  // ── DCOKER: Two coker drums side-by-side ──────────────────────────────────
  } else if (id === "dcoker") {
    const dh = 120; labelH = dh + 25;
    content = (
      <>
        {([-30,30] as number[]).map((x,i) => (
          <group key={i} position={[x,0,0]}>
            <mesh position={[0, dh*0.5, 0]}><cylinderGeometry args={[19,21,dh,16]} /><meshStandardMaterial {...mat} /></mesh>
            {/* dome top */}
            <mesh position={[0, dh, 0]} rotation={[Math.PI,0,0]}><sphereGeometry args={[19,16,8,0,Math.PI*2,0,Math.PI/2]} /><meshStandardMaterial {...mat} /></mesh>
            {/* support skirt */}
            <mesh position={[0, 16, 0]}><cylinderGeometry args={[22,24,32,16]} /><meshStandardMaterial color="#4a5a6a" metalness={0.5} roughness={0.5} /></mesh>
            {/* ring platforms */}
            {[0.3,0.6,0.85].map((f,j) => (
              <mesh key={j} position={[0, dh*f, 0]}><torusGeometry args={[22,2,8,24]} /><meshStandardMaterial color="#666" metalness={0.5} roughness={0.5} /></mesh>
            ))}
          </group>
        ))}
        {/* fractionator column behind drums */}
        <mesh position={[0, 65, -42]}><cylinderGeometry args={[10, 12, 100, 12]} /><meshStandardMaterial {...mat} /></mesh>
        {[0.25,0.55,0.8].map((f,i) => (
          <mesh key={i} position={[0, 100*f+15, -42]}><torusGeometry args={[13, 2, 8, 20]} /><meshStandardMaterial color="#888" metalness={0.5} roughness={0.5} /></mesh>
        ))}
      </>
    );

  // ── SRU / UTILITIES UNIT: Process box + horizontal absorbers ─────────────
  } else if (id === "sru") {
    labelH = 62;
    content = (
      <>
        <mesh position={[0, 28, 0]}><boxGeometry args={[85, 55, 58]} /><meshStandardMaterial {...concMat} /></mesh>
        {/* 3 horizontal heat exchangers */}
        {[-20,0,20].map((z,i) => (
          <mesh key={i} position={[0, 42, z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[9,9,68,12]} /><meshStandardMaterial color="#ccc" metalness={0.5} roughness={0.5} /></mesh>
        ))}
        {/* small stack */}
        <mesh position={[35, 72, 0]}><cylinderGeometry args={[5,6,38,10]} /><meshStandardMaterial color="#666" metalness={0.4} roughness={0.6} /></mesh>
        {/* condensate drum */}
        <mesh position={[-50, 18, 0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[10,10,32,12]} /><meshStandardMaterial color="#bbb" metalness={0.4} roughness={0.5} /></mesh>
      </>
    );

  // ── COOLING PLANT: Hyperbolic cooling towers (2 towers) ───────────────────
  } else if (id === "util") {
    const cth = 100; labelH = cth + 20;
    const tower = (ox: number) => (
      <group position={[ox, 0, 0]}>
        {/* lower widening section */}
        <mesh position={[0, cth*0.32, 0]}><cylinderGeometry args={[30, 52, cth*0.64, 24]} /><meshStandardMaterial {...concMat} /></mesh>
        {/* upper narrowing then flaring section */}
        <mesh position={[0, cth*0.8, 0]}><cylinderGeometry args={[36, 30, cth*0.32, 24]} /><meshStandardMaterial {...concMat} /></mesh>
        {/* water basin */}
        <mesh position={[0, 4, 0]}><cylinderGeometry args={[54, 55, 8, 24]} /><meshStandardMaterial color="#4a5a6a" metalness={0.3} roughness={0.7} /></mesh>
        {/* fill inside (visible interior louvers suggestion) */}
        <mesh position={[0, cth*0.2, 0]}><cylinderGeometry args={[28, 50, cth*0.4, 24]} /><meshStandardMaterial color="#3a4a5a" metalness={0.2} roughness={0.8} /></mesh>
      </group>
    );
    content = <>{tower(0)}{tower(78)}</>;

  // ── POWER PLANT: Main hall + boiler house + 2 chimneys ────────────────────
  } else if (id === "power") {
    labelH = 130;
    content = (
      <>
        {/* turbine hall */}
        <mesh position={[0, 43, 0]}><boxGeometry args={[95, 85, 58]} /><meshStandardMaterial {...concMat} /></mesh>
        {/* boiler house */}
        <mesh position={[-15, 58, -48]}><boxGeometry args={[55, 115, 32]} /><meshStandardMaterial {...concMat} /></mesh>
        {/* chimney 1 */}
        <mesh position={[18, 105, -48]}><cylinderGeometry args={[7,10,120,12]} /><meshStandardMaterial color="#6a6a6a" metalness={0.3} roughness={0.7} /></mesh>
        {/* chimney top red band */}
        <mesh position={[18, 163, -48]}><cylinderGeometry args={[8,8,5,12]} /><meshStandardMaterial color="#cc3333" metalness={0.5} roughness={0.5} /></mesh>
        {/* chimney 2 (shorter) */}
        <mesh position={[40, 92, -46]}><cylinderGeometry args={[6,9,98,12]} /><meshStandardMaterial color="#6a6a6a" metalness={0.3} roughness={0.7} /></mesh>
        <mesh position={[40, 140, -46]}><cylinderGeometry args={[7,7,4,12]} /><meshStandardMaterial color="#cc3333" metalness={0.5} roughness={0.5} /></mesh>
        {/* substation box */}
        <mesh position={[55, 18, 20]}><boxGeometry args={[30,35,28]} /><meshStandardMaterial color="#9a9a9a" metalness={0.2} roughness={0.7} /></mesh>
      </>
    );

  // ── FLARE STACK: Tall slender tapered pole with live flame ───────────────
  } else if (id === "flare") {
    labelH = 200;
    content = (
      <>
        {/* main stack */}
        <mesh position={[0, 93, 0]}><cylinderGeometry args={[3, 6.5, 186, 8]} /><meshStandardMaterial color="#888" metalness={0.6} roughness={0.4} /></mesh>
        {/* KO drum at base */}
        <mesh position={[0, 20, 0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[13,13,38,12]} /><meshStandardMaterial color="#aaa" metalness={0.5} roughness={0.5} /></mesh>
        {/* guy wire supports (3 cables) */}
        {[0,1,2].map((i) => {
          const ang = (i / 3) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(ang)*22, 95, Math.sin(ang)*22]} rotation={[0, -ang, 0.55]}>
              <boxGeometry args={[1.2, 130, 1.2]} />
              <meshStandardMaterial color="#667" metalness={0.7} roughness={0.3} />
            </mesh>
          );
        })}
        {/* flame */}
        <mesh position={[0, 190, 0]}><sphereGeometry args={[9,12,12]} /><meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={1.8} /></mesh>
        <mesh position={[0, 197, 0]}><sphereGeometry args={[5.5,12,12]} /><meshStandardMaterial color="#ffdd00" emissive="#ffcc00" emissiveIntensity={2.5} /></mesh>
      </>
    );

  // ── EXPORT TERMINAL: Long dock building with loading arms ─────────────────
  } else if (id === "marine") {
    labelH = 45;
    content = (
      <>
        {/* main terminal building */}
        <mesh position={[0, 19, 0]}><boxGeometry args={[110, 35, 50]} /><meshStandardMaterial {...concMat} /></mesh>
        {/* loading arm towers */}
        {[-35, 0, 35].map((x,i) => (
          <group key={i} position={[x, 0, 32]}>
            <mesh position={[0, 28, 0]}><cylinderGeometry args={[3,3.5,22,8]} /><meshStandardMaterial {...steelDark} /></mesh>
            <mesh position={[0, 38, 8]}><boxGeometry args={[5, 4, 20]} /><meshStandardMaterial {...steelDark} /></mesh>
          </group>
        ))}
        {/* pipe manifold header */}
        <mesh position={[0, 36, 0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[3.5,3.5,100,8]} /><meshStandardMaterial color="#777" metalness={0.6} roughness={0.4} /></mesh>
      </>
    );

  // ── CONTROL CENTER: Compact flat-roofed administration building ───────────
  } else if (id === "ctrl") {
    labelH = 50;
    content = (
      <>
        <mesh position={[0, 19, 0]}><boxGeometry args={[68, 36, 52]} /><meshStandardMaterial {...concMat} /></mesh>
        {/* roof HVAC units */}
        <mesh position={[-20, 40, 0]}><boxGeometry args={[22,9,16]} /><meshStandardMaterial color="#9a9a9a" metalness={0.3} roughness={0.7} /></mesh>
        <mesh position={[20, 40, 0]}><boxGeometry args={[22,9,16]} /><meshStandardMaterial color="#9a9a9a" metalness={0.3} roughness={0.7} /></mesh>
        {/* antenna mast */}
        <mesh position={[0, 52, 0]}><cylinderGeometry args={[1, 1.5, 26, 6]} /><meshStandardMaterial color="#555" metalness={0.8} roughness={0.2} /></mesh>
        <mesh position={[0, 66, 0]} rotation={[0.5, 0, 0]}><coneGeometry args={[8, 6, 16]} /><meshStandardMaterial color="#aaa" metalness={0.4} roughness={0.6} /></mesh>
      </>
    );

  // ── FALLBACK ─────────────────────────────────────────────────────────────
  } else {
    labelH = 55;
    content = <mesh position={[0,28,0]}><boxGeometry args={[52,55,48]} /><meshStandardMaterial {...mat} /></mesh>;
  }

  return (
    <group position={[coords.x, 0, coords.z]} onClick={(e) => { e.stopPropagation(); onSelect(building); }}>
      {model ? (
        <primitive object={model.scene.clone()} scale={building.modelScale || [1,1,1]} rotation={building.modelRotation || [0,0,0]} />
      ) : content}
      {selected && (
        <mesh position={[0, labelH * 0.4, 0]}>
          <boxGeometry args={[90, labelH * 0.9, 90]} />
          <meshBasicMaterial wireframe color="white" />
        </mesh>
      )}
      {/* sensor markers */}
      {[0,1,2,3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a)*32, 4, Math.sin(a)*32]}>
            <sphereGeometry args={[2.5,12,12]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} metalness={0.8} />
          </mesh>
        );
      })}
      <Html position={[0, labelH + 12, 0]} center>
        <div className="text-xs whitespace-pre text-[#a3d5ff] font-semibold drop-shadow-lg max-w-[130px] text-center leading-tight">
          {building.name}<br />T:{temp} P:{pressure}<br />Flow:{flow} Alerts:{anomalies}
        </div>
      </Html>
    </group>
  );
}

export default function RefineryScene({ onSelectBuilding, selectedId }: Props) {
  const [mode, setMode] = useState<Mode>("night");
  const isNight = mode === "night";
  const buildings = useDataStore((s) => s.buildings);
  const [unitSummaryMap, setUnitSummaryMap] = useState<Record<string, any>>({});

  // periodically refresh synthetic telemetry summary, same as before
  useEffect(() => {
    let disposed = false;
    const fetchSummary = async () => {
      try {
        const summary = await api.getUnitSensorSummary();
        if (disposed) return;
        const mapped = summary.reduce<Record<string, any>>((acc, row) => {
          acc[row.unit] = row;
          return acc;
        }, {} as Record<string, any>);
        setUnitSummaryMap(mapped);
      } catch {
        // keep previous values on error
      }
    };
    fetchSummary();
    const interval = setInterval(fetchSummary, 6000);
    return () => {
      disposed = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="w-full h-full cursor-grab active:cursor-grabbing relative">
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2 pointer-events-auto shadow-lg">
        <div className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider bg-slate-950/80 border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-1.5 backdrop-blur-sm">
          <span className={`w-2 h-2 rounded-full ${isNight ? "bg-blue-400" : "bg-amber-400"} animate-pulse`} />
          {isNight ? "Night Mode (Geo-Sync)" : "Day Mode (Geo-Sync)"}
        </div>
        <button
          onClick={() => setMode(isNight ? "day" : "night")}
          className="text-[10px] font-semibold px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-800 transition-all hover:scale-105 active:scale-95"
        >
          Toggle Sky
        </button>
      </div>

      <Canvas
        camera={{ position: [450, 350, 520], fov: 50, far: 10000 }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color(isNight ? '#0a0e27' : '#87ceeb');
        }}
      >
        <fog attach="fog" args={[isNight ? '#0a0e27' : '#87ceeb', 100, 8000]} />
        <ambientLight intensity={isNight ? 0.5 : 1.2} />
        <directionalLight color={isNight ? '#5a9fd4' : '#ffffff'} intensity={isNight ? 1.0 : 2.0} position={[200, 300, 200]} castShadow />
        <pointLight color={isNight ? '#1e88e5' : '#ffffff'} intensity={isNight ? 0.5 : 0.3} position={[300, 200, 300]} />
        <OrbitControls enablePan enableZoom enableRotate />

        {/* ground plane - black exterior */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.5, 0]}>
          <planeGeometry args={[4000, 4000]} />
          <meshStandardMaterial color="#000000" roughness={0.9} metalness={0.0} />
        </mesh>

        {/* ground plane - dark grey interior */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[525, 0, 525]}>
          <planeGeometry args={[1200, 1200]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.85} metalness={0.0} />
        </mesh>

        {/* huge refinery base platform */}
        <mesh position={[525, -2, 525]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1200, 1200]} />
          <meshStandardMaterial color="#6b7a8f" roughness={0.85} metalness={0.1} />
        </mesh>

        {/* perimeter wall */}
        {/* north wall */}
        <mesh position={[525, 35, -75]}>
          <boxGeometry args={[1200, 70, 20]} />
          <meshStandardMaterial color="#2a3142" roughness={0.9} metalness={0.05} />
        </mesh>
        {/* south wall */}
        <mesh position={[525, 35, 1125]}>
          <boxGeometry args={[1200, 70, 20]} />
          <meshStandardMaterial color="#2a3142" roughness={0.9} metalness={0.05} />
        </mesh>
        {/* west wall */}
        <mesh position={[-75, 35, 525]}>
          <boxGeometry args={[20, 70, 1200]} />
          <meshStandardMaterial color="#2a3142" roughness={0.9} metalness={0.05} />
        </mesh>
        {/* east wall */}
        <mesh position={[1125, 35, 525]}>
          <boxGeometry args={[20, 70, 1200]} />
          <meshStandardMaterial color="#2a3142" roughness={0.9} metalness={0.05} />
        </mesh>

        {/* ═══════════════════════════════════════════════════════════════
             ROAD NETWORK – every road placed in the verified clear gap
             between building footprints (see comments for proof).
             POSITION_SCALE=35  →  backend pos × 35 = scene coord.
             Building column/row extents:
               Row-1 south  z ≤ 380  (CDU/VDU/FCC)
               Row-2 north  z ≥ 496  (HDT/REF/H2)   south z ≤ 580
               Row-3 north  z ≥ 646  (DCOKER/SRU)
               West zone east  x ≤ 238  (STORAGE/UTIL/POWER)
               Col-1 west  x ≥ 298  (CDU/HDT/DCOKER)  east x ≤ 410
               Col-2 west  x ≥ 459  (VDU/REF/SRU)     east x ≤ 567
               Col-3 west  x ≥ 644  (FCC/H2)           east x ≤ 740
               East zone west  x ≥ 890  (MARINE/CTRL/FLARE)
        ═══════════════════════════════════════════════════════════════ */}

        {/* ── PERIMETER LOOP ROAD (inner face of boundary walls) ──────── */}
        <mesh rotation={[-Math.PI/2,0,0]} position={[525,1,45]}>
          <planeGeometry args={[990,14]} /><meshStandardMaterial color="#252525" roughness={0.95} />
        </mesh>
        <mesh rotation={[-Math.PI/2,0,0]} position={[525,1,1005]}>
          <planeGeometry args={[990,14]} /><meshStandardMaterial color="#252525" roughness={0.95} />
        </mesh>
        <mesh rotation={[-Math.PI/2,0,0]} position={[35,1,525]}>
          <planeGeometry args={[14,960]} /><meshStandardMaterial color="#252525" roughness={0.95} />
        </mesh>
        <mesh rotation={[-Math.PI/2,0,0]} position={[1015,1,525]}>
          <planeGeometry args={[14,960]} /><meshStandardMaterial color="#252525" roughness={0.95} />
        </mesh>

        {/* ── MAIN E-W ROADS ──────────────────────────────────────────── */}
        {/* North access  z=150:  clear of storage z-min=191, marine z-min=255  */}
        <mesh rotation={[-Math.PI/2,0,0]} position={[525,1,150]}>
          <planeGeometry args={[990,16]} /><meshStandardMaterial color="#2a2a2a" roughness={0.95} />
        </mesh>
        {/* Corridor A  z=437:  Row-1 south≤380, Row-2 north≥496  →  gap 116 u  */}
        <mesh rotation={[-Math.PI/2,0,0]} position={[525,1,437]}>
          <planeGeometry args={[990,24]} /><meshStandardMaterial color="#2a2a2a" roughness={0.95} />
        </mesh>
        {/* Corridor B  z=613:  Row-2 south≤580, Row-3 north≥646  →  gap 66 u  */}
        <mesh rotation={[-Math.PI/2,0,0]} position={[525,1,613]}>
          <planeGeometry args={[990,18]} /><meshStandardMaterial color="#2a2a2a" roughness={0.95} />
        </mesh>
        {/* South access  z=900:  south of all blocks, power z-max≈828  */}
        <mesh rotation={[-Math.PI/2,0,0]} position={[525,1,900]}>
          <planeGeometry args={[990,16]} /><meshStandardMaterial color="#2a2a2a" roughness={0.95} />
        </mesh>

        {/* ── MAIN N-S ROADS ──────────────────────────────────────────── */}
        {/* West arterial  x=268:  util east≤238, Col-1 west≥298  →  gap 60 u  */}
        <mesh rotation={[-Math.PI/2,0,0]} position={[268,1,525]}>
          <planeGeometry args={[18,960]} /><meshStandardMaterial color="#2a2a2a" roughness={0.95} />
        </mesh>
        {/* Col 1-2  x=434:  Col-1 east≤410, Col-2 west≥459  →  gap 49 u  */}
        <mesh rotation={[-Math.PI/2,0,0]} position={[434,1,525]}>
          <planeGeometry args={[18,960]} /><meshStandardMaterial color="#2a2a2a" roughness={0.95} />
        </mesh>
        {/* Col 2-3  x=605:  Col-2 east≤567, Col-3 west≥644  →  gap 77 u  */}
        <mesh rotation={[-Math.PI/2,0,0]} position={[605,1,525]}>
          <planeGeometry args={[18,960]} /><meshStandardMaterial color="#2a2a2a" roughness={0.95} />
        </mesh>
        {/* East arterial  x=815:  Col-3 east≤740, East zone west≥890  →  gap 150 u  */}
        <mesh rotation={[-Math.PI/2,0,0]} position={[815,1,525]}>
          <planeGeometry args={[22,960]} /><meshStandardMaterial color="#2a2a2a" roughness={0.95} />
        </mesh>

        {/* ── ROAD CENTRE-LINE DASHES (yellow) ────────────────────────── */}
        {([150,437,613,900] as number[]).flatMap((rz,ri) =>
          ([80,170,260,345,435,525,615,705,800,900] as number[]).map((rx,di) => (
            <mesh key={`dh-${ri}-${di}`} rotation={[-Math.PI/2,0,0]} position={[rx,1.5,rz]}>
              <planeGeometry args={[36,2]} /><meshStandardMaterial color="#e8cc42" roughness={0.8} />
            </mesh>
          ))
        )}
        {([268,434,605,815] as number[]).flatMap((rx,ri) =>
          ([80,175,280,370,460,545,635,725,820,920] as number[]).map((rz,di) => (
            <mesh key={`dv-${ri}-${di}`} rotation={[-Math.PI/2,0,0]} position={[rx,1.5,rz]}>
              <planeGeometry args={[2,36]} /><meshStandardMaterial color="#e8cc42" roughness={0.8} />
            </mesh>
          ))
        )}

        {/* ── SITE STRUCTURES ─────────────────────────────────────────── */}

        {/* Main security gate – south centre-line, south of perimeter road (z=1040)      */}
        {/* x: 490–560  z: 1018–1062  →  clear of z=1005 perimeter road (span 998–1012)  */}
        <group position={[525,0,1040]}>
          <mesh position={[-22,13,0]}><boxGeometry args={[26,26,22]} /><meshStandardMaterial color="#8a8a8a" roughness={0.7} metalness={0.1} /></mesh>
          <mesh position={[22,13,0]}><boxGeometry args={[26,26,22]} /><meshStandardMaterial color="#8a8a8a" roughness={0.7} metalness={0.1} /></mesh>
          <mesh position={[-22,27,0]}><boxGeometry args={[30,3,25]} /><meshStandardMaterial color="#444" metalness={0.4} roughness={0.6} /></mesh>
          <mesh position={[22,27,0]}><boxGeometry args={[30,3,25]} /><meshStandardMaterial color="#444" metalness={0.4} roughness={0.6} /></mesh>
          <mesh position={[-52,16,0]} rotation={[0,0,0.22]}><boxGeometry args={[40,3,3]} /><meshStandardMaterial color="#cc3333" /></mesh>
          <mesh position={[52,16,0]} rotation={[0,0,-0.22]}><boxGeometry args={[40,3,3]} /><meshStandardMaterial color="#cc3333" /></mesh>
        </group>

        {/* Emergency fire station – NW quadrant (x=160, z=200)                     */}
        {/* x: 125–195  z: 178–222  →  clear of x=268 road, z=150 road, z=437 road */}
        <group position={[160,0,200]}>
          <mesh position={[0,19,0]}><boxGeometry args={[70,36,44]} /><meshStandardMaterial color="#cc4422" roughness={0.6} metalness={0.1} /></mesh>
          <mesh position={[0,37,0]}><boxGeometry args={[70,2,44]} /><meshStandardMaterial color="#882211" roughness={0.7} /></mesh>
          {[-20,20].map((dx,i) => (
            <mesh key={i} position={[dx,16,22.5]}><boxGeometry args={[24,26,1]} /><meshStandardMaterial color="#bb3311" roughness={0.5} /></mesh>
          ))}
          <mesh position={[0,44,0]}><cylinderGeometry args={[1,1,14,6]} /><meshStandardMaterial color="#888" metalness={0.6} /></mesh>
          <mesh position={[0,52,0]}><sphereGeometry args={[4,12,12]} /><meshStandardMaterial color="#ff2200" emissive="#ff2200" emissiveIntensity={0.9} /></mesh>
        </group>

        {/* Maintenance warehouse + workshops – north strip, FCC-H2 column (x=720, z=90) */}
        {/* x: 670–770  z: 57–123  →  clear of x=605 road(597-613), x=815 road(804-826) */}
        {/*                             clear of z=45 perimeter(38-52), z=150 road(142-158) */}
        <group position={[720,0,90]}>
          <mesh position={[0,23,0]}><boxGeometry args={[100,44,66]} /><meshStandardMaterial color="#7a7a6a" roughness={0.8} metalness={0.05} /></mesh>
          {[-35,-12,12,35].map((rx,ri) => (
            <mesh key={ri} position={[rx,44,0]} rotation={[0,0,0.4]}><boxGeometry args={[24,3,68]} /><meshStandardMaterial color="#666655" roughness={0.8} /></mesh>
          ))}
          {[-30,-5,20].map((dx,i) => (
            <mesh key={i} position={[dx,8,-34]}><boxGeometry args={[18,12,4]} /><meshStandardMaterial color="#555" roughness={0.9} /></mesh>
          ))}
        </group>

        {/* Water treatment – SW quadrant, south of Power Plant (x=90, z=855)       */}
        {/* basins at world-x: 90, 152, 214 (r=25) → x-extent: 65–239              */}
        {/* z-extent: 827–883  →  clear of x=268 road(260-276), z=900 road(892-908) */}
        <group position={[90,0,855]}>
          {([0,62,124] as number[]).map((ox,oi) => (
            <group key={oi} position={[ox,0,0]}>
              <mesh position={[0,5,0]}><cylinderGeometry args={[25,27,10,24]} /><meshStandardMaterial color="#3a5a6a" roughness={0.6} metalness={0.1} /></mesh>
              <mesh position={[0,10,0]}><cylinderGeometry args={[24,24,1.5,24]} /><meshStandardMaterial color="#2a7a9a" roughness={0.3} metalness={0.1} transparent opacity={0.75} /></mesh>
            </group>
          ))}
          <mesh position={[62,15,-44]}><boxGeometry args={[55,26,22]} /><meshStandardMaterial color="#6a7a8a" roughness={0.7} /></mesh>
        </group>

        {/* Electrical substation – NE sector, north of marine terminal (x=878, z=190)  */}
        {/* x: 844–912  z: 168–212  →  clear of x=815 road(804-826), z=150 road(142-158) */}
        <group position={[878,0,190]}>
          <mesh position={[0,11,0]}><boxGeometry args={[68,20,44]} /><meshStandardMaterial color="#9a9a7a" roughness={0.7} metalness={0.05} /></mesh>
          {[-22,0,22].map((tx,ti) => (
            <mesh key={ti} position={[tx,22,0]}><boxGeometry args={[17,18,20]} /><meshStandardMaterial color="#4a4a3a" metalness={0.3} roughness={0.7} /></mesh>
          ))}
          <mesh position={[0,42,0]}><cylinderGeometry args={[1.5,2,62,6]} /><meshStandardMaterial color="#888" metalness={0.6} roughness={0.4} /></mesh>
          <mesh position={[0,66,0]}><boxGeometry args={[30,3,4]} /><meshStandardMaterial color="#888" metalness={0.6} roughness={0.4} /></mesh>
          <mesh position={[0,56,0]}><boxGeometry args={[24,3,4]} /><meshStandardMaterial color="#888" metalness={0.6} roughness={0.4} /></mesh>
        </group>

        {/* ── ELEVATED PIPE RACK SYSTEM ────────────────────────────────── */}
        {/* E-W main process rack along Corridor A (z=437)                  */}
        {/* Trestles between N-S roads at x = 310, 396, 476, 558, 636, 718  */}
        {([310,396,476,558,636,718] as number[]).map((x,i) => (
          <group key={`ewrack-${i}`} position={[x,0,437]}>
            {[-10,10].map((dz,j) => (
              <mesh key={j} position={[0,18,dz]}><boxGeometry args={[5,36,5]} /><meshStandardMaterial color="#5a6a7a" metalness={0.5} roughness={0.5} /></mesh>
            ))}
            <mesh position={[0,36,0]}><boxGeometry args={[28,4,28]} /><meshStandardMaterial color="#4a5a6a" metalness={0.5} roughness={0.5} /></mesh>
            {[-9,0,9].map((pz,pi) => (
              <mesh key={pi} position={[0,40,pz]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[2,2,30,8]} /><meshStandardMaterial color="#7a8a9a" metalness={0.6} roughness={0.4} /></mesh>
            ))}
          </group>
        ))}
        {/* N-S pipe rack along the west arterial (x=268)                   */}
        {/* Trestles at z = 200, 320, 447, 533, 623, 742                    */}
        {([200,320,447,533,623,742] as number[]).map((z,i) => (
          <group key={`nsrack-${i}`} position={[268,0,z]}>
            {[-10,10].map((dx,j) => (
              <mesh key={j} position={[dx,18,0]}><boxGeometry args={[5,36,5]} /><meshStandardMaterial color="#5a6a7a" metalness={0.5} roughness={0.5} /></mesh>
            ))}
            <mesh position={[0,36,0]}><boxGeometry args={[28,4,28]} /><meshStandardMaterial color="#4a5a6a" metalness={0.5} roughness={0.5} /></mesh>
            {[-9,0,9].map((pz,pi) => (
              <mesh key={pi} position={[0,40,pz]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[2,2,30,8]} /><meshStandardMaterial color="#7a8a9a" metalness={0.6} roughness={0.4} /></mesh>
            ))}
          </group>
        ))}
        {ZONE_POLYGONS.map((zone) => {
          const avgLon = zone.coords.reduce((s, c) => s + c[0], 0) / zone.coords.length;
          const avgLat = zone.coords.reduce((s, c) => s + c[1], 0) / zone.coords.length;
          const posX = (avgLon - GEO_CENTER.lon) * 100000;
          const posZ = (avgLat - GEO_CENTER.lat) * 100000;
          const shape = new THREE.Shape(
            zone.coords.map((c) => new THREE.Vector2((c[0] - GEO_CENTER.lon) * 100000, (c[1] - GEO_CENTER.lat) * 100000))
          );
          return (
            <mesh key={zone.id} rotation={[-Math.PI / 2, 0, 0]} position={[posX, 0.1, posZ]}>
              <extrudeGeometry args={[shape, { depth: 1, bevelEnabled: false }]} />
              <meshBasicMaterial color={zone.color} transparent opacity={0.14} side={THREE.DoubleSide} />
            </mesh>
          );
        })}

        {/* ── 45-route rack-routed pipeline network ─────────────────────── */}
        {/* Each route follows pipe-alley corridors with 90° bends, not     */}
        {/* diagonal shortcuts. Elbow spheres mark every bend junction.     */}
        {(() => {
          const segs: React.ReactElement[] = [];
          PIPE_ROUTES.forEach((route, ri) => {
            const { waypoints: wps, color, radius } = route;
            for (let i = 0; i < wps.length - 1; i++) {
              const [x1, y1, z1] = wps[i];
              const [x2, y2, z2] = wps[i + 1];
              const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              if (dist < 0.5) continue;
              const mid: [number, number, number] = [(x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2];
              const q = new THREE.Quaternion();
              q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
              segs.push(
                <mesh key={`p${ri}-${i}`} position={mid} quaternion={q}>
                  <cylinderGeometry args={[radius, radius, dist, 8]} />
                  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.18} metalness={0.75} roughness={0.25} />
                </mesh>
              );
              if (i > 0) {
                segs.push(
                  <mesh key={`e${ri}-${i}`} position={[x1, y1, z1] as [number,number,number]}>
                    <sphereGeometry args={[radius * 1.15, 8, 8]} />
                    <meshStandardMaterial color={color} metalness={0.75} roughness={0.25} />
                  </mesh>
                );
              }
            }
          });
          return segs;
        })()}

        {/* buildings */}
        {buildings.map((b) => (
          <BuildingMesh
            key={b.id}
            building={b}
            selected={selectedId === b.id}
            onSelect={onSelectBuilding}
            unitSummaryMap={unitSummaryMap}
          />
        ))}
      </Canvas>

      <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
        <div className="flex flex-col gap-1.5">
          <div className="bg-slate-950/80 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 flex flex-col gap-1 shadow-2xl">
            <div className="text-[10px] font-bold text-primary-400 uppercase tracking-widest">Refinery Complex</div>
            <div className="text-[9px] text-slate-400 font-mono">Facility coordinates unavailable</div>
          </div>
          <div className="bg-ai-950/80 backdrop-blur-md px-3 py-2 rounded-lg border border-ai-500/30 flex flex-col gap-1 shadow-2xl">
            <div className="text-[10px] font-bold text-ai-400 uppercase tracking-widest">Digital Twin Status</div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <div className="text-[9px] text-ai-200 font-medium">Live synthetic telemetry + advisory overlay active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

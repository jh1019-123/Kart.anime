export interface KartInfo {
  id: string;
  name: string;
  color: number; // 3D Mesh 색상 (Hex)
  flameColor: number; // 부스터 불꽃 색상 (Hex)
  description: string;
  rarity: 'Normal' | 'Rare' | 'Legendary';
  stats: {
    speed: number;    // 최고 속도 가중치 (1.0 ~ 1.5)
    accel: number;    // 가속도 가중치
    drift: number;    // 드리프트/게이지 충전 속도 가중치
    handling: number; // 조향 성능 가중치
  };
  price: number;      // 뽑기 비용은 공통이지만 가치 기준
}

export interface MapInfo {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  themeColor: string; // Tailwind 테마 색상 (예: pink-500, cyan-400 등)
  skyColor: number; // Fog / Background 색상 (Hex)
  points: [number, number, number][]; // 3D 경로 좌표들
}

// Network P2P Room Structures
export type PeerRole = 'host' | 'client';

export interface Participant {
  peerId: string;
  name: string;
  role: PeerRole;
  isReady: boolean;
  kartId: string;
  selectedAuraId?: string;
  selectedSkinColor?: string;
  selectedTitle?: string;
  lastOutcome?: RaceOutcome;
  currentLap?: number;
  currentSpeed?: number;
}

export interface RaceOutcome {
  peerId: string;
  name: string;
  kartName: string;
  finalTime?: number; // millisecond timestamp or formatted standard text
  finished: boolean;
  driftCount: number;
  boostersUsed: number;
  maxSpeed: number;
}

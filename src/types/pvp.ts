// src/types/pvp.ts

import type { CoreType, Stats, RebirthUpgrades } from './game';

/**
 * PVP 대전용 플레이어 고정 스냅샷 프로필 인터페이스
 * (무한 환생 시에도 최고점 상태를 보존하여 대전 공격 및 방어 덱으로 사용)
 * 추후 Firebase Firestore / Cloud SQL DB와 완벽 호환되도록 설계된 데이터 구조
 */
export interface PvpProfile {
  userId: string;
  playerName: string;
  level: number;
  stats: Stats;
  equippedCore: {
    type: CoreType;
    level: number;
    name?: string;
  } | null;
  unlockedSkills: string[];
  rebirthUpgrades: Partial<RebirthUpgrades>;
  combatPower: number;
  pvpScore: number;
  pvpWins: number;
  pvpLosses: number;
  allTimeMaxStage: number;
  updatedAt: number;
}

/**
 * 대전 상대 정보 인터페이스 (임시 Mock DB 데이터 호환)
 */
export interface PvpOpponent {
  id: string;
  playerName: string;
  title: string;
  level: number;
  stats: Stats;
  equippedCore: {
    type: CoreType;
    level: number;
    name?: string;
  } | null;
  unlockedSkills: string[];
  rebirthUpgrades: Partial<RebirthUpgrades>;
  combatPower: number;
  pvpScore: number;
  description: string;
}

/**
 * PVP 대전 전적 기록 인터페이스 (대전 포인트/레이팅 전용)
 */
export interface PvpBattleLog {
  id: string;
  timestamp: number;
  opponentName: string;
  opponentLevel: number;
  isWin: boolean;
  scoreDelta: number;
}

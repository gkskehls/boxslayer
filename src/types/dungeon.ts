// src/types/dungeon.ts

export type DungeonType = 'GOLD' | 'EXP' | 'CORE' | 'BOX' | 'RP';

export interface DungeonConfig {
  id: DungeonType;
  name: string;
  subTitle: string;
  dayName: string;
  dayIndex: number; // 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat, 0: Sun
  rewardName: string;
  rewardIcon: string;
  icon: string;
  accentColor: string;
  badgeBg: string;
  description: string;
  gimmickText: string;
  recommendedCore: string;
}

export interface DungeonFloorProgress {
  stars: number; // 0~3
  bestTimeSeconds?: number;
  cleared: boolean;
}

export interface DungeonProgress {
  maxClearedFloor: number; // 최고 클리어 층수 (0이면 아직 클리어 안함, 다음 도전은 maxClearedFloor + 1)
  floors: Record<number, DungeonFloorProgress>; // 층별 별점 및 클리어 정보
}

export interface DungeonState {
  tickets: number; // 오늘 남은 티켓 (최대 3장 + 다이아 충전분)
  maxTickets: number; // 기본 3장
  lastTicketRefillDate: string; // YYYY-MM-DD
  purchasedTicketsToday: number; // 오늘 다이아로 충전한 티켓 수
  progress: Record<DungeonType, DungeonProgress>;
}

export interface DungeonRewardResult {
  gold: number;
  exp: number;
  coreFragments: number;
  boxFragments: number;
  rp: number;
  isFirstClear: boolean;
  firstClearDiamonds?: number;
  starsGained?: number;
}

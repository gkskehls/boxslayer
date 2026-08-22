// src/data/dungeonConfig.ts

import type { DungeonConfig, DungeonType, DungeonRewardResult } from '../types/dungeon';

export const DUNGEON_LIST: DungeonConfig[] = [
  {
    id: 'GOLD',
    name: '황금의 금고',
    subTitle: '골드 대량 수급',
    dayName: '월요일',
    dayIndex: 1,
    rewardName: '골드',
    rewardIcon: '🪙',
    icon: '🪙',
    accentColor: '#EAB308', // Amber / Gold
    badgeBg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    description: '엄청난 양의 황금 보물을 가득 품은 황금 수호 박스를 30초 내에 물리치세요!',
    gimmickText: '🔥 시간제한 극딜: 순수 STR과 공격력으로 황금 상자를 빠르게 격파!',
    recommendedCore: '🔥 불의 코어 (폭발 데미지)',
  },
  {
    id: 'EXP',
    name: '지혜의 샘',
    subTitle: '경험치 대량 수급',
    dayName: '화요일',
    dayIndex: 2,
    rewardName: '경험치',
    rewardIcon: '🧪',
    icon: '🧪',
    accentColor: '#3B82F6', // Blue
    badgeBg: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    description: '영혼의 지혜가 응축된 수호자를 격파하여 폭발적인 캐릭터 레벨업을 달성하세요!',
    gimmickText: '💧 지구력 방어전: 적의 공격력이 지속 상승하므로 CON/체력으로 버티며 격파!',
    recommendedCore: '💧 물의 코어 (쉴드/유지력)',
  },
  {
    id: 'CORE',
    name: '코어의 성소',
    subTitle: '코어 조각 대량 수급',
    dayName: '수요일',
    dayIndex: 3,
    rewardName: '코어 조각',
    rewardIcon: '💎',
    icon: '🔮',
    accentColor: '#A855F7', // Purple
    badgeBg: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    description: '원소의 기운이 소용돌이치는 성소에서 강력한 코어 연구 재료를 획득하세요!',
    gimmickText: '⚡ 속성 보호막: 코어 원소 관통 피해를 집중시켜 적의 에너지 쉴드를 파쇄!',
    recommendedCore: '⚡ 번개 / 🔥 불 코어 (속성 관통)',
  },
  {
    id: 'BOX',
    name: '박스의 차원',
    subTitle: '박스 조각 대량 수급',
    dayName: '목요일',
    dayIndex: 4,
    rewardName: '박스 조각',
    rewardIcon: '📦',
    icon: '📦',
    accentColor: '#10B981', // Emerald
    badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
    description: '차원의 틈새에서 끊임없이 분열하는 미지의 박스 조각들을 수집하세요!',
    gimmickText: '🌪️ 다단히트 연타전: 1타당 1의 고정 피해! DEX 기반 초고속 연격으로 타수를 채워 격파!',
    recommendedCore: '🌪️ 바람의 코어 (초고속 다단히트)',
  },
  {
    id: 'RP',
    name: '환생의 틈새',
    subTitle: '환생 포인트 대량 수급',
    dayName: '금요일',
    dayIndex: 5,
    rewardName: '환생 포인트 (RP)',
    rewardIcon: '🌟',
    icon: '🌌',
    accentColor: '#F43F5E', // Rose
    badgeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/50',
    description: '윤회의 비밀을 간직한 시공간의 수호자를 격파하여 영구 환생 스탯을 강화하세요!',
    gimmickText: '👑 카오스 보스전: 주기적으로 속성을 바꾸는 보스를 상대로 밸런스형 스탯으로 응전!',
    recommendedCore: '🌟 모든 코어 조화',
  },
];

/**
 * 오늘 요일에 입장 가능한 던전 ID 목록 반환
 * 0: 일요일 (전체 개방), 6: 토요일 (전체 개방)
 * 1: 월요일 (GOLD), 2: 화요일 (EXP), 3: 수요일 (CORE), 4: 목요일 (BOX), 5: 금요일 (RP)
 */
export const getAvailableDungeonsToday = (): DungeonType[] => {
  const day = new Date().getDay();
  if (day === 0 || day === 6) {
    // 토/일 주말: 5개 던전 전체 개방!
    return ['GOLD', 'EXP', 'CORE', 'BOX', 'RP'];
  }
  const match = DUNGEON_LIST.find(d => d.dayIndex === day);
  return match ? [match.id] : ['GOLD', 'EXP', 'CORE', 'BOX', 'RP'];
};

/**
 * 오늘이 주말(전체 개방의 날)인지 확인
 */
export const isWeekendAllOpen = (): boolean => {
  const day = new Date().getDay();
  return day === 0 || day === 6;
};

/**
 * 던전 층(Floor)에 따른 적 스펙 계산 (30초 타임어택 엘리트 보스 밸런스 공식 기반 무한 스케일링)
 */
export const getDungeonEnemyStats = (type: DungeonType, floor: number) => {
  // 요일 던전은 30초 타임어택 보스 콘텐츠이므로 일반 몬스터 대비 튼튼한 공방 체력 보유
  const baseStat = 6 + Math.floor(1.4 * floor + 0.2 * Math.pow(Math.max(1, floor), 1.5));
  
  let str = baseStat;
  let dex = baseStat;
  let con = baseStat;

  // 기믹별 특화 스탯 (일반 스케일링 위에 기믹 특화 비율 적용)
  if (type === 'GOLD') {
    // 황금 금고: CON이 높아 튼튼하며 버팀 (시간제한 딜체크 슈퍼탱커)
    con = Math.floor(baseStat * 1.4);
    str = Math.floor(baseStat * 0.6);
  } else if (type === 'EXP') {
    // 지혜의 샘: STR이 높아서 강력한 공격 (지구력 체력/방어 체크 강타 딜러)
    str = Math.floor(baseStat * 1.5);
    con = Math.floor(baseStat * 0.9);
  } else if (type === 'BOX') {
    // 박스 차원: 다단히트 타수전 (1타당 1고정 데미지)
    con = baseStat;
    dex = Math.floor(baseStat * 1.3);
  } else if (type === 'CORE') {
    // 코어 성소: 쉴드가 두껍게 생성됨 (속성 관통 체크)
    con = Math.floor(baseStat * 1.1);
  } else if (type === 'RP') {
    // 환생 틈새: 모든 스탯 고르게 강력 (올라운더 엘리트)
    str = Math.floor(baseStat * 1.2);
    dex = Math.floor(baseStat * 1.2);
    con = Math.floor(baseStat * 1.2);
  }

  let maxHealth: number;
  let attack: number;
  let defense: number;
  let initialShield = 0;

  if (type === 'BOX') {
    // 박스 차원은 요구 타격 수(Hits)를 체력으로 환산 (공속/연격 세팅 필수)
    maxHealth = Math.floor(10 + (floor * 6) + Math.pow(floor, 1.25) * 3);
    attack = Math.floor(12 + (str * 1.1));
    defense = 0; // 타수전이므로 방어력 0
  } else if (type === 'GOLD') {
    // 황금 금고: 30초 딜체크형 슈퍼 탱커
    maxHealth = Math.floor(250 + (floor * 140) + (con * 30) + Math.pow(floor, 1.85) * 35);
    attack = Math.floor(14 + (str * 1.2));
    defense = Math.floor(4 + (con * 0.45) + (floor * 1.2));
  } else if (type === 'EXP') {
    // 지혜의 샘: 플레이어 생존력(체력/방어) 시험형 강타 보스
    maxHealth = Math.floor(200 + (floor * 100) + (con * 22) + Math.pow(floor, 1.8) * 25);
    attack = Math.floor(22 + (str * 2.2) + (floor * 3));
    defense = Math.floor(4 + (con * 0.35) + floor);
  } else if (type === 'CORE') {
    // 코어 성소: 70% 수호 쉴드 보유 (속성 코어 관통 공격 필수)
    maxHealth = Math.floor(180 + (floor * 90) + (con * 20) + Math.pow(floor, 1.75) * 22);
    attack = Math.floor(16 + (str * 1.5) + (floor * 2));
    defense = Math.floor(4 + (con * 0.4) + floor);
    initialShield = Math.floor(maxHealth * 0.7);
  } else {
    // RP (환생 틈새) 및 기본: 균형 잡힌 엘리트 수호신
    maxHealth = Math.floor(220 + (floor * 110) + (con * 24) + Math.pow(floor, 1.8) * 28);
    attack = Math.floor(18 + (str * 1.7) + (floor * 2.5));
    defense = Math.floor(4 + (con * 0.45) + floor * 1.2);
  }

  return {
    name: `${floor}단계 수호 박스`,
    stats: { str, dex, con },
    maxHealth,
    attack,
    defense,
    initialShield,
  };
};

/**
 * 던전 클리어 시 보상 산출 공식 (무한 층 스케일링)
 */
export const calculateDungeonRewards = (
  type: DungeonType,
  floor: number,
  isFirstClear: boolean
): DungeonRewardResult => {
  const result: DungeonRewardResult = {
    gold: 0,
    exp: 0,
    coreFragments: 0,
    boxFragments: 0,
    rp: 0,
    isFirstClear,
  };

  switch (type) {
    case 'GOLD': {
      // 🪙 대량 골드 (일반 스테이지의 수십 배, 층수에 비례하여 무한 증가)
      result.gold = Math.floor((3000 + (floor * 1200) + Math.pow(floor, 1.6) * 450) * (isFirstClear ? 2.5 : 1.0));
      break;
    }
    case 'EXP': {
      // 🧪 대량 경험치 (일반 스테이지의 수십 배, 층수에 비례하여 무한 증가)
      result.exp = Math.floor((2000 + (floor * 800) + Math.pow(floor, 1.55) * 300) * (isFirstClear ? 2.5 : 1.0));
      break;
    }
    case 'CORE': {
      // 🔮 코어 조각 (기본 5개 + 층당 점진적 증가)
      result.coreFragments = Math.max(3, Math.floor((5 + (floor * 2) + Math.pow(floor, 1.2) * 1.5) * (isFirstClear ? 2 : 1)));
      break;
    }
    case 'BOX': {
      // 📦 박스 조각 (기본 3개 + 층당 점진적 증가)
      result.boxFragments = Math.max(2, Math.floor((3 + (floor * 1.5) + Math.pow(floor, 1.15) * 1.2) * (isFirstClear ? 2 : 1)));
      break;
    }
    case 'RP': {
      // 🌌 환생 포인트 (기본 15개 + 층당 점진적 증가)
      result.rp = Math.max(5, Math.floor((15 + (floor * 8) + Math.pow(floor, 1.35) * 3) * (isFirstClear ? 2 : 1)));
      break;
    }
  }

  return result;
};

// src/utils/boxStyleEvaluator.ts
import type { CSSProperties } from 'react';
import type { CoreType } from '../types/game';

export type ColorThemeType = 'ORIGINAL' | 'OPTION_A' | 'OPTION_B' | 'OPTION_C' | 'OPTION_D';

export interface BoxStats {
  str: number;
  dex: number;
  con: number;
}

// 1. 기존 방식 (ORIGINAL: 단순 RGB 비례 혼합)
export const getOriginalBoxStyle = (
  stats: BoxStats,
  opponentTotalStats: number,
  baseSize: number = 80
): CSSProperties => {
  const { str, dex, con } = stats;
  const myTotalStats = (str || 0) + (dex || 0) + (con || 0) || 1;
  const oppTotalStats = Math.max(1, opponentTotalStats || 1);

  const normR = (str || 0) / myTotalStats;
  const normG = (dex || 0) / myTotalStats;
  const normB = (con || 0) / myTotalStats;

  const diffRatio = (myTotalStats - oppTotalStats) / Math.max(myTotalStats, oppTotalStats);
  const lightness = Math.min(0.75, Math.max(0.25, 0.50 + diffRatio * 0.25));

  const lightnessFactor = lightness * 2;
  const r = Math.min(255, Math.max(0, Math.floor(normR * 255 * lightnessFactor)));
  const g = Math.min(255, Math.max(0, Math.floor(normG * 255 * lightnessFactor)));
  const b = Math.min(255, Math.max(0, Math.floor(normB * 255 * lightnessFactor)));

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    width: `${baseSize}px`,
    height: `${baseSize}px`,
    borderRadius: '0px',
  };
};

// 2. 방안 A: HSL 360도 색상환 벡터 블렌딩 (Vector Hue Synthesis)
export const getOptionABoxStyle = (
  stats: BoxStats,
  opponentTotalStats: number,
  baseSize: number = 80
): CSSProperties => {
  const { str, dex, con } = stats;
  const total = (str || 0) + (dex || 0) + (con || 0) || 1;
  const oppTotal = Math.max(1, opponentTotalStats || 1);

  const r = (str || 0) / total;
  const g = (dex || 0) / total;
  const b = (con || 0) / total;

  // STR: 0도 (루비 레드), DEX: 130도 (에메랄드 그린), CON: 225도 (코발트 사파이어)
  const deg2rad = Math.PI / 180;
  const x = r * Math.cos(0 * deg2rad) + g * Math.cos(130 * deg2rad) + b * Math.cos(225 * deg2rad);
  const y = r * Math.sin(0 * deg2rad) + g * Math.sin(130 * deg2rad) + b * Math.sin(225 * deg2rad);

  let hue = Math.atan2(y, x) * (180 / Math.PI);
  if (hue < 0) hue += 360;

  // 벡터 길이로 순도(채도) 결정
  const vectorMag = Math.min(1, Math.sqrt(x * x + y * y) * 1.5);
  // 올스탯 균형 시 은은한 플래티넘 실버, 특정 스탯 몰빵 시 선명한 비비드
  const saturation = Math.round(15 + vectorMag * 75); // 15% ~ 90%

  // 상대와의 강함 차이로 명도 및 채도 미세 변조 (35% ~ 65%)
  const diffRatio = (total - oppTotal) / Math.max(total, oppTotal);
  const lightness = Math.round(50 + diffRatio * 15); // 내가 강하면 65%, 약하면 35%

  return {
    backgroundColor: `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`,
    width: `${baseSize}px`,
    height: `${baseSize}px`,
    borderRadius: '0px',
  };
};

// 3. 방안 B: 코어 메인 테마 + 스탯 서브 액센트 융합형
export const getOptionBBoxStyle = (
  stats: BoxStats,
  opponentTotalStats: number,
  baseSize: number = 80,
  coreType?: CoreType | null
): CSSProperties => {
  const { str, dex, con } = stats;
  const total = (str || 0) + (dex || 0) + (con || 0) || 1;
  const oppTotal = Math.max(1, opponentTotalStats || 1);
  const diffRatio = (total - oppTotal) / Math.max(total, oppTotal);

  if (!coreType) {
    // 무속성(노코어): 스탯에 비례한 소프트 아케이드 그레이
    const r = (str || 0) / total;
    const g = (dex || 0) / total;
    const b = (con || 0) / total;
    const deg2rad = Math.PI / 180;
    const x = r * Math.cos(0 * deg2rad) + g * Math.cos(130 * deg2rad) + b * Math.cos(225 * deg2rad);
    const y = r * Math.sin(0 * deg2rad) + g * Math.sin(130 * deg2rad) + b * Math.sin(225 * deg2rad);
    let hue = Math.atan2(y, x) * (180 / Math.PI);
    if (hue < 0) hue += 360;

    const l = Math.round(52 + diffRatio * 14);
    return {
      backgroundColor: `hsl(${Math.round(hue)}, 25%, ${l}%)`,
      width: `${baseSize}px`,
      height: `${baseSize}px`,
      borderRadius: '0px',
    };
  }

  // 코어 타입별 고유 베이스 HSL
  let coreHue = 0;
  const coreSat = 82;
  switch (coreType) {
    case 'FIRE':
      coreHue = 0; // 마그마 파이어 (레드)
      break;
    case 'WATER':
      coreHue = 210; // 딥 사파이어 (블루)
      break;
    case 'WIND':
      coreHue = 145; // 에메랄드 세이지 (그린)
      break;
    case 'ELECTRIC':
      coreHue = 45; // 일렉트릭 썬더 (골든 옐로우)
      break;
  }

  // 스탯 비율에 따른 미세 틴트 편차 (-20도 ~ +20도)
  const statOffset = ((str * 20) - (dex * 15) + (con * 25)) / total;
  const finalHue = (coreHue + statOffset + 360) % 360;
  const l = Math.round(48 + diffRatio * 16);

  return {
    backgroundColor: `hsl(${Math.round(finalHue)}, ${coreSat}%, ${l}%)`,
    boxShadow: `inset 0 0 16px rgba(0, 0, 0, 0.5)`,
    width: `${baseSize}px`,
    height: `${baseSize}px`,
    borderRadius: '0px',
  };
};

// 4. 방안 C: 8비트 아케이드 전용 클래식 프리셋 팔레트
export const getOptionCBoxStyle = (
  stats: BoxStats,
  opponentTotalStats: number,
  baseSize: number = 80
): CSSProperties => {
  const { str, dex, con } = stats;
  const total = (str || 0) + (dex || 0) + (con || 0) || 1;
  const oppTotal = Math.max(1, opponentTotalStats || 1);

  const rRatio = str / total;
  const gRatio = dex / total;
  const bRatio = con / total;

  // 프리셋 색상 매핑
  let hexColor = '#64748B'; // 밸런스형: 슬레이트 실버

  if (rRatio >= 0.70) {
    hexColor = '#E11D48'; // 순수 STR 100% 몰빵: 버서커 크림슨 레드
  } else if (gRatio >= 0.70) {
    hexColor = '#10B981'; // 순수 DEX 100% 몰빵: 스피더 에메랄드 그린
  } else if (bRatio >= 0.70) {
    hexColor = '#2563EB'; // 순수 CON 100% 몰빵: 가디언 코발트 블루
  } else if (rRatio >= 0.35 && gRatio >= 0.35) {
    hexColor = '#F97316'; // STR + DEX 하이브리드: 듀얼리스트 앰버 오렌지
  } else if (rRatio >= 0.35 && bRatio >= 0.35) {
    hexColor = '#8B5CF6'; // STR + CON 하이브리드: 워로드 로열 바이올렛
  } else if (gRatio >= 0.35 && bRatio >= 0.35) {
    hexColor = '#06B6D4'; // DEX + CON 하이브리드: 레인저 아쿠아 사이언
  } else if (rRatio >= 0.45) {
    hexColor = '#EA580C'; // STR 우세형: 파이어 엠버
  } else if (gRatio >= 0.45) {
    hexColor = '#059669'; // DEX 우세형: 딥 포레스트
  } else if (bRatio >= 0.45) {
    hexColor = '#1D4ED8'; // CON 우세형: 로열 인디고
  }

  // 상대와의 차이에 따른 밝기 필터
  const diffRatio = (total - oppTotal) / Math.max(total, oppTotal);
  const brightness = Math.min(1.3, Math.max(0.7, 1.0 + diffRatio * 0.3));

  return {
    backgroundColor: hexColor,
    filter: `brightness(${brightness})`,
    width: `${baseSize}px`,
    height: `${baseSize}px`,
    borderRadius: '0px',
  };
};

// 5. 방안 D: 듀얼톤 (상하/대각선 그라데이션)
export const getOptionDBoxStyle = (
  stats: BoxStats,
  opponentTotalStats: number,
  baseSize: number = 80
): CSSProperties => {
  const { str, dex, con } = stats;
  const total = (str || 0) + (dex || 0) + (con || 0) || 1;
  const oppTotal = Math.max(1, opponentTotalStats || 1);

  // 상단 스탯과 하단 스탯 선정
  const statList = [
    { type: 'STR', val: str, color: '#E11D48' },
    { type: 'DEX', val: dex, color: '#10B981' },
    { type: 'CON', val: con, color: '#2563EB' },
  ].sort((a, b) => b.val - a.val);

  const topColor = statList[0].color;
  const bottomColor = statList[1].val > 0 ? statList[1].color : statList[0].color;

  const diffRatio = (total - oppTotal) / Math.max(total, oppTotal);
  const brightness = Math.min(1.3, Math.max(0.7, 1.0 + diffRatio * 0.3));

  return {
    backgroundImage: `linear-gradient(145deg, ${topColor} 0%, ${bottomColor} 100%)`,
    filter: `brightness(${brightness})`,
    width: `${baseSize}px`,
    height: `${baseSize}px`,
    borderRadius: '0px',
  };
};

// 통합 스타일 호출기
export const getCustomBoxStyle = (
  theme: ColorThemeType,
  stats: BoxStats,
  opponentTotalStats: number,
  baseSize: number = 80,
  coreType?: CoreType | null
): CSSProperties => {
  switch (theme) {
    case 'OPTION_A':
      return getOptionABoxStyle(stats, opponentTotalStats, baseSize);
    case 'OPTION_B':
      return getOptionBBoxStyle(stats, opponentTotalStats, baseSize, coreType);
    case 'OPTION_C':
      return getOptionCBoxStyle(stats, opponentTotalStats, baseSize);
    case 'OPTION_D':
      return getOptionDBoxStyle(stats, opponentTotalStats, baseSize);
    case 'ORIGINAL':
    default:
      return getOriginalBoxStyle(stats, opponentTotalStats, baseSize);
  }
};

// 코어 시각적 테두리 및 오라 스타일 정의 (프리뷰 및 실전 공용)
export const getCoreVisualConfig = (coreType?: CoreType | null) => {
  switch (coreType) {
    case 'FIRE':
      return {
        name: '불 코어',
        icon: '🔥',
        elementColor: '#EF4444',
        borderClass: 'border-neutral-950 ring-4 ring-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.75)]',
        badgeBg: 'bg-red-600 text-yellow-200 border-red-950',
        eyeColor: 'bg-amber-300',
        tag: '화염 속성',
      };
    case 'WATER':
      return {
        name: '물 코어',
        icon: '💧',
        elementColor: '#38BDF8',
        borderClass: 'border-neutral-950 ring-4 ring-sky-400/80 shadow-[0_0_12px_rgba(56,189,248,0.75)]',
        badgeBg: 'bg-blue-600 text-cyan-200 border-blue-950',
        eyeColor: 'bg-cyan-200',
        tag: '빙결/수류 속성',
      };
    case 'WIND':
      return {
        name: '바람 코어',
        icon: '🍃',
        elementColor: '#34D399',
        borderClass: 'border-neutral-950 ring-4 ring-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.75)]',
        badgeBg: 'bg-emerald-600 text-lime-200 border-emerald-950',
        eyeColor: 'bg-lime-200',
        tag: '질풍 속성',
      };
    case 'ELECTRIC':
      return {
        name: '전기 코어',
        icon: '⚡',
        elementColor: '#FBBF24',
        borderClass: 'border-neutral-950 ring-4 ring-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.85)]',
        badgeBg: 'bg-amber-500 text-stone-950 border-amber-950',
        eyeColor: 'bg-yellow-300',
        tag: '뇌전 속성',
      };
    default:
      return {
        name: '무속성',
        icon: '⚪',
        elementColor: '#78716C',
        borderClass: 'border-neutral-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
        badgeBg: 'bg-stone-700 text-stone-300 border-stone-950',
        eyeColor: 'bg-neutral-950',
        tag: '기본 무속성',
      };
  }
};

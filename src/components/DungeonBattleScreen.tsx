// src/components/DungeonBattleScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore, getComputedStats, calculateSuccessfulHits, getCoreStats } from '../store/gameStore';
import { DUNGEON_LIST, getDungeonEnemyStats } from '../data/dungeonConfig';
import type { DungeonType, DungeonRewardResult } from '../types/dungeon';
import type { CoreType } from '../types/game';
import { formatNumber } from '../utils/format';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

interface DungeonBattleScreenProps {
  dungeonType: DungeonType;
  floor: number;
  onExit: () => void;
}

// 8비트 아케이드 클래식 팔레트 박스 스타일러 (일반 스테이지와 100% 동일한 로직)
const getDynamicBoxStyle = (
  stats: { str: number; dex: number; con: number },
  opponentTotalStats: number,
  baseSize: number = 80
) => {
  const { str, dex, con } = stats;
  const total = (str || 0) + (dex || 0) + (con || 0) || 1;
  const oppTotal = Math.max(1, opponentTotalStats || 1);

  const rRatio = (str || 0) / total;
  const gRatio = (dex || 0) / total;
  const bRatio = (con || 0) / total;

  let hexColor = '#64748B';

  if (rRatio >= 0.70) {
    hexColor = '#E11D48';
  } else if (gRatio >= 0.70) {
    hexColor = '#10B981';
  } else if (bRatio >= 0.70) {
    hexColor = '#2563EB';
  } else if (rRatio >= 0.35 && gRatio >= 0.35) {
    hexColor = '#F97316';
  } else if (rRatio >= 0.35 && bRatio >= 0.35) {
    hexColor = '#8B5CF6';
  } else if (gRatio >= 0.35 && bRatio >= 0.35) {
    hexColor = '#06B6D4';
  } else if (rRatio >= 0.45) {
    hexColor = '#EA580C';
  } else if (gRatio >= 0.45) {
    hexColor = '#059669';
  } else if (bRatio >= 0.45) {
    hexColor = '#1D4ED8';
  }

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

const getCoreBorderClass = (coreType?: CoreType | null) => {
  switch (coreType) {
    case 'FIRE':
      return 'border-neutral-950 ring-4 ring-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.75)]';
    case 'WATER':
      return 'border-neutral-950 ring-4 ring-sky-400/80 shadow-[0_0_12px_rgba(56,189,248,0.75)]';
    case 'WIND':
      return 'border-neutral-950 ring-4 ring-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.75)]';
    case 'ELECTRIC':
      return 'border-neutral-950 ring-4 ring-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.85)]';
    default:
      return 'border-neutral-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]';
  }
};

const getCoreKoreanName = (coreType?: CoreType | null) => {
  switch (coreType) {
    case 'FIRE': return '불';
    case 'WATER': return '물';
    case 'WIND': return '바람';
    case 'ELECTRIC': return '전기';
    default: return '속성';
  }
};

const RetroHpBar = ({
  current,
  max,
  shield = 0,
  isEnemy = false,
}: {
  current: number;
  max: number;
  shield?: number;
  isEnemy?: boolean;
}) => {
  const safeMax = Math.max(1, max);
  const safeCurrent = Math.max(0, Math.min(safeMax, current));
  const hpPercent = (safeCurrent / safeMax) * 100;
  const shieldPercent = ((shield || 0) / safeMax) * 100;

  return (
    <div className="relative w-full h-3 bg-neutral-950/80 border border-neutral-900 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
      <div
        className={`h-full transition-all duration-200 ${
          isEnemy
            ? 'bg-gradient-to-r from-red-700 via-rose-600 to-red-500'
            : 'bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-400'
        }`}
        style={{ width: `${hpPercent}%` }}
      />
      {shield > 0 && (
        <div
          className="absolute top-0 bottom-0 bg-cyan-400/90 border-l-2 border-white animate-pulse transition-all duration-200 shadow-[0_0_6px_rgba(34,211,238,0.8)]"
          style={{
            left: `${Math.min(95, hpPercent)}%`,
            width: `${Math.min(100 - hpPercent, shieldPercent)}%`,
          }}
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.3)_1px,transparent_1px)] bg-[size:4px_100%] pointer-events-none" />
    </div>
  );
};

interface DamagePopupItem {
  id: string;
  val: number;
  isEnemy: boolean;
  isCore?: boolean;
  coreType?: CoreType | null;
  isCombo?: boolean;
  comboHits?: number;
  isMiss?: boolean;
}

interface DungeonLogItem {
  id: string;
  turn: number;
  sender: 'PLAYER' | 'ENEMY';
  text: string;
}

export const DungeonBattleScreen: React.FC<DungeonBattleScreenProps> = ({
  dungeonType,
  floor,
  onExit,
}) => {
  const {
    player,
    equippedCore,
    coreAbilities,
    rebirthUpgrades,
    unlockedSkills,
    activeBuffs,
    clearDungeonFloor,
  } = useGameStore();

  const config = DUNGEON_LIST.find((d) => d.id === dungeonType)!;
  const enemyData = getDungeonEnemyStats(dungeonType, floor);

  const playerComputed = getComputedStats(player.stats, unlockedSkills, activeBuffs, rebirthUpgrades);

  // 실시간 체력/쉴드 상태
  const initialPlayerShield = equippedCore?.type === 'WATER'
    ? Math.floor(playerComputed.maxHealth * (0.05 + (equippedCore.level * 0.005)))
    : 0;

  const [playerHp, setPlayerHp] = useState<number>(Math.floor(playerComputed.maxHealth));
  const [playerShield, setPlayerShield] = useState<number>(initialPlayerShield);
  const [enemyHp, setEnemyHp] = useState<number>(enemyData.maxHealth);
  const [enemyShield, setEnemyShield] = useState<number>(enemyData.initialShield);

  // 남은 시간 (초)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30);
  const [battleResult, setBattleResult] = useState<'IN_PROGRESS' | 'VICTORY' | 'DEFEAT'>('IN_PROGRESS');
  const [defeatReason, setDefeatReason] = useState<'TIMEOUT' | 'HP_ZERO'>('TIMEOUT');
  const [rewardResult, setRewardResult] = useState<DungeonRewardResult | null>(null);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [finishBanner, setFinishBanner] = useState<string | null>(null);

  // 애니메이션 상태
  const [playerAnim, setPlayerAnim] = useState<'idle' | 'attack' | 'hit' | 'defeat'>('idle');
  const [enemyAnim, setEnemyAnim] = useState<'idle' | 'attack' | 'hit' | 'defeat'>('idle');

  // 데미지 팝업 및 로그
  const [damagePopups, setDamagePopups] = useState<DamagePopupItem[]>([]);
  const [battleLogs, setBattleLogs] = useState<DungeonLogItem[]>([]);
  const [turnNumber, setTurnNumber] = useState<number>(1);
  const [showStats, setShowStats] = useState<boolean>(false);

  // 상태를 Ref로도 추적하여 Interval 클로저 내에서 최신 값 참조
  const stateRef = useRef({
    playerHp: Math.floor(playerComputed.maxHealth),
    playerShield: initialPlayerShield,
    enemyHp: enemyData.maxHealth,
    enemyShield: enemyData.initialShield,
    battleResult: 'IN_PROGRESS' as 'IN_PROGRESS' | 'VICTORY' | 'DEFEAT',
    startTime: 0,
    elapsed: 0,
    turn: 1,
    isFinished: false,
  });

  // 최신 스탯 및 기믹 파라미터를 Ref로 유지 (리렌더링 시 전투 인터벌이 중단되는 현상 완전 방지)
  const combatParamsRef = useRef({
    dungeonType,
    floor,
    config,
    enemyData,
    player,
    equippedCore,
    coreAbilities,
    rebirthUpgrades,
    unlockedSkills,
    activeBuffs,
    playerComputed,
    clearDungeonFloor,
  });

  useEffect(() => {
    combatParamsRef.current = {
      dungeonType,
      floor,
      config,
      enemyData,
      player,
      equippedCore,
      coreAbilities,
      rebirthUpgrades,
      unlockedSkills,
      activeBuffs,
      playerComputed,
      clearDungeonFloor,
    };
  }, [
    dungeonType,
    floor,
    config,
    enemyData,
    player,
    equippedCore,
    coreAbilities,
    rebirthUpgrades,
    unlockedSkills,
    activeBuffs,
    playerComputed,
    clearDungeonFloor,
  ]);

  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // 컴포넌트 마운트 시 시작 시간 초기화
  useEffect(() => {
    stateRef.current.startTime = Date.now();
  }, []);

  // 로그 자동 스크롤
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [battleLogs]);

  // 1. 카운트다운 타이머 (일반 스테이지 30초 타임아웃과 100% 동일한 1000ms 기준)
  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (stateRef.current.isFinished || stateRef.current.battleResult !== 'IN_PROGRESS') return;

      const elapsed = Math.floor((Date.now() - stateRef.current.startTime) / 1000);
      stateRef.current.elapsed = elapsed;
      const remaining = Math.max(0, 30 - elapsed);
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        stateRef.current.isFinished = true;
        stateRef.current.battleResult = 'DEFEAT';
        setDefeatReason('TIMEOUT');
        setBattleResult('DEFEAT');
        setFinishBanner('⏰ TIME OVER! 30초 초과');
        setTimeout(() => {
          setShowResultModal(true);
        }, 1200);
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  // 2. 턴 기반 전투 엔진 (일반 스테이지와 100% 동일한 1000ms 턴 루프 및 500ms 반격 템포)
  useEffect(() => {
    const intervalMs = 1000;
    const halfInterval = 500;

    let enemyTimeout: ReturnType<typeof setTimeout> | null = null;
    let animTimeout1: ReturnType<typeof setTimeout> | null = null;
    let animTimeout2: ReturnType<typeof setTimeout> | null = null;
    let hitTimeout1: ReturnType<typeof setTimeout> | null = null;
    let hitTimeout2: ReturnType<typeof setTimeout> | null = null;

    const turnInterval = setInterval(() => {
      const current = stateRef.current;
      const params = combatParamsRef.current;
      if (current.isFinished || current.battleResult !== 'IN_PROGRESS') return;

      const curTurn = current.turn;
      current.turn += 1;
      setTurnNumber(current.turn);

      // ===== [Step 1: 플레이어 공격 턴 (t=0ms)] =====
      setPlayerAnim('attack');
      animTimeout1 = setTimeout(() => {
        setPlayerAnim((prev) => (prev === 'attack' ? 'idle' : prev));
      }, 150);

      // 1. 공격 속도 및 다단 연타 계산 (바람 코어 공속 증폭 반영)
      let windSpeedBonus = 1.0;
      if (params.equippedCore?.type === 'WIND') {
        const windMultiChanceLvl = params.coreAbilities?.wind_multi_hit_chance || 0;
        const windMultiDmgLvl = params.coreAbilities?.wind_multi_hit_damage || 0;
        windSpeedBonus = 1.0 + (params.equippedCore.level * 0.02) + (windMultiChanceLvl * 0.03) + (windMultiDmgLvl * 0.02);
      }
      const effectiveSpeed = Number((params.playerComputed.attackSpeed * windSpeedBonus).toFixed(2));
      const floorHits = Math.max(1, Math.floor(effectiveSpeed));
      const extraChance = effectiveSpeed - floorHits;
      const attemptHits = floorHits + (Math.random() < extraChance ? 1 : 0);

      // 2. 명중/회피 계산
      let hitChance = 0.95 + (params.playerComputed.accuracy - params.enemyData.stats.dex) * 0.01;
      if (params.equippedCore?.type === 'WIND') {
        const windStats = getCoreStats('WIND', params.equippedCore.level, params.unlockedSkills);
        const windEvasionLvl = params.coreAbilities?.wind_hit_evasion || 0;
        hitChance += (windStats.effects.hitEvasionBonus || 0) + (windEvasionLvl * 0.005);
      }
      const finalHitChance = Math.max(0.1, Math.min(1.0, hitChance));
      const successfulHits = calculateSuccessfulHits(attemptHits, finalHitChance);
      const isEvaded = successfulHits === 0;

      let normalDamage = 0;
      let coreDamage = 0;

      if (!isEvaded) {
        if (params.dungeonType === 'BOX') {
          // 박스 차원 기믹: 1타당 1고정 데미지 (타수전)
          normalDamage = successfulHits * 1;
        } else {
          const baseOneHit = Math.max(1, Math.floor(params.playerComputed.attack - params.enemyData.defense));
          normalDamage = baseOneHit * successfulHits;
        }
      }

      // 3. 코어 독립 발동 계산 (일반 전투 공식과 100% 동일 동기화)
      if (params.dungeonType === 'BOX') {
        // 박스 차원에서는 코어 발동 시 바람 코어는 +2타, 기타 코어는 +1타 추가 타격으로 환산
        if (params.equippedCore) {
          coreDamage = params.equippedCore.type === 'WIND' ? 2 : 1;
        }
      } else if (params.equippedCore) {
        const coreType = params.equippedCore.type;
        const coreLvl = params.equippedCore.level;

        if (coreType === 'WATER') {
          // 💧 물의 코어: 타격 시 쉴드 충전
          const shieldOnHitLvl = params.coreAbilities?.water_shield_on_hit || 0;
          if (shieldOnHitLvl > 0) {
            const shieldRec = Math.floor(params.playerComputed.maxHealth * (shieldOnHitLvl * 0.004) * effectiveSpeed);
            current.playerShield = Math.min(params.playerComputed.maxHealth * 10, current.playerShield + shieldRec);
            setPlayerShield(current.playerShield);
          }
        } else if (coreType === 'FIRE') {
          // 🔥 불의 코어: 기본 화염 피해 + 연구(작열/STR계수/지속화상/화염폭발) * 공속 배수 스케일링
          const flatDmgLvl = params.coreAbilities?.fire_flat_damage || 0;
          const strRatioLvl = params.coreAbilities?.fire_str_ratio || 0;
          const burnDotLvl = params.coreAbilities?.fire_burn_dot || 0;
          const dmgMultLvl = params.coreAbilities?.fire_damage_multiplier || 0;
          const supernovaLvl = params.coreAbilities?.fire_supernova || 0;

          const baseFlat = (1 + (coreLvl * 0.5)) + (flatDmgLvl * 4);
          const strBonusDamage = strRatioLvl > 0 ? (params.player.stats.str * (strRatioLvl * 0.04)) : 0;
          const dmgMultiplier = (1 + (dmgMultLvl * 0.025)) * (1 + (burnDotLvl * 0.025));

          const baseCoreDmg = (baseFlat + strBonusDamage) * dmgMultiplier;
          const randomMultiplier = 0.85 + Math.random() * 0.3;
          coreDamage = Math.floor(baseCoreDmg * randomMultiplier * effectiveSpeed);

          // 초신성 폭발 (5턴 주기)
          if (supernovaLvl > 0 && curTurn % 5 === 0) {
            const supernovaMult = 1.5 + (supernovaLvl * 0.05);
            coreDamage += Math.floor(params.playerComputed.attack * supernovaMult * Math.sqrt(effectiveSpeed));
          }
        } else if (coreType === 'WIND') {
          // 🌪️ 바람의 코어: 폭풍 강타 (8턴 주기)
          const comboBurstLvl = params.coreAbilities?.wind_combo_burst || 0;
          if (comboBurstLvl > 0 && curTurn % 8 === 0) {
            const burstMult = 1.5 + (comboBurstLvl * 0.05);
            coreDamage += Math.floor(params.playerComputed.attack * burstMult * Math.sqrt(effectiveSpeed));
          }
        } else if (coreType === 'ELECTRIC') {
          // ⚡ 번개의 코어: 뇌전 스파크(기본관통+연구) * 공속 배수
          const flatDmgLvl = params.coreAbilities?.electric_flat_damage || 0;
          const baseElecDmg = ((2 + (coreLvl * 0.3)) + (flatDmgLvl * 3)) * effectiveSpeed;
          coreDamage += Math.floor(baseElecDmg);
        }
      }

      const totalPlayerDamage = normalDamage + coreDamage;

      // 팝업 생성
      const popId1 = `pop_p_${Date.now()}_${Math.random()}`;
      setDamagePopups((prev) => [
        ...prev.slice(-5),
        {
          id: popId1,
          val: isEvaded ? 0 : normalDamage,
          isEnemy: false,
          isMiss: isEvaded,
          isCombo: attemptHits > 1,
          comboHits: successfulHits,
        },
        ...(coreDamage > 0 ? [{
          id: `pop_p_core_${Date.now()}_${Math.random()}`,
          val: coreDamage,
          isEnemy: false,
          isCore: true,
          coreType: params.equippedCore?.type,
        }] : []),
      ]);

      // 로그 추가
      const logText = isEvaded
        ? `빗맞음! (MISS)`
        : `일반 ${formatNumber(normalDamage)}${coreDamage > 0 ? ` | ${getCoreKoreanName(params.equippedCore?.type)} ${formatNumber(coreDamage)}` : ''}${attemptHits > 1 ? ` ⚡${successfulHits}/${attemptHits}연타` : ''}`;

      setBattleLogs((prev) => [
        ...prev.slice(-30),
        { id: `log_${Date.now()}_${Math.random()}`, turn: curTurn, sender: 'PLAYER', text: logText },
      ]);

      if (!isEvaded || coreDamage > 0) {
        setEnemyAnim('hit');
        hitTimeout1 = setTimeout(() => {
          setEnemyAnim((prev) => (prev === 'hit' ? 'idle' : prev));
        }, 180);
      }

      // 적 체력 및 쉴드 차감
      let remainingDmg = totalPlayerDamage;
      if (current.enemyShield > 0) {
        if (current.enemyShield >= remainingDmg) {
          current.enemyShield -= remainingDmg;
          remainingDmg = 0;
        } else {
          remainingDmg -= current.enemyShield;
          current.enemyShield = 0;
        }
      }
      current.enemyHp = Math.max(0, current.enemyHp - remainingDmg);
      setEnemyShield(current.enemyShield);
      setEnemyHp(current.enemyHp);

      // 적 사망 판정 (승리!) -> 연출 후 딜레이 팝업
      if (current.enemyHp <= 0) {
        current.isFinished = true;
        current.battleResult = 'VICTORY';
        setEnemyAnim('defeat');
        setFinishBanner('🎉 VICTORY! 차원 돌파 완료');

        const elapsedSec = (Date.now() - current.startTime) / 1000;
        const rewards = params.clearDungeonFloor(params.dungeonType, params.floor, elapsedSec);
        setRewardResult(rewards);
        setBattleResult('VICTORY');

        setTimeout(() => {
          setShowResultModal(true);
        }, 1200);
        return;
      }

      // ===== [Step 2: 적의 반격 턴 (일반 스테이지와 동일하게 500ms 후 실행)] =====
      enemyTimeout = setTimeout(() => {
        if (current.isFinished || current.battleResult !== 'IN_PROGRESS' || current.enemyHp <= 0) return;

        setEnemyAnim('attack');
        animTimeout2 = setTimeout(() => {
          setEnemyAnim((prev) => (prev === 'attack' ? 'idle' : prev));
        }, 150);

        const enemyHitChance = Math.max(0.1, Math.min(1.0, 0.95 + (params.enemyData.stats.dex - params.playerComputed.evasion) * 0.01));
        const isEnemyMiss = Math.random() > enemyHitChance;

        if (isEnemyMiss) {
          const missPopId = `pop_e_miss_${Date.now()}_${Math.random()}`;
          setDamagePopups((prev) => [
            ...prev.slice(-5),
            { id: missPopId, val: 0, isEnemy: true, isMiss: true },
          ]);
          setBattleLogs((prev) => [
            ...prev.slice(-30),
            { id: `log_e_${Date.now()}_${Math.random()}`, turn: curTurn, sender: 'ENEMY', text: '플레이어가 공격을 회피했습니다!' },
          ]);
        } else {
          const enemyDmg = Math.max(1, Math.floor(params.enemyData.attack - params.playerComputed.defense));
          setPlayerAnim('hit');
          hitTimeout2 = setTimeout(() => {
            setPlayerAnim((prev) => (prev === 'hit' ? 'idle' : prev));
          }, 180);

          const popEnemyId = `pop_e_${Date.now()}_${Math.random()}`;
          setDamagePopups((prev) => [
            ...prev.slice(-5),
            { id: popEnemyId, val: enemyDmg, isEnemy: true },
          ]);

          setBattleLogs((prev) => [
            ...prev.slice(-30),
            { id: `log_e_${Date.now()}_${Math.random()}`, turn: curTurn, sender: 'ENEMY', text: `일반 타격 -${formatNumber(enemyDmg)}` },
          ]);

          let remEnemyDmg = enemyDmg;
          if (current.playerShield > 0) {
            if (current.playerShield >= remEnemyDmg) {
              current.playerShield -= remEnemyDmg;
              remEnemyDmg = 0;
            } else {
              remEnemyDmg -= current.playerShield;
              current.playerShield = 0;
            }
          }
          current.playerHp = Math.max(0, current.playerHp - remEnemyDmg);

          setPlayerShield(current.playerShield);
          setPlayerHp(current.playerHp);

          // 플레이어 사망 판정 (패배) -> 연출 후 딜레이 팝업
          if (current.playerHp <= 0) {
            current.isFinished = true;
            current.battleResult = 'DEFEAT';
            setPlayerAnim('defeat');
            setDefeatReason('HP_ZERO');
            setBattleResult('DEFEAT');
            setFinishBanner('💀 DEFEAT! 체력 소진');

            setTimeout(() => {
              setShowResultModal(true);
            }, 1200);
          }
        }
      }, halfInterval);
    }, intervalMs);

    return () => {
      clearInterval(turnInterval);
      if (enemyTimeout) clearTimeout(enemyTimeout);
      if (animTimeout1) clearTimeout(animTimeout1);
      if (animTimeout2) clearTimeout(animTimeout2);
      if (hitTimeout1) clearTimeout(hitTimeout1);
      if (hitTimeout2) clearTimeout(hitTimeout2);
    };
  }, []);

  const playerTotalStats = player.stats.str + player.stats.dex + player.stats.con;
  const enemyTotalStats = enemyData.stats.str + enemyData.stats.dex + enemyData.stats.con;
  const playerCoreBorderClass = getCoreBorderClass(equippedCore?.type);

  const playerVariants: Variants = {
    idle: { x: 0, scale: 1, rotate: 0 },
    attack: {
      x: [0, 45, 0],
      scale: [1, 1.15, 1],
      transition: { duration: 0.15, ease: 'easeOut' },
    },
    hit: {
      x: [0, -16, 8, -4, 0],
      rotate: [0, -8, 6, -3, 0],
      transition: { duration: 0.2 },
    },
    defeat: {
      scale: [1, 0.8, 0],
      rotate: [0, -20, -45],
      opacity: [1, 0.6, 0],
      transition: { duration: 0.6, ease: 'easeInOut' },
    },
  };

  const enemyVariants: Variants = {
    idle: { x: 0, scale: 1, rotate: 0 },
    attack: {
      x: [0, -45, 0],
      scale: [1, 1.15, 1],
      transition: { duration: 0.15, ease: 'easeOut' },
    },
    hit: {
      x: [0, 16, -8, 4, 0],
      rotate: [0, 8, -6, 3, 0],
      transition: { duration: 0.2 },
    },
    defeat: {
      scale: [1, 0.8, 0],
      rotate: [0, 20, 45],
      opacity: [1, 0.6, 0],
      transition: { duration: 0.6, ease: 'easeInOut' },
    },
  };

  return (
    <div className="max-w-md mx-auto p-4 rounded-none border-4 border-neutral-900 bg-stone-200 w-full flex flex-col gap-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] select-none flex-grow font-mono text-black">
      {/* 1. 상단 HUD (일반 스테이지와 100% 동일한 레트로 카드 스타일) */}
      <div className="bg-stone-100 px-3 py-2 rounded-none border-4 border-neutral-900 flex justify-between items-center w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-xs">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <div>
            <div className="font-black text-stone-900 tracking-wider flex items-center gap-1.5">
              <span>{config.name}</span>
              <span className="text-amber-600 font-bold">[{floor}단계]</span>
            </div>
            <div className="text-[10px] text-neutral-500 font-bold">
              {config.rewardName} 특화 차원 • Lv.{player.level}
            </div>
          </div>
        </div>

        {/* 퀵 포기 버튼 */}
        <button
          type="button"
          onClick={onExit}
          className="bg-stone-200 hover:bg-stone-300 border border-black px-2.5 py-1 flex items-center justify-center text-[10px] font-black text-stone-800 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
        >
          포기 / 나가기
        </button>
      </div>

      {/* 2. 메인 전투 아레나 (일반 스테이지와 100% 동일한 배경 그리드 및 레이아웃) */}
      <div
        className="px-4 pt-3 pb-4 flex flex-col justify-between border-4 border-neutral-900 relative overflow-hidden transition-all duration-300 flex-grow min-h-[260px] bg-stone-100 shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.1)]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #e7e5e4 2px, transparent 2px), linear-gradient(to bottom, #e7e5e4 2px, transparent 2px)',
          backgroundSize: '16px 16px',
        }}
      >
        {/* [전투 아레나 상단 HUD] 좌(플레이어) / 우(에너미) 체력바 & 중앙 잔여시간 워터마크 */}
        <div className="w-full relative z-30 font-mono pb-1.5 border-b border-neutral-900/20">
          {/* 중앙 흐린 워터마크 타이머 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-20 flex flex-col items-center justify-center select-none">
            <span
              className={`font-mono text-base md:text-lg font-black tracking-tighter leading-none transition-colors duration-300 ${
                remainingSeconds <= 5 ? 'text-red-600 animate-ping' : remainingSeconds <= 10 ? 'text-rose-500 animate-pulse' : 'text-neutral-950/30'
              }`}
            >
              {remainingSeconds}
            </span>
            <div className="bg-amber-400 text-black text-[8px] font-black px-1 py-0.2 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,0.8)] tracking-tight mt-0.5 whitespace-nowrap">
              TIME ATTACK
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full relative z-10">
            {/* 플레이어 체력 */}
            <div className="flex flex-col items-start select-none w-full min-w-0">
              <div className="text-[11px] font-black flex items-center gap-1 leading-none mb-1 truncate w-full">
                <span className="text-emerald-700">PLAYER</span>
                {equippedCore && (
                  <span className="px-1 py-0.2 text-[8px] font-bold border border-amber-600 bg-amber-100 text-amber-900 leading-none">
                    {getCoreKoreanName(equippedCore.type)}
                  </span>
                )}
              </div>
              <RetroHpBar current={playerHp} max={playerComputed.maxHealth} shield={playerShield} />
              <div className="flex items-center justify-between w-full mt-1 leading-none gap-1 whitespace-nowrap">
                <span className="text-[10px] font-black text-stone-700">
                  {formatNumber(Math.max(0, playerHp))}<span className="text-stone-400 mx-0.5">/</span>{formatNumber(playerComputed.maxHealth)}
                </span>
                {playerShield > 0 && (
                  <span className="text-cyan-600 text-[10px] font-black">
                    +{formatNumber(playerShield)}
                  </span>
                )}
              </div>
            </div>

            {/* 에너미 체력 */}
            <div className="flex flex-col items-end select-none w-full min-w-0">
              <div className="text-[11px] font-black leading-none mb-1 truncate w-full text-right flex justify-end items-center gap-1">
                <span className="text-rose-700">{enemyData.name}</span>
              </div>
              <RetroHpBar current={enemyHp} max={enemyData.maxHealth} shield={enemyShield} isEnemy />
              <div className="flex items-center justify-between w-full mt-1 leading-none gap-1 whitespace-nowrap">
                {enemyShield > 0 ? (
                  <span className="text-cyan-600 text-[10px] font-black">
                    +{formatNumber(enemyShield)}
                  </span>
                ) : <span />}
                <span className="text-[10px] font-black text-stone-700 ml-auto">
                  {formatNumber(Math.max(0, enemyHp))}<span className="text-stone-400 mx-0.5">/</span>{formatNumber(enemyData.maxHealth)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* [전투 아레나 중앙] 캐릭터 캔버스 및 데미지 팝업 (일반 스테이지와 100% 동일한 비주얼) */}
        <div className="flex justify-center items-end gap-16 my-auto pt-6 pb-2 z-10 relative">
          {/* 플레이어 캐릭터 */}
          <div className="relative z-20">
            <motion.div
              variants={playerVariants}
              animate={playerAnim}
              className={`flex items-center justify-center border-4 ${playerCoreBorderClass} z-20 overflow-hidden bg-stone-300`}
              style={getDynamicBoxStyle(
                {
                  str: playerComputed.finalStr || player.stats.str,
                  dex: playerComputed.finalDex || player.stats.dex,
                  con: playerComputed.finalCon || player.stats.con,
                },
                enemyTotalStats,
                80
              )}
            >
              <div className="flex flex-col items-center justify-center w-full h-full p-1 text-neutral-950 font-mono select-none">
                <div className="flex justify-between w-full px-2 mb-1.5">
                  {playerAnim === 'hit' ? (
                    <>
                      <span className="text-xs font-black leading-none">&gt;</span>
                      <span className="text-xs font-black leading-none">&lt;</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 bg-neutral-950 block" />
                      <span className="w-2 h-2 bg-neutral-950 block" />
                    </>
                  )}
                </div>
                <div className={`h-1 bg-neutral-950 transition-all duration-100 ${playerAnim === 'attack' ? 'w-4 bg-red-950' : 'w-2.5'}`} />
              </div>
            </motion.div>

            {/* 플레이어 쪽 피격 팝업 */}
            <AnimatePresence>
              {damagePopups.filter((p) => p.isEnemy).map((popup) => (
                <motion.div
                  key={popup.id}
                  initial={{ opacity: 0, y: 0, scale: 0.5, x: 0 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    y: [-2, -18, -30],
                    x: [0, -20, -30],
                    scale: [0.6, 1.25, 1.0],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.75, ease: 'easeOut' }}
                  className={`absolute left-1/2 -translate-x-1/2 -top-2 font-mono whitespace-nowrap drop-shadow-[0_1px_1px_rgba(255,255,255,1)] pointer-events-none z-50 ${
                    popup.isMiss ? 'text-stone-500 italic font-black text-xs' : 'text-rose-600 font-black text-base'
                  }`}
                >
                  {popup.isMiss ? 'MISS' : `-${formatNumber(popup.val)}`}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* 적 캐릭터 */}
          <div className="relative z-20">
            <motion.div
              variants={enemyVariants}
              animate={enemyAnim}
              className="flex items-center justify-center border-4 border-neutral-950 bg-stone-400 overflow-hidden"
              style={getDynamicBoxStyle(enemyData.stats, playerTotalStats, 80)}
            >
              <div className="flex flex-col items-center justify-center w-full h-full p-1 text-neutral-900 font-mono select-none">
                <div className="flex justify-between w-full px-2 mb-1 text-xs font-black leading-none">
                  {enemyAnim === 'hit' ? (
                    <>
                      <span className="text-red-900 font-black">✖</span>
                      <span className="text-red-900 font-black">✖</span>
                    </>
                  ) : (
                    <>
                      <span>■</span>
                      <span>■</span>
                    </>
                  )}
                </div>
                <div className="w-5 h-1 bg-neutral-900 mt-1" />
              </div>
            </motion.div>

            {/* 적 쪽 피격 팝업 */}
            <AnimatePresence>
              {damagePopups.filter((p) => !p.isEnemy).map((popup) => {
                let colorClass = 'text-amber-600 font-black text-base';
                let text = `-${formatNumber(popup.val)}`;

                if (popup.isMiss) {
                  colorClass = 'text-stone-500 italic font-black text-xs';
                  text = 'MISS';
                } else if (popup.isCombo) {
                  colorClass = 'text-amber-600 font-black text-base';
                  text = `⚡${popup.comboHits || 2}연타! -${formatNumber(popup.val)}`;
                } else if (popup.isCore) {
                  if (popup.coreType === 'FIRE') {
                    colorClass = 'text-red-600 font-black text-lg';
                    text = `🔥 -${formatNumber(popup.val)}`;
                  } else if (popup.coreType === 'WIND') {
                    colorClass = 'text-emerald-600 font-black text-lg';
                    text = `🍃 -${formatNumber(popup.val)}`;
                  } else if (popup.coreType === 'ELECTRIC') {
                    colorClass = 'text-amber-500 font-black text-lg';
                    text = `⚡ -${formatNumber(popup.val)}`;
                  } else {
                    colorClass = 'text-blue-600 font-black text-lg';
                    text = `💧 -${formatNumber(popup.val)}`;
                  }
                }

                return (
                  <motion.div
                    key={popup.id}
                    initial={{ opacity: 0, y: 0, scale: 0.5, x: 0 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      y: [-2, -18, -30],
                      x: [0, 25, 35],
                      scale: [0.6, 1.3, 1.0],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.75, ease: 'easeOut' }}
                    className={`absolute left-1/2 -translate-x-1/2 -top-2 font-mono whitespace-nowrap drop-shadow-[0_1px_1px_rgba(255,255,255,1)] pointer-events-none z-50 ${colorClass}`}
                  >
                    {text}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* 전투 결과 피니시 아레나 배너 연출 */}
        <AnimatePresence>
          {finishBanner && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: -10 }}
              animate={{ scale: 1.1, opacity: 1, y: 0 }}
              exit={{ scale: 1, opacity: 0 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-neutral-950/95 text-amber-300 px-4 py-2 border-4 border-amber-400 font-mono font-black text-xs md:text-sm shadow-[0_0_20px_rgba(251,191,36,0.9)] pointer-events-none whitespace-nowrap text-center"
            >
              <div>{finishBanner}</div>
              <div className="text-[9px] text-amber-200/80 font-normal mt-0.5">잠시 후 결과창으로 이동합니다...</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 하단 기믹 가이드 텍스트 */}
        <div className="bg-stone-200/80 p-1.5 border border-stone-400 text-[10px] font-bold text-stone-700 text-center">
          💡 {config.gimmickText}
        </div>
      </div>

      {/* 3. 전투 로그 레인 (일반 스테이지 표준 블랙 터미널) */}
      <div className="bg-neutral-950 p-2 rounded-none border-4 border-neutral-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between pb-1 mb-1 border-b border-neutral-800 text-[10px] text-neutral-400">
          <span className="font-black">던전 실시간 전투 로그</span>
          <span className="text-[9px] text-amber-400">턴 {turnNumber}</span>
        </div>
        <div
          ref={logContainerRef}
          className="overflow-y-auto h-20 text-[10px] font-mono text-neutral-200 text-left space-y-0.5"
        >
          {battleLogs.map((log) => (
            <div key={log.id} className="leading-tight">
              <span className="text-neutral-500 mr-1">[T{log.turn}]</span>
              {log.sender === 'PLAYER' ? (
                <span className="text-emerald-400 font-bold mr-1">[나]</span>
              ) : (
                <span className="text-rose-400 font-bold mr-1">[적]</span>
              )}
              <span className={log.sender === 'PLAYER' ? 'text-amber-200' : 'text-rose-200'}>
                {log.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. 상세 스탯 보기 아코디언 */}
      <div className="flex flex-col bg-neutral-950 border-4 border-neutral-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <button
          type="button"
          onClick={() => setShowStats(!showStats)}
          className="w-full py-1 bg-neutral-900 hover:bg-neutral-800 text-[10px] font-bold text-neutral-400 hover:text-neutral-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
        >
          {showStats ? '던전 수호자 스탯 접기 ▲' : '던전 수호자 스탯 비교 ▼'}
        </button>

        {showStats && (
          <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono bg-neutral-900">
            {[
              { label: '공격력', pValue: formatNumber(playerComputed.attack), eValue: formatNumber(enemyData.attack) },
              { label: '방어력', pValue: formatNumber(playerComputed.defense), eValue: formatNumber(enemyData.defense) },
              { label: '최대체력', pValue: formatNumber(playerComputed.maxHealth), eValue: formatNumber(enemyData.maxHealth) },
              { label: '공격속도', pValue: `${playerComputed.attackSpeed.toFixed(1)}/s`, eValue: '1.0/s' },
              { label: '명중력', pValue: formatNumber(playerComputed.accuracy), eValue: formatNumber(enemyData.stats.dex) },
              { label: '회피력', pValue: formatNumber(playerComputed.evasion), eValue: formatNumber(enemyData.stats.dex) },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center py-0.5 border-b border-neutral-950/50">
                <span className="font-bold text-green-400 w-14 text-left">{item.pValue}</span>
                <span className="text-neutral-500 font-sans text-center flex-1 text-[9px]">{item.label}</span>
                <span className="font-bold text-red-400 w-14 text-right">{item.eValue}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. 승리 / 패배 결과 모달 오버레이 (반투명 & 딜레이 팝업 & 콤팩트 디자인) */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1.5px] flex items-center justify-center p-3">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-xs sm:max-w-sm bg-stone-200 border-4 border-black p-3.5 flex flex-col gap-2.5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black font-mono"
          >
            {battleResult === 'VICTORY' ? (
              <>
                <div className="bg-amber-300 border-3 border-black py-1.5 text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <h2 className="text-base font-black tracking-wider text-black">
                    🎉 차원 돌파 성공!
                  </h2>
                  <div className="text-[11px] font-bold text-amber-950">
                    {30 - remainingSeconds <= 10 ? '⭐⭐⭐ 3별 클리어 (10s 이내)' : 30 - remainingSeconds <= 20 ? '⭐⭐ 2별 클리어 (20s 이내)' : '⭐ 1별 클리어'}
                  </div>
                </div>

                {/* 획득 보상 목록 */}
                <div className="bg-stone-100 p-2.5 border-2 border-black flex flex-col gap-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]">
                  <div className="text-[11px] font-black text-neutral-700 mb-0.5">🎁 획득한 보상 목록:</div>
                  {rewardResult?.gold ? (
                    <div className="flex justify-between text-[11px] font-bold text-yellow-700">
                      <span>🪙 골드</span>
                      <span>+{formatNumber(rewardResult.gold)} G</span>
                    </div>
                  ) : null}
                  {rewardResult?.exp ? (
                    <div className="flex justify-between text-[11px] font-bold text-blue-700">
                      <span>🧪 경험치</span>
                      <span>+{formatNumber(rewardResult.exp)} EXP</span>
                    </div>
                  ) : null}
                  {rewardResult?.coreFragments ? (
                    <div className="flex justify-between text-[11px] font-bold text-purple-700">
                      <span>💎 코어 조각</span>
                      <span>+{rewardResult.coreFragments}개</span>
                    </div>
                  ) : null}
                  {rewardResult?.boxFragments ? (
                    <div className="flex justify-between text-[11px] font-bold text-emerald-700">
                      <span>📦 박스 조각</span>
                      <span>+{rewardResult.boxFragments}개</span>
                    </div>
                  ) : null}
                  {rewardResult?.rp ? (
                    <div className="flex justify-between text-[11px] font-bold text-rose-700">
                      <span>🌟 환생 포인트</span>
                      <span>+{rewardResult.rp} RP</span>
                    </div>
                  ) : null}
                  {rewardResult?.isFirstClear && (
                    <div className="mt-1 text-center text-[10px] font-black text-amber-700 bg-amber-100 py-0.5 border border-amber-400">
                      ✨ 최초 클리어 보너스 지급 완료!
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onExit}
                  className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-black text-xs border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer uppercase"
                >
                  확인하고 돌아가기
                </button>
              </>
            ) : (
              <>
                <div className="bg-red-600 text-white border-3 border-black py-1.5 text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <h2 className="text-base font-black tracking-wider">
                    💀 차원 공략 실패
                  </h2>
                  <div className="text-[11px] font-bold text-red-200">
                    {defeatReason === 'TIMEOUT' ? '⏰ 30초 시간 초과' : '💔 체력 소진'}
                  </div>
                </div>

                <div className="bg-stone-100 p-2.5 border-2 border-black text-[11px] font-bold text-stone-700 text-center leading-relaxed">
                  스탯을 더 강화하거나 다른 코어 속성을 장착하여 재도전해보세요!
                </div>

                <button
                  type="button"
                  onClick={onExit}
                  className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-black text-xs border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer uppercase"
                >
                  던전 로비로 복귀
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

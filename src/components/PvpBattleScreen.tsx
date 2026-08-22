// src/components/PvpBattleScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useGameStore, getComputedStats, calculateSuccessfulHits, getCoreStats } from '../store/gameStore';
import type { PvpOpponent } from '../types/pvp';
import type { CoreType, RebirthUpgrades } from '../types/game';
import { formatNumber } from '../utils/format';

interface DamagePopupItem {
  id: string;
  val: number;
  isEnemy: boolean;
  isMiss?: boolean;
  isCombo?: boolean;
  comboHits?: number;
  isCore?: boolean;
  coreType?: CoreType;
}

interface PvpLogItem {
  id: string;
  turn: number;
  text: string;
  type: 'player' | 'enemy' | 'system' | 'special';
}

// 8비트 아케이드 전용 클래식 프리셋 색상 매핑
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

  let hexColor = '#64748B'; // 밸런스형: 티타늄 슬레이트 실버

  if (rRatio >= 0.70) {
    hexColor = '#E11D48'; // 순수 STR 100% 극몰빵: 버서커 크림슨 레드
  } else if (gRatio >= 0.70) {
    hexColor = '#10B981'; // 순수 DEX 100% 극몰빵: 스피더 에메랄드 그린
  } else if (bRatio >= 0.70) {
    hexColor = '#2563EB'; // 순수 CON 100% 극몰빵: 가디언 코발트 블루
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
    default: return '무속성';
  }
};

// 레트로 아케이드 픽셀 HP 바 & 쉴드 덧띠 오버레이 컴포넌트
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

interface PvpBattleScreenProps {
  opponent: PvpOpponent;
  onExit: () => void;
}

export const PvpBattleScreen: React.FC<PvpBattleScreenProps> = ({ opponent, onExit }) => {
  const {
    playerName,
    pvpSnapshot,
    pvpRating,
    recordPvpResult,
    player,
    equippedCore,
    coreAbilities,
    rebirthUpgrades,
    unlockedSkills,
  } = useGameStore();

  const [turn, setTurn] = useState<number>(1);
  const [playerAnim, setPlayerAnim] = useState<'idle' | 'attack' | 'hit' | 'defeat'>('idle');
  const [oppAnim, setOppAnim] = useState<'idle' | 'attack' | 'hit' | 'defeat'>('idle');
  const [damagePopups, setDamagePopups] = useState<DamagePopupItem[]>([]);
  const [battleResult, setBattleResult] = useState<{
    finished: boolean;
    isWin: boolean;
    ratingDelta: number;
  } | null>(null);

  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const battleTimerRef = useRef<number | null>(null);

  // 1. 플레이어 대전 덱 스펙 계산
  const myDeck = React.useMemo(() => pvpSnapshot || {
    playerName: playerName || '박스슬레이어',
    level: player.level,
    stats: player.stats,
    equippedCore,
    unlockedSkills,
    rebirthUpgrades,
    combatPower: 0,
    pvpScore: pvpRating,
  }, [pvpSnapshot, playerName, player.level, player.stats, equippedCore, unlockedSkills, rebirthUpgrades, pvpRating]);

  const myComputed = getComputedStats(
    myDeck.stats,
    myDeck.unlockedSkills,
    {},
    myDeck.rebirthUpgrades as RebirthUpgrades
  );

  const oppComputed = getComputedStats(
    opponent.stats,
    opponent.unlockedSkills,
    {},
    opponent.rebirthUpgrades as RebirthUpgrades
  );

  // 2. 공격 속도 계산 (바람 코어 공속 증폭 반영)
  let pWindSpeedBonus = 1.0;
  if (myDeck.equippedCore?.type === 'WIND') {
    const windMultiChanceLvl = coreAbilities?.wind_multi_hit_chance || 0;
    const windMultiDmgLvl = coreAbilities?.wind_multi_hit_damage || 0;
    pWindSpeedBonus = 1.0 + (myDeck.equippedCore.level * 0.02) + (windMultiChanceLvl * 0.03) + (windMultiDmgLvl * 0.02);
  }
  const playerEffectiveSpeed = Number((myComputed.attackSpeed * pWindSpeedBonus).toFixed(2));

  let oppWindSpeedBonus = 1.0;
  if (opponent.equippedCore?.type === 'WIND') {
    oppWindSpeedBonus = 1.0 + (opponent.equippedCore.level * 0.02);
  }
  const oppEffectiveSpeed = Number((oppComputed.attackSpeed * oppWindSpeedBonus).toFixed(2));

  // 3. 선공(Initiative) 판정: PvP에서는 "공격 속도(Attack Speed)"가 빠른 캐릭터가 선공!
  const initiative = React.useMemo(() => {
    if (playerEffectiveSpeed > oppEffectiveSpeed) {
      return {
        isPlayerFirst: true,
        reason: `공속 우세 (${playerEffectiveSpeed.toFixed(2)}/s > ${oppEffectiveSpeed.toFixed(2)}/s)`,
      };
    } else if (oppEffectiveSpeed > playerEffectiveSpeed) {
      return {
        isPlayerFirst: false,
        reason: `상대 공속 우세 (${oppEffectiveSpeed.toFixed(2)}/s > ${playerEffectiveSpeed.toFixed(2)}/s)`,
      };
    }
    // 공속 동률 시 도전자(플레이어) 우선권
    return {
      isPlayerFirst: true,
      reason: `공속 동률 (${playerEffectiveSpeed.toFixed(2)}/s) - 도전자 우선`,
    };
  }, [playerEffectiveSpeed, oppEffectiveSpeed]);

  const [battleLogs, setBattleLogs] = useState<PvpLogItem[]>([
    {
      id: `pvp_init_1`,
      turn: 1,
      text: `⚔️ [PVP 아레나] ${myDeck.playerName}(Lv.${myDeck.level}) VS ${opponent.playerName}(Lv.${opponent.level}) 결투 개시!`,
      type: 'system',
    },
    {
      id: `pvp_init_2`,
      turn: 1,
      text: `⚡ [선공 판정] ${initiative.isPlayerFirst ? myDeck.playerName : opponent.playerName} 선공 (${initiative.reason})`,
      type: 'special',
    },
  ]);

  // 4. 초기 체력 및 쉴드 (물의 코어 장착 시 초기 쉴드)
  const initialPlayerShield = myDeck.equippedCore?.type === 'WATER'
    ? Math.floor(myComputed.maxHealth * (0.15 + (myDeck.equippedCore.level * 0.02)))
    : 0;

  const initialOppShield = opponent.equippedCore?.type === 'WATER'
    ? Math.floor(oppComputed.maxHealth * (0.15 + (opponent.equippedCore.level * 0.02)))
    : 0;

  const [playerHp, setPlayerHp] = useState<number>(Math.floor(myComputed.maxHealth));
  const [playerShield, setPlayerShield] = useState<number>(initialPlayerShield);
  const [oppHp, setOppHp] = useState<number>(Math.floor(oppComputed.maxHealth));
  const [oppShield, setOppShield] = useState<number>(initialOppShield);

  // 전투 Ref 상태 (Interval 내 클로저 상태 보존)
  const stateRef = useRef({
    playerHp: Math.floor(myComputed.maxHealth),
    playerShield: initialPlayerShield,
    oppHp: Math.floor(oppComputed.maxHealth),
    oppShield: initialOppShield,
    turn: 1,
    isFinished: false,
  });

  // 로그 자동 스크롤
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [battleLogs]);

  // 승리 처리
  const handlePlayerWin = React.useCallback(() => {
    if (stateRef.current.isFinished) return;
    stateRef.current.isFinished = true;
    if (battleTimerRef.current) clearInterval(battleTimerRef.current);

    setOppAnim('defeat');
    const myRating = pvpRating || 1000;
    const oppRating = opponent.pvpScore || 1000;
    const ratingDelta = Math.max(15, Math.min(45, Math.floor(25 + (oppRating - myRating) * 0.05)));

    recordPvpResult(true, ratingDelta, opponent.playerName, opponent.level);
    setBattleResult({ finished: true, isWin: true, ratingDelta });
  }, [pvpRating, opponent, recordPvpResult]);

  // 패배 처리
  const handlePlayerLoss = React.useCallback(() => {
    if (stateRef.current.isFinished) return;
    stateRef.current.isFinished = true;
    if (battleTimerRef.current) clearInterval(battleTimerRef.current);

    setPlayerAnim('defeat');
    const myRating = pvpRating || 1000;
    const oppRating = opponent.pvpScore || 1000;
    const ratingDelta = -Math.max(8, Math.min(25, Math.floor(15 + (myRating - oppRating) * 0.03)));

    recordPvpResult(false, ratingDelta, opponent.playerName, opponent.level);
    setBattleResult({ finished: true, isWin: false, ratingDelta });
  }, [pvpRating, opponent, recordPvpResult]);

  // 최신 PvP 스펙 파라미터를 Ref로 유지 (리렌더링 시 인터벌이 초기화되는 문제 완전 방지)
  const pvpParamsRef = useRef({
    myDeck,
    myComputed,
    opponent,
    oppComputed,
    playerEffectiveSpeed,
    oppEffectiveSpeed,
    initiative,
    coreAbilities,
    unlockedSkills,
    handlePlayerWin,
    handlePlayerLoss,
  });

  useEffect(() => {
    pvpParamsRef.current = {
      myDeck,
      myComputed,
      opponent,
      oppComputed,
      playerEffectiveSpeed,
      oppEffectiveSpeed,
      initiative,
      coreAbilities,
      unlockedSkills,
      handlePlayerWin,
      handlePlayerLoss,
    };
  }, [
    myDeck,
    myComputed,
    opponent,
    oppComputed,
    playerEffectiveSpeed,
    oppEffectiveSpeed,
    initiative,
    coreAbilities,
    unlockedSkills,
    handlePlayerWin,
    handlePlayerLoss,
  ]);

  // 실시간 턴제 1:1 대전 시뮬레이션 (일반 스테이지와 100% 동일한 1000ms 주기 및 500ms 반격)
  useEffect(() => {
    const intervalMs = 1000;
    const halfInterval = 500;

    let subTurnTimeout: ReturnType<typeof setTimeout> | null = null;
    let animTimeout1: ReturnType<typeof setTimeout> | null = null;
    let animTimeout2: ReturnType<typeof setTimeout> | null = null;
    let hitTimeout1: ReturnType<typeof setTimeout> | null = null;
    let hitTimeout2: ReturnType<typeof setTimeout> | null = null;

    // [플레이어 공격 실행]
    const executePlayerAttack = (curTurn: number, onDeath: () => void) => {
      const params = pvpParamsRef.current;
      setPlayerAnim('attack');
      animTimeout1 = setTimeout(() => setPlayerAnim((prev) => (prev === 'attack' ? 'idle' : prev)), 150);

      // 연격 타수 산출
      const pFloorHits = Math.max(1, Math.floor(params.playerEffectiveSpeed));
      const pExtraChance = params.playerEffectiveSpeed - pFloorHits;
      const pAttemptHits = pFloorHits + (Math.random() < pExtraChance ? 1 : 0);

      // 명중/회피 계산
      let hitChance = 0.95 + (params.myComputed.accuracy - params.oppComputed.evasion) * 0.01;
      if (params.myDeck.equippedCore?.type === 'WIND') {
        const windStats = getCoreStats('WIND', params.myDeck.equippedCore.level, params.unlockedSkills);
        const windEvasionLvl = params.coreAbilities?.wind_hit_evasion || 0;
        hitChance += (windStats.effects.hitEvasionBonus || 0) + (windEvasionLvl * 0.005);
      }
      const finalHitChance = Math.max(0.1, Math.min(1.0, hitChance));
      const successfulHits = calculateSuccessfulHits(pAttemptHits, finalHitChance);
      const isPEvaded = successfulHits === 0;

      let normalDamage = 0;
      if (!isPEvaded) {
        const baseOneHit = Math.max(1, Math.floor(params.myComputed.attack - params.oppComputed.defense));
        normalDamage = baseOneHit * successfulHits;
      }

      // 코어 발동 피해 (일반 전투와 100% 동일한 코어 연구 공식)
      let coreDamage = 0;
      let coreKoreanName = '';
      if (params.myDeck.equippedCore) {
        const coreType = params.myDeck.equippedCore.type;
        const coreLvl = params.myDeck.equippedCore.level;

        if (coreType === 'WATER') {
          const shieldOnHitLvl = params.coreAbilities?.water_shield_on_hit || 0;
          if (shieldOnHitLvl > 0) {
            const shieldRec = Math.floor(params.myComputed.maxHealth * (shieldOnHitLvl * 0.004) * params.playerEffectiveSpeed);
            stateRef.current.playerShield = Math.min(params.myComputed.maxHealth * 10, stateRef.current.playerShield + shieldRec);
            setPlayerShield(stateRef.current.playerShield);
          }
        } else if (coreType === 'FIRE') {
          coreKoreanName = '🔥화염';
          const flatDmgLvl = params.coreAbilities?.fire_flat_damage || 0;
          const strRatioLvl = params.coreAbilities?.fire_str_ratio || 0;
          const burnDotLvl = params.coreAbilities?.fire_burn_dot || 0;
          const dmgMultLvl = params.coreAbilities?.fire_damage_multiplier || 0;
          const supernovaLvl = params.coreAbilities?.fire_supernova || 0;

          const baseFlat = (1 + (coreLvl * 0.5)) + (flatDmgLvl * 4);
          const strBonusDamage = strRatioLvl > 0 ? (params.myDeck.stats.str * (strRatioLvl * 0.04)) : 0;
          const dmgMultiplier = (1 + (dmgMultLvl * 0.025)) * (1 + (burnDotLvl * 0.025));

          const baseCoreDmg = (baseFlat + strBonusDamage) * dmgMultiplier;
          const randomMultiplier = 0.85 + Math.random() * 0.3;
          coreDamage = Math.floor(baseCoreDmg * randomMultiplier * params.playerEffectiveSpeed);

          if (supernovaLvl > 0 && curTurn % 5 === 0) {
            const supernovaMult = 1.5 + (supernovaLvl * 0.05);
            coreDamage += Math.floor(params.myComputed.attack * supernovaMult * Math.sqrt(params.playerEffectiveSpeed));
          }
        } else if (coreType === 'WIND') {
          coreKoreanName = '🌪️돌풍';
          const comboBurstLvl = params.coreAbilities?.wind_combo_burst || 0;
          if (comboBurstLvl > 0 && curTurn % 8 === 0) {
            const burstMult = 1.5 + (comboBurstLvl * 0.05);
            coreDamage += Math.floor(params.myComputed.attack * burstMult * Math.sqrt(params.playerEffectiveSpeed));
          }
        } else if (coreType === 'ELECTRIC') {
          coreKoreanName = '⚡뇌전';
          const flatDmgLvl = params.coreAbilities?.electric_flat_damage || 0;
          const baseElecDmg = ((2 + (coreLvl * 0.3)) + (flatDmgLvl * 3)) * params.playerEffectiveSpeed;
          coreDamage += Math.floor(baseElecDmg);
        }
      }

      const totalPlayerDamage = normalDamage + coreDamage;

      // 상대 피격 애니메이션
      if (!isPEvaded || coreDamage > 0) {
        setOppAnim('hit');
        hitTimeout1 = setTimeout(() => setOppAnim((prev) => (prev === 'hit' ? 'idle' : prev)), 180);
      }

      // 상대 쉴드 및 체력 삭감
      let remainingDmg = totalPlayerDamage;
      if (stateRef.current.oppShield > 0) {
        if (stateRef.current.oppShield >= remainingDmg) {
          stateRef.current.oppShield -= remainingDmg;
          remainingDmg = 0;
        } else {
          remainingDmg -= stateRef.current.oppShield;
          stateRef.current.oppShield = 0;
        }
        setOppShield(stateRef.current.oppShield);
      }

      stateRef.current.oppHp = Math.max(0, stateRef.current.oppHp - remainingDmg);
      setOppHp(stateRef.current.oppHp);

      // 데미지 팝업
      const popupId = `pop_p_${Date.now()}_${Math.random()}`;
      setDamagePopups((prev) => [
        ...prev.slice(-6),
        {
          id: popupId,
          val: totalPlayerDamage,
          isEnemy: false,
          isMiss: isPEvaded && coreDamage === 0,
          isCombo: pAttemptHits > 1 && successfulHits > 1,
          comboHits: successfulHits,
          isCore: coreDamage > 0,
          coreType: params.myDeck.equippedCore?.type,
        },
      ]);

      // 로그 작성
      let logText = '';
      const comboTag = pAttemptHits > 1 ? ` ⚡${successfulHits}/${pAttemptHits}연타` : '';
      if (isPEvaded) {
        if (coreDamage > 0) {
          logText = `${params.myDeck.playerName}의 일반 공격이 빗나갔으나, ${coreKoreanName} 코어로 ${formatNumber(coreDamage)} 속성 피해!`;
        } else {
          logText = `${params.myDeck.playerName}의 공격이 회피되었습니다! (MISS)`;
        }
      } else {
        logText = `${params.myDeck.playerName}의 공격!${comboTag} ${formatNumber(totalPlayerDamage)} 피해${coreDamage > 0 ? ` (${coreKoreanName} +${formatNumber(coreDamage)})` : ''}`;
      }

      setBattleLogs((logs) => [
        ...logs.slice(-25),
        {
          id: `log_p_${curTurn}_${Date.now()}`,
          turn: curTurn,
          text: logText,
          type: 'player',
        },
      ]);

      if (stateRef.current.oppHp <= 0) {
        onDeath();
      }
    };

    // [상대방 공격 실행]
    const executeOpponentAttack = (curTurn: number, onDeath: () => void) => {
      const params = pvpParamsRef.current;
      setOppAnim('attack');
      animTimeout2 = setTimeout(() => setOppAnim((prev) => (prev === 'attack' ? 'idle' : prev)), 150);

      // 상대 연격 타수 산출
      const oppFloorHits = Math.max(1, Math.floor(params.oppEffectiveSpeed));
      const oppExtraChance = params.oppEffectiveSpeed - oppFloorHits;
      const oppAttemptHits = oppFloorHits + (Math.random() < oppExtraChance ? 1 : 0);

      // 명중/회피 계산
      let oppHitChance = 0.95 + (params.oppComputed.accuracy - params.myComputed.evasion) * 0.01;
      if (params.opponent.equippedCore?.type === 'WIND') {
        oppHitChance += 0.05;
      }
      const finalOppHitChance = Math.max(0.1, Math.min(1.0, oppHitChance));
      const oppSuccessfulHits = calculateSuccessfulHits(oppAttemptHits, finalOppHitChance);
      const isOppEvaded = oppSuccessfulHits === 0;

      let oppNormalDmg = 0;
      if (!isOppEvaded) {
        const baseOneHit = Math.max(1, Math.floor(params.oppComputed.attack - params.myComputed.defense));
        oppNormalDmg = baseOneHit * oppSuccessfulHits;
      }

      // 상대 코어 발동 피해
      let oppCoreDmg = 0;
      let oppCoreKoreanName = '';
      if (params.opponent.equippedCore) {
        const coreType = params.opponent.equippedCore.type;
        const coreLvl = params.opponent.equippedCore.level;

        if (coreType === 'FIRE') {
          oppCoreKoreanName = '🔥화염';
          const baseCoreDmg = (1 + (coreLvl * 0.5)) + (params.opponent.stats.str * 0.08);
          oppCoreDmg = Math.floor(baseCoreDmg * (0.85 + Math.random() * 0.3) * params.oppEffectiveSpeed);
        } else if (coreType === 'ELECTRIC') {
          oppCoreKoreanName = '⚡뇌전';
          oppCoreDmg = Math.floor((2 + (coreLvl * 0.3)) * params.oppEffectiveSpeed);
        } else if (coreType === 'WIND') {
          oppCoreKoreanName = '🌪️돌풍';
          if (curTurn % 8 === 0) {
            oppCoreDmg = Math.floor(params.oppComputed.attack * 1.5 * Math.sqrt(params.oppEffectiveSpeed));
          }
        }
      }

      const totalOppDmg = oppNormalDmg + oppCoreDmg;

      // 플레이어 피격 애니메이션
      if (!isOppEvaded || oppCoreDmg > 0) {
        setPlayerAnim('hit');
        hitTimeout2 = setTimeout(() => setPlayerAnim((prev) => (prev === 'hit' ? 'idle' : prev)), 180);
      }

      // 플레이어 쉴드 및 체력 삭감
      let remainingDmg = totalOppDmg;
      if (stateRef.current.playerShield > 0) {
        if (stateRef.current.playerShield >= remainingDmg) {
          stateRef.current.playerShield -= remainingDmg;
          remainingDmg = 0;
        } else {
          remainingDmg -= stateRef.current.playerShield;
          stateRef.current.playerShield = 0;
        }
        setPlayerShield(stateRef.current.playerShield);
      }

      stateRef.current.playerHp = Math.max(0, stateRef.current.playerHp - remainingDmg);
      setPlayerHp(stateRef.current.playerHp);

      // 데미지 팝업
      const popupId = `pop_o_${Date.now()}_${Math.random()}`;
      setDamagePopups((prev) => [
        ...prev.slice(-6),
        {
          id: popupId,
          val: totalOppDmg,
          isEnemy: true,
          isMiss: isOppEvaded && oppCoreDmg === 0,
          isCombo: oppAttemptHits > 1 && oppSuccessfulHits > 1,
          comboHits: oppSuccessfulHits,
          isCore: oppCoreDmg > 0,
          coreType: params.opponent.equippedCore?.type,
        },
      ]);

      // 로그 작성
      let logText = '';
      const oppComboTag = oppAttemptHits > 1 ? ` ⚡${oppSuccessfulHits}/${oppAttemptHits}연타` : '';
      if (isOppEvaded) {
        if (oppCoreDmg > 0) {
          logText = `${params.opponent.playerName}의 공격을 회피했으나, ${oppCoreKoreanName} 코어로 ${formatNumber(oppCoreDmg)} 피해!`;
        } else {
          logText = `${params.opponent.playerName}의 공격을 완벽히 회피했습니다! (EVADED)`;
        }
      } else {
        logText = `${params.opponent.playerName}의 공격!${oppComboTag} ${formatNumber(totalOppDmg)} 피해${oppCoreDmg > 0 ? ` (${oppCoreKoreanName} +${formatNumber(oppCoreDmg)})` : ''}`;
      }

      setBattleLogs((logs) => [
        ...logs.slice(-25),
        {
          id: `log_o_${curTurn}_${Date.now()}`,
          turn: curTurn,
          text: logText,
          type: 'enemy',
        },
      ]);

      if (stateRef.current.playerHp <= 0) {
        onDeath();
      }
    };

    const runRound = () => {
      if (stateRef.current.isFinished) return;
      const params = pvpParamsRef.current;
      const isPlayerFirst = params.initiative.isPlayerFirst;

      const curTurn = stateRef.current.turn;
      stateRef.current.turn += 1;
      setTurn(stateRef.current.turn);

      if (isPlayerFirst) {
        // [선공] 플레이어 먼저 공격
        executePlayerAttack(curTurn, params.handlePlayerWin);

        subTurnTimeout = setTimeout(() => {
          if (!stateRef.current.isFinished && stateRef.current.oppHp > 0) {
            executeOpponentAttack(curTurn, params.handlePlayerLoss);
          }
        }, halfInterval);
      } else {
        // [선공] 상대방 먼저 공격
        executeOpponentAttack(curTurn, params.handlePlayerLoss);

        subTurnTimeout = setTimeout(() => {
          if (!stateRef.current.isFinished && stateRef.current.playerHp > 0) {
            executePlayerAttack(curTurn, params.handlePlayerWin);
          }
        }, halfInterval);
      }
    };

    // 턴 루프 인터벌 (1000ms 주기)
    battleTimerRef.current = window.setInterval(() => {
      runRound();
    }, intervalMs);

    return () => {
      if (battleTimerRef.current) clearInterval(battleTimerRef.current);
      if (subTurnTimeout) clearTimeout(subTurnTimeout);
      if (animTimeout1) clearTimeout(animTimeout1);
      if (animTimeout2) clearTimeout(animTimeout2);
      if (hitTimeout1) clearTimeout(hitTimeout1);
      if (hitTimeout2) clearTimeout(hitTimeout2);
    };
  }, []);

  const playerTotalStats = myDeck.stats.str + myDeck.stats.dex + myDeck.stats.con;
  const oppTotalStats = opponent.stats.str + opponent.stats.dex + opponent.stats.con;
  const playerCoreBorderClass = getCoreBorderClass(myDeck.equippedCore?.type);
  const oppCoreBorderClass = getCoreBorderClass(opponent.equippedCore?.type);

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

  const oppVariants: Variants = {
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
          <span className="text-lg">⚔️</span>
          <div>
            <div className="font-black text-stone-900 tracking-wider flex items-center gap-1.5">
              <span>PVP ARENA</span>
              <span className="text-purple-700 font-bold">[1:1 결투]</span>
            </div>
            <div className="text-[10px] text-neutral-500 font-bold flex items-center gap-1">
              <span>{opponent.playerName} (Lv.{opponent.level})</span>
              <span>•</span>
              <span className={`px-1 py-0.2 text-[9px] font-black border ${initiative.isPlayerFirst ? 'bg-emerald-100 text-emerald-800 border-emerald-600' : 'bg-rose-100 text-rose-800 border-rose-600'}`}>
                {initiative.isPlayerFirst ? '⚡선공' : '🛡️후공'} ({initiative.reason})
              </span>
            </div>
          </div>
        </div>

        {/* 포기 버튼 */}
        <button
          type="button"
          onClick={onExit}
          className="bg-stone-200 hover:bg-stone-300 border border-black px-2.5 py-1 flex items-center justify-center text-[10px] font-black text-stone-800 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
        >
          포기 / 나가기
        </button>
      </div>

      {/* 2. 메인 전투 아레나 (일반 스테이지와 100% 동일한 격자 배경 및 레이아웃) */}
      <div
        className="px-4 pt-3 pb-4 flex flex-col justify-between border-4 border-neutral-900 relative overflow-hidden transition-all duration-300 flex-grow min-h-[260px] bg-stone-100 shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.1)]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #e7e5e4 2px, transparent 2px), linear-gradient(to bottom, #e7e5e4 2px, transparent 2px)',
          backgroundSize: '16px 16px',
        }}
      >
        {/* 아레나 상단 HUD: 좌(플레이어) / 우(상대방) 체력바 & 중앙 턴 카운터 */}
        <div className="w-full relative z-30 font-mono pb-1.5 border-b border-neutral-900/20">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-20 flex flex-col items-center justify-center select-none">
            <span className="font-mono text-sm font-black tracking-tighter leading-none text-neutral-950/40">
              TURN {turn}
            </span>
            <div className="bg-purple-600 text-white text-[8px] font-black px-1.5 py-0.2 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,0.8)] tracking-tight mt-0.5 whitespace-nowrap">
              MMR {opponent.pvpScore}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full relative z-10">
            {/* 플레이어 체력 */}
            <div className="flex flex-col items-start select-none w-full min-w-0">
              <div className="text-[11px] font-black flex items-center gap-1 leading-none mb-1 truncate w-full">
                <span className="text-emerald-700">{myDeck.playerName}</span>
                {myDeck.equippedCore && (
                  <span className="px-1 py-0.2 text-[8px] font-bold border border-amber-600 bg-amber-100 text-amber-900 leading-none">
                    {getCoreKoreanName(myDeck.equippedCore.type)}
                  </span>
                )}
                <span className="text-[9px] text-stone-500 font-bold ml-auto font-mono">
                  {playerEffectiveSpeed.toFixed(2)}/s
                </span>
              </div>
              <RetroHpBar current={playerHp} max={myComputed.maxHealth} shield={playerShield} />
              <div className="flex items-center justify-between w-full mt-1 leading-none gap-1 whitespace-nowrap">
                <span className="text-[10px] font-black text-stone-700">
                  {formatNumber(Math.max(0, playerHp))}<span className="text-stone-400 mx-0.5">/</span>{formatNumber(myComputed.maxHealth)}
                </span>
                {playerShield > 0 && (
                  <span className="text-cyan-600 text-[10px] font-black">
                    +{formatNumber(playerShield)}
                  </span>
                )}
              </div>
            </div>

            {/* 상대방 체력 */}
            <div className="flex flex-col items-end select-none w-full min-w-0">
              <div className="text-[11px] font-black leading-none mb-1 truncate w-full text-right flex justify-end items-center gap-1">
                <span className="text-[9px] text-stone-500 font-bold mr-auto font-mono">
                  {oppEffectiveSpeed.toFixed(2)}/s
                </span>
                {opponent.equippedCore && (
                  <span className="px-1 py-0.2 text-[8px] font-bold border border-amber-600 bg-amber-100 text-amber-900 leading-none">
                    {getCoreKoreanName(opponent.equippedCore.type)}
                  </span>
                )}
                <span className="text-rose-700">{opponent.playerName}</span>
              </div>
              <RetroHpBar current={oppHp} max={oppComputed.maxHealth} shield={oppShield} isEnemy />
              <div className="flex items-center justify-between w-full mt-1 leading-none gap-1 whitespace-nowrap">
                {oppShield > 0 ? (
                  <span className="text-cyan-600 text-[10px] font-black">
                    +{formatNumber(oppShield)}
                  </span>
                ) : <span />}
                <span className="text-[10px] font-black text-stone-700 ml-auto">
                  {formatNumber(Math.max(0, oppHp))}<span className="text-stone-400 mx-0.5">/</span>{formatNumber(oppComputed.maxHealth)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* [전투 아레나 중앙] 캐릭터 캔버스 및 데미지 팝업 */}
        <div className="flex justify-center items-end gap-16 my-auto pt-6 pb-2 z-10 relative">
          {/* 플레이어 캐릭터 */}
          <div className="relative z-20">
            <motion.div
              variants={playerVariants}
              animate={playerAnim}
              className={`flex items-center justify-center border-4 ${playerCoreBorderClass} z-20 overflow-hidden bg-stone-300`}
              style={getDynamicBoxStyle(
                {
                  str: myComputed.finalStr || myDeck.stats.str,
                  dex: myComputed.finalDex || myDeck.stats.dex,
                  con: myComputed.finalCon || myDeck.stats.con,
                },
                oppTotalStats,
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

          {/* 상대방 캐릭터 */}
          <div className="relative z-20">
            <motion.div
              variants={oppVariants}
              animate={oppAnim}
              className={`flex items-center justify-center border-4 ${oppCoreBorderClass} z-20 overflow-hidden bg-stone-300`}
              style={getDynamicBoxStyle(
                {
                  str: oppComputed.finalStr || opponent.stats.str,
                  dex: oppComputed.finalDex || opponent.stats.dex,
                  con: oppComputed.finalCon || opponent.stats.con,
                },
                playerTotalStats,
                80
              )}
            >
              <div className="flex flex-col items-center justify-center w-full h-full p-1 text-neutral-900 font-mono select-none">
                <div className="flex justify-between w-full px-2 mb-1.5 text-xs font-black leading-none">
                  {oppAnim === 'hit' ? (
                    <>
                      <span className="text-red-900 font-black">&gt;</span>
                      <span className="text-red-900 font-black">&lt;</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 bg-neutral-950 block" />
                      <span className="w-2 h-2 bg-neutral-950 block" />
                    </>
                  )}
                </div>
                <div className={`h-1 bg-neutral-950 transition-all duration-100 ${oppAnim === 'attack' ? 'w-4 bg-red-950' : 'w-2.5'}`} />
              </div>
            </motion.div>

            {/* 상대방 쪽 피격 팝업 */}
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
                    text = `🔥-${formatNumber(popup.val)}`;
                  } else if (popup.coreType === 'ELECTRIC') {
                    colorClass = 'text-yellow-500 font-black text-lg';
                    text = `⚡-${formatNumber(popup.val)}`;
                  } else if (popup.coreType === 'WIND') {
                    colorClass = 'text-emerald-600 font-black text-lg';
                    text = `🌪️-${formatNumber(popup.val)}`;
                  }
                }

                return (
                  <motion.div
                    key={popup.id}
                    initial={{ opacity: 0, y: 0, scale: 0.5, x: 0 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      y: [-2, -18, -30],
                      x: [0, 20, 30],
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

        {/* 3. 전투 결과 오버레이 모달 */}
        <AnimatePresence>
          {battleResult?.finished && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 z-40 text-center font-mono"
            >
              <h3
                className={`text-2xl font-black mb-2 tracking-widest uppercase ${
                  battleResult.isWin ? 'text-amber-400 animate-bounce' : 'text-red-500'
                }`}
              >
                {battleResult.isWin ? '🏆 VICTORY 🏆' : '💀 DEFEAT 💀'}
              </h3>

              <p className="text-white text-xs mb-3 font-bold">
                {battleResult.isWin
                  ? `${opponent.playerName}에게서 승리를 거두었습니다!`
                  : `${opponent.playerName}에게 패배했습니다.`}
              </p>

              <div className="bg-stone-900 border-2 border-stone-700 p-2.5 w-full max-w-xs mb-4 text-xs font-bold space-y-1.5">
                <div className="flex justify-between items-center text-stone-300">
                  <span>레이팅 변동</span>
                  <span className={battleResult.ratingDelta >= 0 ? 'text-emerald-400 font-black' : 'text-red-400 font-black'}>
                    {battleResult.ratingDelta >= 0 ? `+${battleResult.ratingDelta}` : battleResult.ratingDelta} 점 ({pvpRating}점)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onExit}
                className="bg-amber-400 hover:bg-amber-300 text-black border-2 border-black px-5 py-2 font-black text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
              >
                로비로 복귀
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. 실시간 전투 콘솔 로그 */}
      <div
        ref={logContainerRef}
        className="bg-neutral-950 p-2 border-4 border-neutral-900 h-28 overflow-y-auto text-[10px] font-mono select-text flex flex-col gap-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      >
        {battleLogs.map((log) => (
          <div
            key={log.id}
            className={`leading-tight ${
              log.type === 'player'
                ? 'text-amber-300'
                : log.type === 'enemy'
                ? 'text-rose-400'
                : log.type === 'special'
                ? 'text-cyan-300 font-bold'
                : 'text-stone-400 font-bold'
            }`}
          >
            [{log.turn}T] {log.text}
          </div>
        ))}
      </div>
    </div>
  );
};

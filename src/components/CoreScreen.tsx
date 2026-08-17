// src/components/CoreScreen.tsx

import React, { useState } from 'react';
import { useGameStore, getComputedStats } from '../store/gameStore';
import type { CoreType } from '../types/game';
import { formatNumber } from '../utils/format';
import { CORE_ABILITIES_CONFIG, calculateCoreAbilityCost, calculateTotalSpentCoreFragments } from '../data/rebirthConfig';

interface CoreThemeInfo {
  name: string;
  shortName: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  btnStyle: string;
  tagline: string;
  summary: string;
  scalingStat: string;
  elementIcon: string;
}

const CORE_INFO_MAP: Record<CoreType, CoreThemeInfo> = {
  FIRE: {
    name: '불의 코어',
    shortName: '불',
    badgeBg: 'bg-red-100',
    badgeBorder: 'border-red-600',
    badgeText: 'text-red-700',
    btnStyle: 'bg-red-100 text-red-700 border-red-600',
    tagline: '방어 무시 / 지속 화염 피해',
    summary: '공격 시 적의 방어력을 무시하는 고정 화염 피해를 입힙니다. STR(힘)에 비례해 위력이 증가합니다.',
    scalingStat: '주 스탯: STR (힘)',
    elementIcon: '🔥',
  },
  WATER: {
    name: '물의 코어',
    shortName: '물',
    badgeBg: 'bg-blue-100',
    badgeBorder: 'border-blue-600',
    badgeText: 'text-blue-700',
    btnStyle: 'bg-blue-100 text-blue-700 border-blue-600',
    tagline: '보호막 생성 / 피해 반사 / 타격 회복',
    summary: '전투 시작 시 쉴드를 얻고 타격마다 쉴드를 회복하며 적의 피해를 반사합니다. CON(체력)에 비례합니다.',
    scalingStat: '주 스탯: CON (체력)',
    elementIcon: '💧',
  },
  WIND: {
    name: '바람의 코어',
    shortName: '바람',
    badgeBg: 'bg-emerald-100',
    badgeBorder: 'border-emerald-600',
    badgeText: 'text-emerald-700',
    btnStyle: 'bg-emerald-100 text-emerald-700 border-emerald-600',
    tagline: '명중·회피 / 연격(Multi-Hit) 폭격',
    summary: '명중률과 회피율이 상승하며, 연속 공격 시 추가 타격 및 절대 회피 잔상을 활성화합니다.',
    scalingStat: '주 스탯: DEX (민첩)',
    elementIcon: '🌪️',
  },
  ELECTRIC: {
    name: '전기의 코어',
    shortName: '전기',
    badgeBg: 'bg-amber-100',
    badgeBorder: 'border-amber-600',
    badgeText: 'text-amber-800',
    btnStyle: 'bg-amber-100 text-amber-800 border-amber-600',
    tagline: '추가 번개 피해 / 기절(Stun) / 처형',
    summary: '방어력을 무시하는 번개 피해를 주며, 적을 기절시키고 기절한 적에게 치명적인 추가 피해를 입힙니다.',
    scalingStat: '주 스탯: STR / DEX 균등',
    elementIcon: '⚡',
  },
};

const CoreScreen: React.FC = () => {
  const {
    equippedCore,
    selectCore,
    upgradeCore,
    upgradeCoreAbility,
    resetCoreAbilities,
    coreAbilities,
    coreFragments,
    player,
    unlockedSkills,
    activeBuffs,
    rebirthUpgrades,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'EQUIP' | 'ABILITIES'>('EQUIP');
  const [selectedType, setSelectedType] = useState<CoreType>(equippedCore?.type || 'FIRE');

  const coreTypes: CoreType[] = ['FIRE', 'WATER', 'WIND', 'ELECTRIC'];
  const currentInfo = CORE_INFO_MAP[selectedType];
  const isSelectedEquipped = equippedCore?.type === selectedType;
  const totalSpentCoreFragments = calculateTotalSpentCoreFragments(coreAbilities);

  const computed = getComputedStats(player.stats, unlockedSkills, activeBuffs, rebirthUpgrades);

  const handleResetCoreAbilities = () => {
    if (totalSpentCoreFragments <= 0) {
      alert("투자된 코어 조각이 없습니다.");
      return;
    }
    if (window.confirm(`코어 특화 연구에 투자된 모든 코어 조각을 초기화하시겠습니까?\n\n투자된 코어 조각 (${formatNumber(totalSpentCoreFragments)}개)이 100% 전액 환급됩니다.`)) {
      resetCoreAbilities();
    }
  };

  // 골드 강화 비용 계산
  const getGoldUpgradeCost = (currentLvl: number, count: number) => {
    if (count <= 0) return 0;
    let cost = 0;
    for (let i = 0; i < count; i++) {
      cost += 100 * (currentLvl + i);
    }
    return cost;
  };

  // 보유 골드로 가능한 최대 레벨업 계산 (근의 공식)
  const calculateMaxAffordableCount = (currentLvl: number, gold: number): number => {
    if (gold <= 0) return 0;
    const b = 2 * currentLvl - 1;
    const c = - (2 * gold) / 100;
    const d = b * b - 4 * c;
    if (d < 0) return 0;
    const n = Math.floor((-b + Math.sqrt(d)) / 2);
    return Math.max(0, n);
  };

  const currentLevel = isSelectedEquipped && equippedCore ? equippedCore.level : 1;
  const maxAffordable = calculateMaxAffordableCount(currentLevel, player.gold);

  const handleDirectUpgrade = (count: number) => {
    if (!isSelectedEquipped || count <= 0) return;
    if (player.gold < getGoldUpgradeCost(currentLevel, count)) {
      alert("골드가 부족합니다.");
      return;
    }
    upgradeCore(count);
  };

  // ==========================================
  // [실시간 코어 능력치 상세 계산]
  // ==========================================
  const abilities = coreAbilities || {};

  // 1) 불의 코어 계산
  const fireFlatDmgLvl = abilities.fire_flat_damage || 0;
  const fireStrRatioLvl = abilities.fire_str_ratio || 0;
  const fireBurnDotLvl = abilities.fire_burn_dot || 0;
  const fireDmgMultLvl = abilities.fire_damage_multiplier || 0;
  const fireSupernovaLvl = abilities.fire_supernova || 0;

  const fireBaseFlat = (1 + currentLevel * 0.5) + (fireFlatDmgLvl * 6);
  const fireStrRatio = 50 + (fireStrRatioLvl * 5); // %
  const fireStrBonusDmg = Math.floor(player.stats.str * (fireStrRatio / 100));
  const fireDmgMultiplier = (1 + (fireDmgMultLvl * 0.025)) * (1 + (fireBurnDotLvl * 0.03));
  const fireTotalBase = Math.floor((fireBaseFlat + fireStrBonusDmg) * fireDmgMultiplier);
  const fireSupernovaPercent = 150 + (fireSupernovaLvl * 5);
  const fireSupernovaDmg = Math.floor(computed.attack * (fireSupernovaPercent / 100));

  // 2) 물의 코어 계산
  const waterInitialLvl = abilities.water_initial_shield || 0;
  const waterShieldHitLvl = abilities.water_shield_on_hit || 0;
  const waterThornsLvl = abilities.water_thorns_reflect || 0;
  const waterLifeStealLvl = abilities.water_life_steal || 0;
  const waterShieldBurstLvl = abilities.water_shield_burst || 0;

  const waterInitialShieldPercent = (20 + currentLevel * 2) + (waterInitialLvl * 2.5); // %
  const waterInitialShieldVal = Math.floor(computed.maxHealth * (waterInitialShieldPercent / 100));
  const waterHitShieldPercent = 2.0 + (waterShieldHitLvl * 0.5); // %
  const waterHitShieldVal = Math.floor(computed.maxHealth * (waterHitShieldPercent / 100));
  const waterThornsPercent = 15 + (waterThornsLvl * 2.0); // %
  const waterLifeStealPercent = waterLifeStealLvl * 0.5; // %
  const waterShieldBurstPercent = waterShieldBurstLvl * 2.0; // %

  // 3) 바람의 코어 계산
  const windEvaLvl = abilities.wind_hit_evasion || 0;
  const windMultiChanceLvl = abilities.wind_multi_hit_chance || 0;
  const windMultiDmgLvl = abilities.wind_multi_hit_damage || 0;
  const windComboBurstLvl = abilities.wind_combo_burst || 0;
  const windAbsEvaLvl = abilities.wind_absolute_evasion || 0;

  const windEvaPercent = (2.0 + currentLevel * 0.2) + (windEvaLvl * 0.5); // %
  const windMultiChancePercent = windMultiChanceLvl * 1.5; // %
  const windMultiDmgMultiplier = 140 + (windMultiDmgLvl * 4.0); // %
  const windComboBurstPercent = 150 + (windComboBurstLvl * 5.0); // %
  const windComboBurstDmg = Math.floor(computed.attack * (windComboBurstPercent / 100));

  // 4) 번개의 코어 계산
  const elecFlatDmgLvl = abilities.electric_flat_damage || 0;
  const elecStunChanceLvl = abilities.electric_stun_chance || 0;
  const elecStunDurLvl = abilities.electric_stun_duration || 0;
  const elecExecLvl = abilities.electric_execution_damage || 0;
  const elecOverloadLvl = abilities.electric_chain_overload || 0;

  const elecBaseFlat = (1 + currentLevel * 0.2) + (elecFlatDmgLvl * 5);
  const elecStunChancePercent = 10 + (elecStunChanceLvl * 1.0); // %
  const elecStunDurSec = (1.5 + (elecStunDurLvl * 0.1)).toFixed(1);
  const elecExecBonusPercent = 50 + (elecExecLvl * 5.0); // %
  const elecExecBonusDmg = Math.floor(computed.attack * (elecExecBonusPercent / 100));
  const elecOverloadPercent = 50 + (elecOverloadLvl * 3.0); // %
  const elecOverloadDmg = Math.floor(computed.attack * (elecOverloadPercent / 100));

  return (
    <div
      className="max-w-md mx-auto p-4 rounded-none border-4 border-black bg-stone-100 w-full flex flex-col gap-3 font-mono text-xs text-stone-900 select-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-grow"
      style={{
        backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
    >
      {/* 최상단 타이틀 & 연구 초기화 버튼 영역 */}
      <div className="flex justify-between items-center border-b-4 border-black pb-2 w-full">
        <div>
          <h2 className="text-sm font-black text-stone-500 tracking-widest uppercase leading-tight">
            -[ CORE ]-
          </h2>
          <span className="text-[10px] font-bold text-stone-500">속성 원소 및 특화 연구</span>
        </div>
        <button
          type="button"
          onClick={handleResetCoreAbilities}
          title={totalSpentCoreFragments > 0 ? `투자된 ${formatNumber(totalSpentCoreFragments)}개 100% 환급` : "코어 연구 초기화"}
          className="bg-stone-200 border-2 border-red-600 hover:bg-red-50 text-red-600 px-2.5 py-1 rounded-none text-[10px] font-black tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer break-keep"
        >
          연구 초기화
        </button>
      </div>

      {/* 1. 상단 재화 현황 바 */}
      <div className="bg-stone-300 p-3 rounded-none border-4 border-black w-full flex justify-between items-center font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block leading-tight">EQUIPPED</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {equippedCore ? (
              <span className={`px-2 py-0.5 border-2 text-[11px] font-black ${CORE_INFO_MAP[equippedCore.type].badgeBorder} ${CORE_INFO_MAP[equippedCore.type].badgeBg} ${CORE_INFO_MAP[equippedCore.type].badgeText}`}>
                {CORE_INFO_MAP[equippedCore.type].name} Lv.{equippedCore.level}
              </span>
            ) : (
              <span className="text-xs font-black text-stone-600">미장착 (선택 필요)</span>
            )}
          </div>
        </div>
        <div className="flex gap-3 text-right">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block leading-tight">골드</span>
            <span className="text-sm font-black text-amber-700 font-mono leading-tight">{formatNumber(player.gold)} G</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block leading-tight">코어 조각</span>
            <span className="text-sm font-black text-cyan-800 font-mono leading-tight">{formatNumber(coreFragments)}개</span>
          </div>
        </div>
      </div>

      {/* 2. 서브 탭 전환: [장착 및 강화] / [특화 연구] */}
      <div className="flex gap-1 w-full">
        <button
          type="button"
          onClick={() => setActiveTab('EQUIP')}
          className={`flex-1 py-1.5 text-[11px] font-black border-2 border-black transition-all cursor-pointer uppercase ${
            activeTab === 'EQUIP'
              ? 'bg-amber-300 text-black shadow-none translate-x-[1px] translate-y-[1px]'
              : 'bg-stone-200 text-stone-700 hover:bg-stone-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
          }`}
        >
          장착 및 속성강화
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ABILITIES')}
          className={`flex-1 py-1.5 text-[11px] font-black border-2 border-black transition-all cursor-pointer uppercase ${
            activeTab === 'ABILITIES'
              ? 'bg-cyan-300 text-black shadow-none translate-x-[1px] translate-y-[1px]'
              : 'bg-stone-200 text-stone-700 hover:bg-stone-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
          }`}
        >
          코어 특화 연구
        </button>
      </div>

      {/* 3. 코어 장착 & 속성 강화 탭 */}
      {activeTab === 'EQUIP' && (
        <div className="flex flex-col gap-3">
          {/* 4대 속성 코어 선택 버튼 그리드 */}
          <div className="grid grid-cols-4 gap-1.5">
            {coreTypes.map(type => {
              const info = CORE_INFO_MAP[type];
              const isSelected = selectedType === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`py-2 px-1 rounded-none border-2 transition-all cursor-pointer ${info.btnStyle} ${
                    isSelected
                      ? 'border-b-2 translate-x-[2px] translate-y-[2px] shadow-none font-black ring-2 ring-black'
                      : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:brightness-95 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                  }`}
                >
                  <span className="text-xs font-black leading-tight block">
                    {info.elementIcon} {info.shortName}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 선택된 코어 상세 카드 */}
          <div className="p-3.5 rounded-none border-4 border-stone-800 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3">
            <div className="flex justify-between items-start border-b-2 border-stone-200 pb-2">
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 border-2 text-xs font-black ${currentInfo.badgeBorder} ${currentInfo.badgeBg} ${currentInfo.badgeText}`}>
                    {currentInfo.elementIcon} {currentInfo.name}
                  </span>
                  <span className="text-[10px] font-black text-purple-700">{currentInfo.scalingStat}</span>
                </div>
                <span className="text-[11px] font-bold text-stone-600 mt-1">{currentInfo.tagline}</span>
              </div>
              <div className="flex flex-col items-end">
                {isSelectedEquipped ? (
                  <span className="text-xs font-black text-black bg-amber-300 px-2 py-0.5 border-2 border-black whitespace-nowrap shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                    Lv.{equippedCore.level}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 border border-stone-300">
                    미장착 (미리보기)
                  </span>
                )}
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* [실시간 코어 발동 능력치 상세 보드 (레벨/연구 실시간 반영)] */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-stone-50 p-2.5 border-2 border-stone-300 flex flex-col gap-2 text-left">
              <div className="flex justify-between items-center border-b border-stone-200 pb-1">
                <span className="text-[10px] font-black text-stone-700 uppercase tracking-wider flex items-center gap-1">
                  <span>📊</span>
                  <span>현재 코어 실시간 적용 스펙 (Lv.{currentLevel})</span>
                </span>
                {isSelectedEquipped && (
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1 border border-emerald-300">
                    ● 실시간 전투 반영
                  </span>
                )}
              </div>

              {/* 속성별 구체적 수치 그리드 */}
              {selectedType === 'FIRE' && (
                <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                  <div className="flex justify-between items-center bg-white p-1.5 border border-stone-200">
                    <span className="text-stone-600 font-bold">🔥 화염 관통 기본 피해 (방어무시)</span>
                    <span className="font-black text-red-600 font-mono">+{formatNumber(fireBaseFlat)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 border border-stone-200">
                    <span className="text-stone-600 font-bold">💪 STR(힘) 화염 계수 (STR {player.stats.str})</span>
                    <span className="font-black text-amber-700 font-mono">+{fireStrRatio}% (+{formatNumber(fireStrBonusDmg)})</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 border border-stone-200">
                    <span className="text-stone-600 font-bold">💥 총 화염 타격 피해 (DoT/폭발 증폭 포함)</span>
                    <span className="font-black text-rose-600 font-mono">평균 ~{formatNumber(fireTotalBase)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 border border-stone-200">
                    <span className="text-stone-600 font-bold">🌟 초신성 폭발 (5회 타격마다)</span>
                    <span className="font-black text-orange-600 font-mono">공격력의 {fireSupernovaPercent}% ({formatNumber(fireSupernovaDmg)})</span>
                  </div>
                </div>
              )}

              {selectedType === 'WATER' && (
                <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                  <div className="flex justify-between items-center bg-white p-1.5 border border-stone-200">
                    <span className="text-stone-600 font-bold">🛡️ 전투 시작 수호 보호막</span>
                    <span className="font-black text-blue-600 font-mono">최대 체력의 {waterInitialShieldPercent.toFixed(1)}% (+{formatNumber(waterInitialShieldVal)})</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 border border-stone-200">
                    <span className="text-stone-600 font-bold">🌊 타격 시 보호막 회복</span>
                    <span className="font-black text-cyan-700 font-mono">타격당 +{waterHitShieldPercent.toFixed(1)}% (+{formatNumber(waterHitShieldVal)})</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 border border-stone-200">
                    <span className="text-stone-600 font-bold">🌵 피격 피해 반사</span>
                    <span className="font-black text-indigo-600 font-mono">받은 피해의 {waterThornsPercent.toFixed(1)}% 즉시 반사</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 border border-stone-200">
                    <span className="text-stone-600 font-bold">🩸 생명 갈취 (흡혈) / 💫 수호 공명</span>
                    <span className="font-black text-emerald-700 font-mono">흡혈 +{waterLifeStealPercent.toFixed(1)}% / 피해증폭 +{waterShieldBurstPercent.toFixed(1)}%</span>
                  </div>
                </div>
              )}

              {selectedType === 'WIND' && (
                <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                  <div className="flex justify-between items-center bg-white p-1.5 border border-stone-200">
                    <span className="text-stone-600 font-bold">🎯 명중 & 회피 추가 보너스</span>
                    <span className="font-black text-emerald-600 font-mono">+{windEvaPercent.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 border border-stone-200">
                    <span className="text-stone-600 font-bold">⚡ 질풍 연격(Multi-Hit) 확률</span>
                    <span className="font-black text-teal-700 font-mono">{windMultiChancePercent.toFixed(1)}% (2~3회 타격)</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 border border-stone-200">
                    <span className="text-stone-600 font-bold">🗡️ 연격 타격 데미지 증폭</span>
                    <span className="font-black text-emerald-800 font-mono">{windMultiDmgMultiplier.toFixed(0)}% 배율</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 border border-stone-200">
                    <span className="text-stone-600 font-bold">🌪️ 태풍의 눈 (10타) / 👻 잔상 분신</span>
                    <span className="font-black text-green-700 font-mono">
                      강타 {windComboBurstPercent}% ({formatNumber(windComboBurstDmg)}) / 8타 절대회피 {windAbsEvaLvl > 0 ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              )}

              {selectedType === 'ELECTRIC' && (
                <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                  <div className="flex justify-between items-center bg-white p-1.5 border border-stone-200">
                    <span className="text-stone-600 font-bold">⚡ 번개 관통 추가 피해 (방어무시)</span>
                    <span className="font-black text-amber-700 font-mono">+{formatNumber(elecBaseFlat)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 border border-stone-200">
                    <span className="text-stone-600 font-bold">💫 감전 기절(Stun) 확률 & 지속시간</span>
                    <span className="font-black text-yellow-700 font-mono">{elecStunChancePercent.toFixed(1)}% (8타 확정) / {elecStunDurSec}초</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 border border-stone-200">
                    <span className="text-stone-600 font-bold">🗡️ 뇌신 처형 (기절 상태 적 공격)</span>
                    <span className="font-black text-red-600 font-mono">공격력의 +{elecExecBonusPercent}% (+{formatNumber(elecExecBonusDmg)})</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 border border-stone-200">
                    <span className="text-stone-600 font-bold">🌩️ 과부하 낙뢰 방전 (기절 적 타격)</span>
                    <span className="font-black text-purple-700 font-mono">공격력의 +{elecOverloadPercent}% (+{formatNumber(elecOverloadDmg)})</span>
                  </div>
                </div>
              )}
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 장착 또는 골드 레벨업 액션 (4개 단위: 1, 10, 100, MAX) */}
            {/* ------------------------------------------------------------- */}
            <div className="flex flex-col gap-2 pt-1">
              {!equippedCore ? (
                <button
                  type="button"
                  onClick={() => selectCore(selectedType)}
                  className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-black rounded-none border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer uppercase tracking-wider"
                >
                  {currentInfo.name} 장착하기 (회차 고정)
                </button>
              ) : isSelectedEquipped ? (
                <div className="grid grid-cols-4 gap-1.5 w-full">
                  {([1, 10, 100] as const).map(count => {
                    const cost = getGoldUpgradeCost(currentLevel, count);
                    const canAfford = player.gold >= cost;
                    return (
                      <button
                        key={count}
                        type="button"
                        disabled={!canAfford}
                        onClick={() => handleDirectUpgrade(count)}
                        className={`py-2 px-1 rounded-none border-2 border-black flex flex-col items-center justify-center transition-all ${
                          canAfford
                            ? 'bg-amber-300 hover:bg-amber-200 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer'
                            : 'bg-stone-200 text-stone-400 border-stone-400 cursor-not-allowed shadow-none'
                        }`}
                      >
                        <span className="text-xs font-black leading-tight">+{count}</span>
                        <span className="text-[10px] font-bold font-mono leading-tight mt-0.5 truncate max-w-full">
                          {formatNumber(cost)} G
                        </span>
                      </button>
                    );
                  })}
                  {(() => {
                    const maxCount = maxAffordable;
                    const maxCost = getGoldUpgradeCost(currentLevel, maxCount);
                    const canAffordMax = maxCount > 0 && player.gold >= maxCost;
                    return (
                      <button
                        type="button"
                        disabled={!canAffordMax}
                        onClick={() => {
                          if (maxCount > 0) handleDirectUpgrade(maxCount);
                        }}
                        className={`py-2 px-1 rounded-none border-2 border-black flex flex-col items-center justify-center transition-all ${
                          canAffordMax
                            ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer'
                            : 'bg-stone-200 text-stone-400 border-stone-400 cursor-not-allowed shadow-none'
                        }`}
                      >
                        <span className="text-xs font-black leading-tight truncate max-w-full">
                          MAX{maxCount > 0 ? ` (+${maxCount})` : ''}
                        </span>
                        <span className="text-[10px] font-bold font-mono leading-tight mt-0.5 truncate max-w-full">
                          {maxCount > 0 ? `${formatNumber(maxCost)} G` : '부족'}
                        </span>
                      </button>
                    );
                  })()}
                </div>
              ) : (
                <div className="w-full p-2 bg-stone-100 border-2 border-stone-400 text-[10px] text-stone-600 text-center font-bold">
                  현재 다른 코어({CORE_INFO_MAP[equippedCore.type].name})가 장착되어 있습니다. (환생 시 교체 가능)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. 코어 연구 탭 (원소별 분리 탭 & 일관된 카드 목록) */}
      {activeTab === 'ABILITIES' && (
        <div className="flex flex-col gap-3">
          {/* 코어별 연구 카테고리 선택 탭 */}
          <div className="grid grid-cols-4 gap-1.5">
            {coreTypes.map(type => {
              const info = CORE_INFO_MAP[type];
              const isSelected = selectedType === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`py-2 px-1 rounded-none border-2 transition-all cursor-pointer ${info.btnStyle} ${
                    isSelected
                      ? 'border-b-2 translate-x-[2px] translate-y-[2px] shadow-none font-black ring-2 ring-black'
                      : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:brightness-95 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                  }`}
                >
                  <span className="text-xs font-black leading-tight block">
                    {info.elementIcon} {info.shortName}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 선택된 코어 연구 헤더 안내 */}
          <div className="p-2.5 border-2 border-black bg-stone-200 flex justify-between items-center text-left">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 border-2 text-[11px] font-black ${currentInfo.badgeBorder} ${currentInfo.badgeBg} ${currentInfo.badgeText}`}>
                {currentInfo.elementIcon} {currentInfo.name} 연구
              </span>
              <span className="text-[10px] font-bold text-stone-600">{currentInfo.tagline}</span>
            </div>
            {isSelectedEquipped ? (
              <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 border border-emerald-700">
                전투 적용 중
              </span>
            ) : (
              <span className="text-[10px] font-bold text-stone-500 bg-white px-1.5 py-0.5 border border-stone-400">
                장착 시 발동
              </span>
            )}
          </div>

          {/* 해당 코어의 독립 특화 연구 목록 */}
          <div className="flex flex-col gap-3 w-full">
            {CORE_ABILITIES_CONFIG.filter(c => c.coreType === selectedType).map(config => {
              const currentLvl = coreAbilities ? (coreAbilities[config.id] || 0) : 0;
              const cost = calculateCoreAbilityCost(config, currentLvl);
              const isMax = config.maxLevel !== undefined && currentLvl >= config.maxLevel;
              const canAfford = coreFragments >= cost && !isMax;
              const currentValue = currentLvl * config.valuePerLevel;

              return (
                <div
                  key={config.id}
                  className="flex items-center justify-between p-3 rounded-none border-4 border-stone-800 bg-white gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  {/* 좌측 정보 */}
                  <div className="text-left flex-1 min-w-0">
                    <h3 className="text-xs font-black text-black leading-none truncate">
                      {config.name}
                      <span className="text-[10px] font-bold text-stone-500 ml-1.5">Lv.{currentLvl}</span>
                    </h3>
                    <p className="text-[10px] font-bold text-stone-500 mt-1 leading-tight">{config.desc}</p>
                    <p className="text-[11px] font-black mt-1 text-cyan-800 font-mono tracking-tighter">
                      적용: +{currentValue.toFixed(1)}{config.unit}
                    </p>
                  </div>

                  {/* 우측 연구 버튼 */}
                  <button
                    type="button"
                    onClick={() => upgradeCoreAbility(config.id)}
                    disabled={!canAfford}
                    className={`px-3 py-2 rounded-none border-2 border-black font-black text-xs transition-all whitespace-nowrap leading-none uppercase tracking-wider ${
                      canAfford
                        ? 'bg-stone-100 hover:bg-stone-50 text-cyan-800 border-b-[4px] shadow-[1px_1px_0px_rgba(255,255,255,0.6)_inset] active:border-b-2 active:translate-y-[2px] cursor-pointer'
                        : 'bg-stone-300 border-stone-400 text-stone-400 opacity-40 shadow-none cursor-not-allowed'
                    }`}
                  >
                    {isMax ? 'MAX' : `+1 UP (${cost.toLocaleString()}개)`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoreScreen;

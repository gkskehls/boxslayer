// src/components/CoreScreen.tsx

import React from 'react';
import { useGameStore, getCoreStats } from '../store/gameStore';
import type { CoreType } from '../types/game';
import { formatNumber } from '../utils/format';

/* [RENEWAL] 레트로 아케이드 섀시에 맞춘 속성별 고유 픽셀 보더 & 틴트 컬러 맵
   - 현대식 어두운 반투명 색상을 배제하고, 클래식 도트 게임 특유의 직관적이고 산뜻한 하드 틴트로 전환합니다.
*/
const getCoreTypeColor = (type: CoreType) => {
  switch (type) {
    case 'FIRE': return 'border-red-600 bg-red-50 text-red-700';
    case 'WATER': return 'border-blue-600 bg-blue-50 text-blue-700';
    case 'WIND': return 'border-green-600 bg-green-50 text-green-700';
    case 'ELECTRIC': return 'border-yellow-500 bg-yellow-50 text-yellow-800';
    default: return 'border-stone-500 bg-stone-200 text-stone-700';
  }
};

const CORE_INFO_MAP: Record<
    CoreType,
    {
      name: string;
      icon: string;
      color: string;
      tagline: string;
      summary: string;
      notables: string;
    }
> = {
  FIRE: {
    name: '불의 코어 (Flame)',
    icon: '🔥',
    color: 'border-red-600 bg-red-50 text-red-800',
    tagline: '방어 무시 / 지속 화염 피해',
    summary: '공격 시 적의 방어력을 무시하는 고정 화염 피해를 입히며, STR(힘) 스탯에 비례해 위력이 폭증합니다.',
    notables: '화상(DoT) 부여, 확정 치명타 연계',
  },
  WATER: {
    name: '물의 코어 (Water)',
    icon: '💧',
    color: 'border-blue-600 bg-blue-50 text-blue-800',
    tagline: '방어막 생성 / 피해 반사 / 타격 회복',
    summary: '전투 시작 시 최대 체력 비례 쉴드를 획득하고, 타격 시 쉴드 회복 및 피격 시 데미지를 반사합니다.',
    notables: '시작 쉴드 증폭, 타격당 쉴드 회복, 피해 반사(Reflect)',
  },
  WIND: {
    name: '바람의 코어 (Wind)',
    icon: '🌪️',
    color: 'border-emerald-600 bg-emerald-50 text-emerald-800',
    tagline: '명중·회피 / 연격(Combo) 폭격',
    summary: '명중률과 회피율이 상승하며, 누적 타격 시 추가 공격(연격) 및 절대 회피 잔상을 발동합니다.',
    notables: '연격(Multi-Hit) 확률/배율 증가, 확정 회피 잔상',
  },
  ELECTRIC: {
    name: '번개의 코어 (Electric)',
    icon: '⚡',
    color: 'border-yellow-600 bg-yellow-50 text-yellow-900',
    tagline: '추가 번개 피해 / 기절(Stun) / 처형(Execute)',
    summary: '타격 시 추가 번개 피해를 주고 적을 기절시키며, 기절 상태의 적에게 최대 체력 비례 처형 피해를 가합니다.',
    notables: '주기적 기절, 기절 대상 폭발적 처형 피해',
  },
};

const CoreScreen: React.FC = () => {
  const { player, equippedCore, selectCore, upgradeCore, unlockedSkills } = useGameStore();

  const getBatchCost = (currentLvl: number, amount: number) => {
    let cost = 0;
    for (let i = 0; i < amount; i++) cost += 100 * (currentLvl + i);
    return cost;
  };

  const getMaxUpgrades = (currentLvl: number, gold: number) => {
    if (gold <= 0) return 0;
    const L = currentLvl;
    const G = gold / 50; // 등차수열 합공식 치환용 상수
    const n = Math.floor((1 - 2 * L + Math.sqrt(Math.pow(2 * L - 1, 2) + 4 * G)) / 2);
    return Math.max(0, n);
  };

  const handleSelectCore = (type: CoreType) => {
    const info = CORE_INFO_MAP[type];
    if (window.confirm(`[${info.name}]을(를) 이번 회차 코어로 선택하시겠습니까?\n한 번 선택하면 환생 전까지 변경할 수 없습니다.`)) {
      selectCore(type);
    }
  };

  /* ================= [상태 1] 코어가 선택되지 않은 경우: 4대 원소 선택 화면 ================= */
  if (!equippedCore) {
    const coreTypes: CoreType[] = ['FIRE', 'WATER', 'WIND', 'ELECTRIC'];

    return (
        <div
            className="max-w-md mx-auto p-4 rounded-none border-4 border-black bg-stone-100 w-full flex flex-col gap-3 text-stone-900 font-mono select-none text-xs shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-grow"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
        >
          {/* 헤더 영역 */}
          <div className="w-full text-center border-b-4 border-black pb-2">
            <h2 className="text-sm font-black text-stone-500 tracking-widest uppercase leading-none">-[ CORE_SELECT ]-</h2>
            <div className="text-amber-700 font-black text-xs mt-1.5 font-mono">보유 골드: {formatNumber(player.gold)} G</div>
          </div>

          {/* 안내 배너 */}
          <div className="bg-stone-300 p-2.5 rounded-none border-4 border-black text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-black text-stone-800 text-[11px] leading-tight">
              이번 환생 회차에 함께할 <span className="text-red-700">원소 코어 1종</span>을 선택하세요.
            </p>
            <p className="text-[9px] text-stone-600 mt-1 font-bold">
              ※ 선택한 코어는 환생 시까지 변경할 수 없으며 골드로 레벨업할 수 있습니다.
            </p>
          </div>

          {/* 4대 원소 카드 목록 */}
          <div className="flex flex-col gap-2.5">
            {coreTypes.map((type) => {
              const info = CORE_INFO_MAP[type];
              return (
                  <div
                      key={type}
                      className={`p-3 rounded-none border-4 border-black flex flex-col gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${info.color}`}
                  >
                    <div className="flex justify-between items-center border-b border-black/15 pb-1">
                      <div className="flex items-center gap-1.5 font-black text-xs tracking-wider uppercase">
                        <span className="text-sm">{info.icon}</span>
                        <span>{info.name}</span>
                      </div>
                      <span className="text-[9px] font-black border border-current px-1.5 py-0.5 bg-white/50 uppercase">
                    {info.tagline}
                  </span>
                    </div>

                    <p className="text-[10px] font-bold text-stone-800 leading-snug">
                      {info.summary}
                    </p>

                    <div className="text-[9px] font-semibold text-stone-700 bg-white/40 p-1 border border-black/10">
                      <span className="font-bold text-purple-900">시너지:</span> {info.notables}
                    </div>

                    <button
                        type="button"
                        onClick={() => handleSelectCore(type)}
                        className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs border-2 border-black border-b-4 active:border-b-2 active:translate-y-[2px] cursor-pointer tracking-wider uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] transition-colors mt-0.5"
                    >
                      {info.name} 선택하기 [SELECT]
                    </button>
                  </div>
              );
            })}
          </div>
        </div>
    );
  }

  /* ================= [상태 2] 코어가 선택된 상태: 정보 및 레벨업 화면 ================= */
  const currentInfo = CORE_INFO_MAP[equippedCore.type];
  const maxAffordable = getMaxUpgrades(equippedCore.level, player.gold);
  const coreStats = getCoreStats(equippedCore.type, equippedCore.level, unlockedSkills);

  return (
      <div
          className="max-w-md mx-auto p-4 rounded-none border-4 border-black bg-stone-100 w-full flex flex-col gap-3 text-stone-900 font-mono select-none text-xs shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-grow"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
      >
        {/* 헤더 영역 */}
        <div className="w-full text-center border-b-4 border-black pb-2">
          <h2 className="text-sm font-black text-stone-500 tracking-widest uppercase leading-none">-[ ACTIVE_CORE ]-</h2>
          <div className="text-amber-700 font-black text-xs mt-1.5 font-mono">보유 골드: {formatNumber(player.gold)} G</div>
        </div>

        {/* 현재 활성화된 코어 메인 카드 */}
        <div className={`p-3 rounded-none border-4 border-black flex flex-col gap-2.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${getCoreTypeColor(equippedCore.type)}`}>
          <div className="flex justify-between items-center border-b border-black/15 pb-1.5 w-full">
            <div className="flex items-center gap-1.5">
              <span className="text-base">{currentInfo.icon}</span>
              <span className="text-sm font-black uppercase tracking-wider">{equippedCore.name}</span>
            </div>
            <div className="text-xs font-black border-2 border-current px-2 py-0.5 bg-white/50 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]">
              LV.{equippedCore.level}
            </div>
          </div>

          {/* 코어 상세 효과 창 */}
          <div className="p-2.5 bg-white/70 border border-black/15 text-[11px] font-bold leading-normal break-keep whitespace-pre-wrap flex flex-col gap-1.5 shadow-[inset_1px_1px_0px_0px_rgba(0,0,0,0.05)]">
            <div className="text-stone-900 font-bold">{coreStats.desc}</div>
            <div className="pt-1.5 border-t border-black/10 text-[9px] text-stone-600 font-mono flex justify-between items-center">
              <span>코어 레벨: LV.{equippedCore.level}</span>
              <span className="text-purple-900 font-black bg-purple-100 border border-purple-300 px-1 py-0.5">✨ 패시브 스킬 보너스 적용 중</span>
            </div>
          </div>
        </div>

        {/* 코어 강화 패널 */}
        <div className="bg-stone-200 p-3 rounded-none border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-2">
          <div className="flex justify-between items-center border-b border-black/10 pb-1">
            <h3 className="font-black text-stone-700 text-[11px] uppercase tracking-wider">CORE ENHANCEMENT (골드 강화)</h3>
            <span className="text-[9px] text-stone-500 font-bold">비용: 100 × Lv</span>
          </div>

          <div className="text-[9px] font-black text-stone-600 text-center tracking-tight font-mono">
            +1 ({formatNumber(getBatchCost(equippedCore.level, 1))}G) | +10 ({formatNumber(getBatchCost(equippedCore.level, 10))}G) | +100 ({formatNumber(getBatchCost(equippedCore.level, 100))}G)
          </div>

          <div className="flex gap-1.5 w-full">
            {[1, 10, 100].map((amt) => {
              const cost = getBatchCost(equippedCore.level, amt);
              const canAfford = player.gold >= cost;
              return (
                  <button
                      key={amt}
                      type="button"
                      onClick={() => upgradeCore(amt)}
                      disabled={!canAfford}
                      className={`flex-1 py-2 rounded-none border-2 border-black border-b-4 font-black text-xs active:border-b-2 active:translate-y-[2px] transition-all ${
                          canAfford
                              ? 'bg-amber-400 hover:bg-amber-300 text-neutral-950 cursor-pointer shadow-[1px_1px_0px_rgba(255,255,255,0.6)_inset]'
                              : 'bg-stone-300 text-stone-500 opacity-50 cursor-not-allowed border-stone-500'
                      }`}
                  >
                    +{amt}
                  </button>
              );
            })}
            {/* MAX 강화 버튼 */}
            <button
                type="button"
                onClick={() => {
                  if (maxAffordable > 0) upgradeCore(maxAffordable);
                  else upgradeCore(1);
                }}
                disabled={maxAffordable <= 0}
                className={`flex-1 py-2 rounded-none border-2 border-black border-b-4 font-black text-xs active:border-b-2 active:translate-y-[2px] transition-all ${
                    maxAffordable > 0
                        ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-[1px_1px_0px_rgba(255,255,255,0.3)_inset]'
                        : 'bg-stone-300 text-stone-500 opacity-50 cursor-not-allowed border-stone-500'
                }`}
            >
              MAX {maxAffordable > 0 ? `(+${maxAffordable})` : ''}
            </button>
          </div>
        </div>

        {/* 하단 안내 */}
        <div className="mt-auto text-center text-[9px] text-stone-500 font-bold tracking-wide">
          ※ 코어 종류는 환생(Reincarnation) 후 다시 선택할 수 있습니다.
        </div>
      </div>
  );
};

export default CoreScreen;
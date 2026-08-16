// src/components/StatsScreen.tsx

import React from 'react';
import { useGameStore, getComputedStats } from '../store/gameStore';
import { formatNumber } from '../utils/format';

const StatsScreen: React.FC = () => {
    const { player, distributeStat, resetStats, unlockedSkills, activeBuffs, rebirthUpgrades } = useGameStore();

    const computed = getComputedStats(player.stats, unlockedSkills, activeBuffs, rebirthUpgrades);

    const handleReset = () => {
        if (window.confirm("정말 스탯을 초기화하고 포인트를 반환받으시겠습니까?")) {
            resetStats();
        }
    };

    const statsConfig = [
        { key: 'str', label: '힘 (STR)', desc: '공격력 +2 (최종 STR * 2)' },
        { key: 'dex', label: '민첩 (DEX)', desc: '명중력 및 회피율 증가 (최종 DEX)' },
        { key: 'con', label: '체력 (CON)', desc: '최대 체력 +5 / 방어력 +0.2' },
    ] as const;

    return (
        <div
            className="max-w-md mx-auto bg-stone-100 p-4 rounded-none border-4 border-black w-full flex flex-col gap-4 text-stone-900 font-mono select-none flex-grow"
            style={{
                backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
            }}
        >

            {/* 상단 헤더 영역 */}
            <div className="flex justify-between items-center border-b-4 border-black pb-2 w-full">
                <div>
                    <h3 className="text-sm font-black text-stone-500 tracking-widest uppercase leading-tight">
                        -[ STATS_UPGRADE ]-
                    </h3>
                    <span className="text-[10px] font-bold text-stone-500">Lv. {player.level} 캐릭터 성장 보드</span>
                </div>
                <button
                    type="button"
                    onClick={handleReset}
                    className="bg-stone-200 border-2 border-red-600 hover:bg-red-50 text-red-600 px-2.5 py-1 rounded-none text-[10px] font-black tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer break-keep"
                >
                    스탯 초기화
                </button>
            </div>

            {/* 잔여 포인트 알림 배너 */}
            <div className="bg-stone-300 px-4 py-3 rounded-none border-4 border-black w-full flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div>
                    <span className="text-xs font-black text-stone-700 block leading-tight">사용 가능한 스탯 포인트</span>
                    <span className="text-[10px] text-stone-500 font-bold">레벨업 시 획득 (+3P)</span>
                </div>
                <span className="text-emerald-700 font-black text-2xl font-mono tracking-wide leading-none">{formatNumber(player.statPoints)} P</span>
            </div>

            {/* 현재 종합 전투 능력치 표시 */}
            <div className="bg-stone-200/80 p-3 rounded-none border-4 border-black grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono w-full shadow-[inset_2px_2px_0px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-center border-b border-black/10 pb-0.5">
                    <span className="text-stone-600 font-sans font-bold text-[11px] leading-tight">공격력</span>
                    <span className="text-red-700 font-black leading-tight">{formatNumber(computed.attack)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-black/10 pb-0.5">
                    <span className="text-stone-600 font-sans font-bold text-[11px] leading-tight">방어력</span>
                    <span className="text-blue-700 font-black leading-tight">{formatNumber(computed.defense)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-black/10 pb-0.5">
                    <span className="text-stone-600 font-sans font-bold text-[11px] leading-tight">최대체력</span>
                    <span className="text-green-700 font-black leading-tight">{formatNumber(computed.maxHealth)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-black/10 pb-0.5">
                    <span className="text-stone-600 font-sans font-bold text-[11px] leading-tight">공격속도</span>
                    <span className="text-black font-black leading-tight">{computed.attackSpeed.toFixed(1)}/s</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-stone-600 font-sans font-bold text-[11px] leading-tight">명중력</span>
                    <span className="text-black font-black leading-tight">{formatNumber(computed.accuracy)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-stone-600 font-sans font-bold text-[11px] leading-tight">회피력</span>
                    <span className="text-black font-black leading-tight">{formatNumber(computed.evasion)}</span>
                </div>
            </div>

            {/* 스탯 투자 버튼 컨테이너 */}
            <div className="flex flex-col gap-3 w-full">
                {statsConfig.map(({ key, label, desc }) => {
                    const baseVal = player.stats[key];
                    const bonusVal = computed.skillBonusStats[key];
                    const finalVal = key === 'str' ? computed.finalStr : key === 'dex' ? computed.finalDex : computed.finalCon;

                    return (
                        <div key={key} className="bg-stone-200 p-3 rounded-none border-4 border-black flex flex-col gap-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full">
                            <div className="flex justify-between items-center w-full">
                                <span className="text-xs font-black text-black tracking-wide leading-none">{label}</span>
                                <div className="flex items-center gap-1.5 font-mono">
                                    <span className="text-sm font-black text-blue-700 leading-none" title="순수 레벨업 투자 스탯">
                                        기본 {baseVal}
                                    </span>
                                    {bonusVal > 0 && (
                                        <span className="text-xs font-black text-purple-800 bg-purple-200 border border-purple-600 px-1 py-0.5 leading-none" title="환생 강화로 증가된 보너스">
                                            +🌟환생 {bonusVal}
                                        </span>
                                    )}
                                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 border border-emerald-500 px-1.5 py-0.5 leading-none" title="최종 적용 스탯">
                                        총합 {finalVal}
                                    </span>
                                </div>
                            </div>
                            <p className="text-[10px] font-bold text-stone-500 break-keep leading-tight mt-0.5">{desc}</p>
                            <div className="flex gap-1 w-full mt-1.5">
                                {[1, 10, 100].map((amount) => (
                                    <button
                                        key={amount}
                                        disabled={player.statPoints < amount}
                                        onClick={() => distributeStat(key, amount)}
                                        className={`flex-1 py-1.5 rounded-none font-black text-xs transition-all break-keep border-2 border-black leading-none uppercase
                                          ${player.statPoints >= amount
                                            ? 'bg-amber-300 hover:bg-amber-200 text-black border-b-[4px] shadow-[1px_1px_0px_rgba(255,255,255,0.6)_inset] active:border-b-2 active:translate-y-[2px] cursor-pointer'
                                            : 'bg-stone-300 border-stone-400 text-stone-400 cursor-not-allowed opacity-30 shadow-none'
                                        }`}
                                    >
                                        +{amount}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StatsScreen;
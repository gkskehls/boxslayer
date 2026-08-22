// src/components/StatsScreen.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGameStore, getComputedStats } from '../store/gameStore';
import { formatNumber } from '../utils/format';
import { BoxColorPreviewModal } from './BoxColorPreviewModal';
import { Palette, Zap } from 'lucide-react';

const STAT_BUTTONS = [
    { label: '+1', amount: 1 },
    { label: '+10', amount: 10 },
    { label: '+100', amount: 100 },
    { label: '+1K', amount: 1000 },
    { label: '+10K', amount: 10000 },
    { label: 'MAX', amount: Infinity },
] as const;

const StatsScreen: React.FC = () => {
    const { player, distributeStat, resetStats, unlockedSkills, activeBuffs, rebirthUpgrades } = useGameStore();
    const [showColorPreview, setShowColorPreview] = useState(false);
    const [activeHoldKey, setActiveHoldKey] = useState<string | null>(null);

    const holdTimerRef = useRef<number | null>(null);
    const holdTicksRef = useRef<number>(0);

    const clearTimers = useCallback(() => {
        if (holdTimerRef.current !== null) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        holdTicksRef.current = 0;
        setActiveHoldKey(null);
    }, []);

    useEffect(() => {
        return () => clearTimers();
    }, [clearTimers]);

    const handlePressStart = useCallback((statKey: 'str' | 'dex' | 'con', amount: number) => {
        const currentPoints = useGameStore.getState().player.statPoints;
        if (currentPoints <= 0) return;

        const buttonId = `${statKey}_${amount}`;
        setActiveHoldKey(buttonId);

        // MAX(전체) 클릭 시 잔여 포인트 전액 1회 일괄 투자
        if (!isFinite(amount)) {
            distributeStat(statKey, currentPoints);
            return;
        }

        // 1. 단일 탭: 즉시 정확히 1회만 스탯 투자
        const initialAmount = Math.min(amount, currentPoints);
        distributeStat(statKey, initialAmount);

        // 2. 400ms 이상 꾹 누르고 있을 경우 점진적 가속 연속 투자 시작
        holdTicksRef.current = 0;

        const runNextTick = () => {
            const pts = useGameStore.getState().player.statPoints;
            if (pts <= 0) {
                clearTimers();
                return;
            }

            holdTicksRef.current += 1;
            const ticks = holdTicksRef.current;

            // 단계별 인터벌 속도(ms) 및 배치 크기 (처음엔 천천히, 오래 누를수록 초고속)
            let nextDelay: number;
            let batch: number;

            if (ticks > 40) {
                nextDelay = 25;
                batch = Math.max(amount * 500, 10000);
            } else if (ticks > 28) {
                nextDelay = 35;
                batch = Math.max(amount * 50, 1000);
            } else if (ticks > 18) {
                nextDelay = 50;
                batch = Math.max(amount * 10, 100);
            } else if (ticks > 10) {
                nextDelay = 75;
                batch = Math.max(amount * 2, 20);
            } else if (ticks > 4) {
                nextDelay = 100;
                batch = amount;
            } else {
                nextDelay = 140; // 초기 구간: 제어 가능한 편안한 속도 (또각또각)
                batch = amount;
            }

            const actual = Math.min(batch, pts);
            if (actual > 0) {
                distributeStat(statKey, actual);
                holdTimerRef.current = window.setTimeout(runNextTick, nextDelay);
            } else {
                clearTimers();
            }
        };

        holdTimerRef.current = window.setTimeout(runNextTick, 400);
    }, [distributeStat, clearTimers]);

    const computed = getComputedStats(player.stats, unlockedSkills, activeBuffs, rebirthUpgrades);

    const handleReset = () => {
        if (window.confirm("정말 스탯을 초기화하고 포인트를 반환받으시겠습니까?")) {
            resetStats();
        }
    };

    const statsConfig = [
        { key: 'str', label: '힘 (STR)', desc: '공격력 +2 (최종 STR * 2)' },
        { key: 'dex', label: '민첩 (DEX)', desc: '명중·회피 및 공격속도(연격 횟수) 증가' },
        { key: 'con', label: '체력 (CON)', desc: '최대 체력 +30 / 방어력 +0.5' },
    ] as const;

    return (
        <div
            className="max-w-md mx-auto bg-stone-100 p-4 rounded-none border-4 border-black w-full flex flex-col gap-3 text-stone-900 font-mono select-none flex-grow"
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
                <div className="flex gap-1.5 items-center">
                    <button
                        type="button"
                        onClick={() => setShowColorPreview(true)}
                        className="bg-amber-300 border-2 border-black hover:bg-amber-200 text-stone-900 px-2 py-1 rounded-none text-[10px] font-black tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer flex items-center gap-1"
                    >
                        <Palette className="w-3 h-3 text-stone-900" />
                        색상비교
                    </button>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="bg-stone-200 border-2 border-red-600 hover:bg-red-50 text-red-600 px-2.5 py-1 rounded-none text-[10px] font-black tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer break-keep"
                    >
                        스탯 초기화
                    </button>
                </div>
            </div>

            {/* 잔여 포인트 알림 배너 */}
            <div className="bg-stone-300 px-4 py-3 rounded-none border-4 border-black w-full flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div>
                    <span className="text-xs font-black text-stone-700 block leading-tight">사용 가능한 스탯 포인트</span>
                    <span className="text-[10px] text-stone-500 font-bold flex items-center gap-1 mt-0.5">
                        <Zap className="w-2.5 h-2.5 text-amber-600 inline" />
                        버튼을 꾹 누르면 초고속 연속 투자
                    </span>
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
                    <span className="text-stone-600 font-sans font-bold text-[11px] leading-tight">공격속도 / 연격</span>
                    <span className="text-black font-black leading-tight">{computed.attackSpeed.toFixed(2)}/s ({computed.attackSpeed.toFixed(1)}연타)</span>
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
                                <div className="flex items-baseline gap-1.5 font-mono">
                                    <span className="text-sm font-black text-stone-900 leading-none">
                                        {finalVal.toLocaleString()}
                                    </span>
                                    {bonusVal > 0 ? (
                                        <span className="text-xs font-semibold text-stone-500 leading-none">
                                            ({baseVal.toLocaleString()} <span className="text-purple-700 font-bold">+{bonusVal.toLocaleString()}</span>)
                                        </span>
                                    ) : (
                                        <span className="text-xs font-normal text-stone-400 leading-none">
                                            ({baseVal.toLocaleString()})
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-[10px] font-bold text-stone-500 break-keep leading-tight mt-0.5">{desc}</p>
                            
                            {/* 스탯 분배 버튼 그리드: +1, +10, +100, +1K, +10K, MAX */}
                            <div className="grid grid-cols-6 gap-1 w-full mt-1.5">
                                {STAT_BUTTONS.map(({ label: btnLabel, amount }) => {
                                    const isAvailable = isFinite(amount) ? player.statPoints >= 1 : player.statPoints > 0;
                                    const buttonKey = `${key}_${amount}`;
                                    const isHolding = activeHoldKey === buttonKey;

                                    return (
                                        <button
                                            key={btnLabel}
                                            type="button"
                                            disabled={!isAvailable}
                                            onPointerDown={(e) => {
                                                if (e.button !== 0 && e.pointerType === 'mouse') return;
                                                handlePressStart(key, amount);
                                            }}
                                            onPointerUp={clearTimers}
                                            onPointerLeave={clearTimers}
                                            onPointerCancel={clearTimers}
                                            onContextMenu={(e) => e.preventDefault()}
                                            className={`py-2 rounded-none font-black text-[11px] transition-all break-keep border-2 border-black leading-none uppercase select-none
                                              ${isAvailable
                                                ? isHolding
                                                    ? 'bg-amber-400 text-black border-b-2 translate-y-[2px] shadow-none scale-95'
                                                    : btnLabel === 'MAX'
                                                        ? 'bg-rose-400 hover:bg-rose-300 text-black border-b-[4px] shadow-[1px_1px_0px_rgba(255,255,255,0.6)_inset] active:border-b-2 active:translate-y-[2px] cursor-pointer'
                                                        : 'bg-amber-300 hover:bg-amber-200 text-black border-b-[4px] shadow-[1px_1px_0px_rgba(255,255,255,0.6)_inset] active:border-b-2 active:translate-y-[2px] cursor-pointer'
                                                : 'bg-stone-300 border-stone-400 text-stone-400 cursor-not-allowed opacity-30 shadow-none'
                                            }`}
                                        >
                                            {btnLabel}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 박스 색상 방식 5종 비교 프리뷰 모달 */}
            <BoxColorPreviewModal
                isOpen={showColorPreview}
                onClose={() => setShowColorPreview(false)}
            />
        </div>
    );
};

export default StatsScreen;
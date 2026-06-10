// src/components/StatsScreen.tsx

import React from 'react';
import { useGameStore, getComputedStats } from '../store/gameStore';

const StatsScreen: React.FC = () => {
    // resetStats를 useGameStore에서 가져옵니다
    const { player, distributeStat, resetStats } = useGameStore();

    const computed = getComputedStats(player.stats);

    const handleReset = () => {
        if (window.confirm("정말 스탯을 초기화하고 포인트를 반환받으시겠습니까?")) {
            resetStats();
        }
    };

    const statsConfig = [
        { key: 'str', label: '힘 (STR)', desc: '공격력 +2' },
        // [수정됨] 공속 고정 기믹 도입에 따라 DEX의 역할을 명중률 및 회피율 증가로 명시
        { key: 'dex', label: '민첩 (DEX)', desc: '명중률 및 회피율 증가' },
        { key: 'con', label: '체력 (CON)', desc: '체력 +2 / 방어 +0.2' }, // 체력 증가량 수정 및 방어력 명시
    ] as const;

    return (
        // 전체 여백 및 간격은 유지 (p-3.5, gap-2)
        <div className="max-w-4xl mx-auto bg-neutral-900 p-3.5 rounded-xl border border-neutral-700 w-full flex flex-col gap-2">

            {/* 상단 헤더 영역 (폰트 약간 확대: text-xs -> text-sm, text-[9px] -> text-[10px]) */}
            <div className="flex justify-between items-center border-b border-neutral-800 pb-1">
                <h3 className="text-sm font-bold text-neutral-500 tracking-wider uppercase leading-tight">스탯 강화</h3>
                <button
                    type="button"
                    onClick={handleReset}
                    className="bg-red-950/40 border border-red-800/60 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold transition-all active:scale-95 break-keep"
                >
                    초기화
                </button>
            </div>

            {/* 잔여 포인트 알림 배너 (폰트 약간 확대: text-[11px] -> text-xs, text-base -> text-lg) */}
            <div className="bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800 w-full flex justify-between items-center shadow-inner">
                <span className="text-xs font-bold text-neutral-400 break-keep leading-tight">보유 스탯 포인트</span>
                <span className="text-green-400 font-bold text-lg font-mono tracking-wide leading-none">{player.statPoints} P</span>
            </div>

            {/* 현재 능력치 표시 (폰트 약간 확대: 전체 text-xs, 라벨 text-[11px], leading-tight로 세로폭 유지) */}
            {/* [신규] 공속 고정 반영 및 명중력/회피력을 분리 표시하기 위해 md:grid-cols-5를 md:grid-cols-6으로 확장했습니다. */}
            <div className="bg-neutral-950/40 p-2 px-2.5 rounded-lg border border-neutral-800/60 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs font-mono">
                <div className="flex justify-between items-center border-b border-neutral-900/20 py-0.5">
                    <span className="text-neutral-500 font-sans text-[11px] leading-tight">공격력</span>
                    <span className="text-white font-bold leading-tight">{computed.attack.toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-neutral-900/20 py-0.5">
                    <span className="text-neutral-500 font-sans text-[11px] leading-tight">방어력</span>
                    <span className="text-white font-bold leading-tight">{computed.defense.toFixed(1)}</span>
                </div>
                {/* [신규] 이제 변하지 않는 고정 고속 상태(2.0/s)를 보여줍니다. */}
                <div className="flex justify-between items-center border-b border-neutral-900/20 py-0.5">
                    <span className="text-neutral-500 font-sans text-[11px] leading-tight">공격속도</span>
                    <span className="text-white font-bold leading-tight">{computed.attackSpeed.toFixed(1)}/s</span>
                </div>
                <div className="flex justify-between items-center border-b border-neutral-900/20 py-0.5">
                    <span className="text-neutral-500 font-sans text-[11px] leading-tight">최대체력</span>
                    <span className="text-white font-bold leading-tight">{computed.maxHealth.toFixed(0)}</span>
                </div>
                {/* [수정됨] 명중과 회피 점수를 따로 독립 노출하여 DEX 투자 효율을 직관적으로 확인 가능하게 변경 */}
                <div className="flex justify-between items-center border-b border-neutral-900/20 py-0.5">
                    <span className="text-neutral-500 font-sans text-[11px] leading-tight">명중력</span>
                    <span className="text-white font-bold leading-tight">{computed.accuracy.toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-neutral-900/20 py-0.5">
                    <span className="text-neutral-500 font-sans text-[11px] leading-tight">회피력</span>
                    <span className="text-white font-bold leading-tight">{computed.evasion.toFixed(0)}</span>
                </div>
            </div>

            {/* 스탯 투자 버튼 컨테이너 (간격 유지) */}
            <div className="flex flex-col gap-1.5">
                {statsConfig.map(({ key, label, desc }) => (
                    // 개별 스탯 슬롯 패딩 및 간격 유지
                    <div key={key} className="bg-neutral-950 py-1.5 px-2.5 rounded-lg border border-neutral-800 flex flex-col gap-0.5 shadow-sm">
                        <div className="flex justify-between items-baseline">
                            {/* 폰트 약간 확대: text-[11px] -> text-xs, text-sm -> text-base */}
                            <span className="text-xs font-bold text-neutral-300 tracking-wide leading-none">{label}</span>
                            <span className="text-base font-bold text-white font-mono leading-none">{player.stats[key]}</span>
                        </div>
                        {/* 폰트 약간 확대: text-[9px] -> text-[10px] */}
                        <p className="text-[10px] text-neutral-500 break-keep leading-tight mt-0.5">{desc}</p> {/* 추가됨 */}
                        {/* 버튼 줄 바꿈 마진 및 간격 유지 */}
                        <div className="flex gap-1 w-full mt-0.5">
                            {[1, 10, 100].map((amount) => (
                                <button
                                    key={amount}
                                    disabled={player.statPoints < amount}
                                    onClick={() => distributeStat(key, amount)}
                                    // 폰트 약간 확대: text-[11px] -> text-xs
                                    className={`flex-1 py-1 rounded-md font-bold text-xs transition-all active:scale-95 break-keep border leading-none
                                      ${player.statPoints >= amount
                                        ? 'bg-green-500/10 border-green-500/20 text-green-400 font-mono shadow-sm'
                                        : 'bg-neutral-900 border-neutral-800/60 text-neutral-600 cursor-not-allowed opacity-30'
                                    }`}
                                >
                                    +{amount}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StatsScreen;
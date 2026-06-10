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
        // [개선됨] 전체 외부 여백 p-5 -> p-3.5 축소 및 구성요소 간 간격 gap-4 -> gap-2로 대폭 초압축
        <div className="max-w-4xl mx-auto bg-neutral-900 p-3.5 rounded-xl border border-neutral-700 w-full flex flex-col gap-2">

            {/* 상단 헤더 영역 (pb-2.5 -> pb-1로 세로 폭 압축) */}
            <div className="flex justify-between items-center border-b border-neutral-800 pb-1">
                <h3 className="text-xs font-bold text-neutral-500 tracking-wider uppercase">스탯 강화</h3>
                <button
                    type="button"
                    onClick={handleReset}
                    className="bg-red-950/40 border border-red-800/60 text-red-400 px-2 py-0.5 rounded text-[9px] font-bold transition-all active:scale-95 break-keep"
                >
                    초기화
                </button>
            </div>

            {/* 잔여 포인트 알림 배너 (py-3 -> py-1.5로 슬림화하여 화면 확보) */}
            <div className="bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800 w-full flex justify-between items-center shadow-inner">
                <span className="text-[11px] font-bold text-neutral-400 break-keep">보유 스탯 포인트</span>
                <span className="text-green-400 font-bold text-base font-mono tracking-wide">{player.statPoints} P</span>
            </div>

            {/* 현재 능력치 표시 (p-3 -> p-2, gap-y-1 -> gap-y-0.5로 초압축 격자화) */}
            {/* [신규] 공속 고정 반영 및 명중력/회피력을 분리 표시하기 위해 md:grid-cols-5를 md:grid-cols-6으로 확장했습니다. */}
            <div className="bg-neutral-950/40 p-2 px-2.5 rounded-lg border border-neutral-800/60 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] font-mono">
                <div className="flex justify-between border-b border-neutral-900/20 py-0.5">
                    <span className="text-neutral-500 font-sans text-[10px]">공격력</span>
                    <span className="text-white font-bold">{computed.attack.toFixed(0)}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-900/20 py-0.5">
                    <span className="text-neutral-500 font-sans text-[10px]">방어력</span>
                    <span className="text-white font-bold">{computed.defense.toFixed(1)}</span>
                </div>
                {/* [신규] 이제 변하지 않는 고정 고속 상태(2.0/s)를 보여줍니다. */}
                <div className="flex justify-between border-b border-neutral-900/20 py-0.5">
                    <span className="text-neutral-500 font-sans text-[10px]">공격속도</span>
                    <span className="text-white font-bold">{computed.attackSpeed.toFixed(1)}/s</span>
                </div>
                <div className="flex justify-between border-b border-neutral-900/20 py-0.5">
                    <span className="text-neutral-500 font-sans text-[10px]">최대체력</span>
                    <span className="text-white font-bold">{computed.maxHealth.toFixed(0)}</span>
                </div>
                {/* [수정됨] 명중과 회피 점수를 따로 독립 노출하여 DEX 투자 효율을 직관적으로 확인 가능하게 변경 */}
                <div className="flex justify-between border-b border-neutral-900/20 py-0.5">
                    <span className="text-neutral-500 font-sans text-[10px]">명중력</span>
                    <span className="text-white font-bold">{computed.accuracy.toFixed(0)}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-900/20 py-0.5">
                    <span className="text-neutral-500 font-sans text-[10px]">회피력</span>
                    <span className="text-white font-bold">{computed.evasion.toFixed(0)}</span>
                </div>
            </div>

            {/* 스탯 투자 버튼 컨테이너 (gap-2.5 -> gap-1.5로 타이트하게 조율) */}
            <div className="flex flex-col gap-1.5">
                {statsConfig.map(({ key, label, desc }) => (
                    // 개별 스탯 슬롯 패딩 축소 (p-3.5 -> py-1.5 px-2.5, 내부 gap-1.5 -> gap-0.5)
                    <div key={key} className="bg-neutral-950 py-1.5 px-2.5 rounded-lg border border-neutral-800 flex flex-col gap-0.5 shadow-sm">
                        <div className="flex justify-between items-baseline">
                            <span className="text-[11px] font-bold text-neutral-300 tracking-wide">{label}</span>
                            <span className="text-sm font-bold text-white font-mono">{player.stats[key]}</span>
                        </div>
                        <p className="text-[9px] text-neutral-500 break-keep leading-none">{desc}</p> {/* 추가됨 */}
                        {/* 버튼 줄 바꿈 마진 및 간격 최적화 (mt-1 -> mt-0.5, gap-1.5 -> gap-1, py-1.5 -> py-1) */}
                        <div className="flex gap-1 w-full mt-0.5">
                            {[1, 10, 100].map((amount) => (
                                <button
                                    key={amount}
                                    disabled={player.statPoints < amount}
                                    onClick={() => distributeStat(key, amount)}
                                    className={`flex-1 py-1 rounded-md font-bold text-[11px] transition-all active:scale-95 break-keep border
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
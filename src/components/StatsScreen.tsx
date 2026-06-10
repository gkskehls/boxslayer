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
        <div className="max-w-4xl mx-auto bg-neutral-800 p-6 rounded-xl border border-neutral-700 w-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold flex items-center">⚔️ 스탯 강화</h3>
                <div className="flex gap-4 items-center">
                    <span className="text-green-400 font-bold">포인트: {player.statPoints}</span>
                    <button
                        onClick={handleReset}
                        className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-sm font-bold transition-colors"
                    >
                        초기화
                    </button>
                </div>
            </div>

            {/* 현재 능력치 표시 */}
            {/* [신규] 공속 고정 반영 및 명중력/회피력을 분리 표시하기 위해 md:grid-cols-5를 md:grid-cols-6으로 확장했습니다. */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6 text-sm text-neutral-300 text-center md:text-left">
                <div>공격력: {computed.attack.toFixed(0)}</div>
                <div>방어력: {computed.defense.toFixed(1)}</div>
                {/* [신규] 이제 변하지 않는 고정 공속 상태(2.0/s)를 보여줍니다. */}
                <div>공속: {computed.attackSpeed.toFixed(1)}/s</div>
                <div>최대체력: {computed.maxHealth.toFixed(0)}</div>
                {/* [수정됨] 명중과 회피 점수를 따로 독립 노출하여 DEX 투자 효율을 직관적으로 확인 가능하게 변경 */}
                <div>명중력: {computed.accuracy.toFixed(0)}</div>
                <div>회피력: {computed.evasion.toFixed(0)}</div>
            </div>

            {/* 스탯 투자 버튼 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statsConfig.map(({ key, label, desc }) => (
                    <div key={key} className="bg-neutral-700 p-4 rounded-lg flex flex-col items-center">
                        <span className="text-lg font-bold mb-1">{label}</span>
                        <span className="text-2xl font-bold mb-3">{player.stats[key]}</span>
                        <span className="text-xs text-neutral-400 mb-2">{desc}</span> {/* 추가됨 */}
                        <div className="flex gap-1 w-full">
                            {[1, 10, 100].map((amount) => (
                                <button
                                    key={amount}
                                    disabled={player.statPoints < amount}
                                    onClick={() => distributeStat(key, amount)}
                                    className={`flex-1 py-2 px-2 rounded-lg font-bold text-sm transition-colors shadow-md
                                      ${player.statPoints >= amount
                                        ? 'bg-green-600 hover:bg-green-500 text-white'
                                        : 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
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
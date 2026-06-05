import React, { useState } from 'react';
import { useGameStore, calculateReincarnationPoints } from '../store/gameStore';

// [수정됨] SKILL_TREE_SCREEN 타입 추가
interface TownScreenProps {
    onNavigate: (screen: 'BATTLE_SCREEN' | 'STATS_SCREEN' | 'CORE_SCREEN' | 'SHOP_SCREEN' | 'SKILL_TREE_SCREEN') => void;
}

const TownScreen: React.FC<TownScreenProps> = ({ onNavigate }) => {
    // 1. 상태 및 액션 가져오기
    const { player, stage, playerCores, equippedCore, canClaimRewards, calculateOfflineRewards, reincarnate, reincarnationPoints } = useGameStore();
    const [rewards, setRewards] = useState<{ gold: number; exp: number } | null>(null);

    // 2. 환생 포인트 계산
    const allCores = [...playerCores, ...(equippedCore ? [equippedCore] : [])];
    const points = calculateReincarnationPoints(stage, player.level, allCores);

    // 3. 환생 처리 로직
    const handleReincarnate = () => {
        if (window.confirm(`정말로 환생하시겠습니까?\n현재 진행 상황이 초기화되고 [${points} 포인트]를 획득합니다.`)) {
            reincarnate();
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 rounded-xl border border-neutral-700 bg-neutral-900 w-full flex flex-col gap-4 items-center justify-center">

            {/* 1. 현재 상태 요약바 (RP 추가) */}
            <div className="bg-neutral-950 px-4 py-3 rounded-xl border border-neutral-800 w-full flex justify-between items-center text-xs text-neutral-400 font-mono shadow-inner">
                <div className="flex gap-4">
                    <span>STAGE: <span className="text-white font-bold text-sm">{stage}</span></span>
                    <span>LEVEL: <span className="text-white font-bold text-sm">{player.level}</span></span>
                </div>
                <span>RP: <span className="text-purple-400 font-bold text-sm">{reincarnationPoints}</span></span>
            </div>

            {/* 2. 오프라인 보상 알림 타일 (조건부 렌더링 - 둥둥 떠다니던 버튼 대체) */}
            {canClaimRewards() && (
                <button
                    onClick={() => setRewards(calculateOfflineRewards())}
                    className="w-full py-4 bg-green-950/40 border-2 border-green-500/50 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)] animate-pulse"
                >
                    <span className="text-2xl">🎁</span>
                    <span className="text-sm font-bold text-green-400">오프라인 보상이 도착했습니다! (터치)</span>
                </button>
            )}

            {/* 보상 획득 결과 팝업 (유지) */}
            {rewards && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-neutral-800 p-8 rounded-2xl border border-neutral-700 text-center shadow-2xl max-w-sm mx-auto w-11/12">
                        <h3 className="text-3xl font-bold text-yellow-400 mb-6">보상 획득!</h3>
                        <div className="bg-neutral-900 rounded-lg p-4 mb-6">
                            <p className="text-lg text-neutral-300 mb-2 flex justify-between">
                                <span>골드</span> <span className="text-yellow-500 font-bold">+{Math.floor(rewards.gold)}</span>
                            </p>
                            <p className="text-lg text-neutral-300 flex justify-between">
                                <span>경험치</span> <span className="text-blue-500 font-bold">+{Math.floor(rewards.exp)}</span>
                            </p>
                        </div>
                        <button onClick={() => setRewards(null)} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 active:scale-95 transition-all">
                            확인
                        </button>
                    </div>
                </div>
            )}

            {/* 3. 마을 CSS 타일 메뉴 */}
            <div className="w-full flex flex-col gap-4">
                {/* [전투] 차원의 문 */}
                <button
                    onClick={() => onNavigate('BATTLE_SCREEN')}
                    className="w-full py-6 bg-red-950/40 border-2 border-red-700/50 rounded-xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-[0_4px_10px_rgba(239,68,68,0.1)]"
                >
                    <span className="text-3xl">⚔️</span>
                    <span className="text-base font-bold text-red-400">차원의 문 (전투)</span>
                </button>

                {/* 하단 4개 타일 (그리드) */}
                <div className="grid grid-cols-2 gap-4 w-full">
                    {/* [스탯] 훈련장 */}
                    <button
                        onClick={() => onNavigate('STATS_SCREEN')}
                        className="py-5 bg-neutral-800 border-2 border-neutral-700 rounded-xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                        <span className="text-2xl">🏋️</span>
                        <span className="text-sm font-bold text-neutral-300">훈련장 (스탯)</span>
                    </button>

                    {/* [코어] 연구소 */}
                    <button
                        onClick={() => onNavigate('CORE_SCREEN')}
                        className="py-5 bg-blue-950/30 border-2 border-blue-800/50 rounded-xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                        <span className="text-2xl">💎</span>
                        <span className="text-sm font-bold text-blue-400">연구소 (코어)</span>
                    </button>

                    {/* [상점] 교역소 */}
                    <button
                        onClick={() => onNavigate('SHOP_SCREEN')}
                        className="py-5 bg-yellow-950/30 border-2 border-yellow-800/50 rounded-xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                        <span className="text-2xl">💰</span>
                        <span className="text-sm font-bold text-yellow-500">교역소 (상점)</span>
                    </button>

                    {/* [추가됨] 스킬 트리 (특성 기원석) 진입 버튼 */}
                    <button
                        onClick={() => onNavigate('SKILL_TREE_SCREEN')}
                        className="py-5 bg-indigo-950/30 border-2 border-indigo-800/50 rounded-xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                        <span className="text-2xl">🌌</span>
                        <span className="text-sm font-bold text-indigo-400">특성 기원석 (스킬)</span>
                    </button>

                    <button
                        onClick={handleReincarnate}
                        disabled={points === 0}
                        className={`py-5 border-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all col-span-2 ${
                            points > 0
                                ? 'bg-purple-950/40 border-purple-700/50 active:scale-95 shadow-[0_4px_10px_rgba(168,85,247,0.1)]'
                                : 'bg-neutral-900 border-neutral-800/50 cursor-not-allowed opacity-60'
                        }`}
                    >
                        <span className="text-2xl">{points > 0 ? '🔮' : '🔒'}</span>
                        <span className={`text-sm font-bold ${points > 0 ? 'text-purple-400' : 'text-neutral-500'}`}>환생의 제단</span>
                        <span className="text-[10px] text-neutral-400">
                            {points > 0 ? `예상 획득: +${points} P` : '스테이지 5부터 가능'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TownScreen;
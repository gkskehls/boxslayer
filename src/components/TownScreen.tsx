import React, { useState } from 'react';
import { useGameStore, calculateReincarnationPoints } from '../store/gameStore';

interface TownScreenProps {
    onNavigate: (screen: 'BATTLE_SCREEN' | 'STATS_SCREEN' | 'CORE_SCREEN' | 'SHOP_SCREEN') => void;
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
        <div className="max-w-4xl mx-auto p-6 rounded-xl border border-neutral-700 bg-neutral-900 w-full flex flex-col gap-6 items-center justify-center">

            {/* [추가] 환생 정보 박스 */}
            <div className="p-4 w-full border-2 border-yellow-500 rounded bg-neutral-800">
                <h3 className="text-yellow-400 font-bold mb-2">환생 (Reincarnation)</h3>
                <p className="text-sm text-neutral-300">보유 포인트: {reincarnationPoints} P</p>
                <p className="text-sm mb-4 text-neutral-300">획득 예정: <span className="font-bold text-lg text-yellow-300">{points} P</span></p>
                <button
                    onClick={handleReincarnate}
                    disabled={points === 0}
                    className={`w-full py-2 rounded font-bold ${points > 0 ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-gray-600 cursor-not-allowed'}`}
                >
                    {points > 0 ? '환생하기' : '스테이지 5부터 환생 가능'}
                </button>
            </div>

            {/* 보상 버튼 및 팝업 (기존 로직) */}
            {canClaimRewards() && (
                <button
                    onClick={() => setRewards(calculateOfflineRewards())}
                    className="fixed top-20 right-4 p-4 bg-yellow-600 rounded-full shadow-lg z-50 hover:bg-yellow-500 transition-transform hover:scale-110"
                >
                    🎁
                </button>
            )}

            {rewards && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-neutral-800 p-8 rounded-lg border border-neutral-700 text-center shadow-lg max-w-sm mx-auto">
                        <h3 className="text-3xl font-bold text-yellow-400 mb-4">보상 획득!</h3>
                        <p className="text-xl text-neutral-300 mb-2">골드: <span className="text-yellow-500 font-bold">{Math.floor(rewards.gold)}</span></p>
                        <p className="text-xl text-neutral-300 mb-4">경험치: <span className="text-blue-500 font-bold">{Math.floor(rewards.exp)}</span></p>
                        <button onClick={() => setRewards(null)} className="mt-6 px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500">
                            확인
                        </button>
                    </div>
                </div>
            )}

            {/* 현재 상태 요약 요약바 */}
            <div className="bg-neutral-950 px-4 py-2.5 rounded border border-neutral-800 w-full flex justify-between text-xs text-neutral-400 font-mono">
                <span>STAGE: <span className="text-white font-bold">{stage}</span></span>
                <span>LEVEL: <span className="text-white font-bold">{player.level}</span></span>
            </div>

            {/* 마을 CSS 타일 메뉴 (모바일 세로 최적화 그리드) */}
            <div className="w-full flex flex-col gap-4">
                {/* [전투] 차원의 문 - 큼직하게 상단 배치 */}
                <button
                    onClick={() => onNavigate('BATTLE_SCREEN')}
                    className="w-full py-6 bg-red-950/40 border-2 border-red-700/50 rounded-xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-[0_4px_10px_rgba(239,68,68,0.1)]"
                >
                    <span className="text-3xl">⚔️</span>
                    <span className="text-base font-bold text-red-400">차원의 문 (전투)</span>
                </button>

                {/* 하단 3개 타일 2열 배치를 위한 그리드 */}
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

                    {/* 여분 칸: 향후 PvP나 스킬트리 추가용 빈 상자 */}
                    <div className="py-5 bg-neutral-900 border-2 border-neutral-800 border-dashed rounded-xl flex flex-col items-center justify-center text-neutral-600 text-xs italic">
                        <span>Coming Soon</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TownScreen;
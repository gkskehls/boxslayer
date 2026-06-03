import React, { useState } from 'react';
import { useGameStore, calculateReincarnationPoints } from '../store/gameStore';

interface TownScreenProps {
    onNavigate: (screen: 'BATTLE_SCREEN' | 'STATS_SCREEN' | 'CORE_SCREEN' | 'SHOP_SCREEN') => void;
}

const TownScreen: React.FC<TownScreenProps> = () => {
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

            {/* 마을 정보 */}
            <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 w-full text-center">
                <h2 className="text-3xl font-bold text-yellow-400 mb-4">마을 (Town)</h2>
                <p className="text-xl text-neutral-300">현재 스테이지: <span className="font-bold text-white">{stage}</span> | 레벨: <span className="font-bold text-white">{player.level}</span></p>
            </div>
        </div>
    );
};

export default TownScreen;
import React, { useState } from 'react';
import { useGameStore, calculateReincarnationPoints } from '../store/gameStore';

// [수정됨] 더 이상 마을 화면 내부에서 이동 버튼을 사용하지 않으므로 TownScreenProps 인터페이스를 삭제했습니다.

// [수정됨] onNavigate prop을 제거했습니다.
const TownScreen: React.FC = () => {
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

            {/* 1. 현재 상태 요약바 (모바일 공간 확보를 위해 패딩 슬림화) */}
            <div className="bg-neutral-950 px-5 py-5 rounded-xl border border-neutral-800 w-full flex flex-col gap-3 items-center justify-center shadow-inner">
                <h2 className="text-sm font-bold text-neutral-500 tracking-wider uppercase">플레이어 정보</h2>
                <div className="flex gap-6 text-base text-neutral-400 font-mono">
                    <span>STAGE: <span className="text-white font-bold text-xl">{stage}</span></span>
                    <span>LEVEL: <span className="text-white font-bold text-xl">{player.level}</span></span>
                </div>
                <div className="text-base text-neutral-400 font-mono">
                    <span>RP: <span className="text-purple-400 font-bold text-xl">{reincarnationPoints}</span></span>
                </div>
            </div>

            {/* 2. [개선됨] 오프라인 보상 알림 가로 배너 (1줄 컴팩트화 및 글자 잘림 방지) */}
            {canClaimRewards() && (
                <button
                    onClick={() => setRewards(calculateOfflineRewards())}
                    className="w-full py-3 px-4 bg-green-950/30 border border-green-500/40 rounded-xl flex items-center justify-between gap-3 active:scale-95 transition-all shadow-[0_0_12px_rgba(34,197,94,0.15)] animate-pulse"
                >
            <span className="text-xs sm:text-sm font-bold text-green-400 text-left break-keep leading-tight">
                오프라인 보상이 도착했습니다.
            </span>
                    <span className="bg-green-500/20 border border-green-500/40 text-green-400 text-[10px] font-bold px-2 py-1 rounded shrink-0 uppercase tracking-wider">
                수령
            </span>
                </button>
            )}

            {/* 보상 획득 결과 팝업 (기존 로직 유지) */}
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

            {/* 3. [개선됨] 환생의 제단 (설명 문구 가독성 확보 및 컴팩트 크기 조율) */}
            <div className="w-full mt-1">
                <button
                    onClick={handleReincarnate}
                    disabled={points === 0}
                    className={`w-full py-5 border rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                        points > 0
                            ? 'bg-purple-950/40 border-purple-700/50 active:scale-95 shadow-[0_4px_10px_rgba(168,85,247,0.1)]'
                            : 'bg-neutral-900 border-neutral-800/50 cursor-not-allowed opacity-60'
                    }`}
                >
                    <span className={`text-xl font-bold ${points > 0 ? 'text-purple-400' : 'text-neutral-500'}`}>환생의 제단</span>
                    <span className="text-[11px] text-neutral-400 font-mono mt-0.5 break-keep px-4 text-center leading-relaxed">
                {points > 0 ? `진행 상황을 초기화하고 +${points} RP를 획득합니다.` : '스테이지 5부터 환생이 가능합니다.'}
            </span>
                </button>
            </div>
        </div>
    );
};

export default TownScreen;
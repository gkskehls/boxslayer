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
        /* [RENEWAL] 레트로 게임기 기기 테마 일체형 마을 메인 섀시
           - 기존의 어두운 bg-neutral-900 및 곡선형 디자인을 걷어내고 각진 플랫 오락기 무드 적용.
           - 모바일 세로 해상도 규격 max-w-md와 격자 도트 무늬 배경 가동.
        */
        <div 
            className="max-w-md mx-auto p-4 rounded-none border-4 border-black bg-stone-100 w-full flex flex-col gap-4 items-center justify-between min-h-[500px] text-stone-900 font-mono select-none"
            style={{
                backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
            }}
        >
            {/* 상단 폼 래퍼 (정렬 밸런싱 목적) */}
            <div className="w-full flex flex-col gap-4">
                {/* 1. 현재 상태 요약바 (샘플 스펙을 100% 동기화한 투박한 미니 상태 대시보드) */}
                <div className="bg-stone-300 p-3 rounded-none border-4 border-black w-full flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex flex-col gap-0.5 text-left">
                        <span className="text-[10px] font-black text-neutral-500 tracking-wider uppercase leading-none">PLAYER_STATUS</span>
                        <div className="flex gap-3 text-xs font-black text-black">
                            <span>STG.<span className="text-sm font-black text-red-600">{stage}</span></span>
                            <span>LV.<span className="text-sm font-black text-blue-600">{player.level}</span></span>
                        </div>
                    </div>
                    
                    <div className="text-right flex flex-col gap-0.5">
                        <span className="text-[10px] font-black text-neutral-500 tracking-wider uppercase leading-none">REBIRTH_PT</span>
                        <span className="text-xs font-black text-purple-700">✨ {reincarnationPoints} PT</span>
                    </div>
                </div>

                {/* 2. [개선됨] 오프라인 보상 알림 가로 배너 (각진 아케이드 경고 피드백 박스 리폼) */}
                {canClaimRewards() && (
                    <button
                        onClick={() => setRewards(calculateOfflineRewards())}
                        className="w-full py-3 px-4 bg-emerald-100 border-4 border-black rounded-none flex items-center justify-between gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer animate-pulse text-black"
                    >
                        <span className="text-xs font-black tracking-tight text-emerald-800 text-left break-keep leading-tight">
                            📢 오프라인 보상이 대기 중입니다!
                        </span>
                        <span className="bg-emerald-500 border-2 border-black text-white text-[10px] font-black px-2 py-0.5 rounded-none shrink-0 tracking-wider shadow-[1px_1px_0px_rgba(0,0,0,1)] uppercase">
                            GET
                        </span>
                    </button>
                )}
            </div>

            {/* 보상 획득 결과 팝업 (기존 로직 및 분기 명세를 유지하면서 8비트 하드 픽셀 창 스타일 마감) */}
            {rewards && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
                    <div className="bg-stone-200 p-6 rounded-none border-4 border-black text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-sm mx-auto w-full text-black">
                        <h3 className="text-xl font-black text-amber-600 tracking-widest uppercase mb-4">💰 보상 획득! 💰</h3>
                        
                        <div className="bg-stone-100 border-2 border-black p-3 mb-5 font-mono text-xs font-bold space-y-2">
                            <p className="flex justify-between items-center border-b border-stone-300 pb-1">
                                <span className="text-stone-500">골드 수령</span> 
                                <span className="text-amber-600 font-black">+{Math.floor(rewards.gold)} G</span>
                            </p>
                            <p className="flex justify-between items-center">
                                <span className="text-stone-500">경험치 획득</span> 
                                <span className="text-blue-600 font-black">+{Math.floor(rewards.exp)} EXP</span>
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => setRewards(null)} 
                            className="w-full py-2.5 bg-stone-100 hover:bg-stone-50 text-black text-xs font-black rounded-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer uppercase"
                        >
                            확인 [OK]
                        </button>
                    </div>
                </div>
            )}

            {/* 3. [개선됨] 환생의 제단 (설명 문구 가독성 및 아날로그 기계식 푸시 피드백 기믹 주입) */}
            <div className="w-full mt-auto pt-4">
                <button
                    onClick={handleReincarnate}
                    disabled={points === 0}
                    /* 물리적인 입체 손맛 연출:
                       - 활성: border-b-[6px] 두께가 생겨 입체감이 잡히며 누를 때 쏙 내려갑니다.
                       - 비활성: shadow를 걷어내고 납작하게 고정시켜 먹통 상태임을 촉각화합니다.
                    */
                    className={`w-full py-4 rounded-none border-4 border-black flex flex-col items-center justify-center gap-1 transition-all ${
                        points > 0
                            ? 'bg-stone-200 border-b-[6px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:border-b-4 active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer'
                            : 'bg-stone-300 border-stone-400 text-stone-400 cursor-not-allowed opacity-60'
                    }`}
                >
                    <span className={`text-sm font-black tracking-widest uppercase ${points > 0 ? 'text-purple-700' : 'text-stone-400'}`}>
                        -[ REBIRTH ALTAR ]-
                    </span>
                    <span className="text-[10px] font-bold text-stone-600 font-mono mt-0.5 break-keep px-4 text-center leading-relaxed">
                        {points > 0 ? `진행도를 초기화하고 +${points} RP를 축적합니다.` : 'STAGE 5 달성 시 개방됩니다.'}
                    </span>
                </button>
            </div>
        </div>
    );
};

export default TownScreen;
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
        /* [RENEWAL] 레트로 아케이드 하드웨어 스타일 스탯 스크린 섀시
           - 기존의 둥근 모서리(rounded-xl)와 다크 다크모드(bg-neutral-900)를 완전히 탈피.
           - 오락기 프레임 통일을 위한 각진 바디, 선명한 border-4 border-black, 거대한 하드 블랙 그림자 주입.
        */
        <div 
            className="max-w-md mx-auto bg-stone-100 p-4 rounded-none border-4 border-black w-full flex flex-col gap-4 text-stone-900 font-mono select-none"
            style={{
                backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
            }}
        >

            {/* 상단 헤더 영역 (폰트 약간 확대: text-xs -> text-sm, text-[9px] -> text-[10px]) */}
            <div className="flex justify-between items-center border-b-4 border-black pb-2 w-full">
                <h3 className="text-sm font-black text-stone-500 tracking-widest uppercase leading-tight">
                    -[ STATS_UPGRADE ]-
                </h3>
                <button
                    type="button"
                    onClick={handleReset}
                    /* 초기화 버튼 픽셀화: 붉은색 레트로 보더 기믹 탑재 */
                    className="bg-stone-200 border-2 border-red-600 hover:bg-red-50 text-red-600 px-2.5 py-1 rounded-none text-[10px] font-black tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer break-keep"
                >
                    RESET
                </button>
            </div>

            {/* 잔여 포인트 알림 배너 (폰트 약간 확대: text-[11px] -> text-xs, text-base -> text-lg) */}
            {/* 단단하고 쫀득한 8비트 아날로그 인디케이터 스타일 래핑 */}
            <div className="bg-stone-300 px-4 py-2.5 rounded-none border-4 border-black w-full flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <span className="text-xs font-black text-stone-700 tracking-tight break-keep leading-tight">보유 스탯 포인트</span>
                <span className="text-green-700 font-black text-xl font-mono tracking-wide leading-none">{player.statPoints} P</span>
            </div>

            {/* 현재 능력치 표시 (폰트 약간 확대: 전체 text-xs, 라벨 text-[11px], leading-tight로 세로폭 유지) */}
            {/* [신규] 공속 고정 반영 및 명중력/회피력을 분리 표시하기 위해 md:grid-cols-5를 md:grid-cols-6으로 확장했습니다. */}
            {/* 리뉴얼: 조밀하게 딱딱 끊어지는 아날로그 픽셀 모니터 내부 수치판 재현 */}
            <div className="bg-stone-200/60 p-3 rounded-none border-4 border-black grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono w-full shadow-[inset_2px_2px_0px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-center border-b border-black/10 pb-0.5">
                    <span className="text-stone-500 font-sans font-bold text-[11px] leading-tight">공격력</span>
                    <span className="text-black font-black leading-tight">{computed.attack.toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-black/10 pb-0.5">
                    <span className="text-stone-500 font-sans font-bold text-[11px] leading-tight">방어력</span>
                    <span className="text-black font-black leading-tight">{computed.defense.toFixed(1)}</span>
                </div>
                {/* [신규] 이제 변하지 않는 고정 고속 상태(2.0/s)를 보여줍니다. */}
                <div className="flex justify-between items-center border-b border-black/10 pb-0.5">
                    <span className="text-stone-500 font-sans font-bold text-[11px] leading-tight">공격속도</span>
                    <span className="text-black font-black leading-tight">{computed.attackSpeed.toFixed(1)}/s</span>
                </div>
                <div className="flex justify-between items-center border-b border-black/10 pb-0.5">
                    <span className="text-stone-500 font-sans font-bold text-[11px] leading-tight">최대체력</span>
                    <span className="text-black font-black leading-tight">{computed.maxHealth.toFixed(0)}</span>
                </div>
                {/* [수정됨] 명중과 회피 점수를 따로 독립 노출하여 DEX 투자 효율을 직관적으로 확인 가능하게 변경 */}
                <div className="flex justify-between items-center border-b border-black/10 pb-0.5">
                    <span className="text-stone-500 font-sans font-bold text-[11px] leading-tight">명중력</span>
                    <span className="text-black font-black leading-tight">{computed.accuracy.toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-black/10 pb-0.5">
                    <span className="text-stone-500 font-sans font-bold text-[11px] leading-tight">회피력</span>
                    <span className="text-black font-black leading-tight">{computed.evasion.toFixed(0)}</span>
                </div>
            </div>

            {/* 스탯 투자 버튼 컨테이너 (간격 유지) */}
            <div className="flex flex-col gap-3 w-full">
                {statsConfig.map(({ key, label, desc }) => (
                    // 개별 스탯 슬롯 패딩 및 간격 유지
                    // 리뉴얼: 각 스탯 카드를 하드웨어 박스 모듈 형태로 리폼
                    <div key={key} className="bg-stone-200 p-3 rounded-none border-4 border-black flex flex-col gap-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full">
                        <div className="flex justify-between items-baseline w-full">
                            {/* 폰트 약간 확대: text-[11px] -> text-xs, text-sm -> text-base */}
                            <span className="text-xs font-black text-black tracking-wide leading-none">{label}</span>
                            <span className="text-base font-black text-blue-700 font-mono leading-none">{player.stats[key]}</span>
                        </div>
                        {/* 폰트 약간 확대: text-[9px] -> text-[10px] */}
                        <p className="text-[10px] font-bold text-stone-500 break-keep leading-tight mt-0.5">{desc}</p> {/* 추가됨 */}
                        {/* 버튼 줄 바꿈 마진 및 간격 유지 */}
                        <div className="flex gap-1 w-full mt-1.5">
                            {[1, 10, 100].map((amount) => (
                                <button
                                    key={amount}
                                    disabled={player.statPoints < amount}
                                    onClick={() => distributeStat(key, amount)}
                                    // 폰트 약간 확대: text-[11px] -> text-xs
                                    /* 버튼 액션 질감 고도화:
                                       - 가능상태: 오프라인 아케이드 기계식 버튼 누름 효과 (border-b-[4px]가 active 시 border-b-2 및 translate)
                                       - 불가능상태: 투명도 30%에 납작하게 가라앉혀 촉각 피드백 차단
                                    */
                                    className={`flex-1 py-1.5 rounded-none font-black text-xs transition-all break-keep border-2 border-black leading-none uppercase
                                      ${player.statPoints >= amount
                                        ? 'bg-stone-100 hover:bg-stone-50 text-green-700 border-b-[4px] shadow-[1px_1px_0px_rgba(255,255,255,0.6)_inset] active:border-b-2 active:translate-y-[2px] cursor-pointer'
                                        : 'bg-stone-300 border-stone-400 text-stone-400 cursor-not-allowed opacity-30 shadow-none'
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
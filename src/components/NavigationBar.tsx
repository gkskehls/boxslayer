import React from 'react';

interface NavigationBarProps {
  onNavigate: (screen: 'TOWN_SCREEN' | 'BATTLE_SCREEN' | 'ANIMATED_BATTLE_SCREEN' | 'STATS_SCREEN' | 'CORE_SCREEN' | 'SHOP_SCREEN' | 'SKILL_TREE_SCREEN') => void;
  currentScreen: 'TOWN_SCREEN' | 'BATTLE_SCREEN' | 'ANIMATED_BATTLE_SCREEN' | 'STATS_SCREEN' | 'CORE_SCREEN' | 'SHOP_SCREEN' | 'SKILL_TREE_SCREEN';
}

const NavigationBar: React.FC<NavigationBarProps> = ({ onNavigate, currentScreen }) => {
  // [수정됨] 샘플 UI 스펙에 맞춰 고전 게임기 제어 패드 스타일 데이터 명세 구축
  // 아이콘/이모지를 배제하고 영문 대문자 기반 무드의 깔끔한 타이포 레이아웃을 지향합니다.
  const navItems = [
    { screen: 'TOWN_SCREEN', label: '마을' },
    { screen: 'BATTLE_SCREEN', label: '구 전투' },
    { screen: 'ANIMATED_BATTLE_SCREEN', label: '신 전투' },
    { screen: 'STATS_SCREEN', label: '스탯' },
    { screen: 'CORE_SCREEN', label: '코어' },
    { screen: 'SHOP_SCREEN', label: '상점' },
    { screen: 'SKILL_TREE_SCREEN', label: '스킬' },
  ] as const;

  return (
      /* [RENEWAL] 레트로 휴대형 하드웨어 일체형 내비게이션 바 프레임
        - 고전 오락기 본체 색조(bg-stone-300) 매핑 및 굵은 직각 라인(border-t-4 border-black) 주입.
        - max-w-md mx-auto 처리로 전체 본체 프레임 규격과 일직선으로 딱 떨어지게 마감합니다.
      */
      <div className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto bg-stone-300 border-t-4 border-black flex justify-between p-2 z-50 gap-1 overflow-x-auto select-none shadow-[inset_0_2px_0px_rgba(255,255,255,0.4)]">
        {navItems.map((item) => {
          const isActive = currentScreen === item.screen;
          return (
              <button
                  key={item.screen}
                  onClick={() => onNavigate(item.screen)}
                  /* [피드백 액션] 아날로그 기계식 버튼 기믹 구현
                    - 비활성: bg-stone-100에 2px 블랙 보더와 단단한 우하단 8비트 블랙 드롭 섀도우 장착.
                    - 활성: bg-amber-200(샘플 하이라이트색)으로 반전되며 버튼이 눌린 것처럼 shadow 차단 및 1px 우하단 이동(translate).
                  */
                  className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-none border-2 border-black font-black font-mono transition-all whitespace-nowrap flex-1 min-w-[50px] cursor-pointer text-[10px] tracking-tighter select-none
                    ${isActive 
                      ? 'bg-amber-200 text-black translate-x-[1px] translate-y-[1px] shadow-none' 
                      : 'bg-stone-100 text-stone-700 hover:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                    }`}
              >
                <span className="block font-black uppercase">{item.label}</span>
              </button>
          )
        })}
      </div>
  );
};

export default NavigationBar;
import React from 'react';

interface NavigationBarProps {
  // [수정됨] ANIMATED_BATTLE_SCREEN, SKILL_TREE_SCREEN 추가 (마을에 있던 이동 버튼 모두 통합)
  onNavigate: (screen: 'TOWN_SCREEN' | 'BATTLE_SCREEN' | 'ANIMATED_BATTLE_SCREEN' | 'STATS_SCREEN' | 'CORE_SCREEN' | 'SHOP_SCREEN' | 'SKILL_TREE_SCREEN') => void;
  currentScreen: 'TOWN_SCREEN' | 'BATTLE_SCREEN' | 'ANIMATED_BATTLE_SCREEN' | 'STATS_SCREEN' | 'CORE_SCREEN' | 'SHOP_SCREEN' | 'SKILL_TREE_SCREEN';
}

const NavigationBar: React.FC<NavigationBarProps> = ({ onNavigate, currentScreen }) => {
  // [수정됨] 아이콘(icon) 속성을 완전히 제거하고 텍스트(label)만 남겼습니다.
  const navItems = [
    { screen: 'TOWN_SCREEN', label: '마을' },
    { screen: 'BATTLE_SCREEN', label: '구 전투' },
    { screen: 'ANIMATED_BATTLE_SCREEN', label: '신 전투' },
    { screen: 'STATS_SCREEN', label: '스탯' },
    { screen: 'CORE_SCREEN', label: '코어' },
    { screen: 'SHOP_SCREEN', label: '상점' },
    { screen: 'SKILL_TREE_SCREEN', label: '스킬' },
  ] as const; // as const 추가

  return (
      // [수정됨] gap-1에서 gap-2로 늘려 버튼 사이의 간격을 확보했습니다.
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t-2 border-neutral-800 flex justify-evenly p-2 z-50 gap-2 overflow-x-auto">
        {/* 메뉴가 많아졌으므로 좁은 화면에서도 잘 보이도록 조정했습니다. */}
        {navItems.map((item) => (
            <button
                key={item.screen}
                onClick={() => onNavigate(item.screen)}
                // [수정됨] 아이콘 대신 텍스트 주변을 감싸는 '박스' 테마로 변경했습니다.
                className={`flex flex-col items-center justify-center text-xs py-2 px-1 rounded-sm font-bold transition-all whitespace-nowrap flex-1 min-w-[45px] border
            ${currentScreen === item.screen
                    ? 'text-neutral-900 bg-yellow-400 border-yellow-400 shadow-sm'
                    // [수정됨] 비활성 버튼에 테두리(border-neutral-700)와 배경색(bg-neutral-800)을 주어 영역을 명확히 구분했습니다.
                    : 'text-neutral-400 border-neutral-700 bg-neutral-800 hover:text-white hover:border-neutral-500 hover:bg-neutral-700'}`}
            >
              <span>{item.label}</span>
            </button>
        ))}
      </div>
  );
};

export default NavigationBar;
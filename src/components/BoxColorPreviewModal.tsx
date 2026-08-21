// src/components/BoxColorPreviewModal.tsx

import React, { useState } from 'react';
import { useGameStore, getComputedStats } from '../store/gameStore';
import type { CoreType } from '../types/game';
import {
  type ColorThemeType,
  getCustomBoxStyle,
  getCoreVisualConfig,
} from '../utils/boxStyleEvaluator';
import { Flame, Droplets, Wind, Zap, Shield, Sparkles, Sliders, Layers } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const THEME_OPTIONS: { id: ColorThemeType; title: string; subtitle: string; desc: string; badge: string }[] = [
  {
    id: 'OPTION_C',
    title: '방안 C: 8비트 아케이드 프리셋 팔레트',
    subtitle: 'Retro 16-Color Table Mapping',
    desc: '엄선된 레트로 전용 16색 테이블에서 1위/2위 스탯에 딱 맞추어 매핑되는 깔끔한 아케이드 톤입니다.',
    badge: '현재 인게임 적용 👑',
  },
  {
    id: 'OPTION_A',
    title: '방안 A: HSL 색상환 벡터 합성',
    subtitle: '360° Vector Hue Blending',
    desc: '스탯 조합에 따라 선명한 오렌지/청록/보라색을 생성하며, 균형 스탯일 땐 세련된 티타늄 실버로 수렴합니다.',
    badge: '벡터 합성 🌟',
  },
  {
    id: 'OPTION_B',
    title: '방안 B: 코어 테마 + 스탯 서브 융합',
    subtitle: 'Core-Driven Attribute Harmony',
    desc: '장착한 코어의 속성(불/물/바람/전기)이 박스 색상을 주도하고 스탯이 빛깔을 미세 조절합니다.',
    badge: '속성 몰입형 🔥',
  },
  {
    id: 'OPTION_D',
    title: '방안 D: 듀얼톤 그라데이션',
    subtitle: 'Dual-Tone Linear Gradient',
    desc: '색을 섞지 않고 상단(1순위 스탯)과 하단(2순위 스탯)으로 분할하여 입체적인 그라데이션을 연출합니다.',
    badge: '입체 투톤 🌈',
  },
  {
    id: 'ORIGINAL',
    title: '기존 방식 (구버전 RGB 선형 결합)',
    subtitle: '단순 RGB 비례 결합',
    desc: '스탯이 고루 분배되면 탁한 흙갈색/머스타드색으로 뭉개지던 구버전 방식입니다.',
    badge: '이전 구버전',
  },
];

// 스탯 몰빵 및 하이브리드 프리셋 목록
const STAT_PRESETS = [
  { id: 'str-100', label: '🔴 STR 100% 극몰빵', str: 100, dex: 0, con: 0, desc: '순수 버서커 극딜' },
  { id: 'dex-100', label: '🟢 DEX 100% 극몰빵', str: 0, dex: 100, con: 0, desc: '순수 스피더 회피' },
  { id: 'con-100', label: '🔵 CON 100% 극몰빵', str: 0, dex: 0, con: 100, desc: '순수 가디언 체력' },
  { id: 'str-dex-82', label: '🟠 STR 80% + DEX 20%', str: 80, dex: 20, con: 0, desc: '크리티컬 어쌔신' },
  { id: 'str-con-82', label: '🟣 STR 80% + CON 20%', str: 80, dex: 0, con: 20, desc: '헤비 딜탱 브루저' },
  { id: 'dex-con-82', label: '🌿 DEX 80% + CON 20%', str: 0, dex: 80, con: 20, desc: '민첩 생존형 레인저' },
  { id: 'str-dex-55', label: '🟡 STR 50% + DEX 50%', str: 50, dex: 50, con: 0, desc: '힘/민첩 듀얼리스트' },
  { id: 'dex-con-55', label: '🌊 DEX 50% + CON 50%', str: 0, dex: 50, con: 50, desc: '민첩/체력 수호자' },
  { id: 'balanced', label: '🛡️ 3대 균형 올스탯 (33%)', str: 33, dex: 33, con: 33, desc: '올라운더 밸런스' },
];

const CORE_BUTTONS: { type: CoreType | null; label: string; icon: React.ReactNode; colorClass: string }[] = [
  { type: null, label: '무속성', icon: <Shield className="w-3 h-3" />, colorClass: 'bg-stone-200 text-stone-800' },
  { type: 'FIRE', label: '불 코어', icon: <Flame className="w-3 h-3 text-red-600" />, colorClass: 'bg-red-100 text-red-900 border-red-500' },
  { type: 'WATER', label: '물 코어', icon: <Droplets className="w-3 h-3 text-blue-600" />, colorClass: 'bg-blue-100 text-blue-900 border-blue-500' },
  { type: 'WIND', label: '바람 코어', icon: <Wind className="w-3 h-3 text-emerald-600" />, colorClass: 'bg-emerald-100 text-emerald-900 border-emerald-500' },
  { type: 'ELECTRIC', label: '전기 코어', icon: <Zap className="w-3 h-3 text-amber-600" />, colorClass: 'bg-amber-100 text-amber-900 border-amber-500' },
];

export const BoxColorPreviewModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { player, equippedCore, unlockedSkills, activeBuffs, rebirthUpgrades } = useGameStore();
  const computed = getComputedStats(player.stats, unlockedSkills, activeBuffs, rebirthUpgrades);

  // 1. 테마 선택 (OPTION_C: 8비트 아케이드 클래식 프리셋이 기본 인게임 적용 표준)
  const [selectedTheme, setSelectedTheme] = useState<ColorThemeType>('OPTION_C');
  
  // 2. 뷰 모드: 'THEMES' (5가지 방식 비교) vs 'CORES_MATRIX' (선택한 스탯에 대해 5대 코어 동시 비교)
  const [viewMode, setViewMode] = useState<'THEMES' | 'CORES_MATRIX'>('THEMES');

  // 3. 스탯 모드: 'PRESET' vs 'CUSTOM_SLIDER' vs 'MY_CHAR'
  const [statMode, setStatMode] = useState<'PRESET' | 'CUSTOM_SLIDER' | 'MY_CHAR'>('PRESET');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('str-100');
  const [customStr, setCustomStr] = useState<number>(80);
  const [customDex, setCustomDex] = useState<number>(20);
  const [customCon, setCustomCon] = useState<number>(0);

  // 4. 코어 선택 (독립 토글)
  const [activeCore, setActiveCore] = useState<CoreType | null>(equippedCore?.type || 'FIRE');

  // 5. 상대와의 전투력 차이: 'WIN' (내가 2배 강함) | 'EQUAL' (대등) | 'LOSE' (상대가 2배 강함)
  const [powerDiff, setPowerDiff] = useState<'WIN' | 'EQUAL' | 'LOSE'>('EQUAL');

  if (!isOpen) return null;

  // 현재 유효 스탯 계산
  let currentStats = { str: 100, dex: 0, con: 0 };
  if (statMode === 'MY_CHAR') {
    currentStats = {
      str: computed.finalStr || player.stats.str,
      dex: computed.finalDex || player.stats.dex,
      con: computed.finalCon || player.stats.con,
    };
  } else if (statMode === 'CUSTOM_SLIDER') {
    currentStats = { str: customStr, dex: customDex, con: customCon };
  } else {
    const found = STAT_PRESETS.find(p => p.id === selectedPresetId);
    if (found) {
      currentStats = { str: found.str, dex: found.dex, con: found.con };
    }
  }

  const myTotalStats = Math.max(1, currentStats.str + currentStats.dex + currentStats.con);
  let opponentTotalStats = myTotalStats;
  if (powerDiff === 'WIN') opponentTotalStats = Math.round(myTotalStats * 0.4);
  if (powerDiff === 'LOSE') opponentTotalStats = Math.round(myTotalStats * 2.2);

  // 박스 렌더링 서브 컴포넌트
  const renderBoxVisual = (
    theme: ColorThemeType,
    core: CoreType | null | undefined,
    size: number = 60,
    showBadge: boolean = true
  ) => {
    const boxStyle = getCustomBoxStyle(theme, currentStats, opponentTotalStats, size, core);
    const coreInfo = getCoreVisualConfig(core);

    return (
      <div className="relative flex items-center justify-center">
        {/* 박스 본체 및 코어 오라/테두리 */}
        <div
          style={boxStyle}
          className={`flex items-center justify-center transition-all relative overflow-hidden select-none border-4 ${coreInfo.borderClass}`}
        >
          {/* 캐릭터 얼굴 (눈 & 입) */}
          <div className="flex flex-col items-center justify-center w-full h-full p-1 text-neutral-950 font-mono">
            <div className="flex justify-between w-full px-1.5 mb-1">
              <span className={`w-1.5 h-1.5 block border border-black/40 ${theme === 'OPTION_B' && core ? coreInfo.eyeColor : 'bg-black'}`}></span>
              <span className={`w-1.5 h-1.5 block border border-black/40 ${theme === 'OPTION_B' && core ? coreInfo.eyeColor : 'bg-black'}`}></span>
            </div>
            <div className="h-0.5 bg-black w-2.5"></div>
          </div>
        </div>

        {/* 코어 속성 미니 뱃지 (우측 상단) */}
        {showBadge && core && (
          <div
            className={`absolute -top-1.5 -right-1.5 text-[9px] px-1 py-0.2 border font-black shadow-[1px_1px_0px_rgba(0,0,0,1)] ${coreInfo.badgeBg}`}
            title={coreInfo.name}
          >
            {coreInfo.icon}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 md:p-4 font-mono select-none overflow-y-auto">
      <div className="bg-stone-100 border-4 border-black max-w-xl w-full p-3 md:p-4 flex flex-col gap-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] my-auto max-h-[94vh] overflow-y-auto">
        
        {/* ================= 1. 모달 상단 헤더 ================= */}
        <div className="flex justify-between items-center border-b-4 border-black pb-2">
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm md:text-base font-black text-stone-900 tracking-wider">
                박스 색상 & 코어 연출 정밀 비교
              </h3>
            </div>
            <p className="text-[10px] text-stone-600 font-bold mt-0.5">
              스탯 몰빵 및 5대 코어(불/물/바람/전기/무속성) 결합 효과를 실시간으로 비교해보세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 bg-stone-300 hover:bg-stone-400 border-2 border-black font-black text-xs cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
          >
            ✕ 닫기
          </button>
        </div>

        {/* ================= 2. 보기 모드 탭 (방식 비교 vs 코어 매트릭스) ================= */}
        <div className="grid grid-cols-2 gap-1.5 bg-stone-300 p-1 border-2 border-black">
          <button
            type="button"
            onClick={() => setViewMode('THEMES')}
            className={`py-1.5 text-xs font-black flex items-center justify-center gap-1 border border-black cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,1)] ${
              viewMode === 'THEMES' ? 'bg-amber-400 text-stone-950 border-2' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            5가지 렌더링 방식 비교
          </button>
          <button
            type="button"
            onClick={() => setViewMode('CORES_MATRIX')}
            className={`py-1.5 text-xs font-black flex items-center justify-center gap-1 border border-black cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,1)] ${
              viewMode === 'CORES_MATRIX' ? 'bg-amber-400 text-stone-950 border-2' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-red-600" />
            5대 코어 동시 매트릭스 뷰
          </button>
        </div>

        {/* ================= 3. 코어 및 상대 강함 선택 컨트롤러 ================= */}
        <div className="flex flex-col gap-2 bg-stone-200 p-2.5 border-2 border-black">
          
          {/* (1) 코어 선택 토글 (5종) */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-black text-stone-900">
                🔮 [코어 선택]:
              </span>
              <span className="text-[10px] text-stone-600 font-bold">
                선택됨: <b className="text-purple-700">{getCoreVisualConfig(activeCore).name}</b>
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {CORE_BUTTONS.map((btn) => {
                const isSelected = activeCore === btn.type;
                return (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => setActiveCore(btn.type)}
                    className={`py-1 px-1 text-[10px] font-black border-2 border-black flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 ${
                      isSelected ? 'bg-amber-400 text-black ring-2 ring-amber-600' : `${btn.colorClass} hover:opacity-90`
                    }`}
                  >
                    <span>{btn.icon}</span>
                    <span className="truncate leading-tight text-[9px]">{btn.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* (2) 상대와의 강함 차이 (3종) */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-300">
            <span className="text-[10px] font-black text-stone-800">
              ⚔️ 상대 전투력 차이:
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPowerDiff('WIN')}
                className={`px-2 py-0.5 text-[9px] font-black border border-black cursor-pointer ${
                  powerDiff === 'WIN' ? 'bg-amber-400 text-black border-2' : 'bg-stone-100 text-stone-700'
                }`}
              >
                👑 내가 2배 강함
              </button>
              <button
                type="button"
                onClick={() => setPowerDiff('EQUAL')}
                className={`px-2 py-0.5 text-[9px] font-black border border-black cursor-pointer ${
                  powerDiff === 'EQUAL' ? 'bg-amber-400 text-black border-2' : 'bg-stone-100 text-stone-700'
                }`}
              >
                ⚔️ 대등한 세력
              </button>
              <button
                type="button"
                onClick={() => setPowerDiff('LOSE')}
                className={`px-2 py-0.5 text-[9px] font-black border border-black cursor-pointer ${
                  powerDiff === 'LOSE' ? 'bg-amber-400 text-black border-2' : 'bg-stone-100 text-stone-700'
                }`}
              >
                💀 상대가 2배 강함
              </button>
            </div>
          </div>
        </div>

        {/* ================= 4. 스탯 몰빵 프리셋 / 슬라이더 컨트롤러 ================= */}
        <div className="flex flex-col gap-2 bg-stone-200 p-2.5 border-2 border-black">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black text-stone-900">
              📊 [스탯 몰빵 & 비율 선택]:
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setStatMode('PRESET')}
                className={`px-2 py-0.5 text-[9px] font-black border border-black cursor-pointer ${
                  statMode === 'PRESET' ? 'bg-amber-400 text-black' : 'bg-stone-100 text-stone-700'
                }`}
              >
                프리셋 모드
              </button>
              <button
                type="button"
                onClick={() => setStatMode('CUSTOM_SLIDER')}
                className={`px-2 py-0.5 text-[9px] font-black border border-black cursor-pointer flex items-center gap-0.5 ${
                  statMode === 'CUSTOM_SLIDER' ? 'bg-amber-400 text-black' : 'bg-stone-100 text-stone-700'
                }`}
              >
                <Sliders className="w-2.5 h-2.5" />
                직접 슬라이더 조절
              </button>
              <button
                type="button"
                onClick={() => setStatMode('MY_CHAR')}
                className={`px-2 py-0.5 text-[9px] font-black border border-black cursor-pointer ${
                  statMode === 'MY_CHAR' ? 'bg-amber-400 text-black' : 'bg-stone-100 text-stone-700'
                }`}
              >
                내 캐릭터 현재
              </button>
            </div>
          </div>

          {/* 프리셋 버튼 목록 */}
          {statMode === 'PRESET' && (
            <div className="grid grid-cols-3 gap-1">
              {STAT_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`px-1.5 py-1 text-left border border-black cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 ${
                      isSelected ? 'bg-amber-400 text-black font-black border-2' : 'bg-stone-100 text-stone-800 hover:bg-stone-300'
                    }`}
                  >
                    <div className="text-[10px] font-black truncate">{preset.label}</div>
                    <div className="text-[8px] text-stone-600 truncate">{preset.desc}</div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 직접 슬라이더 조절 UI */}
          {statMode === 'CUSTOM_SLIDER' && (
            <div className="flex flex-col gap-1.5 bg-stone-100 p-2 border border-stone-400">
              <div className="flex items-center gap-2 text-[10px]">
                <span className="w-12 font-black text-red-600">STR ({customStr})</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customStr}
                  onChange={(e) => setCustomStr(Number(e.target.value))}
                  className="flex-grow accent-red-600 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="w-12 font-black text-green-600">DEX ({customDex})</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customDex}
                  onChange={(e) => setCustomDex(Number(e.target.value))}
                  className="flex-grow accent-green-600 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="w-12 font-black text-blue-600">CON ({customCon})</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customCon}
                  onChange={(e) => setCustomCon(Number(e.target.value))}
                  className="flex-grow accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* 현재 선택된 스탯 정보 배너 */}
          <div className="text-[10px] text-stone-700 bg-stone-100 p-1 border border-stone-400 flex justify-between">
            <span>STR: <b className="text-red-600">{currentStats.str}</b> / DEX: <b className="text-green-600">{currentStats.dex}</b> / CON: <b className="text-blue-600">{currentStats.con}</b></span>
            <span>총 스탯: <b>{myTotalStats}</b> (상대: {opponentTotalStats})</span>
          </div>
        </div>

        {/* ================= 5. 결과 화면 (Mode 1: 방식별 비교 vs Mode 2: 코어 매트릭스) ================= */}
        {viewMode === 'THEMES' ? (
          /* [Mode 1] 5가지 방식 가로 비교 뷰 */
          <div className="flex flex-col gap-2 bg-stone-900 p-3 border-2 border-black text-stone-100">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-amber-300">
                👀 5가지 렌더링 방식 결과 비교
              </span>
              <span className="text-[9px] text-stone-400">
                코어: {getCoreVisualConfig(activeCore).name} 적용 중
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 pt-1 pb-1">
              {THEME_OPTIONS.map((opt) => {
                const isSelected = selectedTheme === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedTheme(opt.id)}
                    className={`flex flex-col items-center gap-1.5 p-1.5 cursor-pointer border-2 transition-all ${
                      isSelected ? 'border-amber-400 bg-stone-800 shadow-[0_0_12px_rgba(251,191,36,0.7)]' : 'border-stone-700 hover:border-stone-500 bg-stone-950'
                    }`}
                  >
                    <span className="text-[9px] font-black text-center leading-tight truncate w-full text-stone-300">
                      {opt.id === 'ORIGINAL' ? '기존' : opt.id.replace('OPTION_', '방안 ')}
                    </span>

                    {/* 박스 렌더링 */}
                    {renderBoxVisual(opt.id, activeCore, 52, true)}

                    <span className={`text-[8px] px-1 py-0.2 font-black leading-none ${
                      isSelected ? 'bg-amber-400 text-black' : 'bg-stone-800 text-stone-400'
                    }`}>
                      {isSelected ? '선택됨' : '보기'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* [Mode 2] 5대 코어 동시 매트릭스 뷰 (현재 선택한 테마 기준 코어 5종 나열) */
          <div className="flex flex-col gap-2 bg-stone-900 p-3 border-2 border-black text-stone-100">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-amber-300">
                🔥 [5대 코어 매트릭스] ({THEME_OPTIONS.find(t => t.id === selectedTheme)?.title})
              </span>
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value as ColorThemeType)}
                className="bg-stone-800 text-amber-300 text-[10px] font-black border border-amber-400 px-1 py-0.5 cursor-pointer"
              >
                {THEME_OPTIONS.map(o => (
                  <option key={o.id} value={o.id}>{o.id === 'ORIGINAL' ? '기존' : o.id.replace('OPTION_', '방안 ')}: {o.subtitle}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-5 gap-1.5 pt-1 pb-1">
              {([null, 'FIRE', 'WATER', 'WIND', 'ELECTRIC'] as (CoreType | null)[]).map((cType) => {
                const cInfo = getCoreVisualConfig(cType);
                return (
                  <div
                    key={cType || 'none'}
                    onClick={() => setActiveCore(cType)}
                    className={`flex flex-col items-center gap-1.5 p-1.5 cursor-pointer border-2 bg-stone-950 transition-all ${
                      activeCore === cType ? 'border-amber-400 bg-stone-800 shadow-[0_0_10px_rgba(251,191,36,0.6)]' : 'border-stone-800 hover:border-stone-600'
                    }`}
                  >
                    <span className="text-[9px] font-black text-center truncate w-full text-stone-200">
                      {cInfo.icon} {cInfo.name}
                    </span>

                    {renderBoxVisual(selectedTheme, cType, 50, true)}

                    <span className="text-[8px] text-stone-400 text-center scale-90">
                      {cInfo.tag}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= 6. 선택된 방식 대형 확대 뷰 및 세부 분석 ================= */}
        {(() => {
          const opt = THEME_OPTIONS.find(t => t.id === selectedTheme)!;
          const coreInfo = getCoreVisualConfig(activeCore);

          return (
            <div className="bg-stone-200 border-2 border-black p-3 flex gap-3.5 items-center">
              {/* 대형 80px 박스 */}
              <div className="shrink-0">
                {renderBoxVisual(selectedTheme, activeCore, 80, true)}
              </div>

              {/* 텍스트 설명 */}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-stone-900 leading-tight">
                    {opt.title}
                  </span>
                  <span className="bg-stone-900 text-amber-300 text-[8px] px-1.5 py-0.5 font-black shrink-0">
                    {opt.badge}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-stone-700">
                  <span>{opt.subtitle}</span>
                  <span>•</span>
                  <span className="text-purple-800 font-black">{coreInfo.name} 장착</span>
                </div>
                <p className="text-[10px] text-stone-600 leading-tight">
                  {opt.desc}
                </p>
              </div>
            </div>
          );
        })()}

        {/* ================= 7. 하단 닫기 ================= */}
        <div className="flex justify-end pt-0.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-stone-900 hover:bg-stone-800 text-amber-300 py-2 border-2 border-black font-black text-xs cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
          >
            확인 및 닫기
          </button>
        </div>

      </div>
    </div>
  );
};

// src/components/SkillTreeScreen.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { SKILL_TREE_DATA } from '../constants/skills';
import type { SkillNode, CoreType } from '../types/game';
import { formatNumber } from '../utils/format';

// // [신규] PoE(Path of Exile) 스타일 클러스터링(Cluster Orbit Ring) 배치 엔진
interface ClusterInfo {
    key: string;
    branch: string;
    tier: number;
    cx: number;
    cy: number;
    radius: number;
}

const calculatePoEClusterPositions = (nodes: Record<string, SkillNode>) => {
    const positions: Record<string, { x: number; y: number }> = {};
    const clusters: ClusterInfo[] = [];

    // 1. 브랜치 메인 각도 (360도 5등분)
    const branchBaseAngles: Record<string, number> = {
        'fire': 0,       // 동쪽 (0°)
        'water': 72,     // 남동쪽 (72°)
        'wind': 144,     // 남서쪽 (144°)
        'electric': 216, // 북서쪽 (216°)
        'elec': 216,     // 레가시 호환
        'util': 288      // 북동쪽 (288°)
    };

    const getBranchKey = (id: string): string => {
        if (id.startsWith('fire')) return 'fire';
        if (id.startsWith('water')) return 'water';
        if (id.startsWith('wind')) return 'wind';
        if (id.startsWith('electric') || id.startsWith('elec')) return 'electric';
        if (id.startsWith('util')) return 'util';

        if (nodes[id]?.requires?.length > 0) {
            for (const req of nodes[id].requires) {
                const parentBranch = getBranchKey(req);
                if (parentBranch !== 'unknown') return parentBranch;
            }
        }
        return 'unknown';
    };

    const canvasSize = 18000; // 초대형 캔버스 (클러스터 및 노드 간 겹침 완전 차단)
    const center = canvasSize / 2;

    positions['core_origin'] = { x: center, y: center };

    // 2. 500개 대규모 트리 노드 배치 (PoE Cluster Orbit Algorithm - 넉넉한 시원한 유격 궤도)
    const branches = ['fire', 'water', 'wind', 'electric', 'util'];

    branches.forEach(bKey => {
        const baseAngle = branchBaseAngles[bKey];

        // Tier 1 ~ 10 클러스터 주줄기 허브 생성 (티어간 유격 750px 확보)
        for (let tier = 1; tier <= 10; tier++) {
            const trunkDistance = 600 + tier * 750; // 클러스터 허브 간 유격 750px
            const clusterRad = (baseAngle * Math.PI) / 180;
            const clusterCx = center + trunkDistance * Math.cos(clusterRad);
            const clusterCy = center + trunkDistance * Math.sin(clusterRad);

            const clusterOrbitRadius = 220; // 원형 궤도 반지름 220px (노드 간 및 클러스터 간 간섭 완전 해소)

            clusters.push({
                key: `${bKey}_cluster_${tier}`,
                branch: bKey,
                tier,
                cx: clusterCx,
                cy: clusterCy,
                radius: clusterOrbitRadius
            });

            // 해당 티어의 10개 노드를 360도 원형 링(Circle Orbit) 상에 균등(36도 간격) 배치
            const startNum = (tier - 1) * 10 + 1;
            for (let offset = 0; offset < 10; offset++) {
                const nodeNum = startNum + offset;
                const nodeId = `${bKey}_tree_node_${nodeNum}`;
                if (!nodes[nodeId]) continue;

                // 36도 간격으로 궤도 회전하여 원형으로 깔끔하게 배치
                const nodeOrbitAngle = baseAngle - 90 + offset * 36;
                const nodeRad = (nodeOrbitAngle * Math.PI) / 180;

                positions[nodeId] = {
                    x: clusterCx + clusterOrbitRadius * Math.cos(nodeRad),
                    y: clusterCy + clusterOrbitRadius * Math.sin(nodeRad)
                };
            }
        }
    });

    // 예외 노드 자동 정렬
    Object.keys(nodes).forEach(id => {
        if (!positions[id]) {
            const bKey = getBranchKey(id);
            const baseAngle = branchBaseAngles[bKey] || 0;
            const rad = (baseAngle * Math.PI) / 180;
            positions[id] = {
                x: center + 500 * Math.cos(rad),
                y: center + 500 * Math.sin(rad)
            };
        }
    });

    return { positions, clusters, dynamicCanvasSize: canvasSize };
};

// 반환받은 좌표와 클러스터 오비트 정보 전역 상수화
const { positions: AUTO_NODE_POSITIONS, clusters: POE_CLUSTERS, dynamicCanvasSize: DYNAMIC_CANVAS_SIZE } = calculatePoEClusterPositions(SKILL_TREE_DATA);

const SkillTreeScreen: React.FC = () => {
    const { reincarnationPoints = 0, unlockedSkills = ['core_origin'], unlockSkill, resetSkills } = useGameStore();
    const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);

    /* [수정됨] 기본 배율을 10%(0.1)로 조정하여 모바일에서 한 화면에 전체 500개 노드가 한눈에 조망됨 */
    const [zoom, setZoom] = useState(0.1);
    const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // 해금한 스킬들의 누적 패시브 효과 자동 집계
    const activeSummary = useMemo(() => {
        const summary = {
            count: unlockedSkills.length,
            totalSpentRP: 0,
            flatStats: { str: 0, dex: 0, con: 0 },
            percentStats: { strPercent: 0, dexPercent: 0, conPercent: 0 },
            combo: { chance: 0, multiplier: 0, hitsAdded: 0 },
            utility: { offline: 0, startStage: 0, evasion: 0 },
            coreEffects: {
                FIRE: { baseDamageFlat: 0, strRatio: 0, baseDamageMultiplier: 1 },
                WATER: { initialShieldMultiplier: 0, shieldPerHitRatio: 0, reflectRatio: 0 },
                WIND: { hitEvasionBonus: 0, comboThreshold: 0, evasionThreshold: 0 },
                ELECTRIC: { baseDamageFlat: 0, stunThreshold: 0, executeDamageMultiplier: 0 }
            },
            notables: [] as { id: string; name: string; type: string; desc: string }[],
        };

        unlockedSkills.forEach(id => {
            const node = SKILL_TREE_DATA[id];
            if (!node) return;

            summary.totalSpentRP += node.cost || 0;

            if (node.type === 'NOTABLE' || node.type === 'KEYSTONE') {
                summary.notables.push({ id: node.id, name: node.name, type: node.type, desc: node.description });
            }

            if (node.effects) {
                if (node.effects.str) summary.flatStats.str += node.effects.str;
                if (node.effects.dex) summary.flatStats.dex += node.effects.dex;
                if (node.effects.con) summary.flatStats.con += node.effects.con;

                if (node.effects.strPercent) summary.percentStats.strPercent += node.effects.strPercent;
                if (node.effects.dexPercent) summary.percentStats.dexPercent += node.effects.dexPercent;
                if (node.effects.conPercent) summary.percentStats.conPercent += node.effects.conPercent;

                if (node.effects.comboChance) summary.combo.chance += node.effects.comboChance;
                if (node.effects.comboMultiplier) summary.combo.multiplier += node.effects.comboMultiplier;
                if (node.effects.comboHitsAdded) summary.combo.hitsAdded += node.effects.comboHitsAdded;

                if (node.effects.offlineRewardMultiplier) summary.utility.offline += node.effects.offlineRewardMultiplier;
                if (node.effects.startStageBonus) summary.utility.startStage += node.effects.startStageBonus;
                if (node.effects.evasionChanceBonus) summary.utility.evasion += node.effects.evasionChanceBonus;

                if (node.effects.coreEffects) {
                    (['FIRE', 'WATER', 'WIND', 'ELECTRIC'] as CoreType[]).forEach(cType => {
                        const eff = node.effects?.coreEffects?.[cType];
                        if (eff) {
                            if (eff.baseDamageFlat && cType === 'FIRE') summary.coreEffects.FIRE.baseDamageFlat += eff.baseDamageFlat;
                            if (eff.strRatio) summary.coreEffects.FIRE.strRatio += eff.strRatio;
                            if (eff.baseDamageMultiplier) summary.coreEffects.FIRE.baseDamageMultiplier *= eff.baseDamageMultiplier;

                            if (eff.initialShieldMultiplier) summary.coreEffects.WATER.initialShieldMultiplier += eff.initialShieldMultiplier;
                            if (eff.shieldPerHitRatio) summary.coreEffects.WATER.shieldPerHitRatio += eff.shieldPerHitRatio;
                            if (eff.reflectRatio) summary.coreEffects.WATER.reflectRatio += eff.reflectRatio;

                            if (eff.hitEvasionBonus) summary.coreEffects.WIND.hitEvasionBonus += eff.hitEvasionBonus;
                            if (eff.comboThreshold) summary.coreEffects.WIND.comboThreshold = eff.comboThreshold;
                            if (eff.evasionThreshold) summary.coreEffects.WIND.evasionThreshold = eff.evasionThreshold;

                            if (eff.baseDamageFlat && cType === 'ELECTRIC') summary.coreEffects.ELECTRIC.baseDamageFlat += eff.baseDamageFlat;
                            if (eff.stunThreshold) summary.coreEffects.ELECTRIC.stunThreshold = eff.stunThreshold;
                            if (eff.executeDamageMultiplier) summary.coreEffects.ELECTRIC.executeDamageMultiplier += eff.executeDamageMultiplier;
                        }
                    });
                }
            }
        });

        return summary;
    }, [unlockedSkills]);

    // 특정한 가지(Branch) 방향으로 카메라 시점 자동 이동 및 줌 배율 자동 맞춤
    const navigateToBranch = (branchKey: string) => {
        setSelectedBranchFilter(branchKey);
        if (!scrollContainerRef.current) return;
        const container = scrollContainerRef.current;
        const center = DYNAMIC_CANVAS_SIZE / 2;

        let targetX = center;
        let targetY = center;

        if (branchKey === 'ALL') {
            setZoom(0.1);
            setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollLeft = (DYNAMIC_CANVAS_SIZE * 0.1 - container.clientWidth) / 2;
                    scrollContainerRef.current.scrollTop = (DYNAMIC_CANVAS_SIZE * 0.1 - container.clientHeight) / 2;
                }
            }, 0);
            return;
        }

        const targetZoom = 0.25; // 개별 브랜치 클릭 시 보기 좋은 줌 레벨
        setZoom(targetZoom);

        if (branchKey === 'fire') { targetX = center + 3000; targetY = center; }
        else if (branchKey === 'water') { targetX = center + 1800; targetY = center + 2400; }
        else if (branchKey === 'wind') { targetX = center - 1800; targetY = center + 2400; }
        else if (branchKey === 'elec' || branchKey === 'electric') { targetX = center - 1800; targetY = center - 2400; }
        else if (branchKey === 'util') { targetX = center + 1800; targetY = center - 2400; }

        setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollLeft = targetX * targetZoom - container.clientWidth / 2;
                scrollContainerRef.current.scrollTop = targetY * targetZoom - container.clientHeight / 2;
            }
        }, 0);
    };

    // 컴포넌트 마운트 시 스크롤을 줌 비율에 맞춰 중앙(core_origin)으로 자동 이동
    useEffect(() => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            container.scrollLeft = ((DYNAMIC_CANVAS_SIZE * zoom) - container.clientWidth) / 2;
            container.scrollTop = ((DYNAMIC_CANVAS_SIZE * zoom) - container.clientHeight) / 2;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 처음 렌더링될 때 한 번만 실행

    // 화면 중앙을 유지하며 줌 인/아웃을 처리하는 함수
    const handleZoom = (delta: number) => {
        const nextZoom = Math.max(0.05, Math.min(Math.round((zoom + delta) * 100) / 100, 1.5));
        if (nextZoom === zoom) return;

        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const W = container.clientWidth;
            const H = container.clientHeight;
            const currentCenterX = (container.scrollLeft + W / 2) / zoom;
            const currentCenterY = (container.scrollTop + H / 2) / zoom;

            setZoom(nextZoom);

            setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollLeft = currentCenterX * nextZoom - W / 2;
                    scrollContainerRef.current.scrollTop = currentCenterY * nextZoom - H / 2;
                }
            }, 0);
        }
    };

    const getNodeStyle = (type: string, isUnlocked: boolean, isSelectable: boolean) => {
        const baseStyle = "absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer transition-all text-sm font-mono font-black z-10 hover:scale-125 hover:z-30 p-1 active:scale-95";

        let colorClass = "bg-stone-800 text-stone-500 border-stone-600 border-2 hover:border-stone-400"; // 잠김
        if (isUnlocked) {
            colorClass = "bg-amber-400 text-black border-black border-2 shadow-[0_0_16px_#facc15] z-20"; // 해금됨
        } else if (isSelectable) {
            colorClass = "bg-blue-600 text-white border-blue-300 border-2 shadow-[0_0_16px_rgba(59,130,246,0.8)] animate-pulse z-20 hover:bg-blue-500"; // 해금 가능
        }

        let shapeClass = "w-12 h-12 rounded-none"; // NORMAL
        if (type === 'NOTABLE') shapeClass = "w-14 h-14 rounded-none border-2 rotate-45"; // NOTABLE
        if (type === 'KEYSTONE') shapeClass = "w-16 h-16 rounded-none border-double border-4"; // KEYSTONE

        return `${baseStyle} ${colorClass} ${shapeClass}`;
    };

    const handleUnlock = () => {
        if (selectedNode) unlockSkill(selectedNode.id);
    };

    return (
        /* [RENEWAL] 고전 아케이드 게임기 본체 전용 프레임 일체화
           - 각진 모서리, 단단한 border-4 border-black 명세 가동.
           - 연한 모눈종이 8비트 격자무늬(linear-gradient) 주입 완료.
        */
        <div
            className="max-w-md mx-auto p-4 rounded-none border-4 border-black bg-stone-100 w-full flex flex-col gap-3 text-stone-900 font-mono select-none text-xs shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-grow"
            style={{
                backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
            }}
        >

            {/* 헤더: 슬레어의 석판 대시보드로 통일화 */}
            <div className="bg-stone-300 p-3 rounded-none border-4 border-black w-full flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black">
                <div className="flex items-center gap-2">
                    <h2 className="text-xs font-black text-stone-600 tracking-widest uppercase leading-none">
                        -[ 500PASSIVE_TREE ]-
                    </h2>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-500 uppercase">RP_POOL:</span>
                    <span className="text-sm font-mono font-black text-purple-700">{formatNumber(reincarnationPoints)} RP</span>
                </div>
            </div>

            {/* 상단 상시 스킬 요약 대시보드 패널 (Active Skill Summary Dashboard) */}
            <div className="bg-stone-300 border-2 border-black p-2 flex flex-col gap-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between items-center text-[10px] font-black border-b border-black/20 pb-1">
                    <div className="flex items-center gap-1.5">
                        <span className="text-purple-900 font-black">📊 찍은 스킬 누적 효과 요약</span>
                        <span className="bg-purple-900 text-white text-[8px] font-mono px-1.5 py-0.2 border border-black">
                            {activeSummary.count} / 500 개 ({activeSummary.totalSpentRP.toLocaleString()} RP)
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                            className="text-[9px] bg-stone-200 hover:bg-stone-100 text-black px-1.5 py-0.5 border border-black cursor-pointer font-bold active:translate-y-[1px]"
                        >
                            {isSummaryExpanded ? '접기 ▲' : '펼치기 ▼'}
                        </button>
                        <button
                            onClick={() => setShowSummaryModal(true)}
                            className="text-[9px] bg-purple-900 hover:bg-purple-800 text-white px-2 py-0.5 border border-black cursor-pointer font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px]"
                        >
                            전체팝업 🔍
                        </button>
                    </div>
                </div>

                {/* 펼쳐진 상단 대시보드 카드리스트 */}
                {isSummaryExpanded ? (
                    <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono">
                        {/* 1. 스탯 누적 */}
                        <div className="bg-white/90 p-1.5 border border-black flex flex-col justify-between">
                            <span className="text-stone-500 font-bold text-[8px] flex justify-between border-b border-stone-200 pb-0.5">
                                <span>💪 캐릭터 스탯</span>
                            </span>
                            <div className="font-black text-stone-900 text-[9px] leading-tight mt-1 flex justify-between">
                                <span>STR</span>
                                <div><span className="text-red-700">+{activeSummary.flatStats.str}</span><span className="text-[7.5px] text-red-500 ml-0.5">({(activeSummary.percentStats.strPercent * 100).toFixed(0)}%)</span></div>
                            </div>
                            <div className="font-black text-stone-900 text-[9px] leading-tight flex justify-between">
                                <span>DEX</span>
                                <div><span className="text-emerald-700">+{activeSummary.flatStats.dex}</span><span className="text-[7.5px] text-emerald-500 ml-0.5">({(activeSummary.percentStats.dexPercent * 100).toFixed(0)}%)</span></div>
                            </div>
                            <div className="font-black text-stone-900 text-[9px] leading-tight flex justify-between">
                                <span>CON</span>
                                <div><span className="text-blue-700">+{activeSummary.flatStats.con}</span><span className="text-[7.5px] text-blue-500 ml-0.5">({(activeSummary.percentStats.conPercent * 100).toFixed(0)}%)</span></div>
                            </div>
                        </div>

                        {/* 2. 연격(Combo) 시스템 */}
                        <div className="bg-white/90 p-1.5 border border-black flex flex-col justify-between">
                            <span className="text-stone-500 font-bold text-[8px] border-b border-stone-200 pb-0.5">
                                ⚔️ 연격(Combo)
                            </span>
                            <div className="font-bold text-stone-800 text-[8.5px] leading-tight mt-1 flex justify-between">
                                <span>발생확률:</span>
                                <span className="text-purple-700 font-black">+{(activeSummary.combo.chance * 100).toFixed(1)}%</span>
                            </div>
                            <div className="font-bold text-stone-800 text-[8.5px] leading-tight flex justify-between">
                                <span>피해배율:</span>
                                <span className="text-purple-700 font-black">+{(activeSummary.combo.multiplier * 100).toFixed(0)}%</span>
                            </div>
                            <div className="font-bold text-stone-800 text-[8.5px] leading-tight flex justify-between">
                                <span>추가타격:</span>
                                <span className="text-purple-700 font-black">+{activeSummary.combo.hitsAdded}타</span>
                            </div>
                        </div>

                        {/* 3. 유틸 및 핵심 노터블 */}
                        <div className="bg-white/90 p-1.5 border border-black flex flex-col justify-between">
                            <span className="text-stone-500 font-bold text-[8px] border-b border-stone-200 pb-0.5">
                                🌟 노터블/유틸
                            </span>
                            <div className="font-bold text-stone-800 text-[8.5px] leading-tight mt-1 flex justify-between">
                                <span>주요노드:</span>
                                <span className="text-purple-900 font-black">{activeSummary.notables.length}개 해금</span>
                            </div>
                            <div className="font-bold text-stone-800 text-[8.5px] leading-tight flex justify-between">
                                <span>시작층수:</span>
                                <span className="text-amber-700 font-black">+{activeSummary.utility.startStage}층</span>
                            </div>
                            <div className="font-bold text-stone-800 text-[8.5px] leading-tight flex justify-between">
                                <span>오프라인:</span>
                                <span className="text-green-700 font-black">+{(activeSummary.utility.offline * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between text-[8.5px] font-mono font-black text-stone-800 bg-white/80 p-1 border border-black/40">
                        <span>💪 STR+{activeSummary.flatStats.str} | DEX+{activeSummary.flatStats.dex} | CON+{activeSummary.flatStats.con}</span>
                        <span className="text-purple-800">⚔️ 연격확률 +{(activeSummary.combo.chance * 100).toFixed(1)}%</span>
                        <span className="text-amber-800">🌟 주요노드 {activeSummary.notables.length}개</span>
                    </div>
                )}
            </div>

            {/* 5대 성운 브랜치 신속 이동 네비게이터 */}
            <div className="grid grid-cols-6 gap-1 w-full text-[9px] font-black">
                <button
                    onClick={() => navigateToBranch('ALL')}
                    className={`py-1 border border-black rounded-none cursor-pointer ${selectedBranchFilter === 'ALL' ? 'bg-black text-white' : 'bg-stone-200 text-black hover:bg-stone-300'}`}
                >
                    전체
                </button>
                <button
                    onClick={() => navigateToBranch('fire')}
                    className={`py-1 border border-black rounded-none cursor-pointer ${selectedBranchFilter === 'fire' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-900 hover:bg-red-200'}`}
                >
                    🔥불
                </button>
                <button
                    onClick={() => navigateToBranch('water')}
                    className={`py-1 border border-black rounded-none cursor-pointer ${selectedBranchFilter === 'water' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-900 hover:bg-blue-200'}`}
                >
                    💧물
                </button>
                <button
                    onClick={() => navigateToBranch('wind')}
                    className={`py-1 border border-black rounded-none cursor-pointer ${selectedBranchFilter === 'wind' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'}`}
                >
                    🍃연격
                </button>
                <button
                    onClick={() => navigateToBranch('elec')}
                    className={`py-1 border border-black rounded-none cursor-pointer ${selectedBranchFilter === 'elec' ? 'bg-amber-500 text-black' : 'bg-amber-100 text-amber-900 hover:bg-amber-200'}`}
                >
                    ⚡번개
                </button>
                <button
                    onClick={() => navigateToBranch('util')}
                    className={`py-1 border border-black rounded-none cursor-pointer ${selectedBranchFilter === 'util' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-900 hover:bg-purple-200'}`}
                >
                    🌀유틸
                </button>
            </div>

            {/* 줌 컨트롤러 바 - 기계식 조작 패널 단추로 개편 */}
            <div className="flex justify-between items-center gap-1 mb-[-4px] z-10 pr-1">
                <button
                    onClick={resetSkills}
                    className="bg-red-600 hover:bg-red-500 text-white border-2 border-black border-b-4 px-2.5 py-0.5 font-black rounded-none active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer text-[10px]"
                >
                    스킬 초기화
                </button>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => navigateToBranch('ALL')}
                        className="bg-purple-800 hover:bg-purple-700 text-white border-2 border-black border-b-4 px-2 py-0.5 font-black rounded-none active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer text-[10px]"
                        title="전체 한눈에 보기 (10%)"
                    >
                        10%전체
                    </button>
                    <button
                        onClick={() => handleZoom(-0.05)}
                        className="bg-stone-100 hover:bg-stone-50 text-black border-2 border-black border-b-4 px-2 py-0.5 font-black rounded-none active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer text-[11px]"
                    >
                        -
                    </button>
                    <span className="text-[10px] font-black text-stone-700 w-12 text-center bg-stone-200 border-2 border-black py-0.5">{Math.round(zoom * 100)}%</span>
                    <button
                        onClick={() => handleZoom(0.05)}
                        className="bg-stone-100 hover:bg-stone-50 text-black border-2 border-black border-b-4 px-2 py-0.5 font-black rounded-none active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer text-[11px]"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* 스크롤 캔버스: 아케이드 뷰포트 크기 최적화 (h-[52vh]) */}
            <div
                ref={scrollContainerRef}
                className="relative w-full h-[52vh] bg-neutral-950 rounded-none border-4 border-black overflow-auto custom-scrollbar"
                style={{
                    boxShadow: 'inset 4px 4px 0px rgba(0,0,0,0.3)'
                }}
            >
                {/* 스크롤바와 줌 비율을 완벽히 동기화하기 위한 Wrapper 크기 제어 */}
                <div style={{ width: `${DYNAMIC_CANVAS_SIZE * zoom}px`, height: `${DYNAMIC_CANVAS_SIZE * zoom}px` }} className="relative">
                    {/* 실제 스킬 트리가 그려지는 거대한 배경 (Transform으로 Scale 처리) */}
                    <div
                        className="absolute top-0 left-0 bg-neutral-950"
                        style={{
                            width: `${DYNAMIC_CANVAS_SIZE}px`,
                            height: `${DYNAMIC_CANVAS_SIZE}px`,
                            transform: `scale(${zoom})`,
                            transformOrigin: '0 0',
                            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
                            backgroundSize: '24px 24px'
                        }}
                    >
                        {/* SVG 연결선 및 PoE 클러스터 오비트 링 */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                            {/* 1. PoE 클러스터 원형 백드롭 오비트 링 (Cluster Orbit Circles & Labels) */}
                            {POE_CLUSTERS.map(cluster => {
                                const branchNames: Record<string, string> = {
                                    fire: '🔥 FIRE',
                                    water: '💧 WATER',
                                    wind: '🍃 WIND (COMBO)',
                                    electric: '⚡ ELEC (STUN)',
                                    util: '🌀 UTIL'
                                };
                                const branchName = branchNames[cluster.branch] || cluster.branch.toUpperCase();

                                return (
                                    <g key={cluster.key}>
                                        {/* 원형 궤도 가이드선 */}
                                        <circle
                                            cx={cluster.cx}
                                            cy={cluster.cy}
                                            r={cluster.radius}
                                            fill="none"
                                            stroke="#475569"
                                            strokeWidth="2"
                                            strokeDasharray="6 6"
                                            className="opacity-75"
                                        />
                                        {/* 클러스터 중심 포인트 */}
                                        <circle
                                            cx={cluster.cx}
                                            cy={cluster.cy}
                                            r="8"
                                            fill="#1e293b"
                                            stroke="#facc15"
                                            strokeWidth="2"
                                        />
                                        {/* 클러스터 티어 명칭 라벨 (PoE 감성 서명) */}
                                        <text
                                            x={cluster.cx}
                                            y={cluster.cy - cluster.radius - 18}
                                            fill="#94a3b8"
                                            fontSize="22"
                                            fontWeight="900"
                                            fontFamily="monospace"
                                            textAnchor="middle"
                                            className="uppercase tracking-widest select-none"
                                        >
                                            {branchName} - TIER {cluster.tier}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* 2. SVG 노드 연결선 */}
                            {Object.values(SKILL_TREE_DATA).map(node => {
                                return node.requires.map(reqId => {
                                    const start = AUTO_NODE_POSITIONS[reqId];
                                    const end = AUTO_NODE_POSITIONS[node.id];
                                    if (!start || !end) return null;

                                    const isPathActive = unlockedSkills.includes(reqId) && unlockedSkills.includes(node.id);

                                    return (
                                        <line
                                            key={`${reqId}-${node.id}`}
                                            x1={start.x}
                                            y1={start.y}
                                            x2={end.x}
                                            y2={end.y}
                                            stroke={isPathActive ? '#facc15' : '#334155'}
                                            strokeWidth={isPathActive ? "4" : "2"}
                                            style={{ shapeRendering: 'crispEdges' }}
                                            className="transition-colors duration-500"
                                        />
                                    );
                                });
                            })}
                        </svg>

                        {/* 노드 렌더링 */}
                        {Object.values(SKILL_TREE_DATA).map(node => {
                            const pos = AUTO_NODE_POSITIONS[node.id];
                            if (!pos) return null;

                            const isUnlocked = unlockedSkills.includes(node.id);
                            const hasPrerequisites = node.requires.every(reqId => unlockedSkills.includes(reqId));
                            const isSelectable = !isUnlocked && hasPrerequisites && reincarnationPoints >= node.cost;

                            return (
                                <div
                                    key={node.id}
                                    className={getNodeStyle(node.type, isUnlocked, isSelectable)}
                                    style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                                    onClick={() => setSelectedNode(node)}
                                >
                                    <div className={node.type === 'NOTABLE' ? '-rotate-45' : ''}>
                                        {isUnlocked ? '✓' : ''}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 상세 패널: 기계식 정보 수치 모듈창 형태로 리폼 */}
            {selectedNode && (
                <div className="bg-stone-200 p-3 rounded-none border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-1.5 w-full">
                    <div className="flex justify-between items-center border-b border-black/10 pb-1 w-full">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[9px] font-black border border-current px-1.5 py-0.5 leading-none bg-white/40 tracking-tight uppercase shrink-0">
                                {selectedNode.type}
                            </span>
                            <h3 className="text-xs font-black text-black truncate uppercase leading-none">
                                {selectedNode.name}
                            </h3>
                        </div>
                        <button
                            onClick={() => setSelectedNode(null)}
                            className="w-5 h-5 flex justify-center items-center rounded-none border border-black bg-stone-100 hover:bg-stone-50 font-black text-[9px] cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>

                    <p className="text-[11px] font-bold text-stone-600 bg-white/50 border border-black/5 p-2 leading-relaxed break-keep">
                        {selectedNode.description}
                    </p>

                    <div className="flex items-center justify-between pt-1.5 border-t border-dashed border-black/20 w-full">
                        <div className="text-[11px] font-black font-mono">
                            REQ: <span className={reincarnationPoints >= selectedNode.cost ? 'text-green-700' : 'text-red-600'}>{formatNumber(selectedNode.cost)} RP</span>
                        </div>

                        {unlockedSkills.includes(selectedNode.id) ? (
                            <div className="py-1 px-3 bg-stone-300 text-stone-500 font-black text-[10px] border border-stone-400 uppercase tracking-wider cursor-not-allowed">
                                UNLOCKED [보유]
                            </div>
                        ) : (
                            <button
                                onClick={handleUnlock}
                                disabled={!selectedNode.requires.every(reqId => unlockedSkills.includes(reqId)) || reincarnationPoints < selectedNode.cost}
                                /* 기계식 해금 스위치 푸시 질감 부여 */
                                className="py-1 px-4 bg-purple-700 hover:bg-purple-600 disabled:bg-stone-300 disabled:text-stone-400 disabled:border-stone-400 disabled:shadow-none text-white font-black text-[10px] rounded-none border-2 border-black border-b-4 shadow-[1px_1px_0px_rgba(255,255,255,0.3)_inset] active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer uppercase tracking-widest"
                            >
                                ACTIVATE [개방]
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* 해금 스킬 종합 요약 모달 */}
            {showSummaryModal && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 animate-fade-in font-mono">
                    <div className="bg-stone-200 border-4 border-black p-4 w-full max-w-md max-h-[85vh] flex flex-col gap-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-stone-900 overflow-hidden">
                        {/* 모달 헤더 */}
                        <div className="flex justify-between items-center border-b-2 border-black pb-2">
                            <div>
                                <h3 className="text-xs font-black text-purple-900 tracking-wider flex items-center gap-1.5 uppercase">
                                    <span>📊</span> PASSIVE_SKILL_SUMMARY
                                </h3>
                                <div className="text-[10px] text-stone-600 font-bold mt-0.5">
                                    해금 노드: <span className="text-purple-700 font-black">{activeSummary.count} / 500</span>개 | 사용 RP: <span className="text-amber-700 font-black">{activeSummary.totalSpentRP.toLocaleString()}</span> RP
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSummaryModal(false)}
                                className="w-7 h-7 bg-red-600 hover:bg-red-500 text-white font-black border-2 border-black flex items-center justify-center cursor-pointer text-xs active:translate-y-[1px]"
                            >
                                ✕
                            </button>
                        </div>

                        {/* 모달 스크롤 바디 */}
                        <div className="overflow-y-auto custom-scrollbar flex flex-col gap-2.5 pr-1 text-xs">
                            {/* 1. 스탯 종합 보너스 */}
                            <div className="bg-white/80 p-2.5 border-2 border-black flex flex-col gap-1.5">
                                <h4 className="text-[11px] font-black text-black border-b border-black/20 pb-1">
                                    💪 캐릭터 기본 스탯 보너스
                                </h4>
                                <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center font-bold">
                                    <div className="bg-red-50 border border-red-300 p-1.5">
                                        <div className="text-red-800 font-black">힘 (STR)</div>
                                        <div className="text-black font-extrabold mt-0.5">+{activeSummary.flatStats.str}</div>
                                        <div className="text-red-600 text-[9px]">(+{(activeSummary.percentStats.strPercent * 100).toFixed(0)}%)</div>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-300 p-1.5">
                                        <div className="text-emerald-800 font-black">민첩 (DEX)</div>
                                        <div className="text-black font-extrabold mt-0.5">+{activeSummary.flatStats.dex}</div>
                                        <div className="text-emerald-600 text-[9px]">(+{(activeSummary.percentStats.dexPercent * 100).toFixed(0)}%)</div>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-300 p-1.5">
                                        <div className="text-blue-800 font-black">체력 (CON)</div>
                                        <div className="text-black font-extrabold mt-0.5">+{activeSummary.flatStats.con}</div>
                                        <div className="text-blue-600 text-[9px]">(+{(activeSummary.percentStats.conPercent * 100).toFixed(0)}%)</div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. 연격 & 유틸리티 */}
                            <div className="bg-white/80 p-2.5 border-2 border-black flex flex-col gap-1.5">
                                <h4 className="text-[11px] font-black text-black border-b border-black/20 pb-1">
                                    ⚔️ 연격(Combo) & 유틸리티 옵션
                                </h4>
                                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
                                    <div className="bg-stone-100 p-1.5 border border-stone-300">
                                        연격 발생 확률: <span className="text-purple-700 font-black">+{(activeSummary.combo.chance * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="bg-stone-100 p-1.5 border border-stone-300">
                                        연격 피해 배율: <span className="text-purple-700 font-black">+{(activeSummary.combo.multiplier * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="bg-stone-100 p-1.5 border border-stone-300">
                                        추가 연격 타격: <span className="text-purple-700 font-black">+{activeSummary.combo.hitsAdded}타</span>
                                    </div>
                                    <div className="bg-stone-100 p-1.5 border border-stone-300">
                                        시작 스테이지: <span className="text-amber-700 font-black">+{activeSummary.utility.startStage}층</span>
                                    </div>
                                    <div className="bg-stone-100 p-1.5 border border-stone-300 col-span-2">
                                        오프라인 보상 증폭: <span className="text-green-700 font-black">+{(activeSummary.utility.offline * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. 코어 강화 효과 */}
                            <div className="bg-white/80 p-2.5 border-2 border-black flex flex-col gap-1.5">
                                <h4 className="text-[11px] font-black text-black border-b border-black/20 pb-1">
                                    🌀 4대 속성 코어 패시브 강화
                                </h4>
                                <div className="flex flex-col gap-1 text-[10px] font-bold">
                                    <div className="bg-red-50 p-1.5 border border-red-200">
                                        <span className="text-red-800 font-black">🔥 화염:</span> 피해 +{activeSummary.coreEffects.FIRE.baseDamageFlat.toFixed(1)} | 힘 계수 +{(activeSummary.coreEffects.FIRE.strRatio * 100).toFixed(0)}% | 증폭 {activeSummary.coreEffects.FIRE.baseDamageMultiplier.toFixed(1)}배
                                    </div>
                                    <div className="bg-blue-50 p-1.5 border border-blue-200">
                                        <span className="text-blue-800 font-black">💧 물:</span> 시작 쉴드 +{(activeSummary.coreEffects.WATER.initialShieldMultiplier * 100).toFixed(0)}% | 타격 회복 +{(activeSummary.coreEffects.WATER.shieldPerHitRatio * 100).toFixed(2)}% | 피해 반사 +{(activeSummary.coreEffects.WATER.reflectRatio * 100).toFixed(0)}%
                                    </div>
                                    <div className="bg-emerald-50 p-1.5 border border-emerald-200">
                                        <span className="text-emerald-800 font-black">🍃 바람:</span> 명중/회피 +{(activeSummary.coreEffects.WIND.hitEvasionBonus * 100).toFixed(1)}% {activeSummary.coreEffects.WIND.comboThreshold > 0 && `| ${activeSummary.coreEffects.WIND.comboThreshold}타 연격`}
                                    </div>
                                    <div className="bg-amber-50 p-1.5 border border-amber-200">
                                        <span className="text-amber-800 font-black">⚡ 번개:</span> 피해 +{activeSummary.coreEffects.ELECTRIC.baseDamageFlat.toFixed(1)} {activeSummary.coreEffects.ELECTRIC.stunThreshold > 0 && `| ${activeSummary.coreEffects.ELECTRIC.stunThreshold}타 기절`} | 기절 처형 +{(activeSummary.coreEffects.ELECTRIC.executeDamageMultiplier * 100).toFixed(0)}%
                                    </div>
                                </div>
                            </div>

                            {/* 4. 해금된 노터블 / 키스톤 스킬 목록 */}
                            <div className="bg-white/80 p-2.5 border-2 border-black flex flex-col gap-1.5">
                                <h4 className="text-[11px] font-black text-black border-b border-black/20 pb-1 flex justify-between">
                                    <span>🌟 주요 해금 노터블 노드 ({activeSummary.notables.length}개)</span>
                                </h4>
                                {activeSummary.notables.length === 0 ? (
                                    <div className="text-[10px] text-stone-400 font-bold py-2 text-center">
                                        아직 해금된 노터블 / 키스톤 노드가 없습니다.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                                        {activeSummary.notables.map(item => (
                                            <div key={item.id} className="bg-purple-50 p-1.5 border border-purple-200 flex flex-col gap-0.5">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-purple-900 font-black text-[10px]">{item.name}</span>
                                                    <span className="text-[8px] bg-purple-200 text-purple-900 font-black px-1 border border-purple-400 uppercase">{item.type}</span>
                                                </div>
                                                <p className="text-[9px] text-stone-600 font-bold leading-tight">{item.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setShowSummaryModal(false)}
                            className="w-full bg-black hover:bg-neutral-800 text-white font-black py-2 text-xs border-2 border-black active:translate-y-[1px] cursor-pointer mt-1"
                        >
                            닫기 (CLOSE)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SkillTreeScreen;
// src/components/SkillTreeScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { SKILL_TREE_DATA } from '../constants/skills';
import type { SkillNode } from '../types/game';

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

    /* [수정됨] 기본 배율을 10%(0.1)로 조정하여 모바일에서 한 화면에 전체 500개 노드가 한눈에 조망됨 */
    const [zoom, setZoom] = useState(0.1);
    const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

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
                <h2 className="text-xs font-black text-stone-500 tracking-widest uppercase leading-none">
                    -[ 500PASSIVE_TREE ]-
                </h2>
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-500 uppercase">RP_POOL:</span>
                    <span className="text-sm font-mono font-black text-purple-700">{reincarnationPoints} RP</span>
                </div>
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
                            REQ: <span className={reincarnationPoints >= selectedNode.cost ? 'text-green-700' : 'text-red-600'}>{selectedNode.cost} RP</span>
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
        </div>
    );
};

export default SkillTreeScreen;
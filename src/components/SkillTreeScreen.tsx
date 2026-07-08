// src/components/SkillTreeScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { SKILL_TREE_DATA } from '../constants/skills';
import type { SkillNode } from '../types/game';

// [신규] 스킬 트리의 연결 관계(requires)를 분석하여 방사형(Radial)으로 자동 배치하는 엔진
const calculateAutoPositions = (nodes: Record<string, SkillNode>) => {
    const positions: Record<string, { x: number; y: number }> = {};
    const angles: Record<string, number> = {};
    const depths: Record<string, number> = {};

    // 1. 깊이(Depth) 계산: 중심점(core_origin)에서 몇 칸 떨어져 있는지 파악
    const calcDepth = (id: string): number => {
        if (depths[id] !== undefined) return depths[id];
        if (!nodes[id] || nodes[id].requires.length === 0) {
            depths[id] = 0;
            return 0;
        }
        depths[id] = Math.max(...nodes[id].requires.map(calcDepth)) + 1;
        return depths[id];
    };
    Object.keys(nodes).forEach(calcDepth);

    // 2. 1티어 노드(중앙에서 바로 뻗어나온 가지)들에게 360도를 N등분하여 기본 각도 배정
    const originChildren = Object.keys(nodes).filter(id => depths[id] === 1);
    originChildren.forEach((id, index) => {
        angles[id] = (360 / originChildren.length) * index;
    });

    // 3. 자식 노드들에게 부모의 각도 상속 및 형제간 겹침 방지 벌림 처리
    const calcAngle = (id: string): number => {
        if (angles[id] !== undefined) return angles[id];
        if (depths[id] === 0) return 0;

        const parents = nodes[id].requires;
        const parentAngles = parents.map(p => calcAngle(p));
        const avgAngle = parentAngles.reduce((sum, val) => sum + val, 0) / parentAngles.length;

        const mainParent = parents[0];
        const siblings = Object.keys(nodes).filter(n => nodes[n].requires.includes(mainParent));

        if (siblings.length > 1) {
            const myIndex = siblings.indexOf(id);
            const offset = (myIndex - (siblings.length - 1) / 2) * 20;
            angles[id] = avgAngle + offset;
        } else {
            angles[id] = avgAngle;
        }
        return angles[id];
    };
    Object.keys(nodes).forEach(calcAngle);

    // [수정됨] TS6133 빌드 에러를 유발하던 미사용 유령 함수(getMaxUpgrades)를 완벽하게 도려내어 청소했습니다.
    const maxDepth = Math.max(...Object.values(depths), 0);
    const canvasSize = Math.max(1200, maxDepth * 350);

    // 좌표 명세 생성
    Object.keys(nodes).forEach(id => {
        if (id === 'core_origin') {
            positions[id] = { x: canvasSize / 2, y: canvasSize / 2 };
            return;
        }
        const depth = depths[id] || 1;
        const angle = angles[id] || 0;
        const radius = depth * 140; 
        const radian = (angle * Math.PI) / 180;
        positions[id] = {
            x: (canvasSize / 2) + radius * Math.cos(radian),
            y: (canvasSize / 2) + radius * Math.sin(radian)
        };
    });

    return { positions, dynamicCanvasSize: canvasSize };
};

// 반환받은 좌표와 동적 캔버스 사이즈를 전역 상수로 꺼내옵니다.
const { positions: AUTO_NODE_POSITIONS, dynamicCanvasSize: DYNAMIC_CANVAS_SIZE } = calculateAutoPositions(SKILL_TREE_DATA);

const SkillTreeScreen: React.FC = () => {
    const { reincarnationPoints = 0, unlockedSkills = ['core_origin'], unlockSkill } = useGameStore();
    const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
    
    /* [수정됨] 기본 배율 조율 (1.0 -> 0.5)
       - 진입 시 스킬 트리가 너무 조금 보이는 현상을 해결하기 위해 디폴트 배율을 50%로 축소했습니다.
       - 시야 영역이 4배 넓어져 천 개 규모로 확장될 거대 성운형 노드의 줄기들을 한눈에 조망할 수 있습니다.
    */
    const [zoom, setZoom] = useState(0.5);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // 컴포넌트 마운트 시 스크롤을 줌 비율(50%)에 맞춰 중앙(core_origin)으로 자동 이동
    useEffect(() => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            container.scrollLeft = ((DYNAMIC_CANVAS_SIZE * zoom) - container.clientWidth) / 2;
            container.scrollTop = ((DYNAMIC_CANVAS_SIZE * zoom) - container.clientHeight) / 2;
        }
    }, []); // 처음 렌더링될 때 한 번만 실행

    // 화면 중앙을 유지하며 줌 인/아웃을 처리하는 함수
    const handleZoom = (delta: number) => {
        const nextZoom = Math.max(0.1, Math.min(Math.round((zoom + delta) * 10) / 10, 2.0));
        if (nextZoom === zoom) return;

        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            // 1. 현재 스크롤바 기준 화면의 정중앙 픽셀 좌표 구하기
            const W = container.clientWidth;
            const H = container.clientHeight;
            const currentCenterX = (container.scrollLeft + W / 2) / zoom;
            const currentCenterY = (container.scrollTop + H / 2) / zoom;

            // 2. 줌 상태 업데이트
            setZoom(nextZoom);

            // 3. React 렌더링이 끝나고 캔버스 크기가 변한 직후(setTimeout 0), 스크롤바 위치를 새로운 배율에 맞춰 보정
            setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollLeft = currentCenterX * nextZoom - W / 2;
                    scrollContainerRef.current.scrollTop = currentCenterY * nextZoom - H / 2;
                }
            }, 0);
        }
    };

    const getNodeStyle = (type: string, isUnlocked: boolean, isSelectable: boolean) => {
        const baseStyle = "absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer transition-all text-xs font-mono font-black z-10 hover:scale-110";

        let colorClass = "bg-stone-300 border-stone-400 text-stone-400 opacity-60 border-2"; // 잠김
        if (isUnlocked) {
            colorClass = "bg-amber-400 text-black border-black border-2 shadow-[0_0_12px_#facc15] z-20"; // 해금됨
        } else if (isSelectable) {
            colorClass = "bg-blue-600 text-white border-blue-400 border-2 shadow-[0_0_12px_rgba(59,130,246,0.6)] animate-pulse z-20"; // 해금 가능
        }

        let shapeClass = "w-9 h-9 rounded-none"; // NORMAL (직각 픽셀 블록화)
        if (type === 'NOTABLE') shapeClass = "w-11 h-11 rounded-none border-2 rotate-45"; // NOTABLE
        if (type === 'KEYSTONE') shapeClass = "w-14 h-14 rounded-none border-double border-4"; // KEYSTONE

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
            className="max-w-md mx-auto p-4 rounded-none border-4 border-black bg-stone-100 w-full flex flex-col gap-3 text-stone-900 font-mono select-none text-xs shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            style={{
                backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
            }}
        >

            {/* 헤더: 슬레어의 석판 대시보드로 통일화 */}
            <div className="bg-stone-300 p-3 rounded-none border-4 border-black w-full flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black">
                <h2 className="text-xs font-black text-stone-500 tracking-widest uppercase leading-none">
                    -[ SKILL_TREE ]-
                </h2>
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-500 uppercase">RP_POOL:</span>
                    <span className="text-sm font-mono font-black text-purple-700">{reincarnationPoints} RP</span>
                </div>
            </div>

            {/* 줌 컨트롤러 바 - 기계식 조작 패널 단추로 개편 */}
            <div className="flex justify-end items-center gap-1 mb-[-4px] z-10 pr-1">
                <button 
                    onClick={() => handleZoom(-0.1)} 
                    className="bg-stone-100 hover:bg-stone-50 text-black border-2 border-black border-b-4 px-2.5 py-0.5 font-black rounded-none active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer text-[11px]"
                >
                    -
                </button>
                <span className="text-[10px] font-black text-stone-500 w-12 text-center bg-stone-200 border-2 border-black py-0.5">{Math.round(zoom * 100)}%</span>
                <button 
                    onClick={() => handleZoom(0.1)} 
                    className="bg-stone-100 hover:bg-stone-50 text-black border-2 border-black border-b-4 px-2 py-0.5 font-black rounded-none active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer text-[11px]"
                >
                    +
                </button>
            </div>

            {/* 스크롤 캔버스: 아케이드 뷰포트 크기 최적화 (h-[40vh]) */}
            <div
                ref={scrollContainerRef}
                className="relative w-full h-[40vh] bg-neutral-950 rounded-none border-4 border-black overflow-auto custom-scrollbar"
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
                            backgroundSize: '20px 20px'
                        }}
                    >
                        {/* SVG 연결선 */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                            {/* SVG 선을 도트처럼 딱딱 끊어지게 만드는 crispEdges 치트키 강제 삽입 */}
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
                                            stroke={isPathActive ? '#facc15' : '#262626'}
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
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

    // [신규 개선] 최대 깊이를 기반으로 캔버스의 절대적인 픽셀 사이즈를 먼저 결정합니다.
    const maxDepth = Math.max(0, ...Object.values(depths));
    // 깊이 1단계당 350px씩 여유를 주고, 기본 여백 300px을 더합니다. (최소 1500px 보장)
    const dynamicCanvasSize = Math.max(1500, maxDepth * 350 + 300);

    // 4. 삼각함수를 활용하여 최종 X, Y % 좌표 산출 (강제 고정 로직 제거)
    Object.keys(nodes).forEach(id => {
        if (depths[id] === 0) {
            positions[id] = { x: 50, y: 50 }; // 중앙은 무조건 50,50
            return;
        }

        // 깊이 1단계마다 160픽셀 단위로 정확히 거리를 벌립니다.
        const pixelRadius = depths[id] * 160;
        // 픽셀 거리를 커진 캔버스 사이즈에 비례하는 퍼센트(%)로 변환합니다.
        const percentRadius = (pixelRadius / dynamicCanvasSize) * 100;
        const radian = (angles[id] * Math.PI) / 180;

        // 찌그러뜨리던 억제기(Math.max, min)를 삭제하고 무한 확장을 허용합니다.
        const x = 50 + percentRadius * Math.cos(radian);
        const y = 50 + percentRadius * Math.sin(radian);

        positions[id] = { x, y };
    });

    // 알고리즘이 계산한 좌표와 캔버스 사이즈를 같이 반환합니다.
    return { positions, dynamicCanvasSize };
};

// [수정됨] 반환받은 좌표와 동적 캔버스 사이즈를 전역 상수로 꺼내옵니다.
const { positions: AUTO_NODE_POSITIONS, dynamicCanvasSize: DYNAMIC_CANVAS_SIZE } = calculateAutoPositions(SKILL_TREE_DATA);

const SkillTreeScreen: React.FC = () => {
    const { reincarnationPoints = 0, unlockedSkills = ['core_origin'], unlockSkill } = useGameStore();
    const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
    // [신규] 화면 확대/축소를 위한 상태 추가 (기본 100%)
    const [zoom, setZoom] = useState(1);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // 컴포넌트 마운트 시 스크롤을 줌 비율에 맞춰 중앙(core_origin)으로 자동 이동
    useEffect(() => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            // [수정됨] 고정값 1500 대신 계산된 DYNAMIC_CANVAS_SIZE 적용
            container.scrollLeft = ((DYNAMIC_CANVAS_SIZE * zoom) - container.clientWidth) / 2;
            container.scrollTop = ((DYNAMIC_CANVAS_SIZE * zoom) - container.clientHeight) / 2;
        }
    }, []); // 처음 렌더링될 때 한 번만 실행

    // [신규 추가] 화면 중앙을 유지하며 줌 인/아웃을 처리하는 함수
    const handleZoom = (delta: number) => {
        // [수정됨] 최소 줌을 0.1 (10%)로 낮춰서 전체 보기가 가능하도록 수정 (0.1 ~ 2.0 제한)
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
        const baseStyle = "absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer transition-all shadow-lg text-xs font-bold text-white z-10 hover:scale-110";

        let colorClass = "bg-neutral-800 border-neutral-600 text-neutral-500 opacity-60"; // 잠김
        if (isUnlocked) {
            colorClass = "bg-yellow-900 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)] z-20"; // 해금됨
        } else if (isSelectable) {
            colorClass = "bg-blue-900 border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.5)] animate-pulse z-20"; // 해금 가능
        }

        let shapeClass = "w-10 h-10 rounded-full border-2"; // NORMAL
        if (type === 'NOTABLE') shapeClass = "w-12 h-12 rounded-lg border-2 rotate-45"; // NOTABLE
        if (type === 'KEYSTONE') shapeClass = "w-16 h-16 rounded-full border-double border-4"; // KEYSTONE

        return `${baseStyle} ${colorClass} ${shapeClass}`;
    };

    const handleUnlock = () => {
        if (selectedNode) unlockSkill(selectedNode.id);
    };

    return (
        // [수정됨] 마을 화면과 동일하게 폭 조정 (max-w-4xl) 및 간격 축소 (gap-3)
        <div className="max-w-4xl mx-auto p-4 md:p-6 rounded-xl border border-neutral-700 bg-neutral-900 w-full flex flex-col gap-3">

            {/* [수정됨] 헤더: 불필요한 공백을 줄이고 한 줄(flex)로 묶어 슬림화 */}
            <div className="flex justify-between items-center bg-neutral-950 px-4 py-2 rounded-xl border border-neutral-800 shadow-inner">
                <h2 className="text-base md:text-lg font-extrabold text-purple-400 flex items-center gap-2">
                    <span>🌌</span> 특성 기원석
                </h2>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400">잔여:</span>
                    <span className="text-lg font-mono font-bold text-yellow-400">{reincarnationPoints} RP</span>
                </div>
            </div>

            {/* [신규] 줌 컨트롤러 바 */}
            <div className="flex justify-end items-center gap-2 mb-[-8px] z-10 pr-2">
                {/* [수정됨] 줌 인/아웃 단위를 0.1 (10%)씩 세밀하게 조절하도록 변경 */}
                <button onClick={() => handleZoom(-0.1)} className="bg-neutral-800 border border-neutral-600 px-3 py-1 rounded text-xs text-white active:scale-95 transition-transform">-</button>
                <span className="text-xs text-neutral-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => handleZoom(0.1)} className="bg-neutral-800 border border-neutral-600 px-3 py-1 rounded text-xs text-white active:scale-95 transition-transform">+</button>
            </div>

            {/* [수정됨] 스크롤 캔버스: 세로 높이를 축소하여 하단 패널 시야 확보 (h-[45vh]) */}
            <div
                ref={scrollContainerRef}
                className="relative w-full h-[45vh] md:h-80 bg-neutral-950 rounded-xl border border-neutral-800 overflow-auto custom-scrollbar"
            >
                {/* [신규] 스크롤바와 줌 비율을 완벽히 동기화하기 위한 Wrapper 크기 제어 */}
                {/* [수정됨] 하드코딩된 1500 대신 동적으로 계산된 DYNAMIC_CANVAS_SIZE 적용 */}
                <div style={{ width: `${DYNAMIC_CANVAS_SIZE * zoom}px`, height: `${DYNAMIC_CANVAS_SIZE * zoom}px` }} className="relative">
                    {/* 실제 스킬 트리가 그려지는 거대한 배경 (Transform으로 Scale 처리) */}
                    <div
                        className="absolute top-0 left-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900 to-neutral-950"
                        style={{
                            width: `${DYNAMIC_CANVAS_SIZE}px`,
                            height: `${DYNAMIC_CANVAS_SIZE}px`,
                            transform: `scale(${zoom})`,
                            transformOrigin: '0 0'
                        }}
                    >
                        {/* SVG 연결선 */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                            {Object.values(SKILL_TREE_DATA).map(node => {
                                return node.requires.map(reqId => {
                                    const start = AUTO_NODE_POSITIONS[reqId];
                                    const end = AUTO_NODE_POSITIONS[node.id];
                                    if (!start || !end) return null;

                                    const isPathActive = unlockedSkills.includes(reqId) && unlockedSkills.includes(node.id);

                                    return (
                                        <line
                                            key={`${reqId}-${node.id}`}
                                            x1={`${start.x}%`}
                                            y1={`${start.y}%`}
                                            x2={`${end.x}%`}
                                            y2={`${end.y}%`}
                                            stroke={isPathActive ? '#facc15' : '#333333'}
                                            strokeWidth={isPathActive ? "4" : "2"}
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
                                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
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

            {/* [수정됨] 상세 패널: 모바일에서 한 화면에 보이도록 여백(Padding)과 폰트 크기 대폭 축소 (Compact Size) */}
            {selectedNode && (
                <div className="bg-neutral-800 p-3 rounded-xl border border-neutral-600 shadow-xl animate-fade-in-up">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-neutral-700 px-2 py-0.5 rounded font-bold text-blue-400 tracking-wider">{selectedNode.type}</span>
                            <h3 className="text-sm md:text-base font-bold text-white leading-none">{selectedNode.name}</h3>
                        </div>
                        <button onClick={() => setSelectedNode(null)} className="w-6 h-6 flex justify-center items-center rounded bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-xs">✕</button>
                    </div>

                    <p className="text-xs text-neutral-300 bg-neutral-900 p-2 rounded-lg mb-2">
                        {selectedNode.description}
                    </p>

                    <div className="flex items-center justify-between border-t border-neutral-700 pt-2">
                        <div className="text-xs font-bold">
                            요구: <span className={reincarnationPoints >= selectedNode.cost ? 'text-green-400' : 'text-red-400'}>{selectedNode.cost} RP</span>
                        </div>

                        {unlockedSkills.includes(selectedNode.id) ? (
                            <div className="py-1 px-4 bg-neutral-700 text-neutral-400 font-bold rounded text-xs cursor-not-allowed">획득함</div>
                        ) : (
                            <button
                                onClick={handleUnlock}
                                disabled={!selectedNode.requires.every(reqId => unlockedSkills.includes(reqId)) || reincarnationPoints < selectedNode.cost}
                                className="py-1 px-4 bg-purple-600 hover:bg-purple-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white font-bold rounded text-xs transition-colors shadow-lg"
                            >
                                특성 해금
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SkillTreeScreen;
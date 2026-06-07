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
        // 부모 노드들 중 가장 깊은 곳을 기준으로 +1
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
        // 키스톤처럼 부모가 둘 이상이면 부모들의 평균 각도를 구해서 딱 정중앙에서 만나도록 함
        const parentAngles = parents.map(p => calcAngle(p));
        const avgAngle = parentAngles.reduce((sum, val) => sum + val, 0) / parentAngles.length;

        // 같은 부모를 공유하는 형제들끼리 선이 겹치지 않게 부채꼴로 살짝씩 벌림 (-20도 ~ +20도)
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

    // 4. 삼각함수를 활용하여 최종 X, Y % 좌표 산출
    Object.keys(nodes).forEach(id => {
        if (depths[id] === 0) {
            positions[id] = { x: 50, y: 50 }; // 중앙은 무조건 50,50
            return;
        }

        // 깊이가 1 증가할 때마다 캔버스 밖으로 8%씩 뻗어나감
        const radius = depths[id] * 8;
        const radian = (angles[id] * Math.PI) / 180;

        // 화면 바깥으로 노드가 튀어나가지 않도록 최소 5%, 최대 95% 내에 강제 고정 (Clamp)
        const x = Math.max(5, Math.min(95, 50 + radius * Math.cos(radian)));
        const y = Math.max(5, Math.min(95, 50 + radius * Math.sin(radian)));

        positions[id] = { x, y };
    });

    return positions;
};

// 화면이 렌더링될 때 딱 한 번만 알고리즘을 돌려서 좌표 객체를 만들어둡니다.
const AUTO_NODE_POSITIONS = calculateAutoPositions(SKILL_TREE_DATA);

const SkillTreeScreen: React.FC = () => {
    const { reincarnationPoints = 0, unlockedSkills = ['core_origin'], unlockSkill } = useGameStore();
    const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // 컴포넌트 마운트 시 스크롤을 중앙(core_origin)으로 자동 이동
    useEffect(() => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
            container.scrollTop = (container.scrollHeight - container.clientHeight) / 2;
        }
    }, []);

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
        <div className="max-w-5xl mx-auto p-4 md:p-6 rounded-xl border border-neutral-700 bg-neutral-900 w-full flex flex-col gap-4">

            {/* 헤더 */}
            <div className="flex justify-between items-center bg-neutral-950 p-4 rounded-xl border border-neutral-800 shadow-inner">
                <h2 className="text-xl font-extrabold text-purple-400 flex items-center gap-2">
                    <span>🌌</span> 특성 기원석
                </h2>
                <div className="text-right">
                    <div className="text-xs text-neutral-400">보유 환생 포인트</div>
                    <div className="text-2xl font-mono font-bold text-yellow-400">{reincarnationPoints} RP</div>
                </div>
            </div>

            {/* 스크롤 가능한 방대한 캔버스 영역 */}
            {/* overflow-auto 로 설정하여 내부 1500px 캔버스를 상하좌우 스크롤 가능하게 만듭니다 */}
            <div
                ref={scrollContainerRef}
                className="relative w-full h-100 md:h-125 bg-neutral-950 rounded-xl border border-neutral-800 overflow-auto custom-scrollbar"
            >
                {/* 실제 스킬 트리가 그려지는 거대한 배경 (1500px x 1500px) */}
                <div className="relative w-[1500px] h-[1500px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900 to-neutral-950">

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
                                {/* 디버깅용 텍스트 (옵션): 노드 이름 첫 글자 표시 */}
                                {!isUnlocked && <span className={`absolute ${node.type === 'NOTABLE' ? '-rotate-45' : ''} text-[10px] opacity-30`}>{node.name.substring(0,1)}</span>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 선택된 노드 상세 패널 */}
            {selectedNode && (
                <div className="bg-neutral-800 p-5 rounded-xl border border-neutral-600 shadow-2xl animate-fade-in-up">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="text-xs font-bold text-blue-400 mb-1">{selectedNode.type}</div>
                            <h3 className="text-xl font-bold text-white">{selectedNode.name}</h3>
                        </div>
                        <button onClick={() => setSelectedNode(null)} className="w-8 h-8 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white font-bold">✕</button>
                    </div>

                    <p className="text-sm text-neutral-300 bg-neutral-900 p-3 rounded-lg mb-4">
                        {selectedNode.description}
                    </p>

                    <div className="flex items-center justify-between mt-4 border-t border-neutral-700 pt-4">
                        <div className="text-sm font-bold">
                            요구 포인트: <span className={reincarnationPoints >= selectedNode.cost ? 'text-green-400' : 'text-red-400'}>{selectedNode.cost} RP</span>
                        </div>

                        {unlockedSkills.includes(selectedNode.id) ? (
                            <div className="py-2 px-6 bg-neutral-700 text-neutral-400 font-bold rounded-lg cursor-not-allowed">이미 획득함</div>
                        ) : (
                            <button
                                onClick={handleUnlock}
                                disabled={!selectedNode.requires.every(reqId => unlockedSkills.includes(reqId)) || reincarnationPoints < selectedNode.cost}
                                className="py-2 px-6 bg-purple-600 hover:bg-purple-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white font-bold rounded-lg transition-colors shadow-lg"
                            >
                                특성 해금
                            </button>
                        )}
                    </div>

                    {!unlockedSkills.includes(selectedNode.id) && !selectedNode.requires.every(reqId => unlockedSkills.includes(reqId)) && (
                        <div className="mt-2 text-xs text-red-400 text-right">* 이전 특성을 모두 해금해야 합니다.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SkillTreeScreen;
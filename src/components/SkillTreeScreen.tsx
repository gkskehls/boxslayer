import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { SKILL_TREE_DATA } from '../constants/skills';
import type { SkillNode } from '../types/game';

// 화면에 그려질 노드들의 고정 좌표 (x%, y%)
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
    'core_origin': { x: 50, y: 50 },       // 중앙 시작점
    'stat_str_1': { x: 20, y: 50 },        // 좌측 (힘)
    'util_fever_1': { x: 50, y: 20 },      // 상단 (피버)
    'util_core_1': { x: 50, y: 80 },       // 하단 (코어)
    'util_idle_1': { x: 80, y: 50 },       // 우측 (방치)
    'util_reincarnate_1': { x: 80, y: 20 } // 우측 상단 (환생 - 방치에서 연결)
};

const SkillTreeScreen: React.FC = () => {
    // [추가됨] 혹시 모를 undefined 에러를 막기 위해 구조분해할당 시 기본값(=) 설정
    const { reincarnationPoints = 0, unlockedSkills = ['core_origin'], unlockSkill } = useGameStore();
    const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);

    // 노드 등급별 디자인 스타일 지정
    const getNodeStyle = (type: string, isUnlocked: boolean, isSelectable: boolean) => {
        const baseStyle = "absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer transition-all shadow-lg text-xs font-bold text-white z-10 hover:scale-110";

        // 상태별 컬러 매핑
        let colorClass = "bg-neutral-800 border-neutral-600 text-neutral-500"; // 잠김 (비활성화)
        if (isUnlocked) {
            colorClass = "bg-yellow-900 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]"; // 해금됨
        } else if (isSelectable) {
            colorClass = "bg-blue-900 border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.5)] animate-pulse"; // 해금 가능
        }

        // 등급별 형태 매핑
        let shapeClass = "w-10 h-10 rounded-full border-2"; // NORMAL (작은 원)
        if (type === 'NOTABLE') shapeClass = "w-12 h-12 rounded-lg border-2 rotate-45"; // NOTABLE (마름모)
        if (type === 'KEYSTONE') shapeClass = "w-16 h-16 rounded-full border-double border-4"; // KEYSTONE (큰 겹원)

        return `${baseStyle} ${colorClass} ${shapeClass}`;
    };

    const handleUnlock = () => {
        if (selectedNode) {
            unlockSkill(selectedNode.id);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 rounded-xl border border-neutral-700 bg-neutral-900 w-full flex flex-col gap-4">

            {/* 상단 헤더: 현재 보유 RP 표시 */}
            <div className="flex justify-between items-center bg-neutral-950 p-4 rounded-xl border border-neutral-800 shadow-inner">
                <h2 className="text-xl font-extrabold text-purple-400 flex items-center gap-2">
                    <span>🌌</span> 특성 기원석
                </h2>
                <div className="text-right">
                    <div className="text-xs text-neutral-400">보유 환생 포인트</div>
                    <div className="text-2xl font-mono font-bold text-yellow-400">{reincarnationPoints} RP</div>
                </div>
            </div>

            {/* 메인 스킬 트리 캔버스 영역 */}
            <div className="relative w-full h-100 md:h-125 bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden">

                {/* SVG 선 긋기 (노드 간의 연결선) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    {Object.values(SKILL_TREE_DATA).map(node => {
                        return node.requires.map(reqId => {
                            const start = NODE_POSITIONS[reqId];
                            const end = NODE_POSITIONS[node.id];
                            if (!start || !end) return null;

                            // 선행 노드와 현재 노드가 모두 해금되었으면 선에 불(골드)이 들어옴
                            const isPathActive = unlockedSkills.includes(reqId) && unlockedSkills.includes(node.id);

                            return (
                                <line
                                    key={`${reqId}-${node.id}`}
                                    x1={`${start.x}%`}
                                    y1={`${start.y}%`}
                                    x2={`${end.x}%`}
                                    y2={`${end.y}%`}
                                    stroke={isPathActive ? '#facc15' : '#404040'} // yellow-400 or neutral-700
                                    strokeWidth={isPathActive ? "4" : "2"}
                                    className="transition-colors duration-500"
                                />
                            );
                        });
                    })}
                </svg>

                {/* 노드 버튼 렌더링 */}
                {Object.values(SKILL_TREE_DATA).map(node => {
                    const pos = NODE_POSITIONS[node.id];
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
                            {/* NOTABLE 등급(마름모)일 경우 텍스트가 같이 회전하지 않도록 역회전 보정 */}
                            <div className={node.type === 'NOTABLE' ? '-rotate-45' : ''}>
                                {isUnlocked ? '✓' : ''}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 선택된 노드 상세 정보 및 해금 패널 */}
            {selectedNode && (
                <div className="bg-neutral-800 p-5 rounded-xl border border-neutral-600 shadow-2xl animate-fade-in-up">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="text-xs font-bold text-blue-400 mb-1">{selectedNode.type}</div>
                            <h3 className="text-xl font-bold text-white">{selectedNode.name}</h3>
                        </div>
                        <button
                            onClick={() => setSelectedNode(null)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-700 hover:bg-neutral-600 text-white font-bold"
                        >
                            ✕
                        </button>
                    </div>

                    <p className="text-sm text-neutral-300 bg-neutral-900 p-3 rounded-lg mb-4">
                        {selectedNode.description}
                    </p>

                    <div className="flex items-center justify-between mt-4 border-t border-neutral-700 pt-4">
                        <div className="text-sm font-bold">
                            요구 포인트: <span className={reincarnationPoints >= selectedNode.cost ? 'text-green-400' : 'text-red-400'}>
                                {selectedNode.cost} RP
                            </span>
                        </div>

                        {unlockedSkills.includes(selectedNode.id) ? (
                            <div className="py-2 px-6 bg-neutral-700 text-neutral-400 font-bold rounded-lg cursor-not-allowed">
                                이미 획득함
                            </div>
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

                    {/* 선행 스킬 부족 경고 메시지 */}
                    {!unlockedSkills.includes(selectedNode.id) && !selectedNode.requires.every(reqId => unlockedSkills.includes(reqId)) && (
                        <div className="mt-2 text-xs text-red-400 text-right">
                            * 이전 특성을 먼저 해금해야 합니다.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SkillTreeScreen;
# BoxSlayer 소스 코드 목록

본 문서는 프로젝트 구조를 정의하고 각 파일의 역할을 관리합니다.

## 1. 전역 상태 관리 (Store)
- `store/gameStore.ts`: 게임 핵심 로직 (전투, 스테이지, 스탯, 환생, 패배 처리, 코어 액션)
- `store/utils/localStorage.ts`: 로컬 스토리지 데이터 입출력 유틸리티

## 2. 화면 컴포넌트 (Components)
- `App.tsx`: 메인 라우팅 및 레이아웃
- `components/AnimatedBattleScreen.tsx`: 전투 시뮬레이션 및 결과 화면
- `components/StatsScreen.tsx`: 스탯 분배 및 외형 변화 UI
- `components/CoreScreen.tsx`: 코어 관리 및 강화 UI
- `components/TownScreen.tsx`: 마을 허브 화면
- `components/Shop.tsx`: 재화 사용 상점
- `components/NavigationBar.tsx`: 전역 내비게이션 바
- `components/SkillTreeScreen.tsx`: 스킬 트리 UI 및 자동 배치 엔진
- `components/BattleScreen..del`: [삭제 예정] 이전 버전의 전투 화면

## 3. 타입 정의 (Types)
- `types/game.ts`: 게임 내 주요 인터페이스 (GameState, Player, Core, SkillNode 등 정의)
- `types/core.d.ts`: 코어 시스템 전용 타입 정의 (기존 구조 유지)

## 4. 상수 및 데이터 (Constants)
- `constants/skills.ts`: 스킬 트리 노드 데이터 전체 정의
- `constants/shopItems.ts`: 상점에서 판매하는 아이템 목록 정의

## 5. 리소스 (Assets)
- `assets/`: 이미지 및 정적 파일

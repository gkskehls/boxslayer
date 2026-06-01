# BoxSlayer 소스 코드 목록

본 문서는 프로젝트 구조를 정의하고 각 파일의 역할을 관리합니다.

## 1. 전역 상태 관리 (Store)
- `store/gameStore.ts`: 게임 핵심 로직 (전투, 스테이지, 스탯, 환생, 패배 처리)
- `store/utils/localStorage.ts`: 로컬 스토리지 데이터 입출력 유틸리티

## 2. 화면 컴포넌트 (Components)
- `App.tsx`: 메인 라우팅 및 레이아웃
- `components/BattleScreen.tsx`: 전투 시뮬레이션 및 결과 화면
- `components/StatsScreen.tsx`: 스탯 분배 및 외형 변화 UI
- `components/CoreScreen.tsx`: 코어 관리 및 강화 UI
- `components/TownScreen.tsx`: 마을 허브 화면
- `components/Shop.tsx`: 재화 사용 상점
- `components/NavigationBar.tsx`: 전역 내비게이션 바

## 3. 타입 정의 (Types)
- `types/game.ts`: 게임 내 주요 인터페이스 (GameState, Player 등)
- `types/core.d.ts`: 코어 아이템 관련 타입 정의

## 4. 리소스 (Assets)
- `assets/`: 이미지 및 정적 파일
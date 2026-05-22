# BoxSlayer 개발 컨벤션 (BoxSlayer Development Conventions)

이 문서는 '박스슬레이어' 프로젝트의 일관된 코드 품질과 효율적인 협업을 위한 가이드라인입니다.

## 1. 기술 스택 (Tech Stack)
- **Framework:** React 19 (Functional Components)
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** Zustand (권장) 또는 React Context API
- **Game Loop:** `requestAnimationFrame` 또는 전 전용 Hook 사용

## 2. 디렉토리 구조 (Project Structure)
```text
src/
├── assets/          # 이미지, 사운드 등 정적 리소스
├── components/      # UI 관련 재사용 가능한 컴포넌트
├── game/            # 핵심 게임 로직 (엔진, 엔티티, 물리)
│   ├── entities/    # Player, Enemy, Projectile 등
│   ├── systems/     # Combat, Movement, Leveling 등
│   └── hooks/       # Game Loop 및 입력 핸들링 커스텀 훅
├── store/           # 전역 상태 (캐릭터 능력치, 점수 등)
├── types/           # 공통 인터페이스 및 타입 정의
├── utils/           # 유틸리티 함수 (랜덤 생성, 계산 등)
└── App.tsx          # 메인 진입점
```

## 3. 네이밍 규칙 (Naming Conventions)
- **파일/폴더:**
  - 컴포넌트 파일: `PascalCase.tsx`
  - 일반 함수/변수 파일: `camelCase.ts`
  - 폴더명: `kebab-case` 또는 `camelCase`
- **변수 및 함수:** `camelCase` (예: `playerHealth`, `movePlayer`)
- **타입/인터페이스:** `PascalCase` (예: `PlayerInfo`, `GameState`)
- **컴포넌트:** `PascalCase` (예: `EnemyBox`, `ScoreBoard`)

## 4. 코드 스타일 (Code Style)
- **컴포넌트:** 함수형 컴포넌트와 Hooks를 필수 사용합니다.
- **TypeScript:** `any` 사용을 지양하고 구체적인 타입을 지정합니다.
- **Tailwind CSS:** 유틸리티 클래스를 우선 사용하며, 복잡한 경우 별도 상수로 분리합니다.

## 5. 커밋 메시지 규칙 (Commit Messages)
[Conventional Commits](https://www.conventionalcommits.org/) 형식을 따릅니다.
- `feat:` 새로운 기능 추가
- `fix:` 버그 수정
- `docs:` 문서 수정
- `style:` 코드 의미에 영향을 주지 않는 변경 (포맷팅 등)
- `refactor:` 코드 리팩토링
- `chore:` 빌드 업무, 패키지 매니저 설정 등

## 6. 게임 개발 원칙
- **상태와 렌더링 분리:** 게임 로직(위치 계산 등)과 React 렌더링을 가급적 분리하여 성능을 확보합니다.
- **박스 기반 설계:** 모든 캐릭터와 적은 기본적으로 Rect(Rectangle) 기반 충돌 체크를 수행합니다.
- **성장 시스템:** 적 처치 시 경험치 획득 및 레벨업 시스템을 핵심으로 합니다.

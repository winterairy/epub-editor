# UI 컴포넌트

작업실의 어두운 색상과 편집기 레이아웃을 유지하면서 공통 컨트롤에 shadcn/ui와 Heroicons를 사용한다.

| 영역 | 구현 |
| --- | --- |
| 활동 바·파일·서식 아이콘 | `@heroicons/react` |
| 공통 액션·아이콘 설명 | `Button`, `Tooltip`, `IconButton` |
| 브라우저 상단 메뉴 | `StudioMenubar` / `Menubar` |
| 새 책·최근 프로젝트·가져오기·설정·도움말 | `StudioDialogs` / `Dialog` |
| 새 책 생성 시 원고·기록 삭제 확인 | `AlertDialog`; 취소하면 원고와 입력값 유지 |
| 검색·책 정보 입력 | `Input`, `Label`, `Select`, `ChoiceSelect` |
| 일반·코드 편집 전환 | 단일 선택 `ToggleGroup` |
| 파일·하단 패널 | `Tabs`; 방향키 이동과 하단 패널 접기 지원 |

본문 서식은 각 버튼을 한 번 누르면 적용하고 다시 누르면 해당 서식만 해제한다. 선택 영역 또는 커서 위치의 서식 상태를 `aria-pressed`와 녹색 배경·테두리로 표시한다. 구분선은 본문에 선을 삽입하는 액션이다.

`components.json`은 컴포넌트를 `src/renderer/src/components/ui`에 추가하도록 설정한다. 생성된 컴포넌트의 기본 아이콘도 Heroicons로 교체하며, 클래스 병합은 `lib/utils.ts`의 `cn`을 사용한다.

Tailwind Vite 플러그인을 웹·Electron renderer 설정 모두에 등록한다. 테마 토큰은 `ui.css`에 둔다. 편집 중인 본문과 Monaco에 전역 초기화 스타일이 영향을 주지 않도록 Tailwind Preflight 대신 컨트롤에 필요한 기본 스타일만 정의한다. 기존 CSS의 강조색은 `--studio-accent`로 구분한다.

`tests/editor.spec.ts`는 기존 편집 흐름을 검증하고, `tests/ui.spec.ts`는 메뉴·탭·편집 모드의 키보드 조작, 설정 폼, 툴팁, 삭제 확인을 검증한다.

```sh
pnpm typecheck
pnpm build
pnpm test:e2e
```

Playwright 브라우저가 설치되지 않았다면 `pnpm exec playwright install chromium`을 실행하거나 `CHROMIUM_PATH`로 브라우저 실행 파일을 지정한다.

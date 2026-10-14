# EPUB Studio

로컬 파일 기반 Windows 전자책 편집기 개발 프로젝트입니다.

## 개발 환경

- Node.js 24 LTS (초기 검증: 24.19.0), npm 11
- Windows에서 Electron 데스크톱 앱 실행 및 설치 파일 검증
- Linux 클라우드에서는 브라우저 편집 화면, 타입 검사, 빌드 검증
- DB·계정·서버는 현재 필요하지 않습니다. 클라우드 동기화 등 서버 기능 확장 시 Sonamu 도입을 검토합니다.

```sh
npm ci
npm run dev
```

브라우저에서 UI만 개발하려면 `npm run dev:web`을 사용합니다. 기본 포트는 5173입니다.

```sh
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

클라우드에는 Chromium이 있으므로 다음으로 브라우저 다운로드 없이 테스트합니다.

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

클라우드 캐시 경로는 프로젝트 설정에 고정하지 않습니다. 필요할 때만 다음 환경 변수를 명령에 지정합니다.

```sh
npm_config_cache=/workspace/.npm-cache electron_config_cache=/workspace/.cache/electron ELECTRON_GET_USE_PROXY=1 npm ci
```

Windows 설치 파일 생성은 Windows에서 실행합니다.

```sh
npm run package:win
```

결과는 `release/`에 생성됩니다. 코드 서명 인증서는 별도로 준비해야 하며, 현재 설정은 배포용 서명을 구성하지 않습니다.

## 구조와 선택

- `src/main`: Electron 창·로컬 시스템 기능. Node 접근은 렌더러에 직접 노출하지 않습니다.
- `src/preload`: 필요한 기능만 제공하는 제한된 브리지. 현재는 플랫폼 정보만 노출합니다.
- `src/renderer`: React, Tiptap, 로컬 번들 Monaco 및 HTML/CSS worker
- `tests`: Playwright 편집 화면 smoke test
- DOCX 가져오기: Mammoth
- EPUB 생성: xmlbuilder2 + fflate
- 데이터 검증·HTML 정리·변경 비교: Zod, DOMPurify, diff
- PDF는 이후 Electron Chromium의 printToPDF를 활용할 예정입니다.

## 현재 구현 범위

기본 일반 편집 화면, HTML 코드 화면, 기본 문단·제목의 화면 전환만 구현했습니다. Tiptap 스키마 외의 임의 XHTML/CSS 왕복 보존은 아직 구현하지 않았습니다. 지원하지 않는 코드 요소는 일반 편집 전환 시 유실될 수 있으므로 실제 원고 작업에는 사용하지 마세요.

Mammoth, EPUB 생성 및 변경 비교 라이브러리는 설치만 완료했으며, DOCX 가져오기·프로젝트 저장·미디어 관리·변경 확인·EPUB/PDF 내보내기 기능은 이후 개발 대상입니다. VS Code 확장 호환성은 제공하지 않습니다.

`npm run dev:web`은 Electron 파일 기능을 실행하지 않습니다. Linux 브라우저 테스트 통과가 Windows 설치 및 Electron 실행 검증을 대체하지 않습니다.

## 현재 클라우드의 Electron 실행 제한

Electron 바이너리 설치와 내장 Node 실행은 검증했습니다. 이 Linux 환경에서는 Chromium SUID sandbox 권한 구성이 없어 데스크톱 실행이 중단되며, 디스플레이 서버도 없습니다. sandbox를 해제하지 않았습니다. 클라우드에서는 `npm run dev:web`으로 UI를 개발하고 Windows에서 `npm run dev`와 설치 파일 실행을 검증하세요.

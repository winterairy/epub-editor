# EPUB Studio

로컬 파일 기반 Windows 전자책 편집기 개발 프로젝트입니다.

## 기술 스택 결정사항

목표는 Windows에서 실행되는 로컬 전자책 제작 앱입니다. 일반 편집과 코드 편집을 전환하고, 이미지·GIF 및 선택 가능한 책 템플릿을 지원하며, 결과를 EPUB 또는 PDF로 내보냅니다. 아래는 설계 결정이며, 기능 구현 완료 여부는 «현재 구현 범위»에 별도로 기록합니다.

| 영역 | 선택 | 선택 이유 |
| --- | --- | --- |
| 언어 | TypeScript | UI, Electron 시스템 기능, 변환 모듈에서 타입과 데이터 구조를 공유 |
| 데스크톱 앱 | Electron | Windows 파일 접근과 설치 프로그램 제공, Chromium 기반 화면 및 PDF 출력 활용 |
| 프론트엔드 | React | 편집 화면, 책 구성, 미디어 및 내보내기 UI 구현 |
| 일반 편집기 | Tiptap / ProseMirror | 블로그 형태의 문서 편집과 문서 요소 확장 |
| 코드 편집기 | Monaco Editor | HTML/CSS 구문 강조·자동 완성 등 코드 편집 기능 제공. 에디터와 worker를 로컬 번들에 포함 |
| DOCX 가져오기 | Mammoth | Word 원고의 제목·문단·목록·이미지 등 구조를 HTML로 변환. Word 페이지 배치의 완전한 재현은 목표로 하지 않음 |
| EPUB 생성 | xmlbuilder2 + fflate | XHTML·OPF·목차 등 표준 파일을 생성하고 EPUB 규칙에 맞게 ZIP 패키징 |
| PDF 생성 | Electron Chromium의 `printToPDF` | 별도 Chromium 배포 없이 인쇄용 HTML/CSS를 PDF로 출력할 계획 |
| 데이터 검증 | Zod | 메타데이터와 프로젝트 데이터의 런타임 검증 |
| HTML 정리 | DOMPurify | 가져오기·붙여넣기 콘텐츠의 위험 요소 제거. Word 서식 정리와 EPUB 규격 검증은 별도 처리 |
| 변경 비교 | diff + 기준본 파일 | 이전 내보내기와 현재 프로젝트의 텍스트 변경 비교. 미디어는 추가·삭제·교체 및 전후 미리보기로 표시 |
| 빌드·배포 | electron-vite / Vite 7 + electron-builder | Electron main·preload·renderer 빌드와 Windows NSIS 설치 프로그램 생성. electron-vite 5의 지원 범위에 맞춰 Vite 7 사용 |
| UI 검증 | Playwright | 실제 브라우저에서 편집과 화면 전환 검증 |

### 로컬 저장과 DB

- 본문과 스타일은 XHTML·CSS 파일, 이미지·GIF는 프로젝트 미디어 폴더에 저장합니다.
- 책의 공식 메타데이터는 EPUB의 OPF에 반영합니다. 앱 설정과 최근 작업 파일 경로는 JSON으로 관리할 계획입니다.
- 미디어 가공 중간 결과는 임시 폴더에 저장하고, 작업 정보는 JSON으로 기록합니다. 이 기능만을 위해 DB를 도입하지 않습니다.
- 검색은 초기에는 메모리 인덱스를 사용하고, 여러 책 검색이나 재시작 후 인덱스 유지가 필요하면 SQLite FTS5를 재생성 가능한 검색 캐시로 검토합니다. 현재 SQLite는 도입하지 않았습니다.
- 계정·클라우드 동기화·공유 템플릿 등 서버와 DB가 필요한 기능을 확장할 때 Sonamu 도입을 제안합니다. 현재는 Sonamu 및 PostgreSQL 서버를 구성하지 않습니다.

### 변경 확인과 내보내기

사용자는 Git을 설치하거나 Git 용어를 배울 필요가 없습니다. 앱이 비교 기준본을 관리하고 «변경 내용», «이전 내보내기와 비교», «확인 후 내보내기» 형태로 제공합니다.

1. 편집 내용을 로컬 프로젝트에 저장합니다.
2. 마지막으로 성공한 내보내기 기준본과 현재 내용을 비교합니다. 첫 내보내기에서는 전체 내용을 확인합니다.
3. 사용자가 변경을 확인하면 확인한 상태를 EPUB 또는 PDF로 출력합니다.
4. 출력 성공 후 해당 형식의 비교 기준본을 갱신합니다. 취소·실패 시 기준본은 유지합니다.

텍스트 diff를 위해 기준본의 파일 내용도 보존해야 합니다. 해시만으로는 변경 여부만 확인할 수 있습니다. 실제 Git을 내부 엔진으로 사용할지는 확정하지 않았으며, Git은 앱 실행의 필수 의존성이 아닙니다.

### 편집 및 출력 제약

- VS Code 확장 호환성은 요구사항에서 제외했습니다. Code OSS를 기반으로 앱을 제작하지 않고 Electron + Monaco 구성을 사용합니다.
- 일반 편집과 코드 편집은 같은 문서 내용을 공유하도록 설계합니다. Tiptap 스키마 밖의 XHTML·CSS를 보존하는 정책은 별도 구현이 필요합니다.
- DOCX 파일 가져오기는 Mammoth로 처리합니다. Word에서 복사·붙여넣기는 클립보드 HTML을 별도로 정리하는 흐름입니다.
- EPUB은 표준에 맞춘 ZIP 묶음입니다. `mimetype`을 첫 항목에 압축 없이 넣고, 리소스 목록·읽기 순서·상대 경로를 정확히 구성해야 합니다. EPUBCheck를 통한 최종 규격 검증은 후속 도입 대상입니다.
- GIF는 EPUB에 포함할 수 있지만 애니메이션 재생은 리더에 따라 다릅니다. PDF 출력에서는 정지 프레임으로 변환할 계획입니다.

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

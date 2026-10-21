# 변고경의 포트폴리오

Notion 「변고경의 포트폴리오」와 연결된 문서 30개를 Astro 정적 웹사이트로 마이그레이션했습니다.

## 실행

Node.js 24 권장(최소 22.22). 이 PC에서는 기존 Node 버전이 낮을 경우 실행 스크립트가 Codex에 번들된 Node 24를 자동으로 사용합니다. 다른 PC에서는 Node 24를 설치하세요.

```sh
npm install
npm run dev
```

로컬 주소: http://127.0.0.1:4321/

```sh
npm run build
npm run verify
npm run preview
```

`dist/`가 배포할 정적 웹사이트입니다. 별도 서버, API 키, Notion 로그인 없이 콘텐츠를 표시합니다. YouTube·외부 링크·Google Fonts는 인터넷 연결을 사용합니다. 폰트 연결이 안 되어도 시스템 폰트로 표시됩니다.

## 구성과 수정

- `src/pages/index.astro`: 메인 포트폴리오
- `src/data/projects.ts`: 대표 작업, 프로젝트 요약, 분류, URL 슬러그
- `src/data/notion.json`: 원문 본문과 계층 구조의 스냅샷
- `src/data/page-media.json`: 로컬에 보존한 원본 표지·아이콘
- `src/data/resolved-links.json`: 공개 GitHub 저장소를 확인하여 보완한 외부 링크
- `src/lib/content.ts`: Notion 마크다운을 안전한 HTML로 변환
- `src/pages/work/[slug].astro`: 30개 상세 페이지
- `src/pages/archive.astro`: 제목·본문 검색을 지원하는 전체 문서 목록
- `src/styles/global.css`: 반응형 스타일
- `public/media/`: 이미지, 웹용 영상, 표지·아이콘, 영상 포스터
- `docs/migration.md`: 분석, 보존 범위, 제한 사항과 검증 기록

Notion 실시간 동기화는 아닙니다. 내용을 바꾸면 위 데이터 파일을 편집하고 다시 빌드하세요. 원본 Notion 페이지는 수정하지 않았습니다.

## 보존 및 검증

30개 원문 → 33개 정적 경로(홈·아카이브·404 포함), 원본 코드 블록 39개, 본문 미디어 68개, 표지·아이콘 28개를 보존했습니다. 영상 18개는 H.264/AAC와 faststart로 변환하고 포스터를 생성했습니다. 고화질 원본은 로컬 `.migration/original-media/`에 보관하며 Git과 배포에서 제외합니다.

`npm run verify`는 내부 링크, 하위 문서 수집, 원본 코드 내용 일치, 본문 미디어 존재, 변환되지 않은 마크업, 정적 자산 크기를 확인합니다.

## 배포

Astro `output: static`을 사용합니다. `dist/`를 정적 호스팅에 업로드하면 됩니다. 서브디렉터리 배포 시 현재 루트 기준 링크를 포함해 `base` 경로 대응이 추가로 필요합니다.

Sites 소유자 전용 사이트 식별자는 `.openai/hosting.json`에 저장되어 있으나, 아직 소스 업로드나 배포는 하지 않았습니다. 자동 승인 검토가 Notion 콘텐츠의 외부 전송을 차단하여 사용자 승인 대기 상태입니다. 비밀키나 Notion API 토큰은 소스에 포함하지 않습니다.

사용한 Astro 요구 사항: [공식 설치 문서](https://docs.astro.build/en/install-and-setup/).

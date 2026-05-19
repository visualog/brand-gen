# BrandGen Codex 치환 계획

## 목표
`BrandGen`에서 현재 `Gemini CLI`와 `Pollinations`가 맡는 역할을 `codex exec` 기반 backend로 단계적으로 대체한다.

## 현재 역할 분해

### `/api/translate`
- 현재 역할: 사용자 입력을 AI 친화적인 영문 프롬프트로 번역·강화
- Codex 대체 방식: `codex exec --json --sandbox read-only -- "<instruction>"`
- 출력 형태: 최종 `englishPrompt` 조합에 필요한 구조화 JSON

### `/api/analyze-style`
- 현재 역할: 업로드 이미지를 읽고 재사용 가능한 스타일 프롬프트 생성
- Codex 대체 방식: `codex exec --json -i <temp-image> -- "<instruction>"`
- 출력 형태: `suggestedPrompt`

### `/api/generate`
- 현재 역할: 최종 프롬프트로 이미지 생성
- Codex 대체 방식: `codex exec --json -i <optional-image> -- "<image generation instruction>"`
- 출력 형태: 생성 파일 경로를 찾은 뒤 프런트가 소비할 URL 또는 data URL

## 이번 단계에서 반영한 내용

1. `/api/translate`를 `Codex CLI` 기반 helper로 교체
2. `/api/analyze-style`를 `Codex CLI` 이미지 첨부 실행으로 교체
3. `/api/generate`를 `Codex CLI` 이미지 생성 + `thread_id` 기반 파일 회수 방식으로 교체
4. `src/lib/codex-cli.ts`에 비대화형 실행, JSONL 파싱, 이미지 첨부, 생성 파일 회수 로직 추가
5. 기존처럼 스타일 프롬프트는 사용자 입력을 그대로 유지

## 설계 원칙

- 앱은 Codex 내부 Tool을 직접 호출하지 않는다.
- 앱은 `codex exec`를 subprocess로 실행하는 backend-for-frontend 계층만 가진다.
- 구조화 응답은 가능하면 JSON으로 받고, 최종 API 응답은 기존 프런트 계약을 우선 유지한다.
- 이미지 생성은 텍스트 응답이 아니라 파일 산출물 추적 문제로 다룬다.

## 남은 보강 작업

### 1. 공통 보강
- `CODEX_BIN` 환경 변수 지원 유지
- 타임아웃, stderr, JSONL 파싱 실패를 공통 에러 형식으로 정리
- 필요하면 `--output-schema`를 위한 임시 schema 파일 전략 추가
- 생성 결과 캐시 정책과 임시 파일 정리 정책 결정

### 2. 운영 검증
- 실제 Next.js route 호출로 `/api/translate`, `/api/analyze-style`, `/api/generate` 스모크 테스트
- Codex 미설치 또는 권한 부족 환경에서의 에러 메시지 정리
- 생성 파일 보존 기간과 정리 방식 결정

## 리스크

- 설치된 `codex` 버전과 소스 HEAD가 다를 수 있다.
- 이미지 생성은 최종 텍스트가 비어 있어도 성공할 수 있다.
- 생성 파일 경로는 `thread_id` 기반 디렉터리 조회가 필요하다.
- CLI 호출은 외부 API SDK보다 지연시간과 운영 의존성이 크다.

## 검증 기준

- `/api/translate`: 기존과 동일하게 `{ englishPrompt }`를 반환해야 한다.
- `/api/analyze-style`: 문자열 `suggestedPrompt`를 반환해야 한다.
- `/api/generate`: 최종 이미지가 실제 파일로 생성되고 프런트가 표시 가능한 형태로 반환돼야 한다.

## 2026-05-18 스모크 테스트 결과

- 개발 서버 경로에서 `/api/translate` 호출: `500`, `Codex CLI 응답 시간 초과`
- 개발 서버 경로에서 `/api/analyze-style` 호출: `500`, `Codex CLI 응답 시간 초과`
- 개발 서버 경로에서 `/api/generate` 호출: `500`, `Codex CLI 이미지 생성 시간 초과`

즉, 현재 구현은 배선은 완료됐지만 실제 route 호출 기준으로는 Codex 실행 시간이 타임아웃 한도를 초과하고 있다.

### 해석

- `codex` subprocess 실행 자체는 연결돼 있다.
- 실패 원인은 즉시 실행 오류가 아니라 응답 완료 전 타임아웃이다.
- 따라서 다음 조정은 설치 확인보다 타임아웃, 프롬프트 길이, 모델 속도, 출력 스키마 제약 쪽에 집중하는 것이 맞다.

## Worker 브리지 단계

- `scripts/codex-worker.mjs` 추가
- `npm run codex-worker`로 로컬 worker 기동 가능
- BrandGen route handlers는 이제 직접 `codex exec`를 돌리지 않고 worker HTTP 서버에 위임
- worker는 Codex 작업을 직렬화해서 경쟁을 줄이도록 큐를 사용

## Worker 단계 실측

- worker 직접 `/translate` 호출: 여전히 `Codex CLI 응답 시간 초과`
- Next route -> worker 위임 `/translate`: `Codex worker 응답 시간 초과`
- direct shell benchmark with a similar translate prompt: 약 15초 내 완료

즉, 현재 남은 문제는 “Codex 자체가 절대 느리다”가 아니라 “worker 프로세스 경로에서 Codex subprocess가 비정상적으로 오래 걸리는 운영 문제”로 좁혀졌다.

## 2026-05-19 원인 확인 및 복구

### 근본 원인

- `scripts/codex-worker.mjs`와 `src/lib/codex-cli.ts`에서 `spawn()`으로 실행한 `codex exec`의 stdin을 닫지 않고 있었다.
- 그 결과 Codex CLI가 `Reading additional input from stdin...` 상태로 추가 입력을 기다렸고, worker와 route 경로에서는 이 대기 상태가 그대로 타임아웃으로 이어졌다.
- 같은 명령이 터미널에서 직접 성공했던 이유는, 단독 실행 환경에서는 입력 종료 조건이 다르게 처리되어 이 문제가 덜 드러났기 때문이다.

### 적용한 수정

- `scripts/codex-worker.mjs`의 텍스트 실행 경로와 이미지 생성 경로 모두에서 `proc.stdin.end()`를 즉시 호출하도록 수정했다.
- 동일한 수정은 `src/lib/codex-cli.ts`에도 반영해 direct subprocess 경로와 worker 경로의 동작을 맞췄다.

### 수정 후 실측

- worker 직접 `/generate` 호출: `200`
- Next.js route `/api/generate` 호출: `200`
- route 응답 예시:
  - `threadId`: `019e3dcd-476d-76d0-8f89-74a27f938905`
  - `filePath`: `/Users/im_018/.codex/generated_images/019e3dcd-476d-76d0-8f89-74a27f938905/ig_0b6359daf8a8aaa4016a0bb9b218388191a685499c46774c1a.png`

### 현재 운영 조건

- BrandGen 앱에서 Codex 기반 이미지 생성을 쓰려면 별도 worker를 먼저 띄워야 한다.
- 실행 명령: `npm run codex-worker`
- 앱 route는 worker에 위임하고, worker가 `codex exec --json`을 직렬 큐로 처리한 뒤 `thread_id` 기준으로 생성 파일을 회수한다.

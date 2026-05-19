# Codex CLI 조사 문서

## 목적
이 문서는 다운로드한 `openai/codex` 소스코드와 현재 시스템에 설치된 `codex` 바이너리의 실제 실행 결과를 함께 비교해, Codex가 제공하는 CLI 인터페이스 전체를 정리한 문서다. 특히 대화형 TUI가 아닌 비대화형 CLI 사용 방식에 초점을 두고, 그중에서도 `codex exec`를 가장 자세히 다룬다.

## 조사 기준
- 소스 저장소: `./codex`
- 설치된 실행 파일: `/usr/local/bin/codex`
- 설치된 버전 실측: `codex-cli 0.130.0`
- 소스 체크아웃 커밋: `64ead6a83a`

## 먼저 알아둘 점
Codex는 크게 두 가지 사용 방식이 있다.

1. `codex`만 실행하는 방식
이 경우 기본값은 TUI 기반 대화형 모드다. 즉, 풀스크린에 가까운 대화형 인터페이스가 뜨고, 그 안에서 계속 상호작용한다.

2. `codex exec ...`처럼 서브커맨드를 붙이는 방식
이 경우 비대화형 실행기처럼 동작한다. 한 번 지시를 주고 결과를 받아 종료하는 흐름에 가깝다.

이 문서의 핵심 관심사는 2번이다.

## 최상위 CLI 인터페이스 전체 구조

### 기본 진입점
소스상 최상위 CLI는 `codex-rs/cli/src/main.rs`의 `Subcommand` 열거형으로 정의되어 있다. 여기서 서브커맨드가 없으면 대화형 TUI로 가고, 서브커맨드가 있으면 각 기능별 처리기로 분기한다.

공개 서브커맨드 목록은 다음과 같다.

- `exec`
- `review`
- `login`
- `logout`
- `mcp`
- `plugin`
- `mcp-server`
- `app-server`
- `remote-control`
- `app`
- `completion`
- `update`
- `doctor`
- `sandbox`
- `debug`
- `apply`
- `resume`
- `fork`
- `cloud`
- `exec-server`
- `features`

근거:
- 소스: `codex/codex-rs/cli/src/main.rs`
- 실측: `codex --help`

### 내부용 또는 숨겨진 서브커맨드
소스에는 도움말에 잘 드러나지 않는 내부/숨김 인터페이스도 있다.

- `execpolicy`
- `responses-api-proxy`
- `stdio-to-uds`
- `app-server generate-internal-json-schema`
- `app-server daemon pid-update-loop`

이들은 일반 사용자용보다는 내부 동작, 테스트, 프록시, 스키마 생성, 데몬 운용을 위한 성격이 강하다.

## 최상위 서브커맨드 분류

### 1. 대화형 세션 계열
- `codex`
- `resume`
- `fork`

설명:
- `codex` 단독 실행은 대화형 TUI 모드다.
- `resume`은 이전 대화형 세션을 다시 이어간다.
- `fork`는 이전 세션을 바탕으로 새 가지를 만든다.

### 2. 비대화형 작업 실행 계열
- `exec`
- `review`
- `apply`
- `cloud`

설명:
- `exec`는 비대화형 Codex 실행기의 중심이다.
- `review`는 표면상 별도 명령이지만, 내부적으로는 `exec` 기반 리뷰 실행으로 연결된다.
- `apply`는 최근 에이전트가 만든 diff를 현재 작업 트리에 반영한다.
- `cloud`는 Codex Cloud 작업을 가져와 로컬에 적용하는 실험 기능이다.

### 3. 인증/설치/운영 계열
- `login`
- `logout`
- `update`
- `doctor`
- `completion`
- `features`

### 4. 확장/통합 계열
- `mcp`
- `mcp-server`
- `plugin`

### 5. 서비스/원격 제어 계열
- `app-server`
- `remote-control`
- `exec-server`
- `stdio-to-uds`
- `responses-api-proxy`

### 6. 디버그/샌드박스 계열
- `sandbox`
- `debug`
- `execpolicy`

## 실측 기준으로 확인된 최상위 도움말
`codex --help` 실측 결과, 설치된 바이너리에서는 다음이 공개적으로 보였다.

- `exec`
- `review`
- `login`
- `logout`
- `mcp`
- `plugin`
- `mcp-server`
- `app-server`
- `remote-control`
- `app`
- `completion`
- `update`
- `sandbox`
- `debug`
- `apply`
- `resume`
- `fork`
- `cloud`
- `exec-server`
- `features`

### 소스와 설치 바이너리의 차이
다운로드한 최신 소스에는 `doctor`가 정의되어 있지만, 설치된 `codex-cli 0.130.0`의 실제 `--help` 출력에서는 `doctor`가 보이지 않았다. 즉, 현재 시스템의 설치 버전과 다운로드한 소스 HEAD는 완전히 동일하지 않다고 보는 편이 안전하다.

## `exec`가 왜 중요한가
비대화형으로 Codex를 쓰려면 사실상 `exec`가 핵심 진입점이다. 한 번의 지시를 처리하고 끝나는 자동화, 스크립트 연결, 파이프 입력, JSONL 소비, 결과 파일 저장 같은 기능이 여기에 집중되어 있다.

또한 최상위 `review`도 내부적으로는 `exec`로 재포장되어 실행된다. 소스상 `review` 서브커맨드를 받으면 `ExecCli`를 만든 뒤 `ExecCommand::Review`를 넣어서 `codex_exec::run_main(...)`으로 넘긴다.

즉, 비대화형 사용을 이해하려면 `exec`를 이해하면 된다.

## `exec`의 구조

### 기본 사용 형태
소스와 실제 도움말 기준 사용 형태는 다음과 같다.

```bash
codex exec [OPTIONS] [PROMPT]
codex exec [OPTIONS] <COMMAND> [ARGS]
```

여기서 `COMMAND`는 일반 셸 명령이 아니라 `exec` 내부 서브커맨드를 뜻한다. 현재 공개된 것은 다음 둘이다.

- `resume`
- `review`

즉, 보통 비대화형 사용은 아래 둘 중 하나다.

```bash
codex exec "작업 지시문"
codex exec review --base main
```

## `exec`의 내부 동작 원리

### 1. 최상위 CLI에서 `exec`로 분기
최상위 `codex`는 `Subcommand::Exec(ExecCli)`를 만나면 `codex_exec::run_main(...)`을 호출한다.

### 2. `exec`는 자체 실행기다
`codex-rs/exec/src/lib.rs`가 실제 비대화형 실행의 본체다. 여기서 설정을 읽고, 작업 디렉터리를 정하고, 앱 서버 클라이언트를 띄우고, 프롬프트를 구성하고, 이벤트를 처리한 뒤 종료한다.

### 3. 출력 모드가 두 가지다
소스의 주석이 아주 명확하다.

- 일반 모드: 표준출력에는 마지막 최종 메시지만 나가야 한다.
- `--json` 모드: 표준출력은 JSONL이어야 한다.
- 그 외 부가 로그, 경고, 진행 상황은 표준에러로 보낸다.

이 설계는 스크립트 연결을 쉽게 만들기 위한 것이다.

## `exec`의 입력 방식

`exec`는 프롬프트를 여러 방식으로 받을 수 있다.

### 1. 위치 인자로 직접 주기
```bash
codex exec "README를 요약해줘"
```

가장 일반적인 방식이다.

### 2. 표준입력만으로 프롬프트 주기
소스 테스트 기준, 위치 인자가 없고 stdin이 들어오면 stdin 전체를 프롬프트로 사용한다.

의도된 예:
```bash
echo "prompt from stdin" | codex exec --skip-git-repo-check
```

### 3. `-`를 써서 stdin 강제 사용
소스 테스트 기준, `-`를 프롬프트 자리에 넣으면 stdin을 반드시 프롬프트로 읽는다.

의도된 예:
```bash
echo "prompt from stdin" | codex exec --skip-git-repo-check -
```

### 4. 위치 인자와 stdin을 함께 쓰기
소스 테스트 기준, 위치 인자 프롬프트가 있고 stdin도 들어오면 stdin은 별도 문맥으로 붙는다.

형태:
```text
원래 프롬프트

<stdin>
stdin 내용
</stdin>
```

즉, 파이프 결과를 “추가 참고 자료”처럼 붙이는 설계다.

### 5. stdin이 비어 있으면 실패
실제 측정과 소스 테스트 모두, stdin을 써야 하는 상황에서 입력이 비어 있으면 다음 오류가 난다.

```text
No prompt provided via stdin.
```

실측:
```bash
codex exec --skip-git-repo-check --sandbox read-only -
```

결과:
- 종료 코드: `1`
- 메시지: `No prompt provided via stdin.`

### 6. 이미지 첨부 시에는 `--`를 붙이는 편이 안전했다
실측 기준, `-i <image>`를 붙이고 프롬프트를 위치 인자로 바로 넘기면 CLI가 프롬프트를 정상 인식하지 못하고 stdin 입력 모드로 빠지는 경우가 있었다.

실패 예:
```bash
codex exec --json --skip-git-repo-check --sandbox read-only -i sample/gen/tim.jpg "..."
```

실측 결과:
- stderr: `Reading prompt from stdin...`
- 오류: `No prompt provided via stdin.`

반면 아래처럼 `--`로 옵션 해석을 끊으면 정상 동작했다.

성공 예:
```bash
codex exec --json --skip-git-repo-check --sandbox read-only -i sample/gen/tim.jpg -- "..."
```

즉, 이미지 첨부와 함께 위치 인자 프롬프트를 줄 때는 `--`를 넣는 편이 안전하다.

## `exec`의 주요 옵션

실측 `codex exec -h`와 소스를 기준으로 중요한 옵션은 다음과 같다.

### 실행 환경 관련
- `--skip-git-repo-check`
  - Git 저장소 밖에서도 실행 허용
- `-C, --cd <DIR>`
  - 작업 루트 디렉터리 지정
- `--add-dir <DIR>`
  - 추가 쓰기 가능 디렉터리 지정

### 상태 저장 관련
- `--ephemeral`
  - 세션 파일을 디스크에 남기지 않음
- `--ignore-user-config`
  - 사용자 설정 파일 무시
- `--ignore-rules`
  - 사용자/프로젝트 execpolicy 규칙 무시

### 모델/공급자 관련
- `-m, --model <MODEL>`
- `--oss`
- `--local-provider <OSS_PROVIDER>`
- `-p, --profile <CONFIG_PROFILE>`

### 샌드박스 관련
- `-s, --sandbox <read-only|workspace-write|danger-full-access>`
- `--dangerously-bypass-approvals-and-sandbox`

### 출력 관련
- `--json`
  - JSONL 이벤트 스트림 출력
- `-o, --output-last-message <FILE>`
  - 마지막 에이전트 메시지를 파일로 저장
- `--output-schema <FILE>`
  - 최종 출력 형식을 JSON Schema로 강제
- `--color <always|never|auto>`

### 멀티모달 입력
- `-i, --image <FILE>...`
  - 초기 프롬프트에 이미지 첨부

## 주의할 점: 최상위 도움말과 `exec` 도움말은 다르다
실제로 `codex --help`에는 `--ask-for-approval` 같은 옵션이 보이지만, `codex exec --help`에는 보이지 않는다.

실측:
- `codex --help`에는 승인 정책 관련 항목이 노출됨
- `codex exec --help`에는 해당 옵션이 없음
- 실제로 `codex exec --ask-for-approval ...`를 실행하면 `unexpected argument '--ask-for-approval'` 오류가 발생함

즉, 최상위 도움말에서 보인 옵션이 `exec`에서도 모두 지원된다고 가정하면 안 된다.

## `exec`의 출력 방식

### 일반 모드
실제 실행:

```bash
codex exec --skip-git-repo-check --sandbox read-only "Print exactly OK and nothing else."
```

실측 결과:
- 시작 시 배너와 실행 설정 요약이 출력됨
- 그 뒤 최종 메시지 `OK`가 출력됨
- 토큰 사용량이 함께 표시됨
- 종료 코드: `0`

실제 관측된 초기 정보:
- `workdir`
- `model`
- `provider`
- `approval`
- `sandbox`
- `reasoning effort`
- `reasoning summaries`
- `session id`

실제 관측된 최종 출력:

```text
codex
OK
tokens used
17,667
OK
```

이때 사용자 입장에서 중요한 결과값은 마지막 `OK`다. 내부 구현상 사람용 출력 프로세서는 진행 상황과 부가 정보를 주로 표준에러로 내고, 마지막 메시지를 따로 추적한다.

### JSON 모드
실제 실행:

```bash
codex exec --json --skip-git-repo-check --sandbox read-only "Print exactly OK and nothing else."
```

실측 결과:

```json
{"type":"thread.started","thread_id":"019e3985-c9f3-7132-b8df-0e7f3ced2f45"}
{"type":"turn.started"}
{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"OK"}}
{"type":"turn.completed","usage":{"input_tokens":21109,"cached_input_tokens":3456,"output_tokens":11,"reasoning_output_tokens":9}}
```

즉, `--json`은 “최종 답만 한 줄”이 아니라 “실행 이벤트 스트림”을 한 줄씩 내보낸다. 자동화나 로그 수집, 후처리 파이프라인에는 이 모드가 더 적합하다.

### JSON 모드에서 이미지 생성 실측
이미지 첨부와 생성 요청도 `--json`으로 실측했다.

실행 예:
```bash
codex exec --json --skip-git-repo-check --sandbox read-only -i sample/gen/tim.jpg -- "첨부 이미지를 개발새발로 다시 그려줘"
```

초기 이벤트:

```json
{"type":"thread.started","thread_id":"019e39bc-6f92-7633-b648-6ab746e802a1"}
{"type":"turn.started"}
```

완료 이벤트:

```json
{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":""}}
{"type":"turn.completed","usage":{"input_tokens":26343,"cached_input_tokens":3456,"output_tokens":244,"reasoning_output_tokens":77}}
```

중요한 점은 다음과 같다.

- 텍스트 응답이 비어 있어도 이미지 생성은 성공할 수 있다.
- 생성 파일 경로는 JSONL 본문에 직접 들어오지 않았다.
- 대신 `thread.started.thread_id`를 이용해 저장 위치를 역추적해야 했다.

실측 저장 경로 패턴:

```text
~/.codex/generated_images/<thread_id>/<generated-file>.png
```

실제 예시:

```text
/Users/im_018/.codex/generated_images/019e39be-d2a3-7502-8e21-6c6cbd0c5e65/ig_09d3bda2c0e219f1016a0aafdeca0c8191b6cbcc935a83728d.png
```

따라서 이미지 생성 결과를 구조적으로 다루려면 보통 다음 순서가 필요했다.

1. JSONL에서 `thread_id`를 추출한다.
2. `~/.codex/generated_images/<thread_id>/`를 조회한다.
3. 그 디렉터리의 최신 이미지 파일을 최종 결과로 채택한다.

또한 성공 실행에서도 stderr에 `Reading additional input from stdin...` 문구가 남았다. 이 문구만으로 실패로 판정하면 안 되고, 종료 코드, 이벤트 스트림, 실제 파일 존재 여부를 함께 봐야 한다.

## `exec`와 세션 저장

소스 테스트 기준:
- 기본 모드에서는 세션 롤아웃 파일이 저장된다.
- `--ephemeral`을 주면 세션 파일이 저장되지 않는다.

즉, 완전히 일회성으로 써야 할 때는 `--ephemeral`이 의미가 있다.

## `exec`와 출력 스키마
소스 테스트 기준, `--output-schema schema.json`을 주면 요청에 JSON Schema가 포함된다. 즉, 비대화형 자동화에서 “자유 형식 답변” 대신 “정해진 JSON 구조”를 강제하는 데 사용할 수 있다.

이 점은 CLI를 배치 작업이나 다른 프로그램의 하위 프로세스로 사용할 때 매우 중요하다.

## `exec`의 하위 서브커맨드

### `codex exec resume`
목적:
- 이전 세션을 비대화형으로 다시 이어가기

특징:
- 세션 ID 또는 이름을 지정할 수 있음
- `--last`로 가장 최근 세션을 잡을 수 있음
- 이미지 첨부 가능
- 프롬프트 추가 전송 가능

### `codex exec review`
목적:
- 코드 리뷰 전용 비대화형 실행

지원 형태:
- `--uncommitted`
- `--base <BRANCH>`
- `--commit <SHA>`
- `--title <TITLE>`
- `[PROMPT]`

즉, `review`는 사실상 `exec`의 특수 모드라고 이해하면 된다.

## `review` 명령과 `exec review`의 관계
최상위 `codex review`는 독립 기능처럼 보이지만, 소스상 내부 동작은 `exec`에 `review` 명령을 넣어서 돌리는 구조다.

실무적으로는 이렇게 이해하면 된다.

- `codex review ...`
  - 편의용 별칭에 가까움
- `codex exec review ...`
  - 비대화형 실행기 내부의 실제 리뷰 모드

## 비대화형 CLI 관점에서의 다른 주요 인터페이스

### `sandbox`
Codex가 제공하는 샌드박스 안에서 명령을 실행하는 도구다. 플랫폼별 세부 구현 분기가 있다.

- macOS
- Linux
- Windows

즉, 에이전트 실행 자체가 아니라 “제한된 실행 환경”을 다루는 운영용 도구에 가깝다.

### `mcp` / `mcp-server`
- `mcp`는 외부 MCP 서버 관리
- `mcp-server`는 Codex 자체를 stdio MCP 서버로 실행

Codex를 다른 도구에 붙이려는 통합 시나리오에서 중요하다.

### `app-server`
앱 서버를 띄우거나 보조 작업을 수행한다. 하위 인터페이스는 다음과 같다.

- `daemon`
  - `bootstrap`
  - `start`
  - `restart`
  - `enable-remote-control`
  - `disable-remote-control`
  - `stop`
  - `version`
- `proxy`
- `generate-ts`
- `generate-json-schema`
- `generate-internal-json-schema`

즉, TUI 뒤에서 돌아가는 서비스 계층을 따로 운용하기 위한 관리 인터페이스다.

### `remote-control`
원격 제어가 켜진 앱 서버 데몬을 시작/중지한다.

- `start`
- `stop`

### `exec-server`
실험적 독립 실행 서버다. 원격 등록과 실행 위임 쪽에 가깝다.

### `features`
기능 플래그를 다룬다.

- `list`
- `enable <feature>`
- `disable <feature>`

### `debug`
개발/진단용 도구 모음이다.

### `plugin`
Codex 플러그인 관리 인터페이스다.

### `completion`
셸 자동완성 스크립트 생성용이다.

## 실제 실행 중 관측한 제약

### 샌드박스 안에서의 `exec`
현재 조사 환경에서, 기본 샌드박스 안에서 `codex exec`를 실행했을 때는 다음 오류가 났다.

```text
Error: failed to initialize in-process app-server client: Operation not permitted (os error 1)
```

즉, 이 환경에서는 `exec`가 내부 앱 서버를 띄우는 과정에서 샌드박스 제약에 걸렸다.

### 샌드박스 밖에서는 정상 작동
같은 명령을 샌드박스 밖에서 다시 실행하자 정상적으로 응답이 나왔다.

실무적 해석:
- `codex exec`는 단순 텍스트 처리기가 아니라, 내부 앱 서버 구성 요소를 띄우는 꽤 큰 실행 경로를 가진다.
- 따라서 권한이 너무 좁은 실행 환경에서는 예상보다 쉽게 막힐 수 있다.

## 비대화형 CLI로 쓸 때의 실전 해석

### 가장 안전한 이해
`codex exec`는 “질문 한 줄 넣고 답 한 줄 받는 아주 얇은 래퍼”가 아니다. 내부적으로는 다음을 포함한다.

- 설정 로드
- 작업 디렉터리 결정
- Git 저장소 확인
- 앱 서버 클라이언트 초기화
- 모델/공급자 결정
- 이벤트 스트림 처리
- 세션 저장 여부 결정
- 결과 출력 포맷 처리

즉, 스크립트형 인터페이스지만 내부는 꽤 무겁다.

### 자동화에 적합한 사용 방식
- 사람이 읽는 용도면 일반 모드
- 프로그램이 읽는 용도면 `--json`
- 구조화 결과가 필요하면 `--output-schema`
- 완전 일회성이면 `--ephemeral`
- Git 저장소 밖이면 `--skip-git-repo-check`
- 파이프 결과를 문맥으로 붙일 때는 `PROMPT + stdin`

## 결론
Codex의 CLI는 겉으로 보기보다 종류가 많고, 내부적으로는 TUI, 앱 서버, 실행 서버, 샌드박스, 통합 서버, 비대화형 실행기가 분리된 구조를 가진다. 일반 사용자가 비대화형으로 쓰려면 가장 중요한 인터페이스는 `codex exec`이다.

`exec`는 다음 특징 때문에 핵심이다.

- TUI 없이 한 번 실행하고 끝낼 수 있다.
- 표준입력, 위치 인자, 이미지 첨부를 받을 수 있다.
- 일반 출력과 JSONL 출력을 모두 지원한다.
- 출력 스키마 강제가 가능하다.
- 세션 저장/비저장을 제어할 수 있다.
- 최상위 `review` 기능도 내부적으로는 이것을 재사용한다.

따라서 “Codex를 비대화형 CLI 도구처럼 쓰고 싶다”는 요구는 대부분 “`codex exec`를 중심으로 어떤 옵션 조합을 써야 하는가”의 문제로 정리된다.

## 추천 시작점

### 사람이 직접 쓰는 최소 예
```bash
codex exec --sandbox read-only "현재 폴더의 역할을 설명해줘"
```

### 프로그램이 소비하는 예
```bash
codex exec --json --sandbox read-only "현재 변경사항을 요약해줘"
```

### 표준입력 결합 예
```bash
git diff | codex exec --sandbox read-only "이 변경사항의 위험 요소를 짚어줘"
```

### 구조화 결과 강제 예
```bash
codex exec --output-schema schema.json --sandbox read-only "이 저장소를 JSON으로 요약해줘"
```

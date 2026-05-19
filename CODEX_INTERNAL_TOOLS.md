# Codex 내부 Tool 조사

## 목적
이 문서는 다운로드한 `codex` 소스코드를 기준으로, Codex가 내부적으로 모델에게 노출하는 Tool을 빠짐없이 정리한 문서다.  
핵심 기준은 Tool 등록 경로인 `codex-rs/core/src/tools/spec_plan.rs`이며, 실제 개별 Tool 스펙은 각 `*_spec.rs` 파일과 핸들러 구현에서 확인했다.

## 조사 기준
- 최우선 기준: `codex/codex-rs/core/src/tools/spec_plan.rs`
- Tool 이름의 최종 표현: `codex/codex-rs/tools/src/tool_spec.rs`
- 개별 Tool의 입력 형식: 각 `codex/codex-rs/core/src/tools/**/*_spec.rs`
- 런타임 생성 Tool: MCP, Dynamic Tool, Extension Tool 관련 핸들러

## 큰 구조
Codex의 Tool은 크게 5종류로 나뉜다.

1. 소스코드에 이름이 고정되어 있는 내장 Tool
2. 설정에 따라 켜지거나 꺼지는 조건부 내장 Tool
3. Code Mode에서만 추가되는 Tool
4. OpenAI Responses API 쪽의 호스티드 Tool
5. 실행 시점에 외부 연결 상태에 따라 생기는 런타임 Tool

즉, “이름이 소스에 박혀 있는 Tool”과 “세션, MCP 서버, 플러그인, 동적 등록에 따라 생기는 Tool”을 구분해서 봐야 전체를 빠짐없이 이해할 수 있다.

## Tool 등록 원리
`build_tool_specs_and_registry()`가 Tool 목록을 만든다. 여기서 다음 흐름으로 Tool이 합쳐진다.

1. `collect_tool_executors()`가 내장 Tool과 런타임 Tool 실행기를 모은다.
2. `append_tool_search_executor()`가 필요할 때 `tool_search`를 추가한다.
3. `prepend_code_mode_executors()`가 Code Mode용 `exec`, `wait`를 앞쪽에 추가한다.
4. `hosted_model_tool_specs()`가 `web_search`, `image_generation` 같은 호스티드 Tool을 붙인다.
5. 마지막으로 namespace 병합을 거쳐 모델에 실제로 보이는 Tool 목록이 만들어진다.

## 1. 항상 이름이 고정된 내장 Tool

| Tool 명칭 | 용도 | 입력 방식 | 비고 |
| --- | --- | --- | --- |
| `exec_command` | PTY 기반 명령 실행 | JSON function call | 통합 exec 세션 방식 |
| `write_stdin` | 실행 중인 `exec_command` 세션에 입력 전송 또는 polling | JSON function call | 장기 실행 세션 후속 제어 |
| `shell_command` | 셸 명령 문자열 실행 | JSON function call | 단발성 shell 실행 |
| `request_permissions` | 추가 권한 요청 | JSON function call | 권한 승인 워크플로 |
| `apply_patch` | 패치 문법으로 파일 수정 | freeform | 일반 JSON이 아니라 문법 문자열 |
| `update_plan` | 작업 계획 업데이트 | JSON function call | 단계/상태 관리 |
| `list_mcp_resources` | MCP 리소스 목록 조회 | JSON function call | 리소스 기반 컨텍스트 탐색 |
| `list_mcp_resource_templates` | MCP 템플릿 리소스 목록 조회 | JSON function call | 파라미터화된 리소스 탐색 |
| `read_mcp_resource` | MCP 리소스 읽기 | JSON function call | URI로 개별 리소스 조회 |
| `view_image` | 로컬 이미지 파일 열람 | JSON function call | 전체 파일 경로 필요 |

### `exec_command`
- 정의 위치: `core/src/tools/handlers/shell_spec.rs`
- 용도: 셸 명령을 실행하고, 필요하면 장기 세션으로 이어서 제어한다.
- 주요 인자:
  - `cmd`
  - `workdir`
  - `shell`
  - `tty`
  - `yield_time_ms`
  - `max_output_tokens`
  - 환경에 따라 `login`
  - 권한 승인 기능이 켜져 있으면 `justification`, `sandbox_permissions`, `prefix_rule` 계열 승인 인자
- 사용 방식:
  - 단발 실행: `cmd`만 보내고 결과를 받는다.
  - 장기 실행: 세션 ID를 받은 뒤 `write_stdin`으로 이어서 제어한다.

### `write_stdin`
- 정의 위치: `core/src/tools/handlers/shell_spec.rs`
- 용도: `exec_command`로 열린 기존 세션에 입력을 보내거나, 빈 입력으로 상태를 poll 한다.
- 주요 인자:
  - `session_id`
  - `chars`
  - `yield_time_ms`
  - `max_output_tokens`

### `shell_command`
- 정의 위치: `core/src/tools/handlers/shell_spec.rs`
- 용도: 한 번에 셸 스크립트 문자열을 실행한다.
- 주요 인자:
  - `command`
  - `workdir`
  - `timeout_ms`
  - 환경에 따라 `login`
  - 권한 승인 기능이 켜져 있으면 추가 승인 인자
- 특징:
  - `exec_command`보다 단순하다.
  - 설명문에 `workdir`를 명시적으로 설정하라고 적혀 있다.

### `request_permissions`
- 정의 위치: `core/src/tools/handlers/shell_spec.rs`
- 용도: 파일시스템, 네트워크 같은 추가 권한을 사용자에게 요청한다.
- 주요 인자:
  - `permissions`
  - `reason`

### `apply_patch`
- 정의 위치: `core/src/tools/handlers/apply_patch_spec.rs`
- 용도: 파일 생성, 수정, 삭제를 패치 문법으로 수행한다.
- 입력 방식:
  - JSON function call이 아니라 freeform 문법 문자열
  - `*** Begin Patch` / `*** End Patch` 형식
- 특징:
  - Codex의 안전한 수동 편집 경로다.
  - 일반 텍스트가 아니라 정해진 문법을 반드시 따라야 한다.

### `update_plan`
- 정의 위치: `core/src/tools/handlers/plan_spec.rs`
- 용도: 작업 계획을 단계별로 기록하고 상태를 갱신한다.
- 주요 인자:
  - `explanation`
  - `plan`: `step`, `status`
- 제약:
  - 한 번에 `in_progress`는 최대 1개

### MCP 리소스 3종
- 정의 위치: `core/src/tools/handlers/mcp_resource_spec.rs`
- 구성:
  - `list_mcp_resources`
  - `list_mcp_resource_templates`
  - `read_mcp_resource`
- 용도:
  - MCP 서버가 제공하는 읽기용 컨텍스트를 탐색하고 읽는다.
- 특징:
  - MCP “도구 실행”이 아니라 MCP “리소스 읽기” 계층이다.

### `view_image`
- 정의 위치: `core/src/tools/handlers/view_image_spec.rs`
- 용도: 로컬 이미지 파일을 읽어 모델이 볼 수 있는 데이터 URL로 변환한다.
- 주요 인자:
  - `path`
  - 환경에 따라 `detail`
  - 환경에 따라 `environment_id`
- 특징:
  - 사용자가 전체 파일 경로를 줬을 때 쓰도록 설계돼 있다.

## 2. 조건부 내장 Tool
아래 Tool은 소스에는 존재하지만, 설정값에 따라 노출 여부가 달라진다.

| Tool 명칭 | 용도 | 노출 조건 |
| --- | --- | --- |
| `get_goal` | 현재 스레드 goal 조회 | `config.goal_tools` |
| `create_goal` | 새 goal 생성 | `config.goal_tools` |
| `update_goal` | goal 완료 처리 | `config.goal_tools` |
| `request_user_input` | 사용자에게 짧은 선택형 질문 요청 | 허용 모드에서만 |
| `request_plugin_install` | 특정 플러그인/커넥터 설치 요청 | `config.tool_suggest` 및 discoverable tool 존재 |
| `tool_search` | 지연 로딩 Tool 검색 | `config.search_tool && config.namespace_tools` 및 deferred tool 존재 |
| `test_sync_tool` | 테스트/실험용 동기화 Tool | `experimental_supported_tools`에 포함될 때 |
| `spawn_agents_on_csv` | CSV 각 행마다 worker agent 실행 | `config.agent_jobs_tools` |
| `report_agent_job_result` | agent job 결과 보고 | `config.agent_jobs_tools` |

### Goal Tool 3종
- 정의 위치: `core/src/tools/handlers/goal_spec.rs`
- 구성:
  - `get_goal`
  - `create_goal`
  - `update_goal`
- 용도:
  - 스레드 단위 장기 목표를 조회, 생성, 완료 처리한다.
- 특징:
  - `update_goal`은 사실상 `complete` 표시에만 쓰이도록 제한돼 있다.
  - pause, resume, 예산 제어는 이 Tool이 아니라 사용자/시스템이 담당한다.

### `request_user_input`
- 정의 위치: `core/src/tools/handlers/request_user_input_spec.rs`
- 용도: 사용자에게 1~3개의 짧은 질문을 보내고 응답을 기다린다.
- 주요 인자:
  - `questions`
  - 각 질문은 `id`, `header`, `question`, `options`
- 특징:
  - 모드 제약이 있다.
  - 옵션은 2~3개의 상호배타 선택지 형태를 권장한다.

### `request_plugin_install`
- 정의 위치: `core/src/tools/handlers/request_plugin_install_spec.rs`
- 용도: 아직 설치되지 않은 플러그인이나 커넥터 설치를 사용자에게 제안한다.
- 주요 인자:
  - `tool_type`
  - `action_type`
  - `tool_id`
  - `suggest_reason`
- 특징:
  - 임의 추천용이 아니다.
  - 사용자가 특정 플러그인/커넥터를 명시적으로 원했을 때만 쓰도록 강하게 제한돼 있다.

### `tool_search`
- 정의 위치: `core/src/tools/handlers/tool_search_spec.rs`
- 용도: 아직 upfront로 주어지지 않은 deferred tool 메타데이터를 BM25로 검색하고, 다음 모델 호출에서 쓸 수 있게 노출한다.
- 주요 인자:
  - `query`
  - `limit`
- 특징:
  - 타입은 일반 function이 아니라 `ToolSearch`
  - 설명문에 MCP 도구 탐색 시 `list_mcp_resources`보다 `tool_search`를 우선 쓰라고 적혀 있다.

### Agent Job Tool 2종
- 정의 위치: `core/src/tools/handlers/agent_jobs_spec.rs`
- 구성:
  - `spawn_agents_on_csv`
  - `report_agent_job_result`
- 용도:
  - CSV 각 행을 별도 worker agent에 위임하는 배치 작업
- 특징:
  - `report_agent_job_result`는 worker 전용 도구다.

### `test_sync_tool`
- 정의 위치: `core/src/tools/handlers/test_sync_spec.rs`
- 용도:
  - 테스트/실험용 내부 동기화 도구
- 비고:
  - 일반 사용 흐름보다는 개발/실험용 성격이 강하다.

## 3. 멀티 에이전트 Tool
멀티 에이전트는 v1과 v2가 다르다. 같은 `spawn_agent`라도 주변 Tool 구성이 달라진다.

## v1 멀티 에이전트 Tool

| Tool 명칭 | 용도 |
| --- | --- |
| `spawn_agent` | 새 agent 생성 |
| `send_input` | 기존 agent에 메시지 전달 |
| `resume_agent` | 닫힌 agent 재개 |
| `wait_agent` | agent 완료/상태 변화를 기다림 |
| `close_agent` | agent 종료 |

## v2 멀티 에이전트 Tool

| Tool 명칭 | 용도 |
| --- | --- |
| `spawn_agent` | 새 agent 생성 |
| `send_message` | agent mailbox에 메시지 전달 |
| `followup_task` | 대상 agent에 후속 작업 메시지 전송 후 턴 트리거 |
| `wait_agent` | mailbox 업데이트나 종료 상태를 기다림 |
| `list_agents` | agent 목록 조회 |
| `close_agent` | agent 종료 |

### 멀티 에이전트 관련 비고
- 정의 위치: `core/src/tools/handlers/multi_agents_spec.rs`
- v1은 `send_input`, `resume_agent` 중심이다.
- v2는 `send_message`, `followup_task`, `list_agents`가 들어간다.
- 설정에 따라 v2 Tool은 namespace 안에 묶여 노출될 수도 있다.

## 4. Code Mode 전용 Tool
Code Mode가 켜지면 일반 Tool과 별도로 모델에게 freeform 실행 인터페이스가 열린다.

| Tool 명칭 | 타입 | 용도 |
| --- | --- | --- |
| `exec` | freeform | Code Mode 셀 실행 |
| `wait` | JSON function call | 실행 중인 `exec` 셀 대기/종료 |

### `exec`
- 정의 위치: `core/src/tools/code_mode/execute_spec.rs`
- 용도:
  - Code Mode용 셀을 실행한다.
- 입력 형식:
  - 자유 형식 텍스트
  - 선택적으로 `// @exec:...` pragma 라인을 앞에 둘 수 있다.
- 특징:
  - 일반 function call이 아니라 grammar 기반 freeform Tool이다.
  - 내부적으로 다른 Tool들을 감싼 Code Mode 전용 실행 인터페이스다.

### `wait`
- 정의 위치: `core/src/tools/code_mode/wait_spec.rs`
- 용도:
  - 실행 중인 `exec` 셀의 추가 출력이나 완료를 기다린다.
- 주요 인자:
  - `cell_id`
  - `yield_time_ms`
  - `max_tokens`
  - `terminate`

## 5. Hosted Tool
이 Tool들은 로컬 핸들러가 아니라 OpenAI Responses API의 호스티드 Tool 타입으로 모델에 노출된다.

| Tool 명칭 | 타입 | 용도 | 노출 조건 |
| --- | --- | --- | --- |
| `web_search` | hosted | 웹 검색 | `web_search_mode`가 live 또는 cached |
| `image_generation` | hosted | 이미지 생성 | `config.image_gen_tool` |

### `web_search`
- 정의 위치: `core/src/tools/hosted_spec.rs`
- 실제 Tool 이름 해석: `tools/src/tool_spec.rs`
- 특징:
  - `external_web_access`로 live/cached 성격을 구분한다.
  - 설정에 따라 domain filter, user location, context size, content type이 붙을 수 있다.

### `image_generation`
- 정의 위치: `core/src/tools/hosted_spec.rs`
- 실제 Tool 이름 해석: `tools/src/tool_spec.rs`
- 특징:
  - 현재 생성 스펙에서는 `output_format`만 가진다.

## 6. 런타임에 생기는 Tool
여기부터는 “정확한 이름이 소스에 하드코딩되지 않을 수 있는” Tool들이다.  
소스만으로 “종류”는 완전히 조사할 수 있지만, “실제 이름 목록”은 현재 연결된 서버/플러그인/세션 상태에 따라 달라진다.

## MCP Tool
- 관련 구현:
  - 등록/실행: `core/src/tools/handlers/mcp.rs`
- 원리:
  - MCP 서버가 광고한 Tool이 Codex Tool로 변환된다.
  - namespace가 있으면 namespace Tool로 노출된다.
- 이름 규칙:
  - `tool_info.canonical_tool_name()` 기준
  - 즉, 실제 명칭은 연결된 MCP 서버가 제공하는 Tool 이름에 따라 달라진다.
- 특징:
  - 병렬 호출 가능 여부도 MCP Tool 메타데이터를 따른다.
  - 검색용 메타데이터는 `tool_search`에서 활용된다.

## Dynamic Tool
- 관련 구현:
  - 등록/실행: `core/src/tools/handlers/dynamic.rs`
- 원리:
  - 현재 Codex thread에 동적으로 등록된 Tool 스펙을 받아 Tool로 노출한다.
- 이름 규칙:
  - `DynamicToolSpec.name`
  - namespace가 있으면 `namespace.name` 형태로 노출
- 특징:
  - `defer_loading`이면 `ToolExposure::Deferred`
  - 아니면 `ToolExposure::Direct`

## Extension Tool
- 관련 구현:
  - 어댑터: `core/src/tools/handlers/extension_tools.rs`
- 원리:
  - extension/plugin 쪽 실행기가 자신의 Tool 스펙을 제공하면, Codex가 그대로 감싸서 Tool로 노출한다.
- 이름 규칙:
  - extension executor가 선언한 이름 그대로 사용
- 특징:
  - 따라서 실제 목록은 설치된 extension/plugin에 따라 달라진다.

## 7. 실제로 “빠짐없이” 보려면 어떻게 봐야 하나
소스코드 관점에서 빠짐없는 조사는 아래처럼 해석해야 정확하다.

1. 고정 이름의 내장 Tool은 이 문서에 모두 열거할 수 있다.
2. 호스티드 Tool도 이름이 고정되어 있으므로 모두 열거할 수 있다.
3. 멀티 에이전트 Tool은 v1/v2를 나눠 모두 열거할 수 있다.
4. MCP, Dynamic, Extension Tool은 “종류와 생성 규칙”은 완전 조사 가능하지만, 실제 최종 이름 목록은 실행 환경 의존적이다.

즉, 소스 기준으로 완전한 목록은 아래 두 층으로 구성된다.

- 고정 이름 Tool
  - `exec_command`
  - `write_stdin`
  - `shell_command`
  - `request_permissions`
  - `apply_patch`
  - `update_plan`
  - `list_mcp_resources`
  - `list_mcp_resource_templates`
  - `read_mcp_resource`
  - `view_image`
  - `get_goal`
  - `create_goal`
  - `update_goal`
  - `request_user_input`
  - `request_plugin_install`
  - `tool_search`
  - `spawn_agent`
  - `send_input`
  - `resume_agent`
  - `wait_agent`
  - `close_agent`
  - `send_message`
  - `followup_task`
  - `list_agents`
  - `spawn_agents_on_csv`
  - `report_agent_job_result`
  - `test_sync_tool`
  - `exec`
  - `wait`
  - `web_search`
  - `image_generation`

- 런타임 생성 Tool
  - MCP Tool
  - Dynamic Tool
  - Extension Tool

## 8. Tool별 사용 방식 요약

### 셸/실행 계열
- `exec_command`: 구조화된 명령 실행, 장기 세션 가능
- `write_stdin`: 장기 세션 후속 제어
- `shell_command`: 단순 셸 실행
- `exec` / `wait`: Code Mode 셀 실행과 대기

### 편집/작업 관리 계열
- `apply_patch`: 패치 문법 파일 수정
- `update_plan`: 단계 계획 업데이트

### 사용자 상호작용 계열
- `request_permissions`: 권한 요청
- `request_user_input`: 사용자 선택형 질문
- `request_plugin_install`: 플러그인/커넥터 설치 제안

### 검색/컨텍스트 계열
- `tool_search`: deferred tool 검색
- `list_mcp_resources`
- `list_mcp_resource_templates`
- `read_mcp_resource`
- `view_image`
- `web_search`

### 장기 목표/에이전트 계열
- `get_goal`
- `create_goal`
- `update_goal`
- `spawn_agent`
- `send_input` 또는 `send_message`
- `followup_task`
- `resume_agent`
- `wait_agent`
- `list_agents`
- `close_agent`
- `spawn_agents_on_csv`
- `report_agent_job_result`

## 9. 소스 기준 결론
Codex의 내부 Tool 시스템은 “몇 개의 고정 Tool만 있는 구조”가 아니다.  
실제 구조는 다음과 같다.

1. 소스에 이름이 고정된 핵심 내장 Tool 세트가 있다.
2. 설정값에 따라 goal, search, plugin install, agent jobs 같은 Tool이 추가된다.
3. Code Mode가 켜지면 `exec`, `wait`라는 별도 실행 계층이 열린다.
4. OpenAI hosted tool인 `web_search`, `image_generation`이 별도로 붙을 수 있다.
5. MCP, Dynamic Tool, Extension Tool이 런타임에 추가되므로, 최종 Tool 목록은 세션마다 달라질 수 있다.

따라서 Codex의 Tool을 정확히 이해하려면, 단순히 이름 목록만 보는 것이 아니라 “무엇이 고정이고 무엇이 런타임 생성인지”까지 함께 봐야 한다.

## 참고한 주요 소스 파일
- `codex/codex-rs/core/src/tools/spec_plan.rs`
- `codex/codex-rs/tools/src/tool_spec.rs`
- `codex/codex-rs/core/src/tools/handlers/shell_spec.rs`
- `codex/codex-rs/core/src/tools/handlers/apply_patch_spec.rs`
- `codex/codex-rs/core/src/tools/handlers/plan_spec.rs`
- `codex/codex-rs/core/src/tools/handlers/mcp_resource_spec.rs`
- `codex/codex-rs/core/src/tools/handlers/request_user_input_spec.rs`
- `codex/codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs`
- `codex/codex-rs/core/src/tools/handlers/tool_search_spec.rs`
- `codex/codex-rs/core/src/tools/handlers/goal_spec.rs`
- `codex/codex-rs/core/src/tools/handlers/multi_agents_spec.rs`
- `codex/codex-rs/core/src/tools/handlers/agent_jobs_spec.rs`
- `codex/codex-rs/core/src/tools/code_mode/execute_spec.rs`
- `codex/codex-rs/core/src/tools/code_mode/wait_spec.rs`
- `codex/codex-rs/core/src/tools/handlers/view_image_spec.rs`
- `codex/codex-rs/core/src/tools/hosted_spec.rs`
- `codex/codex-rs/core/src/tools/handlers/mcp.rs`
- `codex/codex-rs/core/src/tools/handlers/dynamic.rs`
- `codex/codex-rs/core/src/tools/handlers/extension_tools.rs`

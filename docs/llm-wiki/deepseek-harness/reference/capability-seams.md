---
id: ref.capability-seams
title: seam 清单
kind: catalog
tier: T3
pkg: cross
source:
  - docs/capability-seams.md
  - docs/architecture.md
  - vendor/cordis/src/service.ts
  - packages/attachment/attachment/src/index.ts
  - packages/llm/llm/src/index.ts
  - packages/llm/token-meter/src/index.ts
  - packages/compaction/compaction/src/index.ts
  - packages/compaction/compaction-tool-result-pruner/src/index.ts
  - packages/core/session/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/system-prompt/src/index.ts
  - packages/core/agent/src/index.ts
  - packages/core/agent-loop/src/index.ts
  - packages/core/agent-default-model/src/index.ts
  - packages/runtime-diagnostics/invariants/src/index.ts
  - packages/typert/protocol/src/types.ts
  - packages/typert/registry/src/service.ts
  - packages/api/gateway/src/index.ts
  - packages/api/gateway/src/types.ts
  - packages/session/session-persistence/src/index.ts
  - packages/session/session-telemetry/src/index.ts
  - packages/session/session-title/src/index.ts
  - packages/session/session-projection/src/index.ts
  - packages/session/session-projection-cache/src/index.ts
  - packages/settings/settings/src/index.ts
  - packages/credentials/credentials/src/index.ts
  - packages/storage/storage/src/index.ts
  - packages/storage/storage-domain/src/index.ts
  - packages/feedback/message-feedback/src/index.ts
  - packages/workspace/workspace/src/index.ts
  - packages/session-query/session-query/src/index.ts
  - packages/context/session-reference/src/index.ts
  - packages/interaction/user-questions/src/index.ts
  - packages/interaction/user-approval/src/index.ts
  - packages/interaction/commands/src/index.ts
  - packages/interaction/permission-presets/src/index.ts
  - packages/plan/plan-mode/src/index.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/skill/skill/src/index.ts
  - packages/goal/goal/src/index.ts
  - packages/e2b/e2b/src/index.ts
  - packages/e2b/fs-e2b/src/index.ts
  - packages/e2b/subprocess-e2b/src/index.ts
  - packages/subprocess/subprocess/src/index.ts
  - packages/shell/shell/src/index.ts
  - packages/shell/shell-env/src/index.ts
  - packages/shell/bash-local/src/index.ts
  - packages/shell/bash-sandbox/src/index.ts
  - packages/terminal/terminal/src/index.ts
  - packages/terminal/terminal-bash/src/index.ts
  - packages/sandbox/sandbox/src/index.ts
  - packages/sandbox/sandbox-policy/src/index.ts
  - packages/code-runtime/code-runtime/src/index.ts
  - packages/fs/fs/src/index.ts
  - packages/fs/fs-sandbox/src/index.ts
  - packages/fs/fs/tests/service.spec.ts
  - packages/fs/tool-fs/src/index.ts
  - packages/fs/tool-fs-search/src/index.ts
  - packages/subagent/subagent/src/index.ts
  - packages/subagent/subagent-acp/src/index.ts
  - packages/jobs/jobs/src/index.ts
  - packages/web/web/src/index.ts
  - packages/spill/spill/src/index.ts
  - packages/host/directory-picker/src/index.ts
  - packages/host/webserver/src/index.ts
  - packages/host/apiproxy/src/index.ts
  - packages/host/plugin-inventory/src/index.ts
  - packages/client/modules/src/index.ts
  - packages/workflow/workflow/src/index.ts
  - packages/lsp/lsp/src/index.ts
  - packages/lsp/lsp-stdio/src/index.ts
  - packages/extensions/cordis-host-runner/src/index.ts
  - packages/extensions/cordis-host-runner/src/inspect-registry.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - examples/headless-agent/e2b.cordis.yml
symbols:
  - FileSystem
  - ShellExecutor
  - SubprocessRuntime
  - LlmRuntime
  - SessionStore
  - ToolRuntime
  - SandboxProvider
  - TerminalSessionService
  - Lsp
  - CodeRuntime
  - SubagentRuntime
  - AgentRegistry
  - AgentLoop
  - E2BRuntime
  - JobRegistry
  - WorkflowEngine
  - CompactionEngine
  - AttachmentStore
  - SessionPersistence
  - SettingsProvider
  - CredentialProvider
  - ApprovalService
  - UserQuestionService
  - DomainFacility
  - PluginInventoryGateway
related:
  - spine.capability-seams
  - ref.ctx-keys
  - spine.overview
  - ref.glossary
  - ref.package-index
  - subsys.execution.fs
  - subsys.execution.subprocess
  - subsys.llm.service
evidence: explicit
status: verified
updated: 47f943859b
---

> DSH 的 **capability seam** 是一条可替换能力的三角：Definition 声明并 `super(ctx, '<key>')` 占住 `ctx.*`，Provider 实现（或往 registry 登记），Consumer `inject` 后调用；官方生成图里同一批 `svc_*` 还夹着 **core spine** 与 **bundle** 点，它们占键但不承诺第二实现。

## 能回答的问题

- 某个 `ctx.*` / `svc_*` 是 swappable seam、core spine，还是 bundle 点？Definition 类在哪个包？
- 默认 `dsh web`（`dsh-base` + `dsh-web-app` + preset `standard`）里谁真正 `provide` 这个键？
- 换 `ctx.fs`、只换 `ctx.subprocess`、还是两个一起换，分别带走 Bash / PTY / LSP / `glob`·`grep` 的哪一段？
- 登记式 hub（`ctx.llm` / `ctx.web` / `ctx.subagents`）和独占 occupancy（`ctx.fs` / `ctx.shell`）换 provider 的语义差在哪？
- preset 里 publish 服务为什么必须 `isolate`？`minimal` 的 `ctx.fs` / `ctx.terminals` 和 host 上的 `fs-sandbox` 是不是同一个实例？
- 官方 `docs/capability-seams.md` 写的 `lsp-local` / `code-runtime-worker` / `host-runtime` 在冻结树里对应哪个真实包？

## 范围与 ground truth

本页是 **T3 catalog**：官方 `docs/capability-seams.md` 里每一个 `svc_*` / `ctx.*` 占一行，并标种类。列是 seam/ctx 键 · Definition 包+类 · Provider 包 · Consumer 包 · 换 provider 会带走什么 · 源 path。机制走读在 [`spine.capability-seams`](../spine/capability-seams.md)；按键枚举（含 `ctx.provide` 与 client 半边）在 [`ref.ctx-keys`](ctx-keys.md)。

DSH 是 **Cordis 组合运行时**（`profile → bundle → agent preset`），不是固定 coding agent。默认安装是本地 Web GUI（`dsh web` / `dsh --profile web`）。本仓没有 shipped TUI 包；help 里的 `tui` 只是自定义 profile 名。

**host 面**（进程级，会话出现前就要 settle）：`ctx.fs` / `ctx.shell` / `ctx.subprocess` / `ctx.sandbox` / persistence / `ctx.jobs` 注册表 / `ctx.llm` / `ctx.tools` 注册表。**agent-preset 面**（每会话）：tools / persona / 必须 `isolate` 的 per-agent service。浏览器 client 是另一进程，不实现 `FileSystem` / `ShellExecutor` / `SubprocessRuntime`。

认哪份源：各 Definition 包的 `interface Context` 与 `super(ctx, '<key>')`（或 `ctx.provide`）；组合真树认 `packages/bundle/{base,web-app,headless}/cordis.patch.yml` 与四个 `agent.cordis.yml`。`Service` 构造里 `ctx.reflect.provide(name, self, …)`；同一 realm 再挂同名会炸，fiber dispose 后键变 `undefined`。[E: vendor/cordis/src/service.ts:57][E: packages/fs/fs/tests/service.spec.ts:100]

官方 `docs/capability-seams.md` / `docs/architecture.md` **只当查漏，禁止 [E]**。官方表漏掉或写错包名的，跟代码，记在对照节。`dshHomePath` / `cmdlineArgs` / `appExit` 与 client 键（`theme` / `locale` / `slots`）不在本页实例表。

三种 occupancy：

- **独占 occupancy seam**：抽象 `Service` 子类占键，同一 realm 只能有一个实现（`FileSystem` / `ShellExecutor` / `SubprocessRuntime`）。
- **登记式 seam**：Definition 自己是 concrete hub，adapter `register` 进表（`LlmRuntime` / `WebRuntime` / `SubagentRuntime` / `Lsp` / `TerminalSessionService`）。
- **core spine / bundle**：没有第二实现；`ctx.agentLoop` 被官方标成 bundle，因为扩展应依赖 `dsh-agent` 事件而不是这个包。

## 实例表

### 独占 occupancy · swappable seam

同一 realm 装两个同名实现会按 Cordis 重复注册失败。默认 `dsh web` 的 host 行来自 `dsh-base`（再被 `dsh-web-app` 叠层）。[E: packages/bundle/base/cordis.patch.yml:164][E: packages/bundle/base/cordis.patch.yml:444]

| seam/ctx 键 | Definition 包+类 | Provider 包 | Consumer 包 | 换 provider 会带走什么 | 源 path |
|---|---|---|---|---|---|
| `ctx.attachments` | `@deepseek-ai/dsh-attachment` `AttachmentStore` | 默认 `dsh-attachment-local`（base `attachment-local`） | `dsh-host-apiproxy`、`dsh-llm-pi-ai`、`dsh-tool-fs`（`read_image` 另 `inject`） | 换存储根：图片 bytes 的 commit / 解析世界；session 日志仍只留引用 | `packages/attachment/attachment/src/index.ts` [E: packages/attachment/attachment/src/index.ts:31] |
| `ctx.sessionPersistence` | `@deepseek-ai/dsh-session-persistence` `SessionPersistence` | 默认 `dsh-session-persistence-jsonl`；另有 `dsh-session-persistence-sqlite` | `dsh-agent-loop`、hooks、`dsh-session-query*`、`dsh-message-feedback`、`dsh-tool-bash` | 换后端：同一套 `SessionEvent` 的落盘介质与 `SessionLocation` | `packages/session/session-persistence/src/index.ts` [E: packages/session/session-persistence/src/index.ts:86] |
| `ctx.settings` | `@deepseek-ai/dsh-settings` `SettingsProvider` | 默认 `dsh-settings-file`（`$DSH_HOME/settings.yaml`） | `dsh-llm-deepseek`、`dsh-llm-pi-ai`、`dsh-host-apiproxy` | 换存储：用户层文档读写；namespace schema 仍由各插件登记 | `packages/settings/settings/src/index.ts` [E: packages/settings/settings/src/index.ts:367] |
| `ctx.credentials` | `@deepseek-ai/dsh-credentials` `CredentialProvider` | 默认 `dsh-credentials-local` | `dsh-llm-deepseek`、`dsh-llm-pi-ai`、`dsh-host-apiproxy` | 换密钥库：下一请求起解析到的 secret 值 | `packages/credentials/credentials/src/index.ts` [E: packages/credentials/credentials/src/index.ts:62] |
| `ctx.sessionTelemetry` | `@deepseek-ai/dsh-session-telemetry` `SessionTelemetryBackend` | 默认 `dsh-session-telemetry-otel` | 无进程内业务 consumer（输出离开进程） | 换导出后端：redact 后的 session 记录去向 | `packages/session/session-telemetry/src/index.ts` |
| `ctx.sessionQuery` | `@deepseek-ai/dsh-session-query` `SessionQueryEngine` | 默认 `dsh-session-query-sqlite`（web 叠 `path: ':memory:'`、`openAt: never`） | `dsh-session-reference`、`dsh-tool-session-query`、`dsh-host-apiproxy` | 换引擎：精确读/trace 仍在；全文 search / ranking 随 sqlite 后端走 | `packages/session-query/session-query/src/index.ts` |
| `ctx.sandbox` | `@deepseek-ai/dsh-sandbox` `SandboxProvider` | 默认 `dsh-sandbox-local`（win32 的 `windows-acl` 是该 provider 内部 runner，不另占键） | `dsh-bash-sandbox`、`dsh-terminal-bash` | 换 confine 实现：同一 argv 的包装/拒绝世界 | `packages/sandbox/sandbox/src/index.ts` [E: packages/sandbox/sandbox/src/index.ts:161] |
| `ctx.codeRuntime` | `@deepseek-ai/dsh-code-runtime` `CodeRuntime` | 默认 `dsh-code-runtime-worker-thread`（web-app / headless 插入；官方短名 `code-runtime-worker`） | `dsh-tools`（Code Mode `run_code`） | 换 substrate / language：`run_code` 执行世界 | `packages/code-runtime/code-runtime/src/index.ts` [E: packages/code-runtime/code-runtime/src/index.ts:122] [E: packages/bundle/web-app/cordis.patch.yml:49] |
| `ctx.fs` | `@deepseek-ai/dsh-fs` `FileSystem` | 默认 host `dsh-fs-sandbox`；另 `dsh-fs-local`、`dsh-fs-e2b`。`minimal` isolate 另挂 `fs-local` | `dsh-tool-fs`、`dsh-lsp-stdio`（也 `inject` `fs`） | **只换 fs**：`read`/`write`/`edit`/`str_replace_editor` 与 LSP 文档世界；**不**搬走 `bash -c` | `packages/fs/fs/src/index.ts` [E: packages/fs/fs/src/index.ts:46] [E: packages/fs/fs/src/index.ts:88] |
| `ctx.compaction` | `@deepseek-ai/dsh-compaction` `CompactionEngine` | `dsh-compaction-basic`（web 关掉 host 行，由 preset isolate 再挂） | 本后端自己听 pressure；无 model-facing compact 工具 | 换引擎：摘要/恢复策略；`ctx.tokenMeter` 仍在 host | `packages/compaction/compaction/src/index.ts` [E: packages/compaction/compaction/src/index.ts:98] |
| `ctx.jobs` | `@deepseek-ai/dsh-jobs` `JobRegistry` | 默认 `dsh-jobs-local`（直接 load 抽象包会抛） | `dsh-tool-bash`、`dsh-tool-terminal`、`dsh-tool-subagent`、`dsh-tool-jobs` | 换注册表：后台 bash / PTY send / 委托的 list·kill 世界 | `packages/jobs/jobs/src/index.ts` [E: packages/jobs/jobs/src/index.ts:70] |
| `ctx.spillStore` | `@deepseek-ai/dsh-spill` `SpillStore` | 默认 `dsh-spill-local` | `dsh-spill-policy`（`tools/post-execute`） | 换溢出介质：超长 tool 文本的 locator | `packages/spill/spill/src/index.ts` |
| `ctx.directoryPicker` | `@deepseek-ai/dsh-host-directory-picker` `DirectoryPicker` | web 默认 `dsh-host-directory-picker-auto` → native 或 browse | `dsh-host-apiproxy` | 换交互面：OS 原生选目录 vs 应用内浏览/创建 | `packages/host/directory-picker/src/index.ts` |
| `ctx.workflowEngine` | `@deepseek-ai/dsh-workflow` `WorkflowEngine` | `dsh-workflow-worker-thread`（web 关掉 host 行；standard isolate `workflowEngine`） | `dsh-tool-workflow`、`dsh-tool-ralph` | 换引擎：`workflow` / `ralph` 的脚本运行时；`agent()` 仍走 `ctx.subagents` | `packages/workflow/workflow/src/index.ts` [E: packages/workflow/workflow/src/index.ts:159] |
| `ctx.subprocess` | `@deepseek-ai/dsh-subprocess` `SubprocessRuntime` | 默认 `dsh-subprocess-local`；另 `dsh-subprocess-e2b` | `dsh-bash-local`/`dsh-bash-sandbox`、`dsh-pwsh-*`、`dsh-terminal-bash`、`dsh-lsp-stdio`、`dsh-tool-fs-search`、`dsh-subagent-acp`/`codex`/`claude-code` | **只换 subprocess**：Bash / PTY / `glob`·`grep` / 进程外 subagent / LSP **进程**；**不**搬走 `read`/`write` | `packages/subprocess/subprocess/src/index.ts` [E: packages/subprocess/subprocess/src/index.ts:70] [E: packages/subprocess/subprocess/src/index.ts:104] |
| `ctx.shell` | `@deepseek-ai/dsh-shell` `ShellExecutor` | 默认非 win32 `dsh-bash-sandbox`、win32 `dsh-pwsh-sandbox`；另 `dsh-bash-local`、`dsh-pwsh-local`（官方表漏 `pwsh-sandbox`） | `dsh-tool-bash`、`dsh-tool-pwsh`、hooks-claude / hooks-codex | 换执行器：one-shot `bash`/`pwsh` 的 argv 方言与 sandbox 包装；底层 spawn 仍问 `ctx.subprocess` | `packages/shell/shell/src/index.ts` [E: packages/shell/shell/src/index.ts:42] [E: packages/shell/shell/src/index.ts:67] [E: packages/bundle/base/cordis.patch.yml:179] [E: packages/bundle/base/cordis.patch.yml:185] |

### 登记式 seam（hub 占键，adapter 登记）

hub 本身通常只有一份；「换 provider」= 增删登记项，不换 `ctx` 键上的那个 Service 实例。

| seam/ctx 键 | Definition 包+类 | Provider 包 | Consumer 包 | 换 provider 会带走什么 | 源 path |
|---|---|---|---|---|---|
| `ctx.llm` | `@deepseek-ai/dsh-llm` `LlmRuntime` | hub=`dsh-llm`；adapter=`dsh-llm-deepseek`（默认路由 `deepseek-official`）、`dsh-llm-pi-ai`（零 route 直到 Settings）、测试 `dsh-llm-replay` | `dsh-agent-loop`、`dsh-compaction-basic` | 卸一个 adapter：该 route / stream 实现消失；loop 仍打 `ctx.llm` | `packages/llm/llm/src/index.ts` [E: packages/llm/llm/src/index.ts:48] [E: packages/llm/llm/src/index.ts:293] |
| `ctx.storage` | `@deepseek-ai/dsh-storage` `Storage` | hub=`dsh-storage`；backend=`dsh-storage-json`（web 默认）、`dsh-storage-sqlite` | `dsh-storage-domain` | 换/加 backend 名：domain 路由到的 KV 介质 | `packages/storage/storage/src/index.ts` |
| `ctx.sessionTitle` | `@deepseek-ai/dsh-session-title` `SessionTitleService` | hub 自带确定性 fallback；可选 `dsh-session-title-first-prompt-llm`（base 默认）、`dsh-session-title-all-prompts-llm` | 投影 / apiproxy 读 title fold | `register()` 只能挂一个异步生成器；卸掉回 fallback | `packages/session/session-title/src/index.ts` |
| `ctx.skills` | `@deepseek-ai/dsh-skill` `SkillRegistry` | hub=`dsh-skill`；`dsh-skill-badge`、`dsh-skill-filesystem`（web 关掉 host 行，preset 再挂一层） | `dsh-tool-skill` | 卸一个 provider：该层 catalog 条目消失；registry 分层仍在 | `packages/skill/skill/src/index.ts` [E: packages/skill/skill/src/index.ts:375] |
| `ctx.userQuestions` | `@deepseek-ai/dsh-user-questions` `UserQuestionService` | 本包占键；UI `registerProvider`（web：`dsh-client-ui-user-questions`） | `dsh-tool-ask-user` | 换 UI provider：`ask()` 等人的通道；无 provider 则问不出去。第二份会 `DUPLICATE_PROVIDER` | `packages/interaction/user-questions/src/index.ts` [E: packages/interaction/user-questions/src/index.ts:16] [E: packages/interaction/user-questions/src/index.ts:64] |
| `ctx.terminals` | `@deepseek-ai/dsh-terminal` `TerminalSessionService` | hub=`dsh-terminal`；backend=`dsh-terminal-bash`。默认 `standard` **不**装；`minimal` isolate `terminals` | `dsh-tool-terminal`、`dsh-tool-bash-persistent` | 换 backend：PTY 力学；registry 仍按 Agent 管 session 身份 | `packages/terminal/terminal/src/index.ts` [E: packages/terminal/terminal/src/index.ts:116] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:22] |
| `ctx.subagents` | `@deepseek-ai/dsh-subagent` `SubagentRuntime` | hub 在 host；`dsh-subagent-spawn-in-process`、`dsh-subagent-fork-in-process`、`dsh-subagent-acp`、`dsh-subagent-codex`、`dsh-subagent-claude-code`、`dsh-subagent-dsh-sdk` | `dsh-tool-subagent`、`dsh-tool-subagent-control`、`dsh-tool-ralph` | 卸一个 transport：该 `provider:` 名不可委派；进程外后端还 `inject` `subprocess` | `packages/subagent/subagent/src/index.ts` [E: packages/subagent/subagent/src/index.ts:184] |
| `ctx.web` | `@deepseek-ai/dsh-web` `WebRuntime` | hub=`dsh-web`；search=`dsh-web-search-deepseek`（base）/`exa`/`perplexity`；fetch=`dsh-web-fetch-http` | `dsh-tool-web`（稳定 wire 名） | 卸一个 search/fetch 实现：对应能力从 `web_search`/`web_fetch` 消失 | `packages/web/web/src/index.ts` [E: packages/web/web/src/index.ts:91] |
| `ctx.lsp` | `@deepseek-ai/dsh-lsp` `Lsp` | hub=`dsh-lsp`；stdio 后端是 **`dsh-lsp-stdio`**（官方短名 `lsp-local` 在冻结树无此包）。shipped preset **不**挂；e2b 例才插 | `dsh-tool-lsp` | 卸 backend：四个规范化 query 的翻译/进程；hub 选路表变空 | `packages/lsp/lsp/src/index.ts` [E: packages/lsp/lsp/src/index.ts:87] |
| `ctx.approval` | `@deepseek-ai/dsh-user-approval` `ApprovalService` | **本包占键**（base `approval`）。官方把 `acp` 写成 implementation，代码里 ACP 是 `approval/request` waterfall 应答者，不替换 `ctx.approval` | `dsh-tools`、`dsh-tool-bash` | 换/卸应答者：`ask` 的人答链；无人则 fail-closed `unavailable`。键仍在 | `packages/interaction/user-approval/src/index.ts` [E: packages/interaction/user-approval/src/index.ts:19] [E: packages/interaction/user-approval/src/index.ts:30] |

### core spine service

这些键官方标 `core`：Definition 即实现。卸掉包 = 键消失，不是「换世界」。

| seam/ctx 键 | Definition 包+类 | Provider 包 | Consumer 包 | 换 provider 会带走什么 | 源 path |
|---|---|---|---|---|---|
| `ctx.tokenMeter` | `@deepseek-ai/dsh-token-meter` `TokenMeter` | 本包（host；preset 故意不 isolate） | `dsh-compaction-basic`、`dsh-compaction-tool-result-pruner` | 无第二实现；卸掉则 replay 计量与 context-meter 投影没了 | `packages/llm/token-meter/src/index.ts` |
| `ctx.toolResultPruner` | `@deepseek-ai/dsh-compaction-tool-result-pruner` `ToolResultPruner` | 本包（preset isolate 与 compaction 同 realm） | `dsh-compaction-basic` | 无第二实现；卸掉则超长 tool result 不再单节点 prune | `packages/compaction/compaction-tool-result-pruner/src/index.ts` |
| `ctx.sessions` | `@deepseek-ai/dsh-session` `SessionStore` | 本包 | `dsh-agent`、`dsh-agent-loop`、persistence、query、invariants、message-feedback | 无第二实现；卸掉则 append-only Session 与 event feed 没了 | `packages/core/session/src/index.ts` [E: packages/core/session/src/index.ts:39] [E: packages/core/session/src/index.ts:797] |
| `ctx.invariants` | `@deepseek-ai/dsh-invariants` `InvariantRegistry` | 本包 | `dsh-session`、`dsh-agent`、`dsh-scope`、`dsh-agent-loop` | 无第二实现；卸掉则包级不变量登记与失败归因没了 | `packages/runtime-diagnostics/invariants/src/index.ts` |
| `ctx.typert` | `@deepseek-ai/dsh-typert-registry` `TypertRegistry`；键声明在 protocol | 本包（base `typert`） | `dsh-typert-loader`、`dsh-api-gateway` | 无第二实现；卸掉则 live zod / Remote 描述符登记没了 | `packages/typert/protocol/src/types.ts` · `packages/typert/registry/src/service.ts` [E: packages/typert/protocol/src/types.ts:489] [E: packages/typert/registry/src/service.ts:455] |
| `ctx.typertGateway` | `@deepseek-ai/dsh-api-gateway` `TypertGatewayService` | 本包（base `typert-gateway`） | Host Remote 调用面（browser 走 connection） | 无第二实现；卸掉则 unary Remote 分发没了 | `packages/api/gateway/src/types.ts` · `packages/api/gateway/src/index.ts` [E: packages/api/gateway/src/types.ts:52] [E: packages/api/gateway/src/index.ts:100] |
| `ctx.storageDomain` | `@deepseek-ai/dsh-storage-domain` `DomainFacility` | 本包 `ctx.provide('storageDomain', facility)`（**不是** `Service.super`） | `dsh-workspace`、`dsh-message-feedback`、projection-cache | 无第二 form；卸掉则 typed domain KV 没了。hub 仍是 `ctx.storage` | `packages/storage/storage-domain/src/index.ts` [E: packages/storage/storage-domain/src/index.ts:37] [E: packages/storage/storage-domain/src/index.ts:217] |
| `ctx.messageFeedback` | `@deepseek-ai/dsh-message-feedback` `MessageFeedbackService` | 本包（web-app 插入） | Host Remote（不进 Session / telemetry） | 无第二实现；卸掉则 per-assistant-message 评分 sidecar 没了 | `packages/feedback/message-feedback/src/index.ts` |
| `ctx.workspaceRegistry` | `@deepseek-ai/dsh-workspace` `WorkspaceRegistry` | 本包（web-app 插入） | `dsh-host-apiproxy` | 无第二实现；卸掉则 WorkspaceId 账户 / GUI 投影没了 | `packages/workspace/workspace/src/index.ts` |
| `ctx.sessionReferenceResolver` | `@deepseek-ai/dsh-session-reference` `SessionReferenceResolver` | 本包 | host mention 适配（自己消费 query） | 无第二实现；卸掉则跨会话 snapshot 投影没了 | `packages/context/session-reference/src/index.ts` |
| `ctx.systemPrompt` | `@deepseek-ai/dsh-system-prompt` `SystemPrompt` | 本包 | `dsh-agent-loop`、`dsh-tools`、各 tool 包的 section | 无第二实现；卸掉则 step 级 prompt / tool schema 组装没了 | `packages/core/system-prompt/src/index.ts` |
| `ctx.tools` | `@deepseek-ai/dsh-tools` `ToolRuntime` | 本包（core spine，**不**叫 seam） | `dsh-agent-loop` + 所有 `register` 的 tool 包 | 无第二实现；卸掉则 `schemas()` / `execute` 管线与 Code Mode 运输没了 | `packages/core/tools/src/index.ts` [E: packages/core/tools/src/index.ts:139] [E: packages/core/tools/src/index.ts:827] |
| `ctx.planMode` | `@deepseek-ai/dsh-plan-mode` `PlanModeController` | 本包（web 关掉 host 行；preset isolate `planMode`） | `/plan`、`exit_plan_mode` | 无第二实现；isolate 换的是「这个 preset 自己的 plan 状态」不是另一种引擎 | `packages/plan/plan-mode/src/index.ts` |
| `ctx.agentPresets` | `@deepseek-ai/dsh-agent-presets` `AgentPresets` | 本包（**仅 web-app** 插入，`default: standard`；headless **不**挂） | Agent factory `mount` / `composeFrom` | 无第二实现；卸掉则 shipped / 用户 preset roster 没了 | `packages/preset/agent-presets/src/index.ts` [E: packages/bundle/web-app/cordis.patch.yml:421] [E: packages/bundle/web-app/cordis.patch.yml:424] |
| `ctx.commands` | `@deepseek-ai/dsh-commands` `CommandRuntime` | 本包 | 各 `dsh-command-*` 登记；UI slash | 无第二实现；人命令面消失（不经模型 turn） | `packages/interaction/commands/src/index.ts` |
| `ctx.sessionProjections` | `@deepseek-ai/dsh-session-projection` `SessionProjectionRegistry` | 本包 | `dsh-tool-todo`、`dsh-session-title`、`dsh-host-apiproxy` | 无第二实现；卸掉则 fold unit / watermark 没了 | `packages/session/session-projection/src/index.ts` |
| `ctx.sessionProjectionCache` | `@deepseek-ai/dsh-session-projection-cache` `SessionProjectionCache` | 本包（web-app 插入） | `dsh-host-apiproxy` | 无第二实现；卸掉则 listing 冷读必须回放整段 log | `packages/session/session-projection-cache/src/index.ts` |
| `ctx.agents` | `@deepseek-ai/dsh-agent` `AgentRegistry` | 本包 | `dsh-agent-loop`、`dsh-acp`、in-process subagent | 无第二实现；卸掉则 create/resume / live handle 没了。另有 DX 字段 `ctx.agent?`（不是独立 service） | `packages/core/agent/src/index.ts` [E: packages/core/agent/src/index.ts:38] [E: packages/core/agent/src/index.ts:267] |
| `ctx.agentDefaultModel` | `@deepseek-ai/dsh-agent-default-model` `AgentDefaultModelConfig` | 本包 | `dsh-headless`、`dsh-host-apiproxy` | 无第二实现；卸掉则 Host / headless 不再共享默认 `ModelSelection` | `packages/core/agent-default-model/src/index.ts` |
| `ctx.goals` | `@deepseek-ai/dsh-goal` `GoalService` | 本包（host；preset 只挂 `tool-goal`） | `/goal`、`dsh-tool-goal`、apiproxy Remote | 无第二实现；卸掉则同会话 goal 域没了 | `packages/goal/goal/src/index.ts` |
| `ctx.e2b` | `@deepseek-ai/dsh-e2b` `E2BRuntime` | 本包（**不**在 shipped bundle；例：`examples/headless-agent/e2b.cordis.yml`） | `dsh-fs-e2b`、`dsh-subprocess-e2b` | 卸掉则两个 E2B provider 失去共享 sandbox / cwd | `packages/e2b/e2b/src/index.ts` [E: packages/e2b/e2b/src/index.ts:91] [E: packages/e2b/fs-e2b/src/index.ts:172] [E: packages/e2b/subprocess-e2b/src/index.ts:53] |
| `ctx.shellEnv` | `@deepseek-ai/dsh-shell-env` `ShellEnvRegistry` | 本包（**必须** host：web 在会话前注入 `DSH_WEB_*`） | `dsh-tool-bash`、`dsh-tool-pwsh` | 无第二实现；卸掉则每次 `bash`/`pwsh` 的受管 `DSH_*` 快照没了 | `packages/shell/shell-env/src/index.ts` |
| `ctx.sandboxPolicy` | `@deepseek-ai/dsh-sandbox-policy` `SandboxPolicyService` | 本包（base；默认 mode 可被 `DSH_PERMISSION_MODE` 叠） | `dsh-bash-sandbox`、`dsh-fs-sandbox`、`dsh-terminal-bash` | 无第二实现；卸掉则 bash 与 fs 不再共享 mode+workspace root | `packages/sandbox/sandbox-policy/src/index.ts` [E: packages/fs/fs-sandbox/src/index.ts:60] [E: packages/shell/bash-sandbox/src/index.ts:45] |
| `ctx.permissionPresets` | `@deepseek-ai/dsh-permission-presets` `PermissionPresetService` | 本包（base `permission`） | UI / settings 切 preset | 无第二实现；卸掉则 `workspace-write`/`danger-full-access` 一键写双旋钮没了 | `packages/interaction/permission-presets/src/index.ts` |
| `ctx.webServer` | `@deepseek-ai/dsh-host-webserver` `WebServer` | 本包（web-app） | `dsh-client-connection`、`dsh-client-modules`、`dsh-client-hmr` | 无第二实现；卸掉则 named-route HTTP 载体没了 | `packages/host/webserver/src/index.ts` |
| `ctx.clientModules` | `@deepseek-ai/dsh-client-modules` `ClientModuleRegistry` | 本包（host 半边扫 `dsh.client`） | `dsh-client-hmr` | 无第二实现；卸掉则 `__DSH_BOOT__` 图与 `/plugins/` 没了 | `packages/client/modules/src/index.ts` |
| `ctx.apiProxy` | `@deepseek-ai/dsh-host-apiproxy` `ApiProxyService` | 本包（web-app `api-gateway` 行） | `dsh-client-connection` | 无第二实现；卸掉则 browser API / 事件订阅没了 | `packages/host/apiproxy/src/index.ts` [E: packages/host/apiproxy/src/index.ts:97] |
| `ctx.dynamicCordisRunner` | `@deepseek-ai/dsh-cordis-host-runner` `DynamicCordisRunnerService` | 本包（web-app `cordis-host-runner`） | `dsh-tool-cordis` | 无第二实现；卸掉则动态包 vm / request-run 没了 | `packages/extensions/cordis-host-runner/src/index.ts` [E: packages/extensions/cordis-host-runner/src/index.ts:140] |
| `ctx.cordisInspect` | 同包 `CordisInspectRegistryService` | 本包（与 runner 一起 load） | `dsh-tool-cordis` | 无第二实现；卸掉则 inspect provider / client query 路由没了 | `packages/extensions/cordis-host-runner/src/inspect-registry.ts` [E: packages/extensions/cordis-host-runner/src/inspect-registry.ts:54] |

### bundle / composition 点

| seam/ctx 键 | Definition 包+类 | Provider 包 | Consumer 包 | 换 provider 会带走什么 | 源 path |
|---|---|---|---|---|---|
| `ctx.agentLoop` | `@deepseek-ai/dsh-agent-loop` `AgentLoop` | 本包（base `agent-loop`；官方 `mode: bundle`） | `dsh-agent-spine-demo`；产品路径经 `ctx.agents` factory | 换这个包 = 换 turn/step 驱动。扩展应听 `dsh-agent` 事件 / `ctx.agents`，不要 import loop 包 | `packages/core/agent-loop/src/index.ts` [E: packages/core/agent-loop/src/index.ts:162] [E: packages/core/agent-loop/src/index.ts:320] |

### 官方表没有、源码有的 service 键

| seam/ctx 键 | Definition 包+类 | Provider 包 | Consumer 包 | 换 provider 会带走什么 | 源 path |
|---|---|---|---|---|---|
| `ctx.pluginInventory` | `@deepseek-ai/dsh-host-plugin-inventory` `PluginInventoryGateway` | 本包（web-app `plugin-inventory`）。**无** `interface Context` 增强，只 `super(ctx, 'pluginInventory')` | 受信任 client Remote `pluginInventory/list` | 无第二实现；卸掉则 Loader 树只读投影没了 | `packages/host/plugin-inventory/src/index.ts` [E: packages/host/plugin-inventory/src/index.ts:47] |

## 对照 / 分家 / 装配

**独占 vs 登记 vs spine。** `FileSystem` / `ShellExecutor` / `SubprocessRuntime` 在构造里把**自己**登记成那个键。[E: packages/fs/fs/src/index.ts:88] `LlmRuntime` / `WebRuntime` / `SubagentRuntime` / `Lsp` / `TerminalSessionService` 也占键，但世界来自 `register*`。`ctx.sessions` / `ctx.tools` / `ctx.agents` 是 spine：工具名仍由 consumer 写进 `ctx.tools`，再经 session log 投影（`model-visible ⟺ logged`）。

**成对替换才带走 Bash / PTY / LSP。** `ctx.fs` 与 `ctx.subprocess` 运行时不耦合。

- `dsh-tool-fs`：`inject = ['tools', 'fs', 'systemPrompt']`。[E: packages/fs/tool-fs/src/index.ts:22]
- `dsh-tool-bash`：`inject = ['tools', 'shell', 'systemPrompt', 'shellEnv']`。[E: packages/shell/tool-bash/src/index.ts:31]
- `LocalBashExecutor` / `SandboxBashExecutor`：`inject` `subprocess`（sandbox 再加 `sandbox`+`sandboxPolicy`）。[E: packages/shell/bash-local/src/index.ts:103][E: packages/shell/bash-sandbox/src/index.ts:45]
- `dsh-tool-fs-search`（`glob`/`grep`）：`inject` `subprocess`，**不**走 `ctx.fs`。[E: packages/fs/tool-fs-search/src/index.ts:70]
- `dsh-terminal-bash`：`inject = ['terminals', 'sandboxPolicy', 'subprocess']`，不 `inject` `fs`。[E: packages/terminal/terminal-bash/src/index.ts:25]
- `dsh-lsp-stdio`：`inject = ['fs', 'lsp', 'subprocess']`（少数同时吃两条）。[E: packages/lsp/lsp-stdio/src/index.ts:47]
- 进程外 subagent：`dsh-subagent-acp` `inject = ['subagents', 'subprocess']`。[E: packages/subagent/subagent-acp/src/index.ts:24]

因此：**只换 `ctx.fs`** 搬走 `read`/`write`/`edit` 与 LSP 文档，不搬走 `bash -c`。**只换 `ctx.subprocess`** 搬走 Bash / PTY / ripgrep / 进程外 spawn，留下本地盘。**`ctx.fs` + `ctx.subprocess` 一起换** 才把 Bash / PTY / LSP / `glob`·`grep` 指到同一个执行世界。E2B 用 `ctx.e2b` 绑成对：`E2BFileSystem` 与 `E2BSubprocessRuntime` 都 `static inject = ['e2b']`；例里 disable 本地 `subprocess`/`fs-local` 再 insert `subprocess-e2b`/`fs-e2b`。[E: examples/headless-agent/e2b.cordis.yml:17][E: examples/headless-agent/e2b.cordis.yml:20][E: examples/headless-agent/e2b.cordis.yml:28][E: examples/headless-agent/e2b.cordis.yml:30]

**host vs preset。** `dsh-web-app` 把 base 里的 tool / compaction / workflow 行 `disabled: true`，改由 `apps/cli/config/agent-presets/*/agent.cordis.yml` 按会话挂回。preset **publish** 服务必须进带 `isolate` 的 group，否则 `leakedServices` 拒绝。[E: packages/preset/agent-presets/src/mount.ts:363] `minimal` 给自己 isolate 一份 `ctx.terminals` 与 `ctx.fs`（`dsh-fs-local`），只影响加入该 preset 的 agent；host 上的 `fs-sandbox` 仍给别的会话用。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:22][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:52]

**官方生成表漂移（跟代码）。**

- 实现包：`lsp-local` → 真实是 `dsh-lsp-stdio`；`code-runtime-worker` → `dsh-code-runtime-worker-thread`。
- `ctx.shell` 默认 win32 provider 是 `dsh-pwsh-sandbox`，官方 implementations 只写到 `pwsh-local`。
- attachments consumer 写 `host-runtime`：冻结树无此包，真实是 `dsh-host-apiproxy` + `dsh-llm-pi-ai` + `dsh-tool-fs`。
- `ctx.pluginInventory` 是 web host service，官方 `svc_*` 表没收。
- `ctx.approval` 的 ACP 是 waterfall 应答者，不是第二个占键 Provider。

## Sources

- docs/capability-seams.md
- docs/architecture.md
- vendor/cordis/src/service.ts
- packages/attachment/attachment/src/index.ts
- packages/llm/llm/src/index.ts
- packages/llm/token-meter/src/index.ts
- packages/compaction/compaction/src/index.ts
- packages/compaction/compaction-tool-result-pruner/src/index.ts
- packages/core/session/src/index.ts
- packages/core/tools/src/index.ts
- packages/core/system-prompt/src/index.ts
- packages/core/agent/src/index.ts
- packages/core/agent-loop/src/index.ts
- packages/core/agent-default-model/src/index.ts
- packages/runtime-diagnostics/invariants/src/index.ts
- packages/typert/protocol/src/types.ts
- packages/typert/registry/src/service.ts
- packages/api/gateway/src/index.ts
- packages/api/gateway/src/types.ts
- packages/session/session-persistence/src/index.ts
- packages/session/session-telemetry/src/index.ts
- packages/session/session-title/src/index.ts
- packages/session/session-projection/src/index.ts
- packages/session/session-projection-cache/src/index.ts
- packages/settings/settings/src/index.ts
- packages/credentials/credentials/src/index.ts
- packages/storage/storage/src/index.ts
- packages/storage/storage-domain/src/index.ts
- packages/feedback/message-feedback/src/index.ts
- packages/workspace/workspace/src/index.ts
- packages/session-query/session-query/src/index.ts
- packages/context/session-reference/src/index.ts
- packages/interaction/user-questions/src/index.ts
- packages/interaction/user-approval/src/index.ts
- packages/interaction/commands/src/index.ts
- packages/interaction/permission-presets/src/index.ts
- packages/plan/plan-mode/src/index.ts
- packages/preset/agent-presets/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- packages/skill/skill/src/index.ts
- packages/goal/goal/src/index.ts
- packages/e2b/e2b/src/index.ts
- packages/e2b/fs-e2b/src/index.ts
- packages/e2b/subprocess-e2b/src/index.ts
- packages/subprocess/subprocess/src/index.ts
- packages/shell/shell/src/index.ts
- packages/shell/shell-env/src/index.ts
- packages/shell/bash-local/src/index.ts
- packages/shell/bash-sandbox/src/index.ts
- packages/terminal/terminal/src/index.ts
- packages/terminal/terminal-bash/src/index.ts
- packages/sandbox/sandbox/src/index.ts
- packages/sandbox/sandbox-policy/src/index.ts
- packages/code-runtime/code-runtime/src/index.ts
- packages/fs/fs/src/index.ts
- packages/fs/fs-sandbox/src/index.ts
- packages/fs/fs/tests/service.spec.ts
- packages/fs/tool-fs/src/index.ts
- packages/fs/tool-fs-search/src/index.ts
- packages/subagent/subagent/src/index.ts
- packages/subagent/subagent-acp/src/index.ts
- packages/jobs/jobs/src/index.ts
- packages/web/web/src/index.ts
- packages/spill/spill/src/index.ts
- packages/host/directory-picker/src/index.ts
- packages/host/webserver/src/index.ts
- packages/host/apiproxy/src/index.ts
- packages/host/plugin-inventory/src/index.ts
- packages/client/modules/src/index.ts
- packages/workflow/workflow/src/index.ts
- packages/lsp/lsp/src/index.ts
- packages/lsp/lsp-stdio/src/index.ts
- packages/extensions/cordis-host-runner/src/index.ts
- packages/extensions/cordis-host-runner/src/inspect-registry.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- examples/headless-agent/e2b.cordis.yml

## 相关

- [spine.capability-seams](../spine/capability-seams.md) — fs / shell / subprocess 三角与成对替换走读。
- [ref.ctx-keys](ctx-keys.md) — 全部 `interface Context` / `ctx.provide` 键（含 client 与 boot 胶）。
- [spine.overview](../spine/overview.md) — host / preset / client 组合地图。
- [ref.glossary](glossary.md) — seam / Definition / Provider / Consumer / isolate 词条。
- [ref.package-index](package-index.md) — monorepo 包角色与 shipped 位置。
- [subsys.execution.fs](../subsystems/execution/fs.md) — `ctx.fs` 原语、围栏、`fs/*` 事件。
- [subsys.execution.subprocess](../subsystems/execution/subprocess.md) — `ctx.subprocess` spawn / PTY / kill。
- [subsys.llm.service](../subsystems/llm/service.md) — `ctx.llm` 适配器登记与 `llm/stream`。

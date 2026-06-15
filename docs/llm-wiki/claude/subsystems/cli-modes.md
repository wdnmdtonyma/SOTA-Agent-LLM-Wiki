---
id: subsys.cli-modes
path: subsystems/cli-modes.md
title: CLI 与运行模式
kind: subsystem
tier: T2
status: verified
source: [main.tsx, cli/, entrypoints/]
symbols: [main, initializeEntrypoint, run, runHeadless, StructuredIO]
related: [spine.lifecycle]
evidence: explicit
updated: 2026-06-14
---

> CLI 与运行模式子系统把 `claude` 进程从 thin bootstrap 分流到 interactive REPL、print/headless、remote/teleport、assistant、daemon、MCP server 等运行形态。

## 能回答的问题

- 哪些 fast path 会在加载 `main.tsx` 前提前返回?
- `-p/--print`、`--init-only`、`--sdk-url` 和 stdout TTY 如何决定 non-interactive?
- bare/simple mode 为什么必须在 module import 前设置 `CLAUDE_CODE_SIMPLE`?
- print mode 与 interactive mode 在 MCP、plugins、hooks、telemetry 上有哪些不同?
- `StructuredIO` 如何支持 stream-json SDK/remote 输入输出?

## 职责边界

CLI modes 层负责进程入口、argv rewrite、Commander options、mode detection、startup sequencing、headless/interactive/remote 分派; 它不定义 tool contract、permission semantics 或 model request 细节。tool pool 深挖在 [工具系统机制](tool-system.md), permission mode 深挖在 [权限系统](permissions.md), lifecycle 端到端主线在 [CLI lifecycle](../spine/lifecycle.md)。[E: entrypoints/cli.tsx:33][E: main.tsx:585][E: main.tsx:884][E: main.tsx:2585][I]

CLI modes 的核心分界是 interactive vs non-interactive: non-interactive 进入 `runHeadless()`, interactive 进入 `launchRepl()`, remote/assistant/SSH 会在进入主命令前或 REPL 前改写 argv/state。[E: main.tsx:803][E: main.tsx:2829][E: main.tsx:3487][I]

## 关键文件

| 文件 | 作用 |
| --- | --- |
| `entrypoints/cli.tsx` | thin bootstrap: 设置早期 env, 处理 version/daemon/bridge/bg/templates/runner/worktree/update/bare 等 fast paths, 最后 dynamic import `main.js`。[E: entrypoints/cli.tsx:5][E: entrypoints/cli.tsx:21][E: entrypoints/cli.tsx:33][E: entrypoints/cli.tsx:37][E: entrypoints/cli.tsx:290][E: entrypoints/cli.tsx:295] |
| `main.tsx` | 主 CLI orchestrator: argv rewrite、mode detection、Commander options、permission context、MCP config、setup、interactive/headless/remote 分派。[E: main.tsx:517][E: main.tsx:585][E: main.tsx:799][E: main.tsx:968][E: main.tsx:1747][E: main.tsx:1927][E: main.tsx:2585] |
| `cli/print.ts` | `runHeadless()` 和 print/SDK output path, 包含 headless settings sync、structured IO 和 stdout guard。[E: cli/print.ts:455][E: cli/print.ts:514][E: cli/print.ts:520][E: cli/print.ts:587][E: cli/print.ts:594] |
| `cli/structuredIO.ts` | stream-json input/output helper, 处理 NDJSON parsing、pending control requests、prepended user messages、control response injection 和 environment updates。[E: cli/structuredIO.ts:135][E: cli/structuredIO.ts:204][E: cli/structuredIO.ts:215][E: cli/structuredIO.ts:283][E: cli/structuredIO.ts:333] |

## 数据模型

`initializeEntrypoint(isNonInteractive)` 根据 argv 中的 `mcp serve`、`CLAUDE_CODE_ACTION` 和 interactive 状态写 `CLAUDE_CODE_ENTRYPOINT`: MCP server 是 `mcp`, GitHub Action 是 `claude-code-github-action`, non-interactive CLI 是 `sdk-cli`, interactive CLI 是 `cli`。[E: main.tsx:517][E: main.tsx:525][E: main.tsx:530][E: main.tsx:539]

Commander 主命令声明 prompt argument 和大量 mode flags, 包括 `--print`、`--bare`、stream-json input/output、permission/tool/MCP/system prompt/session/model/agents/plugin-dir/file 等 options; `--bare` 的 help 文本也明确它设置 `CLAUDE_CODE_SIMPLE=1`。[E: main.tsx:968][E: main.tsx:971][E: main.tsx:976][E: main.tsx:1006]

`runHeadless()` 的输入包括 prompt 或 async input、AppState getter/setter、commands、tools、SDK MCP configs、agents 和 headless options; options 覆盖 resume、output format、permission prompt tool、allowed tools、thinking、max turns/budget、system prompts、model/fallback、teleport、sdkUrl、partial messages、agent/workload/setup trigger 等。[E: cli/print.ts:455][E: cli/print.ts:459][E: cli/print.ts:464][E: cli/print.ts:465][E: cli/print.ts:468][E: cli/print.ts:470][E: cli/print.ts:471][E: cli/print.ts:472][E: cli/print.ts:473][E: cli/print.ts:474][E: cli/print.ts:476][E: cli/print.ts:478][E: cli/print.ts:479][E: cli/print.ts:480][E: cli/print.ts:481][E: cli/print.ts:483][E: cli/print.ts:487][E: cli/print.ts:488][E: cli/print.ts:489]

`StructuredIO` 保存 structured input generator、pending control requests、resolved tool use ids 和 outbound stream; 它负责把输入流按 newline 切成 JSON message, 并能把 control response 注入 pending request。[E: cli/structuredIO.ts:135][E: cli/structuredIO.ts:137][E: cli/structuredIO.ts:155][E: cli/structuredIO.ts:162][E: cli/structuredIO.ts:215][E: cli/structuredIO.ts:283]

## 控制流

1. `entrypoints/cli.tsx` 顶层先禁用 Corepack auto pin, remote 环境下追加 Node heap size, ablation baseline 可在 import 前设置多个禁用 env; 这些都发生在加载 full CLI 前。[E: entrypoints/cli.tsx:5][E: entrypoints/cli.tsx:9][E: entrypoints/cli.tsx:13][E: entrypoints/cli.tsx:21][E: entrypoints/cli.tsx:24]
2. bootstrap 的 fast paths 包括 version、dump system prompt、Chrome/Computer Use MCP server、daemon worker、remote-control/bridge、daemon、background sessions、templates、environment runner、self-hosted runner、worktree tmux、update flag rewrite、bare simple env。[E: entrypoints/cli.tsx:37][E: entrypoints/cli.tsx:53][E: entrypoints/cli.tsx:72][E: entrypoints/cli.tsx:86][E: entrypoints/cli.tsx:100][E: entrypoints/cli.tsx:112][E: entrypoints/cli.tsx:165][E: entrypoints/cli.tsx:185][E: entrypoints/cli.tsx:212][E: entrypoints/cli.tsx:226][E: entrypoints/cli.tsx:238][E: entrypoints/cli.tsx:249][E: entrypoints/cli.tsx:277][E: entrypoints/cli.tsx:283]
3. 普通路径启动 early input capture, dynamic import `main.js`, 调 `cliMain()`; 这让 fast paths 避免 full CLI module evaluation。[E: entrypoints/cli.tsx:290][E: entrypoints/cli.tsx:291][E: entrypoints/cli.tsx:295][E: entrypoints/cli.tsx:297]
4. `main()` 安装 warning/exit/SIGINT handling, 处理 direct connect URL rewrite、assistant argv rewrite、SSH argv rewrite; SSH headless 会直接报错并 shutdown。[E: main.tsx:585][E: main.tsx:594][E: main.tsx:595][E: main.tsx:598][E: main.tsx:612][E: main.tsx:685][E: main.tsx:706][E: main.tsx:786]
5. non-interactive 判断来自 `-p`/`--print`、`--init-only`、`--sdk-url` 或 stdout 非 TTY; non-interactive 时停止 early input capture, 设置 interactive flag, 并初始化 entrypoint。[E: main.tsx:799][E: main.tsx:800][E: main.tsx:801][E: main.tsx:802][E: main.tsx:803][E: main.tsx:806][E: main.tsx:812][E: main.tsx:815]
6. `run()` 创建 Commander program, `preAction` 调 `init()`、设置 terminal title、初始化 sinks、inline plugin dirs、migrations、remote managed settings/policy limits、settings sync。[E: main.tsx:884][E: main.tsx:907][E: main.tsx:923][E: main.tsx:934][E: main.tsx:945][E: main.tsx:950][E: main.tsx:957][E: main.tsx:958][E: main.tsx:963]
7. 主 action 内 `--bare` 再次设置 `CLAUDE_CODE_SIMPLE=1`, `--sdk-url` 自动切 stream-json input/output、verbose 和 print, 然后解析 system prompt files、permission mode、MCP configs、session/model/agent 等 options。[E: main.tsx:1014][E: main.tsx:1015][E: main.tsx:1236][E: main.tsx:1239][E: main.tsx:1242][E: main.tsx:1246][E: main.tsx:1250][E: main.tsx:1343][E: main.tsx:1364][E: main.tsx:1392][E: main.tsx:1414]
8. permissions/tools/MCP startup: 初始化 `toolPermissionContext`, stripping dangerous permissions, 启动 claude.ai MCP config promise 和 Claude Code MCP config promise, 读取 input prompt, 激活 proactive, 调 `getTools()`。[E: main.tsx:1747][E: main.tsx:1755][E: main.tsx:1767][E: main.tsx:1770][E: main.tsx:1784][E: main.tsx:1809][E: main.tsx:1861][E: main.tsx:1867][E: main.tsx:1868]
9. setup 与 command/agent loading 被并行化: 注册 builtin plugins/skills 后启动 `setup()`, 非 worktree 时并行 `getCommands()` 和 agent definitions; setup 之后再 await commands/agents 并合并 CLI agents。[E: main.tsx:1909][E: main.tsx:1923][E: main.tsx:1927][E: main.tsx:1928][E: main.tsx:1929][E: main.tsx:2029][E: main.tsx:2047]
10. interactive path 中 MCP prefetch 在 trust dialog 后启动, print mode 则跳过这段 interactive prefetch; hooks 和 MCP promise 都不会阻塞 REPL render, 慢 MCP server 会后续写入 AppState。[E: main.tsx:2408][E: main.tsx:2413][E: main.tsx:2426][E: main.tsx:2437][E: main.tsx:2452]
11. plugin initialization 在 bare mode 跳过; headless mode await plugin sync 防止 CLI 退出前未完成, interactive mode fire-and-forget。[E: main.tsx:2555][E: main.tsx:2557][E: main.tsx:2559][E: main.tsx:2565]
12. print/headless branch 设置 formatted output、应用 config env vars、初始化 telemetry, 过滤 headless commands, 构造 headless AppState/store, 启动 bypass/auto mode gate check, 设置 SDK betas, 然后按 per-server batch 写 MCP pending/connected state。[E: main.tsx:2585][E: main.tsx:2586][E: main.tsx:2593][E: main.tsx:2597][E: main.tsx:2622][E: main.tsx:2623][E: main.tsx:2657][E: main.tsx:2664][E: main.tsx:2685][E: main.tsx:2691]
13. print mode 等待 regular MCP batch, claude.ai connector 连接有 5 秒 timeout 并可后台继续; 之后启动 deferred prefetch/background housekeeping, dynamic import `runHeadless()` 并传入 commands/tools/MCP/agents/options。[E: main.tsx:2729][E: main.tsx:2738][E: main.tsx:2739][E: main.tsx:2802][E: main.tsx:2807][E: main.tsx:2816][E: main.tsx:2827][E: main.tsx:2829]
14. `runHeadless()` 在 remote/headless 下提前触发 user settings download, 订阅 settings changes, 对 stream-json output 安装 stdout guard; `StructuredIO.processLine()` 会忽略 keep_alive, 并把 `update_environment_variables` 写入 `process.env`。[E: cli/print.ts:514][E: cli/print.ts:520][E: cli/print.ts:587][E: cli/print.ts:594][E: cli/structuredIO.ts:341][E: cli/structuredIO.ts:344][E: cli/structuredIO.ts:348][E: cli/structuredIO.ts:355]
15. remote session branch 先检查 policy, 创建或恢复 remote session, 设置 remote mode/session, 构造 remote session config 和初始 messages, 并用 `filterCommandsForRemoteMode()` 过滤 commands 后进入 `launchRepl()`。[E: main.tsx:3403][E: main.tsx:3405][E: main.tsx:3424][E: main.tsx:3447][E: main.tsx:3467][E: main.tsx:3486][E: main.tsx:3487]

## 设计动机与权衡

`entrypoints/cli.tsx` 大量 dynamic import 是为了让 version、daemon worker、MCP server 等 fast path 少加载模块; `--bare` 在 import 前设置 simple env 是因为工具模块会在 module evaluation 时读取 feature/env gates。[E: entrypoints/cli.tsx:33][E: entrypoints/cli.tsx:290][E: entrypoints/cli.tsx:283][I]

interactive mode 不等待 MCP 连接完成, 因为 REPL 首屏和 turn 1 TTFT 更敏感; print mode 往往是单 turn, 所以 headless branch 会等待 regular MCP, 只对 claude.ai connector 设置 bounded timeout。[E: main.tsx:2408][E: main.tsx:2452][E: main.tsx:2729][E: main.tsx:2802][I]

stream-json stdout guard 是 headless/SDK 专属防线: 非 JSON stdout 会破坏 SDK parser, 所以 print path 在第一条 structured output 前安装 guard。[E: cli/print.ts:587][E: cli/print.ts:594][I]

## Gotcha

- `--init-only` 被归为 non-interactive, 但它不是普通 prompt run: 后续会同步执行 setup/session start hooks 后 shutdown。[E: main.tsx:801][E: main.tsx:2572][E: main.tsx:2577][E: main.tsx:2580]
- `--include-partial-messages` 只有 print + stream-json 合法, interactive 或非 stream-json 会直接退出。[E: main.tsx:1848][E: main.tsx:1849][E: main.tsx:1850]
- `--no-session-persistence` 只允许 print mode; interactive 下会报错退出。[E: main.tsx:1856][E: main.tsx:1857]
- remote mode 会预过滤 commands, 但 remote init response 还可能进一步 refine command list;不要把 local command visibility 当作 CCR 最终权限。[E: main.tsx:3486][I]

## Sources

- `entrypoints/cli.tsx`
- `main.tsx`
- `cli/print.ts`
- `cli/structuredIO.ts`

## 相关

- [CLI lifecycle](../spine/lifecycle.md)
- [工具系统机制](tool-system.md)
- [权限系统](permissions.md)
- [MCP](mcp.md)

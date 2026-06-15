---
id: subsys.hooks-feature
path: subsystems/hooks-feature.md
title: Hooks feature
kind: subsystem
tier: T2
status: verified
source: [utils/hooks.ts, types/hooks.ts]
symbols: [HOOK_EVENTS, HookEvent, syncHookResponseSchema, hookJSONOutputSchema, executeHooks, executeHooksOutsideREPL, getMatchingHooks, matchesPattern, shouldSkipHookDueToTrust]
related: [group.hook-events]
updated: 2026-06-14
evidence: explicit
---

Hooks feature 是 Claude Code 的事件扩展层: 27 个 `HookEvent` 在运行时被转换成 JSON input, 由 matcher 选择 command/prompt/agent/http/callback/function hook, 再把 stdout、JSON response、exit code 或 callback result 归并成权限、上下文、阻断、watch paths 和系统消息。[E: entrypoints/sdk/coreTypes.ts:25][E: types/hooks.ts:50][E: utils/hooks.ts:1603][E: utils/hooks.ts:1978][E: types/hooks.ts:260]

## 能回答的问题

- 27 个 hook event 分别什么时候触发, 用什么字段做 matcher?
- command hook、prompt hook、agent hook、HTTP hook、callback hook 和 function hook 的 I/O 契约有什么差异?
- JSON 输出里哪些字段会改变权限、tool input、MCP output、initial prompt、watch paths 或 elicitation response?
- workspace trust、managed hooks、plugin/skill hooks、session hooks 的信任边界在哪里?

## 职责边界

Hooks feature 负责收集配置、匹配事件、执行 hook 和归并结果; 它不决定某个业务事件是否应该发生, 业务代码通过 `executePreToolHooks`、`executeSessionStartHooks`、`executeFileChangedHooks` 等入口显式触发事件。[E: utils/hooks.ts:3394][E: utils/hooks.ts:3867][E: utils/hooks.ts:4278] `StatusLine` 和 `FileSuggestion` 使用同一 command execution/trust 基础设施, 但它们不在 `HOOK_EVENTS` 列表中, 所以不是 27 个 hook event 的成员。[E: entrypoints/sdk/coreTypes.ts:25][E: entrypoints/sdk/coreTypes.ts:53][E: utils/hooks.ts:4584][E: utils/hooks.ts:4675]

## 关键文件

- `entrypoints/sdk/coreTypes.ts`: 运行时 `HOOK_EVENTS` 常量列出 27 个 event name, `HookEvent` 类型由该常量派生。[E: entrypoints/sdk/coreTypes.ts:25][E: entrypoints/sdk/coreTypes.ts:53]
- `types/hooks.ts`: 定义 sync/async JSON response schema、callback matcher、permission request result、hook result 和 aggregated result。[E: types/hooks.ts:50][E: types/hooks.ts:169][E: types/hooks.ts:211][E: types/hooks.ts:248][E: types/hooks.ts:260][E: types/hooks.ts:277]
- `utils/hooks.ts`: 负责 trust gate、base input、command execution、matcher、配置合并、REPL/outside-REPL 执行器和每个 event 的 public executor。[E: utils/hooks.ts:286][E: utils/hooks.ts:301][E: utils/hooks.ts:747][E: utils/hooks.ts:1346][E: utils/hooks.ts:1492][E: utils/hooks.ts:1978][E: utils/hooks.ts:3003]

## 数据模型 / 状态

`createBaseHookInput` 给每个事件加入 `session_id`、`transcript_path`、`cwd`、`permission_mode`、`agent_id` 和 `agent_type`, 所以事件特有 payload 总是叠在同一组基础字段之上。[E: utils/hooks.ts:301][E: utils/hooks.ts:320] `HookCallback` 是内部或 SDK callback hook 的类型, callback 接收 `HookInput`、toolUseID、AbortSignal、hookIndex 和可选 AppState context, 并返回 `HookJSONOutput`。[E: types/hooks.ts:211] `types/hooks.ts` 的 `HookResult` 是单个 hook 的共享结果类型, 支持 message、blockingError、permissionBehavior、additionalContext、updatedInput、updatedMCPToolOutput、permissionRequestResult 和 retry 等字段。[E: types/hooks.ts:260] runtime `utils/hooks.ts` 另有 `AggregatedHookResult`, 显式包含 hookSource、watchPaths、elicitationResponse 和 elicitationResultResponse 等执行器 yield 字段。[E: utils/hooks.ts:359][E: utils/hooks.ts:365][E: utils/hooks.ts:372][E: utils/hooks.ts:373][E: utils/hooks.ts:374]

Hook 配置来源在 `getHooksConfig` 中合并: snapshot settings hooks 先进入数组, registered hooks 追加, session hooks 和 session function hooks 在有 AppState 且非 managed-only 时追加。[E: utils/hooks.ts:1492][E: utils/hooks.ts:1513][E: utils/hooks.ts:1519][E: utils/hooks.ts:1541][E: utils/hooks.ts:1553] 当 managed-only 生效时, 带 `pluginRoot` 的 registered plugin hook 会被跳过, session hooks 也不会并入, 使策略管理的 hook 不被普通 plugin/session hook 绕过。[E: utils/hooks.ts:1516][E: utils/hooks.ts:1524][E: utils/hooks.ts:1541]

## 27 个事件矩阵

| Event | Matcher query | 输入/输出重点 |
| --- | --- | --- |
| `PreToolUse` | `tool_name` | 工具执行前触发, 输入含 `tool_name/tool_input/tool_use_id`; JSON 可给 `permissionDecision`、`updatedInput` 和 `additionalContext`。[E: entrypoints/sdk/coreTypes.ts:26][E: utils/hooks.ts:3420][E: utils/hooks.ts:1622][E: types/hooks.ts:72][E: utils/hooks.ts:618] |
| `PostToolUse` | `tool_name` | 工具成功后触发, 输入含 tool response; JSON 可追加 context, 并可替换 MCP tool output。[E: entrypoints/sdk/coreTypes.ts:27][E: utils/hooks.ts:3462][E: utils/hooks.ts:1622][E: types/hooks.ts:100][E: utils/hooks.ts:646] |
| `PostToolUseFailure` | `tool_name` | 工具失败后触发, 输入含 error 和 interrupt flag; JSON 可追加 context。[E: entrypoints/sdk/coreTypes.ts:28][E: utils/hooks.ts:3511][E: utils/hooks.ts:3515][E: utils/hooks.ts:1622][E: types/hooks.ts:108] |
| `Notification` | `notification_type` | 通知发送时触发 outside-REPL, 输入含 message/title/type; schema 允许 `additionalContext`, 但 outside-REPL 结果主要作为命令结果返回。[E: entrypoints/sdk/coreTypes.ts:29][E: utils/hooks.ts:3581][E: utils/hooks.ts:3584][E: utils/hooks.ts:1635][E: types/hooks.ts:116] |
| `UserPromptSubmit` | 无 event-specific matcher | 用户 prompt 提交后触发, 输入含 prompt; JSON 可追加 context。[E: entrypoints/sdk/coreTypes.ts:30][E: utils/hooks.ts:3843][E: utils/hooks.ts:3844][E: types/hooks.ts:79][E: utils/hooks.ts:624] |
| `SessionStart` | `source` | session 启动、resume、clear 或 compact 时触发, 输入含 source/agent/model; JSON 可返回 context、initial user message 和 watch paths。[E: entrypoints/sdk/coreTypes.ts:31][E: utils/hooks.ts:3878][E: utils/hooks.ts:3887][E: utils/hooks.ts:1625][E: types/hooks.ts:83] |
| `SessionEnd` | `reason` | session 结束时 outside-REPL 触发, 输入含 exit reason, 执行后清理 session hooks。[E: entrypoints/sdk/coreTypes.ts:32][E: utils/hooks.ts:4115][E: utils/hooks.ts:4122][E: utils/hooks.ts:1638][E: utils/hooks.ts:4137] |
| `Stop` | 无 event-specific matcher | 主会话停止时触发, 输入含 `stop_hook_active` 和最后 assistant 文本; 如果传入 subagentId, 同一入口改发 `SubagentStop`。[E: entrypoints/sdk/coreTypes.ts:33][E: utils/hooks.ts:3653][E: utils/hooks.ts:3682][E: utils/hooks.ts:3684] |
| `StopFailure` | `error` | assistant 最后一条消息带 error 时 outside-REPL 触发, 输入含 error、error details 和最后 assistant 文本。[E: entrypoints/sdk/coreTypes.ts:34][E: utils/hooks.ts:3615][E: utils/hooks.ts:3616][E: utils/hooks.ts:1641] |
| `SubagentStart` | `agent_type` | subagent 启动时触发, 输入含 agent ID 和 agent type; JSON 可追加 context。[E: entrypoints/sdk/coreTypes.ts:35][E: utils/hooks.ts:3940][E: utils/hooks.ts:3941][E: utils/hooks.ts:1644][E: types/hooks.ts:96] |
| `SubagentStop` | `agent_type` | subagent 停止时由 stop executor 发出, 输入含 agent ID、agent transcript path、agent type 和最后 assistant 文本。[E: entrypoints/sdk/coreTypes.ts:36][E: utils/hooks.ts:3673][E: utils/hooks.ts:3676][E: utils/hooks.ts:1647] |
| `PreCompact` | `trigger` | compact 前 outside-REPL 触发, 输入含 manual/auto trigger 和 custom instructions; 成功 stdout 会汇总为 new custom instructions。[E: entrypoints/sdk/coreTypes.ts:37][E: utils/hooks.ts:3974][E: utils/hooks.ts:3981][E: utils/hooks.ts:1632][E: utils/hooks.ts:4020] |
| `PostCompact` | `trigger` | compact 后 outside-REPL 触发, 输入含 compact summary, 结果汇总为用户展示消息。[E: entrypoints/sdk/coreTypes.ts:38][E: utils/hooks.ts:4046][E: utils/hooks.ts:4053][E: utils/hooks.ts:1632][E: utils/hooks.ts:4085] |
| `PermissionRequest` | `tool_name` | 权限弹窗前触发, 输入含 tool input 和 permission suggestions; JSON 可直接 allow/deny, allow 时可更新 tool input 和 permissions。[E: entrypoints/sdk/coreTypes.ts:39][E: utils/hooks.ts:4176][E: utils/hooks.ts:4179][E: utils/hooks.ts:1622][E: types/hooks.ts:120][E: utils/hooks.ts:659] |
| `PermissionDenied` | `tool_name` | 权限被拒后触发, 输入含 reason; JSON 可返回 retry。[E: entrypoints/sdk/coreTypes.ts:40][E: utils/hooks.ts:3547][E: utils/hooks.ts:3551][E: utils/hooks.ts:1622][E: types/hooks.ts:112][E: utils/hooks.ts:654] |
| `Setup` | `trigger` | init 或 maintenance setup 时触发, 可强制同步执行; JSON 可追加 context。[E: entrypoints/sdk/coreTypes.ts:41][E: utils/hooks.ts:3910][E: utils/hooks.ts:3917][E: utils/hooks.ts:1628][E: types/hooks.ts:92] |
| `TeammateIdle` | 无 event-specific matcher | teammate 即将 idle 时触发, 输入含 teammate name 和 team name。[E: entrypoints/sdk/coreTypes.ts:42][E: utils/hooks.ts:3718][E: utils/hooks.ts:3719][E: utils/hooks.ts:1649] |
| `TaskCreated` | 无 event-specific matcher | task 创建时触发, 输入含 task id、subject、description、teammate 和 team。[E: entrypoints/sdk/coreTypes.ts:43][E: utils/hooks.ts:3758][E: utils/hooks.ts:3759][E: utils/hooks.ts:1650] |
| `TaskCompleted` | 无 event-specific matcher | task 标记完成时触发, 输入字段与 TaskCreated 对称。[E: entrypoints/sdk/coreTypes.ts:44][E: utils/hooks.ts:3802][E: utils/hooks.ts:3803][E: utils/hooks.ts:1651] |
| `Elicitation` | `mcp_server_name` | MCP server 发起 elicitation 时 outside-REPL 触发, 输入含 message/schema/mode/url/id; JSON 可 accept/decline/cancel 并返回 content。[E: entrypoints/sdk/coreTypes.ts:45][E: utils/hooks.ts:4493][E: utils/hooks.ts:4494][E: utils/hooks.ts:1654][E: types/hooks.ts:135][E: utils/hooks.ts:674] |
| `ElicitationResult` | `mcp_server_name` | elicitation 用户结果回传时 outside-REPL 触发, 输入含 action/content/mode/id; JSON 可改写或阻断 result response。[E: entrypoints/sdk/coreTypes.ts:46][E: utils/hooks.ts:4546][E: utils/hooks.ts:4550][E: utils/hooks.ts:1657][E: types/hooks.ts:140][E: utils/hooks.ts:690] |
| `ConfigChange` | `source` | settings、skills 等配置文件变化时触发, 输入含 source 和 file path; policy settings 的 blocking 结果会被改成非 blocking。[E: entrypoints/sdk/coreTypes.ts:47][E: utils/hooks.ts:4221][E: utils/hooks.ts:4223][E: utils/hooks.ts:1660][E: utils/hooks.ts:4234] |
| `WorktreeCreate` | 无 event-specific matcher | 创建 worktree 时 outside-REPL 触发, 输入含 name; 第一个成功且 stdout 非空的结果作为 worktree path。[E: entrypoints/sdk/coreTypes.ts:48][E: utils/hooks.ts:4933][E: utils/hooks.ts:4934][E: types/hooks.ts:159][E: utils/hooks.ts:4956] |
| `WorktreeRemove` | 无 event-specific matcher | 移除 worktree 时 outside-REPL 触发, 输入含 worktree path; 没有配置 hook 时返回 false。[E: entrypoints/sdk/coreTypes.ts:49][E: utils/hooks.ts:4980][E: utils/hooks.ts:4981][E: utils/hooks.ts:4974] |
| `InstructionsLoaded` | `load_reason` | instruction file 被加载进上下文时触发, 输入含 file path、memory type、load reason、globs 和父/触发文件。[E: entrypoints/sdk/coreTypes.ts:50][E: utils/hooks.ts:4355][E: utils/hooks.ts:4356][E: utils/hooks.ts:1663] |
| `CwdChanged` | 无 event-specific matcher | cwd 改变时触发 env hook, 输入含 old/new cwd; JSON 可返回 watch paths 和 system message。[E: entrypoints/sdk/coreTypes.ts:51][E: utils/hooks.ts:4271][E: utils/hooks.ts:4272][E: types/hooks.ts:145][E: utils/hooks.ts:4253] |
| `FileChanged` | `basename(file_path)` | 被 watch 的文件变化时触发 env hook, 输入含 file path 和 change/add/unlink; matcher 用 basename, JSON 可返回新的 watch paths。[E: entrypoints/sdk/coreTypes.ts:52][E: utils/hooks.ts:4289][E: utils/hooks.ts:4290][E: utils/hooks.ts:1666][E: types/hooks.ts:152] |

## Matcher 语义

`getMatchingHooks` 先按事件把 `matchQuery` 映射到 tool name、source、trigger、notification type、reason、error、agent type、MCP server name、load reason 或 file basename; 没有 event-specific query 的事件直接保留全部 matcher。[E: utils/hooks.ts:1616][E: utils/hooks.ts:1622][E: utils/hooks.ts:1625][E: utils/hooks.ts:1632][E: utils/hooks.ts:1644][E: utils/hooks.ts:1654][E: utils/hooks.ts:1666] `matchesPattern` 支持空 matcher/`*` 全匹配、简单字符串、pipe-separated exact list 和 regex; regex 还会尝试 legacy tool names, 无效 regex 返回 false。[E: utils/hooks.ts:1346][E: utils/hooks.ts:1351][E: utils/hooks.ts:1364][E: utils/hooks.ts:1370][E: utils/hooks.ts:1376]

匹配后, hook 会按 source context 生成 `hookSource`, 包括 settings、plugin、skill 等来源。[E: utils/hooks.ts:1688][E: utils/hooks.ts:1694] command/prompt/agent/http hook 会按 command、prompt 或 URL 加 `if` condition 去重, callback/function hook 不去重。[E: utils/hooks.ts:1735][E: utils/hooks.ts:1757][E: utils/hooks.ts:1770][E: utils/hooks.ts:1783][E: utils/hooks.ts:1796] `if` condition 只支持 PreToolUse、PostToolUse、PostToolUseFailure 和 PermissionRequest 这四类工具相关事件; 它会解析 permission rule, 并复用工具自己的 `preparePermissionMatcher`。[E: utils/hooks.ts:1394][E: utils/hooks.ts:1403][E: utils/hooks.ts:1411] SessionStart 和 Setup 会额外过滤 HTTP hook, 因为这两个事件不支持 HTTP hooks。[E: utils/hooks.ts:1853][E: utils/hooks.ts:1856]

## I/O 契约

Command hook 的执行器会把 base env 和 hook env 拼起来, 至少设置 `CLAUDE_PROJECT_DIR`; plugin/skill hook 还会设置 `CLAUDE_PLUGIN_ROOT`, plugin hook 可设置 `CLAUDE_PLUGIN_DATA` 和 `CLAUDE_PLUGIN_OPTION_*`。[E: utils/hooks.ts:882][E: utils/hooks.ts:889][E: utils/hooks.ts:898][E: utils/hooks.ts:907] 对 SessionStart、Setup、CwdChanged、FileChanged 这四类非 PowerShell command hook, executor 会给每个 hookIndex 设置 `CLAUDE_ENV_FILE`, 让 hook 写环境变量供后续 session command 使用。[E: utils/hooks.ts:917][E: utils/hooks.ts:925] command hook 的 JSON input 通过 stdin 写入并追加换行; prompt/agent/http/callback/function hook 分别走独立 executor 分支。[E: utils/hooks.ts:1210][E: utils/hooks.ts:2224][E: utils/hooks.ts:2256][E: utils/hooks.ts:2296][E: utils/hooks.ts:2147][E: utils/hooks.ts:4740]

Sync JSON response 的公共字段包括 `continue`、`suppressOutput`、`stopReason`、top-level `decision`、`reason` 和 `systemMessage`; `hookSpecificOutput` 是一个按事件区分的 union, 不是所有 27 个事件都有事件专用输出 schema。[E: types/hooks.ts:52][E: types/hooks.ts:56][E: types/hooks.ts:60][E: types/hooks.ts:64][E: types/hooks.ts:66][E: types/hooks.ts:70] Async JSON response 是 `{ async: true, asyncTimeout? }`, `isAsyncHookJSONOutput` 和 `isSyncHookJSONOutput` 用 `async === true` 做类型判定。[E: types/hooks.ts:171][E: types/hooks.ts:182][E: types/hooks.ts:189]

`processHookJSONOutput` 会把 `continue:false` 变成 `preventContinuation`, top-level `decision:block` 变成 deny 和 blocking error, `systemMessage` 变成 hook system message。[E: utils/hooks.ts:518][E: utils/hooks.ts:525][E: utils/hooks.ts:546] 对事件专用输出, PreToolUse 可改 permission behavior 和 input, PostToolUse 可替换 MCP output, PermissionRequest 可直接返回 allow/deny decision, PermissionDenied 可返回 retry, Elicitation/ElicitationResult 可返回 action/content 并在 decline 时阻断。[E: utils/hooks.ts:592][E: utils/hooks.ts:618][E: utils/hooks.ts:643][E: utils/hooks.ts:657][E: utils/hooks.ts:654][E: utils/hooks.ts:674][E: utils/hooks.ts:690]

非 JSON stdout 的 command hook 仍有 exit code 语义: status 0 是 success, status 2 是 blocking feedback, 其它非零 status 是 non-blocking error。[E: utils/hooks.ts:2617][E: utils/hooks.ts:2648][E: utils/hooks.ts:2672] 如果 stdout 是 JSON, `executeHooks` 会先解析并校验, async JSON 被当成 success, sync JSON 交给 `processHookJSONOutput`。[E: utils/hooks.ts:2500][E: utils/hooks.ts:2533][E: utils/hooks.ts:2544] async hook 也可以通过配置 `hook.async`/`hook.asyncRewake` 或首行输出 async JSON 后被 backgrounded。[E: utils/hooks.ts:995][E: utils/hooks.ts:1117][E: utils/hooks.ts:1127]

## 控制流

REPL 内执行从 `executeHooks` 开始: 它先检查全局 hooks 禁用和 SIMPLE 模式, 再进行 workspace trust check, 然后调用 `getMatchingHooks`。[E: utils/hooks.ts:1978][E: utils/hooks.ts:1982][E: utils/hooks.ts:1994][E: utils/hooks.ts:2004] 如果全部是 callback hook, 它走 fast path 直接调用 callback 并记录统计; 否则先 yield 每个 hook 的 progress message, 再懒序列化一次 hook input, 最后并行运行所有 matching hooks。[E: utils/hooks.ts:2041][E: utils/hooks.ts:2048][E: utils/hooks.ts:2095][E: utils/hooks.ts:2128][E: utils/hooks.ts:2143]

归并阶段按 hook result 逐个 yield 上层可消费字段: prevent continuation、blocking error、message、system message、additional context、initial user message、watch paths、updated MCP output、permission behavior、updated input、permission request result、retry、elicitation response 和 elicitation result response; watchPaths、hookSource、elicitationResponse 和 elicitationResultResponse 在 runtime `AggregatedHookResult` 中也有对应字段。[E: utils/hooks.ts:2744][E: utils/hooks.ts:2748][E: utils/hooks.ts:2759][E: utils/hooks.ts:2770][E: utils/hooks.ts:2783][E: utils/hooks.ts:2792][E: utils/hooks.ts:2801][E: utils/hooks.ts:2811][E: utils/hooks.ts:2821][E: utils/hooks.ts:2862][E: utils/hooks.ts:2865][E: utils/hooks.ts:2873][E: utils/hooks.ts:2882][E: utils/hooks.ts:2888][E: utils/hooks.ts:2894][E: utils/hooks.ts:2900][E: utils/hooks.ts:359][E: utils/hooks.ts:365][E: utils/hooks.ts:372][E: utils/hooks.ts:373][E: utils/hooks.ts:374] permission behavior 聚合优先级是 deny 高于 ask, ask 高于 allow。[E: utils/hooks.ts:2826][E: utils/hooks.ts:2827][E: utils/hooks.ts:2831][E: utils/hooks.ts:2837]

Outside-REPL 执行器用于 Notification、SessionEnd、Compact、ConfigChange、Cwd/File/Instructions/Worktree/Elicitation 等场景; 它使用同一匹配/执行协议, 但返回 `HookOutsideReplResult[]` 或事件专用 result, 而不是流式 yield REPL attachment。[E: utils/hooks.ts:3003][E: utils/hooks.ts:3570][E: utils/hooks.ts:4097][E: utils/hooks.ts:4214][E: utils/hooks.ts:4260][E: utils/hooks.ts:4335][E: utils/hooks.ts:4928]

## 信任模型

`shouldSkipHookDueToTrust` 在 non-interactive session 中返回 false, 在 interactive session 中读取 trust dialog 状态并在未信任时跳过 hook。[E: utils/hooks.ts:286][E: utils/hooks.ts:288][E: utils/hooks.ts:294] `executeHooks` 在真正匹配 hook 前集中调用该 trust gate, StatusLine 和 FileSuggestion command 也分别在执行前调用同一个 trust gate。[E: utils/hooks.ts:1994][E: utils/hooks.ts:4597][E: utils/hooks.ts:4687] 因此 hooks 的安全边界是“interactive workspace trust + managed hooks policy + hook source filtering”共同形成的, 不是单个 event 自己实现安全检查。[E: utils/hooks.ts:1516][E: utils/hooks.ts:1524][E: utils/hooks.ts:1541][E: utils/hooks.ts:1994][I]

## 设计动机与权衡

- Hook protocol 同时支持 exit code、plain stdout、sync JSON 和 async JSON; 这让 shell 脚本可以低门槛接入, 也让 plugin/SDK 能返回结构化权限和上下文结果。[E: utils/hooks.ts:2617][E: utils/hooks.ts:2648][E: types/hooks.ts:50][E: types/hooks.ts:171][I]
- Matcher 先用事件字段缩小候选, 再做 pattern/regex/if condition, 能兼顾简单配置和工具输入级过滤; 代价是每个新 event 都要明确选择自己的 match query 字段。[E: utils/hooks.ts:1616][E: utils/hooks.ts:1681][E: utils/hooks.ts:1811][I]
- SessionStart/Setup 禁用 HTTP hook 是 execution ordering 的取舍: 这两个早期事件保留 command/callback/prompt 等路径, 但不允许 HTTP hook 进入可能还没有 structured input consumer 的阶段。[E: utils/hooks.ts:1853][I]

## Gotchas

- `hookSpecificOutput` 里没有 `WorktreeRemove`、`SessionEnd`、`Stop`、`Notification` 等大多数事件的专用输出; 这些事件仍可使用公共字段或 exit code, 但不要假设都有 event-specific schema。[E: types/hooks.ts:70][E: types/hooks.ts:159]
- `FileChanged` 的 matcher 不是完整路径而是 `basename(file_path)`, 路径级过滤需要在 hook 自己读取 JSON input 后判断。[E: utils/hooks.ts:1665][E: utils/hooks.ts:1666]
- ConfigChange 的 `policy_settings` source 仍会触发 hook 做审计, 但 blocking 结果会被改写为 `blocked:false`, 不能用 hook 阻止 policy settings 生效。[E: utils/hooks.ts:4234][E: utils/hooks.ts:4235]
- `CLAUDE_ENV_FILE` 只给 SessionStart、Setup、CwdChanged、FileChanged 的非 PowerShell command hook 设置, 普通 hook 输出环境变量不会自动进入 session environment。[E: utils/hooks.ts:917][E: utils/hooks.ts:918][E: utils/hooks.ts:925]

## Sources

- `utils/hooks.ts`
- `types/hooks.ts`

## 相关

- `group.hook-events`

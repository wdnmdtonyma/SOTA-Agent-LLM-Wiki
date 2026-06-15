---
id: subsys.command-system
path: subsystems/command-system.md
title: 命令系统机制
kind: subsystem
tier: T2
status: verified
source: [commands.ts, types/command.ts]
symbols: [Command, PromptCommand, LocalCommand, LocalJSXCommand, getCommands, loadAllCommands, getSkillToolCommands, isBridgeSafeCommand, filterCommandsForRemoteMode]
related: [group.commands]
evidence: explicit
updated: 2026-06-14
---

> 命令系统把 slash commands、prompt commands、local commands、local-jsx commands、skills、plugins、workflow 和 MCP prompts 合并成用户与模型可调用的 command surface。

## 能回答的问题

- `Command` union 中 prompt/local/local-jsx 三类命令的执行形态有什么区别?
- built-in commands、skills、plugins、workflow、MCP prompts 在哪里合并?
- command availability 与 `isEnabled()` 为什么分开?
- 动态 skills 为什么插入到 plugin skills 与 built-ins 之间?
- remote mode 与 bridge inbound command 的 allowlist 在哪里定义?

## 职责边界

命令系统负责加载、过滤、查找和描述 slash command surface; 它不负责 REPL input UI、model tool call execution 或具体 command implementation 的业务逻辑。interactive/headless 对 command surface 的消费由 [CLI 与运行模式](cli-modes.md) 处理, command 扩展出的 model prompt 后续进入 [Agent loop](../spine/agent-loop.md)。[E: commands.ts:476][E: types/command.ts:205][I]

`commands.ts` 是聚合层: built-in command list、skills/plugins/workflows、MCP skill/prompt commands、remote/bridge safety 都在这里汇合。[E: commands.ts:258][E: commands.ts:449][E: commands.ts:547][E: commands.ts:619][E: commands.ts:672]

## 关键文件

| 文件 | 作用 |
| --- | --- |
| `types/command.ts` | 定义 `LocalCommandResult`、`PromptCommand`、`LocalCommand`、`LocalJSXCommand`、`CommandBase` 和 `Command` union。[E: types/command.ts:16][E: types/command.ts:25][E: types/command.ts:74][E: types/command.ts:144][E: types/command.ts:175][E: types/command.ts:205] |
| `commands.ts` | re-export command types, memoize built-in command list, 合并 external sources, 执行 availability/enabled filtering, 提供 lookup 和 remote/bridge filters。[E: commands.ts:213][E: commands.ts:258][E: commands.ts:449][E: commands.ts:476][E: commands.ts:672][E: commands.ts:684][E: commands.ts:688] |

## 数据模型

`LocalCommandResult` 支持 text、compact 和 skip 三种结果; compact command 直接携带 `CompactionResult`, 让 `/compact` 这类 command 可以把压缩结果返回给上层而不是只输出文本。[E: types/command.ts:17][E: types/command.ts:19][E: types/command.ts:20][E: types/command.ts:23]

`PromptCommand` 代表会展开为 prompt content 的命令, 包含 progress message、content length、argument names、allowed tools、model、source、plugin info、non-interactive disable、hooks、skill root、inline/fork context、agent、effort、paths 和 `getPromptForCommand()`。[E: types/command.ts:25][E: types/command.ts:27][E: types/command.ts:28][E: types/command.ts:29][E: types/command.ts:30][E: types/command.ts:31][E: types/command.ts:32][E: types/command.ts:33][E: types/command.ts:37][E: types/command.ts:39][E: types/command.ts:41][E: types/command.ts:45][E: types/command.ts:48][E: types/command.ts:49][E: types/command.ts:52][E: types/command.ts:53]

`LocalCommand` 通过 lazy `load()` 得到 module 后执行 `call(args, context)`, 可声明是否支持 non-interactive; `LocalJSXCommand` 则 lazy load 一个返回 React node 的 `call(onDone, context, args)`。[E: types/command.ts:62][E: types/command.ts:71][E: types/command.ts:74][E: types/command.ts:76][E: types/command.ts:77][E: types/command.ts:131][E: types/command.ts:141][E: types/command.ts:144][E: types/command.ts:151]

`CommandBase` 统一描述 availability、description、isEnabled、isHidden、name/aliases、MCP 标记、argument hint、whenToUse、version、model invocation disable、userInvocable、loadedFrom、workflow kind、immediate、sensitive 和 user-facing name。[E: types/command.ts:176][E: types/command.ts:177][E: types/command.ts:180][E: types/command.ts:182][E: types/command.ts:183][E: types/command.ts:184][E: types/command.ts:185][E: types/command.ts:186][E: types/command.ts:187][E: types/command.ts:188][E: types/command.ts:189][E: types/command.ts:190][E: types/command.ts:191][E: types/command.ts:198][E: types/command.ts:199][E: types/command.ts:200][E: types/command.ts:202]

`CommandAvailability` 只表达 auth/provider static requirement, `isCommandEnabled()` 才是 runtime gate; `meetsAvailabilityRequirement()` 每次 `getCommands()` 都重新计算, 以便 `/login` 之类 auth state 变化即时生效。[E: types/command.ts:169][E: types/command.ts:214][E: commands.ts:417][E: commands.ts:483][E: commands.ts:484]

## 控制流

1. `COMMANDS` 是 memoized built-in command array, internal-only commands 只在 ant 非 demo 环境追加, 避免外部 build 暴露内部命令。[E: commands.ts:225][E: commands.ts:258][E: commands.ts:343]
2. `getSkills(cwd)` 并行加载 skill dir commands 和 plugin skills, workflow commands 受 `WORKFLOW_SCRIPTS` feature gate 控制。[E: commands.ts:353][E: commands.ts:360][E: commands.ts:401]
3. `loadAllCommands(cwd)` 并行读取 skills、plugin commands、workflow commands, 然后按 bundled skills、builtin plugin skills、skill dirs、workflows、plugin commands、plugin skills、built-ins 的顺序拼接。[E: commands.ts:449][E: commands.ts:454][E: commands.ts:461][E: commands.ts:462][E: commands.ts:463][E: commands.ts:464][E: commands.ts:465][E: commands.ts:466][E: commands.ts:467]
4. `getCommands(cwd)` 调用 `loadAllCommands()`, 再把 `meetsAvailabilityRequirement()` 和 `isCommandEnabled()` 同时满足的 command 作为 base surface。[E: commands.ts:476][E: commands.ts:477][E: commands.ts:484]
5. 如果存在 dynamic skills, `getCommands()` 会用 base command name 去重, 再把 unique dynamic skills 插入到第一个 built-in command 前; 找不到 built-in 位置时追加到末尾。[E: commands.ts:480][E: commands.ts:492][E: commands.ts:493][E: commands.ts:495][E: commands.ts:505][E: commands.ts:506][E: commands.ts:508][E: commands.ts:509][E: commands.ts:513][E: commands.ts:514][E: commands.ts:515]
6. `getMcpSkillCommands()` 只在 `MCP_SKILLS` feature gate 打开时返回来自 MCP 且未禁用 model invocation 的 prompt commands。[E: commands.ts:547][E: commands.ts:550][E: commands.ts:553][E: commands.ts:554][E: commands.ts:555]
7. `getSkillToolCommands()` 为 SkillTool 选择非 builtin 的 prompt commands, 并要求它们不是禁用 model invocation, 且来自 bundled/skills/legacy commands 或有用户描述/whenToUse。[E: commands.ts:563][E: commands.ts:565][E: commands.ts:568][E: commands.ts:569][E: commands.ts:570][E: commands.ts:574][E: commands.ts:575][E: commands.ts:576][E: commands.ts:577][E: commands.ts:578]
8. `getSlashCommandToolSkills()` 是更窄的 slash-command skill filter, 要求 prompt、非 builtin、有 description/whenToUse, 且 loadedFrom 为 skills/plugin/bundled 或 disableModelInvocation。[E: commands.ts:586][E: commands.ts:589][E: commands.ts:592][E: commands.ts:593][E: commands.ts:594][E: commands.ts:595][E: commands.ts:596][E: commands.ts:597][E: commands.ts:598]
9. remote mode 先用 `REMOTE_SAFE_COMMANDS` 过滤 TUI 中可见 commands; bridge inbound 则用 `isBridgeSafeCommand()`, 其中 prompt commands 默认安全, local commands 需要 `BRIDGE_SAFE_COMMANDS`, local-jsx 一律 blocked。[E: commands.ts:619][E: commands.ts:651][E: commands.ts:672][E: commands.ts:673][E: commands.ts:674][E: commands.ts:675][E: commands.ts:684][E: commands.ts:685]
10. `findCommand()` 匹配 internal name、user-facing name 和 aliases; `getCommand()` 找不到时抛出带可用命令列表的 `ReferenceError`。[E: commands.ts:688][E: commands.ts:694][E: commands.ts:695][E: commands.ts:696][E: commands.ts:704][E: commands.ts:708][E: commands.ts:709]

## 设计动机与权衡

command loading 的 expensive parts 用 memoization 按 cwd 缓存, 但 availability 与 `isEnabled()` 每次都 fresh filter, 因为 auth state 和 feature gate 可能在会话中变化。[E: commands.ts:449][E: commands.ts:476][E: commands.ts:483][E: commands.ts:484][I]

动态 skills 插入到 built-ins 前, 让模型/用户更容易看到最近由文件操作发现的 domain skill, 同时用 name 去重避免覆盖已存在 command。[E: commands.ts:492][E: commands.ts:495][E: commands.ts:505][E: commands.ts:506][E: commands.ts:513][E: commands.ts:514][E: commands.ts:515][I]

remote 和 bridge 安全边界分开: remote mode 是渲染前的 command surface 过滤, bridge inbound 是外部客户端请求到达后的 execution allowlist; 两者解决的问题不同, 所以使用 `REMOTE_SAFE_COMMANDS` 与 `BRIDGE_SAFE_COMMANDS` 两套集合。[E: commands.ts:619][E: commands.ts:651][E: commands.ts:684][I]

## Gotcha

- `builtInCommandNames()` 包含 aliases, 因此判断 command 是否 built-in 时不能只看 `COMMANDS().map(c => c.name)` 的裸集合, 除非调用点明确只需要 primary name。[E: commands.ts:348][E: commands.ts:350][I]
- `formatDescriptionWithSource()` 对 prompt command 会把 plugin/bundled/setting source 加进描述, 但 builtin 与 MCP prompt 保持原描述; UI/文档生成如果希望展示来源, 应调用这个 helper 而不是直接读 `description`。[E: commands.ts:728][E: commands.ts:737][E: commands.ts:745][E: commands.ts:749][E: commands.ts:753]
- `PromptCommand.disableNonInteractive` 与 `CommandBase.disableModelInvocation` 是不同限制: 前者控制 headless 用户命令是否可用, 后者控制模型是否能通过 SkillTool 调用。[E: types/command.ts:37][E: types/command.ts:189][E: commands.ts:569]

## Sources

- `types/command.ts`
- `commands.ts`

## 相关

- [CLI 与运行模式](cli-modes.md)
- [压缩家族](compaction.md)
- [MCP](mcp.md)

---
id: integrations.commands
title: Commands integration
kind: subsystem
tier: T2
v: shared
status: verified
updated: 8b68dc0d7
source:
  - packages/opencode/src/command/index.ts
  - packages/opencode/src/config/command.ts
  - packages/opencode/src/session/prompt.ts
  - packages/core/src/command.ts
  - packages/core/src/plugin/command.ts
  - packages/core/src/config/plugin/command.ts
  - packages/core/src/config/command.ts
  - packages/protocol/src/groups/command.ts
  - packages/server/src/handlers/command.ts
symbols:
  - Command.Service
  - Command.Event.Executed
  - CommandV2.Service
  - CommandPlugin.Plugin
  - ConfigCommandPlugin.Plugin
related:
  - integrations.skills
  - integrations.mcp-client
evidence: explicit
---

> Commands integration 是 V1/V2 共享概念但两套执行形态：V1 live 把 built-in/config/MCP prompts/skills 汇总成 slash command 并在 `SessionPrompt.command` 中执行；V2 core 提供 Effect-native command registry 和 plugin transforms，目前主要经 V2 server API 暴露 list。

## 能回答的问题

- V1 slash command 来源有哪些，优先级如何。
- V1 MCP prompt 如何变成 command，skill 如何补成 command。
- V1 command argument placeholder、shell fenced block、subtask 是怎样执行的。
- V2 command registry 如何被 built-in plugin 和 config plugin 填充。
- V2 command endpoint 当前只做什么。

## V1

### 职责

V1 `Command.Service` 聚合四类 command：内建 init/review、config command markdown、MCP prompt、可用 skill。[E: packages/opencode/src/command/index.ts:70] [E: packages/opencode/src/command/index.ts:90] [E: packages/opencode/src/command/index.ts:105] [E: packages/opencode/src/command/index.ts:134] 它只提供 `get` 和 `list`，真正执行在 `packages/opencode/src/session/prompt.ts` 的 `command(input)` 流程里。[E: packages/opencode/src/command/index.ts:51] [E: packages/opencode/src/session/prompt.ts:1355]

`Command.Event.Executed` 记录 `name`、`sessionID`、`arguments`、`messageID`，用于 V1 event stream 订阅方了解 slash command 何时执行。[E: packages/opencode/src/command/index.ts:18]

### 数据模型

V1 `Command.Info` 包含 `name`、可选 `description`、`agent`、`model`、`source`、`template`、`subtask`、`hints`。[E: packages/opencode/src/command/index.ts:22] `source` 只能是 `command`、`mcp`、`skill`。[E: packages/opencode/src/command/index.ts:27]

`hints(template)` 会扫描 `$1`、`$2` 等 positional placeholders 和 `$ARGUMENTS`，用于提示 command 需要哪些参数。[E: packages/opencode/src/command/index.ts:36]

config command markdown 由 `packages/opencode/src/config/command.ts` 扫描 `{command,commands}/**/*.md` 生成，name 来自相对路径并去掉 `command/` 或 `commands/` 前缀和 `.md` 后缀。[E: packages/opencode/src/config/command.ts:13] [E: packages/opencode/src/config/command.ts:24]

### 构建流程

1. service 初始化时创建内建 `init` command，template 让模型分析项目并创建 AGENTS.md。[E: packages/opencode/src/command/index.ts:70]
2. service 创建内建 `review` command，并标记 `subtask: true`。[E: packages/opencode/src/command/index.ts:79] [E: packages/opencode/src/command/index.ts:86]
3. config command 从 `cfg.command` 转成 `Command.Info`，source 设为 `command`。[E: packages/opencode/src/command/index.ts:90] [E: packages/opencode/src/command/index.ts:96]
4. MCP prompts 被拉成 command：name 来自 `mcp.prompts()` 返回 map 的 key，template 是 getter 返回的 Promise/string，读取时调用 `mcp.getPrompt(prompt.client, prompt.name, args)`。[E: packages/opencode/src/command/index.ts:105] [E: packages/opencode/src/command/index.ts:111] [E: packages/opencode/src/command/index.ts:113]
5. MCP prompt response 中只有 text content 会被 join 成 template 输出。[E: packages/opencode/src/command/index.ts:123] [E: packages/opencode/src/command/index.ts:125]
6. skills 会补成 command，但只有在没有同名 command 时才加入，避免覆盖已有 command。[E: packages/opencode/src/command/index.ts:134] [E: packages/opencode/src/command/index.ts:135]
7. service 的 `get(name)` 做 name lookup，`list()` 返回 command map values。[E: packages/opencode/src/command/index.ts:161] [E: packages/opencode/src/command/index.ts:166]

### 执行流程

1. `SessionPrompt.command` 先用 `Command.get(input.command)` 查找 command；找不到时列出 available command hints 并抛错。[E: packages/opencode/src/session/prompt.ts:1361] [E: packages/opencode/src/session/prompt.ts:1363]
2. arguments 通过 shell word parser 解析；`cmd.template` 可以是 string 或 Promise-like value，执行层用 `Effect.promise(async () => cmd.template)` 取出 template text。[E: packages/opencode/src/session/prompt.ts:1371] [E: packages/opencode/src/session/prompt.ts:1373]
3. positional placeholder `$1`、`$2` 等会替换成对应参数；最后一个 placeholder 会消费剩余参数。[E: packages/opencode/src/session/prompt.ts:1375] [E: packages/opencode/src/session/prompt.ts:1386]
4. `$ARGUMENTS` 被替换成完整 argument string。[E: packages/opencode/src/session/prompt.ts:1389] [E: packages/opencode/src/session/prompt.ts:1390]
5. 如果 template 没有 placeholder 且用户传了参数，参数会追加到 message 尾部。[E: packages/opencode/src/session/prompt.ts:1392]
6. fenced shell block 会按当前 shell 执行，并把 `Process.text(...).text` 结果拼回 message。[E: packages/opencode/src/session/prompt.ts:1396] [E: packages/opencode/src/session/prompt.ts:1400] [E: packages/opencode/src/session/prompt.ts:1406]
7. task model precedence 是 command model、command agent model、input model、当前 session model。[E: packages/opencode/src/session/prompt.ts:1410]
8. command agent 会按 command.agent 找 agent，否则使用当前 agent；找不到 hidden agent 时会抛出带提示的错误。[E: packages/opencode/src/session/prompt.ts:1369] [E: packages/opencode/src/session/prompt.ts:1422]
9. 如果 agent mode 是 `subagent` 且 command 没有显式 `subtask: false`，或者 command 本身 `subtask === true`，会生成 subtask part；否则会把 command 结果作为普通 prompt 输入继续 run loop。[E: packages/opencode/src/session/prompt.ts:1438] [E: packages/opencode/src/session/prompt.ts:1439] [E: packages/opencode/src/session/prompt.ts:1465]
10. 执行后发布 `Command.Event.Executed`。[E: packages/opencode/src/session/prompt.ts:1473]

## V2

### 职责

V2 `CommandV2.Service` 是 Effect-native command registry，暴露 transform/update/get/list。[E: packages/core/src/command.ts:22] 它本身只管理 registry；built-in command 和 config command 通过 plugin transform 写入。[E: packages/core/src/plugin/command.ts:9] [E: packages/core/src/config/plugin/command.ts:15]

### 数据模型

V2 `Command.Info` 包含 `name`、`template`、可选 `description`、`agent`、`model`、`subtask`。[E: packages/core/src/command.ts:8] 当前 V2 command info 没有 V1 的 `source` 和 `hints` 字段。[E: packages/core/src/command.ts:8]

`CommandV2.Service.update` 如果 name 不存在，会创建默认 `{ name, template: "" }`，再把 transform 后的 command 写回 map。[E: packages/core/src/command.ts:38] [E: packages/core/src/command.ts:40]

### Built-in 与 config plugin

1. `packages/core/src/plugin/command.ts` 注册 plugin id `command`。[E: packages/core/src/plugin/command.ts:9]
2. 这个 plugin 在 transform 里写入 `init` 和 `review` 两个内建 command，其中 `review` 标记 `subtask: true`。[E: packages/core/src/plugin/command.ts:14] [E: packages/core/src/plugin/command.ts:21]
3. `packages/core/src/config/plugin/command.ts` 注册 plugin id `config-command`。[E: packages/core/src/config/plugin/command.ts:15]
4. config plugin 读取 document 或 directory source，并把 config command 字段写进 `CommandV2.Service`。[E: packages/core/src/config/plugin/command.ts:22] [E: packages/core/src/config/plugin/command.ts:31]
5. directory loader glob `{command,commands}/**/*.md`，并用相对路径去掉 `command/` 或 `commands/` 前缀与 `.md` 后缀生成 name。[E: packages/core/src/config/plugin/command.ts:55] [E: packages/core/src/config/plugin/command.ts:76] [E: packages/core/src/config/plugin/command.ts:80]

### Server API

V2 protocol `command` group 当前定义 `GET /api/command`，response 是 `Array(Command.Info)`，identifier 是 `v2.command.list`。[E: packages/protocol/src/groups/command.ts:9] [E: packages/protocol/src/groups/command.ts:11] [E: packages/protocol/src/groups/command.ts:16] server handler 只调用 `CommandV2.Service.list()`。[E: packages/server/src/handlers/command.ts:7]

## V1 / V2 差异表

| 维度 | V1 live | V2 core |
| --- | --- | --- |
| command 来源 | built-in、config markdown、MCP prompts、skills。 | built-in plugin、config plugin。 |
| 执行位置 | `SessionPrompt.command`，接入 V1 run loop。 | 当前源码中 command service/list API 已有；默认 V2 execution path 未在本节点源文件中直接体现。[I] |
| MCP prompt command | V1 service 直接从 `MCP.prompts()` 生成。 | 本节点源文件未显示 V2 MCP prompt 到 command 的 bridge。[I] |
| skill command | V1 把可用 skill 补成 command。 | V2 skill guidance/tool 独立；本节点源文件未显示自动补 command。[I] |
| metadata | 有 `source`、`hints`。 | `Command.Info` 无 `source`、`hints`。 |

## 设计动机与权衡

V1 command 是“用户输入入口聚合器”：它把本地 markdown、外部 MCP prompt、skill 都统一成 slash command，让 session prompt 执行层只面对 `Command.Info`。[I] 聚合来源集中在 `Command.Service` 初始化体内。[E: packages/opencode/src/command/index.ts:65]

V2 command 则向 plugin transform 迁移：core service 管 registry，plugin 负责写入 built-in/config command。[I] 这种形态与 V2 core 的 plugin boot/transform 体系一致，减少 core service 对 config source 的直接依赖。[E: packages/core/src/command.ts:22] [E: packages/core/src/config/plugin/command.ts:15]

## 易踩坑

- `packages/opencode/src/session/message-v2.ts` 虽然带 v2 名称，但 command execution 仍在 V1 `session/prompt.ts`；不要把它当 V2 command runtime。[I]
- V1 MCP prompt command name 来自 `mcp.prompts()` map key；MCP prompt/resource catalog 使用冒号 key，而 MCP tool final key 使用下划线。[E: packages/opencode/src/command/index.ts:105] [I]
- V1 skill command 只在没有同名 command 时加入，因此 config command 可以遮蔽同名 skill command。[E: packages/opencode/src/command/index.ts:135]
- shell fenced block 会真实执行本地 shell command，属于 command template 的执行副作用。[E: packages/opencode/src/session/prompt.ts:1396]
- V2 protocol API 当前在 `CommandGroup` 中只显示 list endpoint；不要从这个文件推断 V2 已经提供完整 slash command execution HTTP endpoint。[E: packages/protocol/src/groups/command.ts:9] [I]

## Sources

- packages/opencode/src/command/index.ts
- packages/opencode/src/config/command.ts
- packages/opencode/src/session/prompt.ts
- packages/core/src/command.ts
- packages/core/src/plugin/command.ts
- packages/core/src/config/plugin/command.ts
- packages/core/src/config/command.ts
- packages/protocol/src/groups/command.ts
- packages/server/src/handlers/command.ts

## 相关

- integrations.skills
- integrations.mcp-client

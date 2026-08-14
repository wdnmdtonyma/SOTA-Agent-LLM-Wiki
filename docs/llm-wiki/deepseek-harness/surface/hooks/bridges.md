---
id: surface.hooks.bridges
title: Claude / Codex hooks 桥
kind: surface
tier: T1
pkg: interaction
source:
  - packages/hooks/hooks-claude-code/src/index.ts
  - packages/hooks/hooks-claude-code/src/config.ts
  - packages/hooks/hooks-claude-code/package.json
  - packages/hooks/hooks-claude-code/tests/bridge.spec.ts
  - packages/hooks/hooks-claude-code/tests/config.spec.ts
  - packages/hooks/hooks-claude-code/tests/coverage-cases.ts
  - packages/hooks/hooks-codex/src/index.ts
  - packages/hooks/hooks-codex/src/config.ts
  - packages/hooks/hooks-codex/package.json
  - packages/hooks/hooks-codex/tests/bridge.spec.ts
  - packages/hooks/hooks-codex/tests/config.spec.ts
  - packages/hooks/hooks-codex/tests/coverage-cases.ts
  - packages/hooks/hook-protocol/src/index.ts
  - packages/hooks/hook-protocol/src/runner.ts
  - packages/hooks/hook-protocol/src/matcher.ts
  - packages/hooks/hook-protocol/src/merge.ts
  - packages/hooks/hook-protocol/src/events.ts
  - packages/hooks/hook-protocol/package.json
  - packages/hooks/hook-protocol/tests/matcher.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/package.json
  - packages/bundle/headless/package.json
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/src/profile-boot.ts
  - apps/cli/src/plugin.ts
  - packages/boot/app-boot/src/profile.ts
  - examples/acp-agent/cordis.yml
  - examples/acp-agent/tests/hooks.e2e.ts
  - examples/package.json
  - python/sdk-runtime/package.json
  - packages/core/agent/src/runtime-types.ts
  - packages/core/tools/src/index.ts
  - packages/subagent/subagent/src/index.ts
  - vendor/cordis/src/events.ts
symbols:
  - hooks-claude-code
  - hooks-codex
  - parseClaudeCodeConfig
  - parseCodexConfig
  - CODEX_EVENTS
  - substituteCommand
  - apply
  - Config
related: []
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-hooks-claude-code`（插件名 `hooks-claude-code`）和 `@deepseek-ai/dsh-hooks-codex`（插件名 `hooks-codex`）是 **host 面 opt-in overlay**：把一份未改写的 Claude Code / Codex 命令 hook 文件接到 Cordis 已有监听点。它们是文件桥，不是全套 HookEvent 再实现，也不进默认 `dsh web` 树。共享执行器是库 `@deepseek-ai/dsh-hook-protocol`（无 `apply`、无 `ctx.hooks`）。

## 能回答的问题

- `dsh web` / `dsh-base` / shipped preset 会不会默认读 `hooks.json`？
- 用户要把一份 Claude / Codex hook 文件接到 DSH，往哪一层写插件行？`configPath` 相对谁？
- 两座桥各自认哪些事件名？接到哪条 Cordis 点？哪些是 waterfall（必须 `next()`）？
- `updatedInput` / `systemMessage` / `continue:false` 会不会改工具参数、进模型请求、停 turn？
- Claude 的 `ask` 和 Codex 的 `ask` 在 DSH 里是不是一回事？`Stop` deny 是停 turn 还是逼续跑？
- `hook-protocol` 要不要单独 insert 一行？`dsh plugin add` 这两包会不会变成 bundle 层？

## 是什么

DSH 是 Cordis 组合运行时：`profile → bundle → agent preset`。默认产品路径是本地 Web GUI（`dsh web`），没有 shipped TUI。拦截缝已经在 host 面的 `agent/*`、`tools/*`、`subagent/*` 上；两座桥只是把对方产品的 hook 文件方言投到这些缝上。

| 包 | 插件 `name` | 认的事件 | 文件方言 |
|---|---|---|---|
| `@deepseek-ai/dsh-hooks-claude-code` | `hooks-claude-code` [E: packages/hooks/hooks-claude-code/src/index.ts:39] | 7 个：`SessionStart` `UserPromptSubmit` `PreToolUse` `PostToolUse` `Stop` `SubagentStart` `SubagentStop`（`CLAUDE_EVENTS` **未导出**） [E: packages/hooks/hooks-claude-code/src/config.ts:11] | 裸 event map 或 `{ hooks: … }` settings 包装；parse 期 `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PROJECT_DIR}` 替换；stdin 带尾换行；hook 进程可带 `CLAUDE_PROJECT_DIR` env |
| `@deepseek-ai/dsh-hooks-codex` | `hooks-codex` [E: packages/hooks/hooks-codex/src/index.ts:40] | 5 个：`CODEX_EVENTS` = `PreToolUse` `PostToolUse` `SessionStart` `UserPromptSubmit` `Stop` [E: packages/hooks/hooks-codex/src/config.ts:11] | 同样两种 JSON 外壳；**无**命令替换、**无** hook env、stdin **无**尾换行；`async: true` 进 skipped；payload 是 snake_case 且带 `model` |

两座桥都 `inject = ['shell']`，都导出 `apply` + `Config`，都 **没有** `export default`（Loader `unwrapExports` 才能保住 `name` / `inject`）。[E: packages/hooks/hooks-claude-code/src/index.ts:42] [E: packages/hooks/hooks-codex/src/index.ts:41] [E: packages/hooks/hooks-claude-code/tests/bridge.spec.ts:436] [E: packages/hooks/hooks-codex/tests/bridge.spec.ts:228]

它们**不是**：

- Claude / Codex 全量 HookEvent 运行时。parse 只扫各自那张封闭表；`Setup` / `Notification` / Codex 侧的 `SubagentStop` 这类键被丢掉，不进 `skipped`。[E: packages/hooks/hooks-claude-code/src/config.ts:86] [E: packages/hooks/hooks-codex/src/config.ts:50] [E: packages/hooks/hooks-codex/tests/config.spec.ts:11]
- 默认产品树里的一行。`dsh-base` insert 从 `id: timer` 到 `id: llm-deepseek`，没有 hooks 行；`dependencies` 闭包从 `cordis-plugin-hmr` 到 `dsh-agent-instructions`，不含 `@deepseek-ai/dsh-hooks-*` / `dsh-hook-protocol`。[E: packages/bundle/base/cordis.patch.yml:16] [E: packages/bundle/base/cordis.patch.yml:450] [E: packages/bundle/base/package.json:42] [E: packages/bundle/base/package.json:118] `dsh-web-app` / `dsh-headless` 的 `package.json` 同样没有这两包。四个 shipped `agent.cordis.yml` 也没有 `hooks-claude-code` / `hooks-codex` 行。
- shipped preset 里的 `tool-subagent-claude-code` / `tool-subagent-codex`。那两行是 **disabled 的子代理后端工具**（`@deepseek-ai/dsh-tool-subagent`，`provider: claude-code` / `codex`），跟 hook 文件桥不是同一个包。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:203] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:212]
- `ctx.hooks` 服务。`@deepseek-ai/dsh-hook-protocol` 只 re-export `matchesMatcher` / `runHook` / `mergeHookOutputs` / `appendHookInvoked` / `appendHookResult` / `createDetachedRuns` 等，没有 `name` / `inject` / `apply`。[E: packages/hooks/hook-protocol/src/index.ts:16] [E: packages/hooks/hook-protocol/src/index.ts:18] [E: packages/hooks/hook-protocol/package.json:2]

只跑 `type: 'command'`（缺 `type` 当 command）。Claude 把 `prompt` / `http` 记进 `skipped`；Codex 另外把 `async: true` 记进 `skipped`（不是后台跑）。[E: packages/hooks/hooks-claude-code/src/config.ts:98] [E: packages/hooks/hooks-codex/src/config.ts:65] [E: packages/hooks/hooks-codex/src/config.ts:67]

## 入口

两座桥坐在 **host 面**（进程级），不坐 agent-preset 面。要接到默认 `dsh web`，必须自己叠 overlay，并让 Loader 解析得到包名。

组合层序是：各 bundle 的 `cordis.patch.yml` → `$DSH_HOME/profiles/<name>/cordis.patch.yml` → `$DSH_HOME/cordis.patch.yml` → `--patch` 文件。[E: packages/boot/app-boot/src/profile.ts:39] [E: apps/cli/src/profile-boot.ts:124] [E: apps/cli/src/profile-boot.ts:125] [E: apps/cli/src/profile-boot.ts:126] [E: apps/cli/src/profile-boot.ts:127]

仓库里能核到的组合样例是 ACP example（不是 `dsh web` 默认树）：

```yaml
- id: hooks-claude-code
  name: '@deepseek-ai/dsh-hooks-claude-code'
  config:
    configPath: ./hooks.json

- id: hooks-codex
  name: '@deepseek-ai/dsh-hooks-codex'
  config:
    configPath: ./codex-hooks.json
```

[E: examples/acp-agent/cordis.yml:181] [E: examples/acp-agent/cordis.yml:184] [E: examples/acp-agent/cordis.yml:189] [E: examples/acp-agent/cordis.yml:192]

用户侧等价动作：

1. **让包可解析。** 两座桥都没有 `dsh.bundle.patch`，不是 profile bundle。`dsh plugin --profile web add @deepseek-ai/dsh-hooks-claude-code` 会把它装进 profile `dependencies`，并打「declares no dsh.bundle — installed as a plain dependency」警告，**不会**推进 `dsh.profile.bundles`。[E: apps/cli/src/plugin.ts:44] [E: apps/cli/src/plugin.ts:72] 仓库里为 overlay / 自定义 runtime 预留的 resolve 闭包在 `examples/package.json` 与 `python/sdk-runtime/package.json`。[E: examples/package.json:37] [E: python/sdk-runtime/package.json:40]
2. **insert 一行插件**到 profile / home / `--patch` 的 `cordis.patch.yml`（形状同 ACP example）。两座桥各用各的 json，不能共用一份文件。
3. **准备 hook 文件。** `parseClaudeCodeConfig` / `parseCodexConfig` 都接受裸 event map 或 `{ hooks: … }` 包装。[E: packages/hooks/hooks-claude-code/tests/config.spec.ts:16] [E: packages/hooks/hooks-codex/tests/config.spec.ts:38]
4. **`configPath` 在 load 时读一次**，相对路径相对 **进程启动 cwd**，不是每个 `session/new.cwd`。ACP e2e 把 `hooks.json` 写进 launch cwd 来选中它；hook **命令**仍在 session cwd 跑。[E: packages/hooks/hooks-claude-code/src/index.ts:104] [E: packages/hooks/hooks-codex/src/index.ts:88] [E: examples/acp-agent/tests/hooks.e2e.ts:43]

缺文件 / 非法 JSON / 支持事件上的非法 regex：`apply` warn 一句后 `return`，**零 listener**，loop 照跑。[E: packages/hooks/hooks-claude-code/src/index.ts:114] [E: packages/hooks/hooks-claude-code/tests/bridge.spec.ts:367] [E: packages/hooks/hooks-codex/src/index.ts:95] [E: packages/hooks/hooks-codex/tests/bridge.spec.ts:153]

`hook-protocol` **不要**单独 insert。桥 `import` 它即可。

## 关键字段

### `hooks-claude-code` Config

| 键 | 必填 | 默认 | 含义 |
|---|---|---|---|
| `configPath` | 是 | — | `hooks.json` 或带 `hooks` 键的 settings 文件 [E: packages/hooks/hooks-claude-code/src/index.ts:73] |
| `pluginRoot` | 否 | 不替换 | parse 期替换 `${CLAUDE_PLUGIN_ROOT}` [E: packages/hooks/hooks-claude-code/src/config.ts:59] |
| `projectDir` | 否 | 不替换 token；run 时 env 回退 session cwd | parse 期替换 `${CLAUDE_PROJECT_DIR}`；也是 hook 进程的 `CLAUDE_PROJECT_DIR` [E: packages/hooks/hooks-claude-code/src/config.ts:60] [E: packages/hooks/hooks-claude-code/src/index.ts:150] |
| `defaultTimeoutMs` | 否 | `DEFAULT_HOOK_TIMEOUT_MS` = `600_000` | 单条 hook 没写 `timeout`（秒）时的毫秒超时 [E: packages/hooks/hooks-claude-code/src/index.ts:76] [E: packages/hooks/hook-protocol/src/runner.ts:20] |
| `stderrSummaryMaxChars` | 否 | `500` | `hook/result` 里 stderr 摘要上限；必须是正整数，否则 load 抛错 [E: packages/hooks/hooks-claude-code/src/index.ts:77] [E: packages/hooks/hook-protocol/src/events.ts:53] [E: packages/hooks/hooks-claude-code/src/index.ts:99] |

`timeout` 在 json 里是秒，进 `CommandHook.timeoutSec`。[E: packages/hooks/hooks-claude-code/src/config.ts:105]

### `hooks-codex` Config

| 键 | 必填 | 默认 | 含义 |
|---|---|---|---|
| `configPath` | 是 | — | Codex `hooks.json` [E: packages/hooks/hooks-codex/src/index.ts:61] |
| `model` | 否 | `''` | 打进每条 stdin payload 的 `model` [E: packages/hooks/hooks-codex/src/index.ts:62] |
| `defaultTimeoutMs` | 否 | `600_000` | 同 Claude 桥 [E: packages/hooks/hooks-codex/src/index.ts:63] |
| `stderrSummaryMaxChars` | 否 | `500` | 同 Claude 桥；同样必须正整数 [E: packages/hooks/hooks-codex/src/index.ts:64] [E: packages/hooks/hooks-codex/src/index.ts:84] |

Codex 收 `timeout` 或别名 `timeoutSec`，不做 `${…}` 替换。[E: packages/hooks/hooks-codex/src/config.ts:70] [E: packages/hooks/hooks-codex/tests/config.spec.ts:22]

### Claude 事件 → Cordis（7 行，桥认的全部）

| hook 文件事件 | Cordis 点 | 模式 | matcher 主体 | 本桥 honoring |
|---|---|---|---|---|
| `SessionStart` | `agent/session-start` | emit（无 `next`）+ detached [E: packages/core/agent/src/runtime-types.ts:217] [E: packages/hooks/hooks-claude-code/src/index.ts:206] | `source`（如 `'startup'`） | 只 `agent.inject` context；不能 veto |
| `UserPromptSubmit` | `agent/pre-step` | waterfall [E: packages/core/agent/src/runtime-types.ts:231] [E: packages/hooks/hooks-claude-code/src/index.ts:219] | 无（parse 丢掉 matcher） [E: packages/hooks/hooks-claude-code/src/config.ts:109] | `deny` → `{ kind: 'reject' }`，**不** `next()`；否则 `await next()` 再叠 context [E: packages/hooks/hooks-claude-code/src/index.ts:223] [E: packages/hooks/hooks-claude-code/src/index.ts:228] |
| `PreToolUse` | `tools/pre-execute` | waterfall [E: packages/core/tools/src/index.ts:152] [E: packages/hooks/hooks-claude-code/src/index.ts:238] | `exec.name` | `deny` → `{ kind: 'deny' }`；`ask` → `{ kind: 'ask' }`（都不 `next()`）；其它 `return next()` [E: packages/hooks/hooks-claude-code/src/index.ts:241] [E: packages/hooks/hooks-claude-code/src/index.ts:242] [E: packages/hooks/hooks-claude-code/src/index.ts:243] |
| `PostToolUse` | `tools/post-execute` | waterfall [E: packages/core/tools/src/index.ts:175] [E: packages/hooks/hooks-claude-code/src/index.ts:247] | `exec.name` | 工具 **已经**跑完。`deny` → `{ kind: 'block' }`；否则 `await next()` 再叠 context [E: packages/hooks/hooks-claude-code/src/index.ts:251] [E: packages/hooks/hooks-claude-code/src/index.ts:256] |
| `Stop` | `agent/turn-stopping` | serial（无 `next`） [E: packages/core/agent/src/runtime-types.ts:278] [E: packages/hooks/hooks-claude-code/src/index.ts:270] | 无 | `deny` → `agent.steer(...)` **逼下一 step**，不是停 turn [E: packages/hooks/hooks-claude-code/src/index.ts:272] |
| `SubagentStart` | `subagent/start` | emit + detached [E: packages/subagent/subagent/src/index.ts:157] [E: packages/hooks/hooks-claude-code/src/index.ts:281] | 恒为 `'general-purpose'` [E: packages/hooks/hooks-claude-code/src/index.ts:304] | 可对 **子** Agent `inject` |
| `SubagentStop` | `subagent/end` | emit + detached [E: packages/subagent/subagent/src/index.ts:166] [E: packages/hooks/hooks-claude-code/src/index.ts:291] | 恒为 `'general-purpose'` | 只观察 |

`UserPromptSubmit` 在 `messages.length === 0` 时直接 `next()`（工具续步空批次不跑 hook）。[E: packages/hooks/hooks-claude-code/src/index.ts:220]

### Codex 事件 → Cordis（5 行，桥认的全部）

| hook 文件事件 | Cordis 点 | 模式 | matcher 主体 | 本桥 honoring |
|---|---|---|---|---|
| `SessionStart` | `agent/session-start` | emit + detached [E: packages/hooks/hooks-codex/src/index.ts:188] | `source` | 只 `inject`（`plainStdoutAsContext: true`）；不能 veto |
| `UserPromptSubmit` | `agent/pre-step` | waterfall [E: packages/hooks/hooks-codex/src/index.ts:199] | 无 | `deny` → `{ kind: 'reject' }`；否则 `await next()` 再叠 context [E: packages/hooks/hooks-codex/src/index.ts:210] [E: packages/hooks/hooks-codex/src/index.ts:215] |
| `PreToolUse` | `tools/pre-execute` | waterfall [E: packages/hooks/hooks-codex/src/index.ts:225] | `exec.name` | **只** `deny` → `{ kind: 'deny' }`；`ask` / `allow` 一律 `return next()` [E: packages/hooks/hooks-codex/src/index.ts:229] [E: packages/hooks/hooks-codex/src/index.ts:230] |
| `PostToolUse` | `tools/post-execute` | waterfall [E: packages/hooks/hooks-codex/src/index.ts:234] | `exec.name` | 工具已跑完。`deny` → `{ kind: 'block' }`；否则 `await next()` [E: packages/hooks/hooks-codex/src/index.ts:239] [E: packages/hooks/hooks-codex/src/index.ts:244] |
| `Stop` | `agent/turn-stopping` | serial [E: packages/hooks/hooks-codex/src/index.ts:260] | 无 | `deny` → `agent.steer(...)` 逼续跑；`stop_hook_active` 恒 `false` [E: packages/hooks/hooks-codex/src/index.ts:261] [E: packages/hooks/hooks-codex/src/index.ts:263] |

Codex **没有** `SubagentStart` / `SubagentStop`。写进 json 会被 `parseCodexConfig` 丢掉，loop 当没这回事。[E: packages/hooks/hooks-codex/tests/bridge.spec.ts:133] [E: packages/hooks/hooks-codex/tests/config.spec.ts:13]

### `updatedInput` / `systemMessage` / `continue:false`（跟 Claude 官方语义无关，以 DSH 源码为准）

| 字段 | Claude 桥 | Codex 桥 |
|---|---|---|
| `hookSpecificOutput.updatedInput` | `runHook` 会解析；桥 `logger.warn(… not yet honored (ignored))`，工具仍拿原始 `exec.arguments` [E: packages/hooks/hooks-claude-code/src/index.ts:176] [E: packages/hooks/hooks-claude-code/tests/coverage-cases.ts:129] | `runHook` 之后只检查 `systemMessage`，没有 `updatedInput` warn / rewrite [E: packages/hooks/hooks-codex/src/index.ts:161] [E: packages/hooks/hooks-codex/src/index.ts:162] |
| 顶层 `systemMessage` | warn「not yet surfaced」，**不**进模型请求 [E: packages/hooks/hooks-claude-code/src/index.ts:179] [E: packages/hooks/hooks-claude-code/tests/coverage-cases.ts:738] | 同样 warn、不进模型 [E: packages/hooks/hooks-codex/src/index.ts:162] [E: packages/hooks/hooks-codex/tests/coverage-cases.ts:604] |
| `{"continue":false}` | `hook/result.decision` 记 `'stop'`；工具照跑，turn `completed` [E: packages/hooks/hook-protocol/src/events.ts:99] [E: packages/hooks/hooks-claude-code/tests/coverage-cases.ts:432] [E: packages/hooks/hooks-claude-code/tests/coverage-cases.ts:435] | 同样只记账、不停 turn、不挡工具 [E: packages/hooks/hooks-codex/tests/coverage-cases.ts:410] [E: packages/hooks/hooks-codex/tests/coverage-cases.ts:411] |

`mergeHookOutputs` 会把第一次 `continue === false` 收成 `MergedHookOutcome.stop`；两座桥的 listener **都不读** `merged.stop`。[E: packages/hooks/hook-protocol/src/merge.ts:79]

会进模型的是 `additionalContext`（以及 Codex SessionStart / UserPromptSubmit 在 clean 非 JSON stdout 上的 `plainStdoutAsContext`），经 `inject` / pre-step `messages` / post-execute `additionalContexts`，来源戳是 `{ kind: 'plugin', plugin: 'hooks-claude-code' }` 或 `'hooks-codex'`。[E: packages/hooks/hooks-claude-code/src/index.ts:87] [E: packages/hooks/hooks-codex/src/index.ts:72]

Claude `PreToolUse` 的 `ask` 返回 `{ kind: 'ask' }`。叶子默认是 `{ kind: 'allow' }`；`serviceAsk` 在没有 `ctx.approval` 时 fail-closed 成 deny。[E: packages/hooks/hooks-claude-code/src/index.ts:242] [E: packages/core/tools/src/index.ts:1477] [E: packages/core/tools/src/index.ts:1694] [E: packages/hooks/hooks-claude-code/tests/bridge.spec.ts:228] Codex 同一缝上 **不**把 `ask` 映射成 `{ kind: 'ask' }`。[E: packages/hooks/hooks-codex/src/index.ts:230]

## 装配与门控

**默认树不装。** `dsh web` = `dsh-base` + `dsh-web-app`；`dsh --profile headless` = `dsh-base` + `dsh-headless`。这三份 bundle 的 patch / 依赖闭包都没有 hooks 行。`minimal` / `standard` / `code` / `cordis` 四份 shipped `agent.cordis.yml` 也没有。真挂点是用户 overlay 或 `examples/acp-agent/cordis.yml`。

**host 面、进程级。** 一份 `configPath` 对进程里所有 session 生效。相对路径相对启动 cwd；hook 命令的 cwd 是 `agent.session.header.cwd`。[E: packages/hooks/hooks-claude-code/src/index.ts:147] [E: packages/hooks/hooks-codex/src/index.ts:128]

**依赖 `ctx.shell`。** `inject = ['shell']`。`dsh-base` 已经用 `bash-sandbox` / `pwsh-sandbox` 提供 `ctx.shell`（按平台 disable 其一）。没有 shell 的瘦树 load 会因 inject 失败而挂不住桥。

**waterfall 必须 `next()`。** Cordis `Events.waterfall` 靠传入的 `next()` 才 `shift` 下一层；不调用 = 下游 listener 和内建叶子都不跑。[E: vendor/cordis/src/events.ts:238] 两座桥只在自己要否决时故意不 `next()`（prompt reject / Claude pre-tool deny\|ask / post-tool block / Codex pre-tool deny）。放行路径必须 `await next()`。`SessionStart` / `Stop` / Claude 的 `SubagentStart`/`SubagentStop` 不是 waterfall，没有 `next` 可漏。

**matcher 方言不同。** 运行时走 `matchesMatcher`（`hook-protocol`）。缺省 / `''` / `'*'` 两种 mode 都是 match-all。Claude 下纯 `[A-Za-z0-9_|]+` 是字面量精确交替（`'Bash'` 不打中 `'BashOutput'`）；Codex 全部非空 pattern 是未锚定正则（`'Bash'` **会**打中 `'BashOutput'`，精确匹配要写 `^Bash$`）。[E: packages/hooks/hooks-claude-code/src/index.ts:153] [E: packages/hooks/hooks-codex/src/index.ts:131] [E: packages/hooks/hook-protocol/src/matcher.ts:61] [E: packages/hooks/hook-protocol/tests/matcher.spec.ts:18] [E: packages/hooks/hook-protocol/tests/matcher.spec.ts:41] 支持事件上的非法 regex 废掉**整座桥**（连合法的 `UserPromptSubmit` 也不注册）。[E: packages/hooks/hooks-claude-code/tests/bridge.spec.ts:382] [E: packages/hooks/hooks-codex/tests/bridge.spec.ts:169] `UserPromptSubmit` / `Stop` 的 matcher 在校验前丢掉，非法 `[` 也不炸。[E: packages/hooks/hooks-claude-code/tests/config.spec.ts:80] [E: packages/hooks/hooks-codex/tests/config.spec.ts:75]

**Claude 子代理 matcher 不是真实 kind。** 主体写死 `general-purpose`。配置 `matcher: 'code-reviewer'` 的 SubagentStart **不会**因 DSH 子代理开火。[E: packages/hooks/hooks-claude-code/src/index.ts:304]

**exit 2 才 block。** 共享 `runHook` 永不抛；exit 127 / 信号死是非阻塞错误，工具继续。`hook/invoked` + `hook/result` 只在有 session 且 `opts.turn` 有值时写（`dialect: 'claude-code'` / `'codex'`）。SessionStart 是 detached，不写这对事件。

**卸纤维。** `ctx.effect` 的 disposer 调 `createDetachedRuns().drain()`，abort 仍在跑的 hook 进程。dispose 后 listener 不再挡 prompt。[E: packages/hooks/hooks-claude-code/src/index.ts:126] [E: packages/hooks/hooks-codex/src/index.ts:105] [E: packages/hooks/hooks-claude-code/tests/bridge.spec.ts:427]

## 跨包关系

- [`subsys.interaction.hooks-protocol`](../../subsystems/interaction/hooks-protocol.md)（`subsys.interaction.hooks-protocol`）：共享库。本页只点名 `runHook` / `matchesMatcher` / `mergeHookOutputs` / `appendHook*` / `createDetachedRuns`；matcher 细节、exit 解码、restrictive merge、detached drain 的权威在那一页。
- [`subsys.interaction.hooks-claude`](../../subsystems/interaction/hooks-claude.md)（`subsys.interaction.hooks-claude`）：Claude 桥控制流、payload 形状、`${CLAUDE_*}` 与 `ask` 映射。
- [`subsys.interaction.hooks-codex`](../../subsystems/interaction/hooks-codex.md)（`subsys.interaction.hooks-codex`）：Codex 五事件、regex-only、snake_case、只 honoring deny。
- [`spine.tool-call-anatomy`](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute` → 可选 `ask` → execute → `tools/post-execute`。Claude 桥的 `ask` 进这条缝；Codex 桥不进。
- [`spine.composition-boot`](../../spine/composition-boot.md)（`spine.composition-boot`）：`profile → bundle → --patch` 层序。两座桥是用户层 insert，不是 bundle。
- [`surface.cli.plugin`](../cli/plugin.md)（`surface.cli.plugin`）：`dsh plugin add` 只在包声明 `dsh.bundle.patch` 时入层；hooks 桥是普通依赖。

原生插件要拦同一批扩展点，应直接 `ctx.on` 那些点，不必经本桥，也不会留下 `hook/*` 记录。

## Sources

- packages/hooks/hooks-claude-code/src/index.ts
- packages/hooks/hooks-claude-code/src/config.ts
- packages/hooks/hooks-claude-code/package.json
- packages/hooks/hooks-claude-code/tests/bridge.spec.ts
- packages/hooks/hooks-claude-code/tests/config.spec.ts
- packages/hooks/hooks-claude-code/tests/coverage-cases.ts
- packages/hooks/hooks-codex/src/index.ts
- packages/hooks/hooks-codex/src/config.ts
- packages/hooks/hooks-codex/package.json
- packages/hooks/hooks-codex/tests/bridge.spec.ts
- packages/hooks/hooks-codex/tests/config.spec.ts
- packages/hooks/hooks-codex/tests/coverage-cases.ts
- packages/hooks/hook-protocol/src/index.ts
- packages/hooks/hook-protocol/src/runner.ts
- packages/hooks/hook-protocol/src/matcher.ts
- packages/hooks/hook-protocol/src/merge.ts
- packages/hooks/hook-protocol/src/events.ts
- packages/hooks/hook-protocol/package.json
- packages/hooks/hook-protocol/tests/matcher.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/package.json
- packages/bundle/headless/package.json
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/src/profile-boot.ts
- apps/cli/src/plugin.ts
- packages/boot/app-boot/src/profile.ts
- examples/acp-agent/cordis.yml
- examples/package.json
- examples/acp-agent/tests/hooks.e2e.ts
- python/sdk-runtime/package.json
- packages/core/agent/src/runtime-types.ts
- packages/core/tools/src/index.ts
- packages/subagent/subagent/src/index.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：工具 waterfall 与 `ask` fail-closed。
- [subsys.interaction.hooks-protocol](../../subsystems/interaction/hooks-protocol.md)（`subsys.interaction.hooks-protocol`）：两座桥共用的非插件执行器。
- [subsys.interaction.hooks-claude](../../subsystems/interaction/hooks-claude.md)（`subsys.interaction.hooks-claude`）：Claude 七事件桥的控制流。
- [subsys.interaction.hooks-codex](../../subsystems/interaction/hooks-codex.md)（`subsys.interaction.hooks-codex`）：Codex 五事件桥的控制流。
- [spine.composition-boot](../../spine/composition-boot.md)（`spine.composition-boot`）：`profile → bundle → --patch` 层序。
- [surface.cli.plugin](../cli/plugin.md)（`surface.cli.plugin`）：`dsh plugin add` 对无 `dsh.bundle.patch` 的包只当普通依赖。

---
id: ref.coding-agent.config-keys
title: 配置键完整目录(93)
kind: catalog
tier: T3
pkg: coding-agent
source:
 - packages/coding-agent/src/core/settings-manager.ts
 - packages/coding-agent/src/core/defaults.ts
 - packages/coding-agent/src/core/agent-session.ts
 - packages/coding-agent/src/core/model-config.ts
 - packages/coding-agent/src/core/sdk.ts
 - packages/coding-agent/src/extensions/codemode/index.ts
 - packages/coding-agent/src/extensions/codemode/tool.ts
 - packages/coding-agent/src/modes/interactive/interactive-mode.ts
 - packages/coding-agent/docs/settings.md
 - packages/coding-agent/test/settings-manager.test.ts
symbols:
 - Settings
 - CacheWarmingMode
 - TuiMode
 - FullscreenExitOutput
 - MermaidRenderingMode
 - CompactionModelOverride
 - CompactionSettings
 - RetrySettings
 - CodemodeSettings
 - CodemodeMode
 - QuietStartup
 - DEFAULT_TOOL_NAMES
 - PackageSource
evidence: explicit
status: verified
updated: 4c6fb7cfe8
related:
 - surface.config.settings
 - subsys.coding-agent.settings-manager
---

> `ref.coding-agent.config-keys` 是 pi coding-agent `settings.json` 键的逐实例目录:以 `Settings` / 嵌套 settings interfaces 为 schema ground truth,对照 runtime getter 默认值、`defaults.ts` 产品 fallback,以及 `docs/settings.md` 用户文档。`models.json` 只额外收录 Anthropic Messages `compat.allowedFallbackModels`。

## 能回答的问题

- `~/.pi/agent/settings.json` 和 `.pi/settings.json` 当前支持哪些 JSON key?
- 每个配置键的 TypeScript 类型、默认值和用户含义是什么?
- 哪些键是 global-only,哪些键可由项目设置覆盖?`defaultTools` 的 `+name`/`-name` 与普通 array 覆盖有何不同?
- `compaction`、`retry`、`terminal`、`images`、`markdown`、`codemode` 等嵌套对象有哪些 leaf key?
- `quietStartup: true` 与 `quietStartup: "header"` 分别隐藏哪些 startup 输出?
- `tuiMode` 的默认值是什么,旧名 `uiMode` 还认吗?`fullscreenWheelScrollLines` 控制什么?
- `codemode.mode` 与 `codemode.inlineBudget` 分别控制什么?
- `compaction.modelOverrides` 与 `retry.maxAgentDelayMs` 分别控制什么,和普通 `compaction.*` / `retry.provider.*` 如何区分?
- 旧配置键会迁移到哪些新键?

## Catalog 口径

全局配置文件位于 `~/.pi/agent/settings.json`,项目配置文件位于 `.pi/settings.json`,且项目设置覆盖全局设置 [E: packages/coding-agent/docs/settings.md:3] [E: packages/coding-agent/docs/settings.md:7] [E: packages/coding-agent/docs/settings.md:9]。`FileSettingsStorage` 把 global path 设为 `<agentDir>/settings.json`,project path 设为 `<cwd>/<CONFIG_DIR_NAME>/settings.json` [E: packages/coding-agent/src/core/settings-manager.ts:300] [E: packages/coding-agent/src/core/settings-manager.ts:301]。`SettingsManager` 构造时把 global 与 project settings 通过 `deepMergeSettings` 合并 [E: packages/coding-agent/src/core/settings-manager.ts:413]。

`deepMergeObjects` 对 nested object **递归**合并,primitive 与 array 由 override 整段覆盖 [E: packages/coding-agent/src/core/settings-manager.ts:205] [E: packages/coding-agent/src/core/settings-manager.ts:206] [E: packages/coding-agent/src/core/settings-manager.ts:207] [E: packages/coding-agent/src/core/settings-manager.ts:208]。`deepMergeSettings` 在通用 merge 之后对 `defaultTools` 做特例:`+name`/`-name` 全为 modifier 的 override 会 append 到继承列表,含纯名字的 override 则整段替换 [E: packages/coding-agent/src/core/settings-manager.ts:225] [E: packages/coding-agent/src/core/settings-manager.ts:228] [E: packages/coding-agent/src/core/settings-manager.ts:229] [E: packages/coding-agent/src/core/settings-manager.ts:252]。

本表把 `Settings` top-level 字段、嵌套 settings leaf 字段、`PackageSource` 对象形态字段,以及 models.json 的 `compat.allowedFallbackModels` 都作为可 grep 的配置实例列出 [E: packages/coding-agent/src/core/settings-manager.ts:133] [E: packages/coding-agent/src/core/settings-manager.ts:122] [E: packages/coding-agent/src/core/model-config.ts:170]。本轮重数:`Settings` **55** 个 top-level 字段(`lastChangelogVersion` 到 `fullscreenWheelScrollLines`,含 `deviceId`、`codemode`、`cacheWarming`)、**31** 个嵌套 leaf 字段(含 `codemode.mode` / `codemode.inlineBudget`)、**6** 个 `PackageSource` object 字段、**1** 个 models.json `compat.allowedFallbackModels`,catalog 口径是 **93** [E: packages/coding-agent/src/core/settings-manager.ts:134] [E: packages/coding-agent/src/core/settings-manager.ts:188] [I]。相对上一轮 88(=52+29+6+1),新增 5 个实例:`deviceId`、`codemode`、`fullscreenWheelScrollLines`、`codemode.mode`、`codemode.inlineBudget`。`CompactionModelOverride` 的 `reserveTokens`/`keepRecentTokens` 算 `compaction.modelOverrides` 值形态,不另占 catalog 行。`retry.provider` 只展开 3 个 leaf,不把 `provider` 对象本身再计一行。

`defaults.ts` 只导出 `DEFAULT_THINKING_LEVEL = "medium"` 与 `THINKING_LEVEL_OPTIONS` [E: packages/coding-agent/src/core/defaults.ts:3] [E: packages/coding-agent/src/core/defaults.ts:4]。内置工具底表 `DEFAULT_TOOL_NAMES` 在 `settings-manager.ts`,不是 `defaults.ts` [E: packages/coding-agent/src/core/settings-manager.ts:215]。

`compaction.modelOverrides` 的键是精确、区分大小写的 `"provider/modelId"`,不是 glob;`CompactionModelOverride` 只有 `reserveTokens` / `keepRecentTokens`,`enabled` 不能 per-model [E: packages/coding-agent/src/core/settings-manager.ts:18] [E: packages/coding-agent/src/core/settings-manager.ts:32] [E: packages/coding-agent/src/core/settings-manager.ts:939] [E: packages/coding-agent/src/core/settings-manager.ts:964] [E: packages/coding-agent/docs/settings.md:73]。`retry.maxAgentDelayMs` 默认 60000,与 `retry.provider.maxRetryDelayMs` 分开 [E: packages/coding-agent/src/core/settings-manager.ts:50] [E: packages/coding-agent/src/core/settings-manager.ts:1005] [E: packages/coding-agent/src/core/settings-manager.ts:1038]。

TUI markdown 的 LaTeX 渲染由 `@earendil-works/pi-tui` Markdown 组件的 `renderLatex` option 负责(`undefined`/非 `false` 即开),不是 `Settings` 键 [E: packages/tui/src/components/markdown.ts:228] [E: packages/tui/src/components/markdown.ts:518]。

## Top-level settings keys

| key | type | default / fallback | 含义与作用域 | 源码证据 |
| --- | --- | --- | --- | --- |
| `lastChangelogVersion` | `string` | unset | 记录已经展示过的 changelog version;由 manager 读写 global settings。`docs/settings.md` 不列此键。 | [E: packages/coding-agent/src/core/settings-manager.ts:134] [E: packages/coding-agent/src/core/settings-manager.ts:787] [E: packages/coding-agent/src/core/settings-manager.ts:791] |
| `defaultProvider` | `string` | unset | 默认 provider id;setter 写 global settings。 | [E: packages/coding-agent/src/core/settings-manager.ts:135] [E: packages/coding-agent/docs/settings.md:11] [E: packages/coding-agent/src/core/settings-manager.ts:802] [E: packages/coding-agent/src/core/settings-manager.ts:810] |
| `defaultModel` | `string` | unset | 默认 model id;setter 写 global settings。 | [E: packages/coding-agent/src/core/settings-manager.ts:136] [E: packages/coding-agent/docs/settings.md:12] [E: packages/coding-agent/src/core/settings-manager.ts:806] [E: packages/coding-agent/src/core/settings-manager.ts:816] |
| `defaultThinkingLevel` | `"off" \| "minimal" \| "low" \| "medium" \| "high" \| "xhigh" \| "max"` | setting 未配置时 getter 返回 unset;产品层 fallback 是 `DEFAULT_THINKING_LEVEL = "medium"`;docs 也写 `"medium"`。 | 默认 thinking level。可由 `/thinking` picker 的 Ctrl+S 写入。 | [E: packages/coding-agent/src/core/settings-manager.ts:137] [E: packages/coding-agent/src/core/settings-manager.ts:867] [E: packages/coding-agent/src/core/settings-manager.ts:871] [E: packages/coding-agent/src/core/defaults.ts:3] [E: packages/coding-agent/docs/settings.md:13] |
| `modelThinkingLevels` | `Record<string, ThinkingLevel>` | unset | 按 `"provider/modelId"` 覆盖该模型的启动 thinking level;可从 `/settings` → Default thinking level per model 配置。getter 用 `` `${provider}/${modelId}` `` 取值。 | [E: packages/coding-agent/src/core/settings-manager.ts:138] [E: packages/coding-agent/src/core/settings-manager.ts:877] [E: packages/coding-agent/src/core/settings-manager.ts:885] [E: packages/coding-agent/docs/settings.md:14] |
| `transport` | `TransportSetting` (`"sse" \| "websocket" \| "websocket-cached" \| "auto"`) | `"auto"` | provider transport 偏好。 | [E: packages/coding-agent/src/core/settings-manager.ts:114] [E: packages/coding-agent/src/core/settings-manager.ts:139] [E: packages/coding-agent/src/core/settings-manager.ts:904] |
| `steeringMode` | `"all" \| "one-at-a-time"` | `"one-at-a-time"` | steering messages 投递模式。 | [E: packages/coding-agent/src/core/settings-manager.ts:140] [E: packages/coding-agent/src/core/settings-manager.ts:830] |
| `followUpMode` | `"all" \| "one-at-a-time"` | `"one-at-a-time"` | follow-up messages 投递模式。 | [E: packages/coding-agent/src/core/settings-manager.ts:141] [E: packages/coding-agent/src/core/settings-manager.ts:840] |
| `theme` | `string` | docs: `"system"`; getter 未硬编码 default;含 `/` 的 automatic theme setting 不作为固定 theme 返回。 | TUI theme 名;`system` 从 terminal 外观派生颜色。 | [E: packages/coding-agent/src/core/settings-manager.ts:142] [E: packages/coding-agent/docs/settings.md:92] [E: packages/coding-agent/src/core/settings-manager.ts:850] [E: packages/coding-agent/src/core/settings-manager.ts:856] [E: packages/coding-agent/src/core/settings-manager.ts:858] |
| `compaction` | `CompactionSettings` object | `{ enabled: true, reserveTokens: 16384, keepRecentTokens: 20000 }` by getters; token 值可再被 `modelOverrides` 覆盖 | auto-compaction 复合配置;leaf key 见 Nested settings leaf keys 表。 | [E: packages/coding-agent/src/core/settings-manager.ts:28] [E: packages/coding-agent/src/core/settings-manager.ts:143] [E: packages/coding-agent/src/core/settings-manager.ts:964] |
| `branchSummary` | `BranchSummarySettings` object | `{ reserveTokens: 16384, skipPrompt: false }` by getter | `/tree` branch summary 复合配置;leaf key 见 Nested settings leaf keys 表。 | [E: packages/coding-agent/src/core/settings-manager.ts:35] [E: packages/coding-agent/src/core/settings-manager.ts:144] [E: packages/coding-agent/src/core/settings-manager.ts:976] |
| `retry` | `RetrySettings` object | `{ enabled: true, maxRetries: 3, baseDelayMs: 2000, maxAgentDelayMs: 60000 }`; provider max delay fallback `60000` | agent-level retry 与 provider-level retry 复合配置;leaf key 见 Nested settings leaf keys 表。 | [E: packages/coding-agent/src/core/settings-manager.ts:46] [E: packages/coding-agent/src/core/settings-manager.ts:145] [E: packages/coding-agent/src/core/settings-manager.ts:1000] [E: packages/coding-agent/src/core/settings-manager.ts:1034] |
| `hideThinkingBlock` | `boolean` | `false` | 隐藏 output 中的 thinking blocks。 | [E: packages/coding-agent/src/core/settings-manager.ts:146] [E: packages/coding-agent/src/core/settings-manager.ts:1046] [E: packages/coding-agent/docs/settings.md:17] |
| `showCacheMissNotices` | `boolean` | `false` | 在 transcript 中显示显著 prompt-cache miss 提示。 | [E: packages/coding-agent/src/core/settings-manager.ts:147] [E: packages/coding-agent/src/core/settings-manager.ts:1050] [E: packages/coding-agent/docs/settings.md:18] |
| `externalEditor` | `string` | `$VISUAL`, then `$EDITOR`, then `notepad` on Windows or `nano` elsewhere | Ctrl+G 外部编辑器命令;显式 setting 优先于环境变量。 | [E: packages/coding-agent/src/core/settings-manager.ts:148] [E: packages/coding-agent/src/core/settings-manager.ts:1054] [E: packages/coding-agent/src/core/settings-manager.ts:1059] [E: packages/coding-agent/src/core/settings-manager.ts:1063] [E: packages/coding-agent/docs/settings.md:31] |
| `shellPath` | `string` | unset | 自定义 shell path;getter 会 `normalizePath`,支持 leading `~`。 | [E: packages/coding-agent/src/core/settings-manager.ts:149] [E: packages/coding-agent/src/core/settings-manager.ts:1078] |
| `quietStartup` | `QuietStartup` (`boolean \| "header"`) | `false` | `true` 隐藏全部 startup 输出(含 header)。`"header"` 保留 startup header(logo / version / key hints),隐藏 model scope 行与 loaded-resource listing。getter 只接受 `true` 与 `"header"`,其余回落 `false`。`--verbose` 覆盖本设置。 | [E: packages/coding-agent/src/core/settings-manager.ts:112] [E: packages/coding-agent/src/core/settings-manager.ts:150] [E: packages/coding-agent/src/core/settings-manager.ts:1089] [E: packages/coding-agent/src/core/settings-manager.ts:1091] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1411] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1416] [E: packages/coding-agent/docs/settings.md:93] |
| `defaultProjectTrust` | `"ask" \| "always" \| "never"` | `"ask"` | **global-only** project trust fallback;getter 只读 `globalSettings`,invalid 回落 `"ask"`。 | [E: packages/coding-agent/src/core/settings-manager.ts:110] [E: packages/coding-agent/src/core/settings-manager.ts:151] [E: packages/coding-agent/src/core/settings-manager.ts:1100] [E: packages/coding-agent/src/core/settings-manager.ts:1102] [E: packages/coding-agent/docs/settings.md:34] |
| `shellCommandPrefix` | `string` | unset | 每个 bash command 前缀。 | [E: packages/coding-agent/src/core/settings-manager.ts:152] [E: packages/coding-agent/src/core/settings-manager.ts:1111] |
| `npmCommand` | `string[]` | unset | package lookup/install 的 argv-style npm command。 | [E: packages/coding-agent/src/core/settings-manager.ts:153] [E: packages/coding-agent/src/core/settings-manager.ts:1121] |
| `collapseChangelog` | `boolean` | `false` | 更新后展示 condensed changelog。 | [E: packages/coding-agent/src/core/settings-manager.ts:154] [E: packages/coding-agent/src/core/settings-manager.ts:1131] [E: packages/coding-agent/docs/settings.md:166] |
| `enableInstallTelemetry` | `boolean` | `true` | 控制 install/update 匿名 ping,不控制 update checks。 | [E: packages/coding-agent/src/core/settings-manager.ts:155] [E: packages/coding-agent/src/core/settings-manager.ts:1141] [E: packages/coding-agent/docs/settings.md:167] |
| `enableAnalytics` | `boolean` | `false` | opt-in analytics;启用时可生成 tracking id。 | [E: packages/coding-agent/src/core/settings-manager.ts:156] [E: packages/coding-agent/src/core/settings-manager.ts:1151] [E: packages/coding-agent/src/core/settings-manager.ts:1160] [E: packages/coding-agent/docs/settings.md:168] |
| `trackingId` | `string` | unset | analytics tracking identifier;首次 opt-in 且不存在时由 `randomUUID()` 生成。`docs/settings.md` 不列此键。 | [E: packages/coding-agent/src/core/settings-manager.ts:157] [E: packages/coding-agent/src/core/settings-manager.ts:1155] [E: packages/coding-agent/src/core/settings-manager.ts:1164] |
| `deviceId` | `string` | unset;首次 `getOrCreateDeviceId()` 时 `randomUUID()` 写入 **global** settings | 本安装的稳定 UUID,例如 OpenAI ChatGPT login 的 agent host ID。**global-only**:project `deviceId` 被忽略,避免 committed project settings 让每个 clone 共用同一 ID。bug report 会剥离 `deviceId` 与 `trackingId`。`docs/settings.md` 不列此键。 | [E: packages/coding-agent/src/core/settings-manager.ts:158] [E: packages/coding-agent/src/core/settings-manager.ts:1175] [E: packages/coding-agent/src/core/settings-manager.ts:1176] [E: packages/coding-agent/test/settings-manager.test.ts:114] [E: packages/coding-agent/src/core/bug-report.ts:62] |
| `packages` | `PackageSource[]` | `[]` | npm/git package sources;可为 string 或 object form。 | [E: packages/coding-agent/src/core/settings-manager.ts:122] [E: packages/coding-agent/src/core/settings-manager.ts:159] [E: packages/coding-agent/src/core/settings-manager.ts:1184] |
| `extensions` | `string[]` | `[]` | 本地 extension 文件或目录路径。 | [E: packages/coding-agent/src/core/settings-manager.ts:160] [E: packages/coding-agent/src/core/settings-manager.ts:1200] |
| `skills` | `string[]` | `[]` | 本地 skill 文件或目录路径。 | [E: packages/coding-agent/src/core/settings-manager.ts:161] [E: packages/coding-agent/src/core/settings-manager.ts:1216] |
| `prompts` | `string[]` | `[]` | 本地 prompt template 路径。 | [E: packages/coding-agent/src/core/settings-manager.ts:162] [E: packages/coding-agent/src/core/settings-manager.ts:1232] |
| `themes` | `string[]` | `[]` | 本地 theme 路径。 | [E: packages/coding-agent/src/core/settings-manager.ts:163] [E: packages/coding-agent/src/core/settings-manager.ts:1248] |
| `enableSkillCommands` | `boolean` | `true` | 是否把 skills 注册成 `/skill:name` commands。 | [E: packages/coding-agent/src/core/settings-manager.ts:164] [E: packages/coding-agent/src/core/settings-manager.ts:1264] |
| `terminal` | `TerminalSettings` object | see leaf defaults | terminal display 复合配置;leaf key 见 Nested settings leaf keys 表。 | [E: packages/coding-agent/src/core/settings-manager.ts:57] [E: packages/coding-agent/src/core/settings-manager.ts:165] |
| `images` | `ImageSettings` object | see leaf defaults | image sending/resize 复合配置;leaf key 见 Nested settings leaf keys 表。 | [E: packages/coding-agent/src/core/settings-manager.ts:67] [E: packages/coding-agent/src/core/settings-manager.ts:166] |
| `enabledModels` | `string[]` | unset | Ctrl+P model cycling patterns,格式同 `--models` CLI flag。 | [E: packages/coding-agent/src/core/settings-manager.ts:167] [E: packages/coding-agent/src/core/settings-manager.ts:1429] |
| `defaultTools` | `string[]` | unset; omitted 时产品用 `DEFAULT_TOOL_NAMES` = `["read", "bash", "edit", "write"]` | 启动 tool 选择。纯名字列表替换继承选择;列表**全是** `+name`/`-name` 时 append 到继承选择(project 可叠在 user 上)。同一列表里纯名字构成底表,然后按顺序 `+` 添加、`-` 删除。空数组关掉全部 built-in,但保留 extension/SDK custom tools。可用 built-in:`read`、`bash`、`powershell`、`edit`、`write`、`grep`、`find`、`ls`;也可点名默认 inactive 的 `codemode`、`tool_search`。`getDefaultTools()` 返回 resolved 列表;`/reload` 只激活新加入的,不关掉被移除或 session 内关掉的。`--tools` 不接受 `+name`/`-name`。 | [E: packages/coding-agent/src/core/settings-manager.ts:168] [E: packages/coding-agent/src/core/settings-manager.ts:215] [E: packages/coding-agent/src/core/settings-manager.ts:225] [E: packages/coding-agent/src/core/settings-manager.ts:236] [E: packages/coding-agent/src/core/settings-manager.ts:1434] [E: packages/coding-agent/src/core/sdk.ts:269] [E: packages/coding-agent/src/core/agent-session.ts:3618] [E: packages/coding-agent/test/settings-manager.test.ts:650] [E: packages/coding-agent/docs/settings.md:40] |
| `doubleEscapeAction` | `"fork" \| "tree" \| "none"` | `"tree"` | empty editor 下 double-escape 动作。 | [E: packages/coding-agent/src/core/settings-manager.ts:169] [E: packages/coding-agent/src/core/settings-manager.ts:1446] [E: packages/coding-agent/docs/settings.md:32] |
| `treeFilterMode` | `"default" \| "no-tools" \| "user-only" \| "labeled-only" \| "all"` | `"default"` | `/tree` 默认过滤模式;getter 会拒绝 invalid value。 | [E: packages/coding-agent/src/core/settings-manager.ts:170] [E: packages/coding-agent/src/core/settings-manager.ts:1456] [E: packages/coding-agent/docs/settings.md:33] |
| `thinkingBudgets` | `ThinkingBudgetsSettings` object | unset | thinking level token budget 复合配置;schema **只有** `minimal`/`low`/`medium`/`high`,没有 `xhigh`/`max`。leaf key 见 Nested settings leaf keys 表。 | [E: packages/coding-agent/src/core/settings-manager.ts:72] [E: packages/coding-agent/src/core/settings-manager.ts:171] [E: packages/coding-agent/src/core/settings-manager.ts:1274] [E: packages/coding-agent/docs/settings.md:15] |
| `editorPaddingX` | `number` | `0` | input editor 横向 padding;setter clamp 到 0-3。 | [E: packages/coding-agent/src/core/settings-manager.ts:172] [E: packages/coding-agent/src/core/settings-manager.ts:1478] [E: packages/coding-agent/src/core/settings-manager.ts:1482] [E: packages/coding-agent/docs/settings.md:99] |
| `outputPad` | `0 \| 1` | `1` | chat message 输出横向 padding;getter 把非 `0` 都当成 `1`。 | [E: packages/coding-agent/src/core/settings-manager.ts:173] [E: packages/coding-agent/src/core/settings-manager.ts:1488] [E: packages/coding-agent/src/core/settings-manager.ts:1492] [E: packages/coding-agent/docs/settings.md:100] |
| `autocompleteMaxVisible` | `number` | `5` | autocomplete dropdown 最大可见项;setter clamp 到 3-20。 | [E: packages/coding-agent/src/core/settings-manager.ts:174] [E: packages/coding-agent/src/core/settings-manager.ts:1498] [E: packages/coding-agent/src/core/settings-manager.ts:1502] [E: packages/coding-agent/docs/settings.md:101] |
| `showHardwareCursor` | `boolean` | `false`, unless `PI_HARDWARE_CURSOR=1` | TUI 定位 IME 时仍显示 terminal cursor。 | [E: packages/coding-agent/src/core/settings-manager.ts:175] [E: packages/coding-agent/src/core/settings-manager.ts:1468] [E: packages/coding-agent/docs/settings.md:102] |
| `markdown` | `MarkdownSettings` object | `{ codeBlockIndent: "  ", mermaid: "streaming" }` by getters | markdown rendering 复合配置;leaf key 见 Nested settings leaf keys 表。 | [E: packages/coding-agent/src/core/settings-manager.ts:85] [E: packages/coding-agent/src/core/settings-manager.ts:176] [E: packages/coding-agent/src/core/settings-manager.ts:1508] [E: packages/coding-agent/src/core/settings-manager.ts:1512] |
| `warnings` | `WarningSettings` object | `{}` plus leaf defaults by callers | warning toggles 复合配置;leaf key 见 Nested settings leaf keys 表。 | [E: packages/coding-agent/src/core/settings-manager.ts:90] [E: packages/coding-agent/src/core/settings-manager.ts:177] [E: packages/coding-agent/src/core/settings-manager.ts:1524] |
| `codemode` | `CodemodeSettings` object | `{ mode: "on", inlineBudget: 3000 }` by extension readers | 内置 `codemode` 工具的呈现/预算复合配置。`SettingsManager` **没有** dedicated getter;built-in extension 读 `pi.getSettings().codemode`。leaf key 见 Nested settings leaf keys 表。 | [E: packages/coding-agent/src/core/settings-manager.ts:103] [E: packages/coding-agent/src/core/settings-manager.ts:178] [E: packages/coding-agent/src/extensions/codemode/index.ts:22] [E: packages/coding-agent/src/extensions/codemode/tool.ts:154] [E: packages/coding-agent/docs/settings.md:41] |
| `sessionDir` | `string` | unset | session 文件目录;支持 absolute、relative 和 `~`;getter 会 normalize path。 | [E: packages/coding-agent/src/core/settings-manager.ts:179] [E: packages/coding-agent/src/core/settings-manager.ts:797] |
| `httpProxy` | `string` | unset | HTTP proxy URL,应用到 Pi-managed HTTP clients 的 `HTTP_PROXY`/`HTTPS_PROXY`。docs 标为 global-only;runtime 从 `getGlobalSettings().httpProxy` 读取,不走 merged getter。 | [E: packages/coding-agent/src/core/settings-manager.ts:180] [E: packages/coding-agent/src/main.ts:594] [E: packages/coding-agent/docs/settings.md:122] |
| `httpIdleTimeoutMs` | `number` | `300000` (`DEFAULT_HTTP_IDLE_TIMEOUT_MS`) | HTTP header/body idle timeout;`0` disables。 | [E: packages/coding-agent/src/core/settings-manager.ts:181] [E: packages/coding-agent/src/core/settings-manager.ts:1009] |
| `cacheWarming` | `"off" \| "streaming" \| "idle"` | `"streaming"` | Keep eligible provider prompt caches warm during active runs;`"idle"` 也在 agent runs 之间 warming。**global-only**(`getCacheWarmingMode()` 只读 `globalSettings`),因为每次 refresh 花钱。非法值回落 `"streaming"`。 | [E: packages/coding-agent/src/core/settings-manager.ts:82] [E: packages/coding-agent/src/core/settings-manager.ts:182] [E: packages/coding-agent/src/core/settings-manager.ts:1023] [E: packages/coding-agent/src/core/settings-manager.ts:1025] [E: packages/coding-agent/docs/settings.md:19] |
| `websocketConnectTimeoutMs` | `number` | docs: `15000`; getter 返回 parsed setting 或 unset;Codex WS `connectWebSocket` 在参数省略时用 `DEFAULT_WEBSOCKET_CONNECT_TIMEOUT_MS = 15_000` | WebSocket connect/open handshake timeout;`0` disables。 | [E: packages/coding-agent/src/core/settings-manager.ts:183] [E: packages/coding-agent/src/core/settings-manager.ts:1042] [E: packages/coding-agent/docs/settings.md:124] [E: packages/ai/src/api/openai-codex-responses.ts:57] [E: packages/ai/src/api/openai-codex-responses.ts:1079] |
| `tuiMode` | `"regular" \| "fullscreen"` | `"fullscreen"` | 交互 TUI mode。getter:只有 `"regular"` 为 regular,unset 与非法值都回落 `"fullscreen"`。旧名 `uiMode` 已不存在,也不迁移。`--tui-mode` 覆盖一次启动,`/settings` 修改立即生效。 | [E: packages/coding-agent/src/core/settings-manager.ts:54] [E: packages/coding-agent/src/core/settings-manager.ts:184] [E: packages/coding-agent/src/core/settings-manager.ts:1348] [E: packages/coding-agent/src/core/settings-manager.ts:1349] [E: packages/coding-agent/test/settings-manager.test.ts:481] [E: packages/coding-agent/test/settings-manager.test.ts:502] [E: packages/coding-agent/docs/settings.md:94] |
| `fullscreenExitOutput` | `"transcript" \| "resume-hint"` | `"transcript"` | fullscreen 退出输出:`transcript` 打印最终 transcript 与 resume hint,`resume-hint` 恢复上一屏并只打印 resume hint;regular TUI mode 无效果。 | [E: packages/coding-agent/src/core/settings-manager.ts:55] [E: packages/coding-agent/src/core/settings-manager.ts:185] [E: packages/coding-agent/src/core/settings-manager.ts:1358] [E: packages/coding-agent/docs/settings.md:95] |
| `fullscreenScrollbar` | `"auto" \| "always" \| "hidden"` | `"auto"` | fullscreen transcript scrollbar 策略;regular TUI mode 不使用。 | [E: packages/coding-agent/src/core/settings-manager.ts:186] [E: packages/coding-agent/src/core/settings-manager.ts:1368] [E: packages/coding-agent/src/core/settings-manager.ts:1370] [E: packages/coding-agent/docs/settings.md:96] |
| `fullscreenCopyOnSelect` | `boolean` | `true` | fullscreen 下选区自动复制。关闭后选区保持高亮,`Ctrl+X` 复制当前 selection;regular TUI mode 无效果。 | [E: packages/coding-agent/src/core/settings-manager.ts:187] [E: packages/coding-agent/src/core/settings-manager.ts:1379] [E: packages/coding-agent/docs/settings.md:97] |
| `fullscreenWheelScrollLines` | `WheelScrollLines` (`number \| "auto"`) | `"auto"` | fullscreen 每次滚轮事件移动的行数,1–100。非法值回落 `"auto"`;数字会被 floor 并 clamp 到 1–100。regular TUI mode 无效果。 | [E: packages/coding-agent/src/core/settings-manager.ts:188] [E: packages/coding-agent/src/core/settings-manager.ts:1389] [E: packages/coding-agent/src/core/settings-manager.ts:1391] [E: packages/coding-agent/test/settings-manager.test.ts:537] [E: packages/coding-agent/docs/settings.md:98] |

## Nested settings leaf keys

| dot key | type | default / fallback | 含义 | 源码证据 |
| --- | --- | --- | --- | --- |
| `compaction.enabled` | `boolean` | `true` | 启用 auto-compaction。**不能** per-model。 | [E: packages/coding-agent/src/core/settings-manager.ts:29] [E: packages/coding-agent/src/core/settings-manager.ts:914] [E: packages/coding-agent/docs/settings.md:70] |
| `compaction.reserveTokens` | `number` | `16384` | compaction 为 LLM response 保留 token。可被 matching `modelOverrides` 覆盖。 | [E: packages/coding-agent/src/core/settings-manager.ts:30] [E: packages/coding-agent/src/core/settings-manager.ts:24] [E: packages/coding-agent/src/core/settings-manager.ts:955] [E: packages/coding-agent/docs/settings.md:71] |
| `compaction.keepRecentTokens` | `number` | `20000` | compaction 保留 recent tokens 不总结。可被 matching `modelOverrides` 覆盖。 | [E: packages/coding-agent/src/core/settings-manager.ts:31] [E: packages/coding-agent/src/core/settings-manager.ts:25] [E: packages/coding-agent/src/core/settings-manager.ts:959] [E: packages/coding-agent/docs/settings.md:72] |
| `compaction.modelOverrides` | `Record<string, CompactionModelOverride>` | unset | 按精确 `"provider/modelId"` 覆盖该模型的 `reserveTokens` / `keepRecentTokens`。每字段独立回退:override → ordinary `compaction.*` → `16384` / `20000`。键区分大小写,不是 glob。`enabled` 不在 override 对象里。 | [E: packages/coding-agent/src/core/settings-manager.ts:18] [E: packages/coding-agent/src/core/settings-manager.ts:32] [E: packages/coding-agent/src/core/settings-manager.ts:939] [E: packages/coding-agent/src/core/settings-manager.ts:952] [E: packages/coding-agent/src/core/settings-manager.ts:964] [E: packages/coding-agent/docs/settings.md:73] |
| `branchSummary.reserveTokens` | `number` | `16384` | branch summarization token reserve。 | [E: packages/coding-agent/src/core/settings-manager.ts:36] [E: packages/coding-agent/src/core/settings-manager.ts:978] [E: packages/coding-agent/docs/settings.md:85] |
| `branchSummary.skipPrompt` | `boolean` | `false` | 设置为 `true` 时 `/tree` navigation 跳过 "Summarize branch?" prompt 并默认不生成 summary;默认 `false` 时不跳过 prompt。 | [E: packages/coding-agent/src/core/settings-manager.ts:37] [E: packages/coding-agent/src/core/settings-manager.ts:983] [E: packages/coding-agent/docs/settings.md:86] |
| `retry.enabled` | `boolean` | `true` | 启用 transient errors 的 agent-level retry。 | [E: packages/coding-agent/src/core/settings-manager.ts:47] [E: packages/coding-agent/src/core/settings-manager.ts:987] |
| `retry.maxRetries` | `number` | `3` | agent-level retry 最大次数。 | [E: packages/coding-agent/src/core/settings-manager.ts:48] [E: packages/coding-agent/src/core/settings-manager.ts:1003] |
| `retry.baseDelayMs` | `number` | `2000` | agent-level exponential backoff 基础 delay。 | [E: packages/coding-agent/src/core/settings-manager.ts:49] [E: packages/coding-agent/src/core/settings-manager.ts:1004] |
| `retry.maxAgentDelayMs` | `number` | `60000` | agent-level 指数退避 `min(base*2^(attempt-1), cap)` 的上限。与 `retry.provider.maxRetryDelayMs` **分开**。 | [E: packages/coding-agent/src/core/settings-manager.ts:50] [E: packages/coding-agent/src/core/settings-manager.ts:1005] |
| `retry.provider.timeoutMs` | `number` | getter unset; SDK `buildRequestOptions` 再回落到 `httpIdleTimeoutMs`(0 时用 `2147483647`);docs 写 default=`httpIdleTimeoutMs` | provider/SDK request timeout。 | [E: packages/coding-agent/src/core/settings-manager.ts:41] [E: packages/coding-agent/src/core/settings-manager.ts:1036] [E: packages/coding-agent/src/core/sdk.ts:326] [E: packages/coding-agent/docs/settings.md:129] |
| `retry.provider.maxRetries` | `number` | docs: `0`; getter returns unset if unset | provider/SDK retry attempts。 | [E: packages/coding-agent/src/core/settings-manager.ts:42] [E: packages/coding-agent/src/core/settings-manager.ts:1037] [E: packages/coding-agent/docs/settings.md:130] |
| `retry.provider.maxRetryDelayMs` | `number` | `60000` | server-requested retry delay 上限;`0` disables cap。 | [E: packages/coding-agent/src/core/settings-manager.ts:43] [E: packages/coding-agent/src/core/settings-manager.ts:1038] |
| `terminal.showImages` | `boolean` | `true` | terminal 支持时显示图片。 | [E: packages/coding-agent/src/core/settings-manager.ts:58] [E: packages/coding-agent/src/core/settings-manager.ts:1288] |
| `terminal.imageWidthCells` | `number` | `60`;invalid 时 fallback 60,最小 1 | terminal inline image 目标宽度 cell 数。 | [E: packages/coding-agent/src/core/settings-manager.ts:59] [E: packages/coding-agent/src/core/settings-manager.ts:1301] |
| `terminal.clearOnShrink` | `boolean` | `false`, unless `PI_CLEAR_ON_SHRINK=1` | 内容 shrink 时清空空行,可能闪烁。 | [E: packages/coding-agent/src/core/settings-manager.ts:60] [E: packages/coding-agent/src/core/settings-manager.ts:1318] |
| `terminal.showTerminalProgress` | `boolean` | `false` | OSC 9;4 terminal progress indicator。 | [E: packages/coding-agent/src/core/settings-manager.ts:61] [E: packages/coding-agent/src/core/settings-manager.ts:1335] |
| `terminal.hyperlinks` | `boolean \| "auto"` | `"auto"` | 覆盖 OSC 8 hyperlink 检测;`auto` 不覆盖,concrete `boolean` 才进入 `getTerminalCapabilityOverrides()`。 | [E: packages/coding-agent/src/core/settings-manager.ts:62] [E: packages/coding-agent/src/core/settings-manager.ts:1278] [E: packages/coding-agent/src/core/settings-manager.ts:1284] |
| `terminal.images` | `"kitty" \| "iterm2" \| "auto" \| false` | `"auto"` | 覆盖 image protocol;`kitty`/`iterm2` 写入 overrides,`false` 写成 `images: null`,`auto` 不覆盖。 | [E: packages/coding-agent/src/core/settings-manager.ts:63] [E: packages/coding-agent/src/core/settings-manager.ts:1280] [E: packages/coding-agent/src/core/settings-manager.ts:1282] |
| `terminal.trueColor` | `boolean \| "auto"` | `"auto"` | 覆盖 truecolor 检测;`auto` 不覆盖,concrete `boolean` 才进入 capability overrides。 | [E: packages/coding-agent/src/core/settings-manager.ts:64] [E: packages/coding-agent/src/core/settings-manager.ts:1283] |
| `images.autoResize` | `boolean` | `true` | 发送给 model 前把图片 resize 到最大 2000x2000。 | [E: packages/coding-agent/src/core/settings-manager.ts:68] [E: packages/coding-agent/src/core/settings-manager.ts:1403] |
| `images.blockImages` | `boolean` | `false` | 阻止图片发送给 LLM providers。 | [E: packages/coding-agent/src/core/settings-manager.ts:69] [E: packages/coding-agent/src/core/settings-manager.ts:1416] |
| `thinkingBudgets.minimal` | `number` | unset | `minimal` thinking level 自定义 token budget。 | [E: packages/coding-agent/src/core/settings-manager.ts:73] |
| `thinkingBudgets.low` | `number` | unset | `low` thinking level 自定义 token budget。 | [E: packages/coding-agent/src/core/settings-manager.ts:74] |
| `thinkingBudgets.medium` | `number` | unset | `medium` thinking level 自定义 token budget。 | [E: packages/coding-agent/src/core/settings-manager.ts:75] |
| `thinkingBudgets.high` | `number` | unset | `high` thinking level 自定义 token budget。没有 `thinkingBudgets.xhigh` / `thinkingBudgets.max`。 | [E: packages/coding-agent/src/core/settings-manager.ts:76] |
| `markdown.codeBlockIndent` | `string` | `"  "`(两空格) | code block indentation。 | [E: packages/coding-agent/src/core/settings-manager.ts:86] [E: packages/coding-agent/src/core/settings-manager.ts:1509] |
| `markdown.mermaid` | `"off" \| "final" \| "streaming"` | `"streaming"` | Mermaid 渲染模式;非法值回落 `"streaming"`。 | [E: packages/coding-agent/src/core/settings-manager.ts:79] [E: packages/coding-agent/src/core/settings-manager.ts:87] [E: packages/coding-agent/src/core/settings-manager.ts:1512] [E: packages/coding-agent/src/core/settings-manager.ts:1514] |
| `warnings.anthropicExtraUsage` | `boolean` | `true`(interface comment / docs;caller 把 `=== false` 当关闭,undefined 仍警告) | Anthropic subscription auth 可能产生 paid extra usage 时展示 warning。 | [E: packages/coding-agent/src/core/settings-manager.ts:91] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5198] [E: packages/coding-agent/docs/settings.md:169] |
| `codemode.mode` | `"on" \| "only"` | `"on"` | `codemode` 工具激活时如何呈现其它工具。`on`:declared tools 的 description 追加“从 script 调用”说明,codemode description 只列出未 declare 的工具。`only`:codemode description 列出 scripts 可调用的全部工具,active `direct` tools 不向模型 declare。extension reader:只有 `"only"` 为 only,其余(含 unset)为 `"on"`。 | [E: packages/coding-agent/src/core/settings-manager.ts:101] [E: packages/coding-agent/src/core/settings-manager.ts:105] [E: packages/coding-agent/src/extensions/codemode/index.ts:22] [E: packages/coding-agent/docs/settings.md:41] |
| `codemode.inlineBudget` | `number` | `3000` (`DEFAULT_CODEMODE_INLINE_BUDGET`;估计 token = characters / 4) | codemode description 花在 tool declarations 上的预算。放不下的工具留给 `searchTools()`;`0` 只列出 namespaces。reader 要求 finite `>= 0`,否则回落默认。 | [E: packages/coding-agent/src/core/settings-manager.ts:107] [E: packages/coding-agent/src/extensions/codemode/index.ts:27] [E: packages/coding-agent/src/extensions/codemode/tool.ts:154] [E: packages/coding-agent/docs/settings.md:42] |

## `packages[]` object form keys

`packages` 的 string form 表示从 package 加载所有资源;object form 允许按 resource kind 过滤。下面这些是 `PackageSource` object 内的键,不是 top-level settings keys [E: packages/coding-agent/src/core/settings-manager.ts:122]。

| object key | type | required | 含义 | 源码证据 |
| --- | --- | --- | --- | --- |
| `packages[].source` | `string` | yes | npm/git package source。 | [E: packages/coding-agent/src/core/settings-manager.ts:125] |
| `packages[].autoload` | `boolean` | `true` by omission | `false` 时从空资源集合开始,只应用显式 resource patterns。 | [E: packages/coding-agent/src/core/settings-manager.ts:126] |
| `packages[].extensions` | `string[]` | no | 只加载 package 内指定 extensions;空数组可过滤掉 extensions。 | [E: packages/coding-agent/src/core/settings-manager.ts:127] |
| `packages[].skills` | `string[]` | no | 只加载 package 内指定 skills。 | [E: packages/coding-agent/src/core/settings-manager.ts:128] |
| `packages[].prompts` | `string[]` | no | 只加载 package 内指定 prompts。 | [E: packages/coding-agent/src/core/settings-manager.ts:129] |
| `packages[].themes` | `string[]` | no | 只加载 package 内指定 themes。 | [E: packages/coding-agent/src/core/settings-manager.ts:130] |

## models.json `compat.allowedFallbackModels`

这不是 `settings.json` 键。它出现在 `models.json` 的 model definition / override 的 `compat` 对象里,schema 只挂在 Anthropic Messages compat 上:最多 3 项 `{ provider, model, cost }`,用于覆盖或关闭 Anthropic server-side fallback models。计入本 catalog 的第 93 个实例 [E: packages/coding-agent/src/core/model-config.ts:160] [E: packages/coding-agent/src/core/model-config.ts:170] [E: packages/coding-agent/src/core/model-config.ts:177] [E: packages/coding-agent/src/core/model-config.ts:203]。

| dot key | type | default | 含义 | 源码证据 |
| --- | --- | --- | --- | --- |
| `compat.allowedFallbackModels` | `{ provider: string; model: string; cost: ModelCost }[]`(max 3) | unset(provider 默认 fallback) | 覆盖或禁用 Anthropic server-side fallback 列表。空数组禁用 fallback。 | [E: packages/coding-agent/src/core/model-config.ts:170] [E: packages/coding-agent/src/core/model-config.ts:171] [E: packages/coding-agent/src/core/model-config.ts:177] |

## Legacy migrations

`queueMode` 会迁移为 `steeringMode` 当且仅当 settings 里还没有 `steeringMode` [E: packages/coding-agent/src/core/settings-manager.ts:506] [E: packages/coding-agent/src/core/settings-manager.ts:507] [E: packages/coding-agent/src/core/settings-manager.ts:508]。legacy boolean `websockets` 会迁移成 `transport: "websocket"` 或 `transport: "sse"` [E: packages/coding-agent/src/core/settings-manager.ts:512] [E: packages/coding-agent/src/core/settings-manager.ts:513] [E: packages/coding-agent/src/core/settings-manager.ts:514]。old object-form `skills` 可迁出 `enableSkillCommands` 与 `customDirectories` [E: packages/coding-agent/src/core/settings-manager.ts:528] [E: packages/coding-agent/src/core/settings-manager.ts:529] [E: packages/coding-agent/src/core/settings-manager.ts:532]。`retry.maxDelayMs` 会迁移到 `retry.provider.maxRetryDelayMs`,随后删除旧字段 [E: packages/coding-agent/src/core/settings-manager.ts:551] [E: packages/coding-agent/src/core/settings-manager.ts:556] [E: packages/coding-agent/src/core/settings-manager.ts:559]。`retry.maxDelayMs` **不会**迁到 `retry.maxAgentDelayMs` [I]。旧名 `uiMode` **不**迁移;`tuiMode` 缺省即为 `"fullscreen"` [E: packages/coding-agent/test/settings-manager.test.ts:502] [E: packages/coding-agent/src/core/settings-manager.ts:1349]。

## Sources

- `packages/coding-agent/src/core/settings-manager.ts`
- `packages/coding-agent/src/core/defaults.ts`
- `packages/coding-agent/src/core/agent-session.ts`
- `packages/coding-agent/src/core/model-config.ts`
- `packages/coding-agent/src/core/sdk.ts`
- `packages/coding-agent/src/extensions/codemode/index.ts`
- `packages/coding-agent/src/extensions/codemode/tool.ts`
- `packages/coding-agent/src/modes/interactive/interactive-mode.ts`
- `packages/coding-agent/docs/settings.md`
- `packages/coding-agent/test/settings-manager.test.ts`

## 相关

- [surface.config.settings](../surface/config/settings.md): 用户可见的 settings schema、scope、merge 与 trust 行为入口。
- [subsys.coding-agent.settings-manager](../subsystems/coding-agent/settings-manager.md): `SettingsManager` 的加载、迁移、合并、写回与错误处理实现。

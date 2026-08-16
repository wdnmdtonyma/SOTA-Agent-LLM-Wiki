---
id: ref.coding-agent.config-keys
title: 配置键完整目录(79)
kind: catalog
tier: T3
pkg: coding-agent
source:
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/core/defaults.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/docs/settings.md
symbols:
  - Settings
  - TuiMode
  - FullscreenExitOutput
  - MermaidRenderingMode
evidence: explicit
status: verified
updated: 086c32e745
related:
  - surface.config.settings
  - subsys.coding-agent.settings-manager
---

> `ref.coding-agent.config-keys` 是 pi coding-agent `settings.json` 键的逐实例目录:以 `Settings` / 嵌套 settings interfaces 为 schema ground truth,对照 runtime getter 默认值和 `docs/settings.md` 用户文档。

## 能回答的问题

- `~/.pi/agent/settings.json` 和 `.pi/settings.json` 当前支持哪些 JSON key?
- 每个配置键的 TypeScript 类型、默认值和用户含义是什么?
- 哪些键是全局设置语义,哪些键也可由项目设置覆盖?
- `compaction`、`retry`、`terminal`、`images`、`markdown` 等嵌套对象有哪些 leaf key?
- `defaultTools`、`tuiMode`、`fullscreenExitOutput`、`markdown.mermaid` 分别控制什么?
- 旧配置键会迁移到哪些新键?

## Catalog 口径

全局配置文件位于 `~/.pi/agent/settings.json`,项目配置文件位于 `.pi/settings.json`,且项目设置覆盖全局设置 [E: packages/coding-agent/docs/settings.md:3] [E: packages/coding-agent/docs/settings.md:7] [E: packages/coding-agent/docs/settings.md:8]。`SettingsManager` 构造时把 global 与 project settings 通过 `deepMergeSettings` 合并 [E: packages/coding-agent/src/core/settings-manager.ts:313];该 merge 对 nested object **递归**合并,primitive 与 array 由 override 覆盖 [E: packages/coding-agent/src/core/settings-manager.ts:146] [E: packages/coding-agent/src/core/settings-manager.ts:157] [E: packages/coding-agent/src/core/settings-manager.ts:158] [E: packages/coding-agent/src/core/settings-manager.ts:166]。

本表把 `Settings` top-level 字段、嵌套 settings leaf 字段、以及 `PackageSource` 对象形态字段都作为可 grep 的配置实例列出 [E: packages/coding-agent/src/core/settings-manager.ts:79] [E: packages/coding-agent/src/core/settings-manager.ts:90]。按当前 `Settings` 49 个 top-level 字段、24 个嵌套 leaf 字段和 6 个 `PackageSource` object 字段逐 key 展开，本页采用 79 个实例的 catalog 口径 [I]。

相对上一版 catalog:`uiMode` 已改名为 `tuiMode`;新增 `defaultTools`、`fullscreenExitOutput` 与 `markdown.mermaid`。TUI markdown 的 LaTeX 渲染由 `@earendil-works/pi-tui` 的 `renderLatex` / `renderLatex` option 负责,不是 `Settings` 键 [U]。

## Top-level settings keys

| key | type | default / fallback | 含义与作用域 | 源码证据 |
| --- | --- | --- | --- | --- |
| `lastChangelogVersion` | `string` | unset | 记录已经展示过的 changelog version;由 manager 读写 global settings。 | [E: packages/coding-agent/src/core/settings-manager.ts:91] [E: packages/coding-agent/src/core/settings-manager.ts:668] [E: packages/coding-agent/src/core/settings-manager.ts:672] |
| `defaultProvider` | `string` | unset | 默认 provider id;setter 写 global settings。 | [E: packages/coding-agent/src/core/settings-manager.ts:92] [E: packages/coding-agent/docs/settings.md:30] [E: packages/coding-agent/src/core/settings-manager.ts:683] [E: packages/coding-agent/src/core/settings-manager.ts:691] |
| `defaultModel` | `string` | unset | 默认 model id;setter 写 global settings。 | [E: packages/coding-agent/src/core/settings-manager.ts:93] [E: packages/coding-agent/docs/settings.md:31] [E: packages/coding-agent/src/core/settings-manager.ts:687] [E: packages/coding-agent/src/core/settings-manager.ts:697] |
| `defaultThinkingLevel` | `"off" \| "minimal" \| "low" \| "medium" \| "high" \| "xhigh" \| "max"` | setting 未配置时 getter 返回 unset;产品层通用 fallback 常量是 `"medium"` [I]。 | 默认 thinking level。docs 把 setting 默认显示为 `-`,示例使用 `"medium"`。 | [E: packages/coding-agent/src/core/settings-manager.ts:94] [E: packages/coding-agent/src/core/settings-manager.ts:748] [E: packages/coding-agent/src/core/settings-manager.ts:752] [E: packages/coding-agent/docs/settings.md:32] [E: packages/coding-agent/docs/settings.md:313] [E: packages/coding-agent/src/core/defaults.ts:3] |
| `transport` | `TransportSetting` | `"auto"` | provider transport 偏好,支持 docs 中列出的 `"sse"`、`"websocket"`、`"websocket-cached"`、`"auto"`。 | [E: packages/coding-agent/src/core/settings-manager.ts:95] [E: packages/coding-agent/src/core/settings-manager.ts:758] [E: packages/coding-agent/docs/settings.md:173] |
| `steeringMode` | `"all" \| "one-at-a-time"` | `"one-at-a-time"` | steering messages 投递模式。 | [E: packages/coding-agent/src/core/settings-manager.ts:96] [E: packages/coding-agent/src/core/settings-manager.ts:711] [E: packages/coding-agent/docs/settings.md:171] |
| `followUpMode` | `"all" \| "one-at-a-time"` | `"one-at-a-time"` | follow-up messages 投递模式。 | [E: packages/coding-agent/src/core/settings-manager.ts:97] [E: packages/coding-agent/src/core/settings-manager.ts:721] [E: packages/coding-agent/docs/settings.md:172] |
| `theme` | `string` | docs: `"dark"`; getter 未硬编码 default | TUI theme 名;含 `/` 的 automatic theme setting 不作为固定 theme 返回。 | [E: packages/coding-agent/src/core/settings-manager.ts:98] [E: packages/coding-agent/docs/settings.md:54] [E: packages/coding-agent/src/core/settings-manager.ts:731] [E: packages/coding-agent/src/core/settings-manager.ts:737] |
| `compaction` | `CompactionSettings` object | `{ enabled: true, reserveTokens: 16384, keepRecentTokens: 20000 }` by getters | auto-compaction 复合配置;leaf key 见下表。 | [E: packages/coding-agent/src/core/settings-manager.ts:12] [E: packages/coding-agent/src/core/settings-manager.ts:99] [E: packages/coding-agent/src/core/settings-manager.ts:789] |
| `branchSummary` | `BranchSummarySettings` object | `{ reserveTokens: 16384, skipPrompt: false }` by getter | `/tree` branch summary 复合配置;leaf key 见下表。 | [E: packages/coding-agent/src/core/settings-manager.ts:18] [E: packages/coding-agent/src/core/settings-manager.ts:100] [E: packages/coding-agent/src/core/settings-manager.ts:797] |
| `retry` | `RetrySettings` object | `{ enabled: true, maxRetries: 3, baseDelayMs: 2000 }`; provider max delay fallback `60000` | agent-level retry 与 provider-level retry 复合配置;leaf key 见下表。 | [E: packages/coding-agent/src/core/settings-manager.ts:23] [E: packages/coding-agent/src/core/settings-manager.ts:29] [E: packages/coding-agent/src/core/settings-manager.ts:101] [E: packages/coding-agent/src/core/settings-manager.ts:821] [E: packages/coding-agent/src/core/settings-manager.ts:842] |
| `hideThinkingBlock` | `boolean` | `false` | 隐藏 output 中的 thinking blocks。 | [E: packages/coding-agent/src/core/settings-manager.ts:102] [E: packages/coding-agent/src/core/settings-manager.ts:854] [E: packages/coding-agent/docs/settings.md:33] |
| `showCacheMissNotices` | `boolean` | `false` | 在 transcript 中显示显著 prompt-cache miss 提示。 | [E: packages/coding-agent/src/core/settings-manager.ts:103] [E: packages/coding-agent/src/core/settings-manager.ts:858] [E: packages/coding-agent/docs/settings.md:34] |
| `externalEditor` | `string` | `$VISUAL`, then `$EDITOR`, then `notepad` on Windows or `nano` elsewhere | Ctrl+G 外部编辑器命令;显式 setting 优先于环境变量。 | [E: packages/coding-agent/src/core/settings-manager.ts:104] [E: packages/coding-agent/src/core/settings-manager.ts:862] [E: packages/coding-agent/docs/settings.md:55] |
| `shellPath` | `string` | unset | 自定义 shell path。 | [E: packages/coding-agent/src/core/settings-manager.ts:105] [E: packages/coding-agent/src/core/settings-manager.ts:886] [E: packages/coding-agent/docs/settings.md:191] |
| `quietStartup` | `boolean` | `false` | 隐藏 startup header。 | [E: packages/coding-agent/src/core/settings-manager.ts:106] [E: packages/coding-agent/src/core/settings-manager.ts:897] [E: packages/coding-agent/docs/settings.md:56] |
| `defaultProjectTrust` | `"ask" \| "always" \| "never"` | `"ask"` | global-only project trust fallback;invalid 或 project-local 值不应改变 global getter 语义 [I]。 | [E: packages/coding-agent/src/core/settings-manager.ts:69] [E: packages/coding-agent/src/core/settings-manager.ts:107] [E: packages/coding-agent/src/core/settings-manager.ts:907] [E: packages/coding-agent/docs/settings.md:57] |
| `shellCommandPrefix` | `string` | unset | 每个 bash command 前缀。 | [E: packages/coding-agent/src/core/settings-manager.ts:108] [E: packages/coding-agent/src/core/settings-manager.ts:918] [E: packages/coding-agent/docs/settings.md:192] |
| `npmCommand` | `string[]` | unset | package lookup/install 的 argv-style npm command。 | [E: packages/coding-agent/src/core/settings-manager.ts:109] [E: packages/coding-agent/src/core/settings-manager.ts:928] [E: packages/coding-agent/docs/settings.md:193] |
| `collapseChangelog` | `boolean` | `false` | 更新后展示 condensed changelog。 | [E: packages/coding-agent/src/core/settings-manager.ts:110] [E: packages/coding-agent/src/core/settings-manager.ts:938] [E: packages/coding-agent/docs/settings.md:58] |
| `enableInstallTelemetry` | `boolean` | `true` | 控制 install/update 匿名 ping,不控制 update checks。 | [E: packages/coding-agent/src/core/settings-manager.ts:111] [E: packages/coding-agent/src/core/settings-manager.ts:948] [E: packages/coding-agent/docs/settings.md:59] [E: packages/coding-agent/docs/settings.md:82] |
| `enableAnalytics` | `boolean` | `false` | opt-in analytics;启用时可生成 tracking id。 | [E: packages/coding-agent/src/core/settings-manager.ts:112] [E: packages/coding-agent/src/core/settings-manager.ts:958] [E: packages/coding-agent/src/core/settings-manager.ts:967] [E: packages/coding-agent/docs/settings.md:60] |
| `trackingId` | `string` | unset | analytics tracking identifier;首次 opt-in 且不存在时由 `randomUUID()` 生成。 | [E: packages/coding-agent/src/core/settings-manager.ts:113] [E: packages/coding-agent/src/core/settings-manager.ts:962] [E: packages/coding-agent/src/core/settings-manager.ts:970] [E: packages/coding-agent/docs/settings.md:61] |
| `packages` | `PackageSource[]` | `[]` | npm/git package sources;可为 string 或 object form。 | [E: packages/coding-agent/src/core/settings-manager.ts:79] [E: packages/coding-agent/src/core/settings-manager.ts:114] [E: packages/coding-agent/src/core/settings-manager.ts:977] [E: packages/coding-agent/docs/settings.md:272] |
| `extensions` | `string[]` | `[]` | 本地 extension 文件或目录路径。 | [E: packages/coding-agent/src/core/settings-manager.ts:115] [E: packages/coding-agent/src/core/settings-manager.ts:993] [E: packages/coding-agent/docs/settings.md:273] |
| `skills` | `string[]` | `[]` | 本地 skill 文件或目录路径。 | [E: packages/coding-agent/src/core/settings-manager.ts:116] [E: packages/coding-agent/src/core/settings-manager.ts:1009] [E: packages/coding-agent/docs/settings.md:274] |
| `prompts` | `string[]` | `[]` | 本地 prompt template 路径。 | [E: packages/coding-agent/src/core/settings-manager.ts:117] [E: packages/coding-agent/src/core/settings-manager.ts:1025] [E: packages/coding-agent/docs/settings.md:275] |
| `themes` | `string[]` | `[]` | 本地 theme 路径。 | [E: packages/coding-agent/src/core/settings-manager.ts:118] [E: packages/coding-agent/src/core/settings-manager.ts:1041] [E: packages/coding-agent/docs/settings.md:276] |
| `enableSkillCommands` | `boolean` | `true` | 是否把 skills 注册成 `/skill:name` commands。 | [E: packages/coding-agent/src/core/settings-manager.ts:119] [E: packages/coding-agent/src/core/settings-manager.ts:1057] [E: packages/coding-agent/docs/settings.md:277] |
| `terminal` | `TerminalSettings` object | see leaf defaults | terminal display 复合配置;leaf key 见下表。 | [E: packages/coding-agent/src/core/settings-manager.ts:39] [E: packages/coding-agent/src/core/settings-manager.ts:120] |
| `images` | `ImageSettings` object | see leaf defaults | image sending/resize 复合配置;leaf key 见下表。 | [E: packages/coding-agent/src/core/settings-manager.ts:46] [E: packages/coding-agent/src/core/settings-manager.ts:121] |
| `enabledModels` | `string[]` | unset | Ctrl+P model cycling patterns,格式同 `--models` CLI flag。 | [E: packages/coding-agent/src/core/settings-manager.ts:122] [E: packages/coding-agent/src/core/settings-manager.ts:1188] [E: packages/coding-agent/docs/settings.md:249] |
| `defaultTools` | `string[]` | unset; omitted 时产品默认 `["read", "bash", "edit", "write"]` | 初始 built-in tool 选择;空数组关闭全部 built-in,但保留 extension/SDK custom tools。项目 array 整段替换全局 array。 | [E: packages/coding-agent/src/core/settings-manager.ts:123] [E: packages/coding-agent/src/core/settings-manager.ts:1192] [E: packages/coding-agent/src/core/agent-session.ts:2602] [E: packages/coding-agent/docs/settings.md:221] [E: packages/coding-agent/docs/settings.md:223] [E: packages/coding-agent/docs/settings.md:231] |
| `doubleEscapeAction` | `"fork" \| "tree" \| "none"` | `"tree"` | empty editor 下 double-escape 动作。 | [E: packages/coding-agent/src/core/settings-manager.ts:124] [E: packages/coding-agent/src/core/settings-manager.ts:1203] [E: packages/coding-agent/docs/settings.md:62] |
| `treeFilterMode` | `"default" \| "no-tools" \| "user-only" \| "labeled-only" \| "all"` | `"default"` | `/tree` 默认过滤模式;getter 会拒绝 invalid value。 | [E: packages/coding-agent/src/core/settings-manager.ts:125] [E: packages/coding-agent/src/core/settings-manager.ts:1213] [E: packages/coding-agent/docs/settings.md:63] |
| `thinkingBudgets` | `ThinkingBudgetsSettings` object | unset | thinking level token budget 复合配置;leaf key 见下表。 | [E: packages/coding-agent/src/core/settings-manager.ts:51] [E: packages/coding-agent/src/core/settings-manager.ts:126] [E: packages/coding-agent/src/core/settings-manager.ts:1067] [E: packages/coding-agent/docs/settings.md:35] |
| `editorPaddingX` | `number` | `0` | input editor 横向 padding;setter clamp 到 0-3。 | [E: packages/coding-agent/src/core/settings-manager.ts:127] [E: packages/coding-agent/src/core/settings-manager.ts:1235] [E: packages/coding-agent/src/core/settings-manager.ts:1239] [E: packages/coding-agent/docs/settings.md:64] |
| `outputPad` | `0 | 1` | `1` | chat message 输出横向 padding,覆盖 user message、assistant message 和 thinking;setter 只接受 0 或 1。 | [E: packages/coding-agent/src/core/settings-manager.ts:128] [E: packages/coding-agent/src/core/settings-manager.ts:1245] [E: packages/coding-agent/src/core/settings-manager.ts:1249] [E: packages/coding-agent/docs/settings.md:65] |
| `autocompleteMaxVisible` | `number` | `5` | autocomplete dropdown 最大可见项;setter clamp 到 3-20。 | [E: packages/coding-agent/src/core/settings-manager.ts:129] [E: packages/coding-agent/src/core/settings-manager.ts:1255] [E: packages/coding-agent/src/core/settings-manager.ts:1259] [E: packages/coding-agent/docs/settings.md:66] |
| `showHardwareCursor` | `boolean` | `false`, unless `PI_HARDWARE_CURSOR=1` | TUI 定位 IME 时仍显示 terminal cursor。 | [E: packages/coding-agent/src/core/settings-manager.ts:130] [E: packages/coding-agent/src/core/settings-manager.ts:1225] [E: packages/coding-agent/docs/settings.md:67] |
| `markdown` | `MarkdownSettings` object | `{ codeBlockIndent: "  ", mermaid: "streaming" }` by getters | markdown rendering 复合配置;leaf key 见下表。 | [E: packages/coding-agent/src/core/settings-manager.ts:60] [E: packages/coding-agent/src/core/settings-manager.ts:131] [E: packages/coding-agent/src/core/settings-manager.ts:1265] [E: packages/coding-agent/src/core/settings-manager.ts:1269] |
| `warnings` | `WarningSettings` object | `{}` plus leaf defaults by callers [I] | warning toggles 复合配置;leaf key 见下表。 | [E: packages/coding-agent/src/core/settings-manager.ts:65] [E: packages/coding-agent/src/core/settings-manager.ts:132] [E: packages/coding-agent/src/core/settings-manager.ts:1281] |
| `sessionDir` | `string` | unset | session 文件目录;支持 absolute、relative 和 `~`;getter 会 normalize path。 | [E: packages/coding-agent/src/core/settings-manager.ts:133] [E: packages/coding-agent/src/core/settings-manager.ts:678] [E: packages/coding-agent/docs/settings.md:237] [E: packages/coding-agent/docs/settings.md:243] |
| `httpProxy` | `string` | unset | HTTP proxy URL;docs 标为 global-only。 | [E: packages/coding-agent/src/core/settings-manager.ts:134] [E: packages/coding-agent/docs/settings.md:90] |
| `httpIdleTimeoutMs` | `number` | `300000` | HTTP header/body idle timeout;`0` disables。 | [E: packages/coding-agent/src/core/settings-manager.ts:135] [E: packages/coding-agent/src/core/settings-manager.ts:829] [E: packages/coding-agent/docs/settings.md:174] |
| `websocketConnectTimeoutMs` | `number` | docs: `15000`; getter itself returns parsed setting or unset [I] | WebSocket connect/open handshake timeout;`0` disables。 | [E: packages/coding-agent/src/core/settings-manager.ts:136] [E: packages/coding-agent/src/core/settings-manager.ts:850] [E: packages/coding-agent/docs/settings.md:175] |
| `tuiMode` | `"regular" \| "fullscreen"` | `"regular"` | 交互 TUI mode；`--tui-mode` 覆盖一次启动，`/settings` 修改立即生效。旧名 `uiMode` 已不存在。 | [E: packages/coding-agent/src/core/settings-manager.ts:137] [E: packages/coding-agent/src/core/settings-manager.ts:1131] [E: packages/coding-agent/src/core/settings-manager.ts:1132] [E: packages/coding-agent/docs/settings.md:68] |
| `fullscreenExitOutput` | `"transcript" \| "resume-hint"` | `"transcript"` | fullscreen 退出输出:`transcript` 打印最终 transcript 与 resume hint,`resume-hint` 恢复上一屏并只打印 resume hint;regular TUI mode 无效果。 | [E: packages/coding-agent/src/core/settings-manager.ts:37] [E: packages/coding-agent/src/core/settings-manager.ts:138] [E: packages/coding-agent/src/core/settings-manager.ts:1141] [E: packages/coding-agent/src/core/settings-manager.ts:1142] [E: packages/coding-agent/docs/settings.md:69] |
| `fullscreenScrollbar` | `"auto" \| "always" \| "hidden"` | `"auto"` | fullscreen transcript scrollbar 策略；regular TUI mode 不使用。 | [E: packages/coding-agent/src/core/settings-manager.ts:139] [E: packages/coding-agent/src/core/settings-manager.ts:1151] [E: packages/coding-agent/src/core/settings-manager.ts:1153] [E: packages/coding-agent/docs/settings.md:70] |

## Nested settings leaf keys

| dot key | type | default / fallback | 含义 | 源码证据 |
| --- | --- | --- | --- | --- |
| `compaction.enabled` | `boolean` | `true` | 启用 auto-compaction。 | [E: packages/coding-agent/src/core/settings-manager.ts:13] [E: packages/coding-agent/src/core/settings-manager.ts:768] [E: packages/coding-agent/docs/settings.md:116] |
| `compaction.reserveTokens` | `number` | `16384` | compaction 为 LLM response 保留 token。 | [E: packages/coding-agent/src/core/settings-manager.ts:14] [E: packages/coding-agent/src/core/settings-manager.ts:781] [E: packages/coding-agent/docs/settings.md:117] |
| `compaction.keepRecentTokens` | `number` | `20000` | compaction 保留 recent tokens 不总结。 | [E: packages/coding-agent/src/core/settings-manager.ts:15] [E: packages/coding-agent/src/core/settings-manager.ts:785] [E: packages/coding-agent/docs/settings.md:118] |
| `branchSummary.reserveTokens` | `number` | `16384` | branch summarization token reserve。 | [E: packages/coding-agent/src/core/settings-manager.ts:19] [E: packages/coding-agent/src/core/settings-manager.ts:797] [E: packages/coding-agent/docs/settings.md:134] |
| `branchSummary.skipPrompt` | `boolean` | `false` | 设置为 `true` 时 `/tree` navigation 跳过 "Summarize branch?" prompt 并默认不生成 summary;默认 `false` 时不跳过 prompt。 | [E: packages/coding-agent/src/core/settings-manager.ts:20] [E: packages/coding-agent/src/core/settings-manager.ts:804] [E: packages/coding-agent/docs/settings.md:135] |
| `retry.enabled` | `boolean` | `true` | 启用 transient errors 的 agent-level retry。 | [E: packages/coding-agent/src/core/settings-manager.ts:30] [E: packages/coding-agent/src/core/settings-manager.ts:808] [E: packages/coding-agent/docs/settings.md:141] |
| `retry.maxRetries` | `number` | `3` | agent-level retry 最大次数。 | [E: packages/coding-agent/src/core/settings-manager.ts:31] [E: packages/coding-agent/src/core/settings-manager.ts:821] [E: packages/coding-agent/docs/settings.md:142] |
| `retry.baseDelayMs` | `number` | `2000` | agent-level exponential backoff 基础 delay。 | [E: packages/coding-agent/src/core/settings-manager.ts:32] [E: packages/coding-agent/src/core/settings-manager.ts:821] [E: packages/coding-agent/docs/settings.md:143] |
| `retry.provider.timeoutMs` | `number` | SDK default / unset | provider/SDK request timeout。 | [E: packages/coding-agent/src/core/settings-manager.ts:24] [E: packages/coding-agent/src/core/settings-manager.ts:842] [E: packages/coding-agent/docs/settings.md:144] |
| `retry.provider.maxRetries` | `number` | docs: `0`; getter returns unset if unset [I] | provider/SDK retry attempts。 | [E: packages/coding-agent/src/core/settings-manager.ts:25] [E: packages/coding-agent/src/core/settings-manager.ts:842] [E: packages/coding-agent/docs/settings.md:145] |
| `retry.provider.maxRetryDelayMs` | `number` | `60000` | server-requested retry delay 上限;`0` disables cap。 | [E: packages/coding-agent/src/core/settings-manager.ts:26] [E: packages/coding-agent/src/core/settings-manager.ts:842] [E: packages/coding-agent/docs/settings.md:146] [E: packages/coding-agent/docs/settings.md:148] |
| `terminal.showImages` | `boolean` | `true` | terminal 支持时显示图片。 | [E: packages/coding-agent/src/core/settings-manager.ts:40] [E: packages/coding-agent/src/core/settings-manager.ts:1071] [E: packages/coding-agent/docs/settings.md:181] |
| `terminal.imageWidthCells` | `number` | `60`;invalid 时 fallback 60,最小 1 | terminal inline image 目标宽度 cell 数。 | [E: packages/coding-agent/src/core/settings-manager.ts:41] [E: packages/coding-agent/src/core/settings-manager.ts:1084] [E: packages/coding-agent/docs/settings.md:182] |
| `terminal.clearOnShrink` | `boolean` | `false`, unless `PI_CLEAR_ON_SHRINK=1` | 内容 shrink 时清空空行,可能闪烁。 | [E: packages/coding-agent/src/core/settings-manager.ts:42] [E: packages/coding-agent/src/core/settings-manager.ts:1101] [E: packages/coding-agent/docs/settings.md:183] |
| `terminal.showTerminalProgress` | `boolean` | `false` | OSC 9;4 terminal progress indicator;当前 `docs/settings.md` 未列此 key [U]。 | [E: packages/coding-agent/src/core/settings-manager.ts:43] [E: packages/coding-agent/src/core/settings-manager.ts:1118] |
| `images.autoResize` | `boolean` | `true` | 发送给 model 前把图片 resize 到最大 2000x2000。 | [E: packages/coding-agent/src/core/settings-manager.ts:47] [E: packages/coding-agent/src/core/settings-manager.ts:1162] [E: packages/coding-agent/docs/settings.md:184] |
| `images.blockImages` | `boolean` | `false` | 阻止图片发送给 LLM providers。 | [E: packages/coding-agent/src/core/settings-manager.ts:48] [E: packages/coding-agent/src/core/settings-manager.ts:1175] [E: packages/coding-agent/docs/settings.md:185] |
| `thinkingBudgets.minimal` | `number` | unset | `minimal` thinking level 自定义 token budget。 | [E: packages/coding-agent/src/core/settings-manager.ts:52] [E: packages/coding-agent/docs/settings.md:42] |
| `thinkingBudgets.low` | `number` | unset | `low` thinking level 自定义 token budget。 | [E: packages/coding-agent/src/core/settings-manager.ts:53] [E: packages/coding-agent/docs/settings.md:43] |
| `thinkingBudgets.medium` | `number` | unset | `medium` thinking level 自定义 token budget。 | [E: packages/coding-agent/src/core/settings-manager.ts:54] [E: packages/coding-agent/docs/settings.md:44] |
| `thinkingBudgets.high` | `number` | unset | `high` thinking level 自定义 token budget。 | [E: packages/coding-agent/src/core/settings-manager.ts:55] [E: packages/coding-agent/docs/settings.md:45] |
| `markdown.codeBlockIndent` | `string` | `"  "` | code block indentation。 | [E: packages/coding-agent/src/core/settings-manager.ts:61] [E: packages/coding-agent/src/core/settings-manager.ts:1265] [E: packages/coding-agent/docs/settings.md:261] |
| `markdown.mermaid` | `"off" \| "final" \| "streaming"` | `"streaming"` | Mermaid 渲染模式;非法值回落 `"streaming"`。 | [E: packages/coding-agent/src/core/settings-manager.ts:58] [E: packages/coding-agent/src/core/settings-manager.ts:62] [E: packages/coding-agent/src/core/settings-manager.ts:1269] [E: packages/coding-agent/src/core/settings-manager.ts:1271] [E: packages/coding-agent/docs/settings.md:262] |
| `warnings.anthropicExtraUsage` | `boolean` | `true` in docs/interface comment | Anthropic subscription auth 可能产生 paid extra usage 时展示 warning。 | [E: packages/coding-agent/src/core/settings-manager.ts:66] [E: packages/coding-agent/docs/settings.md:102] |

## `packages[]` object form keys

`packages` 的 string form 表示从 package 加载所有资源;object form 允许按 resource kind 过滤 [E: packages/coding-agent/docs/settings.md:283] [E: packages/coding-agent/docs/settings.md:291]。下面这些是 `PackageSource` object 内的键,不是 top-level settings keys [E: packages/coding-agent/src/core/settings-manager.ts:79]。

| object key | type | required | 含义 | 源码证据 |
| --- | --- | --- | --- | --- |
| `packages[].source` | `string` | yes | npm/git package source。 | [E: packages/coding-agent/src/core/settings-manager.ts:82] [E: packages/coding-agent/docs/settings.md:297] |
| `packages[].autoload` | `boolean` | `true` by omission | `false` 时从空资源集合开始，只应用显式 resource patterns。[I] | [E: packages/coding-agent/src/core/settings-manager.ts:83] |
| `packages[].extensions` | `string[]` | no | 只加载 package 内指定 extensions;空数组可过滤掉 extensions。 | [E: packages/coding-agent/src/core/settings-manager.ts:84] [E: packages/coding-agent/docs/settings.md:299] |
| `packages[].skills` | `string[]` | no | 只加载 package 内指定 skills。 | [E: packages/coding-agent/src/core/settings-manager.ts:85] [E: packages/coding-agent/docs/settings.md:298] |
| `packages[].prompts` | `string[]` | no | 只加载 package 内指定 prompts。 | [E: packages/coding-agent/src/core/settings-manager.ts:86] |
| `packages[].themes` | `string[]` | no | 只加载 package 内指定 themes。 | [E: packages/coding-agent/src/core/settings-manager.ts:87] |

## Legacy migrations

`queueMode` 会迁移为 `steeringMode` 当且仅当 settings 里还没有 `steeringMode` [E: packages/coding-agent/src/core/settings-manager.ts:391] [E: packages/coding-agent/src/core/settings-manager.ts:392] [E: packages/coding-agent/src/core/settings-manager.ts:393]。legacy boolean `websockets` 会迁移成 `transport: "websocket"` 或 `transport: "sse"` [E: packages/coding-agent/src/core/settings-manager.ts:397] [E: packages/coding-agent/src/core/settings-manager.ts:398] [E: packages/coding-agent/src/core/settings-manager.ts:399]。old object-form `skills` 可迁出 `enableSkillCommands` 与 `customDirectories` [E: packages/coding-agent/src/core/settings-manager.ts:404] [E: packages/coding-agent/src/core/settings-manager.ts:413] [E: packages/coding-agent/src/core/settings-manager.ts:416]。`retry.maxDelayMs` 会迁移到 `retry.provider.maxRetryDelayMs`,随后删除旧字段 [E: packages/coding-agent/src/core/settings-manager.ts:424] [E: packages/coding-agent/src/core/settings-manager.ts:436] [E: packages/coding-agent/src/core/settings-manager.ts:439] [E: packages/coding-agent/src/core/settings-manager.ts:444]。

## Sources

- `packages/coding-agent/src/core/settings-manager.ts`
- `packages/coding-agent/src/core/defaults.ts`
- `packages/coding-agent/src/core/agent-session.ts`
- `packages/coding-agent/docs/settings.md`

## 相关

- [surface.config.settings](../surface/config/settings.md): 用户可见的 settings schema、scope、merge 与 trust 行为入口。
- [subsys.coding-agent.settings-manager](../subsystems/coding-agent/settings-manager.md): `SettingsManager` 的加载、迁移、合并、写回与错误处理实现。

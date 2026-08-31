---
id: ref.coding-agent.config-keys
title: 配置键完整目录(84)
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
updated: 853a80d26c
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

全局配置文件位于 `~/.pi/agent/settings.json`,项目配置文件位于 `.pi/settings.json`,且项目设置覆盖全局设置 [E: packages/coding-agent/docs/settings.md:3] [E: packages/coding-agent/docs/settings.md:7] [E: packages/coding-agent/docs/settings.md:8]。`SettingsManager` 构造时把 global 与 project settings 通过 `deepMergeSettings` 合并 [E: packages/coding-agent/src/core/settings-manager.ts:333];该 merge 对 nested object **递归**合并,primitive 与 array 由 override 覆盖 [E: packages/coding-agent/src/core/settings-manager.ts:152] [E: packages/coding-agent/src/core/settings-manager.ts:163] [E: packages/coding-agent/src/core/settings-manager.ts:164] [E: packages/coding-agent/src/core/settings-manager.ts:172]。

本表把 `Settings` top-level 字段、嵌套 settings leaf 字段、以及 `PackageSource` 对象形态字段都作为可 grep 的配置实例列出 [E: packages/coding-agent/src/core/settings-manager.ts:83] [E: packages/coding-agent/src/core/settings-manager.ts:94]。按当前 `Settings` 51 个 top-level 字段、27 个嵌套 leaf 字段和 6 个 `PackageSource` object 字段逐 key 展开，本页采用 84 个实例的 catalog 口径 [I]。

相对上一版 catalog:补入已有但未入表的 `modelThinkingLevels`;新增 `fullscreenCopyOnSelect` 与 `terminal.hyperlinks` / `terminal.images` / `terminal.trueColor`。TUI markdown 的 LaTeX 渲染由 `@earendil-works/pi-tui` 的 `renderLatex` option 负责,不是 `Settings` 键 [U]。

## Top-level settings keys

| key | type | default / fallback | 含义与作用域 | 源码证据 |
| --- | --- | --- | --- | --- |
| `lastChangelogVersion` | `string` | unset | 记录已经展示过的 changelog version;由 manager 读写 global settings。 | [E: packages/coding-agent/src/core/settings-manager.ts:95] [E: packages/coding-agent/src/core/settings-manager.ts:702] [E: packages/coding-agent/src/core/settings-manager.ts:706] |
| `defaultProvider` | `string` | unset | 默认 provider id;setter 写 global settings。 | [E: packages/coding-agent/src/core/settings-manager.ts:96] [E: packages/coding-agent/docs/settings.md:30] [E: packages/coding-agent/src/core/settings-manager.ts:717] [E: packages/coding-agent/src/core/settings-manager.ts:725] |
| `defaultModel` | `string` | unset | 默认 model id;setter 写 global settings。 | [E: packages/coding-agent/src/core/settings-manager.ts:97] [E: packages/coding-agent/docs/settings.md:31] [E: packages/coding-agent/src/core/settings-manager.ts:721] [E: packages/coding-agent/src/core/settings-manager.ts:731] |
| `defaultThinkingLevel` | `"off" \| "minimal" \| "low" \| "medium" \| "high" \| "xhigh" \| "max"` | setting 未配置时 getter 返回 unset;产品层通用 fallback 常量是 `"medium"` [I]。 | 默认 thinking level。docs 把 setting 默认显示为 `-`,示例使用 `"medium"`。可由 `/thinking` picker 的 Ctrl+S 写入。 | [E: packages/coding-agent/src/core/settings-manager.ts:98] [E: packages/coding-agent/src/core/settings-manager.ts:782] [E: packages/coding-agent/src/core/settings-manager.ts:786] [E: packages/coding-agent/docs/settings.md:32] [E: packages/coding-agent/docs/settings.md:326] [E: packages/coding-agent/src/core/defaults.ts:3] |
| `modelThinkingLevels` | `Record<string, ThinkingLevel>` | unset | 按 `"provider/modelId"` 覆盖该模型的启动 thinking level;可从 `/settings` → Default thinking level per model 配置。getter 用 `` `${provider}/${modelId}` `` 取值。 | [E: packages/coding-agent/src/core/settings-manager.ts:99] [E: packages/coding-agent/src/core/settings-manager.ts:793] [E: packages/coding-agent/src/core/settings-manager.ts:797] [E: packages/coding-agent/docs/settings.md:33] |
| `transport` | `TransportSetting` | `"auto"` | provider transport 偏好,支持 docs 中列出的 `"sse"`、`"websocket"`、`"websocket-cached"`、`"auto"`。 | [E: packages/coding-agent/src/core/settings-manager.ts:100] [E: packages/coding-agent/src/core/settings-manager.ts:819] [E: packages/coding-agent/docs/settings.md:175] |
| `steeringMode` | `"all" \| "one-at-a-time"` | `"one-at-a-time"` | steering messages 投递模式。 | [E: packages/coding-agent/src/core/settings-manager.ts:101] [E: packages/coding-agent/src/core/settings-manager.ts:745] [E: packages/coding-agent/docs/settings.md:173] |
| `followUpMode` | `"all" \| "one-at-a-time"` | `"one-at-a-time"` | follow-up messages 投递模式。 | [E: packages/coding-agent/src/core/settings-manager.ts:102] [E: packages/coding-agent/src/core/settings-manager.ts:755] [E: packages/coding-agent/docs/settings.md:174] |
| `theme` | `string` | docs: `"dark"`; getter 未硬编码 default | TUI theme 名;含 `/` 的 automatic theme setting 不作为固定 theme 返回。 | [E: packages/coding-agent/src/core/settings-manager.ts:103] [E: packages/coding-agent/docs/settings.md:55] [E: packages/coding-agent/src/core/settings-manager.ts:765] [E: packages/coding-agent/src/core/settings-manager.ts:771] |
| `compaction` | `CompactionSettings` object | `{ enabled: true, reserveTokens: 16384, keepRecentTokens: 20000 }` by getters | auto-compaction 复合配置;leaf key 见下表。 | [E: packages/coding-agent/src/core/settings-manager.ts:13] [E: packages/coding-agent/src/core/settings-manager.ts:104] [E: packages/coding-agent/src/core/settings-manager.ts:850] |
| `branchSummary` | `BranchSummarySettings` object | `{ reserveTokens: 16384, skipPrompt: false }` by getter | `/tree` branch summary 复合配置;leaf key 见下表。 | [E: packages/coding-agent/src/core/settings-manager.ts:19] [E: packages/coding-agent/src/core/settings-manager.ts:105] [E: packages/coding-agent/src/core/settings-manager.ts:858] |
| `retry` | `RetrySettings` object | `{ enabled: true, maxRetries: 3, baseDelayMs: 2000 }`; provider max delay fallback `60000` | agent-level retry 与 provider-level retry 复合配置;leaf key 见下表。 | [E: packages/coding-agent/src/core/settings-manager.ts:24] [E: packages/coding-agent/src/core/settings-manager.ts:30] [E: packages/coding-agent/src/core/settings-manager.ts:106] [E: packages/coding-agent/src/core/settings-manager.ts:882] [E: packages/coding-agent/src/core/settings-manager.ts:903] |
| `hideThinkingBlock` | `boolean` | `false` | 隐藏 output 中的 thinking blocks。 | [E: packages/coding-agent/src/core/settings-manager.ts:107] [E: packages/coding-agent/src/core/settings-manager.ts:915] [E: packages/coding-agent/docs/settings.md:34] |
| `showCacheMissNotices` | `boolean` | `false` | 在 transcript 中显示显著 prompt-cache miss 提示。 | [E: packages/coding-agent/src/core/settings-manager.ts:108] [E: packages/coding-agent/src/core/settings-manager.ts:919] [E: packages/coding-agent/docs/settings.md:35] |
| `externalEditor` | `string` | `$VISUAL`, then `$EDITOR`, then `notepad` on Windows or `nano` elsewhere | Ctrl+G 外部编辑器命令;显式 setting 优先于环境变量。 | [E: packages/coding-agent/src/core/settings-manager.ts:109] [E: packages/coding-agent/src/core/settings-manager.ts:923] [E: packages/coding-agent/docs/settings.md:56] |
| `shellPath` | `string` | unset | 自定义 shell path。 | [E: packages/coding-agent/src/core/settings-manager.ts:110] [E: packages/coding-agent/src/core/settings-manager.ts:947] [E: packages/coding-agent/docs/settings.md:196] |
| `quietStartup` | `boolean` | `false` | 隐藏 startup header。 | [E: packages/coding-agent/src/core/settings-manager.ts:111] [E: packages/coding-agent/src/core/settings-manager.ts:958] [E: packages/coding-agent/docs/settings.md:57] |
| `defaultProjectTrust` | `"ask" \| "always" \| "never"` | `"ask"` | global-only project trust fallback;invalid 或 project-local 值不应改变 global getter 语义 [I]。 | [E: packages/coding-agent/src/core/settings-manager.ts:73] [E: packages/coding-agent/src/core/settings-manager.ts:112] [E: packages/coding-agent/src/core/settings-manager.ts:968] [E: packages/coding-agent/docs/settings.md:58] |
| `shellCommandPrefix` | `string` | unset | 每个 bash command 前缀。 | [E: packages/coding-agent/src/core/settings-manager.ts:113] [E: packages/coding-agent/src/core/settings-manager.ts:979] [E: packages/coding-agent/docs/settings.md:197] |
| `npmCommand` | `string[]` | unset | package lookup/install 的 argv-style npm command。 | [E: packages/coding-agent/src/core/settings-manager.ts:114] [E: packages/coding-agent/src/core/settings-manager.ts:989] [E: packages/coding-agent/docs/settings.md:198] |
| `collapseChangelog` | `boolean` | `false` | 更新后展示 condensed changelog。 | [E: packages/coding-agent/src/core/settings-manager.ts:115] [E: packages/coding-agent/src/core/settings-manager.ts:999] [E: packages/coding-agent/docs/settings.md:59] |
| `enableInstallTelemetry` | `boolean` | `true` | 控制 install/update 匿名 ping,不控制 update checks。 | [E: packages/coding-agent/src/core/settings-manager.ts:116] [E: packages/coding-agent/src/core/settings-manager.ts:1009] [E: packages/coding-agent/docs/settings.md:60] [E: packages/coding-agent/docs/settings.md:84] |
| `enableAnalytics` | `boolean` | `false` | opt-in analytics;启用时可生成 tracking id。 | [E: packages/coding-agent/src/core/settings-manager.ts:117] [E: packages/coding-agent/src/core/settings-manager.ts:1019] [E: packages/coding-agent/src/core/settings-manager.ts:1028] [E: packages/coding-agent/docs/settings.md:61] |
| `trackingId` | `string` | unset | analytics tracking identifier;首次 opt-in 且不存在时由 `randomUUID()` 生成。 | [E: packages/coding-agent/src/core/settings-manager.ts:118] [E: packages/coding-agent/src/core/settings-manager.ts:1023] [E: packages/coding-agent/src/core/settings-manager.ts:1031] [E: packages/coding-agent/docs/settings.md:62] |
| `packages` | `PackageSource[]` | `[]` | npm/git package sources;可为 string 或 object form。 | [E: packages/coding-agent/src/core/settings-manager.ts:83] [E: packages/coding-agent/src/core/settings-manager.ts:119] [E: packages/coding-agent/src/core/settings-manager.ts:1038] [E: packages/coding-agent/docs/settings.md:285] |
| `extensions` | `string[]` | `[]` | 本地 extension 文件或目录路径。 | [E: packages/coding-agent/src/core/settings-manager.ts:120] [E: packages/coding-agent/src/core/settings-manager.ts:1054] [E: packages/coding-agent/docs/settings.md:286] |
| `skills` | `string[]` | `[]` | 本地 skill 文件或目录路径。 | [E: packages/coding-agent/src/core/settings-manager.ts:121] [E: packages/coding-agent/src/core/settings-manager.ts:1070] [E: packages/coding-agent/docs/settings.md:287] |
| `prompts` | `string[]` | `[]` | 本地 prompt template 路径。 | [E: packages/coding-agent/src/core/settings-manager.ts:122] [E: packages/coding-agent/src/core/settings-manager.ts:1086] [E: packages/coding-agent/docs/settings.md:288] |
| `themes` | `string[]` | `[]` | 本地 theme 路径。 | [E: packages/coding-agent/src/core/settings-manager.ts:123] [E: packages/coding-agent/src/core/settings-manager.ts:1102] [E: packages/coding-agent/docs/settings.md:289] |
| `enableSkillCommands` | `boolean` | `true` | 是否把 skills 注册成 `/skill:name` commands。 | [E: packages/coding-agent/src/core/settings-manager.ts:124] [E: packages/coding-agent/src/core/settings-manager.ts:1118] [E: packages/coding-agent/docs/settings.md:290] |
| `terminal` | `TerminalSettings` object | see leaf defaults | terminal display 复合配置;leaf key 见下表。 | [E: packages/coding-agent/src/core/settings-manager.ts:40] [E: packages/coding-agent/src/core/settings-manager.ts:125] |
| `images` | `ImageSettings` object | see leaf defaults | image sending/resize 复合配置;leaf key 见下表。 | [E: packages/coding-agent/src/core/settings-manager.ts:50] [E: packages/coding-agent/src/core/settings-manager.ts:126] |
| `enabledModels` | `string[]` | unset | Ctrl+P model cycling patterns,格式同 `--models` CLI flag。 | [E: packages/coding-agent/src/core/settings-manager.ts:127] [E: packages/coding-agent/src/core/settings-manager.ts:1269] [E: packages/coding-agent/docs/settings.md:262] |
| `defaultTools` | `string[]` | unset; omitted 时产品默认 `["read", "bash", "edit", "write"]` | 初始 built-in tool 选择;可用 built-in 为 `read`、`bash`、`powershell`、`edit`、`write`、`grep`、`find`、`ls`。Windows 可用 `powershell` 替代或并列 `bash`。空数组关闭全部 built-in,但保留 extension/SDK custom tools。项目 array 整段替换全局 array。 | [E: packages/coding-agent/src/core/settings-manager.ts:128] [E: packages/coding-agent/src/core/settings-manager.ts:1273] [E: packages/coding-agent/src/core/agent-session.ts:2803] [E: packages/coding-agent/docs/settings.md:226] [E: packages/coding-agent/docs/settings.md:228] [E: packages/coding-agent/docs/settings.md:236] [E: packages/coding-agent/docs/settings.md:240] [E: packages/coding-agent/docs/settings.md:244] |
| `doubleEscapeAction` | `"fork" \| "tree" \| "none"` | `"tree"` | empty editor 下 double-escape 动作。 | [E: packages/coding-agent/src/core/settings-manager.ts:129] [E: packages/coding-agent/src/core/settings-manager.ts:1284] [E: packages/coding-agent/docs/settings.md:63] |
| `treeFilterMode` | `"default" \| "no-tools" \| "user-only" \| "labeled-only" \| "all"` | `"default"` | `/tree` 默认过滤模式;getter 会拒绝 invalid value。 | [E: packages/coding-agent/src/core/settings-manager.ts:130] [E: packages/coding-agent/src/core/settings-manager.ts:1294] [E: packages/coding-agent/docs/settings.md:64] |
| `thinkingBudgets` | `ThinkingBudgetsSettings` object | unset | thinking level token budget 复合配置;leaf key 见下表。 | [E: packages/coding-agent/src/core/settings-manager.ts:55] [E: packages/coding-agent/src/core/settings-manager.ts:131] [E: packages/coding-agent/src/core/settings-manager.ts:1128] [E: packages/coding-agent/docs/settings.md:36] |
| `editorPaddingX` | `number` | `0` | input editor 横向 padding;setter clamp 到 0-3。 | [E: packages/coding-agent/src/core/settings-manager.ts:132] [E: packages/coding-agent/src/core/settings-manager.ts:1316] [E: packages/coding-agent/src/core/settings-manager.ts:1320] [E: packages/coding-agent/docs/settings.md:65] |
| `outputPad` | `0 | 1` | `1` | chat message 输出横向 padding,覆盖 user message、assistant message 和 thinking;setter 只接受 0 或 1。 | [E: packages/coding-agent/src/core/settings-manager.ts:133] [E: packages/coding-agent/src/core/settings-manager.ts:1326] [E: packages/coding-agent/src/core/settings-manager.ts:1330] [E: packages/coding-agent/docs/settings.md:66] |
| `autocompleteMaxVisible` | `number` | `5` | autocomplete dropdown 最大可见项;setter clamp 到 3-20。 | [E: packages/coding-agent/src/core/settings-manager.ts:134] [E: packages/coding-agent/src/core/settings-manager.ts:1336] [E: packages/coding-agent/src/core/settings-manager.ts:1340] [E: packages/coding-agent/docs/settings.md:67] |
| `showHardwareCursor` | `boolean` | `false`, unless `PI_HARDWARE_CURSOR=1` | TUI 定位 IME 时仍显示 terminal cursor。 | [E: packages/coding-agent/src/core/settings-manager.ts:135] [E: packages/coding-agent/src/core/settings-manager.ts:1306] [E: packages/coding-agent/docs/settings.md:68] |
| `markdown` | `MarkdownSettings` object | `{ codeBlockIndent: "  ", mermaid: "streaming" }` by getters | markdown rendering 复合配置;leaf key 见下表。 | [E: packages/coding-agent/src/core/settings-manager.ts:64] [E: packages/coding-agent/src/core/settings-manager.ts:136] [E: packages/coding-agent/src/core/settings-manager.ts:1346] [E: packages/coding-agent/src/core/settings-manager.ts:1350] |
| `warnings` | `WarningSettings` object | `{}` plus leaf defaults by callers [I] | warning toggles 复合配置;leaf key 见下表。 | [E: packages/coding-agent/src/core/settings-manager.ts:69] [E: packages/coding-agent/src/core/settings-manager.ts:137] [E: packages/coding-agent/src/core/settings-manager.ts:1362] |
| `sessionDir` | `string` | unset | session 文件目录;支持 absolute、relative 和 `~`;getter 会 normalize path。 | [E: packages/coding-agent/src/core/settings-manager.ts:138] [E: packages/coding-agent/src/core/settings-manager.ts:712] [E: packages/coding-agent/docs/settings.md:250] [E: packages/coding-agent/docs/settings.md:256] |
| `httpProxy` | `string` | unset | HTTP proxy URL;docs 标为 global-only。 | [E: packages/coding-agent/src/core/settings-manager.ts:139] [E: packages/coding-agent/docs/settings.md:92] |
| `httpIdleTimeoutMs` | `number` | `300000` | HTTP header/body idle timeout;`0` disables。 | [E: packages/coding-agent/src/core/settings-manager.ts:140] [E: packages/coding-agent/src/core/settings-manager.ts:890] [E: packages/coding-agent/docs/settings.md:176] |
| `websocketConnectTimeoutMs` | `number` | docs: `15000`; getter itself returns parsed setting or unset [I] | WebSocket connect/open handshake timeout;`0` disables。 | [E: packages/coding-agent/src/core/settings-manager.ts:141] [E: packages/coding-agent/src/core/settings-manager.ts:911] [E: packages/coding-agent/docs/settings.md:177] |
| `tuiMode` | `"regular" \| "fullscreen"` | `"regular"` | 交互 TUI mode；`--tui-mode` 覆盖一次启动，`/settings` 修改立即生效。旧名 `uiMode` 已不存在。 | [E: packages/coding-agent/src/core/settings-manager.ts:142] [E: packages/coding-agent/src/core/settings-manager.ts:1202] [E: packages/coding-agent/src/core/settings-manager.ts:1203] [E: packages/coding-agent/docs/settings.md:69] |
| `fullscreenExitOutput` | `"transcript" \| "resume-hint"` | `"transcript"` | fullscreen 退出输出:`transcript` 打印最终 transcript 与 resume hint,`resume-hint` 恢复上一屏并只打印 resume hint;regular TUI mode 无效果。 | [E: packages/coding-agent/src/core/settings-manager.ts:38] [E: packages/coding-agent/src/core/settings-manager.ts:143] [E: packages/coding-agent/src/core/settings-manager.ts:1212] [E: packages/coding-agent/src/core/settings-manager.ts:1213] [E: packages/coding-agent/docs/settings.md:70] |
| `fullscreenScrollbar` | `"auto" \| "always" \| "hidden"` | `"auto"` | fullscreen transcript scrollbar 策略；regular TUI mode 不使用。 | [E: packages/coding-agent/src/core/settings-manager.ts:144] [E: packages/coding-agent/src/core/settings-manager.ts:1222] [E: packages/coding-agent/src/core/settings-manager.ts:1224] [E: packages/coding-agent/docs/settings.md:71] |
| `fullscreenCopyOnSelect` | `boolean` | `true` | fullscreen 下选区自动复制。关闭后选区保持高亮,`Ctrl+X` 复制当前 selection;regular TUI mode 无效果。 | [E: packages/coding-agent/src/core/settings-manager.ts:145] [E: packages/coding-agent/src/core/settings-manager.ts:1233] [E: packages/coding-agent/src/core/settings-manager.ts:1234] [E: packages/coding-agent/docs/settings.md:72] |

## Nested settings leaf keys

| dot key | type | default / fallback | 含义 | 源码证据 |
| --- | --- | --- | --- | --- |
| `compaction.enabled` | `boolean` | `true` | 启用 auto-compaction。 | [E: packages/coding-agent/src/core/settings-manager.ts:14] [E: packages/coding-agent/src/core/settings-manager.ts:829] [E: packages/coding-agent/docs/settings.md:118] |
| `compaction.reserveTokens` | `number` | `16384` | compaction 为 LLM response 保留 token。 | [E: packages/coding-agent/src/core/settings-manager.ts:15] [E: packages/coding-agent/src/core/settings-manager.ts:842] [E: packages/coding-agent/docs/settings.md:119] |
| `compaction.keepRecentTokens` | `number` | `20000` | compaction 保留 recent tokens 不总结。 | [E: packages/coding-agent/src/core/settings-manager.ts:16] [E: packages/coding-agent/src/core/settings-manager.ts:846] [E: packages/coding-agent/docs/settings.md:120] |
| `branchSummary.reserveTokens` | `number` | `16384` | branch summarization token reserve。 | [E: packages/coding-agent/src/core/settings-manager.ts:20] [E: packages/coding-agent/src/core/settings-manager.ts:858] [E: packages/coding-agent/docs/settings.md:136] |
| `branchSummary.skipPrompt` | `boolean` | `false` | 设置为 `true` 时 `/tree` navigation 跳过 "Summarize branch?" prompt 并默认不生成 summary;默认 `false` 时不跳过 prompt。 | [E: packages/coding-agent/src/core/settings-manager.ts:21] [E: packages/coding-agent/src/core/settings-manager.ts:865] [E: packages/coding-agent/docs/settings.md:137] |
| `retry.enabled` | `boolean` | `true` | 启用 transient errors 的 agent-level retry。 | [E: packages/coding-agent/src/core/settings-manager.ts:31] [E: packages/coding-agent/src/core/settings-manager.ts:869] [E: packages/coding-agent/docs/settings.md:143] |
| `retry.maxRetries` | `number` | `3` | agent-level retry 最大次数。 | [E: packages/coding-agent/src/core/settings-manager.ts:32] [E: packages/coding-agent/src/core/settings-manager.ts:882] [E: packages/coding-agent/docs/settings.md:144] |
| `retry.baseDelayMs` | `number` | `2000` | agent-level exponential backoff 基础 delay。 | [E: packages/coding-agent/src/core/settings-manager.ts:33] [E: packages/coding-agent/src/core/settings-manager.ts:882] [E: packages/coding-agent/docs/settings.md:145] |
| `retry.provider.timeoutMs` | `number` | SDK default / unset | provider/SDK request timeout。 | [E: packages/coding-agent/src/core/settings-manager.ts:25] [E: packages/coding-agent/src/core/settings-manager.ts:903] [E: packages/coding-agent/docs/settings.md:146] |
| `retry.provider.maxRetries` | `number` | docs: `0`; getter returns unset if unset [I] | provider/SDK retry attempts。 | [E: packages/coding-agent/src/core/settings-manager.ts:26] [E: packages/coding-agent/src/core/settings-manager.ts:903] [E: packages/coding-agent/docs/settings.md:147] |
| `retry.provider.maxRetryDelayMs` | `number` | `60000` | server-requested retry delay 上限;`0` disables cap。 | [E: packages/coding-agent/src/core/settings-manager.ts:27] [E: packages/coding-agent/src/core/settings-manager.ts:903] [E: packages/coding-agent/docs/settings.md:148] [E: packages/coding-agent/docs/settings.md:150] |
| `terminal.showImages` | `boolean` | `true` | terminal 支持时显示图片。 | [E: packages/coding-agent/src/core/settings-manager.ts:41] [E: packages/coding-agent/src/core/settings-manager.ts:1142] [E: packages/coding-agent/docs/settings.md:183] |
| `terminal.imageWidthCells` | `number` | `60`;invalid 时 fallback 60,最小 1 | terminal inline image 目标宽度 cell 数。 | [E: packages/coding-agent/src/core/settings-manager.ts:42] [E: packages/coding-agent/src/core/settings-manager.ts:1155] [E: packages/coding-agent/docs/settings.md:184] |
| `terminal.clearOnShrink` | `boolean` | `false`, unless `PI_CLEAR_ON_SHRINK=1` | 内容 shrink 时清空空行,可能闪烁。 | [E: packages/coding-agent/src/core/settings-manager.ts:43] [E: packages/coding-agent/src/core/settings-manager.ts:1172] [E: packages/coding-agent/docs/settings.md:185] |
| `terminal.showTerminalProgress` | `boolean` | `false` | OSC 9;4 terminal progress indicator;当前 `docs/settings.md` 未列此 key [U]。 | [E: packages/coding-agent/src/core/settings-manager.ts:44] [E: packages/coding-agent/src/core/settings-manager.ts:1189] |
| `terminal.hyperlinks` | `boolean \| "auto"` | `"auto"` | 覆盖 OSC 8 hyperlink 检测;`auto` 不覆盖,concrete `boolean` 才进入 `getTerminalCapabilityOverrides()`。 | [E: packages/coding-agent/src/core/settings-manager.ts:45] [E: packages/coding-agent/src/core/settings-manager.ts:1132] [E: packages/coding-agent/src/core/settings-manager.ts:1138] [E: packages/coding-agent/docs/settings.md:186] |
| `terminal.images` | `"kitty" \| "iterm2" \| "auto" \| false` | `"auto"` | 覆盖 image protocol;`kitty`/`iterm2` 写入 overrides,`false` 写成 `images: null`,`auto` 不覆盖。 | [E: packages/coding-agent/src/core/settings-manager.ts:46] [E: packages/coding-agent/src/core/settings-manager.ts:1134] [E: packages/coding-agent/src/core/settings-manager.ts:1136] [E: packages/coding-agent/docs/settings.md:187] |
| `terminal.trueColor` | `boolean \| "auto"` | `"auto"` | 覆盖 truecolor 检测;`auto` 不覆盖,concrete `boolean` 才进入 capability overrides。 | [E: packages/coding-agent/src/core/settings-manager.ts:47] [E: packages/coding-agent/src/core/settings-manager.ts:1137] [E: packages/coding-agent/docs/settings.md:188] |
| `images.autoResize` | `boolean` | `true` | 发送给 model 前把图片 resize 到最大 2000x2000。 | [E: packages/coding-agent/src/core/settings-manager.ts:51] [E: packages/coding-agent/src/core/settings-manager.ts:1243] [E: packages/coding-agent/docs/settings.md:189] |
| `images.blockImages` | `boolean` | `false` | 阻止图片发送给 LLM providers。 | [E: packages/coding-agent/src/core/settings-manager.ts:52] [E: packages/coding-agent/src/core/settings-manager.ts:1256] [E: packages/coding-agent/docs/settings.md:190] |
| `thinkingBudgets.minimal` | `number` | unset | `minimal` thinking level 自定义 token budget。 | [E: packages/coding-agent/src/core/settings-manager.ts:56] [E: packages/coding-agent/docs/settings.md:43] |
| `thinkingBudgets.low` | `number` | unset | `low` thinking level 自定义 token budget。 | [E: packages/coding-agent/src/core/settings-manager.ts:57] [E: packages/coding-agent/docs/settings.md:44] |
| `thinkingBudgets.medium` | `number` | unset | `medium` thinking level 自定义 token budget。 | [E: packages/coding-agent/src/core/settings-manager.ts:58] [E: packages/coding-agent/docs/settings.md:45] |
| `thinkingBudgets.high` | `number` | unset | `high` thinking level 自定义 token budget。 | [E: packages/coding-agent/src/core/settings-manager.ts:59] [E: packages/coding-agent/docs/settings.md:46] |
| `markdown.codeBlockIndent` | `string` | `"  "` | code block indentation。 | [E: packages/coding-agent/src/core/settings-manager.ts:65] [E: packages/coding-agent/src/core/settings-manager.ts:1346] [E: packages/coding-agent/docs/settings.md:274] |
| `markdown.mermaid` | `"off" \| "final" \| "streaming"` | `"streaming"` | Mermaid 渲染模式;非法值回落 `"streaming"`。 | [E: packages/coding-agent/src/core/settings-manager.ts:62] [E: packages/coding-agent/src/core/settings-manager.ts:66] [E: packages/coding-agent/src/core/settings-manager.ts:1350] [E: packages/coding-agent/src/core/settings-manager.ts:1352] [E: packages/coding-agent/docs/settings.md:275] |
| `warnings.anthropicExtraUsage` | `boolean` | `true` in docs/interface comment | Anthropic subscription auth 可能产生 paid extra usage 时展示 warning。 | [E: packages/coding-agent/src/core/settings-manager.ts:70] [E: packages/coding-agent/docs/settings.md:104] |

## `packages[]` object form keys

`packages` 的 string form 表示从 package 加载所有资源;object form 允许按 resource kind 过滤 [E: packages/coding-agent/docs/settings.md:296] [E: packages/coding-agent/docs/settings.md:304]。下面这些是 `PackageSource` object 内的键,不是 top-level settings keys [E: packages/coding-agent/src/core/settings-manager.ts:83]。

| object key | type | required | 含义 | 源码证据 |
| --- | --- | --- | --- | --- |
| `packages[].source` | `string` | yes | npm/git package source。 | [E: packages/coding-agent/src/core/settings-manager.ts:86] [E: packages/coding-agent/docs/settings.md:310] |
| `packages[].autoload` | `boolean` | `true` by omission | `false` 时从空资源集合开始，只应用显式 resource patterns。[I] | [E: packages/coding-agent/src/core/settings-manager.ts:87] |
| `packages[].extensions` | `string[]` | no | 只加载 package 内指定 extensions;空数组可过滤掉 extensions。 | [E: packages/coding-agent/src/core/settings-manager.ts:88] [E: packages/coding-agent/docs/settings.md:312] |
| `packages[].skills` | `string[]` | no | 只加载 package 内指定 skills。 | [E: packages/coding-agent/src/core/settings-manager.ts:89] [E: packages/coding-agent/docs/settings.md:311] |
| `packages[].prompts` | `string[]` | no | 只加载 package 内指定 prompts。 | [E: packages/coding-agent/src/core/settings-manager.ts:90] |
| `packages[].themes` | `string[]` | no | 只加载 package 内指定 themes。 | [E: packages/coding-agent/src/core/settings-manager.ts:91] |

## Legacy migrations

`queueMode` 会迁移为 `steeringMode` 当且仅当 settings 里还没有 `steeringMode` [E: packages/coding-agent/src/core/settings-manager.ts:426] [E: packages/coding-agent/src/core/settings-manager.ts:427] [E: packages/coding-agent/src/core/settings-manager.ts:428]。legacy boolean `websockets` 会迁移成 `transport: "websocket"` 或 `transport: "sse"` [E: packages/coding-agent/src/core/settings-manager.ts:432] [E: packages/coding-agent/src/core/settings-manager.ts:433] [E: packages/coding-agent/src/core/settings-manager.ts:434]。old object-form `skills` 可迁出 `enableSkillCommands` 与 `customDirectories` [E: packages/coding-agent/src/core/settings-manager.ts:439] [E: packages/coding-agent/src/core/settings-manager.ts:448] [E: packages/coding-agent/src/core/settings-manager.ts:451]。`retry.maxDelayMs` 会迁移到 `retry.provider.maxRetryDelayMs`,随后删除旧字段 [E: packages/coding-agent/src/core/settings-manager.ts:459] [E: packages/coding-agent/src/core/settings-manager.ts:471] [E: packages/coding-agent/src/core/settings-manager.ts:474] [E: packages/coding-agent/src/core/settings-manager.ts:479]。

## Sources

- `packages/coding-agent/src/core/settings-manager.ts`
- `packages/coding-agent/src/core/defaults.ts`
- `packages/coding-agent/src/core/agent-session.ts`
- `packages/coding-agent/docs/settings.md`

## 相关

- [surface.config.settings](../surface/config/settings.md): 用户可见的 settings schema、scope、merge 与 trust 行为入口。
- [subsys.coding-agent.settings-manager](../subsystems/coding-agent/settings-manager.md): `SettingsManager` 的加载、迁移、合并、写回与错误处理实现。

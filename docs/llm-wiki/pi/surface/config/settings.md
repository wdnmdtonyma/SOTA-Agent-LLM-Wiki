---
id: surface.config.settings
title: 配置与 settings(schema/scope/合并)
kind: surface
tier: T1
pkg: coding-agent
source:
 - packages/coding-agent/src/core/settings-manager.ts
 - packages/coding-agent/src/modes/interactive/theme/theme.ts
 - packages/coding-agent/src/modes/interactive/theme/theme-controller.ts
 - packages/coding-agent/src/core/settings-diagnostics.ts
 - packages/coding-agent/src/core/defaults.ts
 - packages/coding-agent/src/config.ts
 - packages/coding-agent/src/main.ts
 - packages/coding-agent/src/modes/interactive/interactive-mode.ts
 - packages/coding-agent/src/modes/interactive/components/model-selector.ts
 - packages/coding-agent/src/modes/interactive/components/thinking-selector.ts
 - packages/coding-agent/src/modes/interactive/components/settings-selector.ts
 - packages/coding-agent/src/core/keybindings.ts
 - packages/coding-agent/src/core/model-config.ts
 - packages/coding-agent/src/core/provider-composer.ts
 - packages/coding-agent/src/extensions/codemode/index.ts
 - packages/coding-agent/src/core/extensions/types.ts
 - packages/coding-agent/src/core/agent-session.ts
 - packages/coding-agent/src/cli/args.ts
 - packages/coding-agent/test/model-registry.test.ts
 - packages/coding-agent/test/settings-manager.test.ts
 - packages/coding-agent/docs/settings.md
symbols:
 - SettingsManager
 - Settings
 - PackageSource
 - CompactionModelOverride
 - getCompactionSettings
 - CacheWarmingMode
 - QuietStartup
 - CodemodeSettings
 - DEFAULT_TOOL_NAMES
 - getTuiMode
 - getQuietStartup
 - getDefaultTools
related:
 - surface.config.resolution
 - subsys.coding-agent.settings-manager
 - ref.coding-agent.config-keys
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `surface.config.settings` 描述 pi-coding-agent 用户可见的 settings 配置面:JSON 文件位置、global/project scope、project trust 门控、schema key families、project-over-global 合并和常见默认值边界。

## 能回答的问题

- pi 的 global settings 和 project settings 分别放在哪里?
- project settings 什么时候覆盖 global settings, nested object 怎样合并?
- `Settings` schema 覆盖哪些用户可配置能力?
- `tuiMode` 默认是什么,`quietStartup: "header"` 藏什么、留什么?
- `defaultTools` 的 `+name`/`-name` 怎样叠加,项目层会不会整表替换?
- `codemode.mode` / `codemode.inlineBudget` 是 settings 键还是独立文件?
- `compaction.modelOverrides` 如何按模型覆盖 token 预算,`enabled` 能否 per-model?
- `cacheWarming` 有哪些 mode,为什么只写 global settings?
- `compat.allowedFallbackModels` 在哪个 JSON 文件里,空数组做什么?
- `retry.maxAgentDelayMs` 和 `retry.provider.maxRetryDelayMs` 有何区别?
- project-local `.pi/settings.json` 受哪些 trust 规则约束?
- `/settings`、`pi config` 与直接编辑 `settings.json` 的边界是什么?
- `defaults.ts`、`settings-manager.ts`、`docs/settings.md` 三者在 settings 默认值上各自负责什么?

## 配置入口

pi 使用 JSON settings 文件,并且 project settings 覆盖 global settings [E: packages/coding-agent/docs/settings.md:3]。用户文档列出的两个位置是 `~/.pi/agent/settings.json` 作为 global scope,以及当前项目的 `.pi/settings.json` 作为 project scope [E: packages/coding-agent/docs/settings.md:7] [E: packages/coding-agent/docs/settings.md:7] [E: packages/coding-agent/docs/settings.md:9]。用户可以直接编辑这些 JSON 文件,也可以用 `/settings` 修改常见选项 [E: packages/coding-agent/docs/settings.md:10]。

`SettingsManager.create(cwd, agentDir)` 是代码侧的文件入口:它构造 `FileSettingsStorage`,默认 `agentDir` 来自 `getAgentDir()`,再委托 `SettingsManager.fromStorageWithPaths(...)` 读取 scope [E: packages/coding-agent/src/core/settings-manager.ts:417] [E: packages/coding-agent/src/core/settings-manager.ts:419] [E: packages/coding-agent/src/core/settings-manager.ts:424] [E: packages/coding-agent/src/core/settings-manager.ts:425]。`FileSettingsStorage` 把 global settings path 设为 `<agentDir>/settings.json`,把 project settings path 设为 `<cwd>/<CONFIG_DIR_NAME>/settings.json`;`CONFIG_DIR_NAME` 来自 package `piConfig.configDir`,默认 `".pi"` [E: packages/coding-agent/src/core/settings-manager.ts:300] [E: packages/coding-agent/src/core/settings-manager.ts:301] [E: packages/coding-agent/src/config.ts:542] [E: packages/coding-agent/docs/settings.md:7]。

## Schema 面

`Settings` 是 pi-coding-agent 的宽配置接口,覆盖 model/provider/thinking、transport、message delivery、theme/UI、compaction、branch summary、retry、shell/editor、telemetry、package/resource paths、terminal/images、model cycling、`defaultTools`、`codemode`、tree/editor controls、markdown、warnings、sessionDir 和 network timeout/proxy 等 key families [E: packages/coding-agent/src/core/settings-manager.ts:133] [E: packages/coding-agent/src/core/settings-manager.ts:150] [E: packages/coding-agent/src/core/settings-manager.ts:168] [E: packages/coding-agent/src/core/settings-manager.ts:178] [E: packages/coding-agent/src/core/settings-manager.ts:184]。

TUI family 使用 `tuiMode: "regular" | "fullscreen"`(旧名 `uiMode` 已删除)、`fullscreenExitOutput: "transcript" | "resume-hint"`、`fullscreenScrollbar: "auto" | "always" | "hidden"`、`fullscreenCopyOnSelect` 与 `fullscreenWheelScrollLines`。**1.0.0 起 `getTuiMode()` 对缺省和未知值回落 `"fullscreen"`**,只有显式 `"regular"` 才用终端普通 scrollback [E: packages/coding-agent/src/core/settings-manager.ts:184] [E: packages/coding-agent/src/core/settings-manager.ts:1348] [E: packages/coding-agent/src/core/settings-manager.ts:1349] [E: packages/coding-agent/docs/settings.md:94]。其余 getter:未知 `fullscreenExitOutput` 回落 `"transcript"`,未知 scrollbar 回落 `"auto"`,`fullscreenCopyOnSelect` 默认 `true`,`fullscreenWheelScrollLines` 非 1..100 的 number 时回落 `"auto"` [E: packages/coding-agent/src/core/settings-manager.ts:1358] [E: packages/coding-agent/src/core/settings-manager.ts:1369] [E: packages/coding-agent/src/core/settings-manager.ts:1379] [E: packages/coding-agent/src/core/settings-manager.ts:1389]。五项 setter 都写 global settings。`tuiMode` 从 `/settings` 改动后立即 `switchTuiMode()`,`--tui-mode` 只覆盖一次启动且 help 文案写 fullscreen 为 default [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5041] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5047] [E: packages/coding-agent/src/cli/args.ts:216] [E: packages/coding-agent/src/cli/args.ts:329] [E: packages/coding-agent/src/main.ts:960]。fullscreen 项只影响 fullscreen transcript;`fullscreenCopyOnSelect: false` 时选区保持高亮、用 `Ctrl+X` 复制。

`quietStartup` 类型是 `boolean | "header"`,默认 `false`。`getQuietStartup()` 只把 `true` 和 `"header"` 原样返回,其它值当 `false` [E: packages/coding-agent/src/core/settings-manager.ts:112] [E: packages/coding-agent/src/core/settings-manager.ts:150] [E: packages/coding-agent/src/core/settings-manager.ts:1089] [E: packages/coding-agent/docs/settings.md:93]。产品语义:`true` 藏 startup header 与 loaded-resource listing;`"header"` 保留 header(logo/version/key hints)但藏 model scope 行和资源列表;`--verbose` 两项都强制显示。setter 写 global。`/settings` 的 Quiet startup 值为 `true` / `header` / `false` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1411] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1416] [E: packages/coding-agent/src/modes/interactive/components/settings-selector.ts:555]。

`modelThinkingLevels` 是按 `"provider/modelId"` 覆盖启动 thinking level 的 object;可从 `/settings` → Default thinking level per model 写入 [E: packages/coding-agent/src/core/settings-manager.ts:138] [E: packages/coding-agent/src/core/settings-manager.ts:878] [E: packages/coding-agent/docs/settings.md:33]。

`compaction.modelOverrides` 是另一套精确 `"provider/modelId"` 表,只覆盖 `reserveTokens` 与 `keepRecentTokens`。键区分大小写,不是 glob;模型 ID 本身可以含 `/`(例如 `openrouter/anthropic/claude-sonnet-4`) [E: packages/coding-agent/src/core/settings-manager.ts:18] [E: packages/coding-agent/src/core/settings-manager.ts:32] [E: packages/coding-agent/docs/settings.md:138] 。每字段独立回退:matching override → ordinary `compaction.*` → built-in `16384` / `20000` [E: packages/coding-agent/src/core/settings-manager.ts:952] [E: packages/coding-agent/src/core/settings-manager.ts:964] 。`enabled` 不是 model-specific;`getCompactionSettings(model)` 始终用全局 `getCompactionEnabled()` [E: packages/coding-agent/src/core/settings-manager.ts:914] [E: packages/coding-agent/src/core/settings-manager.ts:969] [E: packages/coding-agent/src/core/settings-manager.ts:970] 。`/settings` 只保留普通 auto-compaction toggle;overrides 走 JSON 。`getCompactionSettings()` 返回给 compaction 调用方的形状是 `{ enabled, reserveTokens, keepRecentTokens }`,不含 `modelOverrides`;override 解析发生在 SettingsManager 内 [E: packages/coding-agent/src/core/settings-manager.ts:964] [I]。

`cacheWarming` 是 global-only settings 键:`"off"` | `"streaming"` | `"idle"`,默认 `"streaming"`。getter 只读 `globalSettings.cacheWarming`,非法值回落 `"streaming"`;setter 写 global 并 `markModified("cacheWarming")`。用户文档把它标成 Keep eligible provider prompt caches warm;每次 refresh 计费,所以不让 project settings 覆盖。[E: packages/coding-agent/src/core/settings-manager.ts:82] [E: packages/coding-agent/src/core/settings-manager.ts:83] [E: packages/coding-agent/src/core/settings-manager.ts:182] [E: packages/coding-agent/src/core/settings-manager.ts:1023] [E: packages/coding-agent/src/core/settings-manager.ts:1024] [E: packages/coding-agent/src/core/settings-manager.ts:1025] [E: packages/coding-agent/src/core/settings-manager.ts:1028] [E: packages/coding-agent/src/core/settings-manager.ts:1029] [E: packages/coding-agent/docs/settings.md:19] [E: packages/coding-agent/docs/settings.md:21]

`compat.allowedFallbackModels` **不是** `settings.json` 键,而是 `models.json` 的 Anthropic Messages compat 字段:可选 array,最多 3 项,每项 `{ provider, model, cost }`。`modelOverrides["id"].compat.allowedFallbackModels` 整表替换(含空数组,用来关掉 server-side fallback);`mergeCompat()` 把它当普通字段 spread,不像 `chatTemplateArgs` 那样 nested merge。[E: packages/coding-agent/src/core/model-config.ts:160] [E: packages/coding-agent/src/core/model-config.ts:170] [E: packages/coding-agent/src/core/model-config.ts:177] [E: packages/coding-agent/src/core/model-config.ts:226] [E: packages/coding-agent/src/core/provider-composer.ts:125] [E: packages/coding-agent/src/core/provider-composer.ts:130] [E: packages/coding-agent/test/model-registry.test.ts:711] [E: packages/coding-agent/test/model-registry.test.ts:728] [E: packages/coding-agent/test/model-registry.test.ts:741] [E: packages/coding-agent/test/model-registry.test.ts:745] 本节点只记录它与 settings 面的边界;wire 行为属于 Anthropic messages 子系统。[I]

`retry.maxAgentDelayMs` 默认 `60000`,封顶 agent-level 指数退避;它与 `retry.provider.maxRetryDelayMs`(默认同样 60000,封顶服务端 `retry-after`)是两套 cap [E: packages/coding-agent/src/core/settings-manager.ts:50] [E: packages/coding-agent/src/core/settings-manager.ts:1000] [E: packages/coding-agent/src/core/settings-manager.ts:1038] 。

`/model` 与 `/thinking` 选择器默认只改当前 session:Enter 走 `persist: false`;只有 `app.models.save` / `app.thinking.save`(默认都是 `ctrl+s`)才 `persist: true` 写回 global startup default。用户文档同一句写的是 `/model`/`/thinking` + Ctrl+S [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5116] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5121] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5299] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5305] [E: packages/coding-agent/src/modes/interactive/components/model-selector.ts:142] [E: packages/coding-agent/src/modes/interactive/components/model-selector.ts:399] [E: packages/coding-agent/src/modes/interactive/components/thinking-selector.ts:97] [E: packages/coding-agent/src/modes/interactive/components/thinking-selector.ts:131] [E: packages/coding-agent/src/core/keybindings.ts:104] [E: packages/coding-agent/src/core/keybindings.ts:186] [E: packages/coding-agent/docs/settings.md:10]。带搜索词的 `/model <id>` 精确匹配也是 `persist: false` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5137]。

`terminal.hyperlinks` / `terminal.images` / `terminal.trueColor` 是 advanced JSON-only capability overrides,默认 `"auto"`。`getTerminalCapabilityOverrides()` 只在值为 concrete boolean、`kitty`/`iterm2` 或 `images: false`(写成 `null`)时覆盖检测;`auto` 不覆盖 [E: packages/coding-agent/src/core/settings-manager.ts:62] [E: packages/coding-agent/src/core/settings-manager.ts:63] [E: packages/coding-agent/src/core/settings-manager.ts:64] [E: packages/coding-agent/src/core/settings-manager.ts:1278] [E: packages/coding-agent/src/core/settings-manager.ts:1282] 。

`defaultTools` 选择启动时启用的工具。省略时 `getDefaultTools()` 返回 `undefined`,会话侧再用 `DEFAULT_TOOL_NAMES = ["read", "bash", "edit", "write"]` [E: packages/coding-agent/src/core/settings-manager.ts:215] [E: packages/coding-agent/src/core/settings-manager.ts:1434] [E: packages/coding-agent/src/core/settings-manager.ts:1436] [E: packages/coding-agent/docs/settings.md:40]。可用 built-in 含 `powershell`/`grep`/`find`/`ls`;也可点名 `codemode`、`tool_search` 以及其它默认 inactive 的 extension 工具 [E: packages/coding-agent/docs/settings.md:44]。空数组关闭全部 built-in,但 extension 与 SDK custom tools 仍启用 [E: packages/coding-agent/test/settings-manager.test.ts:645]。

`+name` / `-name` 是 0.99.0 起的增量语法。一层 settings 里:只要出现普通名字(或空数组),plain names 先组成选择,再按列表顺序应用 `+`/`-`;若整表只有 modifier,则从 `DEFAULT_TOOL_NAMES` 起步再加减 [E: packages/coding-agent/src/core/settings-manager.ts:236] [E: packages/coding-agent/src/core/settings-manager.ts:238] [E: packages/coding-agent/test/settings-manager.test.ts:650]。两层 merge 时:`deepMergeSettings` 对 `defaultTools` **不走普通 array 整表替换**:项目层若全是 modifier,就 append 到全局列表再 resolve;项目层一旦含普通名字,才整表替换 [E: packages/coding-agent/src/core/settings-manager.ts:225] [E: packages/coding-agent/src/core/settings-manager.ts:228] [E: packages/coding-agent/src/core/settings-manager.ts:252] [E: packages/coding-agent/test/settings-manager.test.ts:663] [E: packages/coding-agent/docs/settings.md:46]。例如全局省略、项目 `["+codemode"]` 解析为 `read/bash/edit/write/codemode` [E: packages/coding-agent/test/settings-manager.test.ts:680]。`--tools` 是对全部工具(含 extension/custom)的严格 allowlist,不接受 `+name`/`-name`;`--no-tools` 关全部工具,`--no-builtin-tools` 只关 built-in。`/reload` 只启用 `defaultTools` 新加的名字,不关掉被删或会话中手动关掉的工具 [E: packages/coding-agent/docs/settings.md:56] [E: packages/coding-agent/src/core/agent-session.ts:3626]。

`codemode` 是 nested settings 对象,不是独立 JSON 文件:`CodemodeSettings.mode` 为 `"on" | "only"`(默认 `"on"`),`inlineBudget` 默认文档值 `3000`。`SettingsManager` **没有** `getCodemode()` accessor;内置 `codemode` 扩展读 `pi.getSettings().codemode`:`mode === "only"` 才是 only,否则 on;`inlineBudget` 必须是有限非负数才生效 [E: packages/coding-agent/src/core/settings-manager.ts:101] [E: packages/coding-agent/src/core/settings-manager.ts:103] [E: packages/coding-agent/src/core/settings-manager.ts:178] [E: packages/coding-agent/src/core/extensions/types.ts:1731] [E: packages/coding-agent/src/extensions/codemode/index.ts:22] [E: packages/coding-agent/src/extensions/codemode/index.ts:26] [E: packages/coding-agent/docs/settings.md:41]。`codemode` 工具默认 inactive,要用 `defaultTools: ["+codemode"]`、`--tools` 或 `setActiveTools()` 打开。nested `codemode` object 走普通 `deepMergeObjects`,项目可只覆盖 `mode` 或 `inlineBudget` [E: packages/coding-agent/src/core/settings-manager.ts:205]。

`theme` 仍是 TUI theme 名;含 `/` 的 automatic theme setting 不会作为固定 theme 返回。`themes` 是本地 theme 路径列表。CLI `--use-theme` 只覆盖本次 interactive 运行,不写回 settings 文件 [E: packages/coding-agent/src/core/settings-manager.ts:142] [E: packages/coding-agent/src/core/settings-manager.ts:868] [E: packages/coding-agent/src/core/settings-manager.ts:858] [E: packages/coding-agent/src/core/settings-manager.ts:163] [E: packages/coding-agent/docs/settings.md:71]。

`markdown.mermaid` 控制 Mermaid 渲染:`"off"` / `"final"` / `"streaming"`,默认 `"streaming"`。LaTeX 由 TUI markdown 的 `renderLatex` option 渲染,不是 `Settings` 键 [E: packages/coding-agent/src/core/settings-manager.ts:79] [E: packages/coding-agent/src/core/settings-manager.ts:87] [E: packages/coding-agent/src/core/settings-manager.ts:1512] [U]。

用户文档把这些 key families 分成 Model & Thinking、UI & Display、Network、Warnings、Compaction、Branch Summary、Retry、Message Delivery、Terminal & Images、Shell、Tools、Sessions、Model Cycling、Markdown、Resources 等段落 [E: packages/coding-agent/docs/settings.md:27] [E: packages/coding-agent/docs/settings.md:68] [E: packages/coding-agent/docs/settings.md:105] [E: packages/coding-agent/docs/settings.md:119] [E: packages/coding-agent/docs/settings.md:68] 。完整逐 key catalog 应由 [ref.coding-agent.config-keys](../../reference/config-keys.md) 承担;本 surface 节点只解释 settings 面的读写、scope、合并和默认值边界 [I]。

`PackageSource` 是 resource package 配置的特殊 shape:它可以是 string,也可以是带 `source` 的 object；`autoload: false` 让 package 从空资源集合开始，只应用显式 resource patterns，`extensions`、`skills`、`prompts`、`themes` arrays 再过滤各类资源 [E: packages/coding-agent/src/core/settings-manager.ts:122] [E: packages/coding-agent/src/core/settings-manager.ts:125] [E: packages/coding-agent/src/core/settings-manager.ts:126] [E: packages/coding-agent/src/core/settings-manager.ts:127] [E: packages/coding-agent/src/core/settings-manager.ts:128] [E: packages/coding-agent/src/core/settings-manager.ts:129] [E: packages/coding-agent/src/core/settings-manager.ts:130] [I]。用户文档同样展示了 packages 的 string form 和 object form。

## Scope 与合并

`SettingsScope` 只有 `"global"` 和 `"project"` 两个值 [E: packages/coding-agent/src/core/settings-manager.ts:267]。`SettingsManager.fromStorage(storage, options)` 默认认为 project trusted,分别尝试读取 global 和 project scope,再把读取错误收集为 `SettingsError[]` [E: packages/coding-agent/src/core/settings-manager.ts:444] [E: packages/coding-agent/src/core/settings-manager.ts:442] [E: packages/coding-agent/src/core/settings-manager.ts:443] [E: packages/coding-agent/src/core/settings-manager.ts:444] [E: packages/coding-agent/src/core/settings-manager.ts:446] [E: packages/coding-agent/src/core/settings-manager.ts:449]。constructor 最终用 `deepMergeSettings(globalSettings, projectSettings)` 形成 effective settings,所以 project scope 是 override layer [E: packages/coding-agent/src/core/settings-manager.ts:407] [E: packages/coding-agent/src/core/settings-manager.ts:406] [E: packages/coding-agent/src/core/settings-manager.ts:419] [E: packages/coding-agent/src/core/settings-manager.ts:413]。

`deepMergeSettings(base, overrides)` 先走 `deepMergeObjects`:override value 为 `undefined` 时跳过,base 和 override 两侧都是非数组 object 时**递归**合并,其它 primitive 与 array 由 override 直接替换 [E: packages/coding-agent/src/core/settings-manager.ts:195] [E: packages/coding-agent/src/core/settings-manager.ts:200] [E: packages/coding-agent/src/core/settings-manager.ts:205] [E: packages/coding-agent/src/core/settings-manager.ts:250]。然后专门再跑 `mergeDefaultTools`:只有 `defaultTools` 这一项不遵守“array 整表替换”——项目层若全是 `+name`/`-name` 就 append 到全局列表 [E: packages/coding-agent/src/core/settings-manager.ts:252] [E: packages/coding-agent/src/core/settings-manager.ts:225]。因此 `retry.provider`、`compaction.modelOverrides` 与 `codemode` 这类多层 nested object 会按 key 逐层合并;文档写明 compaction 是 global/project 先递归 merge,**然后**才做 model lookup,项目可以只覆盖某一模型的一个字段。

`loadFromStorage()` 会把空文件内容视为 `{}`,有内容则 `JSON.parse()` 后进入 `migrateSettings()` [E: packages/coding-agent/src/core/settings-manager.ts:473] [E: packages/coding-agent/src/core/settings-manager.ts:484] [E: packages/coding-agent/src/core/settings-manager.ts:487] [E: packages/coding-agent/src/core/settings-manager.ts:488]。当前 migration 覆盖四类 legacy shape:`queueMode` -> `steeringMode`,boolean `websockets` -> `transport`,旧 object 形式 `skills` -> `enableSkillCommands` 与 `skills` array,以及 `retry.maxDelayMs` -> `retry.provider.maxRetryDelayMs` [E: packages/coding-agent/src/core/settings-manager.ts:504] [E: packages/coding-agent/src/core/settings-manager.ts:518] [E: packages/coding-agent/src/core/settings-manager.ts:507] [E: packages/coding-agent/src/core/settings-manager.ts:512] [E: packages/coding-agent/src/core/settings-manager.ts:513] [E: packages/coding-agent/src/core/settings-manager.ts:518] [E: packages/coding-agent/src/core/settings-manager.ts:528] [E: packages/coding-agent/src/core/settings-manager.ts:532] [E: packages/coding-agent/src/core/settings-manager.ts:551] [E: packages/coding-agent/src/core/settings-manager.ts:556]。`retry.maxDelayMs` 不会迁到 `retry.maxAgentDelayMs` [I]。

## Project Trust 门控

项目目录包含 project-local settings、resources 或 project `.agents/skills` 且没有已保存信任决策时,interactive startup 会询问是否 trust project folder;trust 后才允许加载 `.pi/settings.json` 和 `.pi` resources、安装缺失 project packages、执行 project extensions [E: packages/coding-agent/docs/settings.md:12] [E: packages/coding-agent/docs/settings.md:14]。非交互模式不会弹出 trust prompt;没有可用保存决策时,它们用 global settings 的 `defaultProjectTrust`,其中 `ask` 默认值和 `never` 会忽略 project resources,`always` 会信任它们,一次性 override 可用 `--approve`/`-a` 或 `--no-approve`/`-na` [E: packages/coding-agent/docs/settings.md:16]。

代码侧的 project trust gate 在 settings 读取和写入两边都存在:project scope 且 `projectTrusted` 为 false 时,`loadFromStorage()` 直接返回 `{}` [E: packages/coding-agent/src/core/settings-manager.ts:473] [E: packages/coding-agent/src/core/settings-manager.ts:474] [E: packages/coding-agent/src/core/settings-manager.ts:487]。`setProjectTrusted(false)` 会清空内存中的 `projectSettings`,清掉 project load error,再重新合并 effective settings [E: packages/coding-agent/src/core/settings-manager.ts:594] [E: packages/coding-agent/src/core/settings-manager.ts:591] [E: packages/coding-agent/src/core/settings-manager.ts:592] [E: packages/coding-agent/src/core/settings-manager.ts:593] [E: packages/coding-agent/src/core/settings-manager.ts:594]。project 写入前会调用 `assertProjectTrustedForWrite()`,未 trusted 时抛出 `"Project is not trusted; refusing to write project settings"` [E: packages/coding-agent/src/core/settings-manager.ts:662] [E: packages/coding-agent/src/core/settings-manager.ts:663] [E: packages/coding-agent/src/core/settings-manager.ts:664] [E: packages/coding-agent/src/core/settings-manager.ts:753] [E: packages/coding-agent/src/core/settings-manager.ts:782]。

`defaultProjectTrust` 是 global-only 用户设置,文档要求取值 `"ask"`、`"always"` 或 `"never"` [E: packages/coding-agent/docs/settings.md:18]。`SettingsManager.getDefaultProjectTrust()` 也只读取 `globalSettings.defaultProjectTrust`,并且除了 `"always"` 和 `"never"` 以外都回落为 `"ask"` [E: packages/coding-agent/src/core/settings-manager.ts:1100] [E: packages/coding-agent/src/core/settings-manager.ts:1101] [E: packages/coding-agent/src/core/settings-manager.ts:1102]。

## 常见默认值

多数默认值不集中在 `defaults.ts`;`SettingsManager` 的 getter 直接在 accessor 里提供 fallback,而 `packages/coding-agent/src/core/defaults.ts` 在本 source set 中只导出 `DEFAULT_THINKING_LEVEL = "medium"` [E: packages/coding-agent/src/core/defaults.ts:1] [E: packages/coding-agent/src/core/defaults.ts:3] [I]。`SettingsManager.getDefaultThinkingLevel()` 本身只返回 `this.settings.defaultThinkingLevel`,没有使用 `DEFAULT_THINKING_LEVEL`;默认 thinking level 的最终消费点不在本节点 source 列表内 [E: packages/coding-agent/src/core/settings-manager.ts:867] [E: packages/coding-agent/src/core/settings-manager.ts:868] [U]。

用户可见默认值与 accessor fallback 大体对应:message delivery 的 `steeringMode` 与 `followUpMode` 默认 `"one-at-a-time"`,transport 默认 `"auto"`,compaction enabled/reserve/keep recent 默认 `true`/`16384`/`20000`,retry enabled/max/base/agent-delay 默认 `true`/`3`/`2000`/`60000`,provider max retry delay 默认 `60000`,terminal image display 默认 true,image width 默认 60,terminal progress 默认 false,image auto resize 默认 true,block images 默认 false,markdown code block indent 默认两个空格,mermaid 默认 `"streaming"`,**tuiMode 默认 `"fullscreen"`**,fullscreenExitOutput 默认 `"transcript"`,fullscreenCopyOnSelect 默认 `true`,quietStartup 默认 `false` [E: packages/coding-agent/src/core/settings-manager.ts:830] [E: packages/coding-agent/src/core/settings-manager.ts:840] [E: packages/coding-agent/src/core/settings-manager.ts:905] [E: packages/coding-agent/src/core/settings-manager.ts:914] [E: packages/coding-agent/src/core/settings-manager.ts:23] [E: packages/coding-agent/src/core/settings-manager.ts:952] [E: packages/coding-agent/src/core/settings-manager.ts:987] [E: packages/coding-agent/src/core/settings-manager.ts:1000] [E: packages/coding-agent/src/core/settings-manager.ts:1034] [E: packages/coding-agent/src/core/settings-manager.ts:1288] [E: packages/coding-agent/src/core/settings-manager.ts:1335] [E: packages/coding-agent/src/core/settings-manager.ts:1349] [E: packages/coding-agent/src/core/settings-manager.ts:1359] [E: packages/coding-agent/src/core/settings-manager.ts:1380] [E: packages/coding-agent/src/core/settings-manager.ts:1403] [E: packages/coding-agent/src/core/settings-manager.ts:1416] [E: packages/coding-agent/src/core/settings-manager.ts:1508] [E: packages/coding-agent/src/core/settings-manager.ts:1514] [E: packages/coding-agent/src/core/settings-manager.ts:1091]。

部分 defaults 有环境变量或 validation fallback:`externalEditor` 优先 settings,再用 `VISUAL`、`EDITOR`,最后 Windows 为 `notepad`、其它平台为 `nano`;`terminal.clearOnShrink` 在 settings 未配置时读 `PI_CLEAR_ON_SHRINK === "1"`;`showHardwareCursor` 在 settings 未配置时读 `PI_HARDWARE_CURSOR === "1"`;`editorPaddingX` setter clamp 到 0..3,`autocompleteMaxVisible` setter clamp 到 3..20,`treeFilterMode` 非合法枚举时回落 `"default"` [E: packages/coding-agent/src/core/settings-manager.ts:1101] [E: packages/coding-agent/src/core/settings-manager.ts:1059] [E: packages/coding-agent/src/core/settings-manager.ts:1063] [E: packages/coding-agent/src/core/settings-manager.ts:1318] [E: packages/coding-agent/src/core/settings-manager.ts:1320] [E: packages/coding-agent/src/core/settings-manager.ts:1323] [E: packages/coding-agent/src/core/settings-manager.ts:1502] [E: packages/coding-agent/src/core/settings-manager.ts:1458] [E: packages/coding-agent/src/core/settings-manager.ts:1459] [E: packages/coding-agent/src/core/settings-manager.ts:1514] [E: packages/coding-agent/src/core/settings-manager.ts:1469] [E: packages/coding-agent/src/core/settings-manager.ts:1483] [E: packages/coding-agent/src/core/settings-manager.ts:1503]。

## Invalid settings 诊断

`collectSettingsDiagnostics(settingsManager)` 调用 `drainErrors()`,把每条 settings error 转成 `type: "warning"` diagnostic;有 path 时 message 为 `Invalid settings file ${path}: ...`,否则 `Invalid ${scope} settings: ...` [E: packages/coding-agent/src/core/settings-diagnostics.ts:4] [E: packages/coding-agent/src/core/settings-diagnostics.ts:7]。`deduplicateDiagnostics()` 按 `type\0message` 去重,保留首次出现 [E: packages/coding-agent/src/core/settings-diagnostics.ts:15] [E: packages/coding-agent/src/core/settings-diagnostics.ts:20]。

`main()` 启动时对 startup settings manager 收集一次,runtime 再收集一次,interactive 路径用 `deduplicateDiagnostics` 合并后交给 `InteractiveMode` 的 `startupDiagnostics`;TUI 对 warning 走 `showWarning`,因此 invalid settings 会在 TUI 内显示带 path 的提示,而不是只打到 stderr [E: packages/coding-agent/src/main.ts:60] [E: packages/coding-agent/src/main.ts:670] [E: packages/coding-agent/src/main.ts:798] [E: packages/coding-agent/src/main.ts:916] [E: packages/coding-agent/src/main.ts:953] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1185] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1189]。非 interactive 或存在 runtime error 时仍 `reportDiagnostics` 打到控制台 [E: packages/coding-agent/src/main.ts:915] [E: packages/coding-agent/src/main.ts:916]。

## 写回与修改语义

`SettingsManager` 持有 `globalSettings`、`projectSettings` 和合并后的 `settings`,并跟踪 global/project 各自被修改的 top-level fields 与 nested fields [E: packages/coding-agent/src/core/settings-manager.ts:379] [E: packages/coding-agent/src/core/settings-manager.ts:381] [E: packages/coding-agent/src/core/settings-manager.ts:382] [E: packages/coding-agent/src/core/settings-manager.ts:395] [E: packages/coding-agent/src/core/settings-manager.ts:385] [E: packages/coding-agent/src/core/settings-manager.ts:386] [E: packages/coding-agent/src/core/settings-manager.ts:387] [E: packages/coding-agent/src/core/settings-manager.ts:388]。global setter 直接改 `globalSettings`、标记 modified field,然后 `save()`;project setter 走 `updateProjectSettings()` 克隆 project settings、应用 update、标记 project modified field,再 `saveProjectSettings()` [E: packages/coding-agent/src/core/settings-manager.ts:641] [E: packages/coding-agent/src/core/settings-manager.ts:664] [E: packages/coding-agent/src/core/settings-manager.ts:781] [E: packages/coding-agent/src/core/settings-manager.ts:783] [E: packages/coding-agent/src/core/settings-manager.ts:772] [E: packages/coding-agent/src/core/settings-manager.ts:773] [E: packages/coding-agent/src/core/settings-manager.ts:774]。

写入不是覆盖整份 in-memory settings:`persistScopedSettings()` 在 lock callback 内重新读取当前文件、再次 migration,然后只覆盖 modified fields;如果某个 object field 只标记了 nested keys,它从当前文件的 nested object 起步,只替换这些 nested keys [E: packages/coding-agent/src/core/settings-manager.ts:705] [E: packages/coding-agent/src/core/settings-manager.ts:723] [E: packages/coding-agent/src/core/settings-manager.ts:724] [E: packages/coding-agent/src/core/settings-manager.ts:713] [E: packages/coding-agent/src/core/settings-manager.ts:716] [E: packages/coding-agent/src/core/settings-manager.ts:717] [E: packages/coding-agent/src/core/settings-manager.ts:719] [E: packages/coding-agent/src/core/settings-manager.ts:723] [E: packages/coding-agent/src/core/settings-manager.ts:736] [I]。写入任务串到 `writeQueue`,`flush()` 等待队列完成,`drainErrors()` 返回并清空累积的 settings errors [E: packages/coding-agent/src/core/settings-manager.ts:683] [E: packages/coding-agent/src/core/settings-manager.ts:684] [E: packages/coding-agent/src/core/settings-manager.ts:692] [E: packages/coding-agent/src/core/settings-manager.ts:777] [E: packages/coding-agent/src/core/settings-manager.ts:778] [E: packages/coding-agent/src/core/settings-manager.ts:781] [E: packages/coding-agent/src/core/settings-manager.ts:782] [E: packages/coding-agent/src/core/settings-manager.ts:783]。

`applyOverrides(overrides)` 只把 overrides 合并到 effective `settings`,不修改 `globalSettings` 或 `projectSettings`,也不触发 save;它适合作为 runtime override,不是持久化 settings 写入口 [E: packages/coding-agent/src/core/settings-manager.ts:636] [E: packages/coding-agent/src/core/settings-manager.ts:637] [I]。如果 global 或 project settings 文件读取时有 parse/load error,对应的 `save()` 或 `saveProjectSettings()` 会先更新 effective settings,然后直接返回,避免把内存状态写回一个已损坏的 JSON 文件 [E: packages/coding-agent/src/core/settings-manager.ts:736] [E: packages/coding-agent/src/core/settings-manager.ts:739] [E: packages/coding-agent/src/core/settings-manager.ts:752] [E: packages/coding-agent/src/core/settings-manager.ts:769] [I]。

## 与配置值解析的边界

本节点把 settings JSON 当作已经 parse 出来的 value graph,不解释 `$ENV`、`${ENV}` 或 `!cmd` 字符串解析规则 [I]。这些动态配置值语法属于 [surface.config.resolution](resolution.md) 和 [subsys.coding-agent.config-resolution](../../subsystems/coding-agent/config-resolution.md);settings manager 只在 HTTP/WebSocket timeout accessor 里调用 timeout parser,其它 settings key 的 env/command 解析应由具体消费者负责 [E: packages/coding-agent/src/core/settings-manager.ts:16] [E: packages/coding-agent/src/core/settings-manager.ts:256] [E: packages/coding-agent/src/core/settings-manager.ts:1009] [E: packages/coding-agent/src/core/settings-manager.ts:1042] [I]。

## Gotcha

- `docs/settings.md` 是用户文档和默认值说明的主要来源,而 `defaults.ts` 在当前 source set 中只定义 `DEFAULT_THINKING_LEVEL`;不要把所有 settings 默认值都预期为集中常量 [E: packages/coding-agent/docs/settings.md:27] [E: packages/coding-agent/src/core/defaults.ts:3] [I]。
- `compaction.modelOverrides` 与 `models.json` 里的 `modelOverrides`(provider/model 元数据覆盖)不是同一键;后者才承载 `compat.allowedFallbackModels` [I]。

## Sources

- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/modes/interactive/theme/theme.ts
- packages/coding-agent/src/modes/interactive/theme/theme-controller.ts
- packages/coding-agent/src/core/settings-diagnostics.ts
- packages/coding-agent/src/core/defaults.ts
- packages/coding-agent/src/config.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/src/modes/interactive/components/model-selector.ts
- packages/coding-agent/src/modes/interactive/components/thinking-selector.ts
- packages/coding-agent/src/modes/interactive/components/settings-selector.ts
- packages/coding-agent/src/core/keybindings.ts
- packages/coding-agent/src/core/model-config.ts
- packages/coding-agent/src/core/provider-composer.ts
- packages/coding-agent/src/extensions/codemode/index.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/cli/args.ts
- packages/coding-agent/test/model-registry.test.ts
- packages/coding-agent/test/settings-manager.test.ts
- packages/coding-agent/docs/settings.md

## 相关

- [surface.config.resolution](resolution.md): 用户可见的 `$ENV`、`${ENV}`、`!cmd` 配置值解析语法。
- [subsys.coding-agent.settings-manager](../../subsystems/coding-agent/settings-manager.md): `SettingsManager` 的 storage、lock、migration、write queue 和 accessor 实现细节。
- [ref.coding-agent.config-keys](../../reference/config-keys.md): 配置键完整 catalog,负责逐 key 默认值、类型和含义。

---
id: surface.config.settings
title: 配置与 settings(schema/scope/合并)
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/core/settings-diagnostics.ts
  - packages/coding-agent/src/core/defaults.ts
  - packages/coding-agent/src/main.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/src/modes/interactive/components/model-selector.ts
  - packages/coding-agent/src/modes/interactive/components/thinking-selector.ts
  - packages/coding-agent/src/core/keybindings.ts
  - packages/coding-agent/docs/settings.md
symbols:
  - SettingsManager
  - Settings
  - PackageSource
  - CompactionModelOverride
  - getCompactionSettings
related:
  - surface.config.resolution
  - subsys.coding-agent.settings-manager
  - ref.coding-agent.config-keys
evidence: explicit
status: verified
updated: 71dca871bc
---

> `surface.config.settings` 描述 pi-coding-agent 用户可见的 settings 配置面:JSON 文件位置、global/project scope、project trust 门控、schema key families、project-over-global 合并和常见默认值边界。

## 能回答的问题

- pi 的 global settings 和 project settings 分别放在哪里?
- project settings 什么时候覆盖 global settings, nested object 怎样合并?
- `Settings` schema 覆盖哪些用户可配置能力?
- `compaction.modelOverrides` 如何按模型覆盖 token 预算,`enabled` 能否 per-model?
- `retry.maxAgentDelayMs` 和 `retry.provider.maxRetryDelayMs` 有何区别?
- project-local `.pi/settings.json` 受哪些 trust 规则约束?
- `/settings`、`pi config` 与直接编辑 `settings.json` 的边界是什么?
- `defaults.ts`、`settings-manager.ts`、`docs/settings.md` 三者在 settings 默认值上各自负责什么?

## 配置入口

pi 使用 JSON settings 文件,并且 project settings 覆盖 global settings [E: packages/coding-agent/docs/settings.md:3]。用户文档列出的两个位置是 `~/.pi/agent/settings.json` 作为 global scope,以及当前项目的 `.pi/settings.json` 作为 project scope [E: packages/coding-agent/docs/settings.md:5] [E: packages/coding-agent/docs/settings.md:7] [E: packages/coding-agent/docs/settings.md:8]。用户可以直接编辑这些 JSON 文件,也可以用 `/settings` 修改常见选项 [E: packages/coding-agent/docs/settings.md:10]。

`SettingsManager.create(cwd, agentDir)` 是代码侧的文件入口:它构造 `FileSettingsStorage`,默认 `agentDir` 来自 `getAgentDir()`,再委托 `SettingsManager.fromStorageWithPaths(...)` 读取 scope [E: packages/coding-agent/src/core/settings-manager.ts:349] [E: packages/coding-agent/src/core/settings-manager.ts:351] [E: packages/coding-agent/src/core/settings-manager.ts:356] [E: packages/coding-agent/src/core/settings-manager.ts:357]。`FileSettingsStorage` 把 global settings path 设为 `<agentDir>/settings.json`,把 project settings path 设为 `<cwd>/<CONFIG_DIR_NAME>/settings.json`;本节点用 `docs/settings.md` 确认默认用户可见目录名是 `.pi`,因为 `CONFIG_DIR_NAME` 的字面值不在本节点 source 列表内 [E: packages/coding-agent/src/core/settings-manager.ts:232] [E: packages/coding-agent/src/core/settings-manager.ts:233] [E: packages/coding-agent/docs/settings.md:7] [E: packages/coding-agent/docs/settings.md:8] [U]。

## Schema 面

`Settings` 是 pi-coding-agent 的宽配置接口,覆盖 model/provider/thinking、transport、message delivery、theme/UI、compaction、branch summary、retry、shell/editor、telemetry、package/resource paths、terminal/images、model cycling、default built-in tools、tree/editor controls、markdown、warnings、sessionDir 和 network timeout/proxy 等 key families [E: packages/coding-agent/src/core/settings-manager.ts:106] [E: packages/coding-agent/src/core/settings-manager.ts:115] [E: packages/coding-agent/src/core/settings-manager.ts:140] [E: packages/coding-agent/src/core/settings-manager.ts:148] [E: packages/coding-agent/src/core/settings-manager.ts:154]。

TUI family 使用 `tuiMode: "regular" | "fullscreen"`(旧名 `uiMode` 已删除)、`fullscreenExitOutput: "transcript" | "resume-hint"`、`fullscreenScrollbar: "auto" | "always" | "hidden"` 与 `fullscreenCopyOnSelect`。getter 对未知 mode 分别回落 `regular`、`transcript` 与 `auto`;`fullscreenCopyOnSelect` 默认 `true`。四项 setter 都写 global settings。`tuiMode` 从 `/settings` 改动后立即生效,`--tui-mode` 只覆盖一次启动;fullscreen 三项只影响 fullscreen transcript,其中 `fullscreenCopyOnSelect: false` 时选区保持高亮、`Ctrl+X` 复制当前 selection [E: packages/coding-agent/src/core/settings-manager.ts:1248] [E: packages/coding-agent/src/core/settings-manager.ts:1249] [E: packages/coding-agent/src/core/settings-manager.ts:1258] [E: packages/coding-agent/src/core/settings-manager.ts:1259] [E: packages/coding-agent/src/core/settings-manager.ts:1268] [E: packages/coding-agent/src/core/settings-manager.ts:1270] [E: packages/coding-agent/src/core/settings-manager.ts:1279] [E: packages/coding-agent/src/core/settings-manager.ts:1280] [E: packages/coding-agent/docs/settings.md:69] [E: packages/coding-agent/docs/settings.md:70] [E: packages/coding-agent/docs/settings.md:71] [E: packages/coding-agent/docs/settings.md:72]。

`modelThinkingLevels` 是按 `"provider/modelId"` 覆盖启动 thinking level 的 object;可从 `/settings` → Default thinking level per model 写入 [E: packages/coding-agent/src/core/settings-manager.ts:111] [E: packages/coding-agent/src/core/settings-manager.ts:805] [E: packages/coding-agent/docs/settings.md:33]。

`compaction.modelOverrides` 是另一套精确 `"provider/modelId"` 表,只覆盖 `reserveTokens` 与 `keepRecentTokens`。键区分大小写,不是 glob;模型 ID 本身可以含 `/`(例如 `openrouter/anthropic/claude-sonnet-4`) [E: packages/coding-agent/src/core/settings-manager.ts:13] [E: packages/coding-agent/src/core/settings-manager.ts:27] [E: packages/coding-agent/docs/settings.md:121] [E: packages/coding-agent/docs/settings.md:154]。每字段独立回退:matching override → ordinary `compaction.*` → built-in `16384` / `20000` [E: packages/coding-agent/src/core/settings-manager.ts:879] [E: packages/coding-agent/src/core/settings-manager.ts:891] [E: packages/coding-agent/docs/settings.md:156]。`enabled` 不是 model-specific;`getCompactionSettings(model)` 始终用全局 `getCompactionEnabled()` [E: packages/coding-agent/src/core/settings-manager.ts:841] [E: packages/coding-agent/src/core/settings-manager.ts:897] [E: packages/coding-agent/docs/settings.md:160]。`/settings` 只保留普通 auto-compaction toggle;overrides 走 JSON [E: packages/coding-agent/docs/settings.md:160]。这与 agent-core 的 `CompactionSettings`(`enabled`/`reserveTokens`/`keepRecentTokens`,无 overrides)不是同一份 schema [I]。

`retry.maxAgentDelayMs` 默认 `60000`,封顶 agent-level 指数退避;它与 `retry.provider.maxRetryDelayMs`(默认同样 60000,封顶服务端 `retry-after`)是两套 cap [E: packages/coding-agent/src/core/settings-manager.ts:45] [E: packages/coding-agent/src/core/settings-manager.ts:927] [E: packages/coding-agent/src/core/settings-manager.ts:953] [E: packages/coding-agent/docs/settings.md:178] [E: packages/coding-agent/docs/settings.md:181] [E: packages/coding-agent/docs/settings.md:183]。

`/model` 与 `/thinking` 选择器默认只改当前 session:Enter 走 `persist: false`;只有 `app.models.save` / `app.thinking.save`(默认都是 `ctrl+s`)才 `persist: true` 写回 global startup default。用户文档同一句写的是 `/model`/`/thinking` + Ctrl+S [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4826] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4831] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5011] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5017] [E: packages/coding-agent/src/modes/interactive/components/model-selector.ts:142] [E: packages/coding-agent/src/modes/interactive/components/model-selector.ts:399] [E: packages/coding-agent/src/modes/interactive/components/thinking-selector.ts:97] [E: packages/coding-agent/src/modes/interactive/components/thinking-selector.ts:131] [E: packages/coding-agent/src/core/keybindings.ts:104] [E: packages/coding-agent/src/core/keybindings.ts:186] [E: packages/coding-agent/docs/settings.md:10]。带搜索词的 `/model <id>` 精确匹配也是 `persist: false` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4847]。

`terminal.hyperlinks` / `terminal.images` / `terminal.trueColor` 是 advanced JSON-only capability overrides,默认 `"auto"`。`getTerminalCapabilityOverrides()` 只在值为 concrete boolean、`kitty`/`iterm2` 或 `images: false`(写成 `null`)时覆盖检测;`auto` 不覆盖 [E: packages/coding-agent/src/core/settings-manager.ts:57] [E: packages/coding-agent/src/core/settings-manager.ts:58] [E: packages/coding-agent/src/core/settings-manager.ts:59] [E: packages/coding-agent/src/core/settings-manager.ts:1178] [E: packages/coding-agent/src/core/settings-manager.ts:1182] [E: packages/coding-agent/docs/settings.md:222] [E: packages/coding-agent/docs/settings.md:223] [E: packages/coding-agent/docs/settings.md:224]。

`defaultTools` 选择启动时启用的 built-in tools。省略时产品默认 `read/bash/edit/write`;可用 built-in 含 `powershell`,Windows 可用 `["read", "powershell", "edit", "write"]`。空数组关闭全部 built-in,但 extension 与 SDK custom tools 仍启用。`--tools` 会改成对全部工具(含 extension/custom)的严格 allowlist,`--no-tools` 关闭全部工具,`--no-builtin-tools` 只关 built-in defaults,`--exclude-tools` 再过滤结果。项目 `defaultTools` array 整段替换全局 array [E: packages/coding-agent/src/core/settings-manager.ts:140] [E: packages/coding-agent/src/core/settings-manager.ts:1319] [E: packages/coding-agent/docs/settings.md:262] [E: packages/coding-agent/docs/settings.md:264] [E: packages/coding-agent/docs/settings.md:272] [E: packages/coding-agent/docs/settings.md:276] [E: packages/coding-agent/docs/settings.md:280]。

`theme` 仍是 TUI theme 名;含 `/` 的 automatic theme setting 不会作为固定 theme 返回。`themes` 是本地 theme 路径列表。CLI `--use-theme` 只覆盖本次 interactive 运行,不写回 settings 文件 [E: packages/coding-agent/src/core/settings-manager.ts:115] [E: packages/coding-agent/src/core/settings-manager.ts:795] [E: packages/coding-agent/src/core/settings-manager.ts:785] [E: packages/coding-agent/src/core/settings-manager.ts:135] [E: packages/coding-agent/docs/settings.md:55]。

`markdown.mermaid` 控制 Mermaid 渲染:`"off"` / `"final"` / `"streaming"`,默认 `"streaming"`。LaTeX 由 TUI markdown 的 `renderLatex` option 渲染,不是 `Settings` 键 [E: packages/coding-agent/src/core/settings-manager.ts:74] [E: packages/coding-agent/src/core/settings-manager.ts:78] [E: packages/coding-agent/src/core/settings-manager.ts:1396] [E: packages/coding-agent/docs/settings.md:311] [U]。

用户文档把这些 key families 分成 Model & Thinking、UI & Display、Network、Warnings、Compaction、Branch Summary、Retry、Message Delivery、Terminal & Images、Shell、Tools、Sessions、Model Cycling、Markdown、Resources 等段落 [E: packages/coding-agent/docs/settings.md:26] [E: packages/coding-agent/docs/settings.md:51] [E: packages/coding-agent/docs/settings.md:88] [E: packages/coding-agent/docs/settings.md:100] [E: packages/coding-agent/docs/settings.md:114] [E: packages/coding-agent/docs/settings.md:164] [E: packages/coding-agent/docs/settings.md:171] [E: packages/coding-agent/docs/settings.md:205] [E: packages/coding-agent/docs/settings.md:215] [E: packages/coding-agent/docs/settings.md:264] [E: packages/coding-agent/docs/settings.md:294] [E: packages/coding-agent/docs/settings.md:282] [E: packages/coding-agent/docs/settings.md:330] [E: packages/coding-agent/docs/settings.md:306] [E: packages/coding-agent/docs/settings.md:313]。完整逐 key catalog 应由 [ref.coding-agent.config-keys](../../reference/config-keys.md) 承担;本 surface 节点只解释 settings 面的读写、scope、合并和默认值边界 [I]。

`PackageSource` 是 resource package 配置的特殊 shape:它可以是 string,也可以是带 `source` 的 object；`autoload: false` 让 package 从空资源集合开始，只应用显式 resource patterns，`extensions`、`skills`、`prompts`、`themes` arrays 再过滤各类资源 [E: packages/coding-agent/src/core/settings-manager.ts:95] [E: packages/coding-agent/src/core/settings-manager.ts:98] [E: packages/coding-agent/src/core/settings-manager.ts:111] [E: packages/coding-agent/src/core/settings-manager.ts:100] [E: packages/coding-agent/src/core/settings-manager.ts:101] [E: packages/coding-agent/src/core/settings-manager.ts:102] [E: packages/coding-agent/src/core/settings-manager.ts:115] [I]。用户文档同样展示了 packages 的 string form 和 object form [E: packages/coding-agent/docs/settings.md:332] [E: packages/coding-agent/docs/settings.md:340]。

## Scope 与合并

`SettingsScope` 只有 `"global"` 和 `"project"` 两个值 [E: packages/coding-agent/src/core/settings-manager.ts:199]。`SettingsManager.fromStorage(storage, options)` 默认认为 project trusted,分别尝试读取 global 和 project scope,再把读取错误收集为 `SettingsError[]` [E: packages/coding-agent/src/core/settings-manager.ts:376] [E: packages/coding-agent/src/core/settings-manager.ts:374] [E: packages/coding-agent/src/core/settings-manager.ts:375] [E: packages/coding-agent/src/core/settings-manager.ts:376] [E: packages/coding-agent/src/core/settings-manager.ts:378] [E: packages/coding-agent/src/core/settings-manager.ts:381]。constructor 最终用 `deepMergeSettings(globalSettings, projectSettings)` 形成 effective settings,所以 project scope 是 override layer [E: packages/coding-agent/src/core/settings-manager.ts:339] [E: packages/coding-agent/src/core/settings-manager.ts:338] [E: packages/coding-agent/src/core/settings-manager.ts:351] [E: packages/coding-agent/src/core/settings-manager.ts:345]。

`deepMergeSettings(base, overrides)` 以 base shallow copy 起步;override value 为 `undefined` 时跳过,base 和 override 两侧都是非数组 object 时**递归**调用 `deepMergeObjects`,其它 primitive 与 array 由 override 直接替换 [E: packages/coding-agent/src/core/settings-manager.ts:176] [E: packages/coding-agent/src/core/settings-manager.ts:167] [E: packages/coding-agent/src/core/settings-manager.ts:169] [E: packages/coding-agent/src/core/settings-manager.ts:175] [E: packages/coding-agent/src/core/settings-manager.ts:188] [E: packages/coding-agent/src/core/settings-manager.ts:184]。因此 `retry.provider` 与 `compaction.modelOverrides` 这类多层 nested object 会按 key 逐层合并,而不是只合并一层。文档写明:global/project 先递归 merge,**然后**才做 model lookup;项目可以只覆盖某一模型的一个字段,而不整表替换 [E: packages/coding-agent/docs/settings.md:158] [E: packages/coding-agent/docs/settings.md:386] [E: packages/coding-agent/docs/settings.md:397] [E: packages/coding-agent/docs/settings.md:403]。

`loadFromStorage()` 会把空文件内容视为 `{}`,有内容则 `JSON.parse()` 后进入 `migrateSettings()` [E: packages/coding-agent/src/core/settings-manager.ts:405] [E: packages/coding-agent/src/core/settings-manager.ts:416] [E: packages/coding-agent/src/core/settings-manager.ts:419] [E: packages/coding-agent/src/core/settings-manager.ts:420]。当前 migration 覆盖四类 legacy shape:`queueMode` -> `steeringMode`,boolean `websockets` -> `transport`,旧 object 形式 `skills` -> `enableSkillCommands` 与 `skills` array,以及 `retry.maxDelayMs` -> `retry.provider.maxRetryDelayMs` [E: packages/coding-agent/src/core/settings-manager.ts:436] [E: packages/coding-agent/src/core/settings-manager.ts:450] [E: packages/coding-agent/src/core/settings-manager.ts:439] [E: packages/coding-agent/src/core/settings-manager.ts:444] [E: packages/coding-agent/src/core/settings-manager.ts:445] [E: packages/coding-agent/src/core/settings-manager.ts:450] [E: packages/coding-agent/src/core/settings-manager.ts:460] [E: packages/coding-agent/src/core/settings-manager.ts:464] [E: packages/coding-agent/src/core/settings-manager.ts:483] [E: packages/coding-agent/src/core/settings-manager.ts:488]。`retry.maxDelayMs` 不会迁到 `retry.maxAgentDelayMs` [I]。

## Project Trust 门控

项目目录包含 project-local settings、resources 或 project `.agents/skills` 且没有已保存信任决策时,interactive startup 会询问是否 trust project folder;trust 后才允许加载 `.pi/settings.json` 和 `.pi` resources、安装缺失 project packages、执行 project extensions [E: packages/coding-agent/docs/settings.md:12] [E: packages/coding-agent/docs/settings.md:14]。非交互模式不会弹出 trust prompt;没有可用保存决策时,它们用 global settings 的 `defaultProjectTrust`,其中 `ask` 默认值和 `never` 会忽略 project resources,`always` 会信任它们,一次性 override 可用 `--approve`/`-a` 或 `--no-approve`/`-na` [E: packages/coding-agent/docs/settings.md:16]。

代码侧的 project trust gate 在 settings 读取和写入两边都存在:project scope 且 `projectTrusted` 为 false 时,`loadFromStorage()` 直接返回 `{}` [E: packages/coding-agent/src/core/settings-manager.ts:405] [E: packages/coding-agent/src/core/settings-manager.ts:406] [E: packages/coding-agent/src/core/settings-manager.ts:419]。`setProjectTrusted(false)` 会清空内存中的 `projectSettings`,清掉 project load error,再重新合并 effective settings [E: packages/coding-agent/src/core/settings-manager.ts:521] [E: packages/coding-agent/src/core/settings-manager.ts:518] [E: packages/coding-agent/src/core/settings-manager.ts:519] [E: packages/coding-agent/src/core/settings-manager.ts:520] [E: packages/coding-agent/src/core/settings-manager.ts:521]。project 写入前会调用 `assertProjectTrustedForWrite()`,未 trusted 时抛出 `"Project is not trusted; refusing to write project settings"` [E: packages/coding-agent/src/core/settings-manager.ts:589] [E: packages/coding-agent/src/core/settings-manager.ts:590] [E: packages/coding-agent/src/core/settings-manager.ts:591] [E: packages/coding-agent/src/core/settings-manager.ts:680] [E: packages/coding-agent/src/core/settings-manager.ts:709]。

`defaultProjectTrust` 是 global-only 用户设置,文档要求取值 `"ask"`、`"always"` 或 `"never"` [E: packages/coding-agent/docs/settings.md:18]。`SettingsManager.getDefaultProjectTrust()` 也只读取 `globalSettings.defaultProjectTrust`,并且除了 `"always"` 和 `"never"` 以外都回落为 `"ask"` [E: packages/coding-agent/src/core/settings-manager.ts:1014] [E: packages/coding-agent/src/core/settings-manager.ts:1015] [E: packages/coding-agent/src/core/settings-manager.ts:1016]。

## 常见默认值

多数默认值不集中在 `defaults.ts`;`SettingsManager` 的 getter 直接在 accessor 里提供 fallback,而 `packages/coding-agent/src/core/defaults.ts` 在本 source set 中只导出 `DEFAULT_THINKING_LEVEL = "medium"` [E: packages/coding-agent/src/core/defaults.ts:1] [E: packages/coding-agent/src/core/defaults.ts:3] [I]。`SettingsManager.getDefaultThinkingLevel()` 本身只返回 `this.settings.defaultThinkingLevel`,没有使用 `DEFAULT_THINKING_LEVEL`;默认 thinking level 的最终消费点不在本节点 source 列表内 [E: packages/coding-agent/src/core/settings-manager.ts:794] [E: packages/coding-agent/src/core/settings-manager.ts:795] [U]。

用户可见默认值与 accessor fallback 大体对应:message delivery 的 `steeringMode` 与 `followUpMode` 默认 `"one-at-a-time"`,transport 默认 `"auto"`,compaction enabled/reserve/keep recent 默认 `true`/`16384`/`20000`,retry enabled/max/base/agent-delay 默认 `true`/`3`/`2000`/`60000`,provider max retry delay 默认 `60000`,terminal image display 默认 true,image width 默认 60,terminal progress 默认 false,image auto resize 默认 true,block images 默认 false,markdown code block indent 默认两个空格,mermaid 默认 `"streaming"`,tuiMode 默认 `"regular"`,fullscreenExitOutput 默认 `"transcript"`,fullscreenCopyOnSelect 默认 `true` [E: packages/coding-agent/src/core/settings-manager.ts:757] [E: packages/coding-agent/src/core/settings-manager.ts:767] [E: packages/coding-agent/src/core/settings-manager.ts:831] [E: packages/coding-agent/src/core/settings-manager.ts:841] [E: packages/coding-agent/src/core/settings-manager.ts:18] [E: packages/coding-agent/src/core/settings-manager.ts:879] [E: packages/coding-agent/src/core/settings-manager.ts:914] [E: packages/coding-agent/src/core/settings-manager.ts:927] [E: packages/coding-agent/src/core/settings-manager.ts:949] [E: packages/coding-agent/src/core/settings-manager.ts:1188] [E: packages/coding-agent/src/core/settings-manager.ts:1201] [E: packages/coding-agent/src/core/settings-manager.ts:1235] [E: packages/coding-agent/src/core/settings-manager.ts:1249] [E: packages/coding-agent/src/core/settings-manager.ts:1259] [E: packages/coding-agent/src/core/settings-manager.ts:1280] [E: packages/coding-agent/src/core/settings-manager.ts:1289] [E: packages/coding-agent/src/core/settings-manager.ts:1302] [E: packages/coding-agent/src/core/settings-manager.ts:1392] [E: packages/coding-agent/src/core/settings-manager.ts:1398]。

部分 defaults 有环境变量或 validation fallback:`externalEditor` 优先 settings,再用 `VISUAL`、`EDITOR`,最后 Windows 为 `notepad`、其它平台为 `nano`;`terminal.clearOnShrink` 在 settings 未配置时读 `PI_CLEAR_ON_SHRINK === "1"`;`showHardwareCursor` 在 settings 未配置时读 `PI_HARDWARE_CURSOR === "1"`;`editorPaddingX` setter clamp 到 0..3,`autocompleteMaxVisible` setter clamp 到 3..20,`treeFilterMode` 非合法枚举时回落 `"default"` [E: packages/coding-agent/src/core/settings-manager.ts:1015] [E: packages/coding-agent/src/core/settings-manager.ts:974] [E: packages/coding-agent/src/core/settings-manager.ts:978] [E: packages/coding-agent/src/core/settings-manager.ts:1218] [E: packages/coding-agent/src/core/settings-manager.ts:1220] [E: packages/coding-agent/src/core/settings-manager.ts:1223] [E: packages/coding-agent/src/core/settings-manager.ts:1386] [E: packages/coding-agent/src/core/settings-manager.ts:1342] [E: packages/coding-agent/src/core/settings-manager.ts:1343] [E: packages/coding-agent/src/core/settings-manager.ts:1398] [E: packages/coding-agent/src/core/settings-manager.ts:1353] [E: packages/coding-agent/src/core/settings-manager.ts:1367] [E: packages/coding-agent/src/core/settings-manager.ts:1387]。

## Invalid settings 诊断

`collectSettingsDiagnostics(settingsManager)` 调用 `drainErrors()`,把每条 settings error 转成 `type: "warning"` diagnostic;有 path 时 message 为 `Invalid settings file ${path}: ...`,否则 `Invalid ${scope} settings: ...` [E: packages/coding-agent/src/core/settings-diagnostics.ts:4] [E: packages/coding-agent/src/core/settings-diagnostics.ts:7]。`deduplicateDiagnostics()` 按 `type\0message` 去重,保留首次出现 [E: packages/coding-agent/src/core/settings-diagnostics.ts:15] [E: packages/coding-agent/src/core/settings-diagnostics.ts:20]。

`main()` 启动时对 startup settings manager 收集一次,runtime 再收集一次,interactive 路径用 `deduplicateDiagnostics` 合并后交给 `InteractiveMode` 的 `startupDiagnostics`;TUI 对 warning 走 `showWarning`,因此 invalid settings 会在 TUI 内显示带 path 的提示,而不是只打到 stderr [E: packages/coding-agent/src/main.ts:60] [E: packages/coding-agent/src/main.ts:653] [E: packages/coding-agent/src/main.ts:781] [E: packages/coding-agent/src/main.ts:899] [E: packages/coding-agent/src/main.ts:936] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1085] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1089]。非 interactive 或存在 runtime error 时仍 `reportDiagnostics` 打到控制台 [E: packages/coding-agent/src/main.ts:898] [E: packages/coding-agent/src/main.ts:899]。

## 写回与修改语义

`SettingsManager` 持有 `globalSettings`、`projectSettings` 和合并后的 `settings`,并跟踪 global/project 各自被修改的 top-level fields 与 nested fields [E: packages/coding-agent/src/core/settings-manager.ts:311] [E: packages/coding-agent/src/core/settings-manager.ts:313] [E: packages/coding-agent/src/core/settings-manager.ts:314] [E: packages/coding-agent/src/core/settings-manager.ts:327] [E: packages/coding-agent/src/core/settings-manager.ts:317] [E: packages/coding-agent/src/core/settings-manager.ts:318] [E: packages/coding-agent/src/core/settings-manager.ts:319] [E: packages/coding-agent/src/core/settings-manager.ts:320]。global setter 直接改 `globalSettings`、标记 modified field,然后 `save()`;project setter 走 `updateProjectSettings()` 克隆 project settings、应用 update、标记 project modified field,再 `saveProjectSettings()` [E: packages/coding-agent/src/core/settings-manager.ts:568] [E: packages/coding-agent/src/core/settings-manager.ts:591] [E: packages/coding-agent/src/core/settings-manager.ts:708] [E: packages/coding-agent/src/core/settings-manager.ts:710] [E: packages/coding-agent/src/core/settings-manager.ts:699] [E: packages/coding-agent/src/core/settings-manager.ts:700] [E: packages/coding-agent/src/core/settings-manager.ts:701]。

写入不是覆盖整份 in-memory settings:`persistScopedSettings()` 在 lock callback 内重新读取当前文件、再次 migration,然后只覆盖 modified fields;如果某个 object field 只标记了 nested keys,它从当前文件的 nested object 起步,只替换这些 nested keys [E: packages/coding-agent/src/core/settings-manager.ts:632] [E: packages/coding-agent/src/core/settings-manager.ts:650] [E: packages/coding-agent/src/core/settings-manager.ts:651] [E: packages/coding-agent/src/core/settings-manager.ts:640] [E: packages/coding-agent/src/core/settings-manager.ts:643] [E: packages/coding-agent/src/core/settings-manager.ts:644] [E: packages/coding-agent/src/core/settings-manager.ts:646] [E: packages/coding-agent/src/core/settings-manager.ts:650] [E: packages/coding-agent/src/core/settings-manager.ts:663] [I]。写入任务串到 `writeQueue`,`flush()` 等待队列完成,`drainErrors()` 返回并清空累积的 settings errors [E: packages/coding-agent/src/core/settings-manager.ts:610] [E: packages/coding-agent/src/core/settings-manager.ts:611] [E: packages/coding-agent/src/core/settings-manager.ts:619] [E: packages/coding-agent/src/core/settings-manager.ts:704] [E: packages/coding-agent/src/core/settings-manager.ts:705] [E: packages/coding-agent/src/core/settings-manager.ts:708] [E: packages/coding-agent/src/core/settings-manager.ts:709] [E: packages/coding-agent/src/core/settings-manager.ts:710]。

`applyOverrides(overrides)` 只把 overrides 合并到 effective `settings`,不修改 `globalSettings` 或 `projectSettings`,也不触发 save;它适合作为 runtime override,不是持久化 settings 写入口 [E: packages/coding-agent/src/core/settings-manager.ts:563] [E: packages/coding-agent/src/core/settings-manager.ts:564] [I]。如果 global 或 project settings 文件读取时有 parse/load error,对应的 `save()` 或 `saveProjectSettings()` 会先更新 effective settings,然后直接返回,避免把内存状态写回一个已损坏的 JSON 文件 [E: packages/coding-agent/src/core/settings-manager.ts:663] [E: packages/coding-agent/src/core/settings-manager.ts:666] [E: packages/coding-agent/src/core/settings-manager.ts:679] [E: packages/coding-agent/src/core/settings-manager.ts:696] [I]。

## 与配置值解析的边界

本节点把 settings JSON 当作已经 parse 出来的 value graph,不解释 `$ENV`、`${ENV}` 或 `!cmd` 字符串解析规则 [I]。这些动态配置值语法属于 [surface.config.resolution](resolution.md) 和 [subsys.coding-agent.config-resolution](../../subsystems/coding-agent/config-resolution.md);settings manager 只在 HTTP/WebSocket timeout accessor 里调用 timeout parser,其它 settings key 的 env/command 解析应由具体消费者负责 [E: packages/coding-agent/src/core/settings-manager.ts:11] [E: packages/coding-agent/src/core/settings-manager.ts:188] [E: packages/coding-agent/src/core/settings-manager.ts:936] [E: packages/coding-agent/src/core/settings-manager.ts:957] [I]。

## Gotcha

- `docs/settings.md` 是用户文档和默认值说明的主要来源,而 `defaults.ts` 在当前 source set 中只定义 `DEFAULT_THINKING_LEVEL`;不要把所有 settings 默认值都预期为集中常量 [E: packages/coding-agent/docs/settings.md:24] [E: packages/coding-agent/src/core/defaults.ts:3] [I]。
- `compaction.modelOverrides` 与 `models.json` 里的 `modelOverrides`(provider/model 元数据覆盖)不是同一键 [I]。

## Sources

- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/core/settings-diagnostics.ts
- packages/coding-agent/src/core/defaults.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/src/modes/interactive/components/model-selector.ts
- packages/coding-agent/src/modes/interactive/components/thinking-selector.ts
- packages/coding-agent/src/core/keybindings.ts
- packages/coding-agent/docs/settings.md

## 相关

- [surface.config.resolution](resolution.md): 用户可见的 `$ENV`、`${ENV}`、`!cmd` 配置值解析语法。
- [subsys.coding-agent.settings-manager](../../subsystems/coding-agent/settings-manager.md): `SettingsManager` 的 storage、lock、migration、write queue 和 accessor 实现细节。
- [ref.coding-agent.config-keys](../../reference/config-keys.md): 配置键完整 catalog,负责逐 key 默认值、类型和含义。

---
id: surface.config.settings
title: 配置与 settings(schema/scope/合并)
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/core/defaults.ts
  - packages/coding-agent/docs/settings.md
symbols:
  - SettingsManager
  - Settings
  - PackageSource
related:
  - surface.config.resolution
  - subsys.coding-agent.settings-manager
  - ref.coding-agent.config-keys
evidence: explicit
status: verified
updated: 086c32e745
---

> `surface.config.settings` 描述 pi-coding-agent 用户可见的 settings 配置面:JSON 文件位置、global/project scope、project trust 门控、schema key families、project-over-global 合并和常见默认值边界。

## 能回答的问题

- pi 的 global settings 和 project settings 分别放在哪里?
- project settings 什么时候覆盖 global settings, nested object 怎样合并?
- `Settings` schema 覆盖哪些用户可配置能力?
- project-local `.pi/settings.json` 受哪些 trust 规则约束?
- `/settings`、`pi config` 与直接编辑 `settings.json` 的边界是什么?
- `defaults.ts`、`settings-manager.ts`、`docs/settings.md` 三者在 settings 默认值上各自负责什么?

## 配置入口

pi 使用 JSON settings 文件,并且 project settings 覆盖 global settings [E: packages/coding-agent/docs/settings.md:3]。用户文档列出的两个位置是 `~/.pi/agent/settings.json` 作为 global scope,以及当前项目的 `.pi/settings.json` 作为 project scope [E: packages/coding-agent/docs/settings.md:5] [E: packages/coding-agent/docs/settings.md:7] [E: packages/coding-agent/docs/settings.md:8]。用户可以直接编辑这些 JSON 文件,也可以用 `/settings` 修改常见选项 [E: packages/coding-agent/docs/settings.md:10]。

`SettingsManager.create(cwd, agentDir)` 是代码侧的文件入口:它构造 `FileSettingsStorage`,默认 `agentDir` 来自 `getAgentDir()`,再委托 `SettingsManager.fromStorage(...)` 读取 scope [E: packages/coding-agent/src/core/settings-manager.ts:317] [E: packages/coding-agent/src/core/settings-manager.ts:319] [E: packages/coding-agent/src/core/settings-manager.ts:322] [E: packages/coding-agent/src/core/settings-manager.ts:323]。`FileSettingsStorage` 把 global settings path 设为 `<agentDir>/settings.json`,把 project settings path 设为 `<cwd>/<CONFIG_DIR_NAME>/settings.json`;本节点用 `docs/settings.md` 确认默认用户可见目录名是 `.pi`,因为 `CONFIG_DIR_NAME` 的字面值不在本节点 source 列表内 [E: packages/coding-agent/src/core/settings-manager.ts:200] [E: packages/coding-agent/src/core/settings-manager.ts:203] [E: packages/coding-agent/src/core/settings-manager.ts:204] [E: packages/coding-agent/docs/settings.md:7] [E: packages/coding-agent/docs/settings.md:8] [U]。

## Schema 面

`Settings` 是 pi-coding-agent 的宽配置接口,覆盖 model/provider/thinking、transport、message delivery、theme/UI、compaction、branch summary、retry、shell/editor、telemetry、package/resource paths、terminal/images、model cycling、default built-in tools、tree/editor controls、markdown、warnings、sessionDir 和 network timeout/proxy 等 key families [E: packages/coding-agent/src/core/settings-manager.ts:90] [E: packages/coding-agent/src/core/settings-manager.ts:98] [E: packages/coding-agent/src/core/settings-manager.ts:123] [E: packages/coding-agent/src/core/settings-manager.ts:131] [E: packages/coding-agent/src/core/settings-manager.ts:137]。

TUI family 使用 `tuiMode: "regular" | "fullscreen"`(旧名 `uiMode` 已删除)、`fullscreenExitOutput: "transcript" | "resume-hint"` 与 `fullscreenScrollbar: "auto" | "always" | "hidden"`。getter 对未知值分别回落 `regular`、`transcript` 与 `auto`;三项 setter 都写 global settings。`tuiMode` 从 `/settings` 改动后立即生效,`--tui-mode` 只覆盖一次启动;后两项只影响 fullscreen transcript [E: packages/coding-agent/src/core/settings-manager.ts:1131] [E: packages/coding-agent/src/core/settings-manager.ts:1132] [E: packages/coding-agent/src/core/settings-manager.ts:1141] [E: packages/coding-agent/src/core/settings-manager.ts:1142] [E: packages/coding-agent/src/core/settings-manager.ts:1151] [E: packages/coding-agent/src/core/settings-manager.ts:1153] [E: packages/coding-agent/docs/settings.md:68] [E: packages/coding-agent/docs/settings.md:69] [E: packages/coding-agent/docs/settings.md:70]。

`defaultTools` 选择启动时启用的 built-in tools。省略时产品默认 `read/bash/edit/write`;空数组关闭全部 built-in,但 extension 与 SDK custom tools 仍启用。`--tools` 会改成对全部工具(含 extension/custom)的严格 allowlist,`--no-tools` 关闭全部工具,`--no-builtin-tools` 只关 built-in defaults,`--exclude-tools` 再过滤结果。项目 `defaultTools` array 整段替换全局 array [E: packages/coding-agent/src/core/settings-manager.ts:123] [E: packages/coding-agent/src/core/settings-manager.ts:1192] [E: packages/coding-agent/docs/settings.md:221] [E: packages/coding-agent/docs/settings.md:223] [E: packages/coding-agent/docs/settings.md:231]。

`theme` 仍是 TUI theme 名;含 `/` 的 automatic theme setting 不会作为固定 theme 返回。`themes` 是本地 theme 路径列表。CLI `--use-theme` 只覆盖本次 interactive 运行,不写回 settings 文件 [E: packages/coding-agent/src/core/settings-manager.ts:98] [E: packages/coding-agent/src/core/settings-manager.ts:731] [E: packages/coding-agent/src/core/settings-manager.ts:737] [E: packages/coding-agent/src/core/settings-manager.ts:118] [E: packages/coding-agent/docs/settings.md:54]。

`markdown.mermaid` 控制 Mermaid 渲染:`"off"` / `"final"` / `"streaming"`,默认 `"streaming"`。LaTeX 由 TUI markdown 的 `renderLatex` option 渲染,不是 `Settings` 键 [E: packages/coding-agent/src/core/settings-manager.ts:58] [E: packages/coding-agent/src/core/settings-manager.ts:62] [E: packages/coding-agent/src/core/settings-manager.ts:1269] [E: packages/coding-agent/docs/settings.md:262] [U]。

用户文档把这些 key families 分成 Model & Thinking、UI & Display、Network、Warnings、Compaction、Branch Summary、Retry、Message Delivery、Terminal & Images、Shell、Sessions、Model Cycling、Markdown、Resources 等段落 [E: packages/coding-agent/docs/settings.md:26] [E: packages/coding-agent/docs/settings.md:50] [E: packages/coding-agent/docs/settings.md:86] [E: packages/coding-agent/docs/settings.md:98] [E: packages/coding-agent/docs/settings.md:112] [E: packages/coding-agent/docs/settings.md:130] [E: packages/coding-agent/docs/settings.md:137] [E: packages/coding-agent/docs/settings.md:167] [E: packages/coding-agent/docs/settings.md:177] [E: packages/coding-agent/docs/settings.md:187] [E: packages/coding-agent/docs/settings.md:233] [E: packages/coding-agent/docs/settings.md:245] [E: packages/coding-agent/docs/settings.md:257] [E: packages/coding-agent/docs/settings.md:264]。完整逐 key catalog 应由 [ref.coding-agent.config-keys](../../reference/config-keys.md) 承担;本 surface 节点只解释 settings 面的读写、scope、合并和默认值边界 [I]。

`PackageSource` 是 resource package 配置的特殊 shape:它可以是 string,也可以是带 `source` 的 object；`autoload: false` 让 package 从空资源集合开始，只应用显式 resource patterns，`extensions`、`skills`、`prompts`、`themes` arrays 再过滤各类资源 [E: packages/coding-agent/src/core/settings-manager.ts:79] [E: packages/coding-agent/src/core/settings-manager.ts:82] [E: packages/coding-agent/src/core/settings-manager.ts:83] [E: packages/coding-agent/src/core/settings-manager.ts:84] [E: packages/coding-agent/src/core/settings-manager.ts:85] [E: packages/coding-agent/src/core/settings-manager.ts:86] [E: packages/coding-agent/src/core/settings-manager.ts:87] [I]。用户文档同样展示了 packages 的 string form 和 object form [E: packages/coding-agent/docs/settings.md:281] [E: packages/coding-agent/docs/settings.md:283] [E: packages/coding-agent/docs/settings.md:291]。

## Scope 与合并

`SettingsScope` 只有 `"global"` 和 `"project"` 两个值 [E: packages/coding-agent/src/core/settings-manager.ts:181]。`SettingsManager.fromStorage(storage, options)` 默认认为 project trusted,分别尝试读取 global 和 project scope,再把读取错误收集为 `SettingsError[]` [E: packages/coding-agent/src/core/settings-manager.ts:327] [E: packages/coding-agent/src/core/settings-manager.ts:328] [E: packages/coding-agent/src/core/settings-manager.ts:329] [E: packages/coding-agent/src/core/settings-manager.ts:330] [E: packages/coding-agent/src/core/settings-manager.ts:331] [E: packages/coding-agent/src/core/settings-manager.ts:332] [E: packages/coding-agent/src/core/settings-manager.ts:336]。constructor 最终用 `deepMergeSettings(globalSettings, projectSettings)` 形成 effective settings,所以 project scope 是 override layer [E: packages/coding-agent/src/core/settings-manager.ts:297] [E: packages/coding-agent/src/core/settings-manager.ts:307] [E: packages/coding-agent/src/core/settings-manager.ts:308] [E: packages/coding-agent/src/core/settings-manager.ts:313]。

`deepMergeSettings(base, overrides)` 以 base shallow copy 起步;override value 为 `undefined` 时跳过,base 和 override 两侧都是非数组 object 时**递归**调用 `deepMergeObjects`,其它 primitive 与 array 由 override 直接替换 [E: packages/coding-agent/src/core/settings-manager.ts:146] [E: packages/coding-agent/src/core/settings-manager.ts:149] [E: packages/coding-agent/src/core/settings-manager.ts:151] [E: packages/coding-agent/src/core/settings-manager.ts:157] [E: packages/coding-agent/src/core/settings-manager.ts:158] [E: packages/coding-agent/src/core/settings-manager.ts:166] [E: packages/coding-agent/src/core/settings-manager.ts:166]。因此 `retry.provider` 这类多层 nested object 会按 key 逐层合并,而不是只合并一层。用户文档的 project override 示例也说明 `.pi/settings.json` 覆盖 global settings,并保留 nested object 里未被 project 覆盖的字段 [E: packages/coding-agent/docs/settings.md:332] [E: packages/coding-agent/docs/settings.md:334] [E: packages/coding-agent/docs/settings.md:339] [E: packages/coding-agent/docs/settings.md:345] [E: packages/coding-agent/docs/settings.md:350] [E: packages/coding-agent/docs/settings.md:351]。

`loadFromStorage()` 会把空文件内容视为 `{}`,有内容则 `JSON.parse()` 后进入 `migrateSettings()` [E: packages/coding-agent/src/core/settings-manager.ts:358] [E: packages/coding-agent/src/core/settings-manager.ts:369] [E: packages/coding-agent/src/core/settings-manager.ts:372] [E: packages/coding-agent/src/core/settings-manager.ts:373]。当前 migration 覆盖四类 legacy shape:`queueMode` -> `steeringMode`,boolean `websockets` -> `transport`,旧 object 形式 `skills` -> `enableSkillCommands` 与 `skills` array,以及 `retry.maxDelayMs` -> `retry.provider.maxRetryDelayMs` [E: packages/coding-agent/src/core/settings-manager.ts:389] [E: packages/coding-agent/src/core/settings-manager.ts:391] [E: packages/coding-agent/src/core/settings-manager.ts:392] [E: packages/coding-agent/src/core/settings-manager.ts:397] [E: packages/coding-agent/src/core/settings-manager.ts:398] [E: packages/coding-agent/src/core/settings-manager.ts:403] [E: packages/coding-agent/src/core/settings-manager.ts:413] [E: packages/coding-agent/src/core/settings-manager.ts:417] [E: packages/coding-agent/src/core/settings-manager.ts:436] [E: packages/coding-agent/src/core/settings-manager.ts:439]。

## Project Trust 门控

项目目录包含 project-local settings、resources 或 project `.agents/skills` 且没有已保存信任决策时,interactive startup 会询问是否 trust project folder;trust 后才允许加载 `.pi/settings.json` 和 `.pi` resources、安装缺失 project packages、执行 project extensions [E: packages/coding-agent/docs/settings.md:12] [E: packages/coding-agent/docs/settings.md:14]。非交互模式不会弹出 trust prompt;没有可用保存决策时,它们用 global settings 的 `defaultProjectTrust`,其中 `ask` 默认值和 `never` 会忽略 project resources,`always` 会信任它们,一次性 override 可用 `--approve`/`-a` 或 `--no-approve`/`-na` [E: packages/coding-agent/docs/settings.md:16]。

代码侧的 project trust gate 在 settings 读取和写入两边都存在:project scope 且 `projectTrusted` 为 false 时,`loadFromStorage()` 直接返回 `{}` [E: packages/coding-agent/src/core/settings-manager.ts:358] [E: packages/coding-agent/src/core/settings-manager.ts:359] [E: packages/coding-agent/src/core/settings-manager.ts:360]。`setProjectTrusted(false)` 会清空内存中的 `projectSettings`,清掉 project load error,再重新合并 effective settings [E: packages/coding-agent/src/core/settings-manager.ts:462] [E: packages/coding-agent/src/core/settings-manager.ts:471] [E: packages/coding-agent/src/core/settings-manager.ts:472] [E: packages/coding-agent/src/core/settings-manager.ts:473] [E: packages/coding-agent/src/core/settings-manager.ts:474]。project 写入前会调用 `assertProjectTrustedForWrite()`,未 trusted 时抛出 `"Project is not trusted; refusing to write project settings"` [E: packages/coding-agent/src/core/settings-manager.ts:542] [E: packages/coding-agent/src/core/settings-manager.ts:543] [E: packages/coding-agent/src/core/settings-manager.ts:544] [E: packages/coding-agent/src/core/settings-manager.ts:634] [E: packages/coding-agent/src/core/settings-manager.ts:651]。

`defaultProjectTrust` 是 global-only 用户设置,文档要求取值 `"ask"`、`"always"` 或 `"never"` [E: packages/coding-agent/docs/settings.md:18]。`SettingsManager.getDefaultProjectTrust()` 也只读取 `globalSettings.defaultProjectTrust`,并且除了 `"always"` 和 `"never"` 以外都回落为 `"ask"` [E: packages/coding-agent/src/core/settings-manager.ts:907] [E: packages/coding-agent/src/core/settings-manager.ts:908] [E: packages/coding-agent/src/core/settings-manager.ts:909]。

## 常见默认值

多数默认值不集中在 `defaults.ts`;`SettingsManager` 的 getter 直接在 accessor 里提供 fallback,而 `packages/coding-agent/src/core/defaults.ts` 在本 source set 中只导出 `DEFAULT_THINKING_LEVEL = "medium"` [E: packages/coding-agent/src/core/defaults.ts:1] [E: packages/coding-agent/src/core/defaults.ts:3] [I]。`SettingsManager.getDefaultThinkingLevel()` 本身只返回 `this.settings.defaultThinkingLevel`,没有使用 `DEFAULT_THINKING_LEVEL`;默认 thinking level 的最终消费点不在本节点 source 列表内 [E: packages/coding-agent/src/core/settings-manager.ts:744] [E: packages/coding-agent/src/core/settings-manager.ts:749] [U]。

用户可见默认值与 accessor fallback 大体对应:message delivery 的 `steeringMode` 与 `followUpMode` 默认 `"one-at-a-time"`,transport 默认 `"auto"`,compaction enabled/reserve/keep recent 默认 `true`/`16384`/`20000`,retry enabled/max/base 默认 `true`/`3`/`2000`,provider max retry delay 默认 `60000`,terminal image display 默认 true,image width 默认 60,terminal progress 默认 false,image auto resize 默认 true,block images 默认 false,markdown code block indent 默认两个空格,mermaid 默认 `"streaming"`,tuiMode 默认 `"regular"`,fullscreenExitOutput 默认 `"transcript"` [E: packages/coding-agent/src/core/settings-manager.ts:711] [E: packages/coding-agent/src/core/settings-manager.ts:721] [E: packages/coding-agent/src/core/settings-manager.ts:758] [E: packages/coding-agent/src/core/settings-manager.ts:768] [E: packages/coding-agent/src/core/settings-manager.ts:781] [E: packages/coding-agent/src/core/settings-manager.ts:785] [E: packages/coding-agent/src/core/settings-manager.ts:808] [E: packages/coding-agent/src/core/settings-manager.ts:821] [E: packages/coding-agent/src/core/settings-manager.ts:842] [E: packages/coding-agent/src/core/settings-manager.ts:1071] [E: packages/coding-agent/src/core/settings-manager.ts:1084] [E: packages/coding-agent/src/core/settings-manager.ts:1118] [E: packages/coding-agent/src/core/settings-manager.ts:1132] [E: packages/coding-agent/src/core/settings-manager.ts:1142] [E: packages/coding-agent/src/core/settings-manager.ts:1162] [E: packages/coding-agent/src/core/settings-manager.ts:1175] [E: packages/coding-agent/src/core/settings-manager.ts:1265] [E: packages/coding-agent/src/core/settings-manager.ts:1271]。

部分 defaults 有环境变量或 validation fallback:`externalEditor` 优先 settings,再用 `VISUAL`、`EDITOR`,最后 Windows 为 `notepad`、其它平台为 `nano`;`terminal.clearOnShrink` 在 settings 未配置时读 `PI_CLEAR_ON_SHRINK === "1"`;`showHardwareCursor` 在 settings 未配置时读 `PI_HARDWARE_CURSOR === "1"`;`editorPaddingX` setter clamp 到 0..3,`autocompleteMaxVisible` setter clamp 到 3..20,`treeFilterMode` 非合法枚举时回落 `"default"` [E: packages/coding-agent/src/core/settings-manager.ts:862] [E: packages/coding-agent/src/core/settings-manager.ts:867] [E: packages/coding-agent/src/core/settings-manager.ts:871] [E: packages/coding-agent/src/core/settings-manager.ts:1101] [E: packages/coding-agent/src/core/settings-manager.ts:1103] [E: packages/coding-agent/src/core/settings-manager.ts:1106] [E: packages/coding-agent/src/core/settings-manager.ts:1213] [E: packages/coding-agent/src/core/settings-manager.ts:1215] [E: packages/coding-agent/src/core/settings-manager.ts:1216] [E: packages/coding-agent/src/core/settings-manager.ts:1225] [E: packages/coding-agent/src/core/settings-manager.ts:1226] [E: packages/coding-agent/src/core/settings-manager.ts:1239] [E: packages/coding-agent/src/core/settings-manager.ts:1240] [E: packages/coding-agent/src/core/settings-manager.ts:1259] [E: packages/coding-agent/src/core/settings-manager.ts:1260]。

## 写回与修改语义

`SettingsManager` 持有 `globalSettings`、`projectSettings` 和合并后的 `settings`,并跟踪 global/project 各自被修改的 top-level fields 与 nested fields [E: packages/coding-agent/src/core/settings-manager.ts:282] [E: packages/coding-agent/src/core/settings-manager.ts:284] [E: packages/coding-agent/src/core/settings-manager.ts:285] [E: packages/coding-agent/src/core/settings-manager.ts:286] [E: packages/coding-agent/src/core/settings-manager.ts:288] [E: packages/coding-agent/src/core/settings-manager.ts:289] [E: packages/coding-agent/src/core/settings-manager.ts:290] [E: packages/coding-agent/src/core/settings-manager.ts:291]。global setter 直接改 `globalSettings`、标记 modified field,然后 `save()`;project setter 走 `updateProjectSettings()` 克隆 project settings、应用 update、标记 project modified field,再 `saveProjectSettings()` [E: packages/coding-agent/src/core/settings-manager.ts:521] [E: packages/coding-agent/src/core/settings-manager.ts:532] [E: packages/coding-agent/src/core/settings-manager.ts:650] [E: packages/coding-agent/src/core/settings-manager.ts:652] [E: packages/coding-agent/src/core/settings-manager.ts:653] [E: packages/coding-agent/src/core/settings-manager.ts:654] [E: packages/coding-agent/src/core/settings-manager.ts:655]。

写入不是覆盖整份 in-memory settings:`persistScopedSettings()` 在 lock callback 内重新读取当前文件、再次 migration,然后只覆盖 modified fields;如果某个 object field 只标记了 nested keys,它从当前文件的 nested object 起步,只替换这些 nested keys [E: packages/coding-agent/src/core/settings-manager.ts:586] [E: packages/coding-agent/src/core/settings-manager.ts:592] [E: packages/coding-agent/src/core/settings-manager.ts:593] [E: packages/coding-agent/src/core/settings-manager.ts:594] [E: packages/coding-agent/src/core/settings-manager.ts:596] [E: packages/coding-agent/src/core/settings-manager.ts:597] [E: packages/coding-agent/src/core/settings-manager.ts:599] [E: packages/coding-agent/src/core/settings-manager.ts:601] [E: packages/coding-agent/src/core/settings-manager.ts:603] [E: packages/coding-agent/src/core/settings-manager.ts:604] [E: packages/coding-agent/src/core/settings-manager.ts:605] [I]。写入任务串到 `writeQueue`,`flush()` 等待队列完成,`drainErrors()` 返回并清空累积的 settings errors [E: packages/coding-agent/src/core/settings-manager.ts:564] [E: packages/coding-agent/src/core/settings-manager.ts:565] [E: packages/coding-agent/src/core/settings-manager.ts:573] [E: packages/coding-agent/src/core/settings-manager.ts:658] [E: packages/coding-agent/src/core/settings-manager.ts:659] [E: packages/coding-agent/src/core/settings-manager.ts:662] [E: packages/coding-agent/src/core/settings-manager.ts:663] [E: packages/coding-agent/src/core/settings-manager.ts:664]。

`applyOverrides(overrides)` 只把 overrides 合并到 effective `settings`,不修改 `globalSettings` 或 `projectSettings`,也不触发 save;它适合作为 runtime override,不是持久化 settings 写入口 [E: packages/coding-agent/src/core/settings-manager.ts:516] [E: packages/coding-agent/src/core/settings-manager.ts:517] [I]。如果 global 或 project settings 文件读取时有 parse/load error,对应的 `save()` 或 `saveProjectSettings()` 会先更新 effective settings,然后直接返回,避免把内存状态写回一个已损坏的 JSON 文件 [E: packages/coding-agent/src/core/settings-manager.ts:617] [E: packages/coding-agent/src/core/settings-manager.ts:620] [E: packages/coding-agent/src/core/settings-manager.ts:633] [E: packages/coding-agent/src/core/settings-manager.ts:638] [I]。

## 与配置值解析的边界

本节点把 settings JSON 当作已经 parse 出来的 value graph,不解释 `$ENV`、`${ENV}` 或 `!cmd` 字符串解析规则 [I]。这些动态配置值语法属于 [surface.config.resolution](resolution.md) 和 [subsys.coding-agent.config-resolution](../../subsystems/coding-agent/config-resolution.md);settings manager 只在 HTTP/WebSocket timeout accessor 里调用 timeout parser,其它 settings key 的 env/command 解析应由具体消费者负责 [E: packages/coding-agent/src/core/settings-manager.ts:10] [E: packages/coding-agent/src/core/settings-manager.ts:170] [E: packages/coding-agent/src/core/settings-manager.ts:829] [E: packages/coding-agent/src/core/settings-manager.ts:850] [I]。

## Gotcha

- `docs/settings.md` 是用户文档和默认值说明的主要来源,而 `defaults.ts` 在当前 source set 中只定义 `DEFAULT_THINKING_LEVEL`;不要把所有 settings 默认值都预期为集中常量 [E: packages/coding-agent/docs/settings.md:24] [E: packages/coding-agent/src/core/defaults.ts:3] [I]。

## Sources

- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/core/defaults.ts
- packages/coding-agent/docs/settings.md

## 相关

- [surface.config.resolution](resolution.md): 用户可见的 `$ENV`、`${ENV}`、`!cmd` 配置值解析语法。
- [subsys.coding-agent.settings-manager](../../subsystems/coding-agent/settings-manager.md): `SettingsManager` 的 storage、lock、migration、write queue 和 accessor 实现细节。
- [ref.coding-agent.config-keys](../../reference/config-keys.md): 配置键完整 catalog,负责逐 key 默认值、类型和含义。

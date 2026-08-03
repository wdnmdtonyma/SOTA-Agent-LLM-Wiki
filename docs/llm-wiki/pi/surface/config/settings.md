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
updated: c1019d9202
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

`SettingsManager.create(cwd, agentDir)` 是代码侧的文件入口:它构造 `FileSettingsStorage`,默认 `agentDir` 来自 `getAgentDir()`,再委托 `SettingsManager.fromStorage(...)` 读取 scope [E: packages/coding-agent/src/core/settings-manager.ts:314] [E: packages/coding-agent/src/core/settings-manager.ts:316] [E: packages/coding-agent/src/core/settings-manager.ts:319] [E: packages/coding-agent/src/core/settings-manager.ts:320]。`FileSettingsStorage` 把 global settings path 设为 `<agentDir>/settings.json`,把 project settings path 设为 `<cwd>/<CONFIG_DIR_NAME>/settings.json`;本节点用 `docs/settings.md` 确认默认用户可见目录名是 `.pi`,因为 `CONFIG_DIR_NAME` 的字面值不在本节点 source 列表内 [E: packages/coding-agent/src/core/settings-manager.ts:197] [E: packages/coding-agent/src/core/settings-manager.ts:200] [E: packages/coding-agent/src/core/settings-manager.ts:201] [E: packages/coding-agent/docs/settings.md:7] [E: packages/coding-agent/docs/settings.md:8] [U]。

## Schema 面

`Settings` 是 pi-coding-agent 的宽配置接口,覆盖 model/provider/thinking、transport、message delivery、theme/UI、compaction、branch summary、retry、shell/editor、telemetry、package/resource paths、terminal/images、model cycling、tree/editor controls、markdown、warnings、sessionDir 和 network timeout/proxy 等 key families [E: packages/coding-agent/src/core/settings-manager.ts:86] [E: packages/coding-agent/src/core/settings-manager.ts:88] [E: packages/coding-agent/src/core/settings-manager.ts:87] [E: packages/coding-agent/src/core/settings-manager.ts:95] [E: packages/coding-agent/src/core/settings-manager.ts:97] [E: packages/coding-agent/src/core/settings-manager.ts:100] [E: packages/coding-agent/src/core/settings-manager.ts:107] [E: packages/coding-agent/src/core/settings-manager.ts:110] [E: packages/coding-agent/src/core/settings-manager.ts:116] [E: packages/coding-agent/src/core/settings-manager.ts:118] [E: packages/coding-agent/src/core/settings-manager.ts:128] [E: packages/coding-agent/src/core/settings-manager.ts:129] [E: packages/coding-agent/src/core/settings-manager.ts:131] [E: packages/coding-agent/src/core/settings-manager.ts:132] [E: packages/coding-agent/src/core/settings-manager.ts:133]。

UI family 新增 `uiMode: "regular" | "fullscreen"` 与 `fullscreenScrollbar: "auto" | "always" | "hidden"`。getter 对未知值分别回落 `regular` 与 `auto`;两项 setter 都写 global settings，前者从 `/settings` 改动后需要重启，后者只影响 fullscreen transcript [E: packages/coding-agent/src/core/settings-manager.ts:1128] [E: packages/coding-agent/src/core/settings-manager.ts:1129] [E: packages/coding-agent/src/core/settings-manager.ts:1132] [E: packages/coding-agent/src/core/settings-manager.ts:1135] [E: packages/coding-agent/src/core/settings-manager.ts:1138] [E: packages/coding-agent/src/core/settings-manager.ts:1140] [E: packages/coding-agent/src/core/settings-manager.ts:1143] [E: packages/coding-agent/src/core/settings-manager.ts:1146] [E: packages/coding-agent/docs/settings.md:68] [E: packages/coding-agent/docs/settings.md:69]。

用户文档把这些 key families 分成 Model & Thinking、UI & Display、Network、Warnings、Compaction、Branch Summary、Retry、Message Delivery、Terminal & Images、Shell、Sessions、Model Cycling、Markdown、Resources 等段落 [E: packages/coding-agent/docs/settings.md:26] [E: packages/coding-agent/docs/settings.md:50] [E: packages/coding-agent/docs/settings.md:85] [E: packages/coding-agent/docs/settings.md:97] [E: packages/coding-agent/docs/settings.md:111] [E: packages/coding-agent/docs/settings.md:129] [E: packages/coding-agent/docs/settings.md:136] [E: packages/coding-agent/docs/settings.md:166] [E: packages/coding-agent/docs/settings.md:176] [E: packages/coding-agent/docs/settings.md:186] [E: packages/coding-agent/docs/settings.md:202] [E: packages/coding-agent/docs/settings.md:214] [E: packages/coding-agent/docs/settings.md:226] [E: packages/coding-agent/docs/settings.md:232]。完整逐 key catalog 应由 [ref.coding-agent.config-keys](../../reference/config-keys.md) 承担;本 surface 节点只解释 settings 面的读写、scope、合并和默认值边界 [I]。

`PackageSource` 是 resource package 配置的特殊 shape:它可以是 string,也可以是带 `source` 的 object；`autoload: false` 让 package 从空资源集合开始，只应用显式 resource patterns，`extensions`、`skills`、`prompts`、`themes` arrays 再过滤各类资源 [E: packages/coding-agent/src/core/settings-manager.ts:75] [E: packages/coding-agent/src/core/settings-manager.ts:78] [E: packages/coding-agent/src/core/settings-manager.ts:79] [E: packages/coding-agent/src/core/settings-manager.ts:80] [E: packages/coding-agent/src/core/settings-manager.ts:81] [E: packages/coding-agent/src/core/settings-manager.ts:82] [E: packages/coding-agent/src/core/settings-manager.ts:83] [I]。用户文档同样展示了 packages 的 string form 和 object form [E: packages/coding-agent/docs/settings.md:249] [E: packages/coding-agent/docs/settings.md:251] [E: packages/coding-agent/docs/settings.md:259]。

## Scope 与合并

`SettingsScope` 只有 `"global"` 和 `"project"` 两个值 [E: packages/coding-agent/src/core/settings-manager.ts:178]。`SettingsManager.fromStorage(storage, options)` 默认认为 project trusted,分别尝试读取 global 和 project scope,再把读取错误收集为 `SettingsError[]` [E: packages/coding-agent/src/core/settings-manager.ts:324] [E: packages/coding-agent/src/core/settings-manager.ts:325] [E: packages/coding-agent/src/core/settings-manager.ts:326] [E: packages/coding-agent/src/core/settings-manager.ts:327] [E: packages/coding-agent/src/core/settings-manager.ts:328] [E: packages/coding-agent/src/core/settings-manager.ts:329] [E: packages/coding-agent/src/core/settings-manager.ts:333]。constructor 最终用 `deepMergeSettings(globalSettings, projectSettings)` 形成 effective settings,所以 project scope 是 override layer [E: packages/coding-agent/src/core/settings-manager.ts:294] [E: packages/coding-agent/src/core/settings-manager.ts:304] [E: packages/coding-agent/src/core/settings-manager.ts:305] [E: packages/coding-agent/src/core/settings-manager.ts:310]。

`deepMergeSettings(base, overrides)` 以 base shallow copy 起步;override value 为 `undefined` 时跳过,base 和 override 两侧都是非数组 object 时合并这一层 nested object,其它 primitive 与 array 由 override 直接替换 [E: packages/coding-agent/src/core/settings-manager.ts:137] [E: packages/coding-agent/src/core/settings-manager.ts:138] [E: packages/coding-agent/src/core/settings-manager.ts:140] [E: packages/coding-agent/src/core/settings-manager.ts:144] [E: packages/coding-agent/src/core/settings-manager.ts:150] [E: packages/coding-agent/src/core/settings-manager.ts:152] [E: packages/coding-agent/src/core/settings-manager.ts:157] [E: packages/coding-agent/src/core/settings-manager.ts:160]。用户文档的 project override 示例也说明 `.pi/settings.json` 覆盖 global settings,并保留 nested object 里未被 project 覆盖的字段 [E: packages/coding-agent/docs/settings.md:300] [E: packages/coding-agent/docs/settings.md:302] [E: packages/coding-agent/docs/settings.md:307] [E: packages/coding-agent/docs/settings.md:313] [E: packages/coding-agent/docs/settings.md:318] [E: packages/coding-agent/docs/settings.md:319]。

`loadFromStorage()` 会把空文件内容视为 `{}`,有内容则 `JSON.parse()` 后进入 `migrateSettings()` [E: packages/coding-agent/src/core/settings-manager.ts:355] [E: packages/coding-agent/src/core/settings-manager.ts:366] [E: packages/coding-agent/src/core/settings-manager.ts:369] [E: packages/coding-agent/src/core/settings-manager.ts:370]。当前 migration 覆盖四类 legacy shape:`queueMode` -> `steeringMode`,boolean `websockets` -> `transport`,旧 object 形式 `skills` -> `enableSkillCommands` 与 `skills` array,以及 `retry.maxDelayMs` -> `retry.provider.maxRetryDelayMs` [E: packages/coding-agent/src/core/settings-manager.ts:386] [E: packages/coding-agent/src/core/settings-manager.ts:388] [E: packages/coding-agent/src/core/settings-manager.ts:389] [E: packages/coding-agent/src/core/settings-manager.ts:394] [E: packages/coding-agent/src/core/settings-manager.ts:395] [E: packages/coding-agent/src/core/settings-manager.ts:400] [E: packages/coding-agent/src/core/settings-manager.ts:410] [E: packages/coding-agent/src/core/settings-manager.ts:414] [E: packages/coding-agent/src/core/settings-manager.ts:433] [E: packages/coding-agent/src/core/settings-manager.ts:436]。

## Project Trust 门控

项目目录包含 project-local settings、resources 或 project `.agents/skills` 且没有已保存信任决策时,interactive startup 会询问是否 trust project folder;trust 后才允许加载 `.pi/settings.json` 和 `.pi` resources、安装缺失 project packages、执行 project extensions [E: packages/coding-agent/docs/settings.md:12] [E: packages/coding-agent/docs/settings.md:14]。非交互模式不会弹出 trust prompt;没有可用保存决策时,它们用 global settings 的 `defaultProjectTrust`,其中 `ask` 默认值和 `never` 会忽略 project resources,`always` 会信任它们,一次性 override 可用 `--approve`/`-a` 或 `--no-approve`/`-na` [E: packages/coding-agent/docs/settings.md:16]。

代码侧的 project trust gate 在 settings 读取和写入两边都存在:project scope 且 `projectTrusted` 为 false 时,`loadFromStorage()` 直接返回 `{}` [E: packages/coding-agent/src/core/settings-manager.ts:355] [E: packages/coding-agent/src/core/settings-manager.ts:356] [E: packages/coding-agent/src/core/settings-manager.ts:357]。`setProjectTrusted(false)` 会清空内存中的 `projectSettings`,清掉 project load error,再重新合并 effective settings [E: packages/coding-agent/src/core/settings-manager.ts:459] [E: packages/coding-agent/src/core/settings-manager.ts:468] [E: packages/coding-agent/src/core/settings-manager.ts:469] [E: packages/coding-agent/src/core/settings-manager.ts:470] [E: packages/coding-agent/src/core/settings-manager.ts:471]。project 写入前会调用 `assertProjectTrustedForWrite()`,未 trusted 时抛出 `"Project is not trusted; refusing to write project settings"` [E: packages/coding-agent/src/core/settings-manager.ts:539] [E: packages/coding-agent/src/core/settings-manager.ts:540] [E: packages/coding-agent/src/core/settings-manager.ts:541] [E: packages/coding-agent/src/core/settings-manager.ts:631] [E: packages/coding-agent/src/core/settings-manager.ts:648]。

`defaultProjectTrust` 是 global-only 用户设置,文档要求取值 `"ask"`、`"always"` 或 `"never"` [E: packages/coding-agent/docs/settings.md:18]。`SettingsManager.getDefaultProjectTrust()` 也只读取 `globalSettings.defaultProjectTrust`,并且除了 `"always"` 和 `"never"` 以外都回落为 `"ask"` [E: packages/coding-agent/src/core/settings-manager.ts:904] [E: packages/coding-agent/src/core/settings-manager.ts:905] [E: packages/coding-agent/src/core/settings-manager.ts:906]。

## 常见默认值

多数默认值不集中在 `defaults.ts`;`SettingsManager` 的 getter 直接在 accessor 里提供 fallback,而 `packages/coding-agent/src/core/defaults.ts` 在本 source set 中只导出 `DEFAULT_THINKING_LEVEL = "medium"` [E: packages/coding-agent/src/core/defaults.ts:1] [E: packages/coding-agent/src/core/defaults.ts:3] [I]。`SettingsManager.getDefaultThinkingLevel()` 本身只返回 `this.settings.defaultThinkingLevel`,没有使用 `DEFAULT_THINKING_LEVEL`;默认 thinking level 的最终消费点不在本节点 source 列表内 [E: packages/coding-agent/src/core/settings-manager.ts:741] [E: packages/coding-agent/src/core/settings-manager.ts:746] [U]。

用户可见默认值与 accessor fallback 大体对应:message delivery 的 `steeringMode` 与 `followUpMode` 默认 `"one-at-a-time"`,transport 默认 `"auto"`,compaction enabled/reserve/keep recent 默认 `true`/`16384`/`20000`,retry enabled/max/base 默认 `true`/`3`/`2000`,provider max retry delay 默认 `60000`,terminal image display 默认 true,image width 默认 60,terminal progress 默认 false,image auto resize 默认 true,block images 默认 false,markdown code block indent 默认两个空格 [E: packages/coding-agent/src/core/settings-manager.ts:708] [E: packages/coding-agent/src/core/settings-manager.ts:718] [E: packages/coding-agent/src/core/settings-manager.ts:755] [E: packages/coding-agent/src/core/settings-manager.ts:765] [E: packages/coding-agent/src/core/settings-manager.ts:778] [E: packages/coding-agent/src/core/settings-manager.ts:782] [E: packages/coding-agent/src/core/settings-manager.ts:805] [E: packages/coding-agent/src/core/settings-manager.ts:818] [E: packages/coding-agent/src/core/settings-manager.ts:821] [E: packages/coding-agent/src/core/settings-manager.ts:822] [E: packages/coding-agent/src/core/settings-manager.ts:839] [E: packages/coding-agent/src/core/settings-manager.ts:843] [E: packages/coding-agent/src/core/settings-manager.ts:1068] [E: packages/coding-agent/src/core/settings-manager.ts:1081] [E: packages/coding-agent/src/core/settings-manager.ts:1115] [E: packages/coding-agent/src/core/settings-manager.ts:1149] [E: packages/coding-agent/src/core/settings-manager.ts:1162] [E: packages/coding-agent/src/core/settings-manager.ts:1247]。

部分 defaults 有环境变量或 validation fallback:`externalEditor` 优先 settings,再用 `VISUAL`、`EDITOR`,最后 Windows 为 `notepad`、其它平台为 `nano`;`terminal.clearOnShrink` 在 settings 未配置时读 `PI_CLEAR_ON_SHRINK === "1"`;`showHardwareCursor` 在 settings 未配置时读 `PI_HARDWARE_CURSOR === "1"`;`editorPaddingX` setter clamp 到 0..3,`autocompleteMaxVisible` setter clamp 到 3..20,`treeFilterMode` 非合法枚举时回落 `"default"` [E: packages/coding-agent/src/core/settings-manager.ts:859] [E: packages/coding-agent/src/core/settings-manager.ts:864] [E: packages/coding-agent/src/core/settings-manager.ts:868] [E: packages/coding-agent/src/core/settings-manager.ts:1098] [E: packages/coding-agent/src/core/settings-manager.ts:1100] [E: packages/coding-agent/src/core/settings-manager.ts:1103] [E: packages/coding-agent/src/core/settings-manager.ts:1195] [E: packages/coding-agent/src/core/settings-manager.ts:1197] [E: packages/coding-agent/src/core/settings-manager.ts:1198] [E: packages/coding-agent/src/core/settings-manager.ts:1207] [E: packages/coding-agent/src/core/settings-manager.ts:1208] [E: packages/coding-agent/src/core/settings-manager.ts:1221] [E: packages/coding-agent/src/core/settings-manager.ts:1222] [E: packages/coding-agent/src/core/settings-manager.ts:1241] [E: packages/coding-agent/src/core/settings-manager.ts:1242]。

## 写回与修改语义

`SettingsManager` 持有 `globalSettings`、`projectSettings` 和合并后的 `settings`,并跟踪 global/project 各自被修改的 top-level fields 与 nested fields [E: packages/coding-agent/src/core/settings-manager.ts:279] [E: packages/coding-agent/src/core/settings-manager.ts:281] [E: packages/coding-agent/src/core/settings-manager.ts:282] [E: packages/coding-agent/src/core/settings-manager.ts:283] [E: packages/coding-agent/src/core/settings-manager.ts:285] [E: packages/coding-agent/src/core/settings-manager.ts:286] [E: packages/coding-agent/src/core/settings-manager.ts:287] [E: packages/coding-agent/src/core/settings-manager.ts:288]。global setter 直接改 `globalSettings`、标记 modified field,然后 `save()`;project setter 走 `updateProjectSettings()` 克隆 project settings、应用 update、标记 project modified field,再 `saveProjectSettings()` [E: packages/coding-agent/src/core/settings-manager.ts:518] [E: packages/coding-agent/src/core/settings-manager.ts:529] [E: packages/coding-agent/src/core/settings-manager.ts:647] [E: packages/coding-agent/src/core/settings-manager.ts:649] [E: packages/coding-agent/src/core/settings-manager.ts:650] [E: packages/coding-agent/src/core/settings-manager.ts:651] [E: packages/coding-agent/src/core/settings-manager.ts:652]。

写入不是覆盖整份 in-memory settings:`persistScopedSettings()` 在 lock callback 内重新读取当前文件、再次 migration,然后只覆盖 modified fields;如果某个 object field 只标记了 nested keys,它从当前文件的 nested object 起步,只替换这些 nested keys [E: packages/coding-agent/src/core/settings-manager.ts:583] [E: packages/coding-agent/src/core/settings-manager.ts:589] [E: packages/coding-agent/src/core/settings-manager.ts:590] [E: packages/coding-agent/src/core/settings-manager.ts:591] [E: packages/coding-agent/src/core/settings-manager.ts:593] [E: packages/coding-agent/src/core/settings-manager.ts:594] [E: packages/coding-agent/src/core/settings-manager.ts:596] [E: packages/coding-agent/src/core/settings-manager.ts:598] [E: packages/coding-agent/src/core/settings-manager.ts:600] [E: packages/coding-agent/src/core/settings-manager.ts:601] [E: packages/coding-agent/src/core/settings-manager.ts:602] [I]。写入任务串到 `writeQueue`,`flush()` 等待队列完成,`drainErrors()` 返回并清空累积的 settings errors [E: packages/coding-agent/src/core/settings-manager.ts:561] [E: packages/coding-agent/src/core/settings-manager.ts:562] [E: packages/coding-agent/src/core/settings-manager.ts:570] [E: packages/coding-agent/src/core/settings-manager.ts:655] [E: packages/coding-agent/src/core/settings-manager.ts:656] [E: packages/coding-agent/src/core/settings-manager.ts:659] [E: packages/coding-agent/src/core/settings-manager.ts:660] [E: packages/coding-agent/src/core/settings-manager.ts:661]。

`applyOverrides(overrides)` 只把 overrides 合并到 effective `settings`,不修改 `globalSettings` 或 `projectSettings`,也不触发 save;它适合作为 runtime override,不是持久化 settings 写入口 [E: packages/coding-agent/src/core/settings-manager.ts:513] [E: packages/coding-agent/src/core/settings-manager.ts:514] [I]。如果 global 或 project settings 文件读取时有 parse/load error,对应的 `save()` 或 `saveProjectSettings()` 会先更新 effective settings,然后直接返回,避免把内存状态写回一个已损坏的 JSON 文件 [E: packages/coding-agent/src/core/settings-manager.ts:614] [E: packages/coding-agent/src/core/settings-manager.ts:617] [E: packages/coding-agent/src/core/settings-manager.ts:630] [E: packages/coding-agent/src/core/settings-manager.ts:635] [I]。

## 与配置值解析的边界

本节点把 settings JSON 当作已经 parse 出来的 value graph,不解释 `$ENV`、`${ENV}` 或 `!cmd` 字符串解析规则 [I]。这些动态配置值语法属于 [surface.config.resolution](resolution.md) 和 [subsys.coding-agent.config-resolution](../../subsystems/coding-agent/config-resolution.md);settings manager 只在 HTTP/WebSocket timeout accessor 里调用 timeout parser,其它 settings key 的 env/command 解析应由具体消费者负责 [E: packages/coding-agent/src/core/settings-manager.ts:10] [E: packages/coding-agent/src/core/settings-manager.ts:167] [E: packages/coding-agent/src/core/settings-manager.ts:826] [E: packages/coding-agent/src/core/settings-manager.ts:847] [I]。

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

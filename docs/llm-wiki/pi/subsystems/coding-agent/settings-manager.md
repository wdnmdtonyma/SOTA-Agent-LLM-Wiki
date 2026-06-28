---
id: subsys.coding-agent.settings-manager
title: 设置管理(读/合并/锁)
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/settings-manager.ts
symbols:
  - SettingsManager
  - loadFromStorage
  - deepMergeSettings
related:
  - surface.config.settings
  - subsys.coding-agent.config-resolution
  - ref.coding-agent.config-keys
evidence: explicit
status: verified
updated: 5a073885
---

> `subsys.coding-agent.settings-manager` 描述 pi-coding-agent 的 settings manager: 它把 global `settings.json` 与 project `.pi/settings.json` 读入内存, 做 project-over-global merge, 通过 lockfile 和 write queue 保存局部修改, 并用 project trust 门控 project scope。

## 能回答的问题

- `SettingsManager` 从哪里读取 global settings 和 project settings?
- project settings 什么时候被跳过, 什么时候拒绝写入?
- `deepMergeSettings` 如何处理 nested object、primitive 和 array?
- settings 写回时如何避免覆盖同文件里的并发改动?
- 旧配置键 `queueMode`、`websockets`、旧版 `skills`、`retry.maxDelayMs` 怎样迁移?
- index 里列出的 `loadSettings` symbol 在当前源码里是否存在?

## 职责边界

`packages/coding-agent/src/core/settings-manager.ts` 是 pi-coding-agent 的 settings storage 与 accessor 层: 它定义 `Settings` 数据模型、`SettingsStorage` 抽象、file/in-memory storage、`SettingsManager` factory、migration、merge、project trust、write queue、error draining 以及一组 typed getters/setters [E: packages/coding-agent/src/core/settings-manager.ts:80] [E: packages/coding-agent/src/core/settings-manager.ts:174] [E: packages/coding-agent/src/core/settings-manager.ts:183] [E: packages/coding-agent/src/core/settings-manager.ts:252] [E: packages/coding-agent/src/core/settings-manager.ts:269]。

本节点不权威枚举每个配置键的用户文档含义; `ref.coding-agent.config-keys` 应按 config-key catalog 形式覆盖所有 key, 而本节点只解释 settings manager 的读、合并、锁、迁移、写回和 trust 行为 [I]。

## 关键文件

- `packages/coding-agent/src/core/settings-manager.ts`: 本节点唯一 source, 覆盖 `SettingsManager`、`Settings`、`SettingsStorage`、`FileSettingsStorage`、`InMemorySettingsStorage`、`deepMergeSettings`、migration 和全部 public accessors [E: packages/coding-agent/src/core/settings-manager.ts:80] [E: packages/coding-agent/src/core/settings-manager.ts:127] [E: packages/coding-agent/src/core/settings-manager.ts:174] [E: packages/coding-agent/src/core/settings-manager.ts:183] [E: packages/coding-agent/src/core/settings-manager.ts:252] [E: packages/coding-agent/src/core/settings-manager.ts:269]。

## 数据模型

`Settings` 是一个宽接口, 覆盖 provider/model/thinking、transport、TUI theme、compaction、retry、shell/editor、resource packages、extensions/skills/prompts/themes、terminal/image、tree/editor/autocomplete、markdown warnings、sessionDir 和 network timeout/proxy 等键 [E: packages/coding-agent/src/core/settings-manager.ts:80] [E: packages/coding-agent/src/core/settings-manager.ts:82] [E: packages/coding-agent/src/core/settings-manager.ts:89] [E: packages/coding-agent/src/core/settings-manager.ts:91] [E: packages/coding-agent/src/core/settings-manager.ts:103] [E: packages/coding-agent/src/core/settings-manager.ts:109] [E: packages/coding-agent/src/core/settings-manager.ts:120] [E: packages/coding-agent/src/core/settings-manager.ts:121] [E: packages/coding-agent/src/core/settings-manager.ts:123]。

`PackageSource` 支持 string 形式和 object 形式; object 形式包含 `source` 以及可选的 `extensions`、`skills`、`prompts`、`themes` filter arrays [E: packages/coding-agent/src/core/settings-manager.ts:70] [E: packages/coding-agent/src/core/settings-manager.ts:73] [E: packages/coding-agent/src/core/settings-manager.ts:74] [E: packages/coding-agent/src/core/settings-manager.ts:75] [E: packages/coding-agent/src/core/settings-manager.ts:76] [E: packages/coding-agent/src/core/settings-manager.ts:77]。

`SettingsScope` 只有 `"global"` 和 `"project"` 两个 scope; `SettingsStorage.withLock(scope, fn)` 接收当前文件内容字符串或 `undefined`, 并用返回的 string 写回, 返回 `undefined` 表示不写 [E: packages/coding-agent/src/core/settings-manager.ts:168] [E: packages/coding-agent/src/core/settings-manager.ts:174] [E: packages/coding-agent/src/core/settings-manager.ts:175]。

`SettingsManager` 持有三份 settings: `globalSettings`、`projectSettings` 和合并后的 `settings`; 它还维护 global/project 各自的 modified fields、modified nested fields、load error、write queue 与 error list [E: packages/coding-agent/src/core/settings-manager.ts:270] [E: packages/coding-agent/src/core/settings-manager.ts:271] [E: packages/coding-agent/src/core/settings-manager.ts:272] [E: packages/coding-agent/src/core/settings-manager.ts:273] [E: packages/coding-agent/src/core/settings-manager.ts:275] [E: packages/coding-agent/src/core/settings-manager.ts:277] [E: packages/coding-agent/src/core/settings-manager.ts:279] [E: packages/coding-agent/src/core/settings-manager.ts:281] [E: packages/coding-agent/src/core/settings-manager.ts:282]。

## 存储路径与锁

`FileSettingsStorage` 在 constructor 里 resolve cwd 和 agentDir, 把 global path 设为 `<agentDir>/settings.json`, 把 project path 设为 `<cwd>/<CONFIG_DIR_NAME>/settings.json`; `CONFIG_DIR_NAME` 来自 `../config.ts`, 本文件未在证据范围内展开其字面值 [E: packages/coding-agent/src/core/settings-manager.ts:187] [E: packages/coding-agent/src/core/settings-manager.ts:188] [E: packages/coding-agent/src/core/settings-manager.ts:189] [E: packages/coding-agent/src/core/settings-manager.ts:190] [E: packages/coding-agent/src/core/settings-manager.ts:191] [U]。

文件锁由 `proper-lockfile.lockSync(path, { realpath: false })` 获取; 遇到 `ELOCKED` 时最多重试 10 次, 每次 busy-wait 20ms, 非 `ELOCKED` 或最后一次失败会抛出原错误 [E: packages/coding-agent/src/core/settings-manager.ts:194] [E: packages/coding-agent/src/core/settings-manager.ts:195] [E: packages/coding-agent/src/core/settings-manager.ts:196] [E: packages/coding-agent/src/core/settings-manager.ts:199] [E: packages/coding-agent/src/core/settings-manager.ts:201] [E: packages/coding-agent/src/core/settings-manager.ts:207] [E: packages/coding-agent/src/core/settings-manager.ts:212]。

`FileSettingsStorage.withLock()` 只在文件已存在时先加锁读取; 如果 callback 要写入且之前没有锁, 它会先创建目录再对目标 path 加锁并写入 UTF-8 内容, finally 释放锁 [E: packages/coding-agent/src/core/settings-manager.ts:221] [E: packages/coding-agent/src/core/settings-manager.ts:228] [E: packages/coding-agent/src/core/settings-manager.ts:230] [E: packages/coding-agent/src/core/settings-manager.ts:232] [E: packages/coding-agent/src/core/settings-manager.ts:234] [E: packages/coding-agent/src/core/settings-manager.ts:237] [E: packages/coding-agent/src/core/settings-manager.ts:240] [E: packages/coding-agent/src/core/settings-manager.ts:242] [E: packages/coding-agent/src/core/settings-manager.ts:246]。

`InMemorySettingsStorage` 是同一 `SettingsStorage` 协议的测试/嵌入式后端: 它按 scope 读写两个内存 string slot, 不做文件 I/O 或 lockfile [E: packages/coding-agent/src/core/settings-manager.ts:252] [E: packages/coding-agent/src/core/settings-manager.ts:253] [E: packages/coding-agent/src/core/settings-manager.ts:254] [E: packages/coding-agent/src/core/settings-manager.ts:256] [E: packages/coding-agent/src/core/settings-manager.ts:260] [E: packages/coding-agent/src/core/settings-manager.ts:263]。

## 读取、迁移与合并

`SettingsManager.create(cwd, agentDir, options)` 创建 `FileSettingsStorage`, 然后委托 `fromStorage()`; 默认 agentDir 是 `getAgentDir()` [E: packages/coding-agent/src/core/settings-manager.ts:304] [E: packages/coding-agent/src/core/settings-manager.ts:306] [E: packages/coding-agent/src/core/settings-manager.ts:309] [E: packages/coding-agent/src/core/settings-manager.ts:310]。

`SettingsManager.fromStorage(storage, options)` 默认 `projectTrusted` 为 true, 分别尝试读取 global 和 project scope; project 读取会接收 trust flag, load error 被收集进 initial errors, constructor 最终用 `deepMergeSettings(globalSettings, projectSettings)` 生成 effective settings [E: packages/coding-agent/src/core/settings-manager.ts:314] [E: packages/coding-agent/src/core/settings-manager.ts:315] [E: packages/coding-agent/src/core/settings-manager.ts:316] [E: packages/coding-agent/src/core/settings-manager.ts:317] [E: packages/coding-agent/src/core/settings-manager.ts:319] [E: packages/coding-agent/src/core/settings-manager.ts:323] [E: packages/coding-agent/src/core/settings-manager.ts:326] [E: packages/coding-agent/src/core/settings-manager.ts:300]。

`loadFromStorage()` 在 project scope 且 `projectTrusted` 为 false 时直接返回 `{}`; 否则通过 storage 读 current content, 空内容返回 `{}`, 有内容则 `JSON.parse()` 后走 `migrateSettings()` [E: packages/coding-agent/src/core/settings-manager.ts:345] [E: packages/coding-agent/src/core/settings-manager.ts:346] [E: packages/coding-agent/src/core/settings-manager.ts:347] [E: packages/coding-agent/src/core/settings-manager.ts:351] [E: packages/coding-agent/src/core/settings-manager.ts:356] [E: packages/coding-agent/src/core/settings-manager.ts:359] [E: packages/coding-agent/src/core/settings-manager.ts:360]。

`tryLoadFromStorage()` 把 `loadFromStorage()` 包成 `{ settings, error }`; 读取或 parse 失败时返回空 settings 和 error, 让 manager 保留错误而不是在 factory 阶段抛出 [E: packages/coding-agent/src/core/settings-manager.ts:363] [E: packages/coding-agent/src/core/settings-manager.ts:368] [E: packages/coding-agent/src/core/settings-manager.ts:369] [E: packages/coding-agent/src/core/settings-manager.ts:370] [E: packages/coding-agent/src/core/settings-manager.ts:371]。

`deepMergeSettings(base, overrides)` 以 base shallow copy 起步; override value 为 `undefined` 时跳过, base/override 两侧都是非数组 object 时只合并这一层 nested object, 其他 primitive 和 array 由 override 直接替换 [E: packages/coding-agent/src/core/settings-manager.ts:127] [E: packages/coding-agent/src/core/settings-manager.ts:128] [E: packages/coding-agent/src/core/settings-manager.ts:130] [E: packages/coding-agent/src/core/settings-manager.ts:134] [E: packages/coding-agent/src/core/settings-manager.ts:140] [E: packages/coding-agent/src/core/settings-manager.ts:142] [E: packages/coding-agent/src/core/settings-manager.ts:147] [E: packages/coding-agent/src/core/settings-manager.ts:150]。

`migrateSettings()` 当前迁移四类 legacy shape: `queueMode` 迁到 `steeringMode`, boolean `websockets` 迁到 `transport` 的 `"websocket"`/`"sse"`, 旧 object 形式 `skills` 拆出 `enableSkillCommands` 与 `customDirectories`, `retry.maxDelayMs` 迁到 `retry.provider.maxRetryDelayMs` 后删除旧键 [E: packages/coding-agent/src/core/settings-manager.ts:376] [E: packages/coding-agent/src/core/settings-manager.ts:378] [E: packages/coding-agent/src/core/settings-manager.ts:379] [E: packages/coding-agent/src/core/settings-manager.ts:384] [E: packages/coding-agent/src/core/settings-manager.ts:385] [E: packages/coding-agent/src/core/settings-manager.ts:390] [E: packages/coding-agent/src/core/settings-manager.ts:400] [E: packages/coding-agent/src/core/settings-manager.ts:404] [E: packages/coding-agent/src/core/settings-manager.ts:411] [E: packages/coding-agent/src/core/settings-manager.ts:426] [E: packages/coding-agent/src/core/settings-manager.ts:431]。

## Project Trust 门控

`projectTrusted` 控制 project settings 的读写: 初始读取时不 trusted 会使 project scope 返回 `{}`, `setProjectTrusted(false)` 会清空 `projectSettings`、清掉 project load error 并重新合并 effective settings [E: packages/coding-agent/src/core/settings-manager.ts:315] [E: packages/coding-agent/src/core/settings-manager.ts:346] [E: packages/coding-agent/src/core/settings-manager.ts:458] [E: packages/coding-agent/src/core/settings-manager.ts:459] [E: packages/coding-agent/src/core/settings-manager.ts:460] [E: packages/coding-agent/src/core/settings-manager.ts:461]。

`setProjectTrusted(true)` 会重新尝试读取 project scope, 保存新的 `projectSettings`/`projectSettingsLoadError`, 有错误则 recordError, 然后重新合并 global + project [E: packages/coding-agent/src/core/settings-manager.ts:465] [E: packages/coding-agent/src/core/settings-manager.ts:466] [E: packages/coding-agent/src/core/settings-manager.ts:467] [E: packages/coding-agent/src/core/settings-manager.ts:468] [E: packages/coding-agent/src/core/settings-manager.ts:469] [E: packages/coding-agent/src/core/settings-manager.ts:471]。

project 写入路径全部先过 `assertProjectTrustedForWrite()`; 未 trusted 时抛出 `"Project is not trusted; refusing to write project settings"` [E: packages/coding-agent/src/core/settings-manager.ts:529] [E: packages/coding-agent/src/core/settings-manager.ts:530] [E: packages/coding-agent/src/core/settings-manager.ts:531] [E: packages/coding-agent/src/core/settings-manager.ts:621] [E: packages/coding-agent/src/core/settings-manager.ts:638]。

## 写回策略与错误处理

global setter 修改 `globalSettings`, 调 `markModified()` 标记字段或 nested key, 再 `save()`; project setter 通过 `updateProjectSettings()` clone 当前 project settings、执行 update、标记 project modified field, 再 `saveProjectSettings()` [E: packages/coding-agent/src/core/settings-manager.ts:508] [E: packages/coding-agent/src/core/settings-manager.ts:637] [E: packages/coding-agent/src/core/settings-manager.ts:639] [E: packages/coding-agent/src/core/settings-manager.ts:640] [E: packages/coding-agent/src/core/settings-manager.ts:641] [E: packages/coding-agent/src/core/settings-manager.ts:642] [E: packages/coding-agent/src/core/settings-manager.ts:678] [E: packages/coding-agent/src/core/settings-manager.ts:680] [E: packages/coding-agent/src/core/settings-manager.ts:681] [E: packages/coding-agent/src/core/settings-manager.ts:963] [E: packages/coding-agent/src/core/settings-manager.ts:964]。

`save()` 和 `saveProjectSettings()` 都先更新 effective settings; 如果对应 scope 存在 load error, 它们直接返回, 因而不会把内存修改写进一个 parse 失败的 settings 文件 [E: packages/coding-agent/src/core/settings-manager.ts:604] [E: packages/coding-agent/src/core/settings-manager.ts:605] [E: packages/coding-agent/src/core/settings-manager.ts:607] [E: packages/coding-agent/src/core/settings-manager.ts:620] [E: packages/coding-agent/src/core/settings-manager.ts:623] [E: packages/coding-agent/src/core/settings-manager.ts:625]。

写入通过 `enqueueWrite()` 串到 `writeQueue`; task 执行前再次检查 project trust, 成功后清除对应 scope 的 modified field 集合, 失败时只 `recordError(scope, error)` 而不是向调用 setter 同步抛出 [E: packages/coding-agent/src/core/settings-manager.ts:551] [E: packages/coding-agent/src/core/settings-manager.ts:552] [E: packages/coding-agent/src/core/settings-manager.ts:554] [E: packages/coding-agent/src/core/settings-manager.ts:557] [E: packages/coding-agent/src/core/settings-manager.ts:558] [E: packages/coding-agent/src/core/settings-manager.ts:560] [E: packages/coding-agent/src/core/settings-manager.ts:561]。

`persistScopedSettings()` 在持锁 callback 内重新读取当前文件、再次运行 migration, 再只覆盖本次 snapshot 里标记过的 top-level field; 对标记了 nested key 的 object, 它从 current file nested object 起步, 只替换被修改的 nested key, 以降低覆盖同一 settings 文件内其它字段的风险 [E: packages/coding-agent/src/core/settings-manager.ts:573] [E: packages/coding-agent/src/core/settings-manager.ts:579] [E: packages/coding-agent/src/core/settings-manager.ts:580] [E: packages/coding-agent/src/core/settings-manager.ts:583] [E: packages/coding-agent/src/core/settings-manager.ts:584] [E: packages/coding-agent/src/core/settings-manager.ts:586] [E: packages/coding-agent/src/core/settings-manager.ts:588] [E: packages/coding-agent/src/core/settings-manager.ts:590] [E: packages/coding-agent/src/core/settings-manager.ts:591] [E: packages/coding-agent/src/core/settings-manager.ts:592] [E: packages/coding-agent/src/core/settings-manager.ts:596] [I]。

`flush()` 等待 write queue 完成; `reload()` 也先等待 write queue, 然后重新读取 global/project 并清空 modified sets; `drainErrors()` 返回已收集错误并把 manager 内部 error list 清空 [E: packages/coding-agent/src/core/settings-manager.ts:474] [E: packages/coding-agent/src/core/settings-manager.ts:475] [E: packages/coding-agent/src/core/settings-manager.ts:485] [E: packages/coding-agent/src/core/settings-manager.ts:490] [E: packages/coding-agent/src/core/settings-manager.ts:499] [E: packages/coding-agent/src/core/settings-manager.ts:645] [E: packages/coding-agent/src/core/settings-manager.ts:646] [E: packages/coding-agent/src/core/settings-manager.ts:649] [E: packages/coding-agent/src/core/settings-manager.ts:650] [E: packages/coding-agent/src/core/settings-manager.ts:651]。

## Public API 分组

model/provider/thinking/transport 相关 accessor 包括 `getDefaultProvider()`、`getDefaultModel()`、`setDefaultProvider()`、`setDefaultModel()`、`setDefaultModelAndProvider()`、`getDefaultThinkingLevel()`、`setDefaultThinkingLevel()`、`getTransport()`、`setTransport()` [E: packages/coding-agent/src/core/settings-manager.ts:670] [E: packages/coding-agent/src/core/settings-manager.ts:674] [E: packages/coding-agent/src/core/settings-manager.ts:678] [E: packages/coding-agent/src/core/settings-manager.ts:684] [E: packages/coding-agent/src/core/settings-manager.ts:690] [E: packages/coding-agent/src/core/settings-manager.ts:735] [E: packages/coding-agent/src/core/settings-manager.ts:739] [E: packages/coding-agent/src/core/settings-manager.ts:745] [E: packages/coding-agent/src/core/settings-manager.ts:749]。

resource path accessor 分成 global setters 和 project setters: packages、extensions、skills、prompts、themes 都有 getter 与 global setter, 其中 project variants 通过 `setProject*` 写 project scope [E: packages/coding-agent/src/core/settings-manager.ts:953] [E: packages/coding-agent/src/core/settings-manager.ts:957] [E: packages/coding-agent/src/core/settings-manager.ts:963] [E: packages/coding-agent/src/core/settings-manager.ts:969] [E: packages/coding-agent/src/core/settings-manager.ts:973] [E: packages/coding-agent/src/core/settings-manager.ts:979] [E: packages/coding-agent/src/core/settings-manager.ts:985] [E: packages/coding-agent/src/core/settings-manager.ts:989] [E: packages/coding-agent/src/core/settings-manager.ts:995] [E: packages/coding-agent/src/core/settings-manager.ts:1001] [E: packages/coding-agent/src/core/settings-manager.ts:1005] [E: packages/coding-agent/src/core/settings-manager.ts:1011] [E: packages/coding-agent/src/core/settings-manager.ts:1017] [E: packages/coding-agent/src/core/settings-manager.ts:1021] [E: packages/coding-agent/src/core/settings-manager.ts:1027]。

terminal/image accessor 提供 defaults 和 numeric clamping: `showImages` 默认 true, `imageWidthCells` 非 finite 时默认 60 且最小 1, `clearOnShrink` 可由 settings 覆盖否则读 `PI_CLEAR_ON_SHRINK`, `showTerminalProgress` 默认 false, image auto resize 默认 true, block images 默认 false [E: packages/coding-agent/src/core/settings-manager.ts:1047] [E: packages/coding-agent/src/core/settings-manager.ts:1060] [E: packages/coding-agent/src/core/settings-manager.ts:1062] [E: packages/coding-agent/src/core/settings-manager.ts:1065] [E: packages/coding-agent/src/core/settings-manager.ts:1077] [E: packages/coding-agent/src/core/settings-manager.ts:1080] [E: packages/coding-agent/src/core/settings-manager.ts:1082] [E: packages/coding-agent/src/core/settings-manager.ts:1094] [E: packages/coding-agent/src/core/settings-manager.ts:1107] [E: packages/coding-agent/src/core/settings-manager.ts:1120]。

UI/editor/session accessor 包括 theme 过滤、external editor fallback、double escape action、tree filter validation、hardware cursor env fallback、editor padding clamp、autocomplete max clamp、code block indent、warnings clone 和 sessionDir normalization [E: packages/coding-agent/src/core/settings-manager.ts:665] [E: packages/coding-agent/src/core/settings-manager.ts:667] [E: packages/coding-agent/src/core/settings-manager.ts:718] [E: packages/coding-agent/src/core/settings-manager.ts:726] [E: packages/coding-agent/src/core/settings-manager.ts:845] [E: packages/coding-agent/src/core/settings-manager.ts:850] [E: packages/coding-agent/src/core/settings-manager.ts:854] [E: packages/coding-agent/src/core/settings-manager.ts:1143] [E: packages/coding-agent/src/core/settings-manager.ts:1153] [E: packages/coding-agent/src/core/settings-manager.ts:1155] [E: packages/coding-agent/src/core/settings-manager.ts:1165] [E: packages/coding-agent/src/core/settings-manager.ts:1166] [E: packages/coding-agent/src/core/settings-manager.ts:1175] [E: packages/coding-agent/src/core/settings-manager.ts:1180] [E: packages/coding-agent/src/core/settings-manager.ts:1185] [E: packages/coding-agent/src/core/settings-manager.ts:1190] [E: packages/coding-agent/src/core/settings-manager.ts:1195] [E: packages/coding-agent/src/core/settings-manager.ts:1199] [E: packages/coding-agent/src/core/settings-manager.ts:1203]。

network/retry accessor 包括 retry enable/defaults、provider retry defaults、HTTP idle timeout parsing and validation、WebSocket connect timeout parsing; invalid explicit timeout value 会由 `parseTimeoutSetting()` 抛出 `Invalid <settingName> setting` [E: packages/coding-agent/src/core/settings-manager.ts:157] [E: packages/coding-agent/src/core/settings-manager.ts:158] [E: packages/coding-agent/src/core/settings-manager.ts:163] [E: packages/coding-agent/src/core/settings-manager.ts:795] [E: packages/coding-agent/src/core/settings-manager.ts:808] [E: packages/coding-agent/src/core/settings-manager.ts:811] [E: packages/coding-agent/src/core/settings-manager.ts:816] [E: packages/coding-agent/src/core/settings-manager.ts:817] [E: packages/coding-agent/src/core/settings-manager.ts:820] [E: packages/coding-agent/src/core/settings-manager.ts:821] [E: packages/coding-agent/src/core/settings-manager.ts:824] [E: packages/coding-agent/src/core/settings-manager.ts:829] [E: packages/coding-agent/src/core/settings-manager.ts:833] [E: packages/coding-agent/src/core/settings-manager.ts:837] [E: packages/coding-agent/src/core/settings-manager.ts:838]。

telemetry/changelog accessor 包括 last changelog version、collapse changelog、install telemetry 默认 true、analytics 默认 false、trackingId; 首次开启 analytics 且没有 trackingId 时会生成 `randomUUID()` 并标记 `trackingId` modified [E: packages/coding-agent/src/core/settings-manager.ts:655] [E: packages/coding-agent/src/core/settings-manager.ts:659] [E: packages/coding-agent/src/core/settings-manager.ts:914] [E: packages/coding-agent/src/core/settings-manager.ts:924] [E: packages/coding-agent/src/core/settings-manager.ts:934] [E: packages/coding-agent/src/core/settings-manager.ts:938] [E: packages/coding-agent/src/core/settings-manager.ts:943] [E: packages/coding-agent/src/core/settings-manager.ts:946] [E: packages/coding-agent/src/core/settings-manager.ts:947] [E: packages/coding-agent/src/core/settings-manager.ts:948]。

## 设计动机与权衡

settings manager 采用 effective settings 缓存: 读取阶段合并 global/project, setter 阶段先更新内存 effective settings, 写入阶段通过 `writeQueue` 异步串行化; 这让同步 setter API 可以快速返回, 但调用方若需要确认落盘必须调用 `flush()` [E: packages/coding-agent/src/core/settings-manager.ts:273] [E: packages/coding-agent/src/core/settings-manager.ts:604] [E: packages/coding-agent/src/core/settings-manager.ts:551] [E: packages/coding-agent/src/core/settings-manager.ts:645] [I]。

写回不是简单把整份 in-memory settings 覆盖到磁盘: `persistScopedSettings()` 在 lock 内重新读取当前文件, 只写 modified field 和 modified nested keys; 这保护同一 settings 文件中未被本 manager 修改的键, 但 nested merge 只是一层, 更深层 object 不会递归合并 [E: packages/coding-agent/src/core/settings-manager.ts:579] [E: packages/coding-agent/src/core/settings-manager.ts:583] [E: packages/coding-agent/src/core/settings-manager.ts:584] [E: packages/coding-agent/src/core/settings-manager.ts:586] [E: packages/coding-agent/src/core/settings-manager.ts:591] [E: packages/coding-agent/src/core/settings-manager.ts:592] [E: packages/coding-agent/src/core/settings-manager.ts:127] [E: packages/coding-agent/src/core/settings-manager.ts:147] [I]。

parse error 的 scope 会被保护为 no-write: `save()` 和 `saveProjectSettings()` 在对应 load error 存在时直接返回, 因而不会用部分内存状态覆盖用户的损坏 JSON; 错误通过 `drainErrors()` 交给上层展示或处理 [E: packages/coding-agent/src/core/settings-manager.ts:607] [E: packages/coding-agent/src/core/settings-manager.ts:625] [E: packages/coding-agent/src/core/settings-manager.ts:649] [I]。

## Gotcha

- index.json 为本节点列出 `loadSettings`, 但当前 `settings-manager.ts` 没有 `loadSettings` 函数或 export; 实际读取路径是 private static `loadFromStorage()` 与 `tryLoadFromStorage()` [E: packages/coding-agent/src/core/settings-manager.ts:345] [E: packages/coding-agent/src/core/settings-manager.ts:363] [U]。
- index.json 为本节点列出 `deepMergeSettings`, 当前源码确有 `function deepMergeSettings(...)`, 但它不是 `export function`; 如果 symbols 语义要求 exported symbol, 这里与源码不一致 [E: packages/coding-agent/src/core/settings-manager.ts:127] [U]。
- `applyOverrides()` 只修改 effective `settings`, 不更新 `globalSettings` 或 `projectSettings`, 也不触发 save; 它适合 runtime override, 不是持久化 setter [E: packages/coding-agent/src/core/settings-manager.ts:503] [E: packages/coding-agent/src/core/settings-manager.ts:504] [I]。
- `setProjectTrusted(false)` 会清空已加载 project settings 的内存副本, 但不会删除磁盘 project settings 文件; 这个节点只从代码确认内存行为和合并行为 [E: packages/coding-agent/src/core/settings-manager.ts:458] [E: packages/coding-agent/src/core/settings-manager.ts:459] [E: packages/coding-agent/src/core/settings-manager.ts:461] [I]。
- `getTheme()` 对包含 `/` 的 theme string 返回 `undefined`, 而 `getThemeSetting()` 仍返回原始 string; 这暗示 slash-containing theme value 可能被其他 resource path 机制处理, 但本文件没有展开该机制 [E: packages/coding-agent/src/core/settings-manager.ts:718] [E: packages/coding-agent/src/core/settings-manager.ts:725] [E: packages/coding-agent/src/core/settings-manager.ts:726] [I]。

## 跨包边界

[surface.config.settings](../../surface/config/settings.md): 用户可见的 settings surface 应解释 settings 文件格式、CLI 或命令入口和用户行为; 本节点只解释 `SettingsManager` 如何读、合并、迁移、写回这些值 [I]。

[subsys.coding-agent.config-resolution](config-resolution.md): config value resolution 节点应解释 `$ENV`、`!cmd` 等动态值如何解析; 本节点只把 settings JSON 当作已经 parse 出来的 value graph, 只对 timeout 字段调用本文件引入的 `parseHttpIdleTimeoutMs()` [E: packages/coding-agent/src/core/settings-manager.ts:8] [E: packages/coding-agent/src/core/settings-manager.ts:157] [I]。

[ref.coding-agent.config-keys](../../reference/config-keys.md): config-key catalog 应逐 key 覆盖默认值、含义和来源; 本节点只把 `Settings` interface 与 getter/setter 分组, 不承担完整 key catalog 的全覆盖责任 [E: packages/coding-agent/src/core/settings-manager.ts:80] [I]。

`@earendil-works/pi-ai` 只通过 `Transport` type 影响 `transport` setting 的类型; settings manager 本身属于 `@earendil-works/pi-coding-agent` 产品层 [E: packages/coding-agent/src/core/settings-manager.ts:1] [E: packages/coding-agent/src/core/settings-manager.ts:63] [E: packages/coding-agent/src/core/settings-manager.ts:85] [I]。

## Sources

- packages/coding-agent/src/core/settings-manager.ts

## 相关

- [surface.config.settings](../../surface/config/settings.md): settings 的用户可见入口、文件格式和配置面说明。
- [subsys.coding-agent.config-resolution](config-resolution.md): `$ENV`、`!cmd` 等配置值解析规则。
- [ref.coding-agent.config-keys](../../reference/config-keys.md): 配置键完整目录和每个 key 的默认值/含义。

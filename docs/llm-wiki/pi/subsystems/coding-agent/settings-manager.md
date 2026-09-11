---
id: subsys.coding-agent.settings-manager
title: 设置管理(读/合并/锁)
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/core/settings-diagnostics.ts
  - packages/coding-agent/src/main.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
symbols:
  - SettingsManager
  - SettingsStorage
  - FileSettingsStorage
  - InMemorySettingsStorage
  - getCompactionSettings
  - getRetrySettings
  - collectSettingsDiagnostics
  - deduplicateDiagnostics
related:
  - surface.config.settings
  - subsys.coding-agent.config-resolution
  - ref.coding-agent.config-keys
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `subsys.coding-agent.settings-manager` 描述 pi-coding-agent 的 settings manager: 它把 global `settings.json` 与 project `.pi/settings.json` 读入内存, 做 project-over-global merge, 通过 lockfile 和 write queue 保存局部修改, 并用 project trust 门控 project scope。

## 能回答的问题

- `SettingsManager` 从哪里读取 global settings 和 project settings?
- project settings 什么时候被跳过, 什么时候拒绝写入?
- `deepMergeSettings` 如何处理 nested object、primitive 和 array?
- `getCompactionSettings(model)` 如何把 `modelOverrides` 解析成 agent-core 可用的三字段 settings?
- `getRetrySettings()` 怎样带上 `maxAgentDelayMs`, 它和 provider retry cap 有何区别?
- settings 写回时如何避免覆盖同文件里的并发改动?
- 旧配置键 `queueMode`、`websockets`、旧版 `skills`、`retry.maxDelayMs` 怎样迁移?
- storage abstraction、file backend 与 in-memory backend 分别怎样接入 manager?

## 职责边界

`packages/coding-agent/src/core/settings-manager.ts` 是 pi-coding-agent 的 settings storage 与 accessor 层: 它定义 `Settings` 数据模型、`SettingsStorage` 抽象、file/in-memory storage、`SettingsManager` factory、migration、merge、project trust、write queue、error draining 以及一组 typed getters/setters [E: packages/coding-agent/src/core/settings-manager.ts:106] [E: packages/coding-agent/src/core/settings-manager.ts:205] [E: packages/coding-agent/src/core/settings-manager.ts:237] [E: packages/coding-agent/src/core/settings-manager.ts:294] [E: packages/coding-agent/src/core/settings-manager.ts:323]。

本节点不权威枚举每个配置键的用户文档含义; `ref.coding-agent.config-keys` 应按 config-key catalog 形式覆盖所有 key, 而本节点只解释 settings manager 的读、合并、锁、迁移、写回和 trust 行为 [I]。

## 关键文件

- `packages/coding-agent/src/core/settings-manager.ts`: 覆盖 `SettingsManager`、`Settings`、`SettingsStorage`、`FileSettingsStorage`、`InMemorySettingsStorage`、`deepMergeSettings`、migration 和全部 public accessors [E: packages/coding-agent/src/core/settings-manager.ts:106] [E: packages/coding-agent/src/core/settings-manager.ts:184] [E: packages/coding-agent/src/core/settings-manager.ts:205] [E: packages/coding-agent/src/core/settings-manager.ts:225] [E: packages/coding-agent/src/core/settings-manager.ts:294] [E: packages/coding-agent/src/core/settings-manager.ts:311]。
- `packages/coding-agent/src/core/settings-diagnostics.ts`: `collectSettingsDiagnostics` / `deduplicateDiagnostics`,把 `drainErrors()` 转成 TUI 可显示的 warning [E: packages/coding-agent/src/core/settings-diagnostics.ts:4] [E: packages/coding-agent/src/core/settings-diagnostics.ts:15]。

## 数据模型

`Settings` 是一个宽接口, 覆盖 provider/model/thinking(含 `modelThinkingLevels`)、transport、TUI theme、compaction(含 `modelOverrides`)、retry(含 `maxAgentDelayMs`)、shell/editor、resource packages、extensions/skills/prompts/themes、terminal/image(含 hyperlinks/images/trueColor overrides)、`defaultTools`、tree/editor/output padding/autocomplete、markdown warnings、sessionDir、network timeout/proxy,以及 `tuiMode` / `fullscreenExitOutput` / `fullscreenScrollbar` / `fullscreenCopyOnSelect` [E: packages/coding-agent/src/core/settings-manager.ts:106] [E: packages/coding-agent/src/core/settings-manager.ts:111] [E: packages/coding-agent/src/core/settings-manager.ts:140] [E: packages/coding-agent/src/core/settings-manager.ts:169] [E: packages/coding-agent/src/core/settings-manager.ts:27] [E: packages/coding-agent/src/core/settings-manager.ts:57]。

`CompactionSettings` 有 `enabled`、`reserveTokens`、`keepRecentTokens` 和 `modelOverrides`。`CompactionModelOverride` 只有两个可选 number 字段,键必须是精确 `"provider/modelId"` [E: packages/coding-agent/src/core/settings-manager.ts:13] [E: packages/coding-agent/src/core/settings-manager.ts:23] [E: packages/coding-agent/src/core/settings-manager.ts:27]。`RetrySettings` 在 agent 层有 `enabled`/`maxRetries`/`baseDelayMs`/`maxAgentDelayMs`,另嵌 `provider: ProviderRetrySettings` [E: packages/coding-agent/src/core/settings-manager.ts:35] [E: packages/coding-agent/src/core/settings-manager.ts:41]。

`PackageSource` 支持 string 形式和 object 形式；object 形式包含 `source`、可选 `autoload`，以及可选的 `extensions`、`skills`、`prompts`、`themes` filter arrays。`autoload: false` 表示先禁用默认全量加载，再只应用显式 patterns [E: packages/coding-agent/src/core/settings-manager.ts:95] [E: packages/coding-agent/src/core/settings-manager.ts:98] [E: packages/coding-agent/src/core/settings-manager.ts:111] [E: packages/coding-agent/src/core/settings-manager.ts:112] [E: packages/coding-agent/src/core/settings-manager.ts:101] [E: packages/coding-agent/src/core/settings-manager.ts:102] [E: packages/coding-agent/src/core/settings-manager.ts:103] [I]。

`SettingsScope` 只有 `"global"` 和 `"project"` 两个 scope; `SettingsStorage.withLock(scope, fn)` 接收当前文件内容字符串或 `undefined`, 并用返回的 string 写回, 返回 `undefined` 表示不写 [E: packages/coding-agent/src/core/settings-manager.ts:199] [E: packages/coding-agent/src/core/settings-manager.ts:205] [E: packages/coding-agent/src/core/settings-manager.ts:206]。

`SettingsManager` 持有三份 settings: `globalSettings`、`projectSettings` 和合并后的 `settings`; 它还维护 global/project 各自的 modified fields、modified nested fields、load error、write queue 与 error list [E: packages/coding-agent/src/core/settings-manager.ts:324] [E: packages/coding-agent/src/core/settings-manager.ts:313] [E: packages/coding-agent/src/core/settings-manager.ts:314] [E: packages/coding-agent/src/core/settings-manager.ts:315] [E: packages/coding-agent/src/core/settings-manager.ts:317] [E: packages/coding-agent/src/core/settings-manager.ts:319] [E: packages/coding-agent/src/core/settings-manager.ts:321] [E: packages/coding-agent/src/core/settings-manager.ts:323] [E: packages/coding-agent/src/core/settings-manager.ts:324]。

## 存储路径与锁

`FileSettingsStorage` 在 constructor 里 resolve cwd 和 agentDir, 把 global path 设为 `<agentDir>/settings.json`, 把 project path 设为 `<cwd>/<CONFIG_DIR_NAME>/settings.json`; `CONFIG_DIR_NAME` 来自 `../config.ts`, 本文件未在证据范围内展开其字面值 [E: packages/coding-agent/src/core/settings-manager.ts:241] [E: packages/coding-agent/src/core/settings-manager.ts:230] [E: packages/coding-agent/src/core/settings-manager.ts:243] [E: packages/coding-agent/src/core/settings-manager.ts:232] [E: packages/coding-agent/src/core/settings-manager.ts:233] [U]。

文件锁由 `proper-lockfile.lockSync(path, { realpath: false })` 获取; 遇到 `ELOCKED` 时最多重试 10 次, 每次 busy-wait 20ms, 非 `ELOCKED` 或最后一次失败会抛出原错误 [E: packages/coding-agent/src/core/settings-manager.ts:236] [E: packages/coding-agent/src/core/settings-manager.ts:249] [E: packages/coding-agent/src/core/settings-manager.ts:238] [E: packages/coding-agent/src/core/settings-manager.ts:241] [E: packages/coding-agent/src/core/settings-manager.ts:243] [E: packages/coding-agent/src/core/settings-manager.ts:249] [E: packages/coding-agent/src/core/settings-manager.ts:254]。

`FileSettingsStorage.withLock()` 只在文件已存在时先加锁读取; 如果 callback 要写入且之前没有锁, 它会先创建目录再对目标 path 加锁并写入 UTF-8 内容, finally 释放锁 [E: packages/coding-agent/src/core/settings-manager.ts:263] [E: packages/coding-agent/src/core/settings-manager.ts:282] [E: packages/coding-agent/src/core/settings-manager.ts:284] [E: packages/coding-agent/src/core/settings-manager.ts:274] [E: packages/coding-agent/src/core/settings-manager.ts:288] [E: packages/coding-agent/src/core/settings-manager.ts:279] [E: packages/coding-agent/src/core/settings-manager.ts:294] [E: packages/coding-agent/src/core/settings-manager.ts:296] [E: packages/coding-agent/src/core/settings-manager.ts:288]。

`InMemorySettingsStorage` 是同一 `SettingsStorage` 协议的测试/嵌入式后端: 它按 scope 读写两个内存 string slot, 不做文件 I/O 或 lockfile [E: packages/coding-agent/src/core/settings-manager.ts:294] [E: packages/coding-agent/src/core/settings-manager.ts:295] [E: packages/coding-agent/src/core/settings-manager.ts:296] [E: packages/coding-agent/src/core/settings-manager.ts:298] [E: packages/coding-agent/src/core/settings-manager.ts:314] [E: packages/coding-agent/src/core/settings-manager.ts:317]。

## 读取、迁移与合并

`SettingsManager.create(cwd, agentDir, options)` 创建 `FileSettingsStorage`, 然后委托 `fromStorageWithPaths()` 并传入 global/project 文件路径, 让 load error 能带上 path; 默认 agentDir 是 `getAgentDir()` [E: packages/coding-agent/src/core/settings-manager.ts:349] [E: packages/coding-agent/src/core/settings-manager.ts:356] [E: packages/coding-agent/src/core/settings-manager.ts:369] [E: packages/coding-agent/src/core/settings-manager.ts:358] [E: packages/coding-agent/src/core/settings-manager.ts:359]。`fromStorage()` 也转调 `fromStorageWithPaths()`, 但不传 `settingsPaths`, 因此这条路径上报的 storage error 没有文件路径 [E: packages/coding-agent/src/core/settings-manager.ts:376] [E: packages/coding-agent/src/core/settings-manager.ts:365] [E: packages/coding-agent/src/core/settings-manager.ts:369]。`inMemory()` 走 `fromStorage()`, 不是 `create()` 路径 [E: packages/coding-agent/src/core/settings-manager.ts:398] [E: packages/coding-agent/src/core/settings-manager.ts:402]。

`fromStorageWithPaths()` 默认 `projectTrusted` 为 true, 分别尝试读取 global 和 project scope; project 读取会接收 trust flag, load error 被收集进 initial errors, constructor 最终用 `deepMergeSettings(globalSettings, projectSettings)` 生成 effective settings [E: packages/coding-agent/src/core/settings-manager.ts:369] [E: packages/coding-agent/src/core/settings-manager.ts:374] [E: packages/coding-agent/src/core/settings-manager.ts:375] [E: packages/coding-agent/src/core/settings-manager.ts:376] [E: packages/coding-agent/src/core/settings-manager.ts:378] [E: packages/coding-agent/src/core/settings-manager.ts:385] [E: packages/coding-agent/src/core/settings-manager.ts:357]。

`loadFromStorage()` 在 project scope 且 `projectTrusted` 为 false 时直接返回 `{}`; 否则通过 storage 读 current content, 空内容返回 `{}`, 有内容则 `JSON.parse()` 后走 `migrateSettings()` [E: packages/coding-agent/src/core/settings-manager.ts:405] [E: packages/coding-agent/src/core/settings-manager.ts:406] [E: packages/coding-agent/src/core/settings-manager.ts:419] [E: packages/coding-agent/src/core/settings-manager.ts:423] [E: packages/coding-agent/src/core/settings-manager.ts:428] [E: packages/coding-agent/src/core/settings-manager.ts:431] [E: packages/coding-agent/src/core/settings-manager.ts:420]。

`tryLoadFromStorage()` 把 `loadFromStorage()` 包成 `{ settings, error }`; 读取或 parse 失败时返回空 settings 和 error, 让 manager 保留错误而不是在 factory 阶段抛出 [E: packages/coding-agent/src/core/settings-manager.ts:423] [E: packages/coding-agent/src/core/settings-manager.ts:429] [E: packages/coding-agent/src/core/settings-manager.ts:430] [E: packages/coding-agent/src/core/settings-manager.ts:431]。

`deepMergeSettings(base, overrides)` 委托 `deepMergeObjects`:`isMergeableObject` 只认非 null 非 array object; override value 为 `undefined` 时跳过, base/override 两侧都可合并时**递归**合并, 其他 primitive 和 array 由 override 直接替换 [E: packages/coding-agent/src/core/settings-manager.ts:160] [E: packages/coding-agent/src/core/settings-manager.ts:176] [E: packages/coding-agent/src/core/settings-manager.ts:169] [E: packages/coding-agent/src/core/settings-manager.ts:175] [E: packages/coding-agent/src/core/settings-manager.ts:188] [E: packages/coding-agent/src/core/settings-manager.ts:184]。因此 `compaction.modelOverrides["provider/modelId"]` 会按模型键再按字段合并, 项目可以只覆盖某一模型的一个 token 字段 [I]。

`migrateSettings()` 当前迁移四类 legacy shape: `queueMode` 迁到 `steeringMode`, boolean `websockets` 迁到 `transport` 的 `"websocket"`/`"sse"`, 旧 object 形式 `skills` 拆出 `enableSkillCommands` 与 `customDirectories`, `retry.maxDelayMs` 迁到 `retry.provider.maxRetryDelayMs` 后删除旧键 [E: packages/coding-agent/src/core/settings-manager.ts:436] [E: packages/coding-agent/src/core/settings-manager.ts:450] [E: packages/coding-agent/src/core/settings-manager.ts:439] [E: packages/coding-agent/src/core/settings-manager.ts:444] [E: packages/coding-agent/src/core/settings-manager.ts:445] [E: packages/coding-agent/src/core/settings-manager.ts:450] [E: packages/coding-agent/src/core/settings-manager.ts:460] [E: packages/coding-agent/src/core/settings-manager.ts:464] [E: packages/coding-agent/src/core/settings-manager.ts:471] [E: packages/coding-agent/src/core/settings-manager.ts:488] [E: packages/coding-agent/src/core/settings-manager.ts:491]。`retry.maxDelayMs` 不会迁到 `retry.maxAgentDelayMs` [I]。

## Compaction 与 retry accessors

`getCompactionTokenSetting(field, model)` 先校验 ordinary `compaction.reserveTokens` / `keepRecentTokens` 必须是非负 safe integer(有值但非法则 throw,即使该模型有合法 override) [E: packages/coding-agent/src/core/settings-manager.ts:854] [E: packages/coding-agent/src/core/settings-manager.ts:859] [E: packages/coding-agent/src/core/settings-manager.ts:860]。有 model 时用 `` `${model.provider}/${model.id}` `` 精确查找 `compaction.modelOverrides`; entry 必须是 object, override 字段同样必须是非负 safe integer [E: packages/coding-agent/src/core/settings-manager.ts:866] [E: packages/coding-agent/src/core/settings-manager.ts:867] [E: packages/coding-agent/src/core/settings-manager.ts:868] [E: packages/coding-agent/src/core/settings-manager.ts:874]。返回值是 `override ?? ordinary ?? DEFAULT_COMPACTION_TOKEN_SETTINGS[field]`, 内置默认 `reserveTokens=16384`、`keepRecentTokens=20000` [E: packages/coding-agent/src/core/settings-manager.ts:18] [E: packages/coding-agent/src/core/settings-manager.ts:879]。

`getCompactionSettings(model?)` 把解析结果收成 `{ enabled, reserveTokens, keepRecentTokens }`,其中 `enabled` 永远走 `getCompactionEnabled()`(`?? true`),不能 per-model [E: packages/coding-agent/src/core/settings-manager.ts:841] [E: packages/coding-agent/src/core/settings-manager.ts:891] [E: packages/coding-agent/src/core/settings-manager.ts:897]。这份对象的形状正好是 agent-core `CompactionSettings`; coding-agent 在调用 `shouldCompact` / `prepareCompaction` / `compact` **之前**先做 override 解析, agent-core 自己不知道 `modelOverrides` [I]。

`getRetrySettings()` 返回 `{ enabled, maxRetries, baseDelayMs, maxAgentDelayMs }`,其中 `maxAgentDelayMs` 回落 `DEFAULT_MAX_AGENT_RETRY_DELAY_MS`(从 `@earendil-works/pi-ai` 导入,值 60000) [E: packages/coding-agent/src/core/settings-manager.ts:2] [E: packages/coding-agent/src/core/settings-manager.ts:927] [E: packages/coding-agent/src/core/settings-manager.ts:932]。`getProviderRetrySettings()` 另返回 `{ timeoutMs?, maxRetries?, maxRetryDelayMs }` ,`maxRetryDelayMs` 默认 60000 [E: packages/coding-agent/src/core/settings-manager.ts:949] [E: packages/coding-agent/src/core/settings-manager.ts:953]。两套 cap 同名不同层: agent-level 封顶指数退避, provider-level 封顶服务端 `retry-after` [I]。

## Project Trust 门控

`projectTrusted` 控制 project settings 的读写: 初始读取时不 trusted 会使 project scope 返回 `{}`, `setProjectTrusted(false)` 会清空 `projectSettings`、清掉 project load error 并重新合并 effective settings [E: packages/coding-agent/src/core/settings-manager.ts:374] [E: packages/coding-agent/src/core/settings-manager.ts:406] [E: packages/coding-agent/src/core/settings-manager.ts:518] [E: packages/coding-agent/src/core/settings-manager.ts:531] [E: packages/coding-agent/src/core/settings-manager.ts:520] [E: packages/coding-agent/src/core/settings-manager.ts:521]。

`setProjectTrusted(true)` 会重新尝试读取 project scope, 保存新的 `projectSettings`/`projectSettingsLoadError`, 有错误则 recordError, 然后重新合并 global + project [E: packages/coding-agent/src/core/settings-manager.ts:525] [E: packages/coding-agent/src/core/settings-manager.ts:526] [E: packages/coding-agent/src/core/settings-manager.ts:527] [E: packages/coding-agent/src/core/settings-manager.ts:528] [E: packages/coding-agent/src/core/settings-manager.ts:529] [E: packages/coding-agent/src/core/settings-manager.ts:531]。

project 写入路径全部先过 `assertProjectTrustedForWrite()`; 未 trusted 时抛出 `"Project is not trusted; refusing to write project settings"` [E: packages/coding-agent/src/core/settings-manager.ts:589] [E: packages/coding-agent/src/core/settings-manager.ts:590] [E: packages/coding-agent/src/core/settings-manager.ts:591] [E: packages/coding-agent/src/core/settings-manager.ts:680] [E: packages/coding-agent/src/core/settings-manager.ts:709]。

## 写回策略与错误处理

global setter 修改 `globalSettings`, 调 `markModified()` 标记字段或 nested key, 再 `save()`; project setter 通过 `updateProjectSettings()` clone 当前 project settings、执行 update、标记 project modified field, 再 `saveProjectSettings()` [E: packages/coding-agent/src/core/settings-manager.ts:568] [E: packages/coding-agent/src/core/settings-manager.ts:708] [E: packages/coding-agent/src/core/settings-manager.ts:710] [E: packages/coding-agent/src/core/settings-manager.ts:699] [E: packages/coding-agent/src/core/settings-manager.ts:700] [E: packages/coding-agent/src/core/settings-manager.ts:701] [E: packages/coding-agent/src/core/settings-manager.ts:749] [E: packages/coding-agent/src/core/settings-manager.ts:739] [E: packages/coding-agent/src/core/settings-manager.ts:740] [E: packages/coding-agent/src/core/settings-manager.ts:1088] [E: packages/coding-agent/src/core/settings-manager.ts:1136]。

`save()` 和 `saveProjectSettings()` 都先更新 effective settings; 如果对应 scope 存在 load error, 它们直接返回, 因而不会把内存修改写进一个 parse 失败的 settings 文件 [E: packages/coding-agent/src/core/settings-manager.ts:663] [E: packages/coding-agent/src/core/settings-manager.ts:664] [E: packages/coding-agent/src/core/settings-manager.ts:666] [E: packages/coding-agent/src/core/settings-manager.ts:679] [E: packages/coding-agent/src/core/settings-manager.ts:682] [E: packages/coding-agent/src/core/settings-manager.ts:696]。

写入通过 `enqueueWrite()` 串到 `writeQueue`; task 执行前再次检查 project trust, 成功后清除对应 scope 的 modified field 集合, 失败时只 `recordError(scope, error)` 而不是向调用 setter 同步抛出 [E: packages/coding-agent/src/core/settings-manager.ts:610] [E: packages/coding-agent/src/core/settings-manager.ts:611] [E: packages/coding-agent/src/core/settings-manager.ts:613] [E: packages/coding-agent/src/core/settings-manager.ts:616] [E: packages/coding-agent/src/core/settings-manager.ts:617] [E: packages/coding-agent/src/core/settings-manager.ts:619] [E: packages/coding-agent/src/core/settings-manager.ts:632]。

`persistScopedSettings()` 在持锁 callback 内重新读取当前文件、再次运行 migration, 再只覆盖本次 snapshot 里标记过的 top-level field; 对标记了 nested key 的 object, 它从 current file nested object 起步, 只替换被修改的 nested key, 以降低覆盖同一 settings 文件内其它字段的风险 [E: packages/coding-agent/src/core/settings-manager.ts:632] [E: packages/coding-agent/src/core/settings-manager.ts:650] [E: packages/coding-agent/src/core/settings-manager.ts:651] [E: packages/coding-agent/src/core/settings-manager.ts:655] [E: packages/coding-agent/src/core/settings-manager.ts:644] [E: packages/coding-agent/src/core/settings-manager.ts:645] [E: packages/coding-agent/src/core/settings-manager.ts:650] [E: packages/coding-agent/src/core/settings-manager.ts:663] [I]。

`flush()` 等待 write queue 完成; `reload()` 也先等待 write queue, 然后重新读取 global/project 并清空 modified sets; `drainErrors()` 返回已收集错误并把 manager 内部 error list 清空 [E: packages/coding-agent/src/core/settings-manager.ts:534] [E: packages/coding-agent/src/core/settings-manager.ts:535] [E: packages/coding-agent/src/core/settings-manager.ts:545] [E: packages/coding-agent/src/core/settings-manager.ts:550] [E: packages/coding-agent/src/core/settings-manager.ts:559] [E: packages/coding-agent/src/core/settings-manager.ts:704] [E: packages/coding-agent/src/core/settings-manager.ts:705] [E: packages/coding-agent/src/core/settings-manager.ts:708] [E: packages/coding-agent/src/core/settings-manager.ts:709] [E: packages/coding-agent/src/core/settings-manager.ts:710]。

`collectSettingsDiagnostics` 把 `drainErrors()` 映射成 `type: "warning"` 的 runtime diagnostic,有 path 时 message 为 `Invalid settings file ${path}: ...` [E: packages/coding-agent/src/core/settings-diagnostics.ts:4] [E: packages/coding-agent/src/core/settings-diagnostics.ts:7]。`deduplicateDiagnostics` 按 `type\0message` 去重 [E: packages/coding-agent/src/core/settings-diagnostics.ts:15] [E: packages/coding-agent/src/core/settings-diagnostics.ts:20]。`main()` 在 startup 与 runtime 各收集一次,interactive 路径 `deduplicateDiagnostics` 后把结果交给 TUI `startupDiagnostics`;TUI 对 warning 调 `showWarning`,因此 invalid settings 会在启动界面显示带 path 的提示 [E: packages/coding-agent/src/main.ts:653] [E: packages/coding-agent/src/main.ts:781] [E: packages/coding-agent/src/main.ts:896] [E: packages/coding-agent/src/main.ts:936] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1085] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1089]。

## Public API 分组

model/provider/thinking/transport 相关 accessor 包括 `getDefaultProvider()`、`getDefaultModel()`、`setDefaultProvider()`、`setDefaultModel()`、`setDefaultModelAndProvider()`、`getDefaultThinkingLevel()`、`setDefaultThinkingLevel()`、`getTransport()`、`setTransport()` [E: packages/coding-agent/src/core/settings-manager.ts:729] [E: packages/coding-agent/src/core/settings-manager.ts:733] [E: packages/coding-agent/src/core/settings-manager.ts:737] [E: packages/coding-agent/src/core/settings-manager.ts:743] [E: packages/coding-agent/src/core/settings-manager.ts:749] [E: packages/coding-agent/src/core/settings-manager.ts:794] [E: packages/coding-agent/src/core/settings-manager.ts:798] [E: packages/coding-agent/src/core/settings-manager.ts:831] [E: packages/coding-agent/src/core/settings-manager.ts:835]。

resource path accessor 分成 global setters 和 project setters: packages、extensions、skills、prompts、themes 都有 getter 与 global setter, 其中 project variants 通过 `setProject*` 写 project scope [E: packages/coding-agent/src/core/settings-manager.ts:1084] [E: packages/coding-agent/src/core/settings-manager.ts:1088] [E: packages/coding-agent/src/core/settings-manager.ts:1094] [E: packages/coding-agent/src/core/settings-manager.ts:1100] [E: packages/coding-agent/src/core/settings-manager.ts:1104] [E: packages/coding-agent/src/core/settings-manager.ts:1110] [E: packages/coding-agent/src/core/settings-manager.ts:1116] [E: packages/coding-agent/src/core/settings-manager.ts:1120] [E: packages/coding-agent/src/core/settings-manager.ts:1126] [E: packages/coding-agent/src/core/settings-manager.ts:1178] [E: packages/coding-agent/src/core/settings-manager.ts:1182] [E: packages/coding-agent/src/core/settings-manager.ts:1188] [E: packages/coding-agent/src/core/settings-manager.ts:1148] [E: packages/coding-agent/src/core/settings-manager.ts:1152] [E: packages/coding-agent/src/core/settings-manager.ts:1158]。

terminal/image accessor 提供 defaults 和 numeric clamping: `showImages` 默认 true, `imageWidthCells` 非 finite 时默认 60 且最小 1, `clearOnShrink` 可由 settings 覆盖否则读 `PI_CLEAR_ON_SHRINK`, `showTerminalProgress` 默认 false, image auto resize 默认 true, block images 默认 false [E: packages/coding-agent/src/core/settings-manager.ts:1188] [E: packages/coding-agent/src/core/settings-manager.ts:1201] [E: packages/coding-agent/src/core/settings-manager.ts:1203] [E: packages/coding-agent/src/core/settings-manager.ts:1206] [E: packages/coding-agent/src/core/settings-manager.ts:1218] [E: packages/coding-agent/src/core/settings-manager.ts:1221] [E: packages/coding-agent/src/core/settings-manager.ts:1223] [E: packages/coding-agent/src/core/settings-manager.ts:1235] [E: packages/coding-agent/src/core/settings-manager.ts:1289] [E: packages/coding-agent/src/core/settings-manager.ts:1302]。`getTerminalCapabilityOverrides()` 只在 `terminal.images` 为 `kitty`/`iterm2`/`false`、或 `trueColor`/`hyperlinks` 为 concrete boolean 时覆盖检测 [E: packages/coding-agent/src/core/settings-manager.ts:1178] [E: packages/coding-agent/src/core/settings-manager.ts:1182] [E: packages/coding-agent/src/core/settings-manager.ts:1183] [E: packages/coding-agent/src/core/settings-manager.ts:1184]。`getFullscreenCopyOnSelect()` 默认 `true` [E: packages/coding-agent/src/core/settings-manager.ts:1279] [E: packages/coding-agent/src/core/settings-manager.ts:1280]。

UI/editor/session accessor 包括 theme 过滤、external editor fallback、double escape action、tree filter validation、hardware cursor env fallback、editor padding clamp、outputPad 默认值与 setter、autocomplete max clamp、code block indent、warnings clone 和 sessionDir normalization [E: packages/coding-agent/src/core/settings-manager.ts:724] [E: packages/coding-agent/src/core/settings-manager.ts:726] [E: packages/coding-agent/src/core/settings-manager.ts:783] [E: packages/coding-agent/src/core/settings-manager.ts:788] [E: packages/coding-agent/src/core/settings-manager.ts:969] [E: packages/coding-agent/src/core/settings-manager.ts:974] [E: packages/coding-agent/src/core/settings-manager.ts:978] [E: packages/coding-agent/src/core/settings-manager.ts:1376] [E: packages/coding-agent/src/core/settings-manager.ts:1340] [E: packages/coding-agent/src/core/settings-manager.ts:1342] [E: packages/coding-agent/src/core/settings-manager.ts:1352] [E: packages/coding-agent/src/core/settings-manager.ts:1353] [E: packages/coding-agent/src/core/settings-manager.ts:1408] [E: packages/coding-agent/src/core/settings-manager.ts:1367] [E: packages/coding-agent/src/core/settings-manager.ts:1372] [E: packages/coding-agent/src/core/settings-manager.ts:1373] [E: packages/coding-agent/src/core/settings-manager.ts:1376] [E: packages/coding-agent/src/core/settings-manager.ts:1377] [E: packages/coding-agent/src/core/settings-manager.ts:1382] [E: packages/coding-agent/src/core/settings-manager.ts:1387] [E: packages/coding-agent/src/core/settings-manager.ts:1392] [E: packages/coding-agent/src/core/settings-manager.ts:1408] [E: packages/coding-agent/src/core/settings-manager.ts:1412]。

network/retry accessor 包括 retry enable/defaults(含 `maxAgentDelayMs`)、provider retry defaults、HTTP idle timeout parsing and validation、WebSocket connect timeout parsing; invalid explicit timeout value 会由 `parseTimeoutSetting()` 抛出 `Invalid <settingName> setting` [E: packages/coding-agent/src/core/settings-manager.ts:188] [E: packages/coding-agent/src/core/settings-manager.ts:189] [E: packages/coding-agent/src/core/settings-manager.ts:206] [E: packages/coding-agent/src/core/settings-manager.ts:914] [E: packages/coding-agent/src/core/settings-manager.ts:927] [E: packages/coding-agent/src/core/settings-manager.ts:936] [E: packages/coding-agent/src/core/settings-manager.ts:937] [E: packages/coding-agent/src/core/settings-manager.ts:940] [E: packages/coding-agent/src/core/settings-manager.ts:941] [E: packages/coding-agent/src/core/settings-manager.ts:944] [E: packages/coding-agent/src/core/settings-manager.ts:949] [E: packages/coding-agent/src/core/settings-manager.ts:953] [E: packages/coding-agent/src/core/settings-manager.ts:957] [E: packages/coding-agent/src/core/settings-manager.ts:958]。

telemetry/changelog accessor 包括 last changelog version、collapse changelog、install telemetry 默认 true、analytics 默认 false、trackingId; 首次开启 analytics 且没有 trackingId 时会生成 `randomUUID()` 并标记 `trackingId` modified [E: packages/coding-agent/src/core/settings-manager.ts:726] [E: packages/coding-agent/src/core/settings-manager.ts:718] [E: packages/coding-agent/src/core/settings-manager.ts:1045] [E: packages/coding-agent/src/core/settings-manager.ts:1055] [E: packages/coding-agent/src/core/settings-manager.ts:1065] [E: packages/coding-agent/src/core/settings-manager.ts:1069] [E: packages/coding-agent/src/core/settings-manager.ts:1120] [E: packages/coding-agent/src/core/settings-manager.ts:1077] [E: packages/coding-agent/src/core/settings-manager.ts:1078] [E: packages/coding-agent/src/core/settings-manager.ts:1079]。

## 设计动机与权衡

settings manager 采用 effective settings 缓存: 读取阶段合并 global/project, setter 阶段先更新内存 effective settings, 写入阶段通过 `writeQueue` 异步串行化; 这让同步 setter API 可以快速返回, 但调用方若需要确认落盘必须调用 `flush()` [E: packages/coding-agent/src/core/settings-manager.ts:315] [E: packages/coding-agent/src/core/settings-manager.ts:663] [E: packages/coding-agent/src/core/settings-manager.ts:610] [E: packages/coding-agent/src/core/settings-manager.ts:704] [I]。

写回不是简单把整份 in-memory settings 覆盖到磁盘: `persistScopedSettings()` 在 lock 内重新读取当前文件, 只写 modified field 和 modified nested keys; 这保护同一 settings 文件中未被本 manager 修改的键。effective settings 的 `deepMergeObjects` 对 nested object 递归合并,但 persist 路径只替换被标记的 nested key,不会把整个深层 object 当作未修改字段保留 [E: packages/coding-agent/src/core/settings-manager.ts:650] [E: packages/coding-agent/src/core/settings-manager.ts:643] [E: packages/coding-agent/src/core/settings-manager.ts:644] [E: packages/coding-agent/src/core/settings-manager.ts:645] [E: packages/coding-agent/src/core/settings-manager.ts:650] [E: packages/coding-agent/src/core/settings-manager.ts:663] [E: packages/coding-agent/src/core/settings-manager.ts:175] [E: packages/coding-agent/src/core/settings-manager.ts:184] [I]。

parse error 的 scope 会被保护为 no-write: `save()` 和 `saveProjectSettings()` 在对应 load error 存在时直接返回, 因而不会用部分内存状态覆盖用户的损坏 JSON; 错误通过 `drainErrors()` 交给上层展示或处理 [E: packages/coding-agent/src/core/settings-manager.ts:666] [E: packages/coding-agent/src/core/settings-manager.ts:684] [E: packages/coding-agent/src/core/settings-manager.ts:708] [I]。

## Gotcha

- `applyOverrides()` 只修改 effective `settings`, 不更新 `globalSettings` 或 `projectSettings`, 也不触发 save; 它适合 runtime override, 不是持久化 setter [E: packages/coding-agent/src/core/settings-manager.ts:563] [E: packages/coding-agent/src/core/settings-manager.ts:564] [I]。
- `setProjectTrusted(false)` 会清空已加载 project settings 的内存副本, 但不会删除磁盘 project settings 文件; 这个节点只从代码确认内存行为和合并行为 [E: packages/coding-agent/src/core/settings-manager.ts:518] [E: packages/coding-agent/src/core/settings-manager.ts:519] [E: packages/coding-agent/src/core/settings-manager.ts:521] [I]。
- `getTheme()` 对包含 `/` 的 theme string 返回 `undefined`, 而 `getThemeSetting()` 仍返回原始 string; 这暗示 slash-containing theme value 可能被其他 resource path 机制处理, 但本文件没有展开该机制 [E: packages/coding-agent/src/core/settings-manager.ts:783] [E: packages/coding-agent/src/core/settings-manager.ts:785] [E: packages/coding-agent/src/core/settings-manager.ts:777] [I]。
- 非法 ordinary `compaction.reserveTokens` / `keepRecentTokens` 会在读时 throw,即使 matching model override 合法;只有 **省略** 的 ordinary 值才回落到 16384/20000 [E: packages/coding-agent/src/core/settings-manager.ts:859] [E: packages/coding-agent/src/core/settings-manager.ts:879]。

## 跨包边界

[surface.config.settings](../../surface/config/settings.md): 用户可见的 settings surface 应解释 settings 文件格式、CLI 或命令入口和用户行为; 本节点只解释 `SettingsManager` 如何读、合并、迁移、写回这些值 [I]。

[subsys.coding-agent.config-resolution](config-resolution.md): config value resolution 节点应解释 `$ENV`、`!cmd` 等动态值如何解析; 本节点只把 settings JSON 当作已经 parse 出来的 value graph, 只对 timeout 字段调用本文件引入的 `parseHttpIdleTimeoutMs()` [E: packages/coding-agent/src/core/settings-manager.ts:11] [E: packages/coding-agent/src/core/settings-manager.ts:188] [I]。

[ref.coding-agent.config-keys](../../reference/config-keys.md): config-key catalog 应逐 key 覆盖默认值、含义和来源; 本节点只把 `Settings` interface 与 getter/setter 分组, 不承担完整 key catalog 的全覆盖责任 [E: packages/coding-agent/src/core/settings-manager.ts:106] [I]。

`@earendil-works/pi-ai` 通过 `Transport` type 影响 `transport` setting,并通过 `DEFAULT_MAX_AGENT_RETRY_DELAY_MS` 提供 agent retry cap 默认值; settings manager 本身属于 `@earendil-works/pi-coding-agent` 产品层 [E: packages/coding-agent/src/core/settings-manager.ts:2] [E: packages/coding-agent/src/core/settings-manager.ts:99] [E: packages/coding-agent/src/core/settings-manager.ts:112] [I]。

## Sources

- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/core/settings-diagnostics.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts

## 相关

- [surface.config.settings](../../surface/config/settings.md): settings 的用户可见入口、文件格式和配置面说明。
- [subsys.coding-agent.config-resolution](config-resolution.md): `$ENV`、`!cmd` 等配置值解析规则。
- [ref.coding-agent.config-keys](../../reference/config-keys.md): 配置键完整目录和每个 key 的默认值/含义。

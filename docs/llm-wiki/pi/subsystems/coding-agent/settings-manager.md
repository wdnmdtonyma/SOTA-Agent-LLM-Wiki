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
  - SettingsStorage
  - FileSettingsStorage
  - InMemorySettingsStorage
related:
  - surface.config.settings
  - subsys.coding-agent.config-resolution
  - ref.coding-agent.config-keys
evidence: explicit
status: verified
updated: 305c014dcc
---

> `subsys.coding-agent.settings-manager` 描述 pi-coding-agent 的 settings manager: 它把 global `settings.json` 与 project `.pi/settings.json` 读入内存, 做 project-over-global merge, 通过 lockfile 和 write queue 保存局部修改, 并用 project trust 门控 project scope。

## 能回答的问题

- `SettingsManager` 从哪里读取 global settings 和 project settings?
- project settings 什么时候被跳过, 什么时候拒绝写入?
- `deepMergeSettings` 如何处理 nested object、primitive 和 array?
- settings 写回时如何避免覆盖同文件里的并发改动?
- 旧配置键 `queueMode`、`websockets`、旧版 `skills`、`retry.maxDelayMs` 怎样迁移?
- storage abstraction、file backend 与 in-memory backend 分别怎样接入 manager?

## 职责边界

`packages/coding-agent/src/core/settings-manager.ts` 是 pi-coding-agent 的 settings storage 与 accessor 层: 它定义 `Settings` 数据模型、`SettingsStorage` 抽象、file/in-memory storage、`SettingsManager` factory、migration、merge、project trust、write queue、error draining 以及一组 typed getters/setters [E: packages/coding-agent/src/core/settings-manager.ts:86] [E: packages/coding-agent/src/core/settings-manager.ts:184] [E: packages/coding-agent/src/core/settings-manager.ts:193] [E: packages/coding-agent/src/core/settings-manager.ts:262] [E: packages/coding-agent/src/core/settings-manager.ts:279]。

本节点不权威枚举每个配置键的用户文档含义; `ref.coding-agent.config-keys` 应按 config-key catalog 形式覆盖所有 key, 而本节点只解释 settings manager 的读、合并、锁、迁移、写回和 trust 行为 [I]。

## 关键文件

- `packages/coding-agent/src/core/settings-manager.ts`: 本节点唯一 source, 覆盖 `SettingsManager`、`Settings`、`SettingsStorage`、`FileSettingsStorage`、`InMemorySettingsStorage`、`deepMergeSettings`、migration 和全部 public accessors [E: packages/coding-agent/src/core/settings-manager.ts:86] [E: packages/coding-agent/src/core/settings-manager.ts:137] [E: packages/coding-agent/src/core/settings-manager.ts:184] [E: packages/coding-agent/src/core/settings-manager.ts:193] [E: packages/coding-agent/src/core/settings-manager.ts:262] [E: packages/coding-agent/src/core/settings-manager.ts:279]。

## 数据模型

`Settings` 是一个宽接口, 覆盖 provider/model/thinking、transport、TUI theme、compaction、retry、shell/editor、resource packages、extensions/skills/prompts/themes、terminal/image、tree/editor/output padding/autocomplete、markdown warnings、sessionDir 和 network timeout/proxy 等键 [E: packages/coding-agent/src/core/settings-manager.ts:86] [E: packages/coding-agent/src/core/settings-manager.ts:88] [E: packages/coding-agent/src/core/settings-manager.ts:95] [E: packages/coding-agent/src/core/settings-manager.ts:97] [E: packages/coding-agent/src/core/settings-manager.ts:110] [E: packages/coding-agent/src/core/settings-manager.ts:116] [E: packages/coding-agent/src/core/settings-manager.ts:121] [E: packages/coding-agent/src/core/settings-manager.ts:128] [E: packages/coding-agent/src/core/settings-manager.ts:129] [E: packages/coding-agent/src/core/settings-manager.ts:131]。

`PackageSource` 支持 string 形式和 object 形式；object 形式包含 `source`、可选 `autoload`，以及可选的 `extensions`、`skills`、`prompts`、`themes` filter arrays。`autoload: false` 表示先禁用默认全量加载，再只应用显式 patterns [E: packages/coding-agent/src/core/settings-manager.ts:75] [E: packages/coding-agent/src/core/settings-manager.ts:78] [E: packages/coding-agent/src/core/settings-manager.ts:79] [E: packages/coding-agent/src/core/settings-manager.ts:80] [E: packages/coding-agent/src/core/settings-manager.ts:81] [E: packages/coding-agent/src/core/settings-manager.ts:82] [E: packages/coding-agent/src/core/settings-manager.ts:83] [I]。

`SettingsScope` 只有 `"global"` 和 `"project"` 两个 scope; `SettingsStorage.withLock(scope, fn)` 接收当前文件内容字符串或 `undefined`, 并用返回的 string 写回, 返回 `undefined` 表示不写 [E: packages/coding-agent/src/core/settings-manager.ts:178] [E: packages/coding-agent/src/core/settings-manager.ts:184] [E: packages/coding-agent/src/core/settings-manager.ts:185]。

`SettingsManager` 持有三份 settings: `globalSettings`、`projectSettings` 和合并后的 `settings`; 它还维护 global/project 各自的 modified fields、modified nested fields、load error、write queue 与 error list [E: packages/coding-agent/src/core/settings-manager.ts:280] [E: packages/coding-agent/src/core/settings-manager.ts:281] [E: packages/coding-agent/src/core/settings-manager.ts:282] [E: packages/coding-agent/src/core/settings-manager.ts:283] [E: packages/coding-agent/src/core/settings-manager.ts:285] [E: packages/coding-agent/src/core/settings-manager.ts:287] [E: packages/coding-agent/src/core/settings-manager.ts:289] [E: packages/coding-agent/src/core/settings-manager.ts:291] [E: packages/coding-agent/src/core/settings-manager.ts:292]。

## 存储路径与锁

`FileSettingsStorage` 在 constructor 里 resolve cwd 和 agentDir, 把 global path 设为 `<agentDir>/settings.json`, 把 project path 设为 `<cwd>/<CONFIG_DIR_NAME>/settings.json`; `CONFIG_DIR_NAME` 来自 `../config.ts`, 本文件未在证据范围内展开其字面值 [E: packages/coding-agent/src/core/settings-manager.ts:197] [E: packages/coding-agent/src/core/settings-manager.ts:198] [E: packages/coding-agent/src/core/settings-manager.ts:199] [E: packages/coding-agent/src/core/settings-manager.ts:200] [E: packages/coding-agent/src/core/settings-manager.ts:201] [U]。

文件锁由 `proper-lockfile.lockSync(path, { realpath: false })` 获取; 遇到 `ELOCKED` 时最多重试 10 次, 每次 busy-wait 20ms, 非 `ELOCKED` 或最后一次失败会抛出原错误 [E: packages/coding-agent/src/core/settings-manager.ts:204] [E: packages/coding-agent/src/core/settings-manager.ts:205] [E: packages/coding-agent/src/core/settings-manager.ts:206] [E: packages/coding-agent/src/core/settings-manager.ts:209] [E: packages/coding-agent/src/core/settings-manager.ts:211] [E: packages/coding-agent/src/core/settings-manager.ts:217] [E: packages/coding-agent/src/core/settings-manager.ts:222]。

`FileSettingsStorage.withLock()` 只在文件已存在时先加锁读取; 如果 callback 要写入且之前没有锁, 它会先创建目录再对目标 path 加锁并写入 UTF-8 内容, finally 释放锁 [E: packages/coding-agent/src/core/settings-manager.ts:231] [E: packages/coding-agent/src/core/settings-manager.ts:238] [E: packages/coding-agent/src/core/settings-manager.ts:240] [E: packages/coding-agent/src/core/settings-manager.ts:242] [E: packages/coding-agent/src/core/settings-manager.ts:244] [E: packages/coding-agent/src/core/settings-manager.ts:247] [E: packages/coding-agent/src/core/settings-manager.ts:250] [E: packages/coding-agent/src/core/settings-manager.ts:252] [E: packages/coding-agent/src/core/settings-manager.ts:256]。

`InMemorySettingsStorage` 是同一 `SettingsStorage` 协议的测试/嵌入式后端: 它按 scope 读写两个内存 string slot, 不做文件 I/O 或 lockfile [E: packages/coding-agent/src/core/settings-manager.ts:262] [E: packages/coding-agent/src/core/settings-manager.ts:263] [E: packages/coding-agent/src/core/settings-manager.ts:264] [E: packages/coding-agent/src/core/settings-manager.ts:266] [E: packages/coding-agent/src/core/settings-manager.ts:270] [E: packages/coding-agent/src/core/settings-manager.ts:273]。

## 读取、迁移与合并

`SettingsManager.create(cwd, agentDir, options)` 创建 `FileSettingsStorage`, 然后委托 `fromStorage()`; 默认 agentDir 是 `getAgentDir()` [E: packages/coding-agent/src/core/settings-manager.ts:314] [E: packages/coding-agent/src/core/settings-manager.ts:316] [E: packages/coding-agent/src/core/settings-manager.ts:319] [E: packages/coding-agent/src/core/settings-manager.ts:320]。

`SettingsManager.fromStorage(storage, options)` 默认 `projectTrusted` 为 true, 分别尝试读取 global 和 project scope; project 读取会接收 trust flag, load error 被收集进 initial errors, constructor 最终用 `deepMergeSettings(globalSettings, projectSettings)` 生成 effective settings [E: packages/coding-agent/src/core/settings-manager.ts:324] [E: packages/coding-agent/src/core/settings-manager.ts:325] [E: packages/coding-agent/src/core/settings-manager.ts:326] [E: packages/coding-agent/src/core/settings-manager.ts:327] [E: packages/coding-agent/src/core/settings-manager.ts:329] [E: packages/coding-agent/src/core/settings-manager.ts:333] [E: packages/coding-agent/src/core/settings-manager.ts:336] [E: packages/coding-agent/src/core/settings-manager.ts:310]。

`loadFromStorage()` 在 project scope 且 `projectTrusted` 为 false 时直接返回 `{}`; 否则通过 storage 读 current content, 空内容返回 `{}`, 有内容则 `JSON.parse()` 后走 `migrateSettings()` [E: packages/coding-agent/src/core/settings-manager.ts:355] [E: packages/coding-agent/src/core/settings-manager.ts:356] [E: packages/coding-agent/src/core/settings-manager.ts:357] [E: packages/coding-agent/src/core/settings-manager.ts:361] [E: packages/coding-agent/src/core/settings-manager.ts:366] [E: packages/coding-agent/src/core/settings-manager.ts:369] [E: packages/coding-agent/src/core/settings-manager.ts:370]。

`tryLoadFromStorage()` 把 `loadFromStorage()` 包成 `{ settings, error }`; 读取或 parse 失败时返回空 settings 和 error, 让 manager 保留错误而不是在 factory 阶段抛出 [E: packages/coding-agent/src/core/settings-manager.ts:373] [E: packages/coding-agent/src/core/settings-manager.ts:378] [E: packages/coding-agent/src/core/settings-manager.ts:379] [E: packages/coding-agent/src/core/settings-manager.ts:380] [E: packages/coding-agent/src/core/settings-manager.ts:381]。

`deepMergeSettings(base, overrides)` 以 base shallow copy 起步; override value 为 `undefined` 时跳过, base/override 两侧都是非数组 object 时只合并这一层 nested object, 其他 primitive 和 array 由 override 直接替换 [E: packages/coding-agent/src/core/settings-manager.ts:137] [E: packages/coding-agent/src/core/settings-manager.ts:138] [E: packages/coding-agent/src/core/settings-manager.ts:140] [E: packages/coding-agent/src/core/settings-manager.ts:144] [E: packages/coding-agent/src/core/settings-manager.ts:150] [E: packages/coding-agent/src/core/settings-manager.ts:152] [E: packages/coding-agent/src/core/settings-manager.ts:157] [E: packages/coding-agent/src/core/settings-manager.ts:160]。

`migrateSettings()` 当前迁移四类 legacy shape: `queueMode` 迁到 `steeringMode`, boolean `websockets` 迁到 `transport` 的 `"websocket"`/`"sse"`, 旧 object 形式 `skills` 拆出 `enableSkillCommands` 与 `customDirectories`, `retry.maxDelayMs` 迁到 `retry.provider.maxRetryDelayMs` 后删除旧键 [E: packages/coding-agent/src/core/settings-manager.ts:386] [E: packages/coding-agent/src/core/settings-manager.ts:388] [E: packages/coding-agent/src/core/settings-manager.ts:389] [E: packages/coding-agent/src/core/settings-manager.ts:394] [E: packages/coding-agent/src/core/settings-manager.ts:395] [E: packages/coding-agent/src/core/settings-manager.ts:400] [E: packages/coding-agent/src/core/settings-manager.ts:410] [E: packages/coding-agent/src/core/settings-manager.ts:414] [E: packages/coding-agent/src/core/settings-manager.ts:421] [E: packages/coding-agent/src/core/settings-manager.ts:436] [E: packages/coding-agent/src/core/settings-manager.ts:441]。

## Project Trust 门控

`projectTrusted` 控制 project settings 的读写: 初始读取时不 trusted 会使 project scope 返回 `{}`, `setProjectTrusted(false)` 会清空 `projectSettings`、清掉 project load error 并重新合并 effective settings [E: packages/coding-agent/src/core/settings-manager.ts:325] [E: packages/coding-agent/src/core/settings-manager.ts:356] [E: packages/coding-agent/src/core/settings-manager.ts:468] [E: packages/coding-agent/src/core/settings-manager.ts:469] [E: packages/coding-agent/src/core/settings-manager.ts:470] [E: packages/coding-agent/src/core/settings-manager.ts:471]。

`setProjectTrusted(true)` 会重新尝试读取 project scope, 保存新的 `projectSettings`/`projectSettingsLoadError`, 有错误则 recordError, 然后重新合并 global + project [E: packages/coding-agent/src/core/settings-manager.ts:475] [E: packages/coding-agent/src/core/settings-manager.ts:476] [E: packages/coding-agent/src/core/settings-manager.ts:477] [E: packages/coding-agent/src/core/settings-manager.ts:478] [E: packages/coding-agent/src/core/settings-manager.ts:479] [E: packages/coding-agent/src/core/settings-manager.ts:481]。

project 写入路径全部先过 `assertProjectTrustedForWrite()`; 未 trusted 时抛出 `"Project is not trusted; refusing to write project settings"` [E: packages/coding-agent/src/core/settings-manager.ts:539] [E: packages/coding-agent/src/core/settings-manager.ts:540] [E: packages/coding-agent/src/core/settings-manager.ts:541] [E: packages/coding-agent/src/core/settings-manager.ts:631] [E: packages/coding-agent/src/core/settings-manager.ts:648]。

## 写回策略与错误处理

global setter 修改 `globalSettings`, 调 `markModified()` 标记字段或 nested key, 再 `save()`; project setter 通过 `updateProjectSettings()` clone 当前 project settings、执行 update、标记 project modified field, 再 `saveProjectSettings()` [E: packages/coding-agent/src/core/settings-manager.ts:518] [E: packages/coding-agent/src/core/settings-manager.ts:647] [E: packages/coding-agent/src/core/settings-manager.ts:649] [E: packages/coding-agent/src/core/settings-manager.ts:650] [E: packages/coding-agent/src/core/settings-manager.ts:651] [E: packages/coding-agent/src/core/settings-manager.ts:652] [E: packages/coding-agent/src/core/settings-manager.ts:688] [E: packages/coding-agent/src/core/settings-manager.ts:690] [E: packages/coding-agent/src/core/settings-manager.ts:691] [E: packages/coding-agent/src/core/settings-manager.ts:984] [E: packages/coding-agent/src/core/settings-manager.ts:985]。

`save()` 和 `saveProjectSettings()` 都先更新 effective settings; 如果对应 scope 存在 load error, 它们直接返回, 因而不会把内存修改写进一个 parse 失败的 settings 文件 [E: packages/coding-agent/src/core/settings-manager.ts:614] [E: packages/coding-agent/src/core/settings-manager.ts:615] [E: packages/coding-agent/src/core/settings-manager.ts:617] [E: packages/coding-agent/src/core/settings-manager.ts:630] [E: packages/coding-agent/src/core/settings-manager.ts:633] [E: packages/coding-agent/src/core/settings-manager.ts:635]。

写入通过 `enqueueWrite()` 串到 `writeQueue`; task 执行前再次检查 project trust, 成功后清除对应 scope 的 modified field 集合, 失败时只 `recordError(scope, error)` 而不是向调用 setter 同步抛出 [E: packages/coding-agent/src/core/settings-manager.ts:561] [E: packages/coding-agent/src/core/settings-manager.ts:562] [E: packages/coding-agent/src/core/settings-manager.ts:564] [E: packages/coding-agent/src/core/settings-manager.ts:567] [E: packages/coding-agent/src/core/settings-manager.ts:568] [E: packages/coding-agent/src/core/settings-manager.ts:570] [E: packages/coding-agent/src/core/settings-manager.ts:571]。

`persistScopedSettings()` 在持锁 callback 内重新读取当前文件、再次运行 migration, 再只覆盖本次 snapshot 里标记过的 top-level field; 对标记了 nested key 的 object, 它从 current file nested object 起步, 只替换被修改的 nested key, 以降低覆盖同一 settings 文件内其它字段的风险 [E: packages/coding-agent/src/core/settings-manager.ts:583] [E: packages/coding-agent/src/core/settings-manager.ts:589] [E: packages/coding-agent/src/core/settings-manager.ts:590] [E: packages/coding-agent/src/core/settings-manager.ts:593] [E: packages/coding-agent/src/core/settings-manager.ts:594] [E: packages/coding-agent/src/core/settings-manager.ts:596] [E: packages/coding-agent/src/core/settings-manager.ts:598] [E: packages/coding-agent/src/core/settings-manager.ts:600] [E: packages/coding-agent/src/core/settings-manager.ts:601] [E: packages/coding-agent/src/core/settings-manager.ts:602] [E: packages/coding-agent/src/core/settings-manager.ts:606] [I]。

`flush()` 等待 write queue 完成; `reload()` 也先等待 write queue, 然后重新读取 global/project 并清空 modified sets; `drainErrors()` 返回已收集错误并把 manager 内部 error list 清空 [E: packages/coding-agent/src/core/settings-manager.ts:484] [E: packages/coding-agent/src/core/settings-manager.ts:485] [E: packages/coding-agent/src/core/settings-manager.ts:495] [E: packages/coding-agent/src/core/settings-manager.ts:500] [E: packages/coding-agent/src/core/settings-manager.ts:509] [E: packages/coding-agent/src/core/settings-manager.ts:655] [E: packages/coding-agent/src/core/settings-manager.ts:656] [E: packages/coding-agent/src/core/settings-manager.ts:659] [E: packages/coding-agent/src/core/settings-manager.ts:660] [E: packages/coding-agent/src/core/settings-manager.ts:661]。

## Public API 分组

model/provider/thinking/transport 相关 accessor 包括 `getDefaultProvider()`、`getDefaultModel()`、`setDefaultProvider()`、`setDefaultModel()`、`setDefaultModelAndProvider()`、`getDefaultThinkingLevel()`、`setDefaultThinkingLevel()`、`getTransport()`、`setTransport()` [E: packages/coding-agent/src/core/settings-manager.ts:680] [E: packages/coding-agent/src/core/settings-manager.ts:684] [E: packages/coding-agent/src/core/settings-manager.ts:688] [E: packages/coding-agent/src/core/settings-manager.ts:694] [E: packages/coding-agent/src/core/settings-manager.ts:700] [E: packages/coding-agent/src/core/settings-manager.ts:745] [E: packages/coding-agent/src/core/settings-manager.ts:749] [E: packages/coding-agent/src/core/settings-manager.ts:755] [E: packages/coding-agent/src/core/settings-manager.ts:759]。

resource path accessor 分成 global setters 和 project setters: packages、extensions、skills、prompts、themes 都有 getter 与 global setter, 其中 project variants 通过 `setProject*` 写 project scope [E: packages/coding-agent/src/core/settings-manager.ts:974] [E: packages/coding-agent/src/core/settings-manager.ts:978] [E: packages/coding-agent/src/core/settings-manager.ts:984] [E: packages/coding-agent/src/core/settings-manager.ts:990] [E: packages/coding-agent/src/core/settings-manager.ts:994] [E: packages/coding-agent/src/core/settings-manager.ts:1000] [E: packages/coding-agent/src/core/settings-manager.ts:1006] [E: packages/coding-agent/src/core/settings-manager.ts:1010] [E: packages/coding-agent/src/core/settings-manager.ts:1016] [E: packages/coding-agent/src/core/settings-manager.ts:1022] [E: packages/coding-agent/src/core/settings-manager.ts:1026] [E: packages/coding-agent/src/core/settings-manager.ts:1032] [E: packages/coding-agent/src/core/settings-manager.ts:1038] [E: packages/coding-agent/src/core/settings-manager.ts:1042] [E: packages/coding-agent/src/core/settings-manager.ts:1048]。

terminal/image accessor 提供 defaults 和 numeric clamping: `showImages` 默认 true, `imageWidthCells` 非 finite 时默认 60 且最小 1, `clearOnShrink` 可由 settings 覆盖否则读 `PI_CLEAR_ON_SHRINK`, `showTerminalProgress` 默认 false, image auto resize 默认 true, block images 默认 false [E: packages/coding-agent/src/core/settings-manager.ts:1068] [E: packages/coding-agent/src/core/settings-manager.ts:1081] [E: packages/coding-agent/src/core/settings-manager.ts:1083] [E: packages/coding-agent/src/core/settings-manager.ts:1086] [E: packages/coding-agent/src/core/settings-manager.ts:1098] [E: packages/coding-agent/src/core/settings-manager.ts:1101] [E: packages/coding-agent/src/core/settings-manager.ts:1103] [E: packages/coding-agent/src/core/settings-manager.ts:1115] [E: packages/coding-agent/src/core/settings-manager.ts:1149] [E: packages/coding-agent/src/core/settings-manager.ts:1162]。

UI/editor/session accessor 包括 theme 过滤、external editor fallback、double escape action、tree filter validation、hardware cursor env fallback、editor padding clamp、outputPad 默认值与 setter、autocomplete max clamp、code block indent、warnings clone 和 sessionDir normalization [E: packages/coding-agent/src/core/settings-manager.ts:675] [E: packages/coding-agent/src/core/settings-manager.ts:677] [E: packages/coding-agent/src/core/settings-manager.ts:728] [E: packages/coding-agent/src/core/settings-manager.ts:736] [E: packages/coding-agent/src/core/settings-manager.ts:859] [E: packages/coding-agent/src/core/settings-manager.ts:864] [E: packages/coding-agent/src/core/settings-manager.ts:868] [E: packages/coding-agent/src/core/settings-manager.ts:1185] [E: packages/coding-agent/src/core/settings-manager.ts:1195] [E: packages/coding-agent/src/core/settings-manager.ts:1197] [E: packages/coding-agent/src/core/settings-manager.ts:1207] [E: packages/coding-agent/src/core/settings-manager.ts:1208] [E: packages/coding-agent/src/core/settings-manager.ts:1217] [E: packages/coding-agent/src/core/settings-manager.ts:1222] [E: packages/coding-agent/src/core/settings-manager.ts:1227] [E: packages/coding-agent/src/core/settings-manager.ts:1228] [E: packages/coding-agent/src/core/settings-manager.ts:1231] [E: packages/coding-agent/src/core/settings-manager.ts:1232] [E: packages/coding-agent/src/core/settings-manager.ts:1237] [E: packages/coding-agent/src/core/settings-manager.ts:1242] [E: packages/coding-agent/src/core/settings-manager.ts:1247] [E: packages/coding-agent/src/core/settings-manager.ts:1251] [E: packages/coding-agent/src/core/settings-manager.ts:1255]。

network/retry accessor 包括 retry enable/defaults、provider retry defaults、HTTP idle timeout parsing and validation、WebSocket connect timeout parsing; invalid explicit timeout value 会由 `parseTimeoutSetting()` 抛出 `Invalid <settingName> setting` [E: packages/coding-agent/src/core/settings-manager.ts:167] [E: packages/coding-agent/src/core/settings-manager.ts:168] [E: packages/coding-agent/src/core/settings-manager.ts:173] [E: packages/coding-agent/src/core/settings-manager.ts:805] [E: packages/coding-agent/src/core/settings-manager.ts:818] [E: packages/coding-agent/src/core/settings-manager.ts:821] [E: packages/coding-agent/src/core/settings-manager.ts:826] [E: packages/coding-agent/src/core/settings-manager.ts:827] [E: packages/coding-agent/src/core/settings-manager.ts:830] [E: packages/coding-agent/src/core/settings-manager.ts:831] [E: packages/coding-agent/src/core/settings-manager.ts:834] [E: packages/coding-agent/src/core/settings-manager.ts:839] [E: packages/coding-agent/src/core/settings-manager.ts:843] [E: packages/coding-agent/src/core/settings-manager.ts:847] [E: packages/coding-agent/src/core/settings-manager.ts:848]。

telemetry/changelog accessor 包括 last changelog version、collapse changelog、install telemetry 默认 true、analytics 默认 false、trackingId; 首次开启 analytics 且没有 trackingId 时会生成 `randomUUID()` 并标记 `trackingId` modified [E: packages/coding-agent/src/core/settings-manager.ts:665] [E: packages/coding-agent/src/core/settings-manager.ts:669] [E: packages/coding-agent/src/core/settings-manager.ts:935] [E: packages/coding-agent/src/core/settings-manager.ts:945] [E: packages/coding-agent/src/core/settings-manager.ts:955] [E: packages/coding-agent/src/core/settings-manager.ts:959] [E: packages/coding-agent/src/core/settings-manager.ts:964] [E: packages/coding-agent/src/core/settings-manager.ts:967] [E: packages/coding-agent/src/core/settings-manager.ts:968] [E: packages/coding-agent/src/core/settings-manager.ts:969]。

## 设计动机与权衡

settings manager 采用 effective settings 缓存: 读取阶段合并 global/project, setter 阶段先更新内存 effective settings, 写入阶段通过 `writeQueue` 异步串行化; 这让同步 setter API 可以快速返回, 但调用方若需要确认落盘必须调用 `flush()` [E: packages/coding-agent/src/core/settings-manager.ts:283] [E: packages/coding-agent/src/core/settings-manager.ts:614] [E: packages/coding-agent/src/core/settings-manager.ts:561] [E: packages/coding-agent/src/core/settings-manager.ts:655] [I]。

写回不是简单把整份 in-memory settings 覆盖到磁盘: `persistScopedSettings()` 在 lock 内重新读取当前文件, 只写 modified field 和 modified nested keys; 这保护同一 settings 文件中未被本 manager 修改的键, 但 nested merge 只是一层, 更深层 object 不会递归合并 [E: packages/coding-agent/src/core/settings-manager.ts:589] [E: packages/coding-agent/src/core/settings-manager.ts:593] [E: packages/coding-agent/src/core/settings-manager.ts:594] [E: packages/coding-agent/src/core/settings-manager.ts:596] [E: packages/coding-agent/src/core/settings-manager.ts:601] [E: packages/coding-agent/src/core/settings-manager.ts:602] [E: packages/coding-agent/src/core/settings-manager.ts:137] [E: packages/coding-agent/src/core/settings-manager.ts:157] [I]。

parse error 的 scope 会被保护为 no-write: `save()` 和 `saveProjectSettings()` 在对应 load error 存在时直接返回, 因而不会用部分内存状态覆盖用户的损坏 JSON; 错误通过 `drainErrors()` 交给上层展示或处理 [E: packages/coding-agent/src/core/settings-manager.ts:617] [E: packages/coding-agent/src/core/settings-manager.ts:635] [E: packages/coding-agent/src/core/settings-manager.ts:659] [I]。

## Gotcha

- `applyOverrides()` 只修改 effective `settings`, 不更新 `globalSettings` 或 `projectSettings`, 也不触发 save; 它适合 runtime override, 不是持久化 setter [E: packages/coding-agent/src/core/settings-manager.ts:513] [E: packages/coding-agent/src/core/settings-manager.ts:514] [I]。
- `setProjectTrusted(false)` 会清空已加载 project settings 的内存副本, 但不会删除磁盘 project settings 文件; 这个节点只从代码确认内存行为和合并行为 [E: packages/coding-agent/src/core/settings-manager.ts:468] [E: packages/coding-agent/src/core/settings-manager.ts:469] [E: packages/coding-agent/src/core/settings-manager.ts:471] [I]。
- `getTheme()` 对包含 `/` 的 theme string 返回 `undefined`, 而 `getThemeSetting()` 仍返回原始 string; 这暗示 slash-containing theme value 可能被其他 resource path 机制处理, 但本文件没有展开该机制 [E: packages/coding-agent/src/core/settings-manager.ts:728] [E: packages/coding-agent/src/core/settings-manager.ts:735] [E: packages/coding-agent/src/core/settings-manager.ts:736] [I]。

## 跨包边界

[surface.config.settings](../../surface/config/settings.md): 用户可见的 settings surface 应解释 settings 文件格式、CLI 或命令入口和用户行为; 本节点只解释 `SettingsManager` 如何读、合并、迁移、写回这些值 [I]。

[subsys.coding-agent.config-resolution](config-resolution.md): config value resolution 节点应解释 `$ENV`、`!cmd` 等动态值如何解析; 本节点只把 settings JSON 当作已经 parse 出来的 value graph, 只对 timeout 字段调用本文件引入的 `parseHttpIdleTimeoutMs()` [E: packages/coding-agent/src/core/settings-manager.ts:10] [E: packages/coding-agent/src/core/settings-manager.ts:167] [I]。

[ref.coding-agent.config-keys](../../reference/config-keys.md): config-key catalog 应逐 key 覆盖默认值、含义和来源; 本节点只把 `Settings` interface 与 getter/setter 分组, 不承担完整 key catalog 的全覆盖责任 [E: packages/coding-agent/src/core/settings-manager.ts:86] [I]。

`@earendil-works/pi-ai` 只通过 `Transport` type 影响 `transport` setting 的类型; settings manager 本身属于 `@earendil-works/pi-coding-agent` 产品层 [E: packages/coding-agent/src/core/settings-manager.ts:2] [E: packages/coding-agent/src/core/settings-manager.ts:67] [E: packages/coding-agent/src/core/settings-manager.ts:91] [I]。

## Sources

- packages/coding-agent/src/core/settings-manager.ts

## 相关

- [surface.config.settings](../../surface/config/settings.md): settings 的用户可见入口、文件格式和配置面说明。
- [subsys.coding-agent.config-resolution](config-resolution.md): `$ENV`、`!cmd` 等配置值解析规则。
- [ref.coding-agent.config-keys](../../reference/config-keys.md): 配置键完整目录和每个 key 的默认值/含义。

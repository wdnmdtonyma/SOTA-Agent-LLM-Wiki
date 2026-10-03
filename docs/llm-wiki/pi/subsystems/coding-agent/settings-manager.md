---
id: subsys.coding-agent.settings-manager
title: 设置管理(读/合并/锁)
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/core/settings-diagnostics.ts
  - packages/coding-agent/src/config.ts
  - packages/coding-agent/src/main.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/src/extensions/codemode/index.ts
  - packages/coding-agent/test/settings-manager.test.ts
symbols:
  - SettingsManager
  - SettingsStorage
  - FileSettingsStorage
  - InMemorySettingsStorage
  - getCompactionSettings
  - getRetrySettings
  - collectSettingsDiagnostics
  - deduplicateDiagnostics
  - QuietStartup
  - CodemodeSettings
  - DEFAULT_TOOL_NAMES
  - getTuiMode
  - getQuietStartup
  - getDefaultTools
related:
  - surface.config.settings
  - subsys.coding-agent.config-resolution
  - ref.coding-agent.config-keys
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `subsys.coding-agent.settings-manager` 描述 pi-coding-agent 的 settings manager: 它把 global `settings.json` 与 project `.pi/settings.json` 读入内存, 做 project-over-global merge, 通过 lockfile 和 write queue 保存局部修改, 并用 project trust 门控 project scope。

## 能回答的问题

- `SettingsManager` 从哪里读取 global settings 和 project settings?
- project settings 什么时候被跳过, 什么时候拒绝写入?
- `deepMergeSettings` 如何处理 nested object、primitive、array 和 `defaultTools` 的 `+/-`?
- `getTuiMode()` / `getQuietStartup()` / `getDefaultTools()` 的缺省与非法值回落是什么?
- `codemode` settings 有没有独立 accessor?
- `getCompactionSettings(model)` 如何把 `modelOverrides` 解析成三字段 settings?
- `getRetrySettings()` 怎样带上 `maxAgentDelayMs`, 它和 provider retry cap 有何区别?
- settings 写回时如何避免覆盖同文件里的并发改动?
- 旧配置键 `queueMode`、`websockets`、旧版 `skills`、`retry.maxDelayMs` 怎样迁移?
- storage abstraction、file backend 与 in-memory backend 分别怎样接入 manager?

## 职责边界

`packages/coding-agent/src/core/settings-manager.ts` 是 pi-coding-agent 的 settings storage 与 accessor 层: 它定义 `Settings` 数据模型、`SettingsStorage` 抽象、file/in-memory storage、`SettingsManager` factory、migration、merge、project trust、write queue、error draining 以及一组 typed getters/setters [E: packages/coding-agent/src/core/settings-manager.ts:133] [E: packages/coding-agent/src/core/settings-manager.ts:273] [E: packages/coding-agent/src/core/settings-manager.ts:305] [E: packages/coding-agent/src/core/settings-manager.ts:362] [E: packages/coding-agent/src/core/settings-manager.ts:391]。

本节点不权威枚举每个配置键的用户文档含义; `ref.coding-agent.config-keys` 应按 config-key catalog 形式覆盖所有 key, 而本节点只解释 settings manager 的读、合并、锁、迁移、写回和 trust 行为 [I]。

## 关键文件

- `packages/coding-agent/src/core/settings-manager.ts`: 覆盖 `SettingsManager`、`Settings`、`SettingsStorage`、`FileSettingsStorage`、`InMemorySettingsStorage`、`deepMergeSettings`、migration 和全部 public accessors [E: packages/coding-agent/src/core/settings-manager.ts:133] [E: packages/coding-agent/src/core/settings-manager.ts:250] [E: packages/coding-agent/src/core/settings-manager.ts:273] [E: packages/coding-agent/src/core/settings-manager.ts:293] [E: packages/coding-agent/src/core/settings-manager.ts:362] [E: packages/coding-agent/src/core/settings-manager.ts:379]。
- `packages/coding-agent/src/core/settings-diagnostics.ts`: `collectSettingsDiagnostics` / `deduplicateDiagnostics`,把 `drainErrors()` 转成 TUI 可显示的 warning [E: packages/coding-agent/src/core/settings-diagnostics.ts:4] [E: packages/coding-agent/src/core/settings-diagnostics.ts:15]。

## 数据模型

`Settings` 是一个宽接口, 覆盖 provider/model/thinking(含 `modelThinkingLevels`)、transport、TUI theme、compaction(含 `modelOverrides`)、retry(含 `maxAgentDelayMs`)、shell/editor、resource packages、extensions/skills/prompts/themes、terminal/image(含 hyperlinks/images/trueColor overrides)、`defaultTools`、`codemode`、tree/editor/output padding/autocomplete、markdown warnings、sessionDir、network timeout/proxy,以及 `quietStartup` / `tuiMode` / `fullscreenExitOutput` / `fullscreenScrollbar` / `fullscreenCopyOnSelect` / `fullscreenWheelScrollLines` [E: packages/coding-agent/src/core/settings-manager.ts:133] [E: packages/coding-agent/src/core/settings-manager.ts:150] [E: packages/coding-agent/src/core/settings-manager.ts:168] [E: packages/coding-agent/src/core/settings-manager.ts:178] [E: packages/coding-agent/src/core/settings-manager.ts:184] [E: packages/coding-agent/src/core/settings-manager.ts:32]。

`QuietStartup` 是 `boolean | "header"`;`true` 藏全部 startup output,`"header"` 只留 startup header [E: packages/coding-agent/src/core/settings-manager.ts:112]。`CodemodeSettings` 有 `mode?: "on" | "only"`(默认 on)和 `inlineBudget?: number`(文档默认 3000) [E: packages/coding-agent/src/core/settings-manager.ts:101] [E: packages/coding-agent/src/core/settings-manager.ts:103]。`DEFAULT_TOOL_NAMES` 是 `["read", "bash", "edit", "write"]` [E: packages/coding-agent/src/core/settings-manager.ts:215]。

`CompactionSettings` 有 `enabled`、`reserveTokens`、`keepRecentTokens` 和 `modelOverrides`。`CompactionModelOverride` 只有两个可选 number 字段,键必须是精确 `"provider/modelId"` [E: packages/coding-agent/src/core/settings-manager.ts:18] [E: packages/coding-agent/src/core/settings-manager.ts:28] [E: packages/coding-agent/src/core/settings-manager.ts:32]。`RetrySettings` 在 agent 层有 `enabled`/`maxRetries`/`baseDelayMs`/`maxAgentDelayMs`,另嵌 `provider: ProviderRetrySettings` [E: packages/coding-agent/src/core/settings-manager.ts:40] [E: packages/coding-agent/src/core/settings-manager.ts:46]。

`PackageSource` 支持 string 形式和 object 形式；object 形式包含 `source`、可选 `autoload`，以及可选的 `extensions`、`skills`、`prompts`、`themes` filter arrays。`autoload: false` 表示先禁用默认全量加载，再只应用显式 patterns [E: packages/coding-agent/src/core/settings-manager.ts:122] [E: packages/coding-agent/src/core/settings-manager.ts:125] [E: packages/coding-agent/src/core/settings-manager.ts:126] [E: packages/coding-agent/src/core/settings-manager.ts:127] [E: packages/coding-agent/src/core/settings-manager.ts:128] [E: packages/coding-agent/src/core/settings-manager.ts:129] [E: packages/coding-agent/src/core/settings-manager.ts:130] [I]。

`SettingsScope` 只有 `"global"` 和 `"project"` 两个 scope; `SettingsStorage.withLock(scope, fn)` 接收当前文件内容字符串或 `undefined`, 并用返回的 string 写回, 返回 `undefined` 表示不写 [E: packages/coding-agent/src/core/settings-manager.ts:267] [E: packages/coding-agent/src/core/settings-manager.ts:273] [E: packages/coding-agent/src/core/settings-manager.ts:274]。

`SettingsManager` 持有三份 settings: `globalSettings`、`projectSettings` 和合并后的 `settings`; 它还维护 global/project 各自的 modified fields、modified nested fields、load error、write queue 与 error list [E: packages/coding-agent/src/core/settings-manager.ts:392] [E: packages/coding-agent/src/core/settings-manager.ts:381] [E: packages/coding-agent/src/core/settings-manager.ts:382] [E: packages/coding-agent/src/core/settings-manager.ts:383] [E: packages/coding-agent/src/core/settings-manager.ts:385] [E: packages/coding-agent/src/core/settings-manager.ts:387] [E: packages/coding-agent/src/core/settings-manager.ts:389] [E: packages/coding-agent/src/core/settings-manager.ts:391] [E: packages/coding-agent/src/core/settings-manager.ts:392]。

## 存储路径与锁

`FileSettingsStorage` 在 constructor 里 resolve cwd 和 agentDir, 把 global path 设为 `<agentDir>/settings.json`, 把 project path 设为 `<cwd>/<CONFIG_DIR_NAME>/settings.json`; `CONFIG_DIR_NAME` 来自 `../config.ts`,默认 `".pi"` [E: packages/coding-agent/src/core/settings-manager.ts:297] [E: packages/coding-agent/src/core/settings-manager.ts:300] [E: packages/coding-agent/src/core/settings-manager.ts:301] [E: packages/coding-agent/src/config.ts:542]。

文件锁由 `proper-lockfile.lockSync(path, { realpath: false })` 获取; 遇到 `ELOCKED` 时最多重试 10 次, 每次 busy-wait 20ms, 非 `ELOCKED` 或最后一次失败会抛出原错误 [E: packages/coding-agent/src/core/settings-manager.ts:304] [E: packages/coding-agent/src/core/settings-manager.ts:317] [E: packages/coding-agent/src/core/settings-manager.ts:306] [E: packages/coding-agent/src/core/settings-manager.ts:309] [E: packages/coding-agent/src/core/settings-manager.ts:311] [E: packages/coding-agent/src/core/settings-manager.ts:317] [E: packages/coding-agent/src/core/settings-manager.ts:322]。

`FileSettingsStorage.withLock()` 只在文件已存在时先加锁读取; 如果 callback 要写入且之前没有锁, 它会先创建目录再对目标 path 加锁并写入 UTF-8 内容, finally 释放锁 [E: packages/coding-agent/src/core/settings-manager.ts:331] [E: packages/coding-agent/src/core/settings-manager.ts:350] [E: packages/coding-agent/src/core/settings-manager.ts:352] [E: packages/coding-agent/src/core/settings-manager.ts:342] [E: packages/coding-agent/src/core/settings-manager.ts:356] [E: packages/coding-agent/src/core/settings-manager.ts:347] [E: packages/coding-agent/src/core/settings-manager.ts:362] [E: packages/coding-agent/src/core/settings-manager.ts:364] [E: packages/coding-agent/src/core/settings-manager.ts:356]。

`InMemorySettingsStorage` 是同一 `SettingsStorage` 协议的测试/嵌入式后端: 它按 scope 读写两个内存 string slot, 不做文件 I/O 或 lockfile [E: packages/coding-agent/src/core/settings-manager.ts:362] [E: packages/coding-agent/src/core/settings-manager.ts:363] [E: packages/coding-agent/src/core/settings-manager.ts:364] [E: packages/coding-agent/src/core/settings-manager.ts:366] [E: packages/coding-agent/src/core/settings-manager.ts:382] [E: packages/coding-agent/src/core/settings-manager.ts:385]。

## 读取、迁移与合并

`SettingsManager.create(cwd, agentDir, options)` 创建 `FileSettingsStorage`, 然后委托 `fromStorageWithPaths()` 并传入 global/project 文件路径, 让 load error 能带上 path; 默认 agentDir 是 `getAgentDir()` [E: packages/coding-agent/src/core/settings-manager.ts:417] [E: packages/coding-agent/src/core/settings-manager.ts:424] [E: packages/coding-agent/src/core/settings-manager.ts:437] [E: packages/coding-agent/src/core/settings-manager.ts:426] [E: packages/coding-agent/src/core/settings-manager.ts:427]。`fromStorage()` 也转调 `fromStorageWithPaths()`, 但不传 `settingsPaths`, 因此这条路径上报的 storage error 没有文件路径 [E: packages/coding-agent/src/core/settings-manager.ts:444] [E: packages/coding-agent/src/core/settings-manager.ts:433] [E: packages/coding-agent/src/core/settings-manager.ts:437]。`inMemory()` 走 `fromStorage()`, 不是 `create()` 路径 [E: packages/coding-agent/src/core/settings-manager.ts:466] [E: packages/coding-agent/src/core/settings-manager.ts:470]。

`fromStorageWithPaths()` 默认 `projectTrusted` 为 true, 分别尝试读取 global 和 project scope; project 读取会接收 trust flag, load error 被收集进 initial errors, constructor 最终用 `deepMergeSettings(globalSettings, projectSettings)` 生成 effective settings [E: packages/coding-agent/src/core/settings-manager.ts:437] [E: packages/coding-agent/src/core/settings-manager.ts:442] [E: packages/coding-agent/src/core/settings-manager.ts:443] [E: packages/coding-agent/src/core/settings-manager.ts:444] [E: packages/coding-agent/src/core/settings-manager.ts:446] [E: packages/coding-agent/src/core/settings-manager.ts:453] [E: packages/coding-agent/src/core/settings-manager.ts:425]。

`loadFromStorage()` 在 project scope 且 `projectTrusted` 为 false 时直接返回 `{}`; 否则通过 storage 读 current content, 空内容返回 `{}`, 有内容则 `JSON.parse()` 后走 `migrateSettings()` [E: packages/coding-agent/src/core/settings-manager.ts:473] [E: packages/coding-agent/src/core/settings-manager.ts:474] [E: packages/coding-agent/src/core/settings-manager.ts:487] [E: packages/coding-agent/src/core/settings-manager.ts:491] [E: packages/coding-agent/src/core/settings-manager.ts:496] [E: packages/coding-agent/src/core/settings-manager.ts:499] [E: packages/coding-agent/src/core/settings-manager.ts:488]。

`tryLoadFromStorage()` 把 `loadFromStorage()` 包成 `{ settings, error }`; 读取或 parse 失败时返回空 settings 和 error, 让 manager 保留错误而不是在 factory 阶段抛出 [E: packages/coding-agent/src/core/settings-manager.ts:491] [E: packages/coding-agent/src/core/settings-manager.ts:497] [E: packages/coding-agent/src/core/settings-manager.ts:498] [E: packages/coding-agent/src/core/settings-manager.ts:499]。

`deepMergeSettings(base, overrides)` 先委托 `deepMergeObjects`:`isMergeableObject` 只认非 null 非 array object; override value 为 `undefined` 时跳过, base/override 两侧都可合并时**递归**合并, 其他 primitive 和 array 由 override 直接替换 [E: packages/coding-agent/src/core/settings-manager.ts:191] [E: packages/coding-agent/src/core/settings-manager.ts:195] [E: packages/coding-agent/src/core/settings-manager.ts:200] [E: packages/coding-agent/src/core/settings-manager.ts:205] [E: packages/coding-agent/src/core/settings-manager.ts:250]。随后 `mergeDefaultTools` 覆盖 `defaultTools`:项目层若 `every(isToolModifier)`(每项都是 `+name` 或 `-name`),就把这些 modifier **append** 到全局列表;否则项目 array 整表替换。非法/非 array 的 override 也走替换,不 throw [E: packages/coding-agent/src/core/settings-manager.ts:217] [E: packages/coding-agent/src/core/settings-manager.ts:225] [E: packages/coding-agent/src/core/settings-manager.ts:228] [E: packages/coding-agent/src/core/settings-manager.ts:252]。因此 `compaction.modelOverrides["provider/modelId"]` 与 `codemode` 会按字段合并,而 `defaultTools: ["+codemode"]` 不会丢掉全局已选工具 [E: packages/coding-agent/test/settings-manager.test.ts:663] [I]。

`getDefaultTools()` 在 merged list 上跑 `resolveDefaultTools`:plain names 替换 `DEFAULT_TOOL_NAMES`(空数组保留为空),然后按顺序 `+` 追加、`-` 删除;未设置时返回 `undefined` [E: packages/coding-agent/src/core/settings-manager.ts:236] [E: packages/coding-agent/src/core/settings-manager.ts:238] [E: packages/coding-agent/src/core/settings-manager.ts:1434] [E: packages/coding-agent/test/settings-manager.test.ts:650]。

`migrateSettings()` 当前迁移四类 legacy shape: `queueMode` 迁到 `steeringMode`, boolean `websockets` 迁到 `transport` 的 `"websocket"`/`"sse"`, 旧 object 形式 `skills` 拆出 `enableSkillCommands` 与 `customDirectories`, `retry.maxDelayMs` 迁到 `retry.provider.maxRetryDelayMs` 后删除旧键 [E: packages/coding-agent/src/core/settings-manager.ts:504] [E: packages/coding-agent/src/core/settings-manager.ts:518] [E: packages/coding-agent/src/core/settings-manager.ts:507] [E: packages/coding-agent/src/core/settings-manager.ts:512] [E: packages/coding-agent/src/core/settings-manager.ts:513] [E: packages/coding-agent/src/core/settings-manager.ts:518] [E: packages/coding-agent/src/core/settings-manager.ts:528] [E: packages/coding-agent/src/core/settings-manager.ts:532] [E: packages/coding-agent/src/core/settings-manager.ts:539] [E: packages/coding-agent/src/core/settings-manager.ts:556] [E: packages/coding-agent/src/core/settings-manager.ts:559]。`retry.maxDelayMs` 不会迁到 `retry.maxAgentDelayMs` [I]。

## Compaction 与 retry accessors

`getCompactionTokenSetting(field, model)` 先校验 ordinary `compaction.reserveTokens` / `keepRecentTokens` 必须是非负 safe integer(有值但非法则 throw,即使该模型有合法 override) [E: packages/coding-agent/src/core/settings-manager.ts:927] [E: packages/coding-agent/src/core/settings-manager.ts:932] [E: packages/coding-agent/src/core/settings-manager.ts:933]。有 model 时用 `` `${model.provider}/${model.id}` `` 精确查找 `compaction.modelOverrides`; entry 必须是 object, override 字段同样必须是非负 safe integer [E: packages/coding-agent/src/core/settings-manager.ts:939] [E: packages/coding-agent/src/core/settings-manager.ts:940] [E: packages/coding-agent/src/core/settings-manager.ts:941] [E: packages/coding-agent/src/core/settings-manager.ts:947]。返回值是 `override ?? ordinary ?? DEFAULT_COMPACTION_TOKEN_SETTINGS[field]`, 内置默认 `reserveTokens=16384`、`keepRecentTokens=20000` [E: packages/coding-agent/src/core/settings-manager.ts:23] [E: packages/coding-agent/src/core/settings-manager.ts:952]。

`getCompactionSettings(model?)` 把解析结果收成 `{ enabled, reserveTokens, keepRecentTokens }`,其中 `enabled` 永远走 `getCompactionEnabled()`(`?? true`),不能 per-model [E: packages/coding-agent/src/core/settings-manager.ts:914] [E: packages/coding-agent/src/core/settings-manager.ts:964] [E: packages/coding-agent/src/core/settings-manager.ts:970]。override 解析发生在 SettingsManager 内,调用方拿到的三字段对象不再带 `modelOverrides` [I]。

`getRetrySettings()` 返回 `{ enabled, maxRetries, baseDelayMs, maxAgentDelayMs }`,其中 `maxAgentDelayMs` 回落 `DEFAULT_MAX_AGENT_RETRY_DELAY_MS`(从 `@earendil-works/pi-ai` 导入,值 60000) [E: packages/coding-agent/src/core/settings-manager.ts:2] [E: packages/coding-agent/src/core/settings-manager.ts:1000] [E: packages/coding-agent/src/core/settings-manager.ts:1005]。`getProviderRetrySettings()` 另返回 `{ timeoutMs?, maxRetries?, maxRetryDelayMs }` ,`maxRetryDelayMs` 默认 60000 [E: packages/coding-agent/src/core/settings-manager.ts:1034] [E: packages/coding-agent/src/core/settings-manager.ts:1038]。两套 cap 同名不同层: agent-level 封顶指数退避, provider-level 封顶服务端 `retry-after` [I]。

## Project Trust 门控

`projectTrusted` 控制 project settings 的读写: 初始读取时不 trusted 会使 project scope 返回 `{}`, `setProjectTrusted(false)` 会清空 `projectSettings`、清掉 project load error 并重新合并 effective settings [E: packages/coding-agent/src/core/settings-manager.ts:442] [E: packages/coding-agent/src/core/settings-manager.ts:474] [E: packages/coding-agent/src/core/settings-manager.ts:591] [E: packages/coding-agent/src/core/settings-manager.ts:604] [E: packages/coding-agent/src/core/settings-manager.ts:593] [E: packages/coding-agent/src/core/settings-manager.ts:594]。

`setProjectTrusted(true)` 会重新尝试读取 project scope, 保存新的 `projectSettings`/`projectSettingsLoadError`, 有错误则 recordError, 然后重新合并 global + project [E: packages/coding-agent/src/core/settings-manager.ts:598] [E: packages/coding-agent/src/core/settings-manager.ts:599] [E: packages/coding-agent/src/core/settings-manager.ts:600] [E: packages/coding-agent/src/core/settings-manager.ts:601] [E: packages/coding-agent/src/core/settings-manager.ts:602] [E: packages/coding-agent/src/core/settings-manager.ts:604]。

project 写入路径全部先过 `assertProjectTrustedForWrite()`; 未 trusted 时抛出 `"Project is not trusted; refusing to write project settings"` [E: packages/coding-agent/src/core/settings-manager.ts:662] [E: packages/coding-agent/src/core/settings-manager.ts:663] [E: packages/coding-agent/src/core/settings-manager.ts:664] [E: packages/coding-agent/src/core/settings-manager.ts:753] [E: packages/coding-agent/src/core/settings-manager.ts:782]。

## 写回策略与错误处理

global setter 修改 `globalSettings`, 调 `markModified()` 标记字段或 nested key, 再 `save()`; project setter 通过 `updateProjectSettings()` clone 当前 project settings、执行 update、标记 project modified field, 再 `saveProjectSettings()` [E: packages/coding-agent/src/core/settings-manager.ts:641] [E: packages/coding-agent/src/core/settings-manager.ts:781] [E: packages/coding-agent/src/core/settings-manager.ts:783] [E: packages/coding-agent/src/core/settings-manager.ts:772] [E: packages/coding-agent/src/core/settings-manager.ts:773] [E: packages/coding-agent/src/core/settings-manager.ts:774] [E: packages/coding-agent/src/core/settings-manager.ts:822] [E: packages/coding-agent/src/core/settings-manager.ts:812] [E: packages/coding-agent/src/core/settings-manager.ts:813] [E: packages/coding-agent/src/core/settings-manager.ts:1188] [E: packages/coding-agent/src/core/settings-manager.ts:1236]。

`save()` 和 `saveProjectSettings()` 都先更新 effective settings; 如果对应 scope 存在 load error, 它们直接返回, 因而不会把内存修改写进一个 parse 失败的 settings 文件 [E: packages/coding-agent/src/core/settings-manager.ts:736] [E: packages/coding-agent/src/core/settings-manager.ts:737] [E: packages/coding-agent/src/core/settings-manager.ts:739] [E: packages/coding-agent/src/core/settings-manager.ts:752] [E: packages/coding-agent/src/core/settings-manager.ts:755] [E: packages/coding-agent/src/core/settings-manager.ts:769]。

写入通过 `enqueueWrite()` 串到 `writeQueue`; task 执行前再次检查 project trust, 成功后清除对应 scope 的 modified field 集合, 失败时只 `recordError(scope, error)` 而不是向调用 setter 同步抛出 [E: packages/coding-agent/src/core/settings-manager.ts:683] [E: packages/coding-agent/src/core/settings-manager.ts:684] [E: packages/coding-agent/src/core/settings-manager.ts:686] [E: packages/coding-agent/src/core/settings-manager.ts:689] [E: packages/coding-agent/src/core/settings-manager.ts:690] [E: packages/coding-agent/src/core/settings-manager.ts:692] [E: packages/coding-agent/src/core/settings-manager.ts:705]。

`persistScopedSettings()` 在持锁 callback 内重新读取当前文件、再次运行 migration, 再只覆盖本次 snapshot 里标记过的 top-level field; 对标记了 nested key 的 object, 它从 current file nested object 起步, 只替换被修改的 nested key, 以降低覆盖同一 settings 文件内其它字段的风险 [E: packages/coding-agent/src/core/settings-manager.ts:705] [E: packages/coding-agent/src/core/settings-manager.ts:723] [E: packages/coding-agent/src/core/settings-manager.ts:724] [E: packages/coding-agent/src/core/settings-manager.ts:728] [E: packages/coding-agent/src/core/settings-manager.ts:717] [E: packages/coding-agent/src/core/settings-manager.ts:718] [E: packages/coding-agent/src/core/settings-manager.ts:723] [E: packages/coding-agent/src/core/settings-manager.ts:736] [I]。

`flush()` 等待 write queue 完成; `reload()` 也先等待 write queue, 然后重新读取 global/project 并清空 modified sets; `drainErrors()` 返回已收集错误并把 manager 内部 error list 清空 [E: packages/coding-agent/src/core/settings-manager.ts:607] [E: packages/coding-agent/src/core/settings-manager.ts:608] [E: packages/coding-agent/src/core/settings-manager.ts:618] [E: packages/coding-agent/src/core/settings-manager.ts:623] [E: packages/coding-agent/src/core/settings-manager.ts:632] [E: packages/coding-agent/src/core/settings-manager.ts:777] [E: packages/coding-agent/src/core/settings-manager.ts:778] [E: packages/coding-agent/src/core/settings-manager.ts:781] [E: packages/coding-agent/src/core/settings-manager.ts:782] [E: packages/coding-agent/src/core/settings-manager.ts:783]。

`collectSettingsDiagnostics` 把 `drainErrors()` 映射成 `type: "warning"` 的 runtime diagnostic,有 path 时 message 为 `Invalid settings file ${path}: ...` [E: packages/coding-agent/src/core/settings-diagnostics.ts:4] [E: packages/coding-agent/src/core/settings-diagnostics.ts:7]。`deduplicateDiagnostics` 按 `type\0message` 去重 [E: packages/coding-agent/src/core/settings-diagnostics.ts:15] [E: packages/coding-agent/src/core/settings-diagnostics.ts:20]。`main()` 在 startup 与 runtime 各收集一次,interactive 路径 `deduplicateDiagnostics` 后把结果交给 TUI `startupDiagnostics`;TUI 对 warning 调 `showWarning`,因此 invalid settings 会在启动界面显示带 path 的提示 [E: packages/coding-agent/src/main.ts:670] [E: packages/coding-agent/src/main.ts:798] [E: packages/coding-agent/src/main.ts:913] [E: packages/coding-agent/src/main.ts:953] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1185] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1189]。

## Public API 分组

model/provider/thinking/transport 相关 accessor 包括 `getDefaultProvider()`、`getDefaultModel()`、`setDefaultProvider()`、`setDefaultModel()`、`setDefaultModelAndProvider()`、`getDefaultThinkingLevel()`、`setDefaultThinkingLevel()`、`getTransport()`、`setTransport()` [E: packages/coding-agent/src/core/settings-manager.ts:802] [E: packages/coding-agent/src/core/settings-manager.ts:806] [E: packages/coding-agent/src/core/settings-manager.ts:810] [E: packages/coding-agent/src/core/settings-manager.ts:816] [E: packages/coding-agent/src/core/settings-manager.ts:822] [E: packages/coding-agent/src/core/settings-manager.ts:867] [E: packages/coding-agent/src/core/settings-manager.ts:871] [E: packages/coding-agent/src/core/settings-manager.ts:904] [E: packages/coding-agent/src/core/settings-manager.ts:908]。

resource path accessor 分成 global setters 和 project setters: packages、extensions、skills、prompts、themes 都有 getter 与 global setter, 其中 project variants 通过 `setProject*` 写 project scope [E: packages/coding-agent/src/core/settings-manager.ts:1184] [E: packages/coding-agent/src/core/settings-manager.ts:1188] [E: packages/coding-agent/src/core/settings-manager.ts:1194] [E: packages/coding-agent/src/core/settings-manager.ts:1200] [E: packages/coding-agent/src/core/settings-manager.ts:1204] [E: packages/coding-agent/src/core/settings-manager.ts:1210] [E: packages/coding-agent/src/core/settings-manager.ts:1216] [E: packages/coding-agent/src/core/settings-manager.ts:1220] [E: packages/coding-agent/src/core/settings-manager.ts:1226] [E: packages/coding-agent/src/core/settings-manager.ts:1278] [E: packages/coding-agent/src/core/settings-manager.ts:1282] [E: packages/coding-agent/src/core/settings-manager.ts:1288] [E: packages/coding-agent/src/core/settings-manager.ts:1248] [E: packages/coding-agent/src/core/settings-manager.ts:1252] [E: packages/coding-agent/src/core/settings-manager.ts:1258]。

terminal/image accessor 提供 defaults 和 numeric clamping: `showImages` 默认 true, `imageWidthCells` 非 finite 时默认 60 且最小 1, `clearOnShrink` 可由 settings 覆盖否则读 `PI_CLEAR_ON_SHRINK`, `showTerminalProgress` 默认 false, image auto resize 默认 true, block images 默认 false [E: packages/coding-agent/src/core/settings-manager.ts:1288] [E: packages/coding-agent/src/core/settings-manager.ts:1301] [E: packages/coding-agent/src/core/settings-manager.ts:1303] [E: packages/coding-agent/src/core/settings-manager.ts:1306] [E: packages/coding-agent/src/core/settings-manager.ts:1318] [E: packages/coding-agent/src/core/settings-manager.ts:1321] [E: packages/coding-agent/src/core/settings-manager.ts:1323] [E: packages/coding-agent/src/core/settings-manager.ts:1335] [E: packages/coding-agent/src/core/settings-manager.ts:1403] [E: packages/coding-agent/src/core/settings-manager.ts:1416]。`getTerminalCapabilityOverrides()` 只在 `terminal.images` 为 `kitty`/`iterm2`/`false`、或 `trueColor`/`hyperlinks` 为 concrete boolean 时覆盖检测 [E: packages/coding-agent/src/core/settings-manager.ts:1278] [E: packages/coding-agent/src/core/settings-manager.ts:1282] [E: packages/coding-agent/src/core/settings-manager.ts:1283] [E: packages/coding-agent/src/core/settings-manager.ts:1284]。`getTuiMode()` 仅当值为 `"regular"` 时返回 regular,否则 `"fullscreen"`(缺省与未知值都是 fullscreen) [E: packages/coding-agent/src/core/settings-manager.ts:1348] [E: packages/coding-agent/src/core/settings-manager.ts:1349]。`getQuietStartup()` 只保留 `true` 与 `"header"`,其它回落 `false` [E: packages/coding-agent/src/core/settings-manager.ts:1089] [E: packages/coding-agent/src/core/settings-manager.ts:1091]。`getFullscreenCopyOnSelect()` 默认 `true` [E: packages/coding-agent/src/core/settings-manager.ts:1379] [E: packages/coding-agent/src/core/settings-manager.ts:1380]。`getFullscreenWheelScrollLines()` 把有限 number clamp 到 1..100,否则 `"auto"` [E: packages/coding-agent/src/core/settings-manager.ts:1389]。没有 `getCodemode()`;消费者读 `getSettings().codemode`,内置 codemode 扩展走 `pi.getSettings().codemode` [E: packages/coding-agent/src/core/settings-manager.ts:566] [E: packages/coding-agent/src/extensions/codemode/index.ts:22]。

UI/editor/session accessor 包括 theme 过滤、external editor fallback、double escape action、tree filter validation、hardware cursor env fallback、editor padding clamp、outputPad 默认值与 setter、autocomplete max clamp、code block indent、warnings clone 和 sessionDir normalization [E: packages/coding-agent/src/core/settings-manager.ts:797] [E: packages/coding-agent/src/core/settings-manager.ts:799] [E: packages/coding-agent/src/core/settings-manager.ts:856] [E: packages/coding-agent/src/core/settings-manager.ts:861] [E: packages/coding-agent/src/core/settings-manager.ts:1054] [E: packages/coding-agent/src/core/settings-manager.ts:1059] [E: packages/coding-agent/src/core/settings-manager.ts:1063] [E: packages/coding-agent/src/core/settings-manager.ts:1492] [E: packages/coding-agent/src/core/settings-manager.ts:1456] [E: packages/coding-agent/src/core/settings-manager.ts:1458] [E: packages/coding-agent/src/core/settings-manager.ts:1468] [E: packages/coding-agent/src/core/settings-manager.ts:1469] [E: packages/coding-agent/src/core/settings-manager.ts:1524] [E: packages/coding-agent/src/core/settings-manager.ts:1483] [E: packages/coding-agent/src/core/settings-manager.ts:1488] [E: packages/coding-agent/src/core/settings-manager.ts:1489] [E: packages/coding-agent/src/core/settings-manager.ts:1492] [E: packages/coding-agent/src/core/settings-manager.ts:1493] [E: packages/coding-agent/src/core/settings-manager.ts:1498] [E: packages/coding-agent/src/core/settings-manager.ts:1503] [E: packages/coding-agent/src/core/settings-manager.ts:1508] [E: packages/coding-agent/src/core/settings-manager.ts:1524] [E: packages/coding-agent/src/core/settings-manager.ts:1528]。

network/retry accessor 包括 retry enable/defaults(含 `maxAgentDelayMs`)、provider retry defaults、HTTP idle timeout parsing and validation、WebSocket connect timeout parsing; invalid explicit timeout value 会由 `parseTimeoutSetting()` 抛出 `Invalid <settingName> setting` [E: packages/coding-agent/src/core/settings-manager.ts:256] [E: packages/coding-agent/src/core/settings-manager.ts:257] [E: packages/coding-agent/src/core/settings-manager.ts:274] [E: packages/coding-agent/src/core/settings-manager.ts:987] [E: packages/coding-agent/src/core/settings-manager.ts:1000] [E: packages/coding-agent/src/core/settings-manager.ts:1009] [E: packages/coding-agent/src/core/settings-manager.ts:1010] [E: packages/coding-agent/src/core/settings-manager.ts:1013] [E: packages/coding-agent/src/core/settings-manager.ts:1014] [E: packages/coding-agent/src/core/settings-manager.ts:1017] [E: packages/coding-agent/src/core/settings-manager.ts:1034] [E: packages/coding-agent/src/core/settings-manager.ts:1038] [E: packages/coding-agent/src/core/settings-manager.ts:1042] [E: packages/coding-agent/src/core/settings-manager.ts:1043]。

telemetry/changelog accessor 包括 last changelog version、collapse changelog、install telemetry 默认 true、analytics 默认 false、trackingId; 首次开启 analytics 且没有 trackingId 时会生成 `randomUUID()` 并标记 `trackingId` modified [E: packages/coding-agent/src/core/settings-manager.ts:799] [E: packages/coding-agent/src/core/settings-manager.ts:791] [E: packages/coding-agent/src/core/settings-manager.ts:1131] [E: packages/coding-agent/src/core/settings-manager.ts:1141] [E: packages/coding-agent/src/core/settings-manager.ts:1151] [E: packages/coding-agent/src/core/settings-manager.ts:1155] [E: packages/coding-agent/src/core/settings-manager.ts:1220] [E: packages/coding-agent/src/core/settings-manager.ts:1163] [E: packages/coding-agent/src/core/settings-manager.ts:1164] [E: packages/coding-agent/src/core/settings-manager.ts:1165]。

## 设计动机与权衡

settings manager 采用 effective settings 缓存: 读取阶段合并 global/project, setter 阶段先更新内存 effective settings, 写入阶段通过 `writeQueue` 异步串行化; 这让同步 setter API 可以快速返回, 但调用方若需要确认落盘必须调用 `flush()` [E: packages/coding-agent/src/core/settings-manager.ts:383] [E: packages/coding-agent/src/core/settings-manager.ts:736] [E: packages/coding-agent/src/core/settings-manager.ts:683] [E: packages/coding-agent/src/core/settings-manager.ts:777] [I]。

写回不是简单把整份 in-memory settings 覆盖到磁盘: `persistScopedSettings()` 在 lock 内重新读取当前文件, 只写 modified field 和 modified nested keys; 这保护同一 settings 文件中未被本 manager 修改的键。effective settings 的 `deepMergeObjects` 对 nested object 递归合并,但 persist 路径只替换被标记的 nested key,不会把整个深层 object 当作未修改字段保留 [E: packages/coding-agent/src/core/settings-manager.ts:723] [E: packages/coding-agent/src/core/settings-manager.ts:716] [E: packages/coding-agent/src/core/settings-manager.ts:717] [E: packages/coding-agent/src/core/settings-manager.ts:718] [E: packages/coding-agent/src/core/settings-manager.ts:723] [E: packages/coding-agent/src/core/settings-manager.ts:736] [E: packages/coding-agent/src/core/settings-manager.ts:206] [E: packages/coding-agent/src/core/settings-manager.ts:250] [I]。

parse error 的 scope 会被保护为 no-write: `save()` 和 `saveProjectSettings()` 在对应 load error 存在时直接返回, 因而不会用部分内存状态覆盖用户的损坏 JSON; 错误通过 `drainErrors()` 交给上层展示或处理 [E: packages/coding-agent/src/core/settings-manager.ts:739] [E: packages/coding-agent/src/core/settings-manager.ts:757] [E: packages/coding-agent/src/core/settings-manager.ts:781] [I]。

## Gotcha

- `applyOverrides()` 只修改 effective `settings`, 不更新 `globalSettings` 或 `projectSettings`, 也不触发 save; 它适合 runtime override, 不是持久化 setter [E: packages/coding-agent/src/core/settings-manager.ts:636] [E: packages/coding-agent/src/core/settings-manager.ts:637] [I]。
- `setProjectTrusted(false)` 会清空已加载 project settings 的内存副本, 但不会删除磁盘 project settings 文件; 这个节点只从代码确认内存行为和合并行为 [E: packages/coding-agent/src/core/settings-manager.ts:591] [E: packages/coding-agent/src/core/settings-manager.ts:592] [E: packages/coding-agent/src/core/settings-manager.ts:594] [I]。
- `getTheme()` 对包含 `/` 的 theme string 返回 `undefined`, 而 `getThemeSetting()` 仍返回原始 string; 这暗示 slash-containing theme value 可能被其他 resource path 机制处理, 但本文件没有展开该机制 [E: packages/coding-agent/src/core/settings-manager.ts:856] [E: packages/coding-agent/src/core/settings-manager.ts:858] [E: packages/coding-agent/src/core/settings-manager.ts:850] [I]。
- 非法 ordinary `compaction.reserveTokens` / `keepRecentTokens` 会在读时 throw,即使 matching model override 合法;只有 **省略** 的 ordinary 值才回落到 16384/20000 [E: packages/coding-agent/src/core/settings-manager.ts:932] [E: packages/coding-agent/src/core/settings-manager.ts:952]。

## 跨包边界

[surface.config.settings](../../surface/config/settings.md): 用户可见的 settings surface 应解释 settings 文件格式、CLI 或命令入口和用户行为; 本节点只解释 `SettingsManager` 如何读、合并、迁移、写回这些值 [I]。

[subsys.coding-agent.config-resolution](config-resolution.md): config value resolution 节点应解释 `$ENV`、`!cmd` 等动态值如何解析; 本节点只把 settings JSON 当作已经 parse 出来的 value graph, 只对 timeout 字段调用本文件引入的 `parseHttpIdleTimeoutMs()` [E: packages/coding-agent/src/core/settings-manager.ts:16] [E: packages/coding-agent/src/core/settings-manager.ts:256] [I]。

[ref.coding-agent.config-keys](../../reference/config-keys.md): config-key catalog 应逐 key 覆盖默认值、含义和来源; 本节点只把 `Settings` interface 与 getter/setter 分组, 不承担完整 key catalog 的全覆盖责任 [E: packages/coding-agent/src/core/settings-manager.ts:133] [I]。

`@earendil-works/pi-ai` 通过 `Transport` type 影响 `transport` setting,并通过 `DEFAULT_MAX_AGENT_RETRY_DELAY_MS` 提供 agent retry cap 默认值; settings manager 本身属于 `@earendil-works/pi-coding-agent` 产品层 [E: packages/coding-agent/src/core/settings-manager.ts:2] [E: packages/coding-agent/src/core/settings-manager.ts:114] [I]。

## Sources

- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/core/settings-diagnostics.ts
- packages/coding-agent/src/config.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/src/extensions/codemode/index.ts
- packages/coding-agent/test/settings-manager.test.ts

## 相关

- [surface.config.settings](../../surface/config/settings.md): settings 的用户可见入口、文件格式和配置面说明。
- [subsys.coding-agent.config-resolution](config-resolution.md): `$ENV`、`!cmd` 等配置值解析规则。
- [ref.coding-agent.config-keys](../../reference/config-keys.md): 配置键完整目录和每个 key 的默认值/含义。

---
id: subsys.coding-agent.trust-manager
title: 项目信任管理
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/trust-manager.ts
  - packages/coding-agent/src/core/project-trust.ts
symbols:
  - resolveProjectTrusted
  - ProjectTrustStore
related:
  - surface.trust.model
evidence: explicit
status: verified
updated: 5a073885
---

> 项目信任管理是 pi-coding-agent 在读取 project-local resources 前使用的 trust gate: `ProjectTrustStore` 负责持久化/继承 trust decision, `resolveProjectTrusted()` 负责把 CLI override、资源探测、extension hook、saved decision、global default 和 UI prompt 合成为本次运行的 boolean trusted 状态。

## 能回答的问题

- pi 如何判断当前 cwd 是否存在需要 project trust 的本地资源?
- `trust.json` 保存在哪里, 它的 key/value 结构是什么?
- 父目录 trust decision 如何被子目录继承, 子目录又如何覆盖或删除覆盖?
- `resolveProjectTrusted()` 的决策顺序是什么?
- interactive prompt 里的 "Trust parent folder" 和 session-only 选项分别会写入什么?
- 没有 UI 时, `defaultProjectTrust: "ask"` 为什么会变成不信任?

## 职责边界

`trust-manager.ts` 的可见职责集中在 project trust 选项生成、资源存在性探测和 `ProjectTrustStore` 存储接口上 [E: packages/coding-agent/src/core/trust-manager.ts:65] [E: packages/coding-agent/src/core/trust-manager.ts:184] [E: packages/coding-agent/src/core/trust-manager.ts:208]。它不加载 settings、extensions、skills、prompts 或 themes, 也不决定最终 runtime 是否 trusted;这是从该文件的导入、导出和下方 `project-trust.ts` 编排关系推出的边界 [I]。

`project-trust.ts` 是决策编排层: `resolveProjectTrusted()` 接收 cwd、`ProjectTrustStore`、可选 `trustOverride`、`defaultProjectTrust`、preloaded project-trust extensions result 和 UI context, 返回一个 boolean trust result [E: packages/coding-agent/src/core/project-trust.ts:14] [E: packages/coding-agent/src/core/project-trust.ts:16] [E: packages/coding-agent/src/core/project-trust.ts:18] [E: packages/coding-agent/src/core/project-trust.ts:46]。这个文件不直接读写 `trust.json`;持久化只通过传入的 `trustStore` 完成 [E: packages/coding-agent/src/core/project-trust.ts:40] [E: packages/coding-agent/src/core/project-trust.ts:42] [E: packages/coding-agent/src/core/project-trust.ts:66]。

## 关键文件

- `packages/coding-agent/src/core/trust-manager.ts`: 定义 `ProjectTrustDecision`、`ProjectTrustStoreEntry`、`ProjectTrustUpdate`、`ProjectTrustOption`, 以及 `ProjectTrustStore` class [E: packages/coding-agent/src/core/trust-manager.ts:8] [E: packages/coding-agent/src/core/trust-manager.ts:10] [E: packages/coding-agent/src/core/trust-manager.ts:15] [E: packages/coding-agent/src/core/trust-manager.ts:20] [E: packages/coding-agent/src/core/trust-manager.ts:208]。
- `packages/coding-agent/src/core/project-trust.ts`: 定义 `ResolveProjectTrustedOptions`、prompt formatting、selection helper、save helper 和 `resolveProjectTrusted()` [E: packages/coding-agent/src/core/project-trust.ts:14] [E: packages/coding-agent/src/core/project-trust.ts:24] [E: packages/coding-agent/src/core/project-trust.ts:28] [E: packages/coding-agent/src/core/project-trust.ts:40] [E: packages/coding-agent/src/core/project-trust.ts:46]。

## 数据模型

`ProjectTrustDecision` 是 `boolean | null`: boolean 承载 trusted/untrusted decision, `null` 可作为 update decision 传入 [E: packages/coding-agent/src/core/trust-manager.ts:8] [E: packages/coding-agent/src/core/trust-manager.ts:15]。在 store 语义里, `get(cwd)` 没有命中时返回 `null`, `setMany()` 收到 `decision === null` 时删除该 key [E: packages/coding-agent/src/core/trust-manager.ts:215] [E: packages/coding-agent/src/core/trust-manager.ts:216] [E: packages/coding-agent/src/core/trust-manager.ts:235] [E: packages/coding-agent/src/core/trust-manager.ts:236]。持久化文件的内部类型 `TrustFile` 是 path string 到 `boolean | null | undefined` 的 record, 读取时只允许 `true`、`false`、`null`, 否则抛出 invalid trust store error [E: packages/coding-agent/src/core/trust-manager.ts:27] [E: packages/coding-agent/src/core/trust-manager.ts:116] [E: packages/coding-agent/src/core/trust-manager.ts:117]。

`ProjectTrustStore` 的 constructor 接收 `agentDir`, 并把 trust store 路径固定为 `join(resolvePath(agentDir), "trust.json")` [E: packages/coding-agent/src/core/trust-manager.ts:211] [E: packages/coding-agent/src/core/trust-manager.ts:212]。`get(cwd)` 返回最近 entry 的 decision, 没有 entry 时返回 `null`;`getEntry(cwd)` 返回 `{ path, decision }`, 其中 `path` 可能是 cwd 自身或某个 parent directory [E: packages/coding-agent/src/core/trust-manager.ts:215] [E: packages/coding-agent/src/core/trust-manager.ts:216] [E: packages/coding-agent/src/core/trust-manager.ts:219] [E: packages/coding-agent/src/core/trust-manager.ts:222]。

所有 trust path 在进入 store key 之前都经 `normalizeCwd()`, 也就是 `resolvePath()` 后再 `canonicalizePath()` [E: packages/coding-agent/src/core/trust-manager.ts:39] [E: packages/coding-agent/src/core/trust-manager.ts:40]。这让 cwd、parent path 和 saved key 使用同一套 canonical path 语义, 但具体 symlink/case normalization 细节属于 paths utility, 不在本节点详写 [I]。

`ProjectTrustOption` 是 UI 和 prompt helper 共用的选项模型: 每个 option 有 label、trusted boolean、updates 数组, 以及可选 savedPath [E: packages/coding-agent/src/core/trust-manager.ts:20] [E: packages/coding-agent/src/core/trust-manager.ts:21] [E: packages/coding-agent/src/core/trust-manager.ts:22] [E: packages/coding-agent/src/core/trust-manager.ts:23] [E: packages/coding-agent/src/core/trust-manager.ts:24]。session-only 选项通过空 `updates` 表示只影响本次 `resolveProjectTrusted()` return value, 不写入 trust store [E: packages/coding-agent/src/core/trust-manager.ts:82] [E: packages/coding-agent/src/core/trust-manager.ts:83] [E: packages/coding-agent/src/core/trust-manager.ts:91] [E: packages/coding-agent/src/core/trust-manager.ts:92] [E: packages/coding-agent/src/core/project-trust.ts:40] [E: packages/coding-agent/src/core/project-trust.ts:41] [E: packages/coding-agent/src/core/project-trust.ts:42] [E: packages/coding-agent/src/core/project-trust.ts:93]。

## 资源探测规则

需要 trust 的 `.pi` project config resources 由 `TRUST_REQUIRING_PROJECT_CONFIG_RESOURCES` 固定列出: `settings.json`、`extensions`、`skills`、`prompts`、`themes`、`SYSTEM.md`、`APPEND_SYSTEM.md` [E: packages/coding-agent/src/core/trust-manager.ts:29] [E: packages/coding-agent/src/core/trust-manager.ts:30] [E: packages/coding-agent/src/core/trust-manager.ts:31] [E: packages/coding-agent/src/core/trust-manager.ts:32] [E: packages/coding-agent/src/core/trust-manager.ts:33] [E: packages/coding-agent/src/core/trust-manager.ts:34] [E: packages/coding-agent/src/core/trust-manager.ts:35] [E: packages/coding-agent/src/core/trust-manager.ts:36]。

`hasTrustRequiringProjectResources(cwd)` 先计算 home directory 和 user-level `.agents/skills`, 再从 canonical cwd 开始检查当前目录的 `.pi/<resource>` 是否存在 [E: packages/coding-agent/src/core/trust-manager.ts:184] [E: packages/coding-agent/src/core/trust-manager.ts:185] [E: packages/coding-agent/src/core/trust-manager.ts:186] [E: packages/coding-agent/src/core/trust-manager.ts:187] [E: packages/coding-agent/src/core/trust-manager.ts:189] [E: packages/coding-agent/src/core/trust-manager.ts:190]。注意 `.pi` resource 检查只发生在初始 cwd 的 `.pi` 目录;之后的 ancestor loop 只检查 `.agents/skills` [E: packages/coding-agent/src/core/trust-manager.ts:189] [E: packages/coding-agent/src/core/trust-manager.ts:194] [E: packages/coding-agent/src/core/trust-manager.ts:195]。

ancestor `.agents/skills` 会触发 trust, 但 user/global `~/.agents/skills` 被排除: loop 中的 `agentsSkillsDir` 必须不等于 `userAgentsSkillsDir`, 且目录存在, 才返回 true [E: packages/coding-agent/src/core/trust-manager.ts:195] [E: packages/coding-agent/src/core/trust-manager.ts:196] [E: packages/coding-agent/src/core/trust-manager.ts:197]。一路走到 filesystem root 仍未发现资源时返回 false [E: packages/coding-agent/src/core/trust-manager.ts:200] [E: packages/coding-agent/src/core/trust-manager.ts:201] [E: packages/coding-agent/src/core/trust-manager.ts:202]。

## Store 读写与继承

`findNearestTrustEntry(data, cwd)` 从 normalized cwd 开始查 `data[currentDir]`, 只接受 `true` 或 `false` 作为命中, 然后逐级上溯 parent directory;走到 root 仍未命中则返回 null [E: packages/coding-agent/src/core/trust-manager.ts:43] [E: packages/coding-agent/src/core/trust-manager.ts:44] [E: packages/coding-agent/src/core/trust-manager.ts:46] [E: packages/coding-agent/src/core/trust-manager.ts:47] [E: packages/coding-agent/src/core/trust-manager.ts:48] [E: packages/coding-agent/src/core/trust-manager.ts:51] [E: packages/coding-agent/src/core/trust-manager.ts:52] [E: packages/coding-agent/src/core/trust-manager.ts:53]。因此 parent folder 的 trust decision 是 inheritance model, child directory 可以用自己的 saved decision 覆盖 parent decision [I]。

`readTrustFile(path)` 在文件不存在时返回空对象;文件存在时 JSON parse, 要求顶层是非数组 object, 并逐项校验 value 类型 [E: packages/coding-agent/src/core/trust-manager.ts:97] [E: packages/coding-agent/src/core/trust-manager.ts:98] [E: packages/coding-agent/src/core/trust-manager.ts:99] [E: packages/coding-agent/src/core/trust-manager.ts:104] [E: packages/coding-agent/src/core/trust-manager.ts:110] [E: packages/coding-agent/src/core/trust-manager.ts:111] [E: packages/coding-agent/src/core/trust-manager.ts:115]。

`writeTrustFile(path, data)` 先按 key 排序, 只保留 `true`、`false`、`null`, 确保 parent directory 存在, 再写入 pretty JSON 加 trailing newline [E: packages/coding-agent/src/core/trust-manager.ts:124] [E: packages/coding-agent/src/core/trust-manager.ts:125] [E: packages/coding-agent/src/core/trust-manager.ts:126] [E: packages/coding-agent/src/core/trust-manager.ts:128] [E: packages/coding-agent/src/core/trust-manager.ts:129] [E: packages/coding-agent/src/core/trust-manager.ts:132] [E: packages/coding-agent/src/core/trust-manager.ts:133]。排序让 trust store diff 稳定, 这是从写入实现推出的维护性效果 [I]。

读写都包在 `withTrustFileLock(path, fn)` 中;该 helper 用 `acquireTrustLockSync()` 获取 release callback, 在 finally 中 release, 避免同一 trust file 的同步 read-modify-write 互相踩写 [E: packages/coding-agent/src/core/trust-manager.ts:168] [E: packages/coding-agent/src/core/trust-manager.ts:169] [E: packages/coding-agent/src/core/trust-manager.ts:171] [E: packages/coding-agent/src/core/trust-manager.ts:172] [E: packages/coding-agent/src/core/trust-manager.ts:173]。lock acquisition 使用 trust directory 作为 lock target, `lockfilePath` 是 `${path}.lock`, 对 `ELOCKED` 最多重试 10 次, 每次同步等待约 20ms [E: packages/coding-agent/src/core/trust-manager.ts:136] [E: packages/coding-agent/src/core/trust-manager.ts:137] [E: packages/coding-agent/src/core/trust-manager.ts:139] [E: packages/coding-agent/src/core/trust-manager.ts:140] [E: packages/coding-agent/src/core/trust-manager.ts:143] [E: packages/coding-agent/src/core/trust-manager.ts:145] [E: packages/coding-agent/src/core/trust-manager.ts:151] [E: packages/coding-agent/src/core/trust-manager.ts:156]。

`setMany(decisions)` 是批量写入口: 它在 lock 内读取现有 data, 对每个 update 归一化 path;`decision === null` 时删除该 key, 否则写入 boolean, 最后写回文件 [E: packages/coding-agent/src/core/trust-manager.ts:230] [E: packages/coding-agent/src/core/trust-manager.ts:231] [E: packages/coding-agent/src/core/trust-manager.ts:232] [E: packages/coding-agent/src/core/trust-manager.ts:233] [E: packages/coding-agent/src/core/trust-manager.ts:234] [E: packages/coding-agent/src/core/trust-manager.ts:235] [E: packages/coding-agent/src/core/trust-manager.ts:236] [E: packages/coding-agent/src/core/trust-manager.ts:238] [E: packages/coding-agent/src/core/trust-manager.ts:241]。`set(cwd, decision)` 只是把单项 update 委托给 `setMany()` [E: packages/coding-agent/src/core/trust-manager.ts:226] [E: packages/coding-agent/src/core/trust-manager.ts:227]。

## Trust Options

`getProjectTrustOptions(cwd)` 总是先生成 "Trust" option, 它把当前 normalized cwd 写成 `true`, 并把 `savedPath` 设为 cwd [E: packages/coding-agent/src/core/trust-manager.ts:65] [E: packages/coding-agent/src/core/trust-manager.ts:66] [E: packages/coding-agent/src/core/trust-manager.ts:67] [E: packages/coding-agent/src/core/trust-manager.ts:68]。如果 cwd 有 parent, 它追加 "Trust parent folder (...)" option: 写 parent 为 `true`, 同时把当前 cwd decision 设为 `null`, 等价于清除当前目录覆盖并改用 parent-level trust [E: packages/coding-agent/src/core/trust-manager.ts:70] [E: packages/coding-agent/src/core/trust-manager.ts:71] [E: packages/coding-agent/src/core/trust-manager.ts:72] [E: packages/coding-agent/src/core/trust-manager.ts:76] [E: packages/coding-agent/src/core/trust-manager.ts:77] [E: packages/coding-agent/src/core/trust-manager.ts:79]。

"Do not trust" option 把当前 normalized cwd 写成 `false`, 并把 `savedPath` 设为 cwd [E: packages/coding-agent/src/core/trust-manager.ts:85] [E: packages/coding-agent/src/core/trust-manager.ts:86] [E: packages/coding-agent/src/core/trust-manager.ts:87] [E: packages/coding-agent/src/core/trust-manager.ts:88] [E: packages/coding-agent/src/core/trust-manager.ts:89]。只有 `includeSessionOnly` 为 true 时, option list 才包含 "Trust (this session only)" 与 "Do not trust (this session only)", 且二者 `updates: []` [E: packages/coding-agent/src/core/trust-manager.ts:82] [E: packages/coding-agent/src/core/trust-manager.ts:83] [E: packages/coding-agent/src/core/trust-manager.ts:91] [E: packages/coding-agent/src/core/trust-manager.ts:92]。

`getProjectTrustParentPath(cwd)` 返回 normalized cwd 的 parent;如果 cwd 已是 root, 返回 undefined [E: packages/coding-agent/src/core/trust-manager.ts:59] [E: packages/coding-agent/src/core/trust-manager.ts:60] [E: packages/coding-agent/src/core/trust-manager.ts:61] [E: packages/coding-agent/src/core/trust-manager.ts:62]。这也是 "Trust parent folder" option 是否出现的 gate [E: packages/coding-agent/src/core/trust-manager.ts:70] [E: packages/coding-agent/src/core/trust-manager.ts:71]。

## resolveProjectTrusted 控制流

1. `resolveProjectTrusted()` 首先尊重 explicit `trustOverride`;只要 `trustOverride !== undefined`, 直接返回该 boolean, 不再探测资源、extension、store、default 或 UI [E: packages/coding-agent/src/core/project-trust.ts:46] [E: packages/coding-agent/src/core/project-trust.ts:47] [E: packages/coding-agent/src/core/project-trust.ts:48]。
2. 如果 `hasTrustRequiringProjectResources(cwd)` 返回 false, project 被视为 trusted, 因为没有需要 gate 的 project-local resources [E: packages/coding-agent/src/core/project-trust.ts:50] [E: packages/coding-agent/src/core/project-trust.ts:51]。
3. 如果调用方传入 `extensionsResult`, `resolveProjectTrusted()` 先发 `project_trust` event, event payload 只有 `{ type: "project_trust", cwd }`, 并把 `projectTrustContext` 传给 extension runner helper [E: packages/coding-agent/src/core/project-trust.ts:54] [E: packages/coding-agent/src/core/project-trust.ts:55] [E: packages/coding-agent/src/core/project-trust.ts:57] [E: packages/coding-agent/src/core/project-trust.ts:58]。
4. `emitProjectTrustEvent()` 返回的 errors 会被逐条交给可选 `onExtensionError`, message 中包含 extension path 和 error [E: packages/coding-agent/src/core/project-trust.ts:60] [E: packages/coding-agent/src/core/project-trust.ts:61]。如果 extension result 存在, `trusted === "yes"` 映射为 true, 非 `"yes"` 值映射为 false;`remember === true` 时写入 trust store, 然后返回该 trusted boolean [E: packages/coding-agent/src/core/project-trust.ts:63] [E: packages/coding-agent/src/core/project-trust.ts:64] [E: packages/coding-agent/src/core/project-trust.ts:65] [E: packages/coding-agent/src/core/project-trust.ts:66] [E: packages/coding-agent/src/core/project-trust.ts:68]。
5. 没有 extension decision 时, 函数读取 `trustStore.get(cwd)`;只要 result 不是 `null`, 就直接返回 saved decision [E: packages/coding-agent/src/core/project-trust.ts:72] [E: packages/coding-agent/src/core/project-trust.ts:73] [E: packages/coding-agent/src/core/project-trust.ts:74]。
6. 没有 saved decision 时, `defaultProjectTrust ?? "ask"` 控制 fallback: `"always"` 返回 true, `"never"` 返回 false, `"ask"` 继续进入 prompt path [E: packages/coding-agent/src/core/project-trust.ts:77] [E: packages/coding-agent/src/core/project-trust.ts:78] [E: packages/coding-agent/src/core/project-trust.ts:79] [E: packages/coding-agent/src/core/project-trust.ts:80] [E: packages/coding-agent/src/core/project-trust.ts:81] [E: packages/coding-agent/src/core/project-trust.ts:82]。
7. ask path 需要 UI;`projectTrustContext.hasUI` 为 false 时直接返回 false, 所以 non-interactive `ask` 是 fail-closed [E: packages/coding-agent/src/core/project-trust.ts:86] [E: packages/coding-agent/src/core/project-trust.ts:87] [I]。
8. 有 UI 时, `selectProjectTrustOption()` 用 `getProjectTrustOptions(cwd, { includeSessionOnly: true })` 生成带 session-only 的选项, 调 `ctx.ui.select()` 显示 prompt 和 label list, 再按 label 找回 option [E: packages/coding-agent/src/core/project-trust.ts:28] [E: packages/coding-agent/src/core/project-trust.ts:32] [E: packages/coding-agent/src/core/project-trust.ts:33] [E: packages/coding-agent/src/core/project-trust.ts:35] [E: packages/coding-agent/src/core/project-trust.ts:37]。
9. 用户选中 option 后, `saveProjectTrustPromptResult()` 只在 `updates.length > 0` 时调用 `trustStore.setMany()`, 然后返回 selected.trusted;如果 selection 为 undefined, 最终返回 false [E: packages/coding-agent/src/core/project-trust.ts:40] [E: packages/coding-agent/src/core/project-trust.ts:41] [E: packages/coding-agent/src/core/project-trust.ts:42] [E: packages/coding-agent/src/core/project-trust.ts:90] [E: packages/coding-agent/src/core/project-trust.ts:91] [E: packages/coding-agent/src/core/project-trust.ts:92] [E: packages/coding-agent/src/core/project-trust.ts:93] [E: packages/coding-agent/src/core/project-trust.ts:95]。

## 设计动机与权衡

trust resolution 是多层 override chain: explicit CLI/runtime override 优先于资源探测, project-trust extensions 优先于 saved store, saved store 优先于 global default, global default 优先于 built-in UI prompt [E: packages/coding-agent/src/core/project-trust.ts:47] [E: packages/coding-agent/src/core/project-trust.ts:50] [E: packages/coding-agent/src/core/project-trust.ts:54] [E: packages/coding-agent/src/core/project-trust.ts:72] [E: packages/coding-agent/src/core/project-trust.ts:77] [E: packages/coding-agent/src/core/project-trust.ts:90] [I]。这个顺序让一次性 override 和 user/global extension policy 可以拦截本次启动, 同时仍保留持久化 trust store 和 interactive fallback [I]。

parent-folder trust option 同时写 parent true、删除 child key, 说明 UI 想表达的是 "信任这一层目录树" 而不是在 child 上重复保存同样 decision [E: packages/coding-agent/src/core/trust-manager.ts:76] [E: packages/coding-agent/src/core/trust-manager.ts:77] [I]。相反 "Do not trust" 没有 parent option, 只写当前 cwd false, 因而拒绝 trust 的默认粒度更窄 [E: packages/coding-agent/src/core/trust-manager.ts:85] [E: packages/coding-agent/src/core/trust-manager.ts:88] [I]。

store 写入使用 sorted pretty JSON 和 lock file, 说明这个文件既面向机器读取, 也被设计成可稳定 diff/排查的本地状态文件 [E: packages/coding-agent/src/core/trust-manager.ts:126] [E: packages/coding-agent/src/core/trust-manager.ts:133] [E: packages/coding-agent/src/core/trust-manager.ts:145] [I]。

## Gotcha

- `ProjectTrustStore.get(cwd)` 的 `null` 不是 "untrusted";它表示没有 saved decision, 后续仍可能被 `defaultProjectTrust` 或 UI prompt 决定 [E: packages/coding-agent/src/core/trust-manager.ts:215] [E: packages/coding-agent/src/core/trust-manager.ts:216] [E: packages/coding-agent/src/core/project-trust.ts:72] [E: packages/coding-agent/src/core/project-trust.ts:77]。
- `hasTrustRequiringProjectResources()` 对 `.pi` resource 和 `.agents/skills` 的 search scope 不同: `.pi` 只看 cwd 这一层, `.agents/skills` 会沿 ancestor 上溯但排除 user home 的 global skills [E: packages/coding-agent/src/core/trust-manager.ts:189] [E: packages/coding-agent/src/core/trust-manager.ts:194] [E: packages/coding-agent/src/core/trust-manager.ts:196]。
- `readTrustFile()` 会接受 JSON `null` value, 但 `findNearestTrustEntry()` 不把 null 当作命中;实际写入路径上, `setMany()` 遇到 null 是删除 key, 所以正常 store 不会因为清除 decision 而留下 null tombstone [E: packages/coding-agent/src/core/trust-manager.ts:116] [E: packages/coding-agent/src/core/trust-manager.ts:119] [E: packages/coding-agent/src/core/trust-manager.ts:47] [E: packages/coding-agent/src/core/trust-manager.ts:235] [E: packages/coding-agent/src/core/trust-manager.ts:236]。
- extension result 的 `trusted` 只按 `"yes"` 映射 true;只要 `emitProjectTrustEvent()` 给出非空 result, `resolveProjectTrusted()` 不再继续查 saved store 或 UI [E: packages/coding-agent/src/core/project-trust.ts:63] [E: packages/coding-agent/src/core/project-trust.ts:64] [E: packages/coding-agent/src/core/project-trust.ts:68]。

## 跨包边界

[surface.trust.model](../../surface/trust/model.md) 是面向使用者的 trust model 总览: 它应解释 project trust 对 settings/resources/extensions 的外部行为;本节点只详写 `trust-manager.ts` 和 `project-trust.ts` 内部如何存储、探测和求值 [I]。

`project-trust.ts` 依赖 extension runner 的 `emitProjectTrustEvent()` 与 extension types, 但本节点不覆盖 extension handler 执行顺序、`trusted: "undecided"` 如何被 runner helper 过滤、或 extension loading scope;这些属于 extension runner / extension loader 节点的权威范围 [E: packages/coding-agent/src/core/project-trust.ts:2] [E: packages/coding-agent/src/core/project-trust.ts:3] [I]。

## Sources

- packages/coding-agent/src/core/trust-manager.ts
- packages/coding-agent/src/core/project-trust.ts

## 相关

- [surface.trust.model](../../surface/trust/model.md): 项目信任模型的用户可见行为、资源加载影响和安全语义总览。

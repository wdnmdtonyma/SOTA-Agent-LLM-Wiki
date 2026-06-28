---
id: subsys.coding-agent.migrations
title: 版本迁移与数据升级
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/migrations.ts
symbols:
  - runMigrations
  - migrateAuthToAuthJson
related:
  - subsys.coding-agent.session-manager
  - subsys.coding-agent.auth-storage
evidence: explicit
status: verified
updated: 5a073885
---

> `migrations.ts` 是 pi-coding-agent 的 startup migration hub: 它在一次入口调用里执行 credential、session file、managed binary、keybinding config 和 extension directory 的兼容迁移, 并把需要用户处理的 deprecated extension warnings 返回给 caller。

## 能回答的问题

- `runMigrations(cwd)` 会按什么顺序执行哪些 one-time migrations?
- 旧 `oauth.json` 和 `settings.json.apiKeys` 如何迁入 `auth.json`?
- 错放在 agent root 的 session JSONL 如何搬到 cwd-scoped sessions 目录?
- `commands/`、`tools/`、`hooks/` 这些历史目录分别会被 rename、delete、warning 还是忽略?
- keybindings 配置迁移失败或 malformed JSON 时会不会中断启动?
- deprecation warning 为什么单独由 `showDeprecationWarnings()` 等待用户按键?

## 职责边界

`packages/coding-agent/src/migrations.ts` 聚合本地文件系统 data upgrade 和 warning collection;从本文件可直接看到它依赖 config helpers 与 keybindings migrator, 而 session JSONL schema、credential resolution、extension runtime 等边界属于跨节点归属推断 [E: packages/coding-agent/src/migrations.ts:8] [E: packages/coding-agent/src/migrations.ts:9] [I]。

`runMigrations(cwd)` 是聚合入口:它返回 `{ migratedAuthProviders, deprecationWarnings }`, 其中 auth migration provider list 来自 `migrateAuthToAuthJson()`, extension warnings 来自 `migrateExtensionSystem(cwd)` [E: packages/coding-agent/src/migrations.ts:305] [E: packages/coding-agent/src/migrations.ts:309] [E: packages/coding-agent/src/migrations.ts:313] [E: packages/coding-agent/src/migrations.ts:314]。

`showDeprecationWarnings(warnings)` 是交互式 display helper, 不在 `runMigrations()` 内部执行;它在 warnings 非空时打印每条 warning、migration guide、extension docs, 然后等待 stdin 一次 `data` 事件再继续 [E: packages/coding-agent/src/migrations.ts:277] [E: packages/coding-agent/src/migrations.ts:278] [E: packages/coding-agent/src/migrations.ts:280] [E: packages/coding-agent/src/migrations.ts:284] [E: packages/coding-agent/src/migrations.ts:285] [E: packages/coding-agent/src/migrations.ts:288] [E: packages/coding-agent/src/migrations.ts:291]。

## 关键文件

- `packages/coding-agent/src/migrations.ts`: 当前节点 source 列出的 migrations 源文件, 包含 auth、session、commands/prompts、keybindings、managed binaries、deprecated extension dirs 和 warning display [E: packages/coding-agent/src/migrations.ts:21] [E: packages/coding-agent/src/migrations.ts:84] [E: packages/coding-agent/src/migrations.ts:137] [E: packages/coding-agent/src/migrations.ts:157] [E: packages/coding-agent/src/migrations.ts:177] [E: packages/coding-agent/src/migrations.ts:222] [E: packages/coding-agent/src/migrations.ts:277]。

## 数据模型

Auth migration 的 in-memory target 是 `Record<string, unknown>`: `oauth.json` 中每个 provider 被写成 `{ type: "oauth", ...cred }`, `settings.json.apiKeys` 中 string key 被写成 `{ type: "api_key", key }`;函数最终返回记录到 `providers` 的 provider name array [E: packages/coding-agent/src/migrations.ts:30] [E: packages/coding-agent/src/migrations.ts:31] [E: packages/coding-agent/src/migrations.ts:37] [E: packages/coding-agent/src/migrations.ts:38] [E: packages/coding-agent/src/migrations.ts:53] [E: packages/coding-agent/src/migrations.ts:55] [E: packages/coding-agent/src/migrations.ts:72]。

Session migration 只识别 agent root 目录直属的 `.jsonl` 文件, 并要求第一行 JSON 是 `{ type: "session", cwd: ... }`;cwd 通过 `--${cwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--` 编码成目标 session directory name [E: packages/coding-agent/src/migrations.ts:90] [E: packages/coding-agent/src/migrations.ts:91] [E: packages/coding-agent/src/migrations.ts:102] [E: packages/coding-agent/src/migrations.ts:106] [E: packages/coding-agent/src/migrations.ts:107] [E: packages/coding-agent/src/migrations.ts:112] [E: packages/coding-agent/src/migrations.ts:113]。

Deprecated extension directory warning 是 plain string array: `hooks/` 存在总是 warning, `tools/` 只有包含非 `fd` / `rg` / Windows `.exe` / hidden entry 的 custom files 时才 warning [E: packages/coding-agent/src/migrations.ts:225] [E: packages/coding-agent/src/migrations.ts:227] [E: packages/coding-agent/src/migrations.ts:228] [E: packages/coding-agent/src/migrations.ts:231] [E: packages/coding-agent/src/migrations.ts:234] [E: packages/coding-agent/src/migrations.ts:235] [E: packages/coding-agent/src/migrations.ts:237] [E: packages/coding-agent/src/migrations.ts:238] [E: packages/coding-agent/src/migrations.ts:241]。

## 控制流

1. `runMigrations(cwd)` 先调用 `migrateAuthToAuthJson()`, 再依次调用 `migrateSessionsFromAgentRoot()`、`migrateToolsToBin()`、`migrateKeybindingsConfigFile()` 和 `migrateExtensionSystem(cwd)`, 最后返回 auth providers 与 deprecation warnings [E: packages/coding-agent/src/migrations.ts:305] [E: packages/coding-agent/src/migrations.ts:309] [E: packages/coding-agent/src/migrations.ts:310] [E: packages/coding-agent/src/migrations.ts:311] [E: packages/coding-agent/src/migrations.ts:312] [E: packages/coding-agent/src/migrations.ts:313] [E: packages/coding-agent/src/migrations.ts:314]。
2. `migrateAuthToAuthJson()` 如果 `auth.json` 已存在就直接返回空数组, 因此不会 merge legacy files into an existing auth store [E: packages/coding-agent/src/migrations.ts:21] [E: packages/coding-agent/src/migrations.ts:22] [E: packages/coding-agent/src/migrations.ts:23] [E: packages/coding-agent/src/migrations.ts:28]。
3. 旧 `oauth.json` 存在时, auth migration 解析文件、逐 provider 添加 OAuth credential、记录 provider name, 然后把原文件 rename 成 `.migrated`;解析或 rename 异常会被 catch, 但 `renameSync` 失败不会回滚此前已经写入 `migrated` / `providers` 的条目 [E: packages/coding-agent/src/migrations.ts:34] [E: packages/coding-agent/src/migrations.ts:36] [E: packages/coding-agent/src/migrations.ts:37] [E: packages/coding-agent/src/migrations.ts:38] [E: packages/coding-agent/src/migrations.ts:39] [E: packages/coding-agent/src/migrations.ts:41] [E: packages/coding-agent/src/migrations.ts:42]。
4. 旧 `settings.json.apiKeys` 存在时, auth migration 只迁移 string key 且不覆盖已经从 OAuth 迁入的 provider;迁移后删除 `settings.apiKeys` 并重写 settings file [E: packages/coding-agent/src/migrations.ts:48] [E: packages/coding-agent/src/migrations.ts:50] [E: packages/coding-agent/src/migrations.ts:52] [E: packages/coding-agent/src/migrations.ts:53] [E: packages/coding-agent/src/migrations.ts:54] [E: packages/coding-agent/src/migrations.ts:55] [E: packages/coding-agent/src/migrations.ts:59] [E: packages/coding-agent/src/migrations.ts:60]。
5. Auth migration 只有在 `migrated` 非空时才创建 auth parent directory, 并以 JSON pretty print 和 file mode `0o600` 写入 `auth.json` [E: packages/coding-agent/src/migrations.ts:67] [E: packages/coding-agent/src/migrations.ts:68] [E: packages/coding-agent/src/migrations.ts:69]。
6. `migrateSessionsFromAgentRoot()` 读取 `getAgentDir()` 直属 `.jsonl`, 对每个文件解析第一行 header, 没有 session header 或 cwd 就跳过;目标目录不存在则创建, 目标文件已存在则不移动, 否则 rename 到 `agentDir/sessions/<encoded-cwd>/<filename>` [E: packages/coding-agent/src/migrations.ts:84] [E: packages/coding-agent/src/migrations.ts:90] [E: packages/coding-agent/src/migrations.ts:97] [E: packages/coding-agent/src/migrations.ts:102] [E: packages/coding-agent/src/migrations.ts:107] [E: packages/coding-agent/src/migrations.ts:116] [E: packages/coding-agent/src/migrations.ts:124] [E: packages/coding-agent/src/migrations.ts:126]。
7. `migrateCommandsToPrompts(baseDir, label)` 只在 `commands/` 存在且 `prompts/` 不存在时 rename, 成功打印 green migration message, 失败打印 yellow warning, 其他状态返回 false [E: packages/coding-agent/src/migrations.ts:137] [E: packages/coding-agent/src/migrations.ts:141] [E: packages/coding-agent/src/migrations.ts:143] [E: packages/coding-agent/src/migrations.ts:144] [E: packages/coding-agent/src/migrations.ts:145] [E: packages/coding-agent/src/migrations.ts:147] [E: packages/coding-agent/src/migrations.ts:154]。
8. `migrateExtensionSystem(cwd)` 在 global `getAgentDir()` 和 project `${cwd}/${CONFIG_DIR_NAME}` 两个 base dir 上运行 commands-to-prompts migration, 然后汇总两个 base dir 的 deprecated `hooks/` / custom `tools/` warnings [E: packages/coding-agent/src/migrations.ts:257] [E: packages/coding-agent/src/migrations.ts:258] [E: packages/coding-agent/src/migrations.ts:259] [E: packages/coding-agent/src/migrations.ts:262] [E: packages/coding-agent/src/migrations.ts:263] [E: packages/coding-agent/src/migrations.ts:266] [E: packages/coding-agent/src/migrations.ts:267] [E: packages/coding-agent/src/migrations.ts:268] [E: packages/coding-agent/src/migrations.ts:271]。
9. `migrateKeybindingsConfigFile()` 读取 `getAgentDir()/keybindings.json`, 只处理 top-level object;它委托 `migrateKeybindingsConfig()` 生成 `{ config, migrated }`, 并且只有 `migrated` 为 true 时才重写文件 [E: packages/coding-agent/src/migrations.ts:157] [E: packages/coding-agent/src/migrations.ts:158] [E: packages/coding-agent/src/migrations.ts:159] [E: packages/coding-agent/src/migrations.ts:162] [E: packages/coding-agent/src/migrations.ts:163] [E: packages/coding-agent/src/migrations.ts:166] [E: packages/coding-agent/src/migrations.ts:167] [E: packages/coding-agent/src/migrations.ts:168]。
10. `migrateToolsToBin()` 只关心 managed binary names `fd`、`rg`、`fd.exe`、`rg.exe`;old path 存在且 new path 不存在时 rename 到 `getBinDir()`, new path 已存在时删除 old path, 至少移动一个文件后打印 migration message [E: packages/coding-agent/src/migrations.ts:177] [E: packages/coding-agent/src/migrations.ts:178] [E: packages/coding-agent/src/migrations.ts:180] [E: packages/coding-agent/src/migrations.ts:184] [E: packages/coding-agent/src/migrations.ts:191] [E: packages/coding-agent/src/migrations.ts:195] [E: packages/coding-agent/src/migrations.ts:197] [E: packages/coding-agent/src/migrations.ts:205] [E: packages/coding-agent/src/migrations.ts:214]。

## 设计动机与权衡

这些 migrations 多数按 best-effort 写法处理局部异常: auth legacy 读取/解析、session root 文件、keybindings、tools/bin 和 deprecated directory scan 都有 `try/catch` 吞掉部分错误;但 `auth.json` 的最终 mkdir/write 在这些 catch 外, 因此有待写入 credential 时并不能推出 `runMigrations()` 绝不被 auth 写入错误中断 [E: packages/coding-agent/src/migrations.ts:42] [E: packages/coding-agent/src/migrations.ts:62] [E: packages/coding-agent/src/migrations.ts:67] [E: packages/coding-agent/src/migrations.ts:68] [E: packages/coding-agent/src/migrations.ts:69] [E: packages/coding-agent/src/migrations.ts:93] [E: packages/coding-agent/src/migrations.ts:127] [E: packages/coding-agent/src/migrations.ts:169] [E: packages/coding-agent/src/migrations.ts:199] [E: packages/coding-agent/src/migrations.ts:205] [E: packages/coding-agent/src/migrations.ts:246] [I]。

Auth migration deliberately refuses to overwrite an existing `auth.json`;这保护新 auth store 不被旧 `oauth.json` 或 `settings.json.apiKeys` 反向污染, 代价是如果用户已经有 partial `auth.json`, legacy credentials 不会被自动补 merge [E: packages/coding-agent/src/migrations.ts:28] [I]。

Session root migration 根据 session header 里的 cwd 重建目标目录, 而不是根据当前 process cwd;这样可以把多个 project 的 misplaced JSONL 拆回各自 cwd-scoped directory, 但如果第一行 header 缺失或 malformed, 该文件会被静默留下 [E: packages/coding-agent/src/migrations.ts:102] [E: packages/coding-agent/src/migrations.ts:106] [E: packages/coding-agent/src/migrations.ts:107] [E: packages/coding-agent/src/migrations.ts:112] [E: packages/coding-agent/src/migrations.ts:113] [E: packages/coding-agent/src/migrations.ts:127] [I]。

Extension migration 自动 rename `commands/` to `prompts/`, 但对 `hooks/` 和 custom `tools/` 只提示不搬移;这暗示 prompts rename 是 mechanical rename, hooks/tools 到 extensions 的迁移需要用户判断或改写代码 [E: packages/coding-agent/src/migrations.ts:137] [E: packages/coding-agent/src/migrations.ts:141] [E: packages/coding-agent/src/migrations.ts:143] [E: packages/coding-agent/src/migrations.ts:228] [E: packages/coding-agent/src/migrations.ts:241] [E: packages/coding-agent/src/migrations.ts:243] [E: packages/coding-agent/src/migrations.ts:283] [I]。

## Gotcha

- `runMigrations()` 本身不 await `showDeprecationWarnings()`, 所以调用方如果想阻塞用户继续操作, 必须使用 returned `deprecationWarnings` 再显式调用 display helper [E: packages/coding-agent/src/migrations.ts:277] [E: packages/coding-agent/src/migrations.ts:305] [E: packages/coding-agent/src/migrations.ts:314] [I]。
- `migrateCommandsToPrompts()` 的返回值没有被 `migrateExtensionSystem()` 使用;当前 observable effect 是 rename side effect 和 console output, 不是 returned boolean aggregation [E: packages/coding-agent/src/migrations.ts:137] [E: packages/coding-agent/src/migrations.ts:145] [E: packages/coding-agent/src/migrations.ts:154] [E: packages/coding-agent/src/migrations.ts:262] [E: packages/coding-agent/src/migrations.ts:263]。
- `migrateToolsToBin()` 在 target binary 已存在时会 delete old managed binary from `tools/`, 但 deprecated custom `tools/` scan 会忽略 fd/rg names;这让 managed binaries cleanup 与 custom extension warning 使用同一 allowlist [E: packages/coding-agent/src/migrations.ts:184] [E: packages/coding-agent/src/migrations.ts:195] [E: packages/coding-agent/src/migrations.ts:205] [E: packages/coding-agent/src/migrations.ts:237] [E: packages/coding-agent/src/migrations.ts:238]。
- `showDeprecationWarnings()` calls `process.stdin.setRawMode?.(true)` but always calls optional `setRawMode?.(false)` before pausing stdin inside the data handler;non-TTY stdin can therefore skip raw mode while still using resume/once/pause [E: packages/coding-agent/src/migrations.ts:288] [E: packages/coding-agent/src/migrations.ts:289] [E: packages/coding-agent/src/migrations.ts:290] [E: packages/coding-agent/src/migrations.ts:291] [E: packages/coding-agent/src/migrations.ts:292] [E: packages/coding-agent/src/migrations.ts:293] [I]。

## 跨包边界

[subsys.coding-agent.session-manager](session-manager.md) owns the durable session JSONL format and cwd-scoped session directory behavior [I];本节点的显式覆盖范围是 agent root 直属 `.jsonl` files 的 startup repair path [E: packages/coding-agent/src/migrations.ts:84] [E: packages/coding-agent/src/migrations.ts:90] [E: packages/coding-agent/src/migrations.ts:91]。

[subsys.coding-agent.auth-storage](auth-storage.md) owns `auth.json` credential persistence and lookup [I];本节点只覆盖 legacy `oauth.json` / `settings.json.apiKeys` 到 `auth.json` 的 one-time import [E: packages/coding-agent/src/migrations.ts:21] [E: packages/coding-agent/src/migrations.ts:23] [E: packages/coding-agent/src/migrations.ts:24] [E: packages/coding-agent/src/migrations.ts:25] [E: packages/coding-agent/src/migrations.ts:52]。

## Sources

- packages/coding-agent/src/migrations.ts

## 相关

- [subsys.coding-agent.session-manager](session-manager.md): session JSONL schema、cwd-scoped session directories、branch tree 和 listing/resume 行为。
- [subsys.coding-agent.auth-storage](auth-storage.md): `auth.json` credential store、API key/OAuth resolution、runtime override 和 provider auth status。

---
id: subsys.coding-agent.config-resolution
title: 配置值解析($ENV/!cmd)
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/resolve-config-value.ts
  - packages/coding-agent/src/config.ts
symbols:
  - resolveConfigValue
  - executeCommand
related:
  - surface.config.resolution
  - subsys.coding-agent.settings-manager
evidence: explicit
status: verified
updated: 8c943640
---

> `config-resolution` 是 pi-coding-agent 的 config value resolver: 它把 secret/config 字符串解析成 literal、environment template 或 `!command` command-backed value, 再给 API key、headers 等调用点返回 resolved string 或明确失败。

## 能回答的问题

- `resolveConfigValue()` 如何区分 literal、`$ENV` / `${ENV}` template 和 `!cmd` shell command?
- `$` escape 规则是什么, 哪些变量名会被识别为 environment reference?
- command-backed config value 什么时候缓存, 什么时候绕过缓存?
- `resolveConfigValueOrThrow()` 和 `resolveConfigValue()` 的失败语义有什么差异?
- `config.ts` 对 `.pi/agent`、`models.json`、`auth.json`、`settings.json` 的路径边界是什么?
- Windows configured shell fallback 和 default shell execution 的边界在哪里?

## 职责边界

`packages/coding-agent/src/core/resolve-config-value.ts` 只负责 string-level resolution: 对外 resolver API 接收一段 config string 和可选 provider-scoped `env`, 返回 resolved value 或 `undefined` [E: packages/coding-agent/src/core/resolve-config-value.ts:145] [E: packages/coding-agent/src/core/resolve-config-value.ts:221]; 本文件未承载 `settings.json`、`models.json` 或 `auth.json` 的读取逻辑 [I]。

`packages/coding-agent/src/config.ts` 在本节点中只作为 config path boundary: 它从 package `piConfig` 得到 `APP_NAME`、`CONFIG_DIR_NAME`, 生成 `PI_CODING_AGENT_DIR` / `PI_CODING_AGENT_SESSION_DIR` 这类 runtime env var 名, 并把默认用户配置目录定位到 `~/.pi/agent` [E: packages/coding-agent/src/config.ts:487] [E: packages/coding-agent/src/config.ts:489] [E: packages/coding-agent/src/config.ts:491] [E: packages/coding-agent/src/config.ts:495] [E: packages/coding-agent/src/config.ts:496] [E: packages/coding-agent/src/config.ts:515] [E: packages/coding-agent/src/config.ts:520]。

这个节点不枚举所有 settings keys 或 environment variables; `surface.config.resolution` 应解释用户可见的 `$ENV` / `${ENV}` / `!cmd` 表面语法, `subsys.coding-agent.settings-manager` 应解释 settings load/merge/lock, 本节点聚焦 resolver implementation 与路径边界 [I]。

## 关键文件

- `packages/coding-agent/src/core/resolve-config-value.ts`: parser、env lookup、template resolver、command execution/cache、strict throwing API 和 headers resolver 都在这个文件里 [E: packages/coding-agent/src/core/resolve-config-value.ts:28] [E: packages/coding-agent/src/core/resolve-config-value.ts:88] [E: packages/coding-agent/src/core/resolve-config-value.ts:101] [E: packages/coding-agent/src/core/resolve-config-value.ts:208] [E: packages/coding-agent/src/core/resolve-config-value.ts:229] [E: packages/coding-agent/src/core/resolve-config-value.ts:271]。
- `packages/coding-agent/src/config.ts`: package asset path、app name/config dir、agent config dir 和具体 user config file paths 的来源; resolver 源文件只导入 child-process 与 shell helper, 不导入这个 config path 模块 [E: packages/coding-agent/src/core/resolve-config-value.ts:6] [E: packages/coding-agent/src/core/resolve-config-value.ts:7] [E: packages/coding-agent/src/config.ts:367] [E: packages/coding-agent/src/config.ts:487] [E: packages/coding-agent/src/config.ts:515] [E: packages/coding-agent/src/config.ts:529] [E: packages/coding-agent/src/config.ts:534] [E: packages/coding-agent/src/config.ts:539]。

## 数据模型

`TemplatePart` 是 parser 的最小 AST: literal part 保存原样字符串, env part 保存变量名; `ConfigValueReference` 只有两种顶层形态, `command` 保存原 config string, `template` 保存 `TemplatePart[]` [E: packages/coding-agent/src/core/resolve-config-value.ts:14] [E: packages/coding-agent/src/core/resolve-config-value.ts:16] [E: packages/coding-agent/src/core/resolve-config-value.ts:82]。

Environment variable name 必须匹配 `^[A-Za-z_][A-Za-z0-9_]*$`; bare `$FOO` 用 prefix regex 读取最长合法前缀, braced `${FOO}` 则要求整段 name 合法, 否则保留为 literal [E: packages/coding-agent/src/core/resolve-config-value.ts:11] [E: packages/coding-agent/src/core/resolve-config-value.ts:12] [E: packages/coding-agent/src/core/resolve-config-value.ts:56] [E: packages/coding-agent/src/core/resolve-config-value.ts:57] [E: packages/coding-agent/src/core/resolve-config-value.ts:60] [E: packages/coding-agent/src/core/resolve-config-value.ts:66] [E: packages/coding-agent/src/core/resolve-config-value.ts:68]。

`commandResultCache` 是 process-lifetime `Map<string, string | undefined>`; cache key 是带 `!` 的完整 command config, 所以同一进程内相同 command-backed config 会复用成功或失败结果 [E: packages/coding-agent/src/core/resolve-config-value.ts:10] [E: packages/coding-agent/src/core/resolve-config-value.ts:208] [E: packages/coding-agent/src/core/resolve-config-value.ts:209] [E: packages/coding-agent/src/core/resolve-config-value.ts:210] [E: packages/coding-agent/src/core/resolve-config-value.ts:213] [E: packages/coding-agent/src/core/resolve-config-value.ts:214]。

## 控制流

1. `parseConfigValueReference@packages/coding-agent/src/core/resolve-config-value.ts:80` treats any string starting with `!` as a command reference; every other string becomes a template parsed by `parseConfigValueTemplate()` [E: packages/coding-agent/src/core/resolve-config-value.ts:80] [E: packages/coding-agent/src/core/resolve-config-value.ts:81] [E: packages/coding-agent/src/core/resolve-config-value.ts:82] [E: packages/coding-agent/src/core/resolve-config-value.ts:85]。
2. `parseConfigValueTemplate@packages/coding-agent/src/core/resolve-config-value.ts:28` scans for `$`: `$$` emits literal `$`, `$!` emits literal `!`, `${NAME}` emits env only when the braced name is valid, bare `$NAME` emits env for the longest valid prefix, and unmatched/invalid `$` forms remain literal [E: packages/coding-agent/src/core/resolve-config-value.ts:32] [E: packages/coding-agent/src/core/resolve-config-value.ts:42] [E: packages/coding-agent/src/core/resolve-config-value.ts:43] [E: packages/coding-agent/src/core/resolve-config-value.ts:48] [E: packages/coding-agent/src/core/resolve-config-value.ts:50] [E: packages/coding-agent/src/core/resolve-config-value.ts:56] [E: packages/coding-agent/src/core/resolve-config-value.ts:57] [E: packages/coding-agent/src/core/resolve-config-value.ts:60] [E: packages/coding-agent/src/core/resolve-config-value.ts:66] [E: packages/coding-agent/src/core/resolve-config-value.ts:68] [E: packages/coding-agent/src/core/resolve-config-value.ts:73]。
3. `resolveEnvConfigValue@packages/coding-agent/src/core/resolve-config-value.ts:88` resolves an env part from the supplied `env` object first, then `process.env`, and normalizes missing or empty values to `undefined` because it uses `env?.[name] || process.env[name] || undefined` [E: packages/coding-agent/src/core/resolve-config-value.ts:88] [E: packages/coding-agent/src/core/resolve-config-value.ts:89]。
4. `resolveTemplate@packages/coding-agent/src/core/resolve-config-value.ts:101` concatenates literal parts and resolved env parts; if any referenced env var resolves to `undefined`, the whole template resolves to `undefined` [E: packages/coding-agent/src/core/resolve-config-value.ts:101] [E: packages/coding-agent/src/core/resolve-config-value.ts:104] [E: packages/coding-agent/src/core/resolve-config-value.ts:105] [E: packages/coding-agent/src/core/resolve-config-value.ts:108] [E: packages/coding-agent/src/core/resolve-config-value.ts:109] [E: packages/coding-agent/src/core/resolve-config-value.ts:110]。
5. `resolveConfigValue@packages/coding-agent/src/core/resolve-config-value.ts:145` dispatches command references to cached `executeCommand()` and template references to `resolveTemplate()` [E: packages/coding-agent/src/core/resolve-config-value.ts:145] [E: packages/coding-agent/src/core/resolve-config-value.ts:146] [E: packages/coding-agent/src/core/resolve-config-value.ts:147] [E: packages/coding-agent/src/core/resolve-config-value.ts:148] [E: packages/coding-agent/src/core/resolve-config-value.ts:150]。
6. `executeCommandUncached@packages/coding-agent/src/core/resolve-config-value.ts:198` strips the leading `!`; on Windows it first tries `executeWithConfiguredShell()` and falls back to `execSync()` only when the configured shell was not executed, while non-Windows directly uses the default shell path [E: packages/coding-agent/src/core/resolve-config-value.ts:198] [E: packages/coding-agent/src/core/resolve-config-value.ts:199] [E: packages/coding-agent/src/core/resolve-config-value.ts:200] [E: packages/coding-agent/src/core/resolve-config-value.ts:202] [E: packages/coding-agent/src/core/resolve-config-value.ts:203] [E: packages/coding-agent/src/core/resolve-config-value.ts:205]。
7. `resolveConfigValueUncached@packages/coding-agent/src/core/resolve-config-value.ts:221` shares the same parser but bypasses `commandResultCache` for command references by calling `executeCommandUncached()` [E: packages/coding-agent/src/core/resolve-config-value.ts:221] [E: packages/coding-agent/src/core/resolve-config-value.ts:222] [E: packages/coding-agent/src/core/resolve-config-value.ts:223] [E: packages/coding-agent/src/core/resolve-config-value.ts:224] [E: packages/coding-agent/src/core/resolve-config-value.ts:226]。
8. `resolveConfigValueOrThrow@packages/coding-agent/src/core/resolve-config-value.ts:229` uses the uncached path, returns a resolved value immediately, otherwise throws command-specific, single-env-var, multi-env-var, or generic failure messages [E: packages/coding-agent/src/core/resolve-config-value.ts:229] [E: packages/coding-agent/src/core/resolve-config-value.ts:230] [E: packages/coding-agent/src/core/resolve-config-value.ts:231] [E: packages/coding-agent/src/core/resolve-config-value.ts:237] [E: packages/coding-agent/src/core/resolve-config-value.ts:241] [E: packages/coding-agent/src/core/resolve-config-value.ts:243] [E: packages/coding-agent/src/core/resolve-config-value.ts:246] [E: packages/coding-agent/src/core/resolve-config-value.ts:250]。

## API 面

`getConfigValueEnvVarName(config)` returns a single env var name only when the whole template has exactly one part and that part is an env reference; mixed templates like `Bearer $TOKEN` therefore do not satisfy this narrower helper [E: packages/coding-agent/src/core/resolve-config-value.ts:115] [E: packages/coding-agent/src/core/resolve-config-value.ts:116] [E: packages/coding-agent/src/core/resolve-config-value.ts:117] [E: packages/coding-agent/src/core/resolve-config-value.ts:118]。

`getConfigValueEnvVarNames(config)` returns unique env var names in template order, and `getMissingConfigValueEnvVarNames(config, env)` filters those names through the same `resolveEnvConfigValue()` precedence used by final resolution [E: packages/coding-agent/src/core/resolve-config-value.ts:92] [E: packages/coding-agent/src/core/resolve-config-value.ts:95] [E: packages/coding-agent/src/core/resolve-config-value.ts:96] [E: packages/coding-agent/src/core/resolve-config-value.ts:121] [E: packages/coding-agent/src/core/resolve-config-value.ts:123] [E: packages/coding-agent/src/core/resolve-config-value.ts:126] [E: packages/coding-agent/src/core/resolve-config-value.ts:127]。

`isCommandConfigValue(config)` is a parser-backed predicate for `!command`, while `isConfigValueConfigured(config, env)` only checks that no referenced env vars are missing; command-backed config returns configured without executing the command because `getConfigValueEnvVarNames()` returns an empty list for command references [E: packages/coding-agent/src/core/resolve-config-value.ts:121] [E: packages/coding-agent/src/core/resolve-config-value.ts:123] [E: packages/coding-agent/src/core/resolve-config-value.ts:130] [E: packages/coding-agent/src/core/resolve-config-value.ts:131] [E: packages/coding-agent/src/core/resolve-config-value.ts:134] [E: packages/coding-agent/src/core/resolve-config-value.ts:135]。

`resolveHeaders(headers, env)` is best-effort: absent headers return `undefined`, each header value goes through cached `resolveConfigValue()`, unresolved/empty values are skipped, and an all-empty result returns `undefined` [E: packages/coding-agent/src/core/resolve-config-value.ts:256] [E: packages/coding-agent/src/core/resolve-config-value.ts:260] [E: packages/coding-agent/src/core/resolve-config-value.ts:262] [E: packages/coding-agent/src/core/resolve-config-value.ts:263] [E: packages/coding-agent/src/core/resolve-config-value.ts:264] [E: packages/coding-agent/src/core/resolve-config-value.ts:265] [E: packages/coding-agent/src/core/resolve-config-value.ts:268]。

`resolveHeadersOrThrow(headers, description, env)` is strict: absent headers still return `undefined`, but every present header key must resolve through `resolveConfigValueOrThrow()` or the call throws with a header-specific description [E: packages/coding-agent/src/core/resolve-config-value.ts:271] [E: packages/coding-agent/src/core/resolve-config-value.ts:276] [E: packages/coding-agent/src/core/resolve-config-value.ts:278] [E: packages/coding-agent/src/core/resolve-config-value.ts:279] [E: packages/coding-agent/src/core/resolve-config-value.ts:281]。

## Command execution

`executeWithDefaultShell()` runs `execSync(command)` with UTF-8 stdout, 10-second timeout, ignored stdin/stderr, and returns trimmed stdout or `undefined` on empty output or any thrown error [E: packages/coding-agent/src/core/resolve-config-value.ts:185] [E: packages/coding-agent/src/core/resolve-config-value.ts:187] [E: packages/coding-agent/src/core/resolve-config-value.ts:188] [E: packages/coding-agent/src/core/resolve-config-value.ts:189] [E: packages/coding-agent/src/core/resolve-config-value.ts:190] [E: packages/coding-agent/src/core/resolve-config-value.ts:192] [E: packages/coding-agent/src/core/resolve-config-value.ts:193] [E: packages/coding-agent/src/core/resolve-config-value.ts:194]。

`executeWithConfiguredShell()` asks `getShellConfig()` for `shell`, `args`, and `commandTransport`; when transport is `stdin`, the command text is sent as `spawnSync` input, otherwise it is appended to args, and execution also uses UTF-8, 10-second timeout, stdout pipe, ignored stderr, no shell wrapping, and `windowsHide: true` [E: packages/coding-agent/src/core/resolve-config-value.ts:153] [E: packages/coding-agent/src/core/resolve-config-value.ts:155] [E: packages/coding-agent/src/core/resolve-config-value.ts:156] [E: packages/coding-agent/src/core/resolve-config-value.ts:157] [E: packages/coding-agent/src/core/resolve-config-value.ts:158] [E: packages/coding-agent/src/core/resolve-config-value.ts:159] [E: packages/coding-agent/src/core/resolve-config-value.ts:160] [E: packages/coding-agent/src/core/resolve-config-value.ts:161] [E: packages/coding-agent/src/core/resolve-config-value.ts:162] [E: packages/coding-agent/src/core/resolve-config-value.ts:163]。

Configured-shell `ENOENT` is special: it returns `{ executed: false }` so Windows can fall back to default shell; other spawn errors and non-zero status return `{ executed: true, value: undefined }`, empty stdout returns `value: undefined`, and caught exceptions return `{ executed: false, value: undefined }` without exposing stderr [E: packages/coding-agent/src/core/resolve-config-value.ts:166] [E: packages/coding-agent/src/core/resolve-config-value.ts:168] [E: packages/coding-agent/src/core/resolve-config-value.ts:169] [E: packages/coding-agent/src/core/resolve-config-value.ts:171] [E: packages/coding-agent/src/core/resolve-config-value.ts:174] [E: packages/coding-agent/src/core/resolve-config-value.ts:175] [E: packages/coding-agent/src/core/resolve-config-value.ts:178] [E: packages/coding-agent/src/core/resolve-config-value.ts:179] [E: packages/coding-agent/src/core/resolve-config-value.ts:180] [E: packages/coding-agent/src/core/resolve-config-value.ts:181]。

`clearConfigValueCache()` is exported and only clears the in-memory command cache; callers that need fresh command output should use `resolveConfigValueUncached()` rather than depending on cache mutation [E: packages/coding-agent/src/core/resolve-config-value.ts:221] [E: packages/coding-agent/src/core/resolve-config-value.ts:285] [E: packages/coding-agent/src/core/resolve-config-value.ts:286] [I]。

## Config path boundary

`getPackageDir()` allows `PI_PACKAGE_DIR` to override package asset discovery, otherwise it returns the Bun binary directory or walks up from `__dirname` until a `package.json` is found [E: packages/coding-agent/src/config.ts:367] [E: packages/coding-agent/src/config.ts:369] [E: packages/coding-agent/src/config.ts:370] [E: packages/coding-agent/src/config.ts:371] [E: packages/coding-agent/src/config.ts:374] [E: packages/coding-agent/src/config.ts:376] [E: packages/coding-agent/src/config.ts:379] [E: packages/coding-agent/src/config.ts:381] [E: packages/coding-agent/src/config.ts:382]。

`getAgentDir()` checks `process.env[ENV_AGENT_DIR]` first and otherwise returns `join(homedir(), CONFIG_DIR_NAME, "agent")`; with default `APP_NAME = "pi"` and default `CONFIG_DIR_NAME = ".pi"`, the default is `~/.pi/agent` [E: packages/coding-agent/src/config.ts:489] [E: packages/coding-agent/src/config.ts:491] [E: packages/coding-agent/src/config.ts:515] [E: packages/coding-agent/src/config.ts:516] [E: packages/coding-agent/src/config.ts:517] [E: packages/coding-agent/src/config.ts:518] [E: packages/coding-agent/src/config.ts:520]。

The user-facing config files are path helpers under the agent dir: `getModelsPath()` returns `models.json`, `getAuthPath()` returns `auth.json`, `getSettingsPath()` returns `settings.json`, and `getToolsDir()` returns the custom tools directory [E: packages/coding-agent/src/config.ts:529] [E: packages/coding-agent/src/config.ts:530] [E: packages/coding-agent/src/config.ts:534] [E: packages/coding-agent/src/config.ts:535] [E: packages/coding-agent/src/config.ts:539] [E: packages/coding-agent/src/config.ts:540] [E: packages/coding-agent/src/config.ts:544] [E: packages/coding-agent/src/config.ts:545]。

## 设计动机与权衡

The resolver keeps command execution and template expansion in one module so API keys and headers can share exactly the same syntax, strictness variants, and missing-env diagnostics [E: packages/coding-agent/src/core/resolve-config-value.ts:145] [E: packages/coding-agent/src/core/resolve-config-value.ts:229] [E: packages/coding-agent/src/core/resolve-config-value.ts:256] [E: packages/coding-agent/src/core/resolve-config-value.ts:271] [I]。

Using `env?.[name] || process.env[name] || undefined` treats empty strings as missing, which makes empty secret values fail closed in strict API paths but also means an intentionally empty header value cannot be represented through env resolution [E: packages/coding-agent/src/core/resolve-config-value.ts:88] [E: packages/coding-agent/src/core/resolve-config-value.ts:89] [I]。

The cached default `resolveConfigValue()` path is suitable for stable secrets from command-backed keychains, while `resolveConfigValueUncached()` exists for callers that must re-read dynamic command output [E: packages/coding-agent/src/core/resolve-config-value.ts:145] [E: packages/coding-agent/src/core/resolve-config-value.ts:148] [E: packages/coding-agent/src/core/resolve-config-value.ts:208] [E: packages/coding-agent/src/core/resolve-config-value.ts:221] [E: packages/coding-agent/src/core/resolve-config-value.ts:224] [I]。

## Gotcha

- `parseConfigValueReference()` treats every raw leading `!` as command syntax; a literal value that must begin with `!` must instead enter template parsing, such as by starting the configured string with `$!`, because `$!` emits a literal `!` only after the string has failed the `startsWith("!")` command test [E: packages/coding-agent/src/core/resolve-config-value.ts:80] [E: packages/coding-agent/src/core/resolve-config-value.ts:81] [E: packages/coding-agent/src/core/resolve-config-value.ts:42] [E: packages/coding-agent/src/core/resolve-config-value.ts:43]。
- `resolveHeaders()` drops resolved empty strings because it only assigns a header when `resolvedValue` is truthy; `resolveHeadersOrThrow()` preserves the stricter all-present contract by assigning the returned string from `resolveConfigValueOrThrow()` [E: packages/coding-agent/src/core/resolve-config-value.ts:263] [E: packages/coding-agent/src/core/resolve-config-value.ts:264] [E: packages/coding-agent/src/core/resolve-config-value.ts:265] [E: packages/coding-agent/src/core/resolve-config-value.ts:279]。
- `getMissingConfigValueEnvVarNames()` does not report invalid `${...}` names, because invalid braced references are parsed as literal text rather than env parts [E: packages/coding-agent/src/core/resolve-config-value.ts:56] [E: packages/coding-agent/src/core/resolve-config-value.ts:57] [E: packages/coding-agent/src/core/resolve-config-value.ts:60] [E: packages/coding-agent/src/core/resolve-config-value.ts:126] [E: packages/coding-agent/src/core/resolve-config-value.ts:127]。

## 跨包边界

[surface.config.resolution](../../surface/config/resolution.md) is the user-facing surface node for the same syntax; this subsystem node owns implementation details such as AST parts, command cache, and strict/best-effort API split [I]。

[subsys.coding-agent.settings-manager](settings-manager.md) should own settings schema, merge order, and lock semantics; this node only explains how string values are resolved once a caller has selected a config value to resolve [I]。

This resolver lives entirely in `pkg: coding-agent`; provider wire protocols in `pkg: ai` receive already-resolved API keys/headers from coding-agent-side consumers rather than parsing `$ENV` or `!cmd` themselves [I]。

## Sources

- packages/coding-agent/src/core/resolve-config-value.ts
- packages/coding-agent/src/config.ts

## 相关

- [surface.config.resolution](../../surface/config/resolution.md): `$ENV`、`${ENV}`、`!cmd` 在用户配置里的可见语法入口。
- [subsys.coding-agent.settings-manager](settings-manager.md): settings schema、scope merge、lock 与默认值管理。

---
id: surface.config.resolution
title: 配置值解析($ENV/${}/!cmd)
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/resolve-config-value.ts
symbols:
  - resolveConfigValue
  - parseConfigValueReference
related:
  - surface.config.settings
  - subsys.coding-agent.config-resolution
  - ref.coding-agent.env-vars
evidence: explicit
status: verified
updated: 8c943640
---

> `surface.config.resolution` 描述 pi-coding-agent 用户配置中的 string value 解析语法:普通字面量、`$ENV` / `${ENV}` 环境变量模板、`!cmd` 命令输出,最终由 `resolveConfigValue()` 返回字符串或 `undefined`。

## 能回答的问题

- 配置值什么时候被当成 `!cmd` shell command,什么时候只是 literal/template?
- `$ENV`、`${ENV}`、`$$`、`$!` 的表面语法分别如何解析?
- 环境变量来自传入的 `env` 还是 `process.env`,空字符串算不算已配置?
- 命令输出是否缓存,失败或空输出如何表现?
- headers 和 API key 为什么共用同一套解析规则?

## 用户可见语法

`resolve-config-value.ts` 提供 config string resolver API:默认入口 `resolveConfigValue()` 接收 `config` 和可选 `env`,并返回 `string | undefined`;同一文件也提供 strict、uncached、headers 和 cache-clear variants [E: packages/coding-agent/src/core/resolve-config-value.ts:145] [E: packages/coding-agent/src/core/resolve-config-value.ts:221] [E: packages/coding-agent/src/core/resolve-config-value.ts:229] [E: packages/coding-agent/src/core/resolve-config-value.ts:256] [E: packages/coding-agent/src/core/resolve-config-value.ts:271] [E: packages/coding-agent/src/core/resolve-config-value.ts:285]。因此这个 surface 节点的用户心智模型是:配置里写下的字符串不一定原样使用,它会先经过 config value resolver [I]。

`parseConfigValueReference()` 是 resolver 内部的顶层分类函数:只要原始字符串以 `!` 开头,整段 config 就被归类为 command reference;其它所有字符串都会进入 template parser [E: packages/coding-agent/src/core/resolve-config-value.ts:80] [E: packages/coding-agent/src/core/resolve-config-value.ts:81] [E: packages/coding-agent/src/core/resolve-config-value.ts:82] [E: packages/coding-agent/src/core/resolve-config-value.ts:85]。这意味着 literal 里如果需要以感叹号开头,不能直接写裸 `!value`;可用 `$!value` 让 template parser 产出 literal `!value` [E: packages/coding-agent/src/core/resolve-config-value.ts:42] [E: packages/coding-agent/src/core/resolve-config-value.ts:43] [I]。

普通 template 会扫描 `$`: `$$` 产出 literal `$`, `$!` 产出 literal `!`, `${NAME}` 只有在 name 完整匹配环境变量名规则时才产出 env part,裸 `$NAME` 读取最长合法变量名前缀 [E: packages/coding-agent/src/core/resolve-config-value.ts:32] [E: packages/coding-agent/src/core/resolve-config-value.ts:42] [E: packages/coding-agent/src/core/resolve-config-value.ts:43] [E: packages/coding-agent/src/core/resolve-config-value.ts:48] [E: packages/coding-agent/src/core/resolve-config-value.ts:56] [E: packages/coding-agent/src/core/resolve-config-value.ts:57] [E: packages/coding-agent/src/core/resolve-config-value.ts:66] [E: packages/coding-agent/src/core/resolve-config-value.ts:68]。变量名规则是 `^[A-Za-z_][A-Za-z0-9_]*$`;不合法的 braced form 会按 literal 保留,不是 missing env [E: packages/coding-agent/src/core/resolve-config-value.ts:11] [E: packages/coding-agent/src/core/resolve-config-value.ts:56] [E: packages/coding-agent/src/core/resolve-config-value.ts:60]。

## 解析结果

`resolveConfigValue(config, env)` 是默认入口:它先调用 `parseConfigValueReference()`,command reference 交给 cached command executor,template reference 交给 `resolveTemplate()` [E: packages/coding-agent/src/core/resolve-config-value.ts:145] [E: packages/coding-agent/src/core/resolve-config-value.ts:146] [E: packages/coding-agent/src/core/resolve-config-value.ts:147] [E: packages/coding-agent/src/core/resolve-config-value.ts:148] [E: packages/coding-agent/src/core/resolve-config-value.ts:150]。

环境变量 lookup 顺序是传入的 `env` 优先,其次 `process.env`;实现使用 `env?.[name] || process.env[name] || undefined`,所以 missing 和空字符串都会表现为 `undefined` [E: packages/coding-agent/src/core/resolve-config-value.ts:88] [E: packages/coding-agent/src/core/resolve-config-value.ts:89]。template 解析时只要任何 env part 是 `undefined`,整段 template 就解析失败并返回 `undefined`;所有 part 都可解析时才拼接 literal/env 值返回字符串 [E: packages/coding-agent/src/core/resolve-config-value.ts:101] [E: packages/coding-agent/src/core/resolve-config-value.ts:104] [E: packages/coding-agent/src/core/resolve-config-value.ts:108] [E: packages/coding-agent/src/core/resolve-config-value.ts:109] [E: packages/coding-agent/src/core/resolve-config-value.ts:110] [E: packages/coding-agent/src/core/resolve-config-value.ts:112]。

command reference 会去掉开头的 `!` 再执行 shell command;非 Windows 路径以及 Windows configured-shell 未执行时的 fallback 使用 default-shell executor: `execSync(command)`、UTF-8 stdout、10 秒 timeout、忽略 stdin/stderr,返回 trim 后 stdout,空 stdout 或任何异常都返回 `undefined` [E: packages/coding-agent/src/core/resolve-config-value.ts:185] [E: packages/coding-agent/src/core/resolve-config-value.ts:187] [E: packages/coding-agent/src/core/resolve-config-value.ts:188] [E: packages/coding-agent/src/core/resolve-config-value.ts:189] [E: packages/coding-agent/src/core/resolve-config-value.ts:190] [E: packages/coding-agent/src/core/resolve-config-value.ts:192] [E: packages/coding-agent/src/core/resolve-config-value.ts:193] [E: packages/coding-agent/src/core/resolve-config-value.ts:194] [E: packages/coding-agent/src/core/resolve-config-value.ts:198] [E: packages/coding-agent/src/core/resolve-config-value.ts:199] [E: packages/coding-agent/src/core/resolve-config-value.ts:200] [E: packages/coding-agent/src/core/resolve-config-value.ts:202] [E: packages/coding-agent/src/core/resolve-config-value.ts:203] [E: packages/coding-agent/src/core/resolve-config-value.ts:205]。

## 配置状态与错误

`getConfigValueEnvVarName(config)` 只在整个 template 恰好是单个 env part 时返回变量名;`Bearer $TOKEN` 这类混合 template 不会被这个单变量 helper 识别为单一环境变量 [E: packages/coding-agent/src/core/resolve-config-value.ts:115] [E: packages/coding-agent/src/core/resolve-config-value.ts:116] [E: packages/coding-agent/src/core/resolve-config-value.ts:117] [E: packages/coding-agent/src/core/resolve-config-value.ts:118]。

`getConfigValueEnvVarNames(config)` 返回 template 中按出现顺序去重后的 env names;`getMissingConfigValueEnvVarNames(config, env)` 用同一套 env lookup 过滤缺失变量 [E: packages/coding-agent/src/core/resolve-config-value.ts:92] [E: packages/coding-agent/src/core/resolve-config-value.ts:95] [E: packages/coding-agent/src/core/resolve-config-value.ts:96] [E: packages/coding-agent/src/core/resolve-config-value.ts:121] [E: packages/coding-agent/src/core/resolve-config-value.ts:123] [E: packages/coding-agent/src/core/resolve-config-value.ts:126] [E: packages/coding-agent/src/core/resolve-config-value.ts:127]。`isConfigValueConfigured(config, env)` 只检查 missing env names 是否为空;command reference 没有 env names,所以该 predicate 不执行 command 也会把 command-backed config 视为 configured [E: packages/coding-agent/src/core/resolve-config-value.ts:130] [E: packages/coding-agent/src/core/resolve-config-value.ts:131] [E: packages/coding-agent/src/core/resolve-config-value.ts:134] [E: packages/coding-agent/src/core/resolve-config-value.ts:135] [I]。

`resolveConfigValueOrThrow(config, description, env)` 走 uncached resolution;成功则返回字符串,失败时区分 command failure、单个 missing env、多 missing env 和 generic failure,用 description 生成面向调用点的错误信息 [E: packages/coding-agent/src/core/resolve-config-value.ts:229] [E: packages/coding-agent/src/core/resolve-config-value.ts:230] [E: packages/coding-agent/src/core/resolve-config-value.ts:231] [E: packages/coding-agent/src/core/resolve-config-value.ts:237] [E: packages/coding-agent/src/core/resolve-config-value.ts:241] [E: packages/coding-agent/src/core/resolve-config-value.ts:243] [E: packages/coding-agent/src/core/resolve-config-value.ts:245] [E: packages/coding-agent/src/core/resolve-config-value.ts:246] [E: packages/coding-agent/src/core/resolve-config-value.ts:250]。

## 缓存与 headers

`resolveConfigValue()` 的 command path 使用 process-lifetime `commandResultCache`,cache key 是带 `!` 的完整 config string,成功结果和 `undefined` 失败结果都会缓存 [E: packages/coding-agent/src/core/resolve-config-value.ts:10] [E: packages/coding-agent/src/core/resolve-config-value.ts:208] [E: packages/coding-agent/src/core/resolve-config-value.ts:209] [E: packages/coding-agent/src/core/resolve-config-value.ts:210] [E: packages/coding-agent/src/core/resolve-config-value.ts:213] [E: packages/coding-agent/src/core/resolve-config-value.ts:214] [E: packages/coding-agent/src/core/resolve-config-value.ts:215]。`resolveConfigValueUncached()` 共享 parser,但 command reference 直接调用 uncached executor;`clearConfigValueCache()` 只清空这张 in-memory command cache [E: packages/coding-agent/src/core/resolve-config-value.ts:221] [E: packages/coding-agent/src/core/resolve-config-value.ts:222] [E: packages/coding-agent/src/core/resolve-config-value.ts:223] [E: packages/coding-agent/src/core/resolve-config-value.ts:224] [E: packages/coding-agent/src/core/resolve-config-value.ts:226] [E: packages/coding-agent/src/core/resolve-config-value.ts:285] [E: packages/coding-agent/src/core/resolve-config-value.ts:286]。

`resolveHeaders(headers, env)` 和 `resolveHeadersOrThrow(headers, description, env)` 把 request headers 纳入同一套 config value syntax:前者 best-effort,未传 headers 返回 `undefined`,每个 value 用 cached `resolveConfigValue()` 解析,只保留 truthy resolved value;后者 strict,每个 header value 都必须通过 `resolveConfigValueOrThrow()` [E: packages/coding-agent/src/core/resolve-config-value.ts:256] [E: packages/coding-agent/src/core/resolve-config-value.ts:260] [E: packages/coding-agent/src/core/resolve-config-value.ts:262] [E: packages/coding-agent/src/core/resolve-config-value.ts:263] [E: packages/coding-agent/src/core/resolve-config-value.ts:264] [E: packages/coding-agent/src/core/resolve-config-value.ts:265] [E: packages/coding-agent/src/core/resolve-config-value.ts:268] [E: packages/coding-agent/src/core/resolve-config-value.ts:271] [E: packages/coding-agent/src/core/resolve-config-value.ts:276] [E: packages/coding-agent/src/core/resolve-config-value.ts:278] [E: packages/coding-agent/src/core/resolve-config-value.ts:279]。

## 边界

本节点只覆盖用户可见 config value syntax 和 resolver API 表面;Windows configured shell fallback、AST/internal executor 细节和 config path boundary 由 [subsys.coding-agent.config-resolution](../../subsystems/coding-agent/config-resolution.md) 深挖 [I]。

[surface.config.settings](settings.md) 应解释 settings schema、scope merge 和配置来源;本节点只解释某个 string value 被选中后如何解析 [I]。[ref.coding-agent.env-vars](../../reference/env-vars.md) 应枚举具体环境变量实例;本节点只解释任意 env name 的解析规则 [I]。

## Sources

- packages/coding-agent/src/core/resolve-config-value.ts

## 相关

- [surface.config.settings](settings.md): settings schema、scope merge、默认值与锁定边界。
- [subsys.coding-agent.config-resolution](../../subsystems/coding-agent/config-resolution.md): resolver implementation、command execution/cache 和 config path boundary。
- [ref.coding-agent.env-vars](../../reference/env-vars.md): `PI_*` 与 provider key 环境变量目录。

---
id: subsys.config-auth.config-loading
title: 配置加载
kind: subsystem
tier: T2
source: [codex-rs/config/src/loader/mod.rs, codex-rs/config/src/loader/layer_io.rs, codex-rs/config/src/requirements_layers/stack.rs, codex-rs/config/src/requirements_layers/hooks.rs, codex-rs/config/src/requirements_layers/rules.rs, codex-rs/config/src/requirements_layers/permissions.rs, codex-rs/config/src/state.rs, codex-rs/config/src/merge.rs, codex-rs/config/src/fingerprint.rs, codex-rs/app-server-protocol/src/protocol/v2/config.rs, codex-rs/config/src/thread_config.rs, codex-rs/config/defaults.toml]
symbols: [ConfigLayerEntry, ConfigLayerStack, ConfigLayerSource, compose_requirements, merge_toml_values, load_config_layers_state, load_project_layers, SessionThreadConfig, ConfigToml]
related: [subsys.config-auth.profiles, subsys.config-auth.features-system, config.approval-sandbox, config.storage-telemetry-misc]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> Codex 配置加载现在由 `codex_config::loader::load_config_layers_state` 负责：它收集 managed/system/cloud/user/profile/project/session/legacy layers，生成 `ConfigLayerStack`，再由 `ConfigLayerStack::effective_config()` 用 `merge_toml_values` 得出 effective TOML。[E: codex-rs/config/src/loader/mod.rs:125][E: codex-rs/config/src/loader/mod.rs:179][E: codex-rs/config/src/loader/mod.rs:435][E: codex-rs/config/src/state.rs:490][E: codex-rs/config/src/merge.rs:57]

## 能回答的问题

- 配置 layer 的来源和优先级是什么？
- system/user/profile/project/session flags/legacy managed config 在哪里加入 stack？
- trusted、untrusted、unknown project 对 `.codex/config.toml` 有什么影响？
- `merge_toml_values` 如何处理 table、非 table、key alias 和覆盖关系？
- `ConfigLayerStack` 如何保留 disabled layer、排序、origin 和 metadata？
- thread/session config 如何作为 `SessionFlags` layer 插入？

## 职责边界

本节点覆盖 TOML layer 的发现、排序、合并、禁用和 metadata 保存，不逐项解释每个 config key 的业务语义；key catalog 由 `config.*` 节点覆盖。`ConfigLayerStack` 的内部 `layers` 从低优先级到高优先级排列，后面的 entry 覆盖前面的 entry。[E: codex-rs/config/src/state.rs:242][E: codex-rs/config/src/state.rs:246][E: codex-rs/config/src/state.rs:246]

`ConfigLayerEntry` 会保留 disabled reason，app-server/debug surfaces 仍可解释某个 layer 为什么没有参与 effective config；effective merge 只读取 `get_layers(LowestPrecedenceFirst, false)` 返回的 enabled layers。[E: codex-rs/config/src/state.rs:155][E: codex-rs/config/src/state.rs:165][E: codex-rs/config/src/state.rs:199][E: codex-rs/config/src/state.rs:205][E: codex-rs/config/src/state.rs:490][E: codex-rs/config/src/state.rs:497]

## 关键 crate/文件

- `codex-rs/config/src/loader/mod.rs`: 当前配置发现入口，负责收集 packaged defaults、requirements/config layers，并调用 `compose_requirements` 后继续组装 project trust、project layer、session flags 和 legacy managed layers。[E: codex-rs/config/src/loader/mod.rs:125][E: codex-rs/config/src/loader/mod.rs:139][E: codex-rs/config/src/loader/mod.rs:168][E: codex-rs/config/src/loader/mod.rs:185][E: codex-rs/config/src/loader/mod.rs:357]
- `codex-rs/config/defaults.toml`: 嵌入二进制的 packaged defaults 源文件。[E: codex-rs/config/src/loader/mod.rs:168]
- `codex-rs/config/src/loader/layer_io.rs`: 负责读取底层 config layer 文件，`load_config_layers_state` 通过 `layer_io::load_config_layers_internal` 获取 managed/user 侧原始层。[E: codex-rs/config/src/loader/mod.rs:179][E: codex-rs/config/src/loader/mod.rs:182]
- `codex-rs/config/src/requirements_layers/stack.rs` 及其 helpers: requirements 的 field-aware composition 真正在这里执行；regular TOML 低到高 merge，rules/hooks/deny-read 等 domain fields 再按专门策略合并。[E: codex-rs/config/src/requirements_layers/stack.rs:56][E: codex-rs/config/src/requirements_layers/stack.rs:151][E: codex-rs/config/src/requirements_layers/stack.rs:174][E: codex-rs/config/src/requirements_layers/stack.rs:174][E: codex-rs/config/src/requirements_layers/stack.rs:174][E: codex-rs/config/src/requirements_layers/stack.rs:174][E: codex-rs/config/src/requirements_layers/stack.rs:179][E: codex-rs/config/src/requirements_layers/hooks.rs:61][E: codex-rs/config/src/requirements_layers/rules.rs:10][E: codex-rs/config/src/requirements_layers/permissions.rs:20]
- `codex-rs/config/src/state.rs`: `ConfigLayerEntry`、`ConfigLayerStack`、ordering 校验、effective merge、origins 和 hooks folder metadata。[E: codex-rs/config/src/state.rs:107][E: codex-rs/config/src/state.rs:242][E: codex-rs/config/src/state.rs:568][E: codex-rs/config/src/state.rs:490]
- `codex-rs/app-server-protocol/src/protocol/v2/config.rs`: `ConfigLayerSource` 和 `precedence()` 是 layer 排序事实源。[E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:29][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:102]
- `codex-rs/config/src/thread_config.rs`: `SessionThreadConfig` 的非空字段被转成 `ConfigLayerSource::SessionFlags` layer。[E: codex-rs/config/src/thread_config.rs:150][E: codex-rs/config/src/thread_config.rs:159]

## 数据模型

`ConfigLayerEntry` 保存 source name、parsed TOML、version、disabled reason、raw TOML 和 hook folder override；`new_with_raw_toml` 专门保留 legacy MDM raw TOML，`new_disabled` 保存 disabled reason 但不参与 normal effective merge。[E: codex-rs/config/src/state.rs:107][E: codex-rs/config/src/state.rs:109][E: codex-rs/config/src/state.rs:109][E: codex-rs/config/src/state.rs:109][E: codex-rs/config/src/state.rs:109][E: codex-rs/config/src/state.rs:135][E: codex-rs/config/src/state.rs:155]

`ConfigLayerSource::precedence()` 当前数值为：MDM 0、System 10、EnterpriseManaged 15、User 20、profile user 21、Project 25、SessionFlags 30、legacy managed file 40、legacy managed MDM 50。[E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:102][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:105][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:105][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:105][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:108][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:111][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:112][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:115][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:116][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:117][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:118]

Packaged defaults 是独立的最低层：`LoaderOverrides.packaged_defaults_path` 存在时从该文件读 TOML；否则 `include_str!("../../defaults.toml")` 嵌入当前二进制。[E: codex-rs/config/src/loader/mod.rs:139][E: codex-rs/config/src/loader/mod.rs:162][E: codex-rs/config/src/loader/mod.rs:167][E: codex-rs/config/src/loader/mod.rs:168] `LoaderOverrides.ignore_project_config` 为 true 时跳过 project-root discovery 和全部 project layers。[E: codex-rs/config/src/state.rs:56][E: codex-rs/config/src/state.rs:56][E: codex-rs/config/src/loader/mod.rs:185][E: codex-rs/config/src/loader/mod.rs:357]

`ConfigLayerStack::new` 调用 `verify_layer_ordering`，要求 source precedence 已排序；profile config 允许多个 User layers，并把最高优先级 user layer 作为 writable user layer；project layers 还必须按 root 到 cwd 排列。[E: codex-rs/config/src/state.rs:272][E: codex-rs/config/src/state.rs:278][E: codex-rs/config/src/state.rs:527][E: codex-rs/config/src/state.rs:539][E: codex-rs/config/src/state.rs:539]

`merge_toml_values` 对 `features.multi_agent_v2`（包括 profile 内同一路径）做 bool/table compatibility merge：base bool + overlay table 会先把 bool 提升为 table 的 `enabled`，base table + overlay bool 则只写入 `enabled` 并保留其他 table fields。这个特判让旧 `multi_agent_v2 = true` 与新 nested knobs 能跨 layer 共存。[E: codex-rs/config/src/merge.rs:61][E: codex-rs/config/src/merge.rs:75][E: codex-rs/config/src/merge.rs:78][E: codex-rs/config/src/merge.rs:86]

## 控制流

1. Loader 先按 requirements precedence 收集 system/cloud/legacy/MDM requirements，再调用 `compose_requirements`；field-aware merge 由 requirements layer stack 执行，而不是 loader 内联完成。[E: codex-rs/config/src/loader/mod.rs:125][E: codex-rs/config/src/loader/mod.rs:142][E: codex-rs/config/src/loader/mod.rs:175][E: codex-rs/config/src/loader/mod.rs:184][E: codex-rs/config/src/loader/mod.rs:189][E: codex-rs/config/src/loader/mod.rs:192][E: codex-rs/config/src/loader/mod.rs:195][E: codex-rs/config/src/requirements_layers/stack.rs:56][E: codex-rs/config/src/requirements_layers/stack.rs:151][E: codex-rs/config/src/requirements_layers/stack.rs:174]
2. `layer_io::load_config_layers_internal` 读取 managed/user 侧原始 config layers；CLI `-c`/runtime overrides 被构造成可选 `SessionFlags` TOML layer，并按 cwd 或 codex_home 解析相对路径。[E: codex-rs/config/src/loader/mod.rs:179][E: codex-rs/config/src/loader/mod.rs:207][E: codex-rs/config/src/loader/mod.rs:211][E: codex-rs/config/src/loader/mod.rs:219]
3. System config 总会占一个 layer 位置；缺文件时 required layer 使用空 table，读/parse 错误才失败。[E: codex-rs/config/src/loader/mod.rs:227][E: codex-rs/config/src/loader/mod.rs:228][E: codex-rs/config/src/loader/mod.rs:522][E: codex-rs/config/src/loader/mod.rs:524][E: codex-rs/config/src/loader/mod.rs:525]
4. Base user layer 总会加入；如果 profile-v2 选中了独立 `<name>.config.toml`，profile file 会作为第二个 User layer 叠在 base user layer 之上。[E: codex-rs/config/src/loader/mod.rs:248][E: codex-rs/config/src/loader/mod.rs:248][E: codex-rs/config/src/loader/mod.rs:280][E: codex-rs/config/src/loader/mod.rs:282]
5. 存在 cwd 时，loader 先合并已收集 layers 与 CLI overrides 来解析 `project_root_markers`，再计算 project trust context 并加载 project layers。[E: codex-rs/config/src/loader/mod.rs:295][E: codex-rs/config/src/loader/mod.rs:296][E: codex-rs/config/src/loader/mod.rs:304][E: codex-rs/config/src/loader/mod.rs:318][E: codex-rs/config/src/loader/mod.rs:344]
6. `load_project_layers` 从 project root 到 cwd 按 increasing precedence 遍历 `.codex` 目录；trusted project 解析错误会失败，untrusted/unknown project 解析错误或存在配置时会生成 disabled layer。[E: codex-rs/config/src/loader/mod.rs:1217][E: codex-rs/config/src/loader/mod.rs:1217][E: codex-rs/config/src/loader/mod.rs:1225][E: codex-rs/config/src/loader/mod.rs:1264][E: codex-rs/config/src/loader/mod.rs:1268][E: codex-rs/config/src/loader/mod.rs:1278]
7. SessionFlags layer 先 push CLI/runtime overrides，再用 `insert_layer_by_precedence` 插入 thread config layers；legacy managed config file/MDM 最后按 higher precedence 追加。[E: codex-rs/config/src/loader/mod.rs:358][E: codex-rs/config/src/loader/mod.rs:359][E: codex-rs/config/src/loader/mod.rs:363][E: codex-rs/config/src/loader/mod.rs:472][E: codex-rs/config/src/loader/mod.rs:372][E: codex-rs/config/src/loader/mod.rs:390][E: codex-rs/config/src/loader/mod.rs:407]

## Layer 合并语义

`merge_toml_values(base, overlay)` 给 overlay 更高优先级；两个值都是 table 时递归合并并先 normalize key aliases，否则 overlay 直接替换 base。[E: codex-rs/config/src/merge.rs:57][E: codex-rs/config/src/merge.rs:75][E: codex-rs/config/src/merge.rs:97][E: codex-rs/config/src/merge.rs:109][E: codex-rs/config/src/merge.rs:111][E: codex-rs/config/src/merge.rs:118]

`ConfigLayerStack::get_layers(HighestPrecedenceFirst, include_disabled)` 通过反转返回高到低顺序；`effective_config()` 使用低到高且排除 disabled layers 的顺序，因此 higher precedence layer 会在 merge 中覆盖 lower precedence layer。[E: codex-rs/config/src/state.rs:531][E: codex-rs/config/src/state.rs:539][E: codex-rs/config/src/state.rs:544][E: codex-rs/config/src/state.rs:490][E: codex-rs/config/src/state.rs:497][E: codex-rs/config/src/state.rs:498]

`origins()` 同样低到高遍历 layers，并把 path origin 写入 HashMap；后写入的高优先级 origin 会覆盖同一路径的低优先级 origin。[E: codex-rs/config/src/state.rs:506][E: codex-rs/config/src/state.rs:511][E: codex-rs/config/src/state.rs:514][E: codex-rs/config/src/fingerprint.rs:31][E: codex-rs/config/src/fingerprint.rs:38]

## Gotchas

- `ConfigLayerSource::User` 在 profile 字段存在时 precedence 是 21，不是普通 user 的 20；profile-v2 是独立 user layer，不是 legacy `[profiles.<name>]` merge。[E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:108][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:111][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:111][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:112][E: codex-rs/config/src/loader/mod.rs:248]
- legacy managed config 的 precedence 40/50 高于 SessionFlags 30，所以它仍可能覆盖 runtime overrides；loader 会在 session/thread layers 之后处理 legacy managed config layers。[E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:116][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:117][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:118][E: codex-rs/config/src/loader/mod.rs:363][E: codex-rs/config/src/loader/mod.rs:366][E: codex-rs/config/src/loader/mod.rs:372]
- Hook discovery 优先使用 `hooks_config_folder()`；linked worktree project layer 可把 hooks folder 指到 root checkout 的 `.codex`，而普通 config folder 仍指自身 layer。[E: codex-rs/config/src/state.rs:229][E: codex-rs/config/src/state.rs:229][E: codex-rs/config/src/loader/mod.rs:924][E: codex-rs/config/src/loader/mod.rs:1255]

## Sources

- `codex-rs/config/src/loader/mod.rs`
- `codex-rs/config/src/loader/layer_io.rs`
- `codex-rs/config/src/requirements_layers/stack.rs`
- `codex-rs/config/src/requirements_layers/hooks.rs`
- `codex-rs/config/src/requirements_layers/rules.rs`
- `codex-rs/config/src/requirements_layers/permissions.rs`
- `codex-rs/config/src/state.rs`
- `codex-rs/config/src/merge.rs`
- `codex-rs/config/src/fingerprint.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/config.rs`
- `codex-rs/config/src/thread_config.rs`
- `codex-rs/config/defaults.toml`

## 相关

- `subsys.config-auth.profiles`: active project、permission profile 和 approval default 如何从 effective config 派生。
- `subsys.config-auth.features-system`: feature TOML 如何进入 runtime `Features`。
- `config.approval-sandbox`: sandbox/approval key catalog。

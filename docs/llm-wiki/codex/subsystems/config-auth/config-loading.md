---
id: subsys.config-auth.config-loading
title: 配置加载
kind: subsystem
tier: T2
source: [codex-rs/config/src/loader/mod.rs, codex-rs/config/src/loader/layer_io.rs, codex-rs/config/src/requirements_layers/stack.rs, codex-rs/config/src/requirements_layers/hooks.rs, codex-rs/config/src/requirements_layers/rules.rs, codex-rs/config/src/requirements_layers/permissions.rs, codex-rs/config/src/state.rs, codex-rs/config/src/merge.rs, codex-rs/config/src/fingerprint.rs, codex-rs/app-server-protocol/src/protocol/v2/config.rs, codex-rs/config/src/thread_config.rs]
symbols: [ConfigLayerEntry, ConfigLayerStack, ConfigLayerSource, compose_requirements, merge_toml_values, load_config_layers_state, load_project_layers, SessionThreadConfig]
related: [subsys.config-auth.profiles, subsys.config-auth.features-system, config.approval-sandbox, config.storage-telemetry-misc]
evidence: explicit
status: verified
updated: 5670360009
---

> Codex 配置加载现在由 `codex_config::loader::load_config_layers_state` 负责：它收集 managed/system/cloud/user/profile/project/session/legacy layers，生成 `ConfigLayerStack`，再由 `ConfigLayerStack::effective_config()` 用 `merge_toml_values` 得出 effective TOML。[E: codex-rs/config/src/loader/mod.rs:116][E: codex-rs/config/src/loader/mod.rs:177][E: codex-rs/config/src/loader/mod.rs:411][E: codex-rs/config/src/state.rs:483][E: codex-rs/config/src/merge.rs:7]

## 能回答的问题

- 配置 layer 的来源和优先级是什么？
- system/user/profile/project/session flags/legacy managed config 在哪里加入 stack？
- trusted、untrusted、unknown project 对 `.codex/config.toml` 有什么影响？
- `merge_toml_values` 如何处理 table、非 table、key alias 和覆盖关系？
- `ConfigLayerStack` 如何保留 disabled layer、排序、origin 和 metadata？
- thread/session config 如何作为 `SessionFlags` layer 插入？

## 职责边界

本节点覆盖 TOML layer 的发现、排序、合并、禁用和 metadata 保存，不逐项解释每个 config key 的业务语义；key catalog 由 `config.*` 节点覆盖。`ConfigLayerStack` 的内部 `layers` 从低优先级到高优先级排列，后面的 entry 覆盖前面的 entry。[E: codex-rs/config/src/state.rs:240][E: codex-rs/config/src/state.rs:241][E: codex-rs/config/src/state.rs:242]

`ConfigLayerEntry` 会保留 disabled reason，app-server/debug surfaces 仍可解释某个 layer 为什么没有参与 effective config；effective merge 只读取 `get_layers(LowestPrecedenceFirst, false)` 返回的 enabled layers。[E: codex-rs/config/src/state.rs:152][E: codex-rs/config/src/state.rs:162][E: codex-rs/config/src/state.rs:197][E: codex-rs/config/src/state.rs:202][E: codex-rs/config/src/state.rs:483][E: codex-rs/config/src/state.rs:485]

## 关键 crate/文件

- `codex-rs/config/src/loader/mod.rs`: 当前配置发现入口，负责收集 requirements/config layers，并调用 `compose_requirements` 后继续组装 project trust、project layer、session flags 和 legacy managed layers。[E: codex-rs/config/src/loader/mod.rs:80][E: codex-rs/config/src/loader/mod.rs:116][E: codex-rs/config/src/loader/mod.rs:134][E: codex-rs/config/src/loader/mod.rs:191][E: codex-rs/config/src/loader/mod.rs:340][E: codex-rs/config/src/loader/mod.rs:1195]
- `codex-rs/config/src/loader/layer_io.rs`: 负责读取底层 config layer 文件，`load_config_layers_state` 通过 `layer_io::load_config_layers_internal` 获取 managed/user 侧原始层。[E: codex-rs/config/src/loader/mod.rs:177][E: codex-rs/config/src/loader/mod.rs:178]
- `codex-rs/config/src/requirements_layers/stack.rs` 及其 helpers: requirements 的 field-aware composition 真正在这里执行；regular TOML 低到高 merge，rules/hooks/deny-read 等 domain fields 再按专门策略合并。[E: codex-rs/config/src/requirements_layers/stack.rs:58][E: codex-rs/config/src/requirements_layers/stack.rs:151][E: codex-rs/config/src/requirements_layers/stack.rs:168][E: codex-rs/config/src/requirements_layers/stack.rs:171][E: codex-rs/config/src/requirements_layers/stack.rs:173][E: codex-rs/config/src/requirements_layers/stack.rs:174][E: codex-rs/config/src/requirements_layers/stack.rs:179][E: codex-rs/config/src/requirements_layers/hooks.rs:61][E: codex-rs/config/src/requirements_layers/rules.rs:10][E: codex-rs/config/src/requirements_layers/permissions.rs:20]
- `codex-rs/config/src/state.rs`: `ConfigLayerEntry`、`ConfigLayerStack`、ordering 校验、effective merge、origins 和 hooks folder metadata。[E: codex-rs/config/src/state.rs:104][E: codex-rs/config/src/state.rs:240][E: codex-rs/config/src/state.rs:544][E: codex-rs/config/src/state.rs:483]
- `codex-rs/app-server-protocol/src/protocol/v2/config.rs`: `ConfigLayerSource` 和 `precedence()` 是 layer 排序事实源。[E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:28][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:102]
- `codex-rs/config/src/thread_config.rs`: `SessionThreadConfig` 的非空字段被转成 `ConfigLayerSource::SessionFlags` layer。[E: codex-rs/config/src/thread_config.rs:154][E: codex-rs/config/src/thread_config.rs:163]

## 数据模型

`ConfigLayerEntry` 保存 source name、parsed TOML、version、disabled reason、raw TOML 和 hook folder override；`new_with_raw_toml` 专门保留 legacy MDM raw TOML，`new_disabled` 保存 disabled reason 但不参与 normal effective merge。[E: codex-rs/config/src/state.rs:104][E: codex-rs/config/src/state.rs:107][E: codex-rs/config/src/state.rs:108][E: codex-rs/config/src/state.rs:109][E: codex-rs/config/src/state.rs:110][E: codex-rs/config/src/state.rs:132][E: codex-rs/config/src/state.rs:152]

`ConfigLayerSource::precedence()` 当前数值为：MDM 0、System 10、EnterpriseManaged 15、User 20、profile user 21、Project 25、SessionFlags 30、legacy managed file 40、legacy managed MDM 50。[E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:102][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:104][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:105][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:106][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:107][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:108][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:111][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:114][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:115][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:116][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:117]

`ConfigLayerStack::new` 调用 `verify_layer_ordering`，要求 source precedence 已排序；profile config 允许多个 User layers，并把最高优先级 user layer 作为 writable user layer；project layers 还必须按 root 到 cwd 排列。[E: codex-rs/config/src/state.rs:273][E: codex-rs/config/src/state.rs:278][E: codex-rs/config/src/state.rs:245][E: codex-rs/config/src/state.rs:248][E: codex-rs/config/src/state.rs:544][E: codex-rs/config/src/state.rs:552][E: codex-rs/config/src/state.rs:563]

## 控制流

1. Loader 先按 requirements precedence 收集 system/cloud/legacy/MDM requirements，再调用 `compose_requirements`；field-aware merge 由 requirements layer stack 执行，而不是 loader 内联完成。[E: codex-rs/config/src/loader/mod.rs:80][E: codex-rs/config/src/loader/mod.rs:140][E: codex-rs/config/src/loader/mod.rs:170][E: codex-rs/config/src/loader/mod.rs:180][E: codex-rs/config/src/loader/mod.rs:185][E: codex-rs/config/src/loader/mod.rs:188][E: codex-rs/config/src/loader/mod.rs:191][E: codex-rs/config/src/requirements_layers/stack.rs:58][E: codex-rs/config/src/requirements_layers/stack.rs:151][E: codex-rs/config/src/requirements_layers/stack.rs:171]
2. `layer_io::load_config_layers_internal` 读取 managed/user 侧原始 config layers；CLI `-c`/runtime overrides 被构造成可选 `SessionFlags` TOML layer，并按 cwd 或 codex_home 解析相对路径。[E: codex-rs/config/src/loader/mod.rs:177][E: codex-rs/config/src/loader/mod.rs:204][E: codex-rs/config/src/loader/mod.rs:207][E: codex-rs/config/src/loader/mod.rs:215]
3. System config 总会占一个 layer 位置；缺文件时 required layer 使用空 table，读/parse 错误才失败。[E: codex-rs/config/src/loader/mod.rs:221][E: codex-rs/config/src/loader/mod.rs:224][E: codex-rs/config/src/loader/mod.rs:463][E: codex-rs/config/src/loader/mod.rs:466]
4. Base user layer 总会加入；如果 profile-v2 选中了独立 `<name>.config.toml`，profile file 会作为第二个 User layer 叠在 base user layer 之上。[E: codex-rs/config/src/loader/mod.rs:241][E: codex-rs/config/src/loader/mod.rs:244][E: codex-rs/config/src/loader/mod.rs:276][E: codex-rs/config/src/loader/mod.rs:278]
5. 存在 cwd 时，loader 先合并已收集 layers 与 CLI overrides 来解析 `project_root_markers`，再计算 project trust context 并加载 project layers。[E: codex-rs/config/src/loader/mod.rs:291][E: codex-rs/config/src/loader/mod.rs:293][E: codex-rs/config/src/loader/mod.rs:301][E: codex-rs/config/src/loader/mod.rs:314][E: codex-rs/config/src/loader/mod.rs:340]
6. `load_project_layers` 从 project root 到 cwd 按 increasing precedence 遍历 `.codex` 目录；trusted project 解析错误会失败，untrusted/unknown project 解析错误或存在配置时会生成 disabled layer。[E: codex-rs/config/src/loader/mod.rs:1189][E: codex-rs/config/src/loader/mod.rs:1191][E: codex-rs/config/src/loader/mod.rs:1206][E: codex-rs/config/src/loader/mod.rs:1245][E: codex-rs/config/src/loader/mod.rs:1250][E: codex-rs/config/src/loader/mod.rs:1259]
7. SessionFlags layer 先 push CLI/runtime overrides，再用 `insert_layer_by_precedence` 插入 thread config layers；legacy managed config file/MDM 最后按 higher precedence 追加。[E: codex-rs/config/src/loader/mod.rs:353][E: codex-rs/config/src/loader/mod.rs:355][E: codex-rs/config/src/loader/mod.rs:361][E: codex-rs/config/src/loader/mod.rs:453][E: codex-rs/config/src/loader/mod.rs:365][E: codex-rs/config/src/loader/mod.rs:386][E: codex-rs/config/src/loader/mod.rs:403]

## Layer 合并语义

`merge_toml_values(base, overlay)` 给 overlay 更高优先级；两个值都是 table 时递归合并并先 normalize key aliases，否则 overlay 直接替换 base。[E: codex-rs/config/src/merge.rs:7][E: codex-rs/config/src/merge.rs:11][E: codex-rs/config/src/merge.rs:15][E: codex-rs/config/src/merge.rs:23][E: codex-rs/config/src/merge.rs:25][E: codex-rs/config/src/merge.rs:32]

`ConfigLayerStack::get_layers(HighestPrecedenceFirst, include_disabled)` 通过反转返回高到低顺序；`effective_config()` 使用低到高且排除 disabled layers 的顺序，因此 higher precedence layer 会在 merge 中覆盖 lower precedence layer。[E: codex-rs/config/src/state.rs:525][E: codex-rs/config/src/state.rs:530][E: codex-rs/config/src/state.rs:535][E: codex-rs/config/src/state.rs:483][E: codex-rs/config/src/state.rs:485][E: codex-rs/config/src/state.rs:489]

`origins()` 同样低到高遍历 layers，并把 path origin 写入 HashMap；后写入的高优先级 origin 会覆盖同一路径的低优先级 origin。[E: codex-rs/config/src/state.rs:497][E: codex-rs/config/src/state.rs:501][E: codex-rs/config/src/state.rs:505][E: codex-rs/config/src/fingerprint.rs:30][E: codex-rs/config/src/fingerprint.rs:31]

## Gotchas

- `ConfigLayerSource::User` 在 profile 字段存在时 precedence 是 21，不是普通 user 的 20；profile-v2 是独立 user layer，不是 legacy `[profiles.<name>]` merge。[E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:107][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:108][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:109][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:111][E: codex-rs/config/src/loader/mod.rs:241]
- legacy managed config 的 precedence 40/50 高于 SessionFlags 30，所以它仍可能覆盖 runtime overrides；源码注释称这是 best-effort backward compatibility。[E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:115][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:116][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:117][E: codex-rs/config/src/loader/mod.rs:365]
- Hook discovery 优先使用 `hooks_config_folder()`；linked worktree project layer 可把 hooks folder 指到 root checkout 的 `.codex`，而普通 config folder 仍指自身 layer。[E: codex-rs/config/src/state.rs:220][E: codex-rs/config/src/state.rs:226][E: codex-rs/config/src/loader/mod.rs:906][E: codex-rs/config/src/loader/mod.rs:1237]

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

## 相关

- `subsys.config-auth.profiles`: active project、permission profile 和 approval default 如何从 effective config 派生。
- `subsys.config-auth.features-system`: feature TOML 如何进入 runtime `Features`。
- `config.approval-sandbox`: sandbox/approval key catalog。

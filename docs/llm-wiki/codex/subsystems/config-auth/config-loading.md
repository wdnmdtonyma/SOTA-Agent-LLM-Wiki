---
id: subsys.config-auth.config-loading
title: 配置加载
kind: subsystem
tier: T2
source: [codex-rs/config/src/state.rs, codex-rs/config/src/merge.rs, codex-rs/config/src/fingerprint.rs, codex-rs/core/src/config_loader/mod.rs, codex-rs/core/src/config_loader/layer_io.rs, codex-rs/app-server-protocol/src/protocol/v2.rs, codex-rs/config/src/thread_config.rs]
symbols: [ConfigLayerEntry, ConfigLayerStack, ConfigLayerSource, merge_toml_values, load_config_layers_state, load_project_layers, SessionThreadConfig]
related: [subsys.config-auth.profiles, subsys.config-auth.features-system, config.approval-sandbox, config.storage-telemetry-misc]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Codex 配置加载是 `load_config_layers_state` 把 managed/system/user/project/session/legacy/runtime override 组织成 `ConfigLayerStack`，再由 `merge_toml_values` 按低优先级到高优先级合并为 effective TOML 的过程。[E: codex-rs/core/src/config_loader/mod.rs:127][E: codex-rs/config/src/state.rs:264][E: codex-rs/config/src/merge.rs:10]

## 能回答的问题

- Codex 配置 layer 的优先级顺序是什么？
- system、user、project、session flags、legacy managed config 分别从哪里加载？
- trusted / untrusted / unknown project 为什么会启用或禁用 `.codex/config.toml`？
- `merge_toml_values` 怎样处理 table、非 table、key alias 和覆盖关系？
- `ConfigLayerStack` 怎样保证 layer 顺序、一个 user layer、project root 到 cwd 的顺序？
- thread/session config 怎样插入 layer stack？

## 职责边界

配置加载节点覆盖 TOML layer 的发现、排序、合并、禁用和元数据保存。`ConfigLayerStack` 的 `layers` 字段保存由低优先级到高优先级排列的 `ConfigLayerEntry`，并显式要求后续 entries 覆盖更早 entries。[E: codex-rs/config/src/state.rs:148][E: codex-rs/config/src/state.rs:150] `ConfigLayerStack::effective_config` 遍历 `get_layers(LowestPrecedenceFirst, false)`，只合并未禁用 layer，并把每个 layer 的 table 交给 `merge_toml_values`。[E: codex-rs/config/src/state.rs:264][E: codex-rs/config/src/state.rs:272]

本节点不解释每个 config key 的业务含义；config key catalog 由 `config.*` 节点覆盖。本节点也不覆盖 model/provider 的最终解析；`subsys.config-auth.profiles` 说明 active profile、project trust 与 runtime `Config` 的关系。

## 关键 crate/文件

- `codex-rs/core/src/config_loader/mod.rs`: 配置发现入口、requirements 合并、project trust、project `.codex/config.toml` 加载、thread/session layer 插入。[E: codex-rs/core/src/config_loader/mod.rs:95][E: codex-rs/core/src/config_loader/mod.rs:313][E: codex-rs/core/src/config_loader/mod.rs:921]
- `codex-rs/config/src/state.rs`: `ConfigLayerEntry`、`ConfigLayerStack`、layer ordering 校验、effective TOML 合并和 origin 追踪。[E: codex-rs/config/src/state.rs:56][E: codex-rs/config/src/state.rs:147][E: codex-rs/config/src/state.rs:327]
- `codex-rs/config/src/merge.rs`: table 递归合并、key alias normalize、高优先级非 table 覆盖低优先级值。[E: codex-rs/config/src/merge.rs:5][E: codex-rs/config/src/merge.rs:18][E: codex-rs/config/src/merge.rs:29]
- `codex-rs/app-server-protocol/src/protocol/v2.rs`: `ConfigLayerSource` 和 `precedence()` 数值，定义 layer source 的相对优先级。[E: codex-rs/app-server-protocol/src/protocol/v2.rs:512][E: codex-rs/app-server-protocol/src/protocol/v2.rs:566]
- `codex-rs/config/src/thread_config.rs`: thread config 能映射为 `ConfigLayerSource::SessionFlags`，并只把非空 session fields 转成 TOML layer。[E: codex-rs/config/src/thread_config.rs:147][E: codex-rs/config/src/thread_config.rs:173]

## 数据模型

`ConfigLayerEntry` 保存 layer source、parsed TOML value、optional raw TOML、version 和 disabled reason。[E: codex-rs/config/src/state.rs:57][E: codex-rs/config/src/state.rs:62] `new_with_raw_toml` 会保存 raw TOML，`new_disabled` 会保存 source/config/version 并把 `raw_toml` 设为 `None`、`disabled_reason` 设为给定字符串。[E: codex-rs/config/src/state.rs:77][E: codex-rs/config/src/state.rs:82][E: codex-rs/config/src/state.rs:88][E: codex-rs/config/src/state.rs:97][E: codex-rs/config/src/state.rs:99] `ConfigLayerEntry::as_layer` 把 entry 转成 app-server protocol 的 `ConfigLayer`，暴露 `name`、`version`、序列化后的 `config` 和 `disabled_reason`。[E: codex-rs/config/src/state.rs:118][E: codex-rs/config/src/state.rs:120][E: codex-rs/config/src/state.rs:123]

`ConfigLayerSource::precedence()` 是排序事实源：MDM 是 0，System 是 10，User 是 20，Project 是 25，SessionFlags 是 30，legacy managed config file 是 40，legacy managed config from MDM 是 50。[E: codex-rs/app-server-protocol/src/protocol/v2.rs:566][E: codex-rs/app-server-protocol/src/protocol/v2.rs:570][E: codex-rs/app-server-protocol/src/protocol/v2.rs:575] `ConfigLayerSource` 的 `PartialOrd` 直接比较 `precedence()`，所以 stack 校验和插入都使用同一套数值语义。[E: codex-rs/app-server-protocol/src/protocol/v2.rs:582][E: codex-rs/app-server-protocol/src/protocol/v2.rs:585]

`ConfigLayerStack` 保存 `user_layer_index` 与 `layers`；`new` 会先运行 `verify_layer_ordering`，再保存返回的 optional user layer index。[E: codex-rs/config/src/state.rs:151][E: codex-rs/config/src/state.rs:153][E: codex-rs/config/src/state.rs:170][E: codex-rs/config/src/state.rs:175] `verify_layer_ordering` 要求 layer source 已排序、至多一个 User layer，并要求 Project layer 路径按 root 到 cwd 顺序排列。[E: codex-rs/config/src/state.rs:327][E: codex-rs/config/src/state.rs:339][E: codex-rs/config/src/state.rs:340][E: codex-rs/config/src/state.rs:351]

## 控制流

1. `load_config_layers_state` 先构造 cloud/system/legacy requirements，再按配置顺序构建 `layers`。[E: codex-rs/core/src/config_loader/mod.rs:142][E: codex-rs/core/src/config_loader/mod.rs:161][E: codex-rs/core/src/config_loader/mod.rs:171]
2. CLI/runtime overrides 被序列化为 `ConfigLayerSource::SessionFlags` 的 `ConfigLayerEntry`，相对路径会按 cwd 或 `codex_home` 解析。[E: codex-rs/core/src/config_loader/mod.rs:193][E: codex-rs/core/src/config_loader/mod.rs:201][E: codex-rs/core/src/config_loader/mod.rs:305]
3. system layer 在 Unix 使用 `/etc/codex/config.toml`；文件不存在时 required layer 会变成空 TOML table，其他读取错误会返回错误。[E: codex-rs/core/src/config_loader/mod.rs:79][E: codex-rs/core/src/config_loader/mod.rs:376][E: codex-rs/core/src/config_loader/mod.rs:413]
4. user layer 总会加入 stack；`ignore_user_config` 为 true 时加入空 user table 以保留 ordering/metadata 位置。[E: codex-rs/core/src/config_loader/mod.rs:222][E: codex-rs/core/src/config_loader/mod.rs:231][E: codex-rs/core/src/config_loader/mod.rs:244]
5. 如果存在 cwd，loader 会把当前已收集 layer 合并到临时 `TomlValue` `merged_so_far`，用该有效 TOML 读取 `project_root_markers`，再推导 project trust context。[E: codex-rs/core/src/config_loader/mod.rs:246][E: codex-rs/core/src/config_loader/mod.rs:247][E: codex-rs/core/src/config_loader/mod.rs:249][E: codex-rs/core/src/config_loader/mod.rs:255][E: codex-rs/core/src/config_loader/mod.rs:268]
6. `load_project_layers` 从 project root 到 cwd 逐层查找 `.codex/config.toml`，trusted project 读取并解析，untrusted/unknown project 生成 disabled layer，未找到文件也生成空 Project layer 以暴露 metadata。[E: codex-rs/core/src/config_loader/mod.rs:921][E: codex-rs/core/src/config_loader/mod.rs:936][E: codex-rs/core/src/config_loader/mod.rs:963][E: codex-rs/core/src/config_loader/mod.rs:998]
7. thread config layer 通过 `insert_layer_by_precedence` 插入到第一个高于该 source precedence 的位置，保持 stack 低到高排序。[E: codex-rs/core/src/config_loader/mod.rs:313][E: codex-rs/core/src/config_loader/mod.rs:366][E: codex-rs/core/src/config_loader/mod.rs:370]
8. legacy managed config file 与 MDM layer 被追加在最后；legacy requirements loader 注释说明“earlier layers cannot be overwritten by later layers”，实际合并调用 `merge_unset_fields` 只填未设置项，因此 requirements 是安全默认层。[E: codex-rs/core/src/config_loader/mod.rs:317][E: codex-rs/core/src/config_loader/mod.rs:340][E: codex-rs/core/src/config_loader/mod.rs:351][E: codex-rs/core/src/config_loader/mod.rs:581][E: codex-rs/core/src/config_loader/mod.rs:630]

## Layer 合并语义

`merge_toml_values` 的左参数是低优先级 base，右参数是高优先级 overlay；两个 value 都是 table 时递归合并，base table 和 overlay table 都会先做 key alias normalize。[E: codex-rs/config/src/merge.rs:5][E: codex-rs/config/src/merge.rs:10][E: codex-rs/config/src/merge.rs:14][E: codex-rs/config/src/merge.rs:16] 如果 base table 已有同名 key，函数对该 key 的 value 继续递归合并；如果没有同名 key，函数把 overlay value 插入 base table。[E: codex-rs/config/src/merge.rs:20][E: codex-rs/config/src/merge.rs:23] 只要两个 value 不同时是 table，高优先级 overlay 直接替换 base value。[E: codex-rs/config/src/merge.rs:28][E: codex-rs/config/src/merge.rs:29]

`ConfigLayerStack::get_layers(HighestPrecedenceFirst, include_disabled)` 通过反转 iterator 返回高到低顺序；`get_layers(LowestPrecedenceFirst, false)` 会过滤 disabled layer。[E: codex-rs/config/src/state.rs:310][E: codex-rs/config/src/state.rs:315][E: codex-rs/config/src/state.rs:320] `origins` 在遍历低到高 layers 时调用 `record_origins`；`record_origins` 使用 `HashMap::insert` 写入 path origin，因此后遍历到的高优先级 layer 会覆盖同一路径的较低优先级 origin。[E: codex-rs/config/src/state.rs:282][E: codex-rs/config/src/state.rs:290][E: codex-rs/config/src/fingerprint.rs:31]

## 设计动机与权衡

`ConfigLayerStack` 把 disabled layer 保留在 stack 中而不是丢弃，原因是 app-server / debug-config 仍能解释某个 `.codex/config.toml` 是因为 untrusted / unknown project 被禁用。[I] 这个设计由 `ConfigLayerEntry::new_disabled` 保存 `disabled_reason`、`as_layer` 暴露 disabled reason 共同体现。[E: codex-rs/config/src/state.rs:88][E: codex-rs/config/src/state.rs:99][E: codex-rs/config/src/state.rs:123]

project layer 使用 root 到 cwd 的顺序，让更靠近当前工作目录的 `.codex/config.toml` 具备更高优先级。[I] 该结论由 `load_project_layers` 文档注释“ordered by increasing precedence, from root to cwd”与 `ConfigLayerStack` 低到高排序共同支撑。[E: codex-rs/core/src/config_loader/mod.rs:921][E: codex-rs/config/src/state.rs:148]

## Gotchas

- legacy managed config 的 `ConfigLayerSource` priority 高于 SessionFlags，这意味着 legacy layer 在 layer stack 合并中会覆盖 runtime overrides；这是源码当前 precedence 数值的直接结果。[E: codex-rs/app-server-protocol/src/protocol/v2.rs:575][E: codex-rs/app-server-protocol/src/protocol/v2.rs:576]
- `ConfigLayerEntry::config_folder()` 对 MDM、SessionFlags、legacy managed config file 和 legacy MDM 返回 `None`，对 System/User/Project 返回路径 parent 或 `.codex` folder；hook/skill discovery 会把这个 folder 作为扫描起点。[E: codex-rs/config/src/state.rs:130][E: codex-rs/config/src/state.rs:131][E: codex-rs/config/src/state.rs:132][E: codex-rs/config/src/state.rs:133][E: codex-rs/config/src/state.rs:134][E: codex-rs/config/src/state.rs:135][E: codex-rs/config/src/state.rs:136][I]
- trusted project 解析错误会让加载失败，untrusted project 解析错误会生成 disabled empty layer；这是为了避免不可信项目通过破坏配置阻断启动，同时仍严格处理可信配置。[E: codex-rs/core/src/config_loader/mod.rs:971][E: codex-rs/core/src/config_loader/mod.rs:976][E: codex-rs/core/src/config_loader/mod.rs:985]

## Sources

- `codex-rs/config/src/state.rs`
- `codex-rs/config/src/merge.rs`
- `codex-rs/config/src/fingerprint.rs`
- `codex-rs/core/src/config_loader/mod.rs`
- `codex-rs/core/src/config_loader/layer_io.rs`
- `codex-rs/app-server-protocol/src/protocol/v2.rs`
- `codex-rs/config/src/thread_config.rs`

## 相关

- `subsys.config-auth.profiles`: active profile 与 project trust 如何进入 runtime `Config`。
- `subsys.config-auth.features-system`: feature map 如何在 base/profile/CLI overrides 之间合并。
- `config.approval-sandbox`: sandbox/approval config key catalog。

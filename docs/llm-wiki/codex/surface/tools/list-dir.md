---
id: tool.list-dir
title: list_dir 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/utility_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/tools/src/tool_config.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/registry.rs, codex-rs/core/src/tools/handlers/list_dir.rs, codex-rs/core/src/tools/router.rs]
symbols: [create_list_dir_tool, ToolHandlerKind::ListDir, ListDirHandler, ListDirArgs]
related: [subsys.core.tool-system, subsys.core.tool-router, subsys.exec-sandbox.overview]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `list_dir` 是实验性 directory listing function tool。它要求输入绝对目录路径，按 depth 收集目录项，按名称排序后分页返回，并遵守 filesystem `deny_read` policy。[E: codex-rs/tools/src/tool_registry_plan.rs:338][E: codex-rs/core/src/tools/handlers/list_dir.rs:97][E: codex-rs/core/src/tools/handlers/list_dir.rs:131][E: codex-rs/core/src/tools/handlers/list_dir.rs:137][E: codex-rs/core/src/tools/handlers/list_dir.rs:147][E: codex-rs/core/src/tools/handlers/list_dir.rs:102]

## 能回答的问题

- `list_dir` 的 wire name、schema 字段和默认值是什么?
- `list_dir` 为什么不是默认暴露的工具?
- `list_dir` 如何处理 offset/limit/depth 与绝对路径校验?
- 输出中目录、symlink、other file type 如何标记?
- `list_dir` 是否 parallel-safe?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `list_dir`; constructor 把 `ResponsesApiTool.name` 固定为 `"list_dir"`。[E: codex-rs/tools/src/utility_tool.rs:31] |
| aliases | 无 alias；registry plan 只注册 `"list_dir"`。[E: codex-rs/tools/src/tool_registry_plan.rs:345] |
| ToolHandlerKind | `ToolHandlerKind::ListDir` 是 registry plan 的 handler kind。[E: codex-rs/tools/src/tool_registry_plan_types.rs:24] |
| concrete handler | `core/src/tools/spec.rs` 把 `ToolHandlerKind::ListDir` 注册为 `ListDirHandler`。[E: codex-rs/core/src/tools/spec.rs:224][E: codex-rs/core/src/tools/spec.rs:225] |
| 所属文件 | schema constructor 在 `codex-rs/tools/src/utility_tool.rs`; handler struct 在 `codex-rs/core/src/tools/handlers/list_dir.rs`。[E: codex-rs/tools/src/utility_tool.rs:6][E: codex-rs/core/src/tools/handlers/list_dir.rs:20] |

## 2 用途定位

`list_dir` 给模型一个目录浏览工具，返回 1-indexed listing 与简易类型标签。[E: codex-rs/tools/src/utility_tool.rs:32][E: codex-rs/tools/src/utility_tool.rs:33] 它不是 shell 命令的替代品，而是一个受限、可分页、可按 depth 遍历、会检查 read-deny policy 的文件系统读取 surface。[E: codex-rs/core/src/tools/handlers/list_dir.rs:102][E: codex-rs/core/src/tools/handlers/list_dir.rs:113][I]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `dir_path` | `string` | 是 | 无 | schema 描述为要列出的绝对目录路径。[E: codex-rs/tools/src/utility_tool.rs:9][E: codex-rs/tools/src/utility_tool.rs:10] | handler 要求 `PathBuf::from(dir_path).is_absolute()` 为 true。[E: codex-rs/core/src/tools/handlers/list_dir.rs:96][E: codex-rs/core/src/tools/handlers/list_dir.rs:97] |
| `offset` | `number` | 否 | `1` | schema 说明 entry number 从 1 开始。[E: codex-rs/tools/src/utility_tool.rs:13][E: codex-rs/tools/src/utility_tool.rs:15] | `ListDirArgs.offset` serde default 指向 `default_offset()`，该函数返回 1；offset 为 0 会报错。[E: codex-rs/core/src/tools/handlers/list_dir.rs:42][E: codex-rs/core/src/tools/handlers/list_dir.rs:28][E: codex-rs/core/src/tools/handlers/list_dir.rs:78] |
| `limit` | `number` | 否 | `25` | schema 说明最大返回条目数。[E: codex-rs/tools/src/utility_tool.rs:19][E: codex-rs/tools/src/utility_tool.rs:20] | `default_limit()` 返回 25；limit 为 0 会报错。[E: codex-rs/core/src/tools/handlers/list_dir.rs:44][E: codex-rs/core/src/tools/handlers/list_dir.rs:32][E: codex-rs/core/src/tools/handlers/list_dir.rs:84] |
| `depth` | `number` | 否 | `2` | schema 说明最大遍历目录深度，必须至少为 1。[E: codex-rs/tools/src/utility_tool.rs:23][E: codex-rs/tools/src/utility_tool.rs:25] | `default_depth()` 返回 2；depth 为 0 会报错。[E: codex-rs/core/src/tools/handlers/list_dir.rs:46][E: codex-rs/core/src/tools/handlers/list_dir.rs:36][E: codex-rs/core/src/tools/handlers/list_dir.rs:90] |

`create_list_dir_tool` 的 required 列表只包含 `dir_path`，`additionalProperties` 为 false。[E: codex-rs/tools/src/utility_tool.rs:37]

## 4 输出

`list_dir` 不声明 output schema。[E: codex-rs/tools/src/utility_tool.rs:38] handler 返回 text output，并把 `success` 设为 true。[E: codex-rs/core/src/tools/handlers/list_dir.rs:119] 第一行始终是 `Absolute path: ...`，随后追加格式化条目。[E: codex-rs/core/src/tools/handlers/list_dir.rs:117][E: codex-rs/core/src/tools/handlers/list_dir.rs:118]

条目会先整体排序，再按 `offset`/`limit` 截取。[E: codex-rs/core/src/tools/handlers/list_dir.rs:137][E: codex-rs/core/src/tools/handlers/list_dir.rs:139][E: codex-rs/core/src/tools/handlers/list_dir.rs:147][E: codex-rs/core/src/tools/handlers/list_dir.rs:149] 如果还有更多条目，输出追加 `More than {capped_limit} entries found`。[E: codex-rs/core/src/tools/handlers/list_dir.rs:156][E: codex-rs/core/src/tools/handlers/list_dir.rs:157] 格式化时目录后缀 `/`，symlink 后缀 `@`，other 后缀 `?`，普通文件无后缀。[E: codex-rs/core/src/tools/handlers/list_dir.rs:253][E: codex-rs/core/src/tools/handlers/list_dir.rs:254][E: codex-rs/core/src/tools/handlers/list_dir.rs:255][E: codex-rs/core/src/tools/handlers/list_dir.rs:256]

## 5 ToolSpec 类型

`list_dir` 是 `ToolSpec::Function(ResponsesApiTool)`，因为 constructor 声明 JSON object 参数，并把 `strict` 设为 false。[E: codex-rs/tools/src/utility_tool.rs:30][E: codex-rs/tools/src/utility_tool.rs:35][E: codex-rs/tools/src/utility_tool.rs:37] Function shape 让 router 可以把模型 JSON arguments 包装成 `ToolPayload::Function`，handler 再解析 arguments。[E: codex-rs/core/src/tools/router.rs:200][E: codex-rs/core/src/tools/handlers/list_dir.rs:69]

## 6 注册与门控

`list_dir` 只在 `config.has_environment` 为 true，并且 `config.experimental_supported_tools` 中存在字符串 `"list_dir"` 时注册。[E: codex-rs/tools/src/tool_registry_plan.rs:334][E: codex-rs/tools/src/tool_registry_plan.rs:338][E: codex-rs/tools/src/tool_registry_plan.rs:340][E: codex-rs/tools/src/tool_registry_plan.rs:345] `ToolsConfig::new` 从 `model_info.experimental_supported_tools` 拷贝该列表。[E: codex-rs/tools/src/tool_config.rs:232] 这个 gate 表示 `list_dir` 是 model metadata 控制的实验工具，而不是所有会话默认开启的核心工具。[I]

## 7 parallel-safe

`list_dir` 的 plan-level `supports_parallel_tool_calls` 是 true。[E: codex-rs/tools/src/tool_registry_plan.rs:340][E: codex-rs/tools/src/tool_registry_plan.rs:342] handler 没有覆盖 `is_mutating`，因此使用 `ToolHandler` trait 的默认 false。[E: codex-rs/core/src/tools/registry.rs:53][E: codex-rs/core/src/tools/registry.rs:57] `ToolRouter::configured_tool_supports_parallel` 对 function spec 且 parallel flag 为 true 时返回 true。[E: codex-rs/core/src/tools/router.rs:148][E: codex-rs/core/src/tools/router.rs:152]

## 8 handler 走读

1. handler 只接受 `ToolPayload::Function`，其他 payload 返回 unsupported payload。[E: codex-rs/core/src/tools/handlers/list_dir.rs:61][E: codex-rs/core/src/tools/handlers/list_dir.rs:64]
2. `parse_arguments` 把 JSON arguments 解析成 `ListDirArgs`。[E: codex-rs/core/src/tools/handlers/list_dir.rs:69]
3. handler 分别校验 `offset != 0`、`limit != 0`、`depth != 0`。[E: codex-rs/core/src/tools/handlers/list_dir.rs:78][E: codex-rs/core/src/tools/handlers/list_dir.rs:84][E: codex-rs/core/src/tools/handlers/list_dir.rs:90]
4. handler 要求 `dir_path` 是 absolute path。[E: codex-rs/core/src/tools/handlers/list_dir.rs:96][E: codex-rs/core/src/tools/handlers/list_dir.rs:99]
5. handler 从 turn sandbox policy 构造 `ReadDenyMatcher`，如果根路径被拒绝读取，直接返回 access denied。[E: codex-rs/core/src/tools/handlers/list_dir.rs:102][E: codex-rs/core/src/tools/handlers/list_dir.rs:107]
6. `list_dir_slice_with_policy` 调用 `collect_entries` 收集条目，然后排序、分页、格式化。[E: codex-rs/core/src/tools/handlers/list_dir.rs:123][E: codex-rs/core/src/tools/handlers/list_dir.rs:131][E: codex-rs/core/src/tools/handlers/list_dir.rs:137][E: codex-rs/core/src/tools/handlers/list_dir.rs:149][E: codex-rs/core/src/tools/handlers/list_dir.rs:153]
7. `collect_entries` 使用 queue 做 breadth-first traversal；遇到被 deny-read matcher 拒绝的子路径会跳过。[E: codex-rs/core/src/tools/handlers/list_dir.rs:171][E: codex-rs/core/src/tools/handlers/list_dir.rs:173][E: codex-rs/core/src/tools/handlers/list_dir.rs:184][E: codex-rs/core/src/tools/handlers/list_dir.rs:187]
8. 目录只有在 `remaining_depth > 1` 时继续入队，随后当前 entry 本身也会被加入输出候选。[E: codex-rs/core/src/tools/handlers/list_dir.rs:221][E: codex-rs/core/src/tools/handlers/list_dir.rs:222][E: codex-rs/core/src/tools/handlers/list_dir.rs:224]

## 9 设计动机·edge·历史

`list_dir` 要求 absolute path，而不是隐式用 cwd 拼接 relative path，这减少了模型和用户在多 cwd/嵌套 workspace 场景下对 listing 根目录的歧义。[E: codex-rs/tools/src/utility_tool.rs:10][E: codex-rs/core/src/tools/handlers/list_dir.rs:97][I]

输出名称最多保留 500 bytes 边界内的合法字符片段，避免异常长路径把工具输出撑爆。[E: codex-rs/core/src/tools/handlers/list_dir.rs:24][E: codex-rs/core/src/tools/handlers/list_dir.rs:240][E: codex-rs/core/src/tools/handlers/list_dir.rs:243] 内部 sort key 统一把反斜杠替换为 `/`，让跨平台路径名排序更稳定。[E: codex-rs/core/src/tools/handlers/list_dir.rs:231][E: codex-rs/core/src/tools/handlers/list_dir.rs:232][I]

## Sources

- `codex-rs/tools/src/utility_tool.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/registry.rs`
- `codex-rs/core/src/tools/handlers/list_dir.rs`
- `codex-rs/core/src/tools/router.rs`

## 相关

- [工具系统](../../subsystems/core/tool-system.md) — tool registry/handler 的通用机制。
- [工具路由](../../subsystems/core/tool-router.md) — function payload 构造与 parallel flag 判断。

---
id: subsys.core.memory
title: 长期 Memory
kind: subsystem
tier: T2
source: [codex-rs/memories/write/src/lib.rs, codex-rs/memories/write/src/start.rs, codex-rs/memories/write/src/phase1.rs, codex-rs/memories/write/src/phase2.rs, codex-rs/memories/write/src/storage.rs, codex-rs/memories/write/src/control.rs, codex-rs/memories/write/src/guard.rs, codex-rs/memories/read/src/lib.rs, codex-rs/memories/read/src/citations.rs, codex-rs/memories/read/src/usage.rs, codex-rs/ext/memories/src/lib.rs, codex-rs/ext/memories/src/extension.rs, codex-rs/ext/memories/src/prompts.rs, codex-rs/app-server/src/extensions.rs, codex-rs/app-server/src/request_processors/turn_processor.rs, codex-rs/core/src/session/session.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/session/mod.rs, codex-rs/config/src/types.rs, codex-rs/state/src/runtime/memories.rs]
symbols: [start_memories_startup_task, MemoriesExtension, build_memory_tool_developer_instructions, MemoriesConfig, claim_stage1_jobs_for_startup, output_schema, sync_rollout_summaries_from_memories, parse_memory_citation, memories_usage_kinds_from_command]
related: [spine.extension-system, subsys.core.instruction-assembly, subsys.core.session-lifecycle, subsys.core.turn-engine, subsys.core.unified-exec]
evidence: explicit
status: verified
updated: 5670360009
---

> 长期 Memory 现在拆成三层：`codex-rs/memories/write` 负责 startup extraction/consolidation 写路径，`codex-rs/memories/read` 负责 citation/usage/read helper，`codex-rs/ext/memories` 通过 extension API 把 `memory_summary.md` 注入 developer prompt 并可选暴露 dedicated memory tools。[E: codex-rs/memories/write/src/lib.rs:1][E: codex-rs/memories/write/src/lib.rs:23][E: codex-rs/memories/read/src/lib.rs:1][E: codex-rs/ext/memories/src/extension.rs:21][E: codex-rs/ext/memories/src/extension.rs:50][E: codex-rs/ext/memories/src/extension.rs:98]

## 能回答的问题

- Memory startup pipeline 现在在哪个 crate，何时从 app-server turn path 触发？
- `generate_memories`、`use_memories`、`dedicated_tools` 分别控制哪条路径？
- Phase 1 如何 claim rollouts、构造 strict JSON extraction prompt、过滤 rollout items？
- Phase 2 如何 claim global lock、同步 memory workspace、启动受限 consolidation agent？
- `memory_summary.md` 如何通过 extension prompt contributor 进入 developer policy？
- memory citations 和安全 read/search usage metric 分别在哪里解析？

## 职责边界

写路径由 `codex_memories_write` crate 拥有：它导出 startup task、Phase 1/Phase 2 prompt/storage helpers、memory root layout 和清理函数。[E: codex-rs/memories/write/src/lib.rs:1][E: codex-rs/memories/write/src/lib.rs:23][E: codex-rs/memories/write/src/lib.rs:27][E: codex-rs/memories/write/src/lib.rs:28][E: codex-rs/memories/write/src/lib.rs:116] 读/注入路径不在 `core/src/session/mod.rs` 硬编码 memory 分支里，而是 app-server 安装 `codex_memories_extension`，再由 extension prompt contributor 返回 `PromptFragment::developer_policy`。[E: codex-rs/app-server/src/extensions.rs:75][E: codex-rs/ext/memories/src/extension.rs:50][E: codex-rs/ext/memories/src/extension.rs:64][E: codex-rs/ext/memories/src/extension.rs:66]

## 关键 crate/文件

- `codex-rs/memories/write/src/lib.rs`: write crate 的模块总账、导出函数、artifact names、stage-one/stage-two 常量和 path layout。[E: codex-rs/memories/write/src/lib.rs:7][E: codex-rs/memories/write/src/lib.rs:23][E: codex-rs/memories/write/src/lib.rs:35][E: codex-rs/memories/write/src/lib.rs:78][E: codex-rs/memories/write/src/lib.rs:102][E: codex-rs/memories/write/src/lib.rs:116][E: codex-rs/memories/write/src/lib.rs:120][E: codex-rs/memories/write/src/lib.rs:124][E: codex-rs/memories/write/src/lib.rs:128]
- `codex-rs/memories/write/src/start.rs`: root-session startup gate、memory root creation、extension instruction seeding、prune、rate-limit guard、Phase 1、Phase 2 顺序。[E: codex-rs/memories/write/src/start.rs:18][E: codex-rs/memories/write/src/start.rs:30][E: codex-rs/memories/write/src/start.rs:51][E: codex-rs/memories/write/src/start.rs:52][E: codex-rs/memories/write/src/start.rs:57][E: codex-rs/memories/write/src/start.rs:63][E: codex-rs/memories/write/src/start.rs:65][E: codex-rs/memories/write/src/start.rs:75][E: codex-rs/memories/write/src/start.rs:77]
- `codex-rs/memories/write/src/phase1.rs`: startup job claim、strict output schema、parallel stage-one sampling、rollout filtering/redaction 和 DB success/no-output/failure marks。[E: codex-rs/memories/write/src/phase1.rs:136][E: codex-rs/memories/write/src/phase1.rs:149][E: codex-rs/memories/write/src/phase1.rs:164][E: codex-rs/memories/write/src/phase1.rs:219][E: codex-rs/memories/write/src/phase1.rs:290][E: codex-rs/memories/write/src/phase1.rs:311][E: codex-rs/memories/write/src/phase1.rs:318][E: codex-rs/memories/write/src/phase1.rs:438]
- `codex-rs/memories/write/src/phase2.rs`: global phase-two lock、memory workspace sync/diff、consolidation agent config、agent spawn/heartbeat/success handling。[E: codex-rs/memories/write/src/phase2.rs:57][E: codex-rs/memories/write/src/phase2.rs:115][E: codex-rs/memories/write/src/phase2.rs:128][E: codex-rs/memories/write/src/phase2.rs:171][E: codex-rs/memories/write/src/phase2.rs:301][E: codex-rs/memories/write/src/phase2.rs:338][E: codex-rs/memories/write/src/phase2.rs:360]
- `codex-rs/ext/memories/src/extension.rs`: read-path prompt contributor、thread/config storage of memory extension config、optional dedicated tools、extension installation。[E: codex-rs/ext/memories/src/extension.rs:34][E: codex-rs/ext/memories/src/extension.rs:41][E: codex-rs/ext/memories/src/extension.rs:50][E: codex-rs/ext/memories/src/extension.rs:73][E: codex-rs/ext/memories/src/extension.rs:86][E: codex-rs/ext/memories/src/extension.rs:98][E: codex-rs/ext/memories/src/extension.rs:119]
- `codex-rs/memories/read/src/citations.rs` 与 `usage.rs`: citation block parsing、rollout/thread id extraction、safe command memory-artifact usage classification。[E: codex-rs/memories/read/src/citations.rs:6][E: codex-rs/memories/read/src/citations.rs:45][E: codex-rs/memories/read/src/usage.rs:29][E: codex-rs/memories/read/src/usage.rs:33][E: codex-rs/memories/read/src/usage.rs:40]

## 数据模型

`MemoriesToml` 暴露 `disable_on_external_context`、`generate_memories`、`use_memories`、`dedicated_tools`、retention/selection limits、rate-limit threshold 和 extraction/consolidation model overrides；`MemoriesConfig::default` 默认生成和使用 memories，但 dedicated tools 默认关闭。[E: codex-rs/config/src/types.rs:282][E: codex-rs/config/src/types.rs:283][E: codex-rs/config/src/types.rs:286][E: codex-rs/config/src/types.rs:288][E: codex-rs/config/src/types.rs:290][E: codex-rs/config/src/types.rs:292][E: codex-rs/config/src/types.rs:304][E: codex-rs/config/src/types.rs:307][E: codex-rs/config/src/types.rs:309][E: codex-rs/config/src/types.rs:330][E: codex-rs/config/src/types.rs:334][E: codex-rs/config/src/types.rs:335][E: codex-rs/config/src/types.rs:336]

`generate_memories` 决定 thread persistence metadata 的 initial `memory_mode`: 新建和 resume 时为 true 则 `Enabled`，否则 `Disabled`；state DB 的 startup claim 再过滤掉 `threads.memory_mode != 'enabled'` 的线程。[E: codex-rs/core/src/session/session.rs:546][E: codex-rs/core/src/session/session.rs:549][E: codex-rs/core/src/session/session.rs:550][E: codex-rs/core/src/session/session.rs:552][E: codex-rs/core/src/session/session.rs:564][E: codex-rs/core/src/session/session.rs:567][E: codex-rs/state/src/runtime/memories.rs:133][E: codex-rs/state/src/runtime/memories.rs:138][E: codex-rs/state/src/runtime/memories.rs:215]

Memory artifact layout comes from write crate path helpers: `memory_root(codex_home)` is `codex_home/memories`，`rollout_summaries_dir(root)` 是 `root/rollout_summaries`，`memory_extensions_root(root)` 是 `root/extensions`，`raw_memories_file(root)` 是 `root/raw_memories.md`。[E: codex-rs/memories/write/src/lib.rs:116][E: codex-rs/memories/write/src/lib.rs:120][E: codex-rs/memories/write/src/lib.rs:124][E: codex-rs/memories/write/src/lib.rs:128]

## Startup/write path

1. App-server turn path 在成功提交有 input 的 turn 后调用 `codex_memories_write::start_memories_startup_task`，把 thread manager、auth manager、thread id、thread、当前 config 和 session source 传入。[E: codex-rs/app-server/src/request_processors/turn_processor.rs:472][E: codex-rs/app-server/src/request_processors/turn_processor.rs:474][E: codex-rs/app-server/src/request_processors/turn_processor.rs:475][E: codex-rs/app-server/src/request_processors/turn_processor.rs:479][E: codex-rs/app-server/src/request_processors/turn_processor.rs:480]
2. Startup gate 跳过 ephemeral session、未开启 `Feature::MemoryTool` 的 session、以及 non-root agent；缺少 state DB 时直接跳过。[E: codex-rs/memories/write/src/start.rs:30][E: codex-rs/memories/write/src/start.rs:31][E: codex-rs/memories/write/src/start.rs:32][E: codex-rs/memories/write/src/start.rs:46][E: codex-rs/memories/write/src/start.rs:47]
3. Background task 创建 memory root，seed extension instructions，prune stale stage-one outputs，检查 Codex rate limits，之后依次运行 Phase 1 和 Phase 2。[E: codex-rs/memories/write/src/start.rs:51][E: codex-rs/memories/write/src/start.rs:52][E: codex-rs/memories/write/src/start.rs:57][E: codex-rs/memories/write/src/start.rs:63][E: codex-rs/memories/write/src/start.rs:65][E: codex-rs/memories/write/src/start.rs:75][E: codex-rs/memories/write/src/start.rs:77]
4. Rate-limit guard 只在 backend auth 下查询 rate limits；如果 primary/secondary window used percent 超过 `100 - min_rate_limit_remaining_percent` 或 snapshot 标记 reached，则跳过 startup。[E: codex-rs/memories/write/src/guard.rs:15][E: codex-rs/memories/write/src/guard.rs:17][E: codex-rs/memories/write/src/guard.rs:25][E: codex-rs/memories/write/src/guard.rs:31][E: codex-rs/memories/write/src/guard.rs:36][E: codex-rs/memories/write/src/guard.rs:49][E: codex-rs/memories/write/src/guard.rs:54]

## Phase 1

Phase 1 claim 从 state DB 的 active/allowed-source threads 中选择 jobs，排除当前 thread、超过 age/idle window 的 thread 和 `memory_mode != 'enabled'` 的 thread，并受 scan limit、max claimed、lease seconds 控制。[E: codex-rs/state/src/runtime/memories.rs:133][E: codex-rs/state/src/runtime/memories.rs:136][E: codex-rs/state/src/runtime/memories.rs:138][E: codex-rs/state/src/runtime/memories.rs:139][E: codex-rs/state/src/runtime/memories.rs:140][E: codex-rs/memories/write/src/phase1.rs:164][E: codex-rs/memories/write/src/phase1.rs:169][E: codex-rs/memories/write/src/phase1.rs:170][E: codex-rs/memories/write/src/phase1.rs:174]

Stage-one output schema 是 strict JSON object，必须包含 `rollout_summary`、`rollout_slug` 和 `raw_memory`，并禁止 additional properties；并行采样使用 `buffer_unordered(stage_one::CONCURRENCY_LIMIT)`，该常量是 8。[E: codex-rs/memories/write/src/phase1.rs:136][E: codex-rs/memories/write/src/phase1.rs:140][E: codex-rs/memories/write/src/phase1.rs:142][E: codex-rs/memories/write/src/phase1.rs:144][E: codex-rs/memories/write/src/phase1.rs:145][E: codex-rs/memories/write/src/phase1.rs:219][E: codex-rs/memories/write/src/lib.rs:81]

Phase 1 job 加载 rollout items、过滤/序列化成 stage-one input，把 `stage_one::PROMPT` 作为 base instructions，设置 output schema strict；返回后 redacts raw memory、rollout summary 和 slug，空 raw/summary 走 no-output，否则写 success。[E: codex-rs/memories/write/src/phase1.rs:290][E: codex-rs/memories/write/src/phase1.rs:291][E: codex-rs/memories/write/src/phase1.rs:293][E: codex-rs/memories/write/src/phase1.rs:308][E: codex-rs/memories/write/src/phase1.rs:311][E: codex-rs/memories/write/src/phase1.rs:318][E: codex-rs/memories/write/src/phase1.rs:319][E: codex-rs/memories/write/src/phase1.rs:259][E: codex-rs/memories/write/src/phase1.rs:268]

Phase 1 过滤 rollout item 时丢弃 developer messages；非 user messages 保留；user messages 会移除 AGENTS.md instructions 和 `<skill>` 这两类 memory-excluded contextual user fragment，其他 user content 可以保留。[E: codex-rs/memories/write/src/phase1.rs:438][E: codex-rs/memories/write/src/phase1.rs:442][E: codex-rs/memories/write/src/phase1.rs:446][E: codex-rs/memories/write/src/phase1.rs:448][E: codex-rs/memories/write/src/phase1.rs:469][E: codex-rs/memories/write/src/phase1.rs:470]

## Phase 2

Phase 2 先 claim global phase2 job，再确保 memory workspace git baseline，构建 locked-down consolidation agent config，读取 selected raw memories，计算 watermark，同步 `rollout_summaries/` 和 `raw_memories.md`，再用 workspace diff 判断是否需要 agent。[E: codex-rs/memories/write/src/phase2.rs:57][E: codex-rs/memories/write/src/phase2.rs:66][E: codex-rs/memories/write/src/phase2.rs:79][E: codex-rs/memories/write/src/phase2.rs:93][E: codex-rs/memories/write/src/phase2.rs:115][E: codex-rs/memories/write/src/phase2.rs:128]

Workspace sync 使用 DB-backed Stage1 outputs 写 rollout summaries 和 raw memories，并 prune old extension resources；如果 sync 后没有 workspace changes，Phase 2 会标记 `succeeded_no_workspace_changes` 后返回。[E: codex-rs/memories/write/src/phase2.rs:203][E: codex-rs/memories/write/src/phase2.rs:208][E: codex-rs/memories/write/src/phase2.rs:209][E: codex-rs/memories/write/src/phase2.rs:210][E: codex-rs/memories/write/src/phase2.rs:143][E: codex-rs/memories/write/src/phase2.rs:146][E: codex-rs/memories/write/src/phase2.rs:152]

Consolidation agent config 把 cwd 设为 memory root，标记 ephemeral，关闭 generate/use memories、apps、MCP servers 和多种 delegation/tool features，approval policy 固定为 Never，sandbox 只允许 memory root write 且无 network。[E: codex-rs/memories/write/src/phase2.rs:301][E: codex-rs/memories/write/src/phase2.rs:305][E: codex-rs/memories/write/src/phase2.rs:307][E: codex-rs/memories/write/src/phase2.rs:308][E: codex-rs/memories/write/src/phase2.rs:309][E: codex-rs/memories/write/src/phase2.rs:313][E: codex-rs/memories/write/src/phase2.rs:315][E: codex-rs/memories/write/src/phase2.rs:317][E: codex-rs/memories/write/src/phase2.rs:327][E: codex-rs/memories/write/src/phase2.rs:329]

Agent model 来自 `config.memories.consolidation_model` 或 provider 的 preferred consolidation model，reasoning effort 是 stage-two Medium；agent 完成后确认仍持有 lock，reset workspace baseline，再标记 global phase2 job succeeded，否则标记 `failed_agent` 并异步 shutdown agent。[E: codex-rs/memories/write/src/phase2.rs:338][E: codex-rs/memories/write/src/phase2.rs:343][E: codex-rs/memories/write/src/phase2.rs:345][E: codex-rs/memories/write/src/phase2.rs:381][E: codex-rs/memories/write/src/phase2.rs:390][E: codex-rs/memories/write/src/phase2.rs:416][E: codex-rs/memories/write/src/phase2.rs:419][E: codex-rs/memories/write/src/phase2.rs:435][E: codex-rs/memories/write/src/phase2.rs:439]

## Read path 与 tools

App-server 的 `thread_extensions` 安装 `codex_memories_extension`；extension 在 thread start/config changed 时把 `MemoriesExtensionConfig` 存入 thread store，config 的 `enabled` 条件是 `Feature::MemoryTool && config.memories.use_memories`，`dedicated_tools` 独立跟随 config。[E: codex-rs/app-server/src/extensions.rs:44][E: codex-rs/app-server/src/extensions.rs:75][E: codex-rs/ext/memories/src/extension.rs:41][E: codex-rs/ext/memories/src/extension.rs:43][E: codex-rs/ext/memories/src/extension.rs:44][E: codex-rs/ext/memories/src/extension.rs:73][E: codex-rs/ext/memories/src/extension.rs:86]

Prompt contributor 只在 extension config enabled 时读取 `codex_home/memories/memory_summary.md`；文件内容 trim 后按 `MEMORY_TOOL_DEVELOPER_INSTRUCTIONS_SUMMARY_TOKEN_LIMIT` 截断，非空才渲染 embedded template，并作为 `PromptFragment::developer_policy` 返回。[E: codex-rs/ext/memories/src/extension.rs:57][E: codex-rs/ext/memories/src/extension.rs:60][E: codex-rs/ext/memories/src/extension.rs:64][E: codex-rs/ext/memories/src/extension.rs:66][E: codex-rs/ext/memories/src/prompts.rs:27][E: codex-rs/ext/memories/src/prompts.rs:30][E: codex-rs/ext/memories/src/prompts.rs:32][E: codex-rs/ext/memories/src/prompts.rs:37][E: codex-rs/ext/memories/src/prompts.rs:41][E: codex-rs/ext/memories/src/lib.rs:16]

Dedicated memory tools 只在 extension config enabled 且 `dedicated_tools` 为 true 时暴露，namespace 是 `memories`，工具名包括 `add_ad_hoc_note`、`list`、`read`、`search`。[E: codex-rs/ext/memories/src/extension.rs:98][E: codex-rs/ext/memories/src/extension.rs:104][E: codex-rs/ext/memories/src/extension.rs:107][E: codex-rs/ext/memories/src/extension.rs:111][E: codex-rs/ext/memories/src/lib.rs:18][E: codex-rs/ext/memories/src/lib.rs:19][E: codex-rs/ext/memories/src/lib.rs:20][E: codex-rs/ext/memories/src/lib.rs:21][E: codex-rs/ext/memories/src/lib.rs:22]

Memory citation parsing 接收多个 citation strings，提取 `<citation_entries>` 和 `<rollout_ids>`；legacy `<thread_ids>` 也作为 ids block fallback。session 侧 `record_memory_citation_for_turn` 只把 turn state 的 `has_memory_citation` 标记为 true。[E: codex-rs/memories/read/src/citations.rs:6][E: codex-rs/memories/read/src/citations.rs:12][E: codex-rs/memories/read/src/citations.rs:22][E: codex-rs/memories/read/src/citations.rs:38][E: codex-rs/memories/read/src/citations.rs:78][E: codex-rs/core/src/session/mod.rs:3506][E: codex-rs/core/src/session/mod.rs:3514]

Memory usage metric classifier 只解析 known-safe shell commands；read/search 命令命中 `memories/MEMORY.md`、`memory_summary.md`、`raw_memories.md`、`rollout_summaries/` 或 `skills/` 才返回 usage kind，`ListFiles` 不产生 kind。[E: codex-rs/memories/read/src/usage.rs:29][E: codex-rs/memories/read/src/usage.rs:33][E: codex-rs/memories/read/src/usage.rs:35][E: codex-rs/memories/read/src/usage.rs:40][E: codex-rs/memories/read/src/usage.rs:43][E: codex-rs/memories/read/src/usage.rs:45][E: codex-rs/memories/read/src/usage.rs:51][E: codex-rs/memories/read/src/usage.rs:53][E: codex-rs/memories/read/src/usage.rs:55][E: codex-rs/memories/read/src/usage.rs:57][E: codex-rs/memories/read/src/usage.rs:59]

## Thread memory mode 与清理

`set_thread_memory_mode` 只持久化 active session 的 thread-level memory mode metadata；注释说明它不涉及模型，只影响 future memory generation eligibility。[E: codex-rs/core/src/session/handlers.rs:551][E: codex-rs/core/src/session/handlers.rs:555][E: codex-rs/core/src/session/handlers.rs:559][E: codex-rs/core/src/session/handlers.rs:569][E: codex-rs/core/src/session/handlers.rs:567]

外部上下文可以把 thread memory mode 标成 `polluted`：state DB update 把 threads row 的 `memory_mode` 改为 `polluted`，并保留 selected-for-phase2 查询用于后续队列行为。[E: codex-rs/state/src/runtime/memories.rs:584][E: codex-rs/state/src/runtime/memories.rs:590][E: codex-rs/state/src/runtime/memories.rs:601][E: codex-rs/state/src/runtime/memories.rs:604][E: codex-rs/state/src/runtime/memories.rs:605]

`clear_memory_roots_contents` 会清空 `codex_home/memories` 和 legacy `codex_home/memories_extensions` 两个 root；底层清理会拒绝 symlinked memory root，保留 root 目录但删除其内容。[E: codex-rs/memories/write/src/control.rs:3][E: codex-rs/memories/write/src/control.rs:5][E: codex-rs/memories/write/src/control.rs:6][E: codex-rs/memories/write/src/control.rs:14][E: codex-rs/memories/write/src/control.rs:16][E: codex-rs/memories/write/src/control.rs:30][E: codex-rs/memories/write/src/control.rs:32][E: codex-rs/memories/write/src/control.rs:36][E: codex-rs/memories/write/src/control.rs:39]

## 设计动机与权衡

Memory 生成被放在 turn 提交后的 background startup task，而不是同步塞进当前 turn sampling；Phase 1/Phase 2 还受 state DB、rate-limit guard、lease 和 global lock 约束，这把慢速 extraction/consolidation 从当前交互延迟中隔离出来。[E: codex-rs/app-server/src/request_processors/turn_processor.rs:472][E: codex-rs/memories/write/src/start.rs:51][E: codex-rs/memories/write/src/start.rs:65][E: codex-rs/memories/write/src/phase1.rs:166][E: codex-rs/memories/write/src/phase2.rs:221][I]

`use_memories` 与 `dedicated_tools` 的拆分让 Codex 可以只注入 memory summary 而不暴露 dedicated tools，或在配置允许时额外暴露 tools；生成侧 `generate_memories` 又独立控制 future extraction eligibility。[E: codex-rs/config/src/types.rs:286][E: codex-rs/config/src/types.rs:288][E: codex-rs/config/src/types.rs:290][E: codex-rs/ext/memories/src/extension.rs:43][E: codex-rs/ext/memories/src/extension.rs:107][I]

## gotcha

- 当前 Memory 的 write/read/extension 三层分别位于 `codex-rs/memories/write`、`codex-rs/memories/read`、`codex-rs/ext/memories`。[E: codex-rs/memories/write/src/lib.rs:1][E: codex-rs/memories/read/src/lib.rs:1][E: codex-rs/ext/memories/src/extension.rs:21]
- `memory_extensions_root(root)` 当前是 `root/extensions`；但 clear path 仍额外清理 legacy `codex_home/memories_extensions` root。[E: codex-rs/memories/write/src/lib.rs:124][E: codex-rs/memories/write/src/control.rs:5][E: codex-rs/memories/write/src/control.rs:6]
- Prompt injection 读取的是 `memory_summary.md`，不是 `raw_memories.md` 或 rollout summaries；raw/summary files 属于 Phase 2 consolidation workspace input/output。[E: codex-rs/ext/memories/src/prompts.rs:31][E: codex-rs/memories/write/src/storage.rs:44][E: codex-rs/memories/write/src/storage.rs:110]
- Phase 1 不会把 developer messages 写入 stage-one prompt input；AGENTS.md 和 `<skill>` user fragments 也会从 user messages 中过滤掉。[E: codex-rs/memories/write/src/phase1.rs:438][E: codex-rs/memories/write/src/phase1.rs:469][E: codex-rs/memories/write/src/phase1.rs:470]

## Sources

- `codex-rs/memories/write/src/lib.rs`
- `codex-rs/memories/write/src/start.rs`
- `codex-rs/memories/write/src/phase1.rs`
- `codex-rs/memories/write/src/phase2.rs`
- `codex-rs/memories/write/src/storage.rs`
- `codex-rs/memories/write/src/control.rs`
- `codex-rs/memories/write/src/guard.rs`
- `codex-rs/memories/read/src/lib.rs`
- `codex-rs/memories/read/src/citations.rs`
- `codex-rs/memories/read/src/usage.rs`
- `codex-rs/ext/memories/src/lib.rs`
- `codex-rs/ext/memories/src/extension.rs`
- `codex-rs/ext/memories/src/prompts.rs`
- `codex-rs/app-server/src/extensions.rs`
- `codex-rs/app-server/src/request_processors/turn_processor.rs`
- `codex-rs/core/src/session/session.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/state/src/runtime/memories.rs`

## 相关

- [指令/prompt 装配](instruction-assembly.md) — memory prompt contributor 如何通过 extension slot 进入 developer policy。
- [Session 生命周期](session-lifecycle.md) — startup task 从 app-server/turn path 异步触发。
- [Turn 引擎](turn-engine.md) — memory prompt 注入后如何进入 model input。
- [Unified Exec](unified-exec.md) — safe read/search 访问 memory artifacts 时的 usage classification。
- [Ext 扩展插件系统](../../spine/extension-system.md) — memories extension 如何通过 contributor slots 暴露工具与 prompt fragment。

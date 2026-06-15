---
id: subsys.core.memory
title: 长期 Memory
kind: subsystem
tier: T2
source: [codex-rs/core/src/memories/mod.rs, codex-rs/core/src/memories/start.rs, codex-rs/core/src/memories/phase1.rs, codex-rs/core/src/memories/phase2.rs, codex-rs/core/src/memories/prompts.rs, codex-rs/core/src/memories/storage.rs, codex-rs/core/src/memories/usage.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/handlers.rs, codex-rs/config/src/types.rs, codex-rs/core/src/rollout.rs]
symbols: [start_memories_startup_task, phase1::run, StageOneOutput, phase2::run, build_stage_one_input_message, build_memory_tool_developer_instructions, rebuild_raw_memories_file_from_memories, sync_rollout_summaries_from_memories, emit_metric_for_tool_read, MemoriesConfig]
related: [subsys.core.instruction-assembly, subsys.core.session-lifecycle, subsys.core.turn-engine, subsys.core.unified-exec]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> 长期 Memory 是 Codex 的 startup extraction/consolidation 子系统：Phase 1 选择 rollouts 并抽取 stage-1 raw memories，Phase 2 claim global consolidation lock 并 dispatch consolidation agent；read path 后续可以把 `memory_summary.md` 渲染为 developer instructions。[E: codex-rs/core/src/memories/start.rs:32][E: codex-rs/core/src/memories/start.rs:38][E: codex-rs/core/src/memories/start.rs:40][E: codex-rs/core/src/memories/start.rs:42][E: codex-rs/core/src/memories/phase1.rs:196][E: codex-rs/core/src/memories/phase1.rs:319][E: codex-rs/core/src/memories/phase1.rs:385][E: codex-rs/core/src/memories/phase1.rs:449][E: codex-rs/core/src/memories/phase2.rs:220][E: codex-rs/core/src/memories/phase2.rs:144][E: codex-rs/core/src/session/mod.rs:2434][E: codex-rs/core/src/session/mod.rs:2435][E: codex-rs/core/src/session/mod.rs:2437][E: codex-rs/core/src/session/mod.rs:2439][E: codex-rs/core/src/memories/prompts.rs:284][E: codex-rs/core/src/memories/prompts.rs:288]

## 能回答的问题

- Memory startup pipeline 的 phase 1 和 phase 2 分别做什么？
- 哪些 session 会跳过 memory startup？
- `generate_memories` 和 `use_memories` 分别影响哪条路径？
- phase 1 的 model、schema、并发上限、rollout 截断策略是什么？
- phase 2 consolidation agent 的 sandbox、approval、feature flag 为什么被收紧？
- Memory artifacts 在 `codex_home/memories` 下如何布局和注入？
- shell / exec 读取 memory 文件时如何打 usage metric？

## 职责边界

`memories` 模块的公开启动入口是 `start_memories_startup_task`；该入口只为符合条件的 root session 异步启动 prune、phase1、phase2，memory 生成不在 turn sampling path 中同步执行。[E: codex-rs/core/src/memories/mod.rs:25][E: codex-rs/core/src/memories/start.rs:14][E: codex-rs/core/src/memories/start.rs:19][E: codex-rs/core/src/memories/start.rs:21][E: codex-rs/core/src/memories/start.rs:32][E: codex-rs/core/src/memories/start.rs:38][E: codex-rs/core/src/memories/start.rs:40][E: codex-rs/core/src/memories/start.rs:42][I] Prompt 注入是另一条 read path：`Session::build_initial_context` 在 `Feature::MemoryTool` 和 `config.memories.use_memories` 均开启时读取 `memory_summary.md` 并加入 developer sections。[E: codex-rs/core/src/session/mod.rs:2434][E: codex-rs/core/src/session/mod.rs:2435][E: codex-rs/core/src/session/mod.rs:2437][E: codex-rs/core/src/session/mod.rs:2439]

## 关键 crate/文件

- `codex-rs/core/src/memories/mod.rs`: 模块总账、artifacts 文件名、phase1/phase2 默认模型、并发、lease、metric 名称和 `memory_root`。[E: codex-rs/core/src/memories/mod.rs:28][E: codex-rs/core/src/memories/mod.rs:29][E: codex-rs/core/src/memories/mod.rs:30][E: codex-rs/core/src/memories/mod.rs:38][E: codex-rs/core/src/memories/mod.rs:44][E: codex-rs/core/src/memories/mod.rs:58][E: codex-rs/core/src/memories/mod.rs:70][E: codex-rs/core/src/memories/mod.rs:74][E: codex-rs/core/src/memories/mod.rs:84][E: codex-rs/core/src/memories/mod.rs:92][E: codex-rs/core/src/memories/mod.rs:106]
- `codex-rs/core/src/memories/start.rs`: startup eligibility gate 和异步 pipeline 顺序。[E: codex-rs/core/src/memories/start.rs:19][E: codex-rs/core/src/memories/start.rs:21][E: codex-rs/core/src/memories/start.rs:32][E: codex-rs/core/src/memories/start.rs:38][E: codex-rs/core/src/memories/start.rs:40][E: codex-rs/core/src/memories/start.rs:42]
- `codex-rs/core/src/memories/phase1.rs`: 从 state DB claim rollout jobs，序列化和脱敏 rollout response items，用 stage-one model 输出 strict JSON。[E: codex-rs/core/src/memories/phase1.rs:196][E: codex-rs/core/src/memories/phase1.rs:319][E: codex-rs/core/src/memories/phase1.rs:320][E: codex-rs/core/src/memories/phase1.rs:340][E: codex-rs/core/src/memories/phase1.rs:344][E: codex-rs/core/src/memories/phase1.rs:385][E: codex-rs/core/src/memories/phase1.rs:484]
- `codex-rs/core/src/memories/phase2.rs`: global consolidation lock、artifact sync、memory consolidation subagent、heartbeat 和 success/failure 标记。[E: codex-rs/core/src/memories/phase2.rs:220][E: codex-rs/core/src/memories/phase2.rs:104][E: codex-rs/core/src/memories/phase2.rs:113][E: codex-rs/core/src/memories/phase2.rs:144][E: codex-rs/core/src/memories/phase2.rs:288][E: codex-rs/core/src/memories/phase2.rs:421][E: codex-rs/core/src/memories/phase2.rs:467]
- `codex-rs/core/src/memories/prompts.rs`: stage-one input message 的 token budget，和 `memory_summary.md` 到 developer instructions 的 read path。[E: codex-rs/core/src/memories/prompts.rs:241][E: codex-rs/core/src/memories/prompts.rs:265]
- `codex-rs/core/src/memories/storage.rs`: `rollout_summaries/`、`raw_memories.md`、`MEMORY.md`、`memory_summary.md` 和 `skills/` 的同步/清理逻辑。[E: codex-rs/core/src/memories/storage.rs:23][E: codex-rs/core/src/memories/storage.rs:28][E: codex-rs/core/src/memories/storage.rs:35][E: codex-rs/core/src/memories/storage.rs:38][E: codex-rs/core/src/memories/storage.rs:41][E: codex-rs/core/src/memories/storage.rs:42][E: codex-rs/core/src/memories/storage.rs:51][E: codex-rs/core/src/memories/storage.rs:67][E: codex-rs/core/src/memories/storage.rs:72][E: codex-rs/core/src/memories/storage.rs:95]
- `codex-rs/core/src/memories/usage.rs`: 对安全 read/search 命令访问 memory artifacts 打 `codex.memories.usage` metric；`ListFiles` 不产生 memory kind。[E: codex-rs/core/src/memories/usage.rs:11][E: codex-rs/core/src/memories/usage.rs:43][E: codex-rs/core/src/memories/usage.rs:47][E: codex-rs/core/src/memories/usage.rs:49][E: codex-rs/core/src/memories/usage.rs:61][E: codex-rs/core/src/memories/usage.rs:69][E: codex-rs/core/src/memories/usage.rs:70][E: codex-rs/core/src/memories/usage.rs:71][E: codex-rs/core/src/memories/usage.rs:134][E: codex-rs/core/src/memories/usage.rs:136][E: codex-rs/core/src/memories/usage.rs:138][E: codex-rs/core/src/memories/usage.rs:140][E: codex-rs/core/src/memories/usage.rs:142]

## 数据模型

`MemoriesToml` 包含 `disable_on_external_context`、`generate_memories`、`use_memories`、retention/selection limits、idle/age thresholds、`extract_model` 和 `consolidation_model`；`MemoriesConfig::default` 默认 `generate_memories = true` 且 `use_memories = true`。[E: codex-rs/config/src/types.rs:185][E: codex-rs/config/src/types.rs:188][E: codex-rs/config/src/types.rs:190][E: codex-rs/config/src/types.rs:192][E: codex-rs/config/src/types.rs:195][E: codex-rs/config/src/types.rs:197][E: codex-rs/config/src/types.rs:199][E: codex-rs/config/src/types.rs:202][E: codex-rs/config/src/types.rs:204][E: codex-rs/config/src/types.rs:206][E: codex-rs/config/src/types.rs:208][E: codex-rs/config/src/types.rs:230][E: codex-rs/config/src/types.rs:231]

`rollout.rs` 把 `generate_memories()` 映射到 `self.memories.generate_memories`；prompt 注入侧另由 `use_memories` 控制。[E: codex-rs/core/src/rollout.rs:44][E: codex-rs/core/src/rollout.rs:45][E: codex-rs/core/src/session/mod.rs:2435][I]

Phase 1 的 `StageOneOutput` 是 strict JSON 输出载体，字段包括 `raw_memory`、`rollout_summary` 和可空 `rollout_slug`；schema 要求三者都存在且 `additionalProperties` 为 false。[E: codex-rs/core/src/memories/phase1.rs:69][E: codex-rs/core/src/memories/phase1.rs:72][E: codex-rs/core/src/memories/phase1.rs:75][E: codex-rs/core/src/memories/phase1.rs:78][E: codex-rs/core/src/memories/phase1.rs:155][E: codex-rs/core/src/memories/phase1.rs:158][E: codex-rs/core/src/memories/phase1.rs:159][E: codex-rs/core/src/memories/phase1.rs:344]

Memory artifact 根目录是 `codex_home.join("memories")`；`rollout_summaries_dir` 是 root 下的 `rollout_summaries`，`raw_memories_file` 是 root 下的 `raw_memories.md`，memory extensions root 是 root 的 sibling `memories_extensions`。[E: codex-rs/core/src/memories/mod.rs:105][E: codex-rs/core/src/memories/mod.rs:106][E: codex-rs/core/src/memories/mod.rs:110][E: codex-rs/core/src/memories/mod.rs:114][E: codex-rs/core/src/memories/mod.rs:118]

## 控制流

1. `start_memories_startup_task` 首先跳过 ephemeral session、未启用 `Feature::MemoryTool` 的 session、以及 `SessionSource::SubAgent` session。[E: codex-rs/core/src/memories/start.rs:19][E: codex-rs/core/src/memories/start.rs:20][E: codex-rs/core/src/memories/start.rs:21]
2. 如果 `state_db` 缺失，startup pipeline 直接 warn 并 return；有 state DB 时 spawn background task，按 prune phase1 -> phase1 run -> phase2 run 的顺序执行。[E: codex-rs/core/src/memories/start.rs:26][E: codex-rs/core/src/memories/start.rs:27][E: codex-rs/core/src/memories/start.rs:28][E: codex-rs/core/src/memories/start.rs:32][E: codex-rs/core/src/memories/start.rs:38][E: codex-rs/core/src/memories/start.rs:40][E: codex-rs/core/src/memories/start.rs:42]
3. Phase 1 `run` 先 claim startup jobs；没有 claim 或 claim 为空会分别 return 或打 `skipped_no_candidates` metric。[E: codex-rs/core/src/memories/phase1.rs:94][E: codex-rs/core/src/memories/phase1.rs:95][E: codex-rs/core/src/memories/phase1.rs:97][E: codex-rs/core/src/memories/phase1.rs:101][E: codex-rs/core/src/memories/phase1.rs:103]
4. `claim_startup_jobs` 对 state DB 调 `claim_stage1_jobs_for_startup`，参数包括 scan limit、max claimed、max age、minimum idle hours、allowed interactive sources 和 lease seconds。[E: codex-rs/core/src/memories/phase1.rs:196][E: codex-rs/core/src/memories/phase1.rs:199][E: codex-rs/core/src/memories/phase1.rs:200][E: codex-rs/core/src/memories/phase1.rs:201][E: codex-rs/core/src/memories/phase1.rs:202][E: codex-rs/core/src/memories/phase1.rs:203][E: codex-rs/core/src/memories/phase1.rs:204]
5. Phase 1 request context 默认使用 `config.memories.extract_model`，缺省回退到 `phase_one::MODEL`；该默认值是 `gpt-5.4-mini`，reasoning effort 是 Low。[E: codex-rs/core/src/memories/phase1.rs:225][E: codex-rs/core/src/memories/phase1.rs:227][E: codex-rs/core/src/memories/mod.rs:38][E: codex-rs/core/src/memories/mod.rs:40]
6. `run_jobs` 使用 `buffer_unordered(phase_one::CONCURRENCY_LIMIT)` 并行处理 claim；该并发上限常量是 8。[E: codex-rs/core/src/memories/phase1.rs:246][E: codex-rs/core/src/memories/phase1.rs:252][E: codex-rs/core/src/memories/mod.rs:44]
7. Phase 1 job 加载 rollout items、过滤并序列化 response items、构造无 tools 且 `parallel_tool_calls = false` 的 prompt，用 stage-one system prompt 作为 base instructions，并设置 strict output schema。[E: codex-rs/core/src/memories/phase1.rs:319][E: codex-rs/core/src/memories/phase1.rs:320][E: codex-rs/core/src/memories/phase1.rs:337][E: codex-rs/core/src/memories/phase1.rs:338][E: codex-rs/core/src/memories/phase1.rs:340][E: codex-rs/core/src/memories/phase1.rs:343][E: codex-rs/core/src/memories/phase1.rs:344]
8. Phase 1 job 对输出 JSON 反序列化后对 `raw_memory`、`rollout_summary` 和 `rollout_slug` 脱敏；任一 raw/summary 为空时走 no-output 标记，否则 success 写回 state DB。[E: codex-rs/core/src/memories/phase1.rs:385][E: codex-rs/core/src/memories/phase1.rs:386][E: codex-rs/core/src/memories/phase1.rs:387][E: codex-rs/core/src/memories/phase1.rs:388][E: codex-rs/core/src/memories/phase1.rs:290][E: codex-rs/core/src/memories/phase1.rs:292][E: codex-rs/core/src/memories/phase1.rs:424][E: codex-rs/core/src/memories/phase1.rs:425][E: codex-rs/core/src/memories/phase1.rs:448][E: codex-rs/core/src/memories/phase1.rs:449][E: codex-rs/core/src/memories/phase1.rs:453][E: codex-rs/core/src/memories/phase1.rs:454][E: codex-rs/core/src/memories/phase1.rs:455]
9. Phase 1 序列化 rollout 时丢弃 developer messages，保留非 user message，user message 则过滤掉 memory-excluded contextual user fragments；最终 serialized JSON 再整体 redaction。[E: codex-rs/core/src/memories/phase1.rs:499][E: codex-rs/core/src/memories/phase1.rs:503][E: codex-rs/core/src/memories/phase1.rs:509][E: codex-rs/core/src/memories/phase1.rs:484]
10. Phase 2 `run` claim global phase2 job，构建 consolidation agent config，查询 selected memories，计算 watermark，然后同步 `rollout_summaries/` 和 `raw_memories.md`。[E: codex-rs/core/src/memories/phase2.rs:64][E: codex-rs/core/src/memories/phase2.rs:77][E: codex-rs/core/src/memories/phase2.rs:85][E: codex-rs/core/src/memories/phase2.rs:86][E: codex-rs/core/src/memories/phase2.rs:87][E: codex-rs/core/src/memories/phase2.rs:98][E: codex-rs/core/src/memories/phase2.rs:104][E: codex-rs/core/src/memories/phase2.rs:113][E: codex-rs/core/src/memories/phase2.rs:220]
11. 如果 phase2 没有 raw memories 且没有待删除 extension resources，它在同步文件系统之后直接 `succeeded_no_input` 并 return。[E: codex-rs/core/src/memories/phase2.rs:125][E: codex-rs/core/src/memories/phase2.rs:127][E: codex-rs/core/src/memories/phase2.rs:133][E: codex-rs/core/src/memories/phase2.rs:136]
12. Phase 2 agent config 把 cwd 设置为 memory root，标记 ephemeral，关闭 generate/use memories，把 approval policy 约束为 Never，禁用 SpawnCsv/Collab/MemoryTool，并使用只允许 memory root write、无 network 的 workspace-write sandbox。[E: codex-rs/core/src/memories/phase2.rs:301][E: codex-rs/core/src/memories/phase2.rs:303][E: codex-rs/core/src/memories/phase2.rs:304][E: codex-rs/core/src/memories/phase2.rs:305][E: codex-rs/core/src/memories/phase2.rs:307][E: codex-rs/core/src/memories/phase2.rs:309][E: codex-rs/core/src/memories/phase2.rs:310][E: codex-rs/core/src/memories/phase2.rs:311][E: codex-rs/core/src/memories/phase2.rs:314][E: codex-rs/core/src/memories/phase2.rs:316][E: codex-rs/core/src/memories/phase2.rs:317][E: codex-rs/core/src/memories/phase2.rs:319]
13. Phase 2 agent 默认 model 是 `config.memories.consolidation_model` 或 `gpt-5.4`，reasoning effort 是 Medium；spawn source 是 `SubAgentSource::MemoryConsolidation`。[E: codex-rs/core/src/memories/phase2.rs:342][E: codex-rs/core/src/memories/phase2.rs:344][E: codex-rs/core/src/memories/mod.rs:70][E: codex-rs/core/src/memories/phase2.rs:346][E: codex-rs/core/src/memories/mod.rs:72][E: codex-rs/core/src/memories/phase2.rs:141]
14. Phase 2 handler 订阅 agent status，直到 final status；每 90 秒 heartbeat 一次 global phase2 job，完成后写 success、删除旧 extension resources，否则标记 `failed_agent` 并尝试 shutdown live agent。[E: codex-rs/core/src/memories/phase2.rs:385][E: codex-rs/core/src/memories/phase2.rs:404][E: codex-rs/core/src/memories/phase2.rs:408][E: codex-rs/core/src/memories/phase2.rs:418][E: codex-rs/core/src/memories/phase2.rs:421][E: codex-rs/core/src/memories/phase2.rs:425][E: codex-rs/core/src/memories/phase2.rs:427][E: codex-rs/core/src/memories/phase2.rs:447][E: codex-rs/core/src/memories/phase2.rs:451][E: codex-rs/core/src/memories/phase2.rs:452][E: codex-rs/core/src/memories/phase2.rs:453][E: codex-rs/core/src/memories/phase2.rs:467][E: codex-rs/core/src/memories/mod.rs:79]
15. Prompt 注入 read path 读取 `codex_home/memories/memory_summary.md`，trim 后按 5000 token limit 截断，非空时渲染 `MEMORY_TOOL_DEVELOPER_INSTRUCTIONS_TEMPLATE` 并返回 developer instructions。[E: codex-rs/core/src/memories/prompts.rs:268][E: codex-rs/core/src/memories/prompts.rs:269][E: codex-rs/core/src/memories/prompts.rs:270][E: codex-rs/core/src/memories/prompts.rs:275][E: codex-rs/core/src/memories/prompts.rs:277][E: codex-rs/core/src/memories/prompts.rs:279][E: codex-rs/core/src/memories/prompts.rs:284][E: codex-rs/core/src/memories/prompts.rs:288][E: codex-rs/core/src/memories/mod.rs:50]
16. User-triggered memory ops: `drop_memories` 清 state DB memory rows 并调用 memory roots 清理函数；`update_memories` 复用当前 session source 调 `start_memories_startup_task` 并发送 `"Memory update triggered."` warning。[E: codex-rs/core/src/session/handlers.rs:621][E: codex-rs/core/src/session/handlers.rs:622][E: codex-rs/core/src/session/handlers.rs:629][E: codex-rs/core/src/session/handlers.rs:662][E: codex-rs/core/src/session/handlers.rs:664][E: codex-rs/core/src/session/handlers.rs:667][E: codex-rs/core/src/session/handlers.rs:672]

## 设计动机与权衡

Memory 生成被放到 startup background task，而不是每轮 prompt 同步更新，是为了把历史 rollout 扫描、stage-one sampling、global consolidation agent 这些慢路径从当前 turn latency 中分离出来。[E: codex-rs/core/src/memories/start.rs:32][E: codex-rs/core/src/memories/phase1.rs:252][E: codex-rs/core/src/memories/phase2.rs:144][I]

Phase 1 使用 `gpt-5.4-mini`、Low reasoning、无 tools、严格 JSON schema，并将 rollout input 截到 active model effective context window 的 70%；这表明它偏向批量、低成本、结构化抽取，而不是任意 agent 行为。[E: codex-rs/core/src/memories/mod.rs:38][E: codex-rs/core/src/memories/mod.rs:40][E: codex-rs/core/src/memories/phase1.rs:337][E: codex-rs/core/src/memories/phase1.rs:344][E: codex-rs/core/src/memories/prompts.rs:244][E: codex-rs/core/src/memories/prompts.rs:245][I]

Phase 2 使用受限 subagent 而不是直接在 parent session 写文件：它有独立 cwd、只写 memory root、无 network、Never approval、禁用递归 delegation/memory tool。该设计把 consolidation 的副作用限定在 memory artifact tree 内。[E: codex-rs/core/src/memories/phase2.rs:301][E: codex-rs/core/src/memories/phase2.rs:307][E: codex-rs/core/src/memories/phase2.rs:309][E: codex-rs/core/src/memories/phase2.rs:314][E: codex-rs/core/src/memories/phase2.rs:316][E: codex-rs/core/src/memories/phase2.rs:317][E: codex-rs/core/src/memories/phase2.rs:319][I]

`use_memories` 只控制 developer prompt 注入；即使 `memory_summary.md` 存在，只要 feature 或 config 关闭，`build_initial_context` 就不会加入 memory developer instructions。[E: codex-rs/core/src/session/mod.rs:2434][E: codex-rs/core/src/session/mod.rs:2435][I]

## gotcha

- `memory_extensions_root(root)` 使用 `root.with_file_name("memories_extensions")`，所以 extension root 是 `memories` 目录的 sibling，不是 `memories/memories_extensions` 子目录。[E: codex-rs/core/src/memories/mod.rs:113][E: codex-rs/core/src/memories/mod.rs:114]
- Phase 2 在 no-input 情况下仍先同步/清理本地 artifacts，再返回 `succeeded_no_input`；不要把 no-input 理解成“不碰文件系统”。[E: codex-rs/core/src/memories/phase2.rs:100][E: codex-rs/core/src/memories/phase2.rs:112][E: codex-rs/core/src/memories/phase2.rs:125]
- Memory usage metric 只对 `is_known_safe_command` 为 true 的 shell/shell_command/exec_command read/search 命令生效，不是所有工具访问都会打 metric。[E: codex-rs/core/src/memories/usage.rs:58][E: codex-rs/core/src/memories/usage.rs:61][E: codex-rs/core/src/memories/usage.rs:69][E: codex-rs/core/src/memories/usage.rs:114]
- `sync_rollout_summaries_from_memories` 在 retained memories 为空时会删除 `MEMORY.md`、`memory_summary.md` 和 `skills/`，这会影响之后的 prompt 注入结果。[E: codex-rs/core/src/memories/storage.rs:41][E: codex-rs/core/src/memories/storage.rs:42][E: codex-rs/core/src/memories/storage.rs:51]

## Sources

- `codex-rs/core/src/memories/mod.rs`
- `codex-rs/core/src/memories/start.rs`
- `codex-rs/core/src/memories/phase1.rs`
- `codex-rs/core/src/memories/phase2.rs`
- `codex-rs/core/src/memories/prompts.rs`
- `codex-rs/core/src/memories/storage.rs`
- `codex-rs/core/src/memories/usage.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/core/src/rollout.rs`

## 相关

- [指令/prompt 装配](instruction-assembly.md) — `memory_summary.md` 如何进入 developer sections。
- [Session 生命周期](session-lifecycle.md) — startup task 从 session spawn path 启动。
- [Turn 引擎](turn-engine.md) — memory 注入后进入每轮 prompt history。
- [Unified Exec](unified-exec.md) — `exec_command` 读 memory artifacts 时的 usage metric。

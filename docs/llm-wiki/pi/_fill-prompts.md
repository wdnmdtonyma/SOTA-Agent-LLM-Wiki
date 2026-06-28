# 填充编排 —— 单 lead 会话 + 多 subagent 并行

下面整块就是给 codex **lead 会话**的总提示词(已合并 lead 编排 + filler/verifier subagent 模板 + 8 批 fan-out 清单),**一键复制**即可。

## 一键复制:lead 总提示词

```text
你是 lead 会话,编排填充 pi 源码 LLM wiki(在本仓库 docs/llm-wiki/pi/ 下,源码在该目录的 ../../../pi/)。先完整读 docs/llm-wiki/pi/ 的 README.md、conventions.md、RUN.md、index.json、llms.txt。然后用 subagent 并行把所有 status=planned 的节点填成 verified,规则如下。

【模型】你(lead,串行)+ 每节点一个 subagent(并行)。节点级并行安全:每节点是独立 .md、源码只读、填充期不动 index.json/llms.txt,跨节点 related/正文链接靠 index.json 解析(177 个 planned 已全登记)→ 节点之间无写依赖、无先后约束。你是唯一且串行碰 index.json/reconcile/lint 的人;保持自己上下文精简:只读 subagent 返回摘要 + lint 输出,别把节点正文拉进自己上下文。

【流程】批 A(脊柱)必须先整批跑完(后续节点要读完成的脊柱 prose);之后 B–H 逐批。每批两波 fan-out:
  1) 填充波:对该批每个节点派一个 filler subagent(模板见下),并行,单波 ≤8–10 个,超了分组。
  2) L2 证伪波:对刚填的每个节点派一个全新 verifier subagent(模板见下),并行。
  随后你串行跑 `node tools/reconcile.mjs` 再 `node tools/lint.mjs`(须 0 error),对报错或被 verifier 驳回的节点派 L3 修复 subagent(≤2 轮),修完再 lint。该批 status 全 verified 且 0 error 再进下一批。
全部完成:index.json 无 planned、所有 groups 的 catalog_node 已逐实例展开、reference/uncertainty.md 已由 reconcile 生成、lint 全绿。报告每批进度与遗留 [U]。

【filler subagent 模板】（每节点一个，把 <node-id>/<path>/<batch> 填进去再派）
"你填一个 pi wiki 节点：id=<node-id>，path=<path>，batch=<batch>。源码在本 wiki 目录的 ../../../pi/。先读 docs/llm-wiki/pi/conventions.md（节点模板 + 第 7 节 ground-truth 约定）和该节点在 index.json 里的 source/symbols/related。然后：
 1. 读源：打开 source 列的真实文件读，不靠记忆。工具/provider/命令节点先按 conventions §7 核 ground truth（core/tools/index.ts / providers/all.ts / slash-commands.ts / rpc-types.ts 等）。
 2. 写 <path>：套对应模板，中文讲解+英文术语，自包含（显式实体名，禁“见上文/见某节”）；每条 load-bearing 且非显然的论断就近标 [E: path:line]（相对 pi/，行号要精确落在被断言代码行），推断 [I]，存疑 [U]。frontmatter 含 pkg、status: draft、updated=$(git -C ../../../pi rev-parse --short HEAD)。跨包节点显式点名对方节点 id。
 3. 只写两个文件：<path> 和 _staging/uncertainty-<batch>-<slug>.md（<slug>=节点 id 末段，[U] 写这里）。绝不碰 index.json/llms.txt/reference/uncertainty.md/tools/*/别的节点 .md。
 4. L1 自检：node tools/lint.mjs，只看含 node:<path> 的报错并修（并行时兄弟节点的报错忽略）。
返回一句话摘要：填了哪些 H2、标了几条 [E]、降级了哪些 [I]/[U]。"

【verifier subagent 模板】（L2，每节点一个，全新上下文）
"你是独立审查者，只信源码。给你：节点文件 <path> + 它 source 列的 ../../../pi/ 源文件。逐条尝试推翻正文每个 [E: path:line]：(a) 该论断在所给路径能否核到？(b) 行号是否精确落在被断言的代码行本身（不是其上方注释/import/空行/纯括号行）？(c) 有无臆造或过度推断？
 - 被驳倒的就地改对（修行号/改措辞）或降级 [I]/[U]（[U] 追加到 _staging/uncertainty-<batch>-<slug>.md）。
 - 全部通过后把 <path> 的 status 置 verified（updated 保持当前 pi 短 SHA）；仍有无法证实项 → 留 status: draft 并在返回里列出交 lead 走 L3。
只改 <path> 和该节点暂存文件，不碰任何共享文件。返回：核了几条 [E]、改/降级了几条、最终 status。"

【8 批 fan-out 清单】（<batch>=暂存文件名前缀；逐批派 filler/verifier）

批 A · batch=spine（12，先整批跑完）— mermaid 先行；钉死 pi-agent-core(可复用)↔ pi-coding-agent(产品)边界（后续批引用这些脊柱 id）：
  spine.overview, spine.layered-architecture, spine.process-lifecycle, spine.agent-loop, spine.tool-call-anatomy, spine.provider-stream, spine.session-state-model, spine.compaction-flow, spine.extension-lifecycle, spine.trace-interactive-turn, spine.trace-rpc-prompt, spine.trace-extension-tool

批 B · batch=tools（14）— ground truth=packages/coding-agent/src/core/tools/index.ts（装配在 core/agent-session.ts 的 _buildRuntime）；每工具写全输入 schema/输出截断/executionMode/XOperations 可插拔点：
  surface.tools.bash, surface.tools.read, surface.tools.edit, surface.tools.write, surface.tools.grep, surface.tools.find, surface.tools.ls, subsys.coding-agent.bash-executor, subsys.coding-agent.output-truncation, subsys.coding-agent.file-mutation-queue, subsys.coding-agent.edit-engine, subsys.coding-agent.path-resolution, subsys.coding-agent.tool-wrapper, ref.tools-catalog

批 C · batch=ai（29）— provider=packages/ai/src/providers/all.ts；模型=models.generated.ts(generated)；wire=api/<name>.ts 经 <name>.lazy.ts 按 Model.api 派发；catalog 逐实例覆盖：
  subsys.ai.provider-registry, subsys.ai.wire-protocol-dispatch, subsys.ai.anthropic-messages, subsys.ai.openai-responses, subsys.ai.openai-completions, subsys.ai.openai-codex-responses, subsys.ai.azure-openai-responses, subsys.ai.bedrock-converse, subsys.ai.google-generative-ai, subsys.ai.google-vertex, subsys.ai.mistral-conversations, subsys.ai.message-transform, subsys.ai.event-stream, subsys.ai.auth-resolution, subsys.ai.credential-store, subsys.ai.oauth-flow, subsys.ai.env-api-keys, subsys.ai.model-discovery, subsys.ai.prompt-caching, subsys.ai.lazy-loading, subsys.ai.image-generation, subsys.ai.session-resources, subsys.ai.compat-legacy, ref.ai.provider-catalog, ref.ai.model-catalog, ref.ai.wire-protocol-catalog, ref.ai.auth-types, ref.ai.core-types, ref.ai.image-models

批 D · batch=agent-core（26）— 可复用运行时，边界写清(公开 API vs 被 coding-agent 装配)；数据模型以 packages/agent/src/types.ts、harness/types.ts 为准：
  subsys.agent-core.turn-control, subsys.agent-core.message-queue, subsys.agent-core.tool-invocation, subsys.agent-core.hooks, subsys.agent-core.message-model, subsys.agent-core.message-conversion, subsys.agent-core.session-storage, subsys.agent-core.jsonl-storage, subsys.agent-core.memory-storage, subsys.agent-core.session-tree, subsys.agent-core.tree-navigation, subsys.agent-core.compaction, subsys.agent-core.branch-summary, subsys.agent-core.system-prompt, subsys.agent-core.skills-loading, subsys.agent-core.prompt-templates, subsys.agent-core.transport-proxy, subsys.agent-core.exec-env, ref.agent.message-types, ref.agent.session-entry-types, ref.agent.agent-events, ref.agent.error-codes, ref.agent.thinking-levels, ref.agent.queue-modes, ref.agent.tool-execution-modes, ref.agent.compaction-config

批 E · batch=coding-agent（25）— agent-session 是产品核心(在 pi-agent-core 上装配工具/系统提示/模型/压缩)；扩展三件套(loader/runner/wrapper)是自扩展招牌：
  subsys.coding-agent.agent-session, subsys.coding-agent.session-runtime, subsys.coding-agent.session-services, subsys.coding-agent.system-prompt, subsys.coding-agent.model-registry, subsys.coding-agent.model-resolver, subsys.coding-agent.extension-loader, subsys.coding-agent.extension-runner, subsys.coding-agent.extension-wrapper, subsys.coding-agent.settings-manager, subsys.coding-agent.config-resolution, subsys.coding-agent.resource-loader, subsys.coding-agent.session-manager, subsys.coding-agent.auth-storage, subsys.coding-agent.trust-manager, subsys.coding-agent.keybindings, subsys.coding-agent.event-bus, subsys.coding-agent.footer-data-provider, subsys.coding-agent.html-export, subsys.coding-agent.migrations, subsys.coding-agent.http-dispatcher, subsys.coding-agent.package-manager, subsys.coding-agent.telemetry, subsys.coding-agent.theme-controller, subsys.coding-agent.interactive-orchestration

批 F · batch=surface（37）— 逐实例 catalog ground truth(conventions §7)：config=settings-manager.ts+defaults.ts+docs/settings.md；slash=slash-commands.ts；键位=keybindings.ts；扩展事件=extensions/types.ts+docs/extensions.md；RPC=rpc-types.ts+docs/rpc.md；CLI=cli/args.ts；env=env-api-keys.ts+experimental.ts+telemetry.ts；会话格式=session-manager.ts+docs/session-format.md；组件=modes/interactive/components/：
  surface.cli.overview, surface.modes.interactive, surface.modes.rpc, surface.modes.rpc-protocol, surface.modes.print, surface.config.settings, surface.config.resolution, surface.config.keybindings, surface.providers.overview, surface.providers.auth, surface.providers.custom-provider, surface.extensions.api, surface.extensions.contribution-points, surface.extensions.context-ui, surface.extensions.events, surface.skills.system, surface.prompt-templates.system, surface.slash-commands.overview, surface.sdk.embedding, surface.sessions.management, surface.trust.model, surface.misc.images, surface.misc.containerization, surface.misc.security, surface.misc.packages, ref.coding-agent.config-keys, ref.coding-agent.slash-commands, ref.coding-agent.default-keybindings, ref.coding-agent.extension-events, ref.coding-agent.contribution-points, ref.coding-agent.env-vars, ref.coding-agent.session-format, ref.coding-agent.rpc-methods, ref.coding-agent.cli-flags, ref.coding-agent.session-events, ref.coding-agent.json-events, ref.interactive.components

批 G · batch=tui（21）— 独立可复用库；差分渲染(tui.ts/terminal.ts 的 doRender)、键盘协议(kitty/CSI-u, keys.ts)、编辑器是大件；组件覆盖 packages/tui/src/components/ 全 12：
  subsys.tui.runtime, subsys.tui.diff-engine, subsys.tui.component-model, subsys.tui.overlay, subsys.tui.cursor-positioning, subsys.tui.key-pipeline, subsys.tui.key-parsing, subsys.tui.keybinding-matching, subsys.tui.editor-component, subsys.tui.editor-mechanics, subsys.tui.stdin-buffer, subsys.tui.terminal-capabilities, subsys.tui.native-modifiers, subsys.tui.autocomplete, subsys.tui.fuzzy-match, subsys.tui.text-utilities, subsys.tui.terminal-colors, subsys.tui.terminal-image, ref.tui.key-codes, ref.tui.keybinding-actions, ref.tui.component-types

批 H · batch=orchestrator（12）— experimental，如实标稳定性；写清 --mode rpc 子进程跑 pi、IPC(Unix socket)协议、Radius 云端；ref.uncertainty 不手写(reconcile 合并各 _staging/uncertainty-*.md 生成)：
  subsys.orchestrator.supervisor, subsys.orchestrator.rpc-spawner, subsys.orchestrator.ipc-transport, subsys.orchestrator.message-protocol, subsys.orchestrator.request-handler, subsys.orchestrator.storage, subsys.orchestrator.radius, subsys.orchestrator.config, ref.orchestrator.ipc-messages, ref.orchestrator.instance-status, ref.package-index, ref.glossary
```

## 说明（给人看，不必复制）

- **为什么节点级并行安全**:每节点独立 `.md`、源码只读、填充期不动 `index.json`/`llms.txt`,跨节点链接靠 `index.json` 解析 → 无写依赖。**唯一并行写点**是各 subagent 的 `[U]` 暂存,已拆成每节点一个 `_staging/uncertainty-<batch>-<slug>.md`(`reconcile` glob `uncertainty-*.md` 全量合并)。**lead 串行独占** `index.json`/reconcile/lint → 无竞争。机制详解见 `RUN.md §8`。
- **节点总数**:177(批 A–H 合计填 176 + `ref.uncertainty` 由 reconcile 生成)。单波并发建议 ≤8–10 个 subagent。
- **每批后 / 全程末**(lead 串行):`cd docs/llm-wiki/pi && node tools/reconcile.mjs && node tools/lint.mjs`(须 0 error)。整体收尾确认 `index.json` 无 `planned`、所有 `groups` 的 `catalog_node` 已逐实例展开。
- **备选**:也可"一批一会话"并行多个 lead(回到多会话模型)——那时任何会话都不得跑 reconcile / 改 `index.json`,由人最后统一 reconcile + lint。默认推荐单 lead 会话编排全程。

---
id: surface.tools.report
title: report（已退役）
kind: tool
tier: T1
pkg: orchestration
source:
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/preset/agent-presets/presets/standard/agent.cordis.yml
  - packages/preset/agent-presets/presets/ptc/agent.cordis.yml
  - packages/preset/agent-presets/presets/cordis/agent.cordis.yml
  - packages/experimental/agent-team-profile/cordis.patch.yml
  - packages/subagent/subagent/src/continuation-messages.ts
  - packages/subagent/subagent/src/continuation-activation.ts
  - packages/subagent/subagent/src/descriptor.ts
  - packages/subagent/subagent-in-process-driver/src/index.ts
  - packages/subagent/tool-subagent-control/src/index.ts
symbols:
  - report
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - spine.trace-subagent
  - surface.tools.subagent
  - surface.tools.subagent-fork
  - surface.tools.subagent-control
  - subsys.orchestration.subagent
  - surface.presets.code
  - subsys.core.code-mode
evidence: explicit
status: verified
updated: c291e7961a
---

> 模型可见名 `report` 曾经由 `@deepseek-ai/dsh-tool-subagent-report`（Cordis 插件 `tool-subagent-report`）挂在 **continuable in-process child** 的 `childCtx.tools` 上。该包在 `0.1.3-alpha.1` **已删除**。本页保留 wiki id `surface.tools.report` 作为退役映射，不是活工具 catalog 行。

## 能回答的问题

- `report` 还在不在 `dsh-base` / shipped preset / 模型 schema 里？
- 孩子怎样把结果交回父会话？
- `registerContinuableSetup` / `activation-setup-registry` 还在吗？
- Agent Teams profile 里对 `tool-subagent-report` 的 disable 还成不成立？

## 退役事实

`packages/subagent/tool-subagent-report/**` 不在 git 跟踪源里。`dsh-base` 的 host 插入在 `id: tool-subagent-fork` 之后直接是 `workflow-worker-thread`，**没有** `id: tool-subagent-report`。[E: packages/bundle/base/cordis.patch.yml:362] [E: packages/bundle/base/cordis.patch.yml:369]

`dsh-web-app` overlay disable 的是 control / spawn / fork 工具行，同样没有 report 行。[E: packages/bundle/web-app/cordis.patch.yml:443] [E: packages/bundle/web-app/cordis.patch.yml:449] [E: packages/bundle/web-app/cordis.patch.yml:452]

`standard` / `ptc` / `cordis` 的 `delegation` 组挂 control、`subagent`、`subagent_fork`、可选 disabled Codex/Claude、workflow / ralph；**不含** report 包。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:175] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:181] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:182]

`ctx.subagents` 上已无 `reportFrom` / `registerContinuableSetup`。continuable 孩子的结果靠 continuation manager 的 **settlement notice**（`source.kind: 'subagent-settled'`）进父 inbox，不是孩子调 `report`。[E: packages/subagent/subagent/src/continuation-messages.ts:31] [E: packages/subagent/subagent/src/continuation-messages.ts:148] 无 closing 时文案是 `It left no closing message.`。[E: packages/subagent/subagent/src/continuation-messages.ts:144] 投递在 `notifySettlement`。[E: packages/subagent/subagent/src/continuation-activation.ts:823]

父 → 子 / 子 → 父邻接投递走 [`surface.tools.subagent-control`](subagent-control.md) 的 `send_message`（`ctx.subagents.sendMessage`）。[E: packages/subagent/tool-subagent-control/src/index.ts:66]

`activation-setup-registry.ts` 与 `descriptor-seed.ts` 已删除；descriptor 在 continuable 物化里 `session.append('subagent/descriptor', …)`，one-shot 在 in-process driver 的 `agent/pre-step`。[E: packages/subagent/subagent/src/continuation-activation.ts:583] [E: packages/subagent/subagent-in-process-driver/src/index.ts:87] 权威类型在 `packages/subagent/subagent/src/descriptor.ts`（`SUBAGENT_DESCRIPTOR_VERSION = 3`，无 `surfaceOp`）。[E: packages/subagent/subagent/src/descriptor.ts:48]

experimental Agent Teams profile 只 disable `tool-subagent-control` / `list-agents`，并把 spawn/fork 工具改成 `backgroundMode: one-shot`；**没有** `tool-subagent-report` 行。[E: packages/experimental/agent-team-profile/cordis.patch.yml:5] [E: packages/experimental/agent-team-profile/cordis.patch.yml:11]

仓库里若还出现 `id: tool-subagent-report`，那是测试 overlay / 历史 snapshot（例如 headless team snapshot），不是 shipped bundle 行。

## 不要再写的句子

- host `dsh-base` 装 `@deepseek-ai/dsh-tool-subagent-report`
- continuable child catalog 里默认有 `report`
- `registerContinuableSetup` 把 `installReportTool` 挂进 unpublished child
- `reportDelivery: next-step | quiet`

## Sources

- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/preset/agent-presets/presets/standard/agent.cordis.yml
- packages/preset/agent-presets/presets/ptc/agent.cordis.yml
- packages/preset/agent-presets/presets/cordis/agent.cordis.yml
- packages/experimental/agent-team-profile/cordis.patch.yml
- packages/subagent/subagent/src/continuation-messages.ts
- packages/subagent/subagent/src/continuation-activation.ts
- packages/subagent/subagent/src/descriptor.ts
- packages/subagent/subagent-in-process-driver/src/index.ts
- packages/subagent/tool-subagent-control/src/index.ts

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 不再含父/子 `report`
- [trace: 拉起子代理](../../spine/trace-subagent.md)（`spine.trace-subagent`）
- [subagent](subagent.md)（`surface.tools.subagent`）
- [subagent_fork](subagent-fork.md)（`surface.tools.subagent-fork`）
- [send_message / interrupt_agent / list_agents](subagent-control.md)（`surface.tools.subagent-control`）：邻接消息与列举
- [subagent 缝](../../subsystems/orchestration/subagent.md)（`subsys.orchestration.subagent`）
- [PTC 预设](../presets/code.md)（`surface.presets.code`）
- [PTC / `run_code`](../../subsystems/core/code-mode.md)（`subsys.core.code-mode`）

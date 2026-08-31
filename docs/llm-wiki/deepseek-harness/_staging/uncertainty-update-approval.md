# uncertainty-update: approval

- `effectiveApprovalPolicy` 从后往前只读 `event.data.policy`，不读 `source`。委派孩子 `append` 的 `source: 'delegation'` 因此只是审计标记。核到：`packages/subagent/subagent/src/child-agent.ts` 的 append 与 `packages/interaction/user-approval/src/index.ts` 的 fold。
- live `/permission` 走 `ApprovalService.setPolicy`（额外 `inject` 通知）；pin / `set(session)` 走 `setApprovalPolicy`（无通知）。两条写路径并存。

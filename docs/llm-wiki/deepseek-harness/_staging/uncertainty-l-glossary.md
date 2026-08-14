# uncertainty · ref.glossary

- 官方 `docs/glossary.md` 的 **scope** 仍写 “Two levels, flat: scoped registrations do not inherit down to subagents”。源码 `packages/core/scope/src/index.ts` 有 `bindScopeParent` / `scopeParents`：preset standing mount 是 agent key 的 parent，事件沿链向上，registry view 沿链向下。`composeFrom` 把子 agent 绑到**同一** standing key，子 agent 仍看不见父 agent 自己的 layer（这一层符合 “不 inherit 到 subagent”）。wiki 跟源码链，不跟官方 “flat” 字面。
- 官方 glossary 未收 profile / bundle / isolate / host 面 / Code Mode / 两个 `bash` / 无 shipped TUI。这些按源码补进 `reference/glossary.md`。
- `packages/subagent/subagent-fork-in-process/src/index.ts` 注释写 shipped 把 fork 绑成 `backgroundMode: one-shot`；四个 shipped 里 standard/code/cordis 的 `tool-subagent-fork` 实际是 `backgroundMode: continuable`。本页只钉 `toolName` + `inheritsParentContext`，不把 one-shot 写成 shipped 事实。

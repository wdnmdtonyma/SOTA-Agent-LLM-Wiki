# uncertainty · bundle-base

- **官方 README 与测试冲突。** `packages/bundle/base/README.md` 写 “Codex and Claude Code providers load dormant”。`packages/bundle/base/tests/base.spec.ts` 要求 `id: subagent-codex` / `id: subagent-claude-code` 行数为 0，且 `package.json` `dependencies` 不含 `@deepseek-ai/dsh-subagent-codex` / `@deepseek-ai/dsh-subagent-claude-code`。wiki 跟测试：没有行就是没装，不是 dormant。preset 里对应 tool 行 `disabled: true` 也不等于 base 已加载后端。

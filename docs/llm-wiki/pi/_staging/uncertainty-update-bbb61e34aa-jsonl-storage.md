# uncertainty · bbb61e34aa · jsonl-storage

- `JsonlSessionRepo.close` 把 repo 标成 closed 后 `Promise.resolve()`，不关闭已打开的 session handles。源码有 TODO：ownership 未定。`[U]` 仍在 `subsys.agent-core.jsonl-storage`。

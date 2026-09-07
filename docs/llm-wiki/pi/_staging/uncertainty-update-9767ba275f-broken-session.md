# uncertainty · broken-session · 9767ba275f

- `JsonlSessionRepo.close()` 只把 repo 标成 closed，不关闭已打开的 session handles。源码有 TODO：ownership 未定。见 `packages/agent/src/harness/session/jsonl/repo.ts`。
- sqlite-node `001_initial.sql` 用 `CREATE TABLE IF NOT EXISTS`，没有从 0.84 lane/FTS schema 升级的 migration。打开 pre-0.85 文件后的具体失败形态未固定。
- `packages/agent/docs/harness.md` 仍有一份与当前 `SessionSearchService` 不完全一致的 S3 设计稿。本批次不以该文档为 ground truth。

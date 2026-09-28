# L2 / L3 — Codex Wiki `3abbf9fe2c` → `1cc7e23612`

对照源码 `codex/` @ `1cc7e23612`。独立 L2 不采信 filler / `status:verified`。

## 覆盖

13 批覆盖全部 174 个 C-DRIFT / B-HEAVY 节点。D-CLEAN 11 页仅 SHA bump。Fill 13/13 成功。

| 阶段 | 结果 |
|---|---|
| L2 | 117 issues，13 dirty batches |
| L3 第 1 轮 | 13 批全部跑完 |
| L2b | 88 issues 仍报（含行号/过宽清单/L3 未吃掉的语义） |
| L3 第 2 轮 | 13 批全部跑完 |

Lead 收束：把 YAML-list frontmatter 改回行内数组（reconcile 才能同步 `source:`）、按 lint 规则再 slide `[E:]`、去重 `symbols`、`reconcile` ×2。`node tools/lint.mjs` **0 error**。

抽查 L3b 已落地的语义：`RolloutItem` 12 variants（含 `TokenUsageRecord` / `RetainedContext`）；`CODEX_APP_SERVER_LOGIN_ISSUER` 为 release-visible；`ElicitationRequest` 含 `UserVerification`。

## 未做

L2b 的 88 条没有再开第 3 轮 L3（`RUN.md` 上限 2 轮）。其中一部分是过宽 catalog 清单、行号相邻注释、或 L2 误报。不能证实的保持 `[I]/[U]`。

机械 SHA / exact rebase 页已全部纳入这 13 批 L2，不再有「只 bump 不证伪」的 C-DRIFT。

未跑大型 Rust/runtime 测试。完整 L2 JSON 见 workflow scratch `l2-report.md`（session `wf_01a0e697837676f2a70671af2d52386b`）。

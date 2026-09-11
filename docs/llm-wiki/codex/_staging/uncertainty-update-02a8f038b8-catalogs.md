# Catalog recount notes — 02a8f038b8

Filler 对照源码重数后，与 UPDATE-INSTRUCTIONS / research 备忘录的两处 expected 不一致。正文已按源码写，不把备忘录当 [E]。

## workspace members：源码 147，不是 148

`codex-rs/Cargo.toml` `members` 第 3–149 行是 147 个 path，第 150 行是闭合 `]`，`resolver` 在 151。

- base `121f91fd5d`：145 members（3–147），`]` 在 148。旧 wiki 已计入 `exec-server/tests/support`。
- target：只新增 `ext/guardian-reviewer`、`user-verification`。145 + 2 = 147。
- 备忘录写「148（第 3–150 行）」是把闭合括号行算进 members。

## server notifications：宏内 84 variants，不是 83

`server_notification_definitions!`（`common.rs:1907`）：

- 83 个 `Variant => "wire" (Type)`，含新增 `ThreadAttachmentUpdated => "thread/attachment/updated"`
- 1 个 `AccountLoginCompleted` 用 serde/TS/strum rename 固定 `account/login/completed`

合计 **84**。旧 wiki 的 83 = 82 `=>` + AccountLoginCompleted；本轮 +1 attachment notification。

client RPC 167、server requests 11（9 v2 `=> "path"` + legacy `ApplyPatchApproval` / `ExecCommandApproval`）与备忘录一致。

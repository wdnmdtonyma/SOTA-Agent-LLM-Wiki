# L3 fixer — ff72faba28 catalogs

独立对照 wiki 正文与 `pi/` @ `ff72faba28`。未改节点、未改共享文件。

`l2_fixes_hold=true`。env 最终 count **105**。又改了 0 条。PASS。本轮无新 `[U]`。

## 已核、不进 uncertainty

- 产品 env catalog：标题 `环境变量目录(105)`、正文 **105**、表内 105 行一致。含 `PI_RADIUS_GATEWAY`（`core/radius.ts:4` / `docs/environment-variables.md:89`）。不含 `AWS_ENDPOINT_URL_BEDROCK_RUNTIME`（`pi/` 与 `docs/providers.md` 均无）。不含任何 `PI_EVAL_*`。
- slash：`BUILTIN_SLASH_COMMANDS` 24。`/thinking` dispatch `interactive-mode.ts:3100`（不是 `/scoped-models` `:3089`）；persist `:5004` / `:5027`。`/compact` dispatch `:3188`（不是 `/login` `:3172`）；handler `:6823`。
- DeepSeek 硬编码：`generate-models.ts:2957` `deepseek-flash`，`input: ["text", "image"]` 在 `:2964`（不是 thinkingLevelMap `:2963`）。第二行 `deepseek-v4-pro` `:2977`。无 `deepseek-v4-flash-vision-exp` 硬编码行。
- evals output 投影：`harness.ts:61` `PiCodingAgentHarnessWithOutput`；运行时 `"output" in options ? options.output({ response, session, systemPrompt, agentDir }) : response` 在 `:415`。
- `kind: "cache_warm"` 在 `cache-warmer.ts:343`（不是 `session-manager.appendUsage` 签名 `:1244`）。`cache_warming_decision` `on()` `types.ts:1399`。`session_compact` `on()` `:1389`。`canContinue` 闸 `agent-session.ts:1548`。`getCurrentSystemMessage()` 重建 `runner.ts:288`。
- `markdown.codeBlockIndent` 默认两空格 `getCodeBlockIndent()` `"  "`。产品 `defaultTools` 数组 `agent-session.ts:3283`。

## 仍不升级的既有 `[U]`（节点内已标，不新开）

- `packages/server` `PI_SERVER_*` 与 evals `PI_EVAL_*` 不进产品 env catalog。
- `interactive-mode.ts` 仍处理 `/debug`、`/arminsayshi`、`/dementedelves`，不计入 slash 24。
- TUI LaTeX 不是 `Settings` 键。
- `emitToolCall()` 无 try/catch，是否 fail-closed 仍未在源码直接说明。

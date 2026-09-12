# uncertainty · presets-composition (c291e7961a)

- `cordis` preset 头注释仍写 `cordis_mount`；可执行登记名是七个 `cordis_*`（`define` / `run` / `stop` / `undefine` + 三条 `inspect_*`），没有 `cordis_mount`。该 TRUST 说法只在注释，标 [I]。
- `agent-default-model.spec.ts` fixture 仍写 `deepseek-v4-flash`；composition 权威是 `dsh-base` 的 `deepseek-flash`。acp-app 插件行另硬编码 `deepseek-v4-flash`。

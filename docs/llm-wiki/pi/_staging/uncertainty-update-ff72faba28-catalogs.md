# uncertainty · update ff72faba28 · catalogs batch

filler 批次：provider / model / wire / slash / rpc / config-keys / env-vars / cli-flags / tools / keybindings / components / component-types。

## [U] 条目

### slash 非 catalog runtime 分支
- `interactive-mode.ts` 仍直接处理 `/debug`、`/arminsayshi`、`/dementedelves`，三者不在 `BUILTIN_SLASH_COMMANDS`。本批不把它们计入 24。

### RPC 文档字段名
- `docs/rpc.md` 的 `get_commands` 示例仍写 `location` / `path`；源码 `RpcSlashCommand` 与 dispatch 输出 `sourceInfo`。以源码为准。

### env 范围
- `packages/server` 的 `PI_SERVER_*` 与 evals 的 `PI_EVAL_RUNS_PER_VARIANT` 不计入本产品 env catalog（105）。
- `AWS_ENDPOINT_URL_BEDROCK_RUNTIME` 仍主要靠用户文档 + AWS SDK 委托读取，不是 `getProviderEnvValue()` 直读。

### TUI component protocol
- `Component` / `Focusable` 定义在 `packages/tui/src/tui.ts`。本批 `component-types.md` 只核 public class 与目录文件，不把 protocol 语义当已核 `[E]`。

### interactive components 边界
- `ConfigSelectorComponent`、`EarendilAnnouncementComponent`、`index.ts` barrel 覆盖缺口、`ShowImagesSelectorComponent` / `ThemeSelectorComponent` 当前是否仍被 interactive-mode 直接调用：沿用既有 [U]。

### config-keys 口径
- 88 = Settings 52 top-level + 29 nested leaf + 6 `PackageSource` object keys + 1 models.json `compat.allowedFallbackModels`。`compat` 本身不是 settings.json 键。

### TUI public vs 目录文件
- public catalog 16；目录 18（+ `stack.ts` + `alt-screen-flash.ts`，未从 `index.ts` 导出）。instance_count 建议仍报 16。

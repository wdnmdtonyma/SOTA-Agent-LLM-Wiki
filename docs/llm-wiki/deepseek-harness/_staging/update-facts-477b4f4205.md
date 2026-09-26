# Extra architecture facts — 477b4f4205 (`0.1.7-rc.2`)

Filler 辅助。冲突时以源码为准，不要把本页当 `[E]`。

## Session format v4

- `SESSION_FORMAT_VERSION = 4` in `packages/core/session/src/types.ts`.
- Catalog: `packages/session/session-format-catalog/src/generated.ts` — `currentVersion: 4`；migrations `[v0→v1, v1→v2, v2→v3, v3→v4]`。
- 新包：`packages/session/session-format-v3-to-v4`。
- `liftToolResult`：v3 `tool/result` 里 user 消息的单一 `tool-result` wrapper → v4 `role: 'tool'`。
- v4 仍拒绝 `request/header.system`。
- `createSessionFormatV3ToV4(children)` 需要显式 child evidence（空数组 = 无子会话）。

## Declarative presets

- 删除：`packages/preset/agent-presets`（含 `presets/*/agent.cordis.yml`）。
- 新包：`packages/preset/agent-preset`（声明行）+ `packages/preset/agent-preset-registry`（roster / revision / bind）。
- 出厂声明：`packages/bundle/web-app/presets/{standard,ptc,minimal,cordis}.patch.yml`，由 web-app `dsh.bundle.patch` 在 `cordis.patch.yml` 之后叠上。
- 默认 `agent-preset-registry.config.default: standard`。
- Web 编辑覆盖写 profile user patch 的 `config.plugins`。
- `PROFILE_TEMPLATES` 的 headless / sdk / acp / sdk-minimal **不**列这些 preset 文件。

## Preset 工具差异（以 patch 为准）

- minimal：persistent bash/pwsh only。
- standard：workflow-ptc + tool-workflow **启用**；ralph disabled；present；plugin_manager disabled。
- ptc：presentation `mode: ptc`；workflow-ptc / tool-workflow / ralph **全 disabled**。
- cordis：+ tool-cordis + agent-preset skills 目录；plugin_manager 条件 disabled。
- shipped `subagent_fork.backgroundMode = continuable`。

## PTC runtime

- 删除 `packages/code-runtime/**` 与 `packages/experimental/code-runtime-python`。
- `ctx.ptcRuntime` / class `PtcRuntime` in `packages/ptc-runtime/ptc-runtime`。
- Node：`packages/ptc-runtime/ptc-runtime-node`。
- Python：`packages/experimental/ptc-runtime-python`（experimental, not published）。
- Workflow 引擎：`packages/workflow/workflow-ptc` 取代 `workflow-worker-thread`。

## SSH / E2B

- `packages/e2b/**` 删除。
- `packages/ssh/{ssh,fs-ssh,subprocess-ssh,sandbox-ssh}`。

## 新工具

- `present`：包迁到 `packages/deliverables/tool-present`；wire 名仍 `present`。
- `load_workspace_dependencies`：`packages/skill/tool-workspace-dependencies`；sdk-app 挂。
- `plugin_manager`：`packages/boot/plugin-manager/src/tools.ts`；要 danger-full-access / approval。

## Profiles / optional bundles

- `PROFILE_TEMPLATES` 仍 acp / web / headless / sdk / sdk-minimal。
- `OPTIONAL_BUNDLES`：`dsh-experimental-agent-team-profile`、`dsh-experimental-voice-input-bundle`、`dsh-experimental-auto-review`。
- `INSTALLATION_OWNED_PROFILE_TUPLES.headless` 会把历史 `base+web-app+headless` 归一成模板 `base+headless`。
- `rejectElectronProfile` 仍拒绝 CLI `--profile desktop`。

## Default model / inbox / engines

- base `deepseek-flash`；acp-app 与 SDK 客户端仍默认 `deepseek-v4-flash`。
- Inbox：`packages/core/agent-loop/src/inbox.ts` `ReactLoopInbox`。
- Node `^22.19.0 || >=24.0.0`，pnpm `11.7.0`。
- 产品版本 `0.1.7-rc.2`。

## Inventory

- `packages/**/package.json` = 321（7 typert fixture + 2 skill template）。
- 产品叶 `packages/*/*` = 312。
- +57 / −11 包。删除含 e2b×3、code-runtime×2、agent-presets、fs/tool-present、code-runtime-python、workflow-worker-thread、settings-file、agent-team-web-profile。

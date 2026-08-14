# uncertainty · C2 · surface.tools.cordis

- `apps/cli/config/agent-presets/cordis/agent.cordis.yml` 头注释仍写 `cordis_mount` 对 live runtime 求值模型 JS；`editing-cordis-compositions/SKILL.md` 仍教 `cordis_mount` / `cordis_unmount`。现行 `defineTool` 登记名是 `cordis_define` / `cordis_run` / `cordis_stop` / `cordis_undefine` / 三条 `cordis_inspect_*`，没有 mount/unmount。
- （已核到代码，不再是 [U]）`packages/extensions/cordis-host-runner/src/lifecycle.ts:39` 的 `already registered` 教学文案仍指向 `cordis_runtime_inspect what:"temporary"`，现行工具是 `cordis_inspect_self`。页内已改标 `[E]`。
- `packages/extensions/tool-cordis/src/inspect.ts` 模块注释仍写 `cordis_runtime_inspect`；`present.ts` 仍导出未被 `index.ts` 引用的 `presentRuntimeInspectCall` / `presentPackageInspectCall`。
- `@deepseek-ai/dsh-tool-cordis` 的 `package.json` description 仍写 “mount and dispose model-written plugins”，与现行七个名字不一致。

---
id: uncertainty.t1.surface.presets.cordis
status: open
updated: 47f943859b
---

# Uncertainty · surface.presets.cordis

## `cordis_mount` 名字与可执行工具集不一致

- **claim**: yml 头注释与 bundled skill `editing-cordis-compositions/SKILL.md` 仍写 `cordis_mount` / `cordis_unmount`（对 live runtime 求值模型 JS、探完再卸）。
- **code**: `packages/extensions/tool-cordis/src/index.ts` 登记的是 `cordis_inspect_{list,query,self}` / `cordis_define` / `cordis_run` / `cordis_stop` / `cordis_undefine`。全仓 `.ts` / `.yml` 里 `cordis_mount` 只出现在 `apps/cli/config/agent-presets/cordis/agent.cordis.yml` 的 `# TRUST:` 注释。
- **stance**: TRUST（模型 JS 连真实 runtime，本 preset ≈ shell access）由 `evaluateHostCode` + `CORDIS_SYSTEM_PROMPT` 成立。把当前模型可见动词叫 `cordis_mount` 标 `[U]`。
- **page**: `surface/presets/cordis.md` 把注释当 `[I]`，把 `tool-cordis` 行与 `evaluateHostCode` 当 `[E]`。

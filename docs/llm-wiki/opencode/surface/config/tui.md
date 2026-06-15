---
id: config.tui
title: TUI Config
status: verified
owner: surface-config-cli
v: shared
kind: surface
tier: T1
schema: grouped-catalog
source:
  - packages/opencode/src/config/tui.ts
  - packages/opencode/src/config/tui-migrate.ts
  - packages/tui/src/config/
updated: 92c70c9c3
evidence: explicit
---

> `config.tui` 描述 terminal UI 的独立配置 surface。TUI config schema 和 pure resolution 属于 `@opencode-ai/tui/config`；V1 legacy host 仍负责文件发现、JSONC 解析、变量替换、迁移、插件来源和依赖安装。V2 preview CLI 目前通过 package 默认 config 运行 TUI。

## 能回答的问题

- `tui.json` 支持哪些 key 和默认值。
- legacy `opencode.json` 中的 `theme`、`keybinds`、`tui` 如何迁移到 `tui.json`。
- TUI config 文件加载优先级是什么。
- 新旧 CLI host 对 `@opencode-ai/tui` 的职责边界是什么。

## V1 Host Boundary

V1 host service 名称是 `@opencode/TuiConfig`，接口暴露 `get`、`pluginOrigins`、`waitForDependencies`。[E: packages/opencode/src/config/tui.ts:45] [E: packages/opencode/src/config/tui.ts:39] Host loader 会先展开 config variables，再用 JSONC parser 解析。[E: packages/opencode/src/config/tui.ts:97] 它会 flatten nested `tui` key，兼容用户在 `tui.json` 中写 `{ "tui": { ... } }` 的旧形状。[E: packages/opencode/src/config/tui.ts:53] unknown keybind keys 会被过滤掉而不是让整个 config 失败。[E: packages/opencode/src/config/tui.ts:69]

V1 host 解析 `attention.sounds` 后，会把 sound paths 按 config file 所在目录解析成 host-local path。[E: packages/opencode/src/config/tui.ts:108] plugin spec 也由 host 按 config file path resolve，并记录 plugin origin scope。[E: packages/opencode/src/config/tui.ts:85] plugin origins 会 deduplicate 后重新写入 merged result。[E: packages/opencode/src/config/tui.ts:157]

加载优先级为：global `tui.json` 最低，循环读取 `Global.Path.config` 下的 `tui` 文件。[E: packages/opencode/src/config/tui.ts:182] `OPENCODE_TUI_CONFIG` 是显式 config file，应用顺序在 global 之后、project 和 `.opencode` config 之前。[E: packages/opencode/src/config/tui.ts:187] project `tui` files 由 `ConfigPaths.files` 反转成 root-first 后应用。[E: packages/opencode/src/config/paths.ts:16] [E: packages/opencode/src/config/tui.ts:194] `.opencode` directories 和 `OPENCODE_CONFIG_DIR` 过滤成 `dirs` 后再应用。[E: packages/opencode/src/config/tui.ts:201] 最终 host 调用 `TuiConfig.resolve(..., { terminalSuspend: process.platform !== "win32" })`。[E: packages/opencode/src/config/tui.ts:210]

## V2 / Package Boundary

`specs/tui-package.md` 的目标 dependency graph 是 `packages/opencode` 和 `packages/cli` 都消费 `@opencode-ai/tui`。[E: specs/tui-package.md:19] 同一规范要求 CLI hosts 继续拥有 command definitions、server lifecycle、authentication、config discovery、precedence、migration、environment substitution、plugin discovery/installation。[E: specs/tui-package.md:74] `@opencode-ai/tui/config` 拥有 schema、defaults、keybind resolution 和 resolved config type。[E: specs/tui-package.md:300]

V2 preview CLI 的 `runTui` 直接调用 `@opencode-ai/tui` 的 `run`，传入默认 `TuiConfig.resolve({}, { terminalSuspend: false })` 结果和 `gracefulFetch`。[E: packages/cli/src/tui.ts:6] 因此当前 `packages/cli` host 没有复用 V1 `packages/opencode/src/config/tui.ts` 的文件发现流程。[I]

## TUI Config Catalog

| key | type/default | 含义 | V1/V2 关系 |
| --- | --- | --- | --- |
| `$schema` | optional string；schema default omitted | TUI schema reference。[E: packages/tui/src/config/index.tsx:54] | V1 host 读写；V2 package schema owner。 |
| `theme` | optional string | selected theme id。[E: packages/tui/src/config/index.tsx:55] | legacy `opencode.json` top-level `theme` 可迁移到 `tui.json`。[E: packages/opencode/src/config/tui-migrate.ts:38] |
| `keybinds` | optional keybind overrides | per-command keybinding overrides。[E: packages/tui/src/config/index.tsx:56] | V1 host drops unknown keybind names before schema parse。[E: packages/opencode/src/config/tui.ts:72] |
| `plugin` | optional array of plugin specs | TUI plugin packages。[E: packages/tui/src/config/index.tsx:57] | V1 host resolves package spec by source file and tracks origins。[E: packages/opencode/src/config/tui.ts:91] |
| `plugin_enabled` | optional record boolean | enable/disable TUI plugin by id/name。[E: packages/tui/src/config/index.tsx:58] | package schema field；host just loads and merges it。[I] |
| `leader_timeout` | optional positive int；resolved default `2000` | leader key timeout in ms。[E: packages/tui/src/config/index.tsx:21] | `resolve` uses `LeaderTimeoutDefault` when omitted。[E: packages/tui/src/config/index.tsx:114] |
| `attention` | optional object | notifications and sound settings。[E: packages/tui/src/config/index.tsx:36] | V1 host resolves sound paths; package owns defaults。 |
| `attention.enabled` | optional boolean；resolved default false | attention feature enabled flag。[E: packages/tui/src/config/index.tsx:103] | package default。 |
| `attention.notifications` | optional boolean；resolved default true | OS/terminal notification flag。[E: packages/tui/src/config/index.tsx:104] | package default。 |
| `attention.sound` | optional boolean；resolved default true | sound playback flag。[E: packages/tui/src/config/index.tsx:105] | package default。 |
| `attention.volume` | optional number 0..1；resolved default 0.4 | sound volume。[E: packages/tui/src/config/index.tsx:40] | package enforces range and default。[E: packages/tui/src/config/index.tsx:106] |
| `attention.sound_pack` | optional string；resolved default `opencode.default` | sound pack id。[E: packages/tui/src/config/index.tsx:41] | package default。[E: packages/tui/src/config/index.tsx:107] |
| `attention.sounds.default` | optional string | custom sound path for default event；`sounds` is a record from `AttentionSoundName` to optional string。[E: packages/tui/src/config/index.tsx:9] [E: packages/tui/src/config/index.tsx:34] | V1 host resolves relative path。[E: packages/opencode/src/config/tui.ts:113] |
| `attention.sounds.question` | optional string | custom sound path for question event；`sounds` is a record from `AttentionSoundName` to optional string。[E: packages/tui/src/config/index.tsx:10] [E: packages/tui/src/config/index.tsx:34] | same `AttentionSoundName` union。 |
| `attention.sounds.permission` | optional string | custom sound path for permission event；`sounds` is a record from `AttentionSoundName` to optional string。[E: packages/tui/src/config/index.tsx:11] [E: packages/tui/src/config/index.tsx:34] | same `AttentionSoundName` union。 |
| `attention.sounds.error` | optional string | custom sound path for error event；`sounds` is a record from `AttentionSoundName` to optional string。[E: packages/tui/src/config/index.tsx:12] [E: packages/tui/src/config/index.tsx:34] | same `AttentionSoundName` union。 |
| `attention.sounds.done` | optional string | custom sound path for done event；`sounds` is a record from `AttentionSoundName` to optional string。[E: packages/tui/src/config/index.tsx:13] [E: packages/tui/src/config/index.tsx:34] | same `AttentionSoundName` union。 |
| `attention.sounds.subagent_done` | optional string | custom sound path for subagent completion event；`sounds` is a record from `AttentionSoundName` to optional string。[E: packages/tui/src/config/index.tsx:14] [E: packages/tui/src/config/index.tsx:34] | same `AttentionSoundName` union。 |
| `prompt.max_height` | optional positive int | prompt textarea max height。[E: packages/tui/src/config/index.tsx:47] | package schema field。 |
| `prompt.max_width` | optional positive int or `"auto"` | home prompt width cap。[E: packages/tui/src/config/index.tsx:48] | package schema field。 |
| `scroll_speed` | optional number >= 0.001 | TUI scroll speed。[E: packages/tui/src/config/index.tsx:62] | legacy nested `tui.scroll_speed` migrates to top-level `scroll_speed`。[E: packages/opencode/src/config/tui-migrate.ts:77] |
| `scroll_acceleration.enabled` | boolean | scroll acceleration flag。[E: packages/tui/src/config/index.tsx:27] | legacy nested `tui.scroll_acceleration` migrates to top-level object。[E: packages/opencode/src/config/tui-migrate.ts:79] |
| `diff_style` | optional `auto`/`stacked` | diff rendering style。[E: packages/tui/src/config/index.tsx:30] | legacy nested `tui.diff_style` migrates to top-level `diff_style`。[E: packages/opencode/src/config/tui-migrate.ts:80] |
| `mouse` | optional boolean；resolved default true | enable/disable mouse capture。[E: packages/tui/src/config/index.tsx:65] | `resolve` defaults to true。[E: packages/tui/src/config/index.tsx:115] |

## Keybind Semantics

Keybind override values can be `false`、`"none"`、one binding item or array of binding items。[E: packages/tui/src/config/keybind.ts:27] [E: packages/tui/src/config/keybind.ts:28] 默认 leader key 是 `ctrl+x`。[E: packages/tui/src/config/keybind.ts:41] `resolve` converts parsed overrides into a binding lookup using `CommandMap` and binding defaults。[E: packages/tui/src/config/index.tsx:110]

When `terminalSuspend` is false, `resolve` disables `terminal_suspend` and adds `ctrl+z` to `input_undo` if the user did not configure it。[E: packages/tui/src/config/index.tsx:90] This is why the V2 preview CLI can pass `terminalSuspend: false` and still keep `ctrl+z` useful inside the TUI instead of suspending the process。[I]

## Legacy Migration

`migrateTuiConfig` extracts `theme`、`keybinds`、`tui` from legacy opencode config data。[E: packages/opencode/src/config/tui-migrate.ts:38] It skips a directory if the target `tui.json` already exists。[E: packages/opencode/src/config/tui-migrate.ts:49] It parses JSONC with trailing commas。[E: packages/opencode/src/config/tui-migrate.ts:34] The generated payload includes `$schema` and whichever migrated keys are present。[E: packages/opencode/src/config/tui-migrate.ts:53]

After writing `tui.json`, migration backs up the original file to `.tui-migration.bak` if needed。[E: packages/opencode/src/config/tui-migrate.ts:89] It then removes `theme`、`keybinds`、`tui` from the original `opencode.json` using JSONC edits。[E: packages/opencode/src/config/tui-migrate.ts:99] Migration scans global `opencode` config, root-first project `opencode.json/jsonc`, config directories, and explicit `OPENCODE_CONFIG` if set。[E: packages/opencode/src/config/tui-migrate.ts:115]

## Sources

- `packages/opencode/src/config/tui.ts`
- `packages/opencode/src/config/tui-migrate.ts`
- `packages/opencode/src/config/tui-host-attention.ts`
- `packages/opencode/src/config/paths.ts`
- `packages/tui/src/config/index.tsx`
- `packages/tui/src/config/keybind.ts`
- `packages/cli/src/tui.ts`
- `specs/tui-package.md`

## 相关

- `tui.theming`
- `tui.keybindings`
- `ref.keybinds`
- `ref.themes`
- `cli.lildax-framework`

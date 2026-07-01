---
id: ref.formatters
title: V1 Formatter Catalog
kind: reference
tier: T3
v: v1
source:
  - packages/opencode/src/format/formatter.ts
  - packages/opencode/src/format/index.ts
symbols:
  - Formatter
  - Info
related:
  - integrations.formatters
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V1 formatter catalog 是 `packages/opencode/src/format/formatter.ts` 中导出的 `Info` 集合；当前 HEAD 有 26 个内建 formatter [I]。

## 能回答的问题

- V1 默认知道哪些 formatter？
- 每个 formatter 绑定哪些扩展名、运行什么命令、何时启用？
- `ruff` 和 `uv format` 为什么会互斥？

## 运行路径

Formatter `Info` 包含 `name`、可选 `environment`、`extensions` 和 `enabled(context)`；`enabled(context)` 返回 command argv 或 `false` [E: packages/opencode/src/format/formatter.ts:12] [E: packages/opencode/src/format/formatter.ts:13] [E: packages/opencode/src/format/formatter.ts:14] [E: packages/opencode/src/format/formatter.ts:15]。V1 formatter service 在 `cfg.formatter` 为 truthy 时加载 `Object.values(Formatter)`，再把每个内建 formatter 注册进 map [E: packages/opencode/src/format/index.ts:120] [E: packages/opencode/src/format/index.ts:130] [E: packages/opencode/src/format/index.ts:131]。当配置项提供同名 formatter 时，配置可以禁用内建项，也可以用自定义 command、environment 和 extensions 覆盖或新增 formatter [E: packages/opencode/src/format/index.ts:145] [E: packages/opencode/src/format/index.ts:149] [E: packages/opencode/src/format/index.ts:155]。

格式化单个文件时，service 先按文件扩展名筛选 formatter，再通过 `getCommand(item)` 执行 `enabled()`，最后把 command 中的 `$FILE` 替换成目标 filepath 并启动子进程 [E: packages/opencode/src/format/index.ts:58] [E: packages/opencode/src/format/index.ts:61] [E: packages/opencode/src/format/index.ts:82] [E: packages/opencode/src/format/index.ts:86]。禁用 `ruff` 或 `uv` 时，V1 会同时删除两者 [E: packages/opencode/src/format/index.ts:139] [E: packages/opencode/src/format/index.ts:141] [E: packages/opencode/src/format/index.ts:142]；这表示二者在配置禁用语义上被当作同一 formatter backend 家族处理 [I]。

## Catalog

| Formatter | Extensions | Command | 启用条件 |
| --- | --- | --- | --- |
| `gofmt` | `.go` [E: packages/opencode/src/format/formatter.ts:20] | `gofmt -w $FILE` [E: packages/opencode/src/format/formatter.ts:24] | `gofmt` 在 PATH 中 [E: packages/opencode/src/format/formatter.ts:22] |
| `mix` | `.ex`, `.exs`, `.eex`, `.heex`, `.leex`, `.neex`, `.sface` [E: packages/opencode/src/format/formatter.ts:30] | `mix format $FILE` [E: packages/opencode/src/format/formatter.ts:34] | `mix` 在 PATH 中 [E: packages/opencode/src/format/formatter.ts:32] |
| `prettier` | JS/TS、HTML/CSS、Vue/Svelte、JSON/YAML/TOML/XML、Markdown/MDX、GraphQL [E: packages/opencode/src/format/formatter.ts:43] [E: packages/opencode/src/format/formatter.ts:69] | `prettier --write $FILE` [E: packages/opencode/src/format/formatter.ts:80] | 向上找到 `package.json` 且 dependencies/devDependencies 包含 `prettier` [E: packages/opencode/src/format/formatter.ts:72] [E: packages/opencode/src/format/formatter.ts:78] |
| `oxfmt` | JS/TS family [E: packages/opencode/src/format/formatter.ts:92] | `oxfmt $FILE` [E: packages/opencode/src/format/formatter.ts:103] | `experimentalOxfmt` 为 true，且 package deps/devDeps 包含 `oxfmt` [E: packages/opencode/src/format/formatter.ts:94] [E: packages/opencode/src/format/formatter.ts:101] |
| `biome` | JS/TS、HTML/CSS、Vue/Svelte、JSON/YAML/TOML/XML、Markdown/MDX、GraphQL [E: packages/opencode/src/format/formatter.ts:115] [E: packages/opencode/src/format/formatter.ts:141] | `biome format --write $FILE` [E: packages/opencode/src/format/formatter.ts:149] | 向上存在 `biome.json` 或 `biome.jsonc`，且能解析 `@biomejs/biome` [E: packages/opencode/src/format/formatter.ts:144] [E: packages/opencode/src/format/formatter.ts:148] |
| `zig` | `.zig`, `.zon` [E: packages/opencode/src/format/formatter.ts:158] | `zig fmt $FILE` [E: packages/opencode/src/format/formatter.ts:162] | `zig` 在 PATH 中 [E: packages/opencode/src/format/formatter.ts:160] |
| `clang-format` | C/C++/Objective-C/Header/Arduino extensions [E: packages/opencode/src/format/formatter.ts:168] | `clang-format -i $FILE` [E: packages/opencode/src/format/formatter.ts:173] | 向上存在 `.clang-format` 且 `clang-format` 在 PATH 中 [E: packages/opencode/src/format/formatter.ts:170] [E: packages/opencode/src/format/formatter.ts:172] |
| `ktlint` | `.kt`, `.kts` [E: packages/opencode/src/format/formatter.ts:181] | `ktlint -F $FILE` [E: packages/opencode/src/format/formatter.ts:185] | `ktlint` 在 PATH 中 [E: packages/opencode/src/format/formatter.ts:183] |
| `ruff` | `.py`, `.pyi` [E: packages/opencode/src/format/formatter.ts:191] | `ruff format $FILE` [E: packages/opencode/src/format/formatter.ts:202] | `ruff` 在 PATH 中，且找到 ruff config，或在 `requirements.txt`、`pyproject.toml`、`Pipfile` 中包含 `ruff` 文本 [E: packages/opencode/src/format/formatter.ts:193] [E: packages/opencode/src/format/formatter.ts:194] [E: packages/opencode/src/format/formatter.ts:200] [E: packages/opencode/src/format/formatter.ts:202] [E: packages/opencode/src/format/formatter.ts:211] |
| `air` | `.R` [E: packages/opencode/src/format/formatter.ts:220] | `air format $FILE` [E: packages/opencode/src/format/formatter.ts:231] | `air` 在 PATH 中，且 `air --help` 首行同时包含 `R language` 和 `formatter` [E: packages/opencode/src/format/formatter.ts:222] [E: packages/opencode/src/format/formatter.ts:229] [E: packages/opencode/src/format/formatter.ts:230] [E: packages/opencode/src/format/formatter.ts:231] |
| `uv` | `.py`, `.pyi` [E: packages/opencode/src/format/formatter.ts:238] | `uv format -- $FILE` [E: packages/opencode/src/format/formatter.ts:244] | `ruff` 未启用，`uv` 在 PATH 中，且 `uv format --help` 成功 [E: packages/opencode/src/format/formatter.ts:240] [E: packages/opencode/src/format/formatter.ts:243] |
| `rubocop` | `.rb`, `.rake`, `.gemspec`, `.ru` [E: packages/opencode/src/format/formatter.ts:251] | `rubocop --autocorrect $FILE` [E: packages/opencode/src/format/formatter.ts:255] | `rubocop` 在 PATH 中 [E: packages/opencode/src/format/formatter.ts:253] |
| `standardrb` | `.rb`, `.rake`, `.gemspec`, `.ru` [E: packages/opencode/src/format/formatter.ts:261] | `standardrb --fix $FILE` [E: packages/opencode/src/format/formatter.ts:265] | `standardrb` 在 PATH 中 [E: packages/opencode/src/format/formatter.ts:263] |
| `htmlbeautifier` | `.erb`, `.html.erb` [E: packages/opencode/src/format/formatter.ts:271] | `htmlbeautifier $FILE` [E: packages/opencode/src/format/formatter.ts:275] | `htmlbeautifier` 在 PATH 中 [E: packages/opencode/src/format/formatter.ts:273] |
| `dart` | `.dart` [E: packages/opencode/src/format/formatter.ts:281] | `dart format $FILE` [E: packages/opencode/src/format/formatter.ts:285] | `dart` 在 PATH 中 [E: packages/opencode/src/format/formatter.ts:283] |
| `ocamlformat` | `.ml`, `.mli` [E: packages/opencode/src/format/formatter.ts:291] | `ocamlformat -i $FILE` [E: packages/opencode/src/format/formatter.ts:295] | `ocamlformat` 在 PATH 中且向上存在 `.ocamlformat` [E: packages/opencode/src/format/formatter.ts:293] [E: packages/opencode/src/format/formatter.ts:294] |
| `terraform` | `.tf`, `.tfvars` [E: packages/opencode/src/format/formatter.ts:302] | `terraform fmt $FILE` [E: packages/opencode/src/format/formatter.ts:306] | `terraform` 在 PATH 中 [E: packages/opencode/src/format/formatter.ts:304] |
| `latexindent` | `.tex` [E: packages/opencode/src/format/formatter.ts:312] | `latexindent -w -s $FILE` [E: packages/opencode/src/format/formatter.ts:316] | `latexindent` 在 PATH 中 [E: packages/opencode/src/format/formatter.ts:314] |
| `gleam` | `.gleam` [E: packages/opencode/src/format/formatter.ts:322] | `gleam format $FILE` [E: packages/opencode/src/format/formatter.ts:326] | `gleam` 在 PATH 中 [E: packages/opencode/src/format/formatter.ts:324] |
| `shfmt` | `.sh`, `.bash` [E: packages/opencode/src/format/formatter.ts:332] | `shfmt -w $FILE` [E: packages/opencode/src/format/formatter.ts:336] | `shfmt` 在 PATH 中 [E: packages/opencode/src/format/formatter.ts:334] |
| `nixfmt` | `.nix` [E: packages/opencode/src/format/formatter.ts:342] | `nixfmt $FILE` [E: packages/opencode/src/format/formatter.ts:346] | `nixfmt` 在 PATH 中 [E: packages/opencode/src/format/formatter.ts:344] |
| `rustfmt` | `.rs` [E: packages/opencode/src/format/formatter.ts:352] | `rustfmt $FILE` [E: packages/opencode/src/format/formatter.ts:356] | `rustfmt` 在 PATH 中 [E: packages/opencode/src/format/formatter.ts:354] |
| `pint` | `.php` [E: packages/opencode/src/format/formatter.ts:362] | `./vendor/bin/pint $FILE` [E: packages/opencode/src/format/formatter.ts:370] | `composer.json` 的 `require` 或 `require-dev` 包含 `laravel/pint` [E: packages/opencode/src/format/formatter.ts:364] [E: packages/opencode/src/format/formatter.ts:370] |
| `ormolu` | `.hs` [E: packages/opencode/src/format/formatter.ts:378] | `ormolu -i $FILE` [E: packages/opencode/src/format/formatter.ts:382] | `ormolu` 在 PATH 中 [E: packages/opencode/src/format/formatter.ts:380] |
| `cljfmt` | `.clj`, `.cljs`, `.cljc`, `.edn` [E: packages/opencode/src/format/formatter.ts:388] | `cljfmt fix --quiet $FILE` [E: packages/opencode/src/format/formatter.ts:392] | `cljfmt` 在 PATH 中 [E: packages/opencode/src/format/formatter.ts:390] |
| `dfmt` | `.d` [E: packages/opencode/src/format/formatter.ts:398] | `dfmt -i $FILE` [E: packages/opencode/src/format/formatter.ts:402] | `dfmt` 在 PATH 中 [E: packages/opencode/src/format/formatter.ts:400] |

## 命名陷阱

`formatter.ts` 是 V1 runtime 的 formatter catalog，和 V2 `packages/core/src/tool/tools.ts`/`builtins.ts` 的 tool registry 不是同一层概念 [I]。`OPENCODE_EXPERIMENTAL_NATIVE_LLM` 影响的是 V1 LLM provider seam，不会把 formatter catalog 迁移成 V2 tool [I]。

## Sources

- `packages/opencode/src/format/formatter.ts`
- `packages/opencode/src/format/index.ts`

## 相关

- `integrations.formatters`

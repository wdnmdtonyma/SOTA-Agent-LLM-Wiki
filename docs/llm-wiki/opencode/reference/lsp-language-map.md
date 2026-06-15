---
id: ref.lsp-language-map
title: LSP Language Map
kind: reference
tier: T3
v: v1
source:
  - packages/opencode/src/lsp/language.ts
  - packages/opencode/src/lsp/client.ts
symbols:
  - LANGUAGE_EXTENSIONS
related:
  - integrations.lsp
evidence: explicit
status: verified
updated: 92c70c9c3
---

> V1 LSP client 声明了一张扩展名到 Language Server Protocol `languageId` 的映射表；runtime 实际只用 `path.extname(file)` 的结果查表，没有命中时会把文件作为 `plaintext` 打开。

## 能回答的问题

- 某个扩展名在 V1 LSP `didOpen` 中会变成哪个 `languageId`？
- 哪些扩展名共享同一个语言 ID，例如 JavaScript、TypeScript、Ruby、ERB 或 Zig？
- 为什么没有登记的扩展名不会阻止 LSP 打开文件？

## 运行位置

`LANGUAGE_EXTENSIONS` 是一个 `Record<string, string>` 常量对象 [E: packages/opencode/src/lsp/language.ts:1]；其中大多数 key 是扩展名，也包含 `makefile` 这样的非点号文件名 key [E: packages/opencode/src/lsp/language.ts:59]。V1 LSP client 在打开文件时用 `path.extname(file)` 提取 extension，再用 `LANGUAGE_EXTENSIONS[extension] ?? "plaintext"` 计算 `languageID` [E: packages/opencode/src/lsp/client.ts:559] [E: packages/opencode/src/lsp/client.ts:560]。该 `languageID` 随后写入 `textDocument.languageId` [E: packages/opencode/src/lsp/client.ts:614]。这意味着普通 `makefile` 文件不会命中声明表里的 bare `makefile` key，普通 `*.html.erb`、`*.js.erb`、`*.css.erb`、`*.json.erb` 文件也会按最后的 `.erb` 后缀查表，而不是按复合 key 查表 [I]。该 catalog 是 V1 LSP client 的 languageId 声明表和 runtime 查表行为，不是 V2 core tool registry 的一部分 [I]。

## Catalog

| Declared key / runtime note | languageId | Source |
| --- | --- | --- |
| `.abap` | `abap` | [E: packages/opencode/src/lsp/language.ts:2] |
| `.bat` | `bat` | [E: packages/opencode/src/lsp/language.ts:3] |
| `.bib` | `bibtex` | [E: packages/opencode/src/lsp/language.ts:4] |
| `.bibtex` | `bibtex` | [E: packages/opencode/src/lsp/language.ts:5] |
| `.clj` | `clojure` | [E: packages/opencode/src/lsp/language.ts:6] |
| `.cljs` | `clojure` | [E: packages/opencode/src/lsp/language.ts:7] |
| `.cljc` | `clojure` | [E: packages/opencode/src/lsp/language.ts:8] |
| `.edn` | `clojure` | [E: packages/opencode/src/lsp/language.ts:9] |
| `.coffee` | `coffeescript` | [E: packages/opencode/src/lsp/language.ts:10] |
| `.c` | `c` | [E: packages/opencode/src/lsp/language.ts:11] |
| `.cpp` | `cpp` | [E: packages/opencode/src/lsp/language.ts:12] |
| `.cxx` | `cpp` | [E: packages/opencode/src/lsp/language.ts:13] |
| `.cc` | `cpp` | [E: packages/opencode/src/lsp/language.ts:14] |
| `.c++` | `cpp` | [E: packages/opencode/src/lsp/language.ts:15] |
| `.cs` | `csharp` | [E: packages/opencode/src/lsp/language.ts:16] |
| `.csx` | `csharp` | [E: packages/opencode/src/lsp/language.ts:17] |
| `.css` | `css` | [E: packages/opencode/src/lsp/language.ts:18] |
| `.d` | `d` | [E: packages/opencode/src/lsp/language.ts:19] |
| `.pas` | `pascal` | [E: packages/opencode/src/lsp/language.ts:20] |
| `.pascal` | `pascal` | [E: packages/opencode/src/lsp/language.ts:21] |
| `.diff` | `diff` | [E: packages/opencode/src/lsp/language.ts:22] |
| `.patch` | `diff` | [E: packages/opencode/src/lsp/language.ts:23] |
| `.dart` | `dart` | [E: packages/opencode/src/lsp/language.ts:24] |
| `.dockerfile` | `dockerfile` | [E: packages/opencode/src/lsp/language.ts:25] |
| `.ex` | `elixir` | [E: packages/opencode/src/lsp/language.ts:26] |
| `.exs` | `elixir` | [E: packages/opencode/src/lsp/language.ts:27] |
| `.erl` | `erlang` | [E: packages/opencode/src/lsp/language.ts:28] |
| `.ets` | `typescript` | [E: packages/opencode/src/lsp/language.ts:29] |
| `.hrl` | `erlang` | [E: packages/opencode/src/lsp/language.ts:30] |
| `.fs` | `fsharp` | [E: packages/opencode/src/lsp/language.ts:31] |
| `.fsi` | `fsharp` | [E: packages/opencode/src/lsp/language.ts:32] |
| `.fsx` | `fsharp` | [E: packages/opencode/src/lsp/language.ts:33] |
| `.fsscript` | `fsharp` | [E: packages/opencode/src/lsp/language.ts:34] |
| `.gitcommit` | `git-commit` | [E: packages/opencode/src/lsp/language.ts:35] |
| `.gitrebase` | `git-rebase` | [E: packages/opencode/src/lsp/language.ts:36] |
| `.go` | `go` | [E: packages/opencode/src/lsp/language.ts:37] |
| `.groovy` | `groovy` | [E: packages/opencode/src/lsp/language.ts:38] |
| `.gleam` | `gleam` | [E: packages/opencode/src/lsp/language.ts:39] |
| `.hbs` | `handlebars` | [E: packages/opencode/src/lsp/language.ts:40] |
| `.handlebars` | `handlebars` | [E: packages/opencode/src/lsp/language.ts:41] |
| `.hs` | `haskell` | [E: packages/opencode/src/lsp/language.ts:42] |
| `.lhs` | `haskell` | [E: packages/opencode/src/lsp/language.ts:43] |
| `.html` | `html` | [E: packages/opencode/src/lsp/language.ts:44] |
| `.htm` | `html` | [E: packages/opencode/src/lsp/language.ts:45] |
| `.ini` | `ini` | [E: packages/opencode/src/lsp/language.ts:46] |
| `.java` | `java` | [E: packages/opencode/src/lsp/language.ts:47] |
| `.jl` | `julia` | [E: packages/opencode/src/lsp/language.ts:48] |
| `.js` | `javascript` | [E: packages/opencode/src/lsp/language.ts:49] |
| `.kt` | `kotlin` | [E: packages/opencode/src/lsp/language.ts:50] |
| `.kts` | `kotlin` | [E: packages/opencode/src/lsp/language.ts:51] |
| `.jsx` | `javascriptreact` | [E: packages/opencode/src/lsp/language.ts:52] |
| `.json` | `json` | [E: packages/opencode/src/lsp/language.ts:53] |
| `.tex` | `latex` | [E: packages/opencode/src/lsp/language.ts:54] |
| `.latex` | `latex` | [E: packages/opencode/src/lsp/language.ts:55] |
| `.less` | `less` | [E: packages/opencode/src/lsp/language.ts:56] |
| `.lua` | `lua` | [E: packages/opencode/src/lsp/language.ts:57] |
| `.makefile` | `makefile` | [E: packages/opencode/src/lsp/language.ts:58] |
| `makefile` declared key；普通无扩展名 `makefile` 不会由当前 `path.extname(file)` runtime 命中 [I] | `makefile` | [E: packages/opencode/src/lsp/language.ts:59] [E: packages/opencode/src/lsp/client.ts:559] |
| `.md` | `markdown` | [E: packages/opencode/src/lsp/language.ts:60] |
| `.markdown` | `markdown` | [E: packages/opencode/src/lsp/language.ts:61] |
| `.m` | `objective-c` | [E: packages/opencode/src/lsp/language.ts:62] |
| `.mm` | `objective-cpp` | [E: packages/opencode/src/lsp/language.ts:63] |
| `.pl` | `perl` | [E: packages/opencode/src/lsp/language.ts:64] |
| `.pm` | `perl` | [E: packages/opencode/src/lsp/language.ts:65] |
| `.pm6` | `perl6` | [E: packages/opencode/src/lsp/language.ts:66] |
| `.php` | `php` | [E: packages/opencode/src/lsp/language.ts:67] |
| `.ps1` | `powershell` | [E: packages/opencode/src/lsp/language.ts:68] |
| `.psm1` | `powershell` | [E: packages/opencode/src/lsp/language.ts:69] |
| `.pug` | `jade` | [E: packages/opencode/src/lsp/language.ts:70] |
| `.jade` | `jade` | [E: packages/opencode/src/lsp/language.ts:71] |
| `.py` | `python` | [E: packages/opencode/src/lsp/language.ts:72] |
| `.r` | `r` | [E: packages/opencode/src/lsp/language.ts:73] |
| `.cshtml` | `razor` | [E: packages/opencode/src/lsp/language.ts:74] |
| `.razor` | `razor` | [E: packages/opencode/src/lsp/language.ts:75] |
| `.rb` | `ruby` | [E: packages/opencode/src/lsp/language.ts:76] |
| `.rake` | `ruby` | [E: packages/opencode/src/lsp/language.ts:77] |
| `.gemspec` | `ruby` | [E: packages/opencode/src/lsp/language.ts:78] |
| `.ru` | `ruby` | [E: packages/opencode/src/lsp/language.ts:79] |
| `.erb` | `erb` | [E: packages/opencode/src/lsp/language.ts:80] |
| `.html.erb` declared key；普通 `*.html.erb` 会按 `.erb` 后缀查表 [I] | `erb` | [E: packages/opencode/src/lsp/language.ts:81] [E: packages/opencode/src/lsp/client.ts:559] |
| `.js.erb` declared key；普通 `*.js.erb` 会按 `.erb` 后缀查表 [I] | `erb` | [E: packages/opencode/src/lsp/language.ts:82] [E: packages/opencode/src/lsp/client.ts:559] |
| `.css.erb` declared key；普通 `*.css.erb` 会按 `.erb` 后缀查表 [I] | `erb` | [E: packages/opencode/src/lsp/language.ts:83] [E: packages/opencode/src/lsp/client.ts:559] |
| `.json.erb` declared key；普通 `*.json.erb` 会按 `.erb` 后缀查表 [I] | `erb` | [E: packages/opencode/src/lsp/language.ts:84] [E: packages/opencode/src/lsp/client.ts:559] |
| `.rs` | `rust` | [E: packages/opencode/src/lsp/language.ts:85] |
| `.scss` | `scss` | [E: packages/opencode/src/lsp/language.ts:86] |
| `.sass` | `sass` | [E: packages/opencode/src/lsp/language.ts:87] |
| `.scala` | `scala` | [E: packages/opencode/src/lsp/language.ts:88] |
| `.shader` | `shaderlab` | [E: packages/opencode/src/lsp/language.ts:89] |
| `.sh` | `shellscript` | [E: packages/opencode/src/lsp/language.ts:90] |
| `.bash` | `shellscript` | [E: packages/opencode/src/lsp/language.ts:91] |
| `.zsh` | `shellscript` | [E: packages/opencode/src/lsp/language.ts:92] |
| `.ksh` | `shellscript` | [E: packages/opencode/src/lsp/language.ts:93] |
| `.sql` | `sql` | [E: packages/opencode/src/lsp/language.ts:94] |
| `.svelte` | `svelte` | [E: packages/opencode/src/lsp/language.ts:95] |
| `.swift` | `swift` | [E: packages/opencode/src/lsp/language.ts:96] |
| `.ts` | `typescript` | [E: packages/opencode/src/lsp/language.ts:97] |
| `.tsx` | `typescriptreact` | [E: packages/opencode/src/lsp/language.ts:98] |
| `.mts` | `typescript` | [E: packages/opencode/src/lsp/language.ts:99] |
| `.cts` | `typescript` | [E: packages/opencode/src/lsp/language.ts:100] |
| `.mtsx` | `typescriptreact` | [E: packages/opencode/src/lsp/language.ts:101] |
| `.ctsx` | `typescriptreact` | [E: packages/opencode/src/lsp/language.ts:102] |
| `.xml` | `xml` | [E: packages/opencode/src/lsp/language.ts:103] |
| `.xsl` | `xsl` | [E: packages/opencode/src/lsp/language.ts:104] |
| `.yaml` | `yaml` | [E: packages/opencode/src/lsp/language.ts:105] |
| `.yml` | `yaml` | [E: packages/opencode/src/lsp/language.ts:106] |
| `.mjs` | `javascript` | [E: packages/opencode/src/lsp/language.ts:107] |
| `.cjs` | `javascript` | [E: packages/opencode/src/lsp/language.ts:108] |
| `.vue` | `vue` | [E: packages/opencode/src/lsp/language.ts:109] |
| `.zig` | `zig` | [E: packages/opencode/src/lsp/language.ts:110] |
| `.zon` | `zig` | [E: packages/opencode/src/lsp/language.ts:111] |
| `.astro` | `astro` | [E: packages/opencode/src/lsp/language.ts:112] |
| `.ml` | `ocaml` | [E: packages/opencode/src/lsp/language.ts:113] |
| `.mli` | `ocaml` | [E: packages/opencode/src/lsp/language.ts:114] |
| `.tf` | `terraform` | [E: packages/opencode/src/lsp/language.ts:115] |
| `.tfvars` | `terraform-vars` | [E: packages/opencode/src/lsp/language.ts:116] |
| `.hcl` | `hcl` | [E: packages/opencode/src/lsp/language.ts:117] |
| `.nix` | `nix` | [E: packages/opencode/src/lsp/language.ts:118] |
| `.typ` | `typst` | [E: packages/opencode/src/lsp/language.ts:119] |
| `.typc` | `typst` | [E: packages/opencode/src/lsp/language.ts:120] |

## Sources

- `packages/opencode/src/lsp/language.ts`
- `packages/opencode/src/lsp/client.ts`

## 相关

- `integrations.lsp`

---
id: ref.lsp-servers
title: V1 LSP Server Catalog
kind: reference
tier: T3
v: v1
source:
  - packages/opencode/src/lsp/server.ts
  - packages/opencode/src/lsp/lsp.ts
  - packages/core/src/npm.ts
  - packages/opencode/src/lsp/language.ts
symbols:
  - Info
  - LSPServer
related:
  - integrations.lsp
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V1 LSP server catalog 是 `packages/opencode/src/lsp/server.ts` 中导出的 `Info` 集合；当前 HEAD 有 38 个内建 server [I]。

## 能回答的问题

- V1 会为哪些语言尝试启动 LSP server？
- 每个 server 的 id、扩展名、root 检测和 server 获取方式是什么？
- 哪些 server 会显式下载，哪些只依赖 PATH/local install，哪些通过 `Npm.which()` fallback？

## Catalog 机制

LSP `Info` 由 `id`、`extensions`、可选 `global`、`root(file, ctx)` 和 `spawn(root, ctx, flags)` 组成 [E: packages/opencode/src/lsp/server.ts:80] [E: packages/opencode/src/lsp/server.ts:85]。`NearestRoot()` 会向上查找目标文件，找不到 include pattern 时回退到 instance directory；`StrictNearestRoot()` 找不到 include pattern 时返回 `undefined` [E: packages/opencode/src/lsp/server.ts:51] [E: packages/opencode/src/lsp/server.ts:75]。

V1 LSP service 在 `cfg.lsp` 为 false 时直接禁用全部 LSP；否则把 `Object.values(LSPServer)` 装入 server map [E: packages/opencode/src/lsp/lsp.ts:151] [E: packages/opencode/src/lsp/lsp.ts:154] [E: packages/opencode/src/lsp/lsp.ts:155]。`experimentalLspTy` 打开时会移除 `pyright`，关闭时会移除 `ty`，所以 Python 默认路径和 experimental 路径互斥 [E: packages/opencode/src/lsp/lsp.ts:99] [E: packages/opencode/src/lsp/lsp.ts:104]。

`Npm.which(pkg, bin?)` 不是普通 PATH lookup：它把 package cache 放在 `global.cache/packages/<pkg>`，先查该 cache 的 `node_modules/.bin`，找不到时会调用 `Npm.add(pkg)` 安装 package，再重新 pick bin [E: packages/core/src/npm.ts:79] [E: packages/core/src/npm.ts:192] [E: packages/core/src/npm.ts:194] [E: packages/core/src/npm.ts:231] [E: packages/core/src/npm.ts:233]。因此表里的 “Npm.which fallback” 表示 opencode 可在 cache 中安装 npm package，但仍受各 server 自己的 `flags.disableLspDownload` gating 影响 [I]。

## Servers

| id | 扩展名 / root | 获取和启动方式 |
| --- | --- | --- |
| `deno` | `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`; root 需要 `deno.json` 或 `deno.jsonc` [E: packages/opencode/src/lsp/server.ts:91] [E: packages/opencode/src/lsp/server.ts:101] | 直接启动 `deno lsp`，无内建下载路径 [E: packages/opencode/src/lsp/server.ts:103] [E: packages/opencode/src/lsp/server.ts:108] |
| `typescript` | `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.mts`, `.cts`; root 排除 deno project [E: packages/opencode/src/lsp/server.ts:115] [E: packages/opencode/src/lsp/server.ts:121] | 需要本地 `typescript/lib/tsserver.js`，并通过 `Npm.which("typescript-language-server")` 找 server [E: packages/opencode/src/lsp/server.ts:123] [E: packages/opencode/src/lsp/server.ts:125] [E: packages/opencode/src/lsp/server.ts:127] |
| `vue` | `.vue`; root 为 JS package markers [E: packages/opencode/src/lsp/server.ts:144] [E: packages/opencode/src/lsp/server.ts:147] | 先找 `vue-language-server`，否则在允许下载时用 `Npm.which("@vue/language-server")`，启动 `--stdio` [E: packages/opencode/src/lsp/server.ts:149] [E: packages/opencode/src/lsp/server.ts:153] [E: packages/opencode/src/lsp/server.ts:157] [E: packages/opencode/src/lsp/server.ts:158] |
| `eslint` | JS/TS family; root 为 JS package markers [E: packages/opencode/src/lsp/server.ts:173] [E: packages/opencode/src/lsp/server.ts:176] | 需要项目可解析 `eslint`，server zip 缺失且允许下载时从 VSCode ESLint release 下载并解压 [E: packages/opencode/src/lsp/server.ts:178] [E: packages/opencode/src/lsp/server.ts:183] [E: packages/opencode/src/lsp/server.ts:189] [E: packages/opencode/src/lsp/server.ts:207] [E: packages/opencode/src/lsp/server.ts:211] |
| `oxlint` | JS/TS/Vue/Astro/Svelte; root 为 JS package markers [E: packages/opencode/src/lsp/server.ts:224] [E: packages/opencode/src/lsp/server.ts:235] | 查找 local/upward/global `oxlint` 或 `oxc_language_server`，支持 `--lsp` 时用 `oxlint --lsp` [E: packages/opencode/src/lsp/server.ts:258] [E: packages/opencode/src/lsp/server.ts:292] |
| `biome` | JS/TS/CSS/GraphQL/JSON family; root 为 JS package markers [E: packages/opencode/src/lsp/server.ts:297] [E: packages/opencode/src/lsp/server.ts:307] [E: packages/opencode/src/lsp/server.ts:324] | 查找 local/global Biome，或解析 `biome` module 后用 `Npm.which("biome")` 获取，启动 `lsp-proxy --stdio` [E: packages/opencode/src/lsp/server.ts:327] [E: packages/opencode/src/lsp/server.ts:331] [E: packages/opencode/src/lsp/server.ts:338] [E: packages/opencode/src/lsp/server.ts:340] [E: packages/opencode/src/lsp/server.ts:345] |
| `gopls` | `.go`; root 函数先调用 `NearestRoot(["go.work"])`，代码中还保留 `go.mod`/`go.sum` fallback [E: packages/opencode/src/lsp/server.ts:360] [E: packages/opencode/src/lsp/server.ts:365] | PATH 缺失且有 `go`、允许下载时执行 `go install golang.org/x/tools/gopls@latest` [E: packages/opencode/src/lsp/server.ts:367] [E: packages/opencode/src/lsp/server.ts:372] [E: packages/opencode/src/lsp/server.ts:385] |
| `ruby-lsp` | `.rb`, `.rake`, `.gemspec`, `.ru`; root 为 `Gemfile` [E: packages/opencode/src/lsp/server.ts:392] [E: packages/opencode/src/lsp/server.ts:395] | 代码检查 `rubocop`，缺失且允许下载时用 `gem install rubocop --bindir ...`，再启动 `rubocop --lsp` [E: packages/opencode/src/lsp/server.ts:397] [E: packages/opencode/src/lsp/server.ts:405] [E: packages/opencode/src/lsp/server.ts:417] |
| `ty` | `.py`, `.pyi`; root markers 为 `pyproject.toml`、`ty.toml`、setup files、`requirements.txt`、`Pipfile`、`pyrightconfig.json` [E: packages/opencode/src/lsp/server.ts:424] [E: packages/opencode/src/lsp/server.ts:427] [E: packages/opencode/src/lsp/server.ts:434] | 仅 `experimentalLspTy` 打开时启用；查找 PATH 或 venv 中的 `ty`，启动 `ty server` [E: packages/opencode/src/lsp/server.ts:437] [E: packages/opencode/src/lsp/server.ts:480] |
| `pyright` | `.py`, `.pyi`; root 为 Python project markers [E: packages/opencode/src/lsp/server.ts:485] [E: packages/opencode/src/lsp/server.ts:488] | 查找 `pyright-langserver`，否则允许下载时用 `Npm.which("pyright", "pyright-langserver")`，启动 `--stdio` [E: packages/opencode/src/lsp/server.ts:490] [E: packages/opencode/src/lsp/server.ts:524] |
| `elixir-ls` | `.ex`, `.exs`; root 为 `mix.exs` 或 `mix.lock` [E: packages/opencode/src/lsp/server.ts:529] [E: packages/opencode/src/lsp/server.ts:532] | PATH 缺失且有 `elixir`、允许下载时下载 ElixirLS zip、解压并运行 `mix deps.get`/`mix compile` [E: packages/opencode/src/lsp/server.ts:545] [E: packages/opencode/src/lsp/server.ts:552] [E: packages/opencode/src/lsp/server.ts:571] [E: packages/opencode/src/lsp/server.ts:572] [E: packages/opencode/src/lsp/server.ts:573] [E: packages/opencode/src/lsp/server.ts:578] |
| `zls` | `.zig`, `.zon`; root 为 `build.zig` [E: packages/opencode/src/lsp/server.ts:585] [E: packages/opencode/src/lsp/server.ts:588] | PATH 缺失且本机有 `zig`、允许下载时按平台下载最新 zls release asset [E: packages/opencode/src/lsp/server.ts:593] [E: packages/opencode/src/lsp/server.ts:600] [E: packages/opencode/src/lsp/server.ts:624] [E: packages/opencode/src/lsp/server.ts:646] [E: packages/opencode/src/lsp/server.ts:680] |
| `csharp` | `.cs`, `.csx`; root 为 solution/project markers [E: packages/opencode/src/lsp/server.ts:687] [E: packages/opencode/src/lsp/server.ts:690] | 使用 Roslyn language server helper，缺失且允许下载时执行 `dotnet tool install --global roslyn-language-server --prerelease` [E: packages/opencode/src/lsp/server.ts:692] [E: packages/opencode/src/lsp/server.ts:756] |
| `razor` | `.razor`, `.cshtml`; root 为 solution/project markers [E: packages/opencode/src/lsp/server.ts:703] [E: packages/opencode/src/lsp/server.ts:706] | 依赖 Roslyn server，并查找 VSCode Razor extension 中的 Razor server [E: packages/opencode/src/lsp/server.ts:708] [E: packages/opencode/src/lsp/server.ts:711] [E: packages/opencode/src/lsp/server.ts:808] [E: packages/opencode/src/lsp/server.ts:809] [E: packages/opencode/src/lsp/server.ts:810] |
| `fsharp` | `.fs`, `.fsi`, `.fsx`, `.fsscript`; root 为 `.slnx`、`.sln`、`.fsproj` 或 `global.json` [E: packages/opencode/src/lsp/server.ts:823] [E: packages/opencode/src/lsp/server.ts:826] | 查找 `fsautocomplete`，缺失且允许下载时 `dotnet tool install fsautocomplete` [E: packages/opencode/src/lsp/server.ts:828] [E: packages/opencode/src/lsp/server.ts:835] [E: packages/opencode/src/lsp/server.ts:848] |
| `sourcekit-lsp` | `.swift`, `.objc`, `objcpp`; root 为 Swift/Xcode markers [E: packages/opencode/src/lsp/server.ts:856] [E: packages/opencode/src/lsp/server.ts:859] | 查 PATH 或 `xcrun -f sourcekit-lsp`，无内建下载 [E: packages/opencode/src/lsp/server.ts:863] [E: packages/opencode/src/lsp/server.ts:876] [E: packages/opencode/src/lsp/server.ts:883] |
| `rust` | `.rs`; root 为 Cargo markers 或 workspace root [E: packages/opencode/src/lsp/server.ts:890] [E: packages/opencode/src/lsp/server.ts:921] | 需要 `rust-analyzer` 在 PATH 中，启动 `rust-analyzer` [E: packages/opencode/src/lsp/server.ts:923] [E: packages/opencode/src/lsp/server.ts:928] |
| `clangd` | C/C++/header extensions; root 为 compile/config markers [E: packages/opencode/src/lsp/server.ts:935] [E: packages/opencode/src/lsp/server.ts:938] | PATH/bin 缺失且允许下载时下载最新 clangd release 的 zip 或 tar.xz asset，启动时带 `--background-index` 和 `--clang-tidy` [E: packages/opencode/src/lsp/server.ts:940] [E: packages/opencode/src/lsp/server.ts:976] [E: packages/opencode/src/lsp/server.ts:1010] [E: packages/opencode/src/lsp/server.ts:1011] [E: packages/opencode/src/lsp/server.ts:1018] [E: packages/opencode/src/lsp/server.ts:1062] |
| `svelte` | `.svelte`; root 为 JS package markers [E: packages/opencode/src/lsp/server.ts:1069] [E: packages/opencode/src/lsp/server.ts:1072] | 查 `svelteserver`，否则允许下载时用 `Npm.which("svelte-language-server")` [E: packages/opencode/src/lsp/server.ts:1074] [E: packages/opencode/src/lsp/server.ts:1078] [E: packages/opencode/src/lsp/server.ts:1082] [E: packages/opencode/src/lsp/server.ts:1083] |
| `astro` | `.astro`; root 为 JS package markers [E: packages/opencode/src/lsp/server.ts:1096] [E: packages/opencode/src/lsp/server.ts:1099] | 需要 tsserver path，查 `astro-ls`，否则允许下载时用 `Npm.which("@astrojs/language-server")` [E: packages/opencode/src/lsp/server.ts:1101] [E: packages/opencode/src/lsp/server.ts:1107] [E: packages/opencode/src/lsp/server.ts:1111] [E: packages/opencode/src/lsp/server.ts:1115] [E: packages/opencode/src/lsp/server.ts:1116] [E: packages/opencode/src/lsp/server.ts:1125] |
| `jdtls` | `.java`; root 处理 Gradle wrapper/settings/build files、Maven `pom.xml` chain 和 Eclipse `.project`/`.classpath` fallback [E: packages/opencode/src/lsp/server.ts:1150] [E: packages/opencode/src/lsp/server.ts:1165] [E: packages/opencode/src/lsp/server.ts:1182] [E: packages/opencode/src/lsp/server.ts:1187] | 需要 Java 21+，缺失且允许下载时下载 Eclipse JDT LS tarball [E: packages/opencode/src/lsp/server.ts:1189] [E: packages/opencode/src/lsp/server.ts:1197] [E: packages/opencode/src/lsp/server.ts:1206] [E: packages/opencode/src/lsp/server.ts:1207] [E: packages/opencode/src/lsp/server.ts:1210] [E: packages/opencode/src/lsp/server.ts:1248] |
| `kotlin-ls` | `.kt`, `.kts`; root 为 Gradle/Maven/Kotlin project markers [E: packages/opencode/src/lsp/server.ts:1273] [E: packages/opencode/src/lsp/server.ts:1278] [E: packages/opencode/src/lsp/server.ts:1284] [E: packages/opencode/src/lsp/server.ts:1287] | 允许下载时获取 JetBrains kotlin-lsp release；启动 `--stdio` [E: packages/opencode/src/lsp/server.ts:1290] [E: packages/opencode/src/lsp/server.ts:1297] [E: packages/opencode/src/lsp/server.ts:1330] [E: packages/opencode/src/lsp/server.ts:1334] [E: packages/opencode/src/lsp/server.ts:1354] |
| `yaml-ls` | `.yaml`, `.yml`; root 为 JS package markers [E: packages/opencode/src/lsp/server.ts:1361] [E: packages/opencode/src/lsp/server.ts:1364] | 查 `yaml-language-server`，否则允许下载时用 `Npm.which("yaml-language-server")` [E: packages/opencode/src/lsp/server.ts:1366] [E: packages/opencode/src/lsp/server.ts:1370] [E: packages/opencode/src/lsp/server.ts:1374] [E: packages/opencode/src/lsp/server.ts:1375] |
| `lua-ls` | `.lua`; root 为 Lua config markers [E: packages/opencode/src/lsp/server.ts:1387] [E: packages/opencode/src/lsp/server.ts:1398] | PATH 缺失且允许下载时下载 LuaLS release [E: packages/opencode/src/lsp/server.ts:1400] [E: packages/opencode/src/lsp/server.ts:1405] [E: packages/opencode/src/lsp/server.ts:1449] [E: packages/opencode/src/lsp/server.ts:1456] [E: packages/opencode/src/lsp/server.ts:1490] [E: packages/opencode/src/lsp/server.ts:1508] |
| `php intelephense` | `.php`; root 为 composer/PHP markers [E: packages/opencode/src/lsp/server.ts:1515] [E: packages/opencode/src/lsp/server.ts:1518] | 查 `intelephense`，否则允许下载时用 `Npm.which("intelephense")`，初始化中禁用 telemetry [E: packages/opencode/src/lsp/server.ts:1520] [E: packages/opencode/src/lsp/server.ts:1524] [E: packages/opencode/src/lsp/server.ts:1528] [E: packages/opencode/src/lsp/server.ts:1529] [E: packages/opencode/src/lsp/server.ts:1538] [E: packages/opencode/src/lsp/server.ts:1539] |
| `prisma` | `.prisma`; root 为 `schema.prisma` 或 `prisma` dir [E: packages/opencode/src/lsp/server.ts:1546] [E: packages/opencode/src/lsp/server.ts:1549] | 需要 `prisma` 在 PATH 中，启动 `prisma language-server` [E: packages/opencode/src/lsp/server.ts:1551] [E: packages/opencode/src/lsp/server.ts:1556] |
| `dart` | `.dart`; root 为 `pubspec.yaml` 或 `analysis_options.yaml` [E: packages/opencode/src/lsp/server.ts:1563] [E: packages/opencode/src/lsp/server.ts:1566] | 需要 `dart` 在 PATH 中，启动 `dart language-server --lsp` [E: packages/opencode/src/lsp/server.ts:1568] [E: packages/opencode/src/lsp/server.ts:1574] |
| `ocaml-lsp` | `.ml`, `.mli`; root 为 dune/merlin/opam markers [E: packages/opencode/src/lsp/server.ts:1580] [E: packages/opencode/src/lsp/server.ts:1583] | 需要 `ocamllsp` 在 PATH 中 [E: packages/opencode/src/lsp/server.ts:1585] [E: packages/opencode/src/lsp/server.ts:1591] |
| `bash` | `.sh`, `.bash`, `.zsh`, `.ksh`; root 为 instance directory [E: packages/opencode/src/lsp/server.ts:1596] [E: packages/opencode/src/lsp/server.ts:1599] | 查 `bash-language-server`，否则允许下载时用 `Npm.which("bash-language-server")`，启动 `start` [E: packages/opencode/src/lsp/server.ts:1601] [E: packages/opencode/src/lsp/server.ts:1617] |
| `terraform` | `.tf`, `.tfvars`; root 为 terraform markers [E: packages/opencode/src/lsp/server.ts:1622] [E: packages/opencode/src/lsp/server.ts:1625] | PATH 缺失且允许下载时下载 HashiCorp terraform-ls release，启动 `serve` [E: packages/opencode/src/lsp/server.ts:1627] [E: packages/opencode/src/lsp/server.ts:1632] [E: packages/opencode/src/lsp/server.ts:1654] [E: packages/opencode/src/lsp/server.ts:1682] [E: packages/opencode/src/lsp/server.ts:1686] |
| `texlab` | `.tex`, `.bib`; root 为 LaTeX markers [E: packages/opencode/src/lsp/server.ts:1695] [E: packages/opencode/src/lsp/server.ts:1698] | PATH 缺失且允许下载时下载 TexLab release [E: packages/opencode/src/lsp/server.ts:1700] [E: packages/opencode/src/lsp/server.ts:1705] [E: packages/opencode/src/lsp/server.ts:1733] [E: packages/opencode/src/lsp/server.ts:1755] [E: packages/opencode/src/lsp/server.ts:1767] |
| `dockerfile` | `.dockerfile`, `Dockerfile`; root 为 instance directory [E: packages/opencode/src/lsp/server.ts:1774] [E: packages/opencode/src/lsp/server.ts:1777] | 查 `docker-langserver`，否则允许下载时用 `Npm.which("dockerfile-language-server-nodejs")` [E: packages/opencode/src/lsp/server.ts:1779] [E: packages/opencode/src/lsp/server.ts:1795] |
| `gleam` | `.gleam`; root 为 `gleam.toml` [E: packages/opencode/src/lsp/server.ts:1800] [E: packages/opencode/src/lsp/server.ts:1803] | 需要 `gleam` 在 PATH 中，启动 `gleam lsp` [E: packages/opencode/src/lsp/server.ts:1805] [E: packages/opencode/src/lsp/server.ts:1811] |
| `clojure-lsp` | `.clj`, `.cljs`, `.cljc`, `.edn`; root 为 Clojure project markers [E: packages/opencode/src/lsp/server.ts:1817] [E: packages/opencode/src/lsp/server.ts:1820] | 需要 `clojure-lsp` 或 `clojure-lsp.exe` 在 PATH 中 [E: packages/opencode/src/lsp/server.ts:1822] [E: packages/opencode/src/lsp/server.ts:1830] |
| `nixd` | `.nix`; root 为 `flake.nix`、git root 或 instance directory [E: packages/opencode/src/lsp/server.ts:1837] [E: packages/opencode/src/lsp/server.ts:1849] | 需要 `nixd` 在 PATH 中 [E: packages/opencode/src/lsp/server.ts:1851] [E: packages/opencode/src/lsp/server.ts:1858] |
| `tinymist` | `.typ`, `.typc`; root 为 `typst.toml` [E: packages/opencode/src/lsp/server.ts:1867] [E: packages/opencode/src/lsp/server.ts:1870] | PATH 缺失且允许下载时下载 Tinymist release [E: packages/opencode/src/lsp/server.ts:1872] [E: packages/opencode/src/lsp/server.ts:1945] |
| `haskell-language-server` | `.hs`, `.lhs`; root 为 stack/cabal/hie markers [E: packages/opencode/src/lsp/server.ts:1951] [E: packages/opencode/src/lsp/server.ts:1954] | 需要 `haskell-language-server-wrapper` 在 PATH 中，启动 `--lsp` [E: packages/opencode/src/lsp/server.ts:1956] [E: packages/opencode/src/lsp/server.ts:1962] |
| `julials` | `.jl`; root 为 Julia project markers [E: packages/opencode/src/lsp/server.ts:1968] [E: packages/opencode/src/lsp/server.ts:1971] | 需要 `julia` 在 PATH 中，通过 `using LanguageServer; runserver()` 启动 [E: packages/opencode/src/lsp/server.ts:1973] [E: packages/opencode/src/lsp/server.ts:1979] |

## 命名陷阱

`packages/opencode/src/lsp/server.ts` 属于 V1 当前活跑代码路径；它导入 `@opencode-ai/core` 的 helper，例如 `Npm` 和 `Global` [E: packages/opencode/src/lsp/server.ts:4] [E: packages/opencode/src/lsp/server.ts:14]。LSP catalog 本身由 V1 `packages/opencode/src/lsp/lsp.ts` 导入并通过 `Object.values(LSPServer)` 加载 [E: packages/opencode/src/lsp/lsp.ts:8] [E: packages/opencode/src/lsp/lsp.ts:155]。V2 core 的 tool registry 不在这个文件中定义 LSP server catalog [I]。

## Sources

- `packages/opencode/src/lsp/server.ts`
- `packages/opencode/src/lsp/lsp.ts`
- `packages/core/src/npm.ts`
- `packages/opencode/src/lsp/language.ts`

## 相关

- `integrations.lsp`

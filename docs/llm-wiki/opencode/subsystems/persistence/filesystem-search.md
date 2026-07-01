---
id: persistence.filesystem-search
title: 文件系统/ripgrep/fast-file-finder
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/filesystem.ts
  - packages/core/src/filesystem/search.ts
  - packages/core/src/filesystem/fff.bun.ts
  - packages/core/src/filesystem/fff.node.ts
  - packages/core/src/filesystem/ignore.ts
  - packages/core/src/filesystem/watcher.ts
  - packages/core/src/ripgrep.ts
  - packages/core/src/ripgrep/binary.ts
  - packages/core/src/location-services.ts
  - packages/schema/src/filesystem.ts
  - AGENTS.md
symbols:
  - FileSystem.Service
  - FileSystemSearch.Service
  - Ripgrep.Service
  - RipgrepBinary.Service
  - Fff
related:
  - tool.glob
  - tool.grep
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V2 filesystem-search 是 Location-scoped filesystem facade：`FileSystem` 负责 read/list 的 path containment，`FileSystemSearch` 在 FFF 可用时使用 fast-file-finder，否则回退 core-owned ripgrep adapter。

## 能回答的问题

- V2 filesystem read/list 如何防止 path 和 symlink 逃出 Location。
- `find/glob/grep` 分别经过 FFF 还是 ripgrep。
- `FileSystem.Entry` 和 `FileSystem.Match` 当前 schema 在哪里定义。
- `RipgrepBinary` 如何寻找系统 rg、下载 bundled rg。
- watcher/ignore 与 search backend 的边界在哪里。

## 职责边界

本节点覆盖 V2 `FileSystem.Service`、`FileSystemSearch.Service`、`Ripgrep.Service` 和 bundled `RipgrepBinary`。V1 user-facing `glob`/`grep` tools 和 V2 leaf tool presentation/permission 由 `surface/tools/glob`、`surface/tools/grep`、`subsystems/tools/v2` 覆盖。

## 数据模型

`FileSystem.ReadInput` 是 `{ path: RelativePath }`。[E: packages/core/src/filesystem.ts:13][E: packages/core/src/filesystem.ts:14] `FindInput` 已移到 shared schema package，字段是 `query`、optional `type: "file" | "directory"`、optional positive `limit`。[E: packages/schema/src/filesystem.ts:36][E: packages/schema/src/filesystem.ts:37][E: packages/schema/src/filesystem.ts:38][E: packages/schema/src/filesystem.ts:39] `GlobInput` 和 `GrepInput` 仍在 core filesystem facade 内定义，分别包含 pattern/path/limit 与 pattern/path/include/limit。[E: packages/core/src/filesystem.ts:34][E: packages/core/src/filesystem.ts:35][E: packages/core/src/filesystem.ts:36][E: packages/core/src/filesystem.ts:37][E: packages/core/src/filesystem.ts:40][E: packages/core/src/filesystem.ts:41][E: packages/core/src/filesystem.ts:42][E: packages/core/src/filesystem.ts:43][E: packages/core/src/filesystem.ts:44]

`FileSystem.Entry` 当前只包含 relative `path` 和 `type: "file" | "directory"`，不再有本节点旧版本提到的 `mime` 字段。[E: packages/schema/src/filesystem.ts:15][E: packages/schema/src/filesystem.ts:16][E: packages/schema/src/filesystem.ts:17] `FileSystem.Match` 包含 entry、line、offset、text、submatches；submatch 包含 text/start/end。[E: packages/schema/src/filesystem.ts:21][E: packages/schema/src/filesystem.ts:22][E: packages/schema/src/filesystem.ts:23][E: packages/schema/src/filesystem.ts:24][E: packages/schema/src/filesystem.ts:28][E: packages/schema/src/filesystem.ts:29][E: packages/schema/src/filesystem.ts:30][E: packages/schema/src/filesystem.ts:31][E: packages/schema/src/filesystem.ts:32][E: packages/schema/src/filesystem.ts:33]

`FileSystem.Service` tag 是 `@opencode/v2/FileSystem`，接口暴露 `read/list/find/glob/grep`。[E: packages/core/src/filesystem.ts:49][E: packages/core/src/filesystem.ts:50][E: packages/core/src/filesystem.ts:51][E: packages/core/src/filesystem.ts:52][E: packages/core/src/filesystem.ts:53][E: packages/core/src/filesystem.ts:54][E: packages/core/src/filesystem.ts:57] `FileSystemSearch.Service` tag 是 `@opencode/v2/FileSystem/Search`，接口暴露 find/glob/grep。[E: packages/core/src/filesystem/search.ts:15][E: packages/core/src/filesystem/search.ts:16][E: packages/core/src/filesystem/search.ts:17][E: packages/core/src/filesystem/search.ts:18][E: packages/core/src/filesystem/search.ts:21]

## FileSystem 控制流

1. `baseLayer` 依赖 `FSUtil.Service`、`Location.Service`、`FileSystemSearch.Service`，并把 `root` 设为 `realPath(location.directory)`。[E: packages/core/src/filesystem.ts:59][E: packages/core/src/filesystem.ts:62][E: packages/core/src/filesystem.ts:63][E: packages/core/src/filesystem.ts:64][E: packages/core/src/filesystem.ts:65]
2. internal `resolve(input?)` 先用 `path.resolve(location.directory, input ?? ".")` 得到 absolute path；absolute path 必须仍在 `location.directory` 内。[E: packages/core/src/filesystem.ts:66][E: packages/core/src/filesystem.ts:67][E: packages/core/src/filesystem.ts:68][E: packages/core/src/filesystem.ts:69]
3. `realPath(absolute)` 后的 real path 也必须仍在 `root` 内，防止 symlink escape。[E: packages/core/src/filesystem.ts:70][E: packages/core/src/filesystem.ts:71]
4. service 的 `find/glob/grep` 直接委托给 `FileSystemSearch.Service`。[E: packages/core/src/filesystem.ts:74][E: packages/core/src/filesystem.ts:75][E: packages/core/src/filesystem.ts:76][E: packages/core/src/filesystem.ts:77]
5. `read` 要求 resolved target 是 file；返回 raw bytes 和 mime type。[E: packages/core/src/filesystem.ts:78][E: packages/core/src/filesystem.ts:79][E: packages/core/src/filesystem.ts:80][E: packages/core/src/filesystem.ts:81][E: packages/core/src/filesystem.ts:83][E: packages/core/src/filesystem.ts:84]
6. `list` 要求 target 是 directory；只返回 file/directory entries，directory-first，再按 path 排序。[E: packages/core/src/filesystem.ts:87][E: packages/core/src/filesystem.ts:88][E: packages/core/src/filesystem.ts:89][E: packages/core/src/filesystem.ts:96][E: packages/core/src/filesystem.ts:100][E: packages/core/src/filesystem.ts:106]

## Search backend selection

`FileSystemSearch.defaultLayer` 根据 `Flag.OPENCODE_DISABLE_FFF || !Fff.available()` 选择 ripgrep fallback 或 FFF layer。[E: packages/core/src/filesystem/search.ts:233] `locationLayer` 指向同一个 layer，location node 依赖 FSUtil、Location、Ripgrep。[E: packages/core/src/filesystem/search.ts:235][E: packages/core/src/filesystem/search.ts:237]

### Ripgrep layer

`ripgrepLayer` 依赖 FSUtil、Location、Ripgrep、Scope，维护 in-memory `state.files` 和 `state.directories`。[E: packages/core/src/filesystem/search.ts:23][E: packages/core/src/filesystem/search.ts:26][E: packages/core/src/filesystem/search.ts:27][E: packages/core/src/filesystem/search.ts:28][E: packages/core/src/filesystem/search.ts:29][E: packages/core/src/filesystem/search.ts:30][E: packages/core/src/filesystem/search.ts:31][E: packages/core/src/filesystem/search.ts:32] layer 启动时 fork `ripgrep.find({ cwd: location.directory, pattern: "*", limit })`；git location 使用 `Number.MAX_SAFE_INTEGER`，非 git location 限制 `100_000`。[E: packages/core/src/filesystem/search.ts:35][E: packages/core/src/filesystem/search.ts:37][E: packages/core/src/filesystem/search.ts:38][E: packages/core/src/filesystem/search.ts:39][E: packages/core/src/filesystem/search.ts:48]

`glob(input)` resolve optional path，file path 时用 parent directory 作为 cwd；调用 `ripgrep.glob` 后把 result path 映射回 Location-relative path。[E: packages/core/src/filesystem/search.ts:50][E: packages/core/src/filesystem/search.ts:52][E: packages/core/src/filesystem/search.ts:53][E: packages/core/src/filesystem/search.ts:54][E: packages/core/src/filesystem/search.ts:55][E: packages/core/src/filesystem/search.ts:56][E: packages/core/src/filesystem/search.ts:58][E: packages/core/src/filesystem/search.ts:66] `grep(input)` 同样 resolve cwd/file，调用 `ripgrep.grep`，再把 match.entry.path 改成 Location-relative。[E: packages/core/src/filesystem/search.ts:73][E: packages/core/src/filesystem/search.ts:75][E: packages/core/src/filesystem/search.ts:77][E: packages/core/src/filesystem/search.ts:79][E: packages/core/src/filesystem/search.ts:81][E: packages/core/src/filesystem/search.ts:82][E: packages/core/src/filesystem/search.ts:83][E: packages/core/src/filesystem/search.ts:93] `find(input)` 用 `fuzzysort.go(input.query, items, { limit: input.limit ?? 50 })` 搜索 startup scan state。[E: packages/core/src/filesystem/search.ts:101][E: packages/core/src/filesystem/search.ts:103][E: packages/core/src/filesystem/search.ts:109]

### FFF layer

`fffLayer` 创建 `Fff.create({ basePath: location.directory, aiMode: true })`；创建失败时记录 warning 并返回空的 find/glob/grep service，成功时注册 picker destroy finalizer。[E: packages/core/src/filesystem/search.ts:122][E: packages/core/src/filesystem/search.ts:125][E: packages/core/src/filesystem/search.ts:128][E: packages/core/src/filesystem/search.ts:129][E: packages/core/src/filesystem/search.ts:130][E: packages/core/src/filesystem/search.ts:134][E: packages/core/src/filesystem/search.ts:136][E: packages/core/src/filesystem/search.ts:139][E: packages/core/src/filesystem/search.ts:140][E: packages/core/src/filesystem/search.ts:141][E: packages/core/src/filesystem/search.ts:144]

FFF `glob` 调 `result.value.glob(prefix ? "<prefix>/<pattern>" : pattern, { pageIndex: 0, pageSize: input.limit })`，只返回 file entries。[E: packages/core/src/filesystem/search.ts:146][E: packages/core/src/filesystem/search.ts:148][E: packages/core/src/filesystem/search.ts:149][E: packages/core/src/filesystem/search.ts:150][E: packages/core/src/filesystem/search.ts:151][E: packages/core/src/filesystem/search.ts:155][E: packages/core/src/filesystem/search.ts:157] FFF `grep` 拼 `[prefix ? "<prefix>/**" : undefined, include, pattern]`，mode 是 regex，time budget 是 1500ms，line text 超过 2000 chars 会截断加 `...`。[E: packages/core/src/filesystem/search.ts:161][E: packages/core/src/filesystem/search.ts:163][E: packages/core/src/filesystem/search.ts:165][E: packages/core/src/filesystem/search.ts:168][E: packages/core/src/filesystem/search.ts:180] FFF `find` 调 fileSearch/directorySearch/mixedSearch，再按 score desc、path length asc 排序。[E: packages/core/src/filesystem/search.ts:189][E: packages/core/src/filesystem/search.ts:194][E: packages/core/src/filesystem/search.ts:203][E: packages/core/src/filesystem/search.ts:211][E: packages/core/src/filesystem/search.ts:220]

`fff.bun.ts` imports `@ff-labs/fff-bun` and forwards picker methods such as fileSearch/glob/directorySearch/mixedSearch/grep to the native picker; `available()` 返回 `FileFinder.isAvailable()`。[E: packages/core/src/filesystem/fff.bun.ts:1][E: packages/core/src/filesystem/fff.bun.ts:114][E: packages/core/src/filesystem/fff.bun.ts:118][E: packages/core/src/filesystem/fff.bun.ts:129][E: packages/core/src/filesystem/fff.bun.ts:130][E: packages/core/src/filesystem/fff.bun.ts:131][E: packages/core/src/filesystem/fff.bun.ts:132][E: packages/core/src/filesystem/fff.bun.ts:133] `fff.node.ts` 的 `available()` 固定返回 false，`create()` 返回 `fff unavailable on node runtime`；default layer 因此在 Node adapter 下选择 ripgrep fallback。[E: packages/core/src/filesystem/fff.node.ts:130][E: packages/core/src/filesystem/fff.node.ts:131][E: packages/core/src/filesystem/fff.node.ts:134][E: packages/core/src/filesystem/fff.node.ts:135][E: packages/core/src/filesystem/search.ts:233][I]

## Ripgrep adapter

`RipgrepBinary` namespace 内部 `VERSION` const 是 `15.1.0`，platform matrix 覆盖 arm64/x64 darwin/linux、arm64/ia32/x64 win32。[E: packages/core/src/ripgrep/binary.ts:13][E: packages/core/src/ripgrep/binary.ts:14][E: packages/core/src/ripgrep/binary.ts:15][E: packages/core/src/ripgrep/binary.ts:16][E: packages/core/src/ripgrep/binary.ts:17][E: packages/core/src/ripgrep/binary.ts:18][E: packages/core/src/ripgrep/binary.ts:19][E: packages/core/src/ripgrep/binary.ts:20][E: packages/core/src/ripgrep/binary.ts:21][E: packages/core/src/ripgrep/binary.ts:22] `filepath` 是 cached effect：先查系统 `rg`/`rg.exe`，再查 `Global.Path.bin/rg`，否则按 platform 下载 GitHub release archive、extract executable、删除 archive。[E: packages/core/src/ripgrep/binary.ts:91][E: packages/core/src/ripgrep/binary.ts:92][E: packages/core/src/ripgrep/binary.ts:94][E: packages/core/src/ripgrep/binary.ts:95][E: packages/core/src/ripgrep/binary.ts:97][E: packages/core/src/ripgrep/binary.ts:98][E: packages/core/src/ripgrep/binary.ts:100][E: packages/core/src/ripgrep/binary.ts:104][E: packages/core/src/ripgrep/binary.ts:105][E: packages/core/src/ripgrep/binary.ts:117][E: packages/core/src/ripgrep/binary.ts:118][E: packages/core/src/ripgrep/binary.ts:119]

`Ripgrep.Service` tag 是 `@opencode/v2/Ripgrep`，接口有 `find/glob/grep`。[E: packages/core/src/ripgrep.ts:79][E: packages/core/src/ripgrep.ts:80][E: packages/core/src/ripgrep.ts:81][E: packages/core/src/ripgrep.ts:82][E: packages/core/src/ripgrep.ts:85] adapter 的 `run()` spawn `binary.filepath`，用 `Stream.splitLines` 解析 stdout，`Stream.take(limit + 1)` 判断 truncated，并收集最多 8KiB stderr。[E: packages/core/src/ripgrep.ts:18][E: packages/core/src/ripgrep.ts:98][E: packages/core/src/ripgrep.ts:109][E: packages/core/src/ripgrep.ts:110][E: packages/core/src/ripgrep.ts:112][E: packages/core/src/ripgrep.ts:117][E: packages/core/src/ripgrep.ts:118][E: packages/core/src/ripgrep.ts:126][E: packages/core/src/ripgrep.ts:130] exit code 1 表示 no matches，exit code 2 可产生 partial result 或 invalid regex error，其他非 0 code 是 failure。[E: packages/core/src/ripgrep.ts:135][E: packages/core/src/ripgrep.ts:136][E: packages/core/src/ripgrep.ts:138][E: packages/core/src/ripgrep.ts:141]

`glob` 和 `find` 都用 `rg --no-config --files`；`glob` 总是加 `--glob=<pattern>`，`find` 只有 pattern 不是 `"*"` 时加 `--glob=<pattern>`，二者都排除 `.git`。[E: packages/core/src/ripgrep.ts:160][E: packages/core/src/ripgrep.ts:161][E: packages/core/src/ripgrep.ts:162][E: packages/core/src/ripgrep.ts:165][E: packages/core/src/ripgrep.ts:166][E: packages/core/src/ripgrep.ts:192][E: packages/core/src/ripgrep.ts:193][E: packages/core/src/ripgrep.ts:194][E: packages/core/src/ripgrep.ts:197][E: packages/core/src/ripgrep.ts:198] `grep` 用 `rg --json --hidden --no-messages`，optional include glob，显式 `--` 后传 pattern 和 file/dot。[E: packages/core/src/ripgrep.ts:221][E: packages/core/src/ripgrep.ts:222][E: packages/core/src/ripgrep.ts:223][E: packages/core/src/ripgrep.ts:224][E: packages/core/src/ripgrep.ts:225][E: packages/core/src/ripgrep.ts:226][E: packages/core/src/ripgrep.ts:227][E: packages/core/src/ripgrep.ts:228][E: packages/core/src/ripgrep.ts:229][E: packages/core/src/ripgrep.ts:230]

## Ignore/protected/watcher 相关

`filesystem/ignore.ts` 定义默认忽略 folder/file patterns，包括 `node_modules`、`dist`、`.git`、`.turbo`、logs/tmp/coverage 等。[E: packages/core/src/filesystem/ignore.ts:3][E: packages/core/src/filesystem/ignore.ts:4][E: packages/core/src/filesystem/ignore.ts:9][E: packages/core/src/filesystem/ignore.ts:16][E: packages/core/src/filesystem/ignore.ts:21][E: packages/core/src/filesystem/ignore.ts:34][E: packages/core/src/filesystem/ignore.ts:40][E: packages/core/src/filesystem/ignore.ts:41][E: packages/core/src/filesystem/ignore.ts:44][E: packages/core/src/filesystem/ignore.ts:48] `Watcher.layer` 在 experimental watcher enabled 时使用 `Ignore.PATTERNS`、config watcher ignore、protected paths 订阅 location directory，并把 file watcher events publish 成 `file.watcher.updated` EventV2。[E: packages/core/src/filesystem/watcher.ts:24][E: packages/core/src/filesystem/watcher.ts:86][E: packages/core/src/filesystem/watcher.ts:88][E: packages/core/src/filesystem/watcher.ts:89][E: packages/core/src/filesystem/watcher.ts:90][E: packages/core/src/filesystem/watcher.ts:106][E: packages/core/src/filesystem/watcher.ts:109][E: packages/core/src/filesystem/watcher.ts:111]

## 设计动机与 gotchas

- V2 filesystem facade 把 path containment 放在 read/list boundary，search backend 结果再映射成 Location-relative entries；leaf tools 可以把 permissions 和 presentation 放在工具层，而不是直接暴露 raw rg output。[E: packages/core/src/filesystem.ts:68][E: packages/core/src/filesystem.ts:71][E: packages/core/src/filesystem/search.ts:64][E: packages/core/src/filesystem/search.ts:66][E: packages/core/src/filesystem/search.ts:89][E: packages/core/src/filesystem/search.ts:93][I]
- Root `AGENTS.md` 要求 V2 SessionRunner、model resolution、tool registry、permissions、filesystem 保持 Location-scoped；`locationServices` 将 `FileSystemSearch.node` 和 `FileSystem.node` 纳入 Location graph。[E: AGENTS.md:156][E: packages/core/src/location-services.ts:56][E: packages/core/src/location-services.ts:57][I]
- `grep` in ripgrep adapter passes `--hidden` and only excludes `.git` explicitly; broader ignores are watcher/default-ignore concern unless passed through backend-specific flags elsewhere。[E: packages/core/src/ripgrep.ts:224][E: packages/core/src/ripgrep.ts:227][I]

## Sources

- `packages/core/src/filesystem.ts`
- `packages/core/src/filesystem/search.ts`
- `packages/core/src/filesystem/fff.bun.ts`
- `packages/core/src/filesystem/fff.node.ts`
- `packages/core/src/filesystem/ignore.ts`
- `packages/core/src/filesystem/watcher.ts`
- `packages/core/src/ripgrep.ts`
- `packages/core/src/ripgrep/binary.ts`
- `packages/core/src/location-services.ts`
- `packages/schema/src/filesystem.ts`
- `AGENTS.md`

## 相关

- [Glob](../../surface/tools/glob.md)
- [Grep](../../surface/tools/grep.md)
- [V2 工具系统](../tools/v2.md)

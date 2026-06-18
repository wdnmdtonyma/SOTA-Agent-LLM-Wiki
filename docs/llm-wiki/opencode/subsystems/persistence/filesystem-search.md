---
id: persistence.filesystem-search
title: 文件系统/ripgrep/fast-file-finder
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/filesystem/
  - packages/core/src/ripgrep/binary.ts
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
updated: 355a0bcf5
---

> V2 filesystem-search 是 Location-scoped filesystem facade：`FileSystem` 负责 read/list 边界检查，`FileSystemSearch` 在 FFF 可用时用 fast-file-finder，否则回退 core-owned ripgrep adapter。

## 能回答的问题

- V2 filesystem read/list 如何防止 path 和 symlink 逃出 Location。
- `find/glob/grep` 分别调用 FFF 还是 ripgrep。
- `RipgrepBinary` 如何寻找系统 rg、下载 bundled rg。
- `Ripgrep.grep` 如何解析 JSON output、限制 record/submatch/text。
- 为什么本节点不覆盖 V1 grep/glob 工具实现。

## 职责边界

本节点覆盖 `packages/core/src/filesystem*` 与 `packages/core/src/ripgrep*` 的 V2 filesystem/search services，并在 supporting context 中说明 FFF runtime adapter、default ignore/watcher/protected paths、Location graph wiring。V1 user-facing `glob`/`grep` tools 和 V2 leaf tool schemas 由 `surface/tools/glob`、`surface/tools/grep`、`subsystems/tools/v2` 覆盖。

## 数据模型

| 实体 | 字段/行为 | 证据 |
| --- | --- | --- |
| `FileSystem.ReadInput` | `path: RelativePath`。 | [E: packages/core/src/filesystem.ts:13][E: packages/core/src/filesystem.ts:14] |
| `FileSystem.FindInput` | `query`，optional `type: "file" | "directory"`，optional positive `limit`。 | [E: packages/core/src/filesystem.ts:32][E: packages/core/src/filesystem.ts:33][E: packages/core/src/filesystem.ts:34][E: packages/core/src/filesystem.ts:35] |
| `FileSystem.GlobInput` | `pattern`，optional relative `path`，optional positive `limit`。 | [E: packages/core/src/filesystem.ts:38][E: packages/core/src/filesystem.ts:39][E: packages/core/src/filesystem.ts:40][E: packages/core/src/filesystem.ts:41] |
| `FileSystem.GrepInput` | `pattern`，optional relative `path`，optional `include` glob，optional positive `limit`。 | [E: packages/core/src/filesystem.ts:44][E: packages/core/src/filesystem.ts:45][E: packages/core/src/filesystem.ts:46][E: packages/core/src/filesystem.ts:47][E: packages/core/src/filesystem.ts:48] |
| `FileSystem.Entry` | result entry 包含 relative `path`、`type: file|directory`、`mime`。 | [E: packages/core/src/filesystem/schema.ts:4][E: packages/core/src/filesystem/schema.ts:5][E: packages/core/src/filesystem/schema.ts:6][E: packages/core/src/filesystem/schema.ts:7] |
| `FileSystem.Match` | grep result 包含 entry、line、offset、text、submatches。 | [E: packages/core/src/filesystem/schema.ts:17][E: packages/core/src/filesystem/schema.ts:18][E: packages/core/src/filesystem/schema.ts:19][E: packages/core/src/filesystem/schema.ts:20][E: packages/core/src/filesystem/schema.ts:21][E: packages/core/src/filesystem/schema.ts:22] |
| `FileSystem.Service` | tag 是 `@opencode/v2/FileSystem`，接口暴露 `read/list/find/glob/grep`。 | [E: packages/core/src/filesystem.ts:60][E: packages/core/src/filesystem.ts:62][E: packages/core/src/filesystem.ts:62][E: packages/core/src/filesystem.ts:63][E: packages/core/src/filesystem.ts:64][E: packages/core/src/filesystem.ts:65][E: packages/core/src/filesystem.ts:68] |
| `FileSystemSearch.Service` | tag 是 `@opencode/v2/FileSystem/Search`，接口暴露 find/glob/grep。 | [E: packages/core/src/filesystem/search.ts:14][E: packages/core/src/filesystem/search.ts:15][E: packages/core/src/filesystem/search.ts:16][E: packages/core/src/filesystem/search.ts:17][E: packages/core/src/filesystem/search.ts:20] |

## FileSystem 控制流

1. `baseLayer` 依赖 `FSUtil.Service`、`Location.Service`、`FileSystemSearch.Service`，并把 `root` 设为 `realPath(location.directory)`。[E: packages/core/src/filesystem.ts:73][E: packages/core/src/filesystem.ts:74][E: packages/core/src/filesystem.ts:75][E: packages/core/src/filesystem.ts:76]
2. internal `resolve(input?)` 先用 `path.resolve(location.directory, input ?? ".")` 得到 absolute path。[E: packages/core/src/filesystem.ts:77][E: packages/core/src/filesystem.ts:78]
3. absolute path 必须仍在 `location.directory` 内，否则 die `Path escapes the location`。[E: packages/core/src/filesystem.ts:79][E: packages/core/src/filesystem.ts:80]
4. `realPath(absolute)` 后的 real path 也必须仍在 root 内，防止 symlink escape。[E: packages/core/src/filesystem.ts:81][E: packages/core/src/filesystem.ts:82]
5. service 的 `find/glob/grep` 直接委托给 `FileSystemSearch.Service`。[E: packages/core/src/filesystem.ts:85][E: packages/core/src/filesystem.ts:86][E: packages/core/src/filesystem.ts:87][E: packages/core/src/filesystem.ts:88]
6. `read` 要求 resolved target 是 file；返回原始 content buffer 与 mime type，encoding 字段属于 `FileSystem.Content` schema 而不是当前 `read` result。[E: packages/core/src/filesystem.ts:18][E: packages/core/src/filesystem.ts:22][E: packages/core/src/filesystem.ts:23][E: packages/core/src/filesystem.ts:89][E: packages/core/src/filesystem.ts:91][E: packages/core/src/filesystem.ts:92][E: packages/core/src/filesystem.ts:94][E: packages/core/src/filesystem.ts:95]
7. `list` 要求 target 是 directory；只返回 file/directory，directory-first，再按 path 排序。[E: packages/core/src/filesystem.ts:98][E: packages/core/src/filesystem.ts:100][E: packages/core/src/filesystem.ts:101][E: packages/core/src/filesystem.ts:107][E: packages/core/src/filesystem.ts:111][E: packages/core/src/filesystem.ts:118]
8. exported `layer` 把 base layer 与 `FileSystemSearch.defaultLayer`、`FSUtil.defaultLayer` 组合；`locationLayer = layer`。[E: packages/core/src/filesystem.ts:126][E: packages/core/src/filesystem.ts:128]

## Search backend selection

`FileSystemSearch.defaultLayer` 根据 `Flag.OPENCODE_DISABLE_FFF || !Fff.available()` 选择 ripgrep fallback 或 FFF layer。[E: packages/core/src/filesystem/search.ts:235][E: packages/core/src/filesystem/search.ts:236]

### Ripgrep layer

1. `ripgrepLayer` 依赖 FSUtil、Location、Ripgrep、Scope，维护 in-memory `state.files` 和 `state.directories`。[E: packages/core/src/filesystem/search.ts:22][E: packages/core/src/filesystem/search.ts:25][E: packages/core/src/filesystem/search.ts:26][E: packages/core/src/filesystem/search.ts:27][E: packages/core/src/filesystem/search.ts:28][E: packages/core/src/filesystem/search.ts:29][E: packages/core/src/filesystem/search.ts:30][E: packages/core/src/filesystem/search.ts:31]
2. layer 启动时 fork `ripgrep.find({ cwd: location.directory, pattern: "*", limit })` 扫描 files；git location 使用 `Number.MAX_SAFE_INTEGER`，非 git location 限制 100000。[E: packages/core/src/filesystem/search.ts:35][E: packages/core/src/filesystem/search.ts:36][E: packages/core/src/filesystem/search.ts:37][E: packages/core/src/filesystem/search.ts:38][E: packages/core/src/filesystem/search.ts:47]
3. `onEntry` 把 file path 存入 `state.files`，并从 path parts 推导 parent directories，追加 trailing `path.sep`。[E: packages/core/src/filesystem/search.ts:39][E: packages/core/src/filesystem/search.ts:41][E: packages/core/src/filesystem/search.ts:42][E: packages/core/src/filesystem/search.ts:43][E: packages/core/src/filesystem/search.ts:44]
4. `glob(input)` resolve optional input path，file path 时用 parent directory 作为 cwd；调用 `ripgrep.glob({ cwd, pattern, limit })`，再把结果转成 Location-relative paths。[E: packages/core/src/filesystem/search.ts:49][E: packages/core/src/filesystem/search.ts:51][E: packages/core/src/filesystem/search.ts:52][E: packages/core/src/filesystem/search.ts:53][E: packages/core/src/filesystem/search.ts:55][E: packages/core/src/filesystem/search.ts:56][E: packages/core/src/filesystem/search.ts:57][E: packages/core/src/filesystem/search.ts:58][E: packages/core/src/filesystem/search.ts:66]
5. `grep(input)` 同样 resolve cwd/file，调用 `ripgrep.grep({ cwd, pattern, file, include, limit })`，再把 match.entry.path 改成 Location-relative。[E: packages/core/src/filesystem/search.ts:73][E: packages/core/src/filesystem/search.ts:75][E: packages/core/src/filesystem/search.ts:77][E: packages/core/src/filesystem/search.ts:79][E: packages/core/src/filesystem/search.ts:80][E: packages/core/src/filesystem/search.ts:81][E: packages/core/src/filesystem/search.ts:82][E: packages/core/src/filesystem/search.ts:83][E: packages/core/src/filesystem/search.ts:84][E: packages/core/src/filesystem/search.ts:94]
6. `find(input)` 用 `fuzzysort.go(input.query, items, { limit: input.limit ?? 50 })` 在 startup scan state 中做 fuzzy search，file/directory/all 由 `input.type` 选择。[E: packages/core/src/filesystem/search.ts:102][E: packages/core/src/filesystem/search.ts:104][E: packages/core/src/filesystem/search.ts:105][E: packages/core/src/filesystem/search.ts:107][E: packages/core/src/filesystem/search.ts:109][E: packages/core/src/filesystem/search.ts:110]

### FFF layer

`fffLayer` 创建 `Fff.create({ basePath: location.directory, aiMode: true, enableFsRootScanning: true, enableHomeDirScanning: true })`，失败则 die，成功注册 finalizer destroy picker。[E: packages/core/src/filesystem/search.ts:126][E: packages/core/src/filesystem/search.ts:130][E: packages/core/src/filesystem/search.ts:132][E: packages/core/src/filesystem/search.ts:133][E: packages/core/src/filesystem/search.ts:134][E: packages/core/src/filesystem/search.ts:135][E: packages/core/src/filesystem/search.ts:136][E: packages/core/src/filesystem/search.ts:140][E: packages/core/src/filesystem/search.ts:141]

FFF `glob` 调 `result.value.glob(prefix ? "<prefix>/<pattern>" : pattern, { pageIndex: 0, pageSize: input.limit })`，只返回 file entries。[E: packages/core/src/filesystem/search.ts:143][E: packages/core/src/filesystem/search.ts:145][E: packages/core/src/filesystem/search.ts:146][E: packages/core/src/filesystem/search.ts:147][E: packages/core/src/filesystem/search.ts:148][E: packages/core/src/filesystem/search.ts:155] FFF `grep` 拼 `[prefix ? "<prefix>/**" : undefined, include, pattern]`，mode 是 regex，time budget 是 1500ms；line text 超过 2000 chars 会截断加 `...`。[E: packages/core/src/filesystem/search.ts:160][E: packages/core/src/filesystem/search.ts:163][E: packages/core/src/filesystem/search.ts:164][E: packages/core/src/filesystem/search.ts:167][E: packages/core/src/filesystem/search.ts:180] FFF `find` 调 fileSearch/directorySearch/mixedSearch，再按 score desc、path length asc 排序。[E: packages/core/src/filesystem/search.ts:190][E: packages/core/src/filesystem/search.ts:194][E: packages/core/src/filesystem/search.ts:203][E: packages/core/src/filesystem/search.ts:211][E: packages/core/src/filesystem/search.ts:220]

`fff.bun.ts` imports `@ff-labs/fff-bun` and forwards picker methods such as `fileSearch/glob/directorySearch/mixedSearch/grep` to the native picker; `available()` 返回 `FileFinder.isAvailable()`。[E: packages/core/src/filesystem/fff.bun.ts:13][E: packages/core/src/filesystem/fff.bun.ts:114][E: packages/core/src/filesystem/fff.bun.ts:115][E: packages/core/src/filesystem/fff.bun.ts:118][E: packages/core/src/filesystem/fff.bun.ts:129][E: packages/core/src/filesystem/fff.bun.ts:130][E: packages/core/src/filesystem/fff.bun.ts:131][E: packages/core/src/filesystem/fff.bun.ts:132][E: packages/core/src/filesystem/fff.bun.ts:133] `fff.node.ts` 的 `available()` 固定返回 false，`create()` 返回 `fff unavailable on node runtime`；default layer 的 runtime branch 因此在 Node adapter 下选择 ripgrep fallback。[E: packages/core/src/filesystem/fff.node.ts:130][E: packages/core/src/filesystem/fff.node.ts:131][E: packages/core/src/filesystem/fff.node.ts:134][E: packages/core/src/filesystem/fff.node.ts:135][E: packages/core/src/filesystem/search.ts:236][I]

## Ripgrep adapter

### Binary discovery/download

`RipgrepBinary` namespace 内部 `VERSION` const 是 `15.1.0`，platform matrix 覆盖 arm64/x64 darwin/linux、arm64/ia32/x64 win32。[E: packages/core/src/ripgrep/binary.ts:13][E: packages/core/src/ripgrep/binary.ts:14][E: packages/core/src/ripgrep/binary.ts:16][E: packages/core/src/ripgrep/binary.ts:17][E: packages/core/src/ripgrep/binary.ts:18][E: packages/core/src/ripgrep/binary.ts:19][E: packages/core/src/ripgrep/binary.ts:20][E: packages/core/src/ripgrep/binary.ts:21][E: packages/core/src/ripgrep/binary.ts:22] `filepath` 是 cached effect：先查系统 `rg`/`rg.exe`，再查 `Global.Path.bin/rg`，否则根据 platform 下载 GitHub release archive、写到 bin dir、extract executable、删除 archive。[E: packages/core/src/ripgrep/binary.ts:92][E: packages/core/src/ripgrep/binary.ts:94][E: packages/core/src/ripgrep/binary.ts:95][E: packages/core/src/ripgrep/binary.ts:97][E: packages/core/src/ripgrep/binary.ts:98][E: packages/core/src/ripgrep/binary.ts:104][E: packages/core/src/ripgrep/binary.ts:105][E: packages/core/src/ripgrep/binary.ts:109][E: packages/core/src/ripgrep/binary.ts:110][E: packages/core/src/ripgrep/binary.ts:111][E: packages/core/src/ripgrep/binary.ts:112][E: packages/core/src/ripgrep/binary.ts:117][E: packages/core/src/ripgrep/binary.ts:118][E: packages/core/src/ripgrep/binary.ts:119]

Archive extraction 用 PowerShell `Expand-Archive` 处理 zip，用 `tar -xzf` 处理 tar.gz，抽出的 executable 路径固定在 `ripgrep-<VERSION>-<platform>/rg(.exe)`。[E: packages/core/src/ripgrep/binary.ts:58][E: packages/core/src/ripgrep/binary.ts:60][E: packages/core/src/ripgrep/binary.ts:64][E: packages/core/src/ripgrep/binary.ts:72][E: packages/core/src/ripgrep/binary.ts:73][E: packages/core/src/ripgrep/binary.ts:80][E: packages/core/src/ripgrep/binary.ts:82][E: packages/core/src/ripgrep/binary.ts:83]

### Command adapter

`Ripgrep.Service` tag 是 `@opencode/v2/Ripgrep`，接口有 `find/glob/grep`。[E: packages/core/src/ripgrep.ts:81][E: packages/core/src/ripgrep.ts:82][E: packages/core/src/ripgrep.ts:83][E: packages/core/src/ripgrep.ts:84][E: packages/core/src/ripgrep.ts:87] adapter 的 `run()` spawn `binary.filepath`，用 `Stream.splitLines` 解析 stdout，`Stream.take(limit + 1)` 判断 truncated，并收集最多 8KiB stderr。[E: packages/core/src/ripgrep.ts:20][E: packages/core/src/ripgrep.ts:111][E: packages/core/src/ripgrep.ts:112][E: packages/core/src/ripgrep.ts:114][E: packages/core/src/ripgrep.ts:119][E: packages/core/src/ripgrep.ts:120][E: packages/core/src/ripgrep.ts:128][E: packages/core/src/ripgrep.ts:132] exit code 1 表示 no matches，exit code 2 可产生 partial result 或 invalid regex error，其他非 0 code 是 failure。[E: packages/core/src/ripgrep.ts:137][E: packages/core/src/ripgrep.ts:138][E: packages/core/src/ripgrep.ts:140][E: packages/core/src/ripgrep.ts:143]

`glob` 和 `find` 都用 `rg --no-config --files`；`glob` 总是加 `--glob=<pattern>`，`find` 只有在 pattern 不是 `"*"` 时加 `--glob=<pattern>`，二者都排除 `.git`。[E: packages/core/src/ripgrep.ts:162][E: packages/core/src/ripgrep.ts:163][E: packages/core/src/ripgrep.ts:164][E: packages/core/src/ripgrep.ts:167][E: packages/core/src/ripgrep.ts:168][E: packages/core/src/ripgrep.ts:196][E: packages/core/src/ripgrep.ts:197][E: packages/core/src/ripgrep.ts:198][E: packages/core/src/ripgrep.ts:201][E: packages/core/src/ripgrep.ts:202] `grep` 用 `rg --json --hidden --no-messages`，optional include glob，显式 `--` 后传 pattern 和 file/dot。[E: packages/core/src/ripgrep.ts:226][E: packages/core/src/ripgrep.ts:227][E: packages/core/src/ripgrep.ts:228][E: packages/core/src/ripgrep.ts:229][E: packages/core/src/ripgrep.ts:230][E: packages/core/src/ripgrep.ts:231][E: packages/core/src/ripgrep.ts:233][E: packages/core/src/ripgrep.ts:234][E: packages/core/src/ripgrep.ts:235]

`grep` JSON record 超过 64KiB 失败，最多保留 100 个 submatches，match line 超过 2000 chars 会截断加 `...`。[E: packages/core/src/ripgrep.ts:21][E: packages/core/src/ripgrep.ts:22][E: packages/core/src/ripgrep.ts:238][E: packages/core/src/ripgrep.ts:239][E: packages/core/src/ripgrep.ts:252][E: packages/core/src/ripgrep.ts:274]

## Ignore/protected/watcher 相关

`filesystem/ignore.ts` 定义默认忽略 folder/file patterns，包括 `node_modules`、`dist`、`.git`、`.turbo`、logs/tmp/coverage 等。[E: packages/core/src/filesystem/ignore.ts:3][E: packages/core/src/filesystem/ignore.ts:4][E: packages/core/src/filesystem/ignore.ts:9][E: packages/core/src/filesystem/ignore.ts:16][E: packages/core/src/filesystem/ignore.ts:21][E: packages/core/src/filesystem/ignore.ts:34][E: packages/core/src/filesystem/ignore.ts:40][E: packages/core/src/filesystem/ignore.ts:41][E: packages/core/src/filesystem/ignore.ts:44][E: packages/core/src/filesystem/ignore.ts:48] `Watcher.layer` 在 experimental watcher enabled 时使用 `Ignore.PATTERNS`、config watcher ignore、protected paths 订阅 location directory，并把 file watcher events publish 成 `file.watcher.updated` EventV2。[E: packages/core/src/filesystem/watcher.ts:22][E: packages/core/src/filesystem/watcher.ts:24][E: packages/core/src/filesystem/watcher.ts:94][E: packages/core/src/filesystem/watcher.ts:112][E: packages/core/src/filesystem/watcher.ts:113][E: packages/core/src/filesystem/watcher.ts:114][E: packages/core/src/filesystem/watcher.ts:115][E: packages/core/src/filesystem/watcher.ts:117]

## 设计动机与权衡

- V2 filesystem facade 把 path containment 放在 read/list boundary，search backend 结果再映射成 Location-relative entries；这让 leaf tools 可以把权限和 presentation 放在工具层，而不是直接暴露 raw rg output。[E: packages/core/src/filesystem.ts:79][E: packages/core/src/filesystem/search.ts:64][E: packages/core/src/filesystem/search.ts:66][E: packages/core/src/filesystem/search.ts:90][E: packages/core/src/filesystem/search.ts:94][I]
- `Ripgrep` adapter 的硬接口只返回 `Entry[]`/`Match[]`，raw JSON parsing 在 `grep` adapter 的 `parse` pipeline 内完成；filesystem search layer 再把这些结果包成 `FileSystem.Entry` 和 `FileSystem.Match`。[E: packages/core/src/ripgrep.ts:81][E: packages/core/src/ripgrep.ts:82][E: packages/core/src/ripgrep.ts:83][E: packages/core/src/ripgrep.ts:84][E: packages/core/src/ripgrep.ts:237][E: packages/core/src/ripgrep.ts:238][E: packages/core/src/ripgrep.ts:241][E: packages/core/src/ripgrep.ts:248][E: packages/core/src/filesystem/search.ts:64][E: packages/core/src/filesystem/search.ts:90]
- Root `AGENTS.md` says V2 SessionRunner、model resolution、tool registry、permissions、filesystem must stay Location-scoped；`LocationServiceMap` 把 `FileSystem.locationLayer` 纳入 Location graph。[E: AGENTS.md:153][E: packages/core/src/location-layer.ts:70]

## Gotchas

- FFF is Bun-only in this source tree: Node adapter `available()` returns false, so node runtime always picks ripgrep fallback through `defaultLayer`。[E: packages/core/src/filesystem/fff.node.ts:131][E: packages/core/src/filesystem/search.ts:236][I]
- `FileSystemSearch.ripgrepLayer` starts a background full file scan for fuzzy `find`; `find` later consumes `state.files`/`state.directories` with `fuzzysort`, while `glob`/`grep` still call ripgrep per request instead of using only that startup state。[E: packages/core/src/filesystem/search.ts:35][E: packages/core/src/filesystem/search.ts:47][E: packages/core/src/filesystem/search.ts:55][E: packages/core/src/filesystem/search.ts:79][E: packages/core/src/filesystem/search.ts:104][E: packages/core/src/filesystem/search.ts:110]
- `grep` in ripgrep adapter passes `--hidden` and only excludes `.git` explicitly; broader ignores are a watcher/default-ignore concern unless passed through backend-specific flags elsewhere。[E: packages/core/src/ripgrep.ts:229][E: packages/core/src/ripgrep.ts:232][I]

## Sources

- `packages/core/src/filesystem.ts`
- `packages/core/src/filesystem/search.ts`
- `packages/core/src/filesystem/schema.ts`
- `packages/core/src/filesystem/fff.bun.ts`
- `packages/core/src/filesystem/fff.node.ts`
- `packages/core/src/filesystem/ignore.ts`
- `packages/core/src/filesystem/protected.ts`
- `packages/core/src/filesystem/watcher.ts`
- `packages/core/src/ripgrep.ts`
- `packages/core/src/ripgrep/binary.ts`
- `packages/core/src/location-layer.ts`
- `AGENTS.md`

## 相关

- [Glob](../../surface/tools/glob.md)
- [Grep](../../surface/tools/grep.md)
- [V2 工具系统](../tools/v2.md)

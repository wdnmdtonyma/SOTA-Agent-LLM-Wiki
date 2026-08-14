---
id: subsys.host.directory-picker
title: directory picker
kind: subsystem
tier: T2
pkg: host
source:
  - packages/host/directory-picker/src/index.ts
  - packages/host/directory-picker/tests/seam.spec.ts
  - packages/host/directory-picker-auto/src/index.ts
  - packages/host/directory-picker-auto/src/resolve.ts
  - packages/host/directory-picker-auto/src/probe.ts
  - packages/host/directory-picker-auto/tests/resolve.spec.ts
  - packages/host/directory-picker-auto/tests/loader-composition.spec.ts
  - packages/host/directory-picker-browse/src/index.ts
  - packages/host/directory-picker-browse/tests/service.spec.ts
  - packages/host/directory-picker-native/src/index.ts
  - packages/host/directory-picker-native/src/native-picker.ts
  - packages/host/directory-picker-native/src/win32-dialog.ts
  - packages/host/directory-picker-native/src/win32-dialog-host.ts
  - packages/host/directory-picker-native/src/win32-dialog-bindings.ts
  - packages/host/directory-picker-native/tests/service.spec.ts
  - packages/host/directory-picker-native/tests/native-picker.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/package.json
  - scripts/verify-cordis-config.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/host/webserver/src/index.ts
  - packages/host/apiproxy/src/index.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/host/apiproxy/src/api/rpc-map.ts
  - packages/host/apiproxy/src/fetch/client.ts
  - packages/host/apiproxy/tests/api-proxy-workspace.spec.ts
  - packages/client/connection/src/index.ts
  - packages/client/ui-workspace/src/client/WorkspacePicker.tsx
  - packages/client/ui-directory-picker-native/src/client/index.ts
  - packages/client/ui-directory-picker-browse/src/client/index.ts
  - vendor/cordis/src/service.ts
  - vendor/cordis/src/reflect.ts
symbols:
  - DirectoryPicker
  - ctx.directoryPicker
  - DirectoryPickerCapability
  - DirectoryPickerError
  - resolveDirectoryPickerBackend
  - BrowseDirectoryPicker
  - NativeDirectoryPicker
  - BACKEND_PACKAGES
  - SURFACE_PACKAGES
related:
  - spine.overview
  - subsys.composition.bundle-web-app
  - subsys.host.webserver
  - subsys.host.apiproxy
  - surface.profiles.web
  - spine.trace-web-first-prompt
  - subsys.client.connection
  - subsys.composition.bundle-headless
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-host-directory-picker` 是 **host 面** workspace 目录选择缝的 **Definition**：抽象类 `DirectoryPicker` 在构造里 `super(ctx, 'directoryPicker')` 登记 `ctx.directoryPicker`，对外只暴露 discriminated `capability()`（`native.pick` vs `browse.list` / `browse.createDirectory`），不是一套共用方法。定义包**不是** shipped Loader 行；`dsh web` 挂的是 `id: directory-picker` = `@deepseek-ai/dsh-host-directory-picker-auto`，boot 采样一次 bind / SSH / 平台 / Linux chooser，再 `loader.create` 成对挂上 backend + client surface。

## 能回答的问题

- `ctx.directoryPicker` 由哪个包声明、哪个插件 `provide`、哪个 RPC 当 Consumer？定义包自己是不是 `dsh-web-app` 的一行？
- web 挂的为什么是 **auto** 而不是 native / browse？`resolveDirectoryPickerBackend` 五条规则各自把什么判成 `browse`？
- `bindHost !== '127.0.0.1'`、SSH、非 darwin/win32、Linux 缺 chooser / 缺 display，分别落到哪一种 capability？
- browse 的 `fullyQualified` 篱笆拦什么？`maxEntries` / `truncated` / `hidden` / symlink 各是什么语义？
- `host.pickDirectory` / `host.listDirectory` / `host.createDirectory` 如何按 `kind` 分流？哪一个钉 loopback？
- `dsh-base` / `dsh-headless` 为什么没有 directory-picker 行？`--host 0.0.0.0` 被拒之后这条缝还在不在？

## 职责边界

本缝拥有 **operator 选 workspace 目录** 的 capability 词汇、两种交互 backend、以及 web 上的自适应装配。它活在 **host 面**（进程级，一次 boot 一份）：不进 agent-preset，不是模型可见 tool，不写 session log。选中的绝对路径交给 workspace / `session.create` 的 cwd，那是 [`subsys.host.apiproxy`](apiproxy.md) 与 persistence 的事。

本缝**不**拥有：

- HTTP listen / bind schema（[`subsys.host.webserver`](webserver.md) 的 `WebServer`；auto 只 **读** `ctx.webServer.host`）。
- `/api` 路由与 trust fence（[`subsys.client.connection`](../client/connection.md)）。`host.pickDirectory` 进 `PRIVILEGED_METHODS` 钉 loopback；`host.listDirectory` / `host.createDirectory` **不**在该集合里，因为 browse 就是给远程浏览器用的。
- BFF 合同与 `RpcMethodMap`（[`subsys.host.apiproxy`](apiproxy.md)）。本页只写它对 `ctx.directoryPicker.capability()` 的 kind 门。
- 浏览器壳槽位与「添加工作区」菜单（client 面 `ui-workspace` 的 `directoryFlow` hole）。两个 `ui-directory-picker-*` 是 auto 成对挂上的 surface，**不**各开子系统页。
- 模型可见 filesystem（[`subsys.execution.fs`](../execution/fs.md) 的 `ctx.fs`）。browse 用 `node:fs/promises` 直接扫 host 磁盘，不经 sandbox / `tool-fs`。

DSH 是 **Cordis 组合运行时**：主线 `profile → bundle → agent preset`；本缝只出现在 web bundle 的 host insert。本仓没有 shipped TUI。`--host 0.0.0.0` 在 `web-startup` 的 `program.error` 被拒，**不** `provide('webStartup')`，依赖它的 `webserver` 行 pending；auto 的 `inject = ['webServer', 'loader']` 同样不激活。`WebServer.Config.host` 仍是 `'127.0.0.1' | '0.0.0.0'`——一条替换整行 `config` 的 overlay 仍可能绑 all-interfaces，那时 auto 会采到 `0.0.0.0` 并选 browse。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/host/directory-picker/src/index.ts` | Definition：`DirectoryPicker` / `DirectoryPickerCapability` / `DirectoryPickerError` |
| `packages/host/directory-picker/tests/seam.spec.ts` | 子类登记为 `ctx.directoryPicker`；fiber dispose 带走服务；错误码 |
| `packages/host/directory-picker-auto/src/index.ts` | web shipped Provider：采样一次，`loader.create` backend + surface |
| `packages/host/directory-picker-auto/src/resolve.ts` | `resolveDirectoryPickerBackend` 纯函数 |
| `packages/host/directory-picker-auto/src/probe.ts` | Linux `zenity` / `kdialog` PATH 探测 |
| `packages/host/directory-picker-auto/tests/resolve.spec.ts` | 五条规则 + 空白 env = unset |
| `packages/host/directory-picker-auto/tests/loader-composition.spec.ts` | 真 Loader：成对挂载、不写回 yml、surface 失败回滚 |
| `packages/host/directory-picker-browse/src/index.ts` | `BrowseDirectoryPicker`：`fullyQualified`、bounded list、create |
| `packages/host/directory-picker-browse/tests/service.spec.ts` | 篱笆 / hidden / symlink / `truncated` / 错误码 |
| `packages/host/directory-picker-native/src/index.ts` | `NativeDirectoryPicker`：稳定 `native` capability |
| `packages/host/directory-picker-native/src/native-picker.ts` | osascript / zenity+kdialog；win32 默认转发 `pickWin32Directory` |
| `packages/host/directory-picker-native/src/win32-dialog.ts` | Win32 主线程 driver：`spawnWorker` 拉对话框子进程 |
| `packages/host/directory-picker-native/src/win32-dialog-host.ts` | `spawnDialogWorker`：`node:child_process.spawn` |
| `packages/host/directory-picker-native/src/win32-dialog-bindings.ts` | koffi + `CoCreateInstance` `IFileOpenDialog` |
| `packages/bundle/web-app/cordis.patch.yml` | `id: directory-picker` = auto |
| `packages/bundle/base/cordis.patch.yml` | 共享 core insert（`timer` / `hmr` / `llm` 起）；无 directory-picker |
| `packages/bundle/headless/cordis.patch.yml` | insert 只有 `code-runtime` / `headless-startup` / `headless-runner` |
| `packages/bundle/web-app/package.json` | auto + 两个 backend + 两个 client surface 依赖 |
| `scripts/verify-cordis-config.ts` | 挂 auto 的 composition 必须声明四个 runtime 包 |
| `packages/host/apiproxy/src/api-proxy.ts` | Consumer：`host.pickDirectory` / `listDirectory` / `createDirectory` |
| `packages/client/connection/src/index.ts` | `PRIVILEGED_METHODS` 含 `host.pickDirectory` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `DirectoryPickerCapability` | 由 `DirectoryPickerCapabilities` map 导出的 union。现有键：`native`（`pick(signal) → string \| null`）与 `browse`（`list` / `createDirectory`）。新 backend 用 declaration merge 加键，不要改定义包方法表。 |
| `DirectoryListing` | `path` + `home` + `crumbs`（根→当前，每粒可跳，`hidden` 恒 false）+ `entries`（子目录，按 name 排序）+ `truncated`。client **不**自己拼接路径段。 |
| `DirectoryEntry` | `name` / `path`（host 绝对路径）/ `hidden`（POSIX 点前缀；Windows hidden 属性不读）。是否显示由 client 决定。 |
| `DirectoryPickerError` | 闭集 `directory-unreadable` \| `directory-exists` \| `directory-create-failed`，带 `path`。apiproxy 1:1 映到 wire。 |
| `DirectoryPickerHostFacts` | auto 一次采样：`bindHost`（webserver schema 的 `'127.0.0.1' \| '0.0.0.0'`）、`platform`、`env`（`SSH_*` / `DISPLAY` / `WAYLAND_DISPLAY`）、`linuxChooser`。 |
| `BrowseDirectoryPicker.Config.maxEntries` | `z.natural().min(1)`，默认 `1000`。截断的是 name-sorted 尾；hidden 行计入 bound。 |
| `BACKEND_PACKAGES` / `SURFACE_PACKAGES` | `native` ↔ `@deepseek-ai/dsh-host-directory-picker-native` + `@deepseek-ai/dsh-client-ui-directory-picker-native`；`browse` ↔ `-browse` 一对。不是可调 config。 |

capability **对象**在服务生命周期内稳定：consumer 可以跨调用抓住同一引用。第二份 `DirectoryPicker` Provider 会撞 Cordis `service "directoryPicker" has been registered`。

## 控制流

1. **Definition 是库，不是行。** `DirectoryPicker@packages/host/directory-picker/src/index.ts` 构造调用 `super(ctx, 'directoryPicker')`，Cordis `Service` 立刻 `ctx.reflect.provide`。augmentation 声明 `Context.directoryPicker`。子类只欠 `capability()`。测试钉死：`ctx.plugin(StubPicker)` 之后 `ctx.get('directoryPicker')` 是该实例，`dispose` 后变 `undefined`。[E: packages/host/directory-picker/src/index.ts:133] [E: packages/host/directory-picker/src/index.ts:140] [E: vendor/cordis/src/service.ts:57] [E: packages/host/directory-picker/tests/seam.spec.ts:21]

2. **交互形状是 discriminated union，不是一套方法。** `native` 只有 `pick`（OS chooser，取消返回 `null`）。`browse` 只有 `list` / `createDirectory`（应用内浏览器，远程 client 也能用）。Consumer 必须 `switch` `capability().kind`。未知 `kind` 的**文档默认**是隐藏选择入口，不是 throw [I]（定义包模块说明；可执行代码没有 default fail 分支）。运行时：没挂上匹配 surface 时 `directoryFlow` hole 为空，`WorkspacePicker` 不加「添加工作区」项。[E: packages/host/directory-picker/src/index.ts:18] [E: packages/host/directory-picker/src/index.ts:64] [E: packages/host/directory-picker/src/index.ts:94]

3. **web 挂 auto，不挂定义包，也不直接挂某种 backend。** `dsh-web-app` 第一段 `insert` 写 `id: directory-picker` / `name: '@deepseek-ai/dsh-host-directory-picker-auto'`。[E: packages/bundle/web-app/cordis.patch.yml:90] [E: packages/bundle/web-app/cordis.patch.yml:91] `dsh-base` 的 `insert` 从 `timer` / `hmr` / `llm` 起铺共享 core，字面量里没有 `id: directory-picker`。[E: packages/bundle/base/cordis.patch.yml:16] [E: packages/bundle/base/cordis.patch.yml:19] [E: packages/bundle/base/cordis.patch.yml:24] `dsh-headless` 的 `insert` 只有 `code-runtime` / `headless-startup` / `headless-runner`。[E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31] web-app 的 `package.json` 同时声明 auto、两个 host backend、两个 client surface。[E: packages/bundle/web-app/package.json:91] [E: packages/bundle/web-app/package.json:92] [E: packages/bundle/web-app/package.json:93] [E: packages/bundle/web-app/package.json:60] [E: packages/bundle/web-app/package.json:61] `verify-cordis-config` 把 auto 会 `loader.create` 的运行时字符串做成硬编码清单：yml 扫到 `CHOOSER_PACKAGE` 时，四个 `CHOOSER_BACKEND_PACKAGES` 必须出现在同一 bundle 的 `dependencies`。[E: scripts/verify-cordis-config.ts:44] [E: scripts/verify-cordis-config.ts:53] [E: scripts/verify-cordis-config.ts:357]

4. **auto 等 `webServer`，再采样一次。** `apply@packages/host/directory-picker-auto/src/index.ts` 的 `inject = ['webServer', 'loader']`，`name = 'directory-picker-auto'`。它读 `ctx.webServer.host`（`WebServer` getter 返回 **config** 字面量，不是 OS 实际 bind）、`process.platform`、`process.env`，并用 `hasLinuxChooserBinary(process.env.PATH, canExecute)` 探 `zenity` / `kdialog`。`--host 0.0.0.0` 若在 `web-startup` 被拒，`webserver` 因 `inject: [webStartup]` pending，本行同样不跑，进程不 bind，也没有 picker。[E: packages/host/directory-picker-auto/src/index.ts:29] [E: packages/host/directory-picker-auto/src/index.ts:64] [E: packages/host/directory-picker-auto/src/index.ts:65] [E: packages/host/webserver/src/index.ts:85]

5. **`resolveDirectoryPickerBackend` 按序短路（后条只在前条未命中时生效）。**

   | # | 条件 | 结果 | 证据 |
   |---|---|---|---|
   | 1 | `bindHost !== '127.0.0.1'`（schema 里即 `'0.0.0.0'`） | `browse` | [E: packages/host/directory-picker-auto/src/resolve.ts:48] |
   | 2 | `SSH_CONNECTION` 或 `SSH_TTY` **非空**（空字符串当 unset） | `browse` | [E: packages/host/directory-picker-auto/src/resolve.ts:49] |
   | 3 | `platform === 'darwin' \|\| 'win32'` | `native` | [E: packages/host/directory-picker-auto/src/resolve.ts:50] |
   | 4 | 非 `linux`，或 `linuxChooser === false` | `browse` | [E: packages/host/directory-picker-auto/src/resolve.ts:51] |
   | 5 | linux 且有 chooser：`DISPLAY` 或 `WAYLAND_DISPLAY` 非空 → `native`，否则 `browse` | 见右 | [E: packages/host/directory-picker-auto/src/resolve.ts:52] |

   测试钉死：attended darwin/win32 → `native`；`bindHost: '0.0.0.0'` 不论其它信号 → `browse`；任一种 SSH 标记 → `browse`；linux 无 display 或无 chooser → `browse`；freebsd/openbsd 即使有 display+chooser → `browse`；空白 `SSH_*` / `DISPLAY` 当未设置。[E: packages/host/directory-picker-auto/tests/resolve.spec.ts:19] [E: packages/host/directory-picker-auto/tests/resolve.spec.ts:24] [E: packages/host/directory-picker-auto/tests/resolve.spec.ts:28] [E: packages/host/directory-picker-auto/tests/resolve.spec.ts:34] [E: packages/host/directory-picker-auto/tests/resolve.spec.ts:37] [E: packages/host/directory-picker-auto/tests/resolve.spec.ts:41] [E: packages/host/directory-picker-auto/tests/resolve.spec.ts:46]

6. **Linux chooser 探测是 PATH 扫描，不是试跑对话框。** `LINUX_CHOOSER_BINARIES = ['zenity', 'kdialog']`；`hasLinuxChooserBinary` 按 `path.delimiter` 拆 PATH，跳过空段，对每段 `join(dir, name)` 调 `canExecute`（`accessSync(..., X_OK)`）。缺 PATH / 空 PATH / 没有任何可执行文件 → `false`，规则 4 把 linux 打成 browse，避免 native 的每次 `pick` 都报「装 zenity 或 kdialog」。[E: packages/host/directory-picker-auto/src/probe.ts:13] [E: packages/host/directory-picker-auto/src/probe.ts:36] [E: packages/host/directory-picker-auto/src/probe.ts:40]

7. **决议结果写成一对 Loader 行，不写回 config。** `apply` 在 `ctx.effect` 里先 `loader.create({ name: BACKEND_PACKAGES[backend] })`，再 create 对应 `SURFACE_PACKAGES`。root-tree create：Loader 根是内存树，`write()` 对这次挂载是 no-op，resolved backend **不会**出现在 `cordis.yml`。真 Loader 测试：attended loopback 挂 native + native surface，配置文件不含 native 包名；`0.0.0.0` 或 SSH 挂 browse 一对。[E: packages/host/directory-picker-auto/src/index.ts:37] [E: packages/host/directory-picker-auto/src/index.ts:50] [E: packages/host/directory-picker-auto/src/index.ts:87] [E: packages/host/directory-picker-auto/tests/loader-composition.spec.ts:177] [E: packages/host/directory-picker-auto/tests/loader-composition.spec.ts:205]

8. **surface 失败必须带走已挂的 backend。** create 循环 catch 里先 `unmount()` 再抛。留下半套会让重试撞 `directoryPicker` 重复登记。测试：surface import 失败后 store 里没有 native、`ctx.get('directoryPicker')` 为 `undefined`。[E: packages/host/directory-picker-auto/src/index.ts:93] [E: packages/host/directory-picker-auto/tests/loader-composition.spec.ts:226]

9. **重复 Provider 抛 Cordis 标准错。** `reflect.provide` 发现同 isolate key 已有 impl 时抛 `service "${name}" has been registered at <fiber>`。这就是「第二份 backend」和「surface 失败留下 backend」要避免的碰撞。[E: vendor/cordis/src/reflect.ts:290]

10. **native backend：稳定对象 + 只适合坐在 host 屏幕前的人。** `NativeDirectoryPicker` 私有字段 `nativeCapability = { kind: 'native', pick: signal => pickNativeDirectory(signal) }`，`capability()` 每次返回同一引用（测试 `toBe`）。`pickNativeDirectory@packages/host/directory-picker-native/src/native-picker.ts`：darwin 跑 `osascript` `choose folder`；win32 默认走 `pickWin32Directory`（`pickWin32Directory` 调 `spawnWorker`，`spawnDialogWorker` 用 `node:child_process.spawn` 拉子进程；子进程 `import('koffi')` 后 `CoCreateInstance(..., IID_IFILE_OPEN_DIALOG, …)`；对话框失败原样上抛，`run` 命令通道不被调用，没有第二套命令级回退）；linux 先 `zenity --file-selection --directory`，`ENOENT` 再 `kdialog --getexistingdirectory`，两个都缺则抛 `install zenity or kdialog`。取消映射为 `null`。其它 platform 抛 `unsupported`。[E: packages/host/directory-picker-native/src/index.ts:21] [E: packages/host/directory-picker-native/tests/service.spec.ts:17] [E: packages/host/directory-picker-native/src/native-picker.ts:57] [E: packages/host/directory-picker-native/src/native-picker.ts:75] [E: packages/host/directory-picker-native/src/win32-dialog.ts:75] [E: packages/host/directory-picker-native/src/win32-dialog-host.ts:30] [E: packages/host/directory-picker-native/src/win32-dialog-bindings.ts:89] [E: packages/host/directory-picker-native/src/win32-dialog-bindings.ts:143] [E: packages/host/directory-picker-native/tests/native-picker.spec.ts:71] [E: packages/host/directory-picker-native/src/native-picker.ts:81] [E: packages/host/directory-picker-native/src/native-picker.ts:92] [E: packages/host/directory-picker-native/src/native-picker.ts:100] [E: packages/host/directory-picker-native/tests/native-picker.spec.ts:39]

11. **browse backend：fully-qualified 篱笆 + 有界 listing + 单段 create。** `BrowseDirectoryPicker` 同样握一份稳定 `{ kind: 'browse', list, createDirectory }`。`list`：缺 path 列 `homedir()`；给出的 path 必须 `fullyQualified`（POSIX 绝对路径；Win32 只要盘符根 `C:\` / `C:/` 或完整 UNC），否则 `directory-unreadable` 且 **path 保持 wire 原值**——禁止 `resolve()` 把相对路径或 Win32 无盘符根（`\foo`、`/foo`）rebase 到 cwd / 当前盘。`opendir` 流式读入 `maxEntries+1` 的 name-sorted 窗口；只让 dirent 目录或 symlink 进窗口；symlink 再 `stat` 跟到目录，坏链 / 指到文件则跳过。`hidden` 只是 `name.startsWith('.')`。`createDirectory`：父路径同一篱笆（失败码 `directory-create-failed`）；`name` 拒绝空白 / `.` / `..` / 含 `/` `\`；`mkdir` **非递归**；`EEXIST` → `directory-exists`。[E: packages/host/directory-picker-browse/src/index.ts:50] [E: packages/host/directory-picker-browse/src/index.ts:177] [E: packages/host/directory-picker-browse/src/index.ts:196] [E: packages/host/directory-picker-browse/src/index.ts:222] [E: packages/host/directory-picker-browse/src/index.ts:308] [E: packages/host/directory-picker-browse/src/index.ts:315] [E: packages/host/directory-picker-browse/tests/service.spec.ts:186]

12. **apiproxy 是 host 面 Consumer，按 kind 开门。** `ApiProxyService.static inject` 含 `'directoryPicker'`，所以 `id: api-gateway` 等 backend `provide` 之后才 ACTIVE。`host.pickDirectory` 要求 `kind === 'native'`，否则 `directory-picker-unavailable`（details 带实际 kind）；成功则 `capability.pick(signal)`，取消是 `ok` + `{ path: null }`，abort → `cancelled`，其它 throw → `internal`。`host.listDirectory` / `host.createDirectory` 要求 `kind === 'browse'`；`DirectoryPickerError` 经 `directoryError` 原样上 wire（`code` + `details.path`），未知 throw 折成 `internal`。`RpcMethodMap` 列出这三个名字。测试：browse composition 调 `pickDirectory`、native composition 调 list/create，都是 `directory-picker-unavailable`。[E: packages/host/apiproxy/src/index.ts:71] [E: packages/host/apiproxy/src/api-proxy.ts:2943] [E: packages/host/apiproxy/src/api-proxy.ts:2971] [E: packages/host/apiproxy/src/api-proxy.ts:2994] [E: packages/host/apiproxy/src/api-proxy.ts:629] [E: packages/host/apiproxy/src/api/rpc-map.ts:42] [E: packages/host/apiproxy/tests/api-proxy-workspace.spec.ts:156] [E: packages/host/apiproxy/tests/api-proxy-workspace.spec.ts:222]

13. **传输层：pick 是特权 + 无 30s 截止；list/create 不是特权。** client fetch 对 `host.pickDirectory` 传 `'caller-signal-only'`（系统对话框是人节奏）。`PRIVILEGED_METHODS` 含 `host.pickDirectory`（以及 `host.openPath` / settings / credentials 等），请求再跑一遍**空** trust list，钉死 loopback。`host.listDirectory` / `host.createDirectory` 不在该 Set：LAN 上的 browse 客户端需要它们；它们仍先过 `/api` 的 prefix trust fence（loopback 或 `trustedHosts`），细节在 [`subsys.client.connection`](../client/connection.md)。[E: packages/host/apiproxy/src/fetch/client.ts:439] [E: packages/client/connection/src/index.ts:108] [E: packages/client/connection/src/index.ts:146] [E: packages/client/connection/src/index.ts:147]

14. **client surface 不 switch kind。** auto 挂上的 `@deepseek-ai/dsh-client-ui-directory-picker-native` 把 renderless occupant 填进 `conversation.hero.workspace.directoryFlow` 与 `sidebar.workspaces.directoryFlow`，每次 `open` 调 `ctx.workspaces.pickDirectory()`（即 `host.pickDirectory`）。browse surface 填同一对 hole，驱动 `listDirectory` / `createDirectory`。两种 surface **不会**同时被 auto 挂上。[E: packages/client/ui-directory-picker-native/src/client/index.ts:31] [E: packages/client/ui-directory-picker-browse/src/client/index.ts:83]

15. **未知 kind / 没挂 surface → 隐藏入口，不是 RPC fail-loud。** `WorkspacePicker` 用 `useDirectoryFlow` 看 hole 是否被占：未被占则 `addEntries = []`；没有任何 workspace 且不能 add 时 `menuIsEmpty`；`Menu` 的 `open` 再与 `!menuIsEmpty` 相与，锚点手势什么都不弹。这就是「没有匹配 surface 时把选择入口藏起来」。若有人硬调错 kind 的 RPC，`ApiProxy` 仍回 `directory-picker-unavailable`。[E: packages/client/ui-workspace/src/client/WorkspacePicker.tsx:101] [E: packages/client/ui-workspace/src/client/WorkspacePicker.tsx:103] [E: packages/client/ui-workspace/src/client/WorkspacePicker.tsx:118] [E: packages/client/ui-workspace/src/client/WorkspacePicker.tsx:186]

16. **卸载：auto 的 disposer 按反序 `loader.remove`，并 join fiber teardown。** HMR / 卸插件后 `ctx.directoryPicker` 消失。树 teardown 已删掉的 entry 会 skip。本缝没有 Cordis `Events.waterfall`；门控是 Loader `inject` 与 kind 分支，不是必须 `next()` 的事件链。

## 设计动机

- **交互形状不同，不能做成一套方法。** native 是「一块 OS 模态框、取消即 `null`」；browse 是「一级一列、可建子目录、远程也能用」。硬揉成 `pick()` 会让远程 browser 永远打不开 host 屏幕上的对话框。
- **auto 采样一次，满足 seam 的稳定 capability。** bind / SSH / display 在进程生命里不热切换；换交互等于换 composition（overlay 直接挂 native 或 browse 一对），不是运行中改 `kind`。
- **all-interfaces 与 SSH 一律 browse。** OS chooser 画在 **host 显示器** 上。`--host 0.0.0.0` 旗标路径在 `provide('webStartup')` 之前被拒，默认 composition 不会 listen all-interfaces；若 overlay 仍把 `WebServer.Config.host` 写成 `'0.0.0.0'`（schema 允许），auto 必须选 browse，否则 LAN 浏览器会触发一台无人值守机器上的对话框。
- **成对挂 backend + surface。** client 不必打听 `kind`、不必做能力广告。一边失败就两边卸，避免重复 `provide('directoryPicker')`。
- **`fullyQualified` 反 rebase。** wire 上的相对路径或 Win32 无盘符根若交给 `path.resolve`，会落到 host 进程 cwd / 当前盘——那是把浏览范围偷偷扩到调用方没点名的树。
- **未知 kind 默认隐藏。** union 可 merge-extend；旧 client 碰到新 kind 不应崩，也不应弹出空的选目录 UI。

## Gotcha

- **定义包 ≠ shipped 行。** 在 yml 里写 `@deepseek-ai/dsh-host-directory-picker` 得不到 backend。web 的 id 是 `directory-picker`，name 是 **auto**。[E: packages/bundle/web-app/cordis.patch.yml:91]
- **`dsh-base` / `dsh-headless` 无此缝。** headless 没有 webserver，也就没有 `inject: ['webServer']` 的 auto；选目录是 Web GUI 的 host 能力，不是 agent-preset 工具。
- **`--host 0.0.0.0` 被拒 ≠ schema 禁止 all-interfaces。** 旗标失败时整条 `webStartup → webserver → directory-picker-auto → api-gateway(directoryPicker)` 都不激活。overlay 把 `webserver.config.host` 改成 `'0.0.0.0'` 时 webserver **会** listen，auto 选 browse。[E: packages/host/webserver/src/index.ts:61] [E: packages/host/directory-picker-auto/tests/resolve.spec.ts:24]
- **空白 `SSH_CONNECTION` / `SSH_TTY` / `DISPLAY` 当未设置。** shell 里 `export SSH_CONNECTION=` 不会把 attended darwin 打成 browse。[E: packages/host/directory-picker-auto/tests/resolve.spec.ts:46]
- **linux native 要 chooser 二进制和 display 同时在。** 有 `DISPLAY` 但 PATH 上没有 zenity/kdialog → browse。boot 之后才装 zenity 不会热切换。
- **`hidden` 不是「过滤」。** 点目录仍出现在 `entries` 里并计入 `maxEntries`；client 默认可以不画它们。Windows hidden 属性不读。
- **symlink 跟到目录，不跟到文件。** 坏链静默跳过，不报 `directory-unreadable`。窗口里被 skip 的 candidate **不**从窗口外回填——一旦 evict 过，`truncated` 仍为真。
- **`createDirectory` 非递归。** 缺失的父目录是失败，不是自动建一层。
- **`host.listDirectory` / `host.createDirectory` 不是特权方法。** 只靠 `/api` trust fence。不要把「三个 host 目录 RPC 都钉 loopback」写进脑子。
- **`host.pickDirectory` 没有默认 30s unary timeout。** 人关对话框之前调用一直挂着；connection abort 仍会杀掉 native 进程。
- **钉死交互 = 不要 auto，直接 compose 那一对包** [I]。只挂 backend 不挂 surface：RPC 可用，但 GUI 入口被藏。只挂 surface 不挂 backend：`api-gateway` 因 `inject: ['directoryPicker']` pending。
- **native chooser 画在 host 上。** SSH 端口转发打开的浏览器点「添加工作区」若被误判成 native，对话框会出现在无人看的服务器屏幕上——这就是规则 2 存在的原因。
- **本缝不走 `ctx.fs`。** browse 的 listing 不受 sandbox / observation policy 约束；它是 operator 选 cwd，不是模型读盘。

## Seam 三角

| 缝 | Definition | Provider | Consumer |
|---|---|---|---|
| `ctx.directoryPicker` | `@deepseek-ai/dsh-host-directory-picker`：`DirectoryPicker` / `DirectoryPickerCapability` / `DirectoryPickerError`。服务名 `'directoryPicker'`。定义包 **不是** Loader 行。 | **web-app**：`id: directory-picker` → auto → `loader.create` `NativeDirectoryPicker` 或 `BrowseDirectoryPicker`（`super` provide）。**base / headless**：无此行，服务不存在。 | `ApiProxyService` `static inject` 含 `directoryPicker`；`host.pickDirectory` / `listDirectory` / `createDirectory`。client surface 经 `workspaces.*` 间接触达同一 BFF。 |
| auto 装配 | `resolveDirectoryPickerBackend` + `BACKEND_PACKAGES` / `SURFACE_PACKAGES`。`inject = ['webServer', 'loader']`。 | **web-app** 行 `name: '@deepseek-ai/dsh-host-directory-picker-auto'`。boot 采样一次。**base / headless**：无。 | Loader store 里的一对 entry；卸 auto 带走两面。钉死交互则绕过本 Provider，直接 compose 那一对包。 |
| `native` capability | `DirectoryPickerNativeCapability.pick(signal)` → 绝对路径或 `null`。 | `NativeDirectoryPicker`（auto 在 loopback + 非 SSH + darwin/win32/linux-display+chooser 时挂）。 | `host.pickDirectory`；`ui-directory-picker-native` 占 `directoryFlow` hole。错 kind → `directory-picker-unavailable`。 |
| `browse` capability | `DirectoryPickerBrowseCapability.list` / `createDirectory` + `fullyQualified` 篱笆。 | `BrowseDirectoryPicker`（auto 在 all-interfaces / SSH / 无显示器平台时挂）。`maxEntries` 默认 1000。 | `host.listDirectory` / `host.createDirectory`；`ui-directory-picker-browse`。远程 client 走这条，不弹 host 对话框。 |
| bind 采样 | `WebServer.Config.host`：`'127.0.0.1' \| '0.0.0.0'`；`webServer.host` getter。 | **web-app** `id: webserver` `inject: [webStartup]`，缺省 `127.0.0.1:3080`。旗标 `--host 0.0.0.0` 在 `provide('webStartup')` 前被拒。**base / headless**：无 webserver。 | auto 规则 1。overlay 把 host 改成 `'0.0.0.0'` 时 Provider 仍合法，Consumer 必须选 browse。 |
| 空 hole 隐藏入口 | `DirectoryPickerCapabilities` 可 merge-extend；未知 kind 文档默认隐藏 [I]。 | 只有匹配的 `ui-directory-picker-*` 去 `slots.register` 两个 `directoryFlow` hole。 | `WorkspacePicker`：`flowAvailable === false` 则不加「添加工作区」。client **不** switch `kind`。 |

换 Provider（删 auto、只挂 browse、或 overlay 绑 `0.0.0.0`）会带走对应 Consumer：GUI 入口消失，或 `host.pickDirectory` 变 `directory-picker-unavailable`。Definition（服务名与 discriminated union）保持不变。

## Sources

- packages/host/directory-picker/src/index.ts
- packages/host/directory-picker/tests/seam.spec.ts
- packages/host/directory-picker-auto/src/index.ts
- packages/host/directory-picker-auto/src/resolve.ts
- packages/host/directory-picker-auto/src/probe.ts
- packages/host/directory-picker-auto/tests/resolve.spec.ts
- packages/host/directory-picker-auto/tests/loader-composition.spec.ts
- packages/host/directory-picker-browse/src/index.ts
- packages/host/directory-picker-browse/tests/service.spec.ts
- packages/host/directory-picker-native/src/index.ts
- packages/host/directory-picker-native/src/native-picker.ts
- packages/host/directory-picker-native/src/win32-dialog.ts
- packages/host/directory-picker-native/src/win32-dialog-host.ts
- packages/host/directory-picker-native/src/win32-dialog-bindings.ts
- packages/host/directory-picker-native/tests/service.spec.ts
- packages/host/directory-picker-native/tests/native-picker.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/package.json
- scripts/verify-cordis-config.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/host/webserver/src/index.ts
- packages/host/apiproxy/src/index.ts
- packages/host/apiproxy/src/api-proxy.ts
- packages/host/apiproxy/src/api/rpc-map.ts
- packages/host/apiproxy/src/fetch/client.ts
- packages/host/apiproxy/tests/api-proxy-workspace.spec.ts
- packages/client/connection/src/index.ts
- packages/client/ui-workspace/src/client/WorkspacePicker.tsx
- packages/client/ui-directory-picker-native/src/client/index.ts
- packages/client/ui-directory-picker-browse/src/client/index.ts
- vendor/cordis/src/service.ts
- vendor/cordis/src/reflect.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — web overlay 的 insert / disable；本缝是其中一行 host insert。
- [`subsys.host.webserver`](webserver.md) — listen 面与 `Config.host`；auto 读 `webServer.host`。
- [`subsys.host.apiproxy`](apiproxy.md) — BFF 合同；`host.*Directory` 的 Consumer 实现。
- [`surface.profiles.web`](../../surface/profiles/web.md) — `dsh web` 产品面与 host 插入 id 表（含 `directory-picker`）。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — 从 `dsh web` 到第一轮提问；workspace 选择发生在 `session.create` 之前。
- [`subsys.client.connection`](../client/connection.md) — `/api` carrier 与 `PRIVILEGED_METHODS` 的 loopback 钉。
- [`subsys.composition.bundle-headless`](../composition/bundle-headless.md) — 另一份 mode bundle：无 webserver、无 directory-picker。

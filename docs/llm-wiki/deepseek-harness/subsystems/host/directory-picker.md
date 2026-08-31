---
id: subsys.host.directory-picker
title: directory picker
kind: subsystem
tier: T2
pkg: host
source:
  - packages/host/directory-picker/src/index.ts
  - packages/host/directory-picker/src/types.ts
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
  - packages/api/workspace-controller/src/index.ts
  - packages/api/workspace-controller/src/directory-picker.ts
  - packages/api/workspace-controller/tests/directory-picker.host.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/package.json
  - packages/bundle/web-app/src/startup.ts
  - scripts/verify-cordis-config.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/host/webserver/src/index.ts
  - packages/client/ui-workspace/src/client/index.ts
  - packages/client/ui-workspace/src/client/navigation.ts
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
  - DirectoryPickerController
  - ctx.directoryPickerController
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
updated: 0a53fb55be
---

> `@deepseek-ai/dsh-host-directory-picker` 是 **host 面** workspace 目录选择缝的 **Definition**：抽象类 `DirectoryPicker` 在构造里 `super(ctx, 'directoryPicker')` 登记 `ctx.directoryPicker`，对外只暴露 discriminated `capability()`（`native.pick` vs `browse.list` / `browse.createDirectory`），不是一套共用方法。定义包**不是** shipped Loader 行；`dsh --profile web`（别名 `dsh web`）挂的是 `id: directory-picker` = `@deepseek-ai/dsh-host-directory-picker-auto`，boot 采样一次 bind / SSH / 平台 / Linux chooser，再 `loader.create` 成对挂上 backend + client surface。wire Consumer 是 `DirectoryPickerController`（`packages/api/workspace-controller`），Remote namespace `'directoryPicker'`，动词 `pick` / `list` / `createDirectory`。

## 能回答的问题

- `ctx.directoryPicker` 由哪个包声明、哪个插件 `provide`、哪个 Remote 当 Consumer？定义包自己是不是 `dsh-web-app` 的一行？
- web 挂的为什么是 **auto** 而不是 native / browse？`resolveDirectoryPickerBackend` 五条规则各自把什么判成 `browse`？
- `bindHost !== '127.0.0.1'`、SSH、非 darwin/win32、Linux 缺 chooser / 缺 display，分别落到哪一种 capability？
- browse 的 `fullyQualified` 篱笆拦什么？`maxEntries` / `truncated` / `hidden` / symlink 各是什么语义？
- `directoryPicker/pick` / `list` / `createDirectory` 如何按 `kind` 分流？错 kind 的 Remote 码是什么？
- `dsh-base` / `dsh-headless` / `sdk` / `sdk-minimal` / `acp` 为什么没有 directory-picker 行？`--host 0.0.0.0` 被拒之后这条缝还在不在？

## 职责边界

本缝拥有 **operator 选 workspace 目录** 的 capability 词汇、两种交互 backend、以及 web 上的自适应装配。它活在 **host 面**（进程级，一次 boot 一份）：不进 agent-preset，不是模型可见 tool，不写 session log。选中的绝对路径交给 workspace / session create 的 cwd，那是 [`subsys.host.apiproxy`](apiproxy.md)（现为三个 `packages/api/*-controller` + webserver）与 persistence 的事。

本缝**不**拥有：

- HTTP listen / bind schema（[`subsys.host.webserver`](webserver.md) 的 `WebServer`；auto 只 **读** `ctx.webServer.host`）。
- Typert Gateway mux 与 `/api` 传输（[`subsys.host.apiproxy`](apiproxy.md)）。本页只写 `DirectoryPickerController` 对 `ctx.directoryPicker.capability()` 的 kind 门。
- 浏览器壳槽位与「添加工作区」菜单（client 面 `ui-workspace` 的 `directoryFlow` hole）。两个 `ui-directory-picker-*` 是 auto 成对挂上的 surface，**不**各开子系统页。
- 模型可见 filesystem（[`subsys.execution.fs`](../execution/fs.md) 的 `ctx.fs`）。browse 用 `node:fs/promises` 直接扫 host 磁盘，不经 sandbox / `tool-fs`。

DSH 是 **Cordis 组合运行时**：主线 `profile → bundle → agent preset`。五个 shipped profile 是 `web` / `headless` / `sdk` / `sdk-minimal` / `acp`；本缝只出现在 **web bundle** 的 host insert。本仓没有 shipped TUI。`--host 0.0.0.0` 在 `web-startup` 的 `program.error` 被拒，**不** `provide` `webStartup`，yml 里 `inject: [webStartup]` 的 `webserver` 行 pending；auto 的 `inject = ['webServer', 'loader']` 同样不激活。[E: packages/bundle/web-app/src/startup.ts:74] [E: packages/bundle/web-app/cordis.patch.yml:113] `WebServer.Config.host` 仍是 `'127.0.0.1' | '0.0.0.0'`——一条替换整行 `config` 的 overlay 仍可能绑 all-interfaces，那时 auto 会采到 `0.0.0.0` 并选 browse。[E: packages/host/webserver/src/index.ts:61]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/host/directory-picker/src/index.ts` | Definition：`DirectoryPicker` / `DirectoryPickerCapability` / `DirectoryPickerError` |
| `packages/host/directory-picker/src/types.ts` | `DirectoryListing` / `DirectoryEntry`（client-safe） |
| `packages/host/directory-picker/tests/seam.spec.ts` | 子类登记为 `ctx.directoryPicker`；fiber dispose 带走服务 |
| `packages/host/directory-picker-auto/src/index.ts` | web shipped Provider：采样一次，`loader.create` backend + surface |
| `packages/host/directory-picker-auto/src/resolve.ts` | `resolveDirectoryPickerBackend` 纯函数 |
| `packages/host/directory-picker-auto/src/probe.ts` | Linux `zenity` / `kdialog` PATH 探测 |
| `packages/host/directory-picker-browse/src/index.ts` | `BrowseDirectoryPicker`：`fullyQualified`、bounded list、create |
| `packages/host/directory-picker-native/src/index.ts` | `NativeDirectoryPicker`：稳定 `native` capability |
| `packages/host/directory-picker-native/src/native-picker.ts` | osascript / zenity+kdialog；win32 默认转发 `pickWin32Directory` |
| `packages/api/workspace-controller/src/directory-picker.ts` | Consumer：`DirectoryPickerController` Remote `pick` / `list` / `createDirectory` |
| `packages/api/workspace-controller/src/index.ts` | `WorkspaceController` 构造里 `ctx.plugin(DirectoryPickerController)` |
| `packages/bundle/web-app/cordis.patch.yml` | `id: directory-picker` = auto |
| `packages/bundle/base/cordis.patch.yml` | 共享 core insert；无 directory-picker |
| `packages/bundle/headless/cordis.patch.yml` | insert 只有 `code-runtime` / `headless-startup` / `headless-runner` |
| `scripts/verify-cordis-config.ts` | 挂 auto 的 composition 必须声明四个 runtime 包 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `DirectoryPickerCapability` | 由 `DirectoryPickerCapabilities` map 导出的 union。现有键：`native`（`pick(signal) → string \| null`）与 `browse`（`list` / `createDirectory`）。新 backend 用 declaration merge 加键。 |
| `DirectoryListing` | `path` + `home` + `crumbs`（根→当前，每粒可跳，`hidden` 恒 false）+ `entries`（子目录，按 name 排序）+ `truncated`。client **不**自己拼接路径段。 |
| `DirectoryEntry` | `name` / `path`（host 绝对路径）/ `hidden`（POSIX 点前缀；Windows hidden 属性不读）。 |
| `DirectoryPickerError` | 闭集 `directory-unreadable` \| `directory-exists` \| `directory-create-failed`，带 `path`。controller 映到 `directory-picker/unreadable` / `exists` / `create-failed`。 |
| `DirectoryPickerHostFacts` | auto 一次采样：`bindHost`、`platform`、`env`（`SSH_*` / `DISPLAY` / `WAYLAND_DISPLAY`）、`linuxChooser`。 |
| `BrowseDirectoryPicker.Config.maxEntries` | `z.natural().min(1)`，默认 `1000`。截断的是 name-sorted 尾；hidden 行计入 bound。 |
| `BACKEND_PACKAGES` / `SURFACE_PACKAGES` | `native` ↔ host-native + client-ui-native；`browse` ↔ 一对 `-browse`。不是可调 config。 |

capability **对象**在服务生命周期内稳定：consumer 可以跨调用抓住同一引用。第二份 `DirectoryPicker` Provider 会撞 Cordis `service "directoryPicker" has been registered`。

## 控制流

1. **Definition 是库，不是行。** `DirectoryPicker` 构造调用 `super(ctx, 'directoryPicker')`，Cordis `Service` 立刻 `ctx.reflect.provide`。augmentation 声明 `Context.directoryPicker`。子类只欠 `capability()`。测试：`ctx.plugin(StubPicker)` 之后 `ctx.get('directoryPicker')` 是该实例，`dispose` 后变 `undefined`。[E: packages/host/directory-picker/src/index.ts:105] [E: packages/host/directory-picker/src/index.ts:92] [E: vendor/cordis/src/service.ts:57] [E: packages/host/directory-picker/tests/seam.spec.ts:21]

2. **交互形状是 discriminated union，不是一套方法。** `native` 只有 `pick`（OS chooser，取消返回 `null`）。`browse` 只有 `list` / `createDirectory`。Consumer 必须 `switch` `capability().kind`。未知 `kind` 的**文档默认**是隐藏选择入口，不是 throw [I]（定义包模块说明）。运行时：没挂上匹配 surface 时 `directoryFlow` hole 为空，`WorkspacePicker` 不加「添加工作区」项。[E: packages/host/directory-picker/src/index.ts:20] [E: packages/host/directory-picker/src/index.ts:66] [E: packages/host/directory-picker/src/index.ts:92]

3. **web 挂 auto，不挂定义包，也不直接挂某种 backend。** `dsh-web-app` insert 写 `id: directory-picker` / `name: '@deepseek-ai/dsh-host-directory-picker-auto'`。[E: packages/bundle/web-app/cordis.patch.yml:78] [E: packages/bundle/web-app/cordis.patch.yml:79] `dsh-base` 的 `insert` 从 `timer` / `hmr` / `llm` 起铺共享 core，字面量里没有 `id: directory-picker`。[E: packages/bundle/base/cordis.patch.yml:16] [E: packages/bundle/base/cordis.patch.yml:21] [E: packages/bundle/base/cordis.patch.yml:27] `dsh-headless` 的 `insert` 只有 `code-runtime` / `headless-startup` / `headless-runner`。[E: packages/bundle/headless/cordis.patch.yml:19] [E: packages/bundle/headless/cordis.patch.yml:22] [E: packages/bundle/headless/cordis.patch.yml:26] web-app 的 `package.json` 同时声明 auto、两个 host backend、两个 client surface。[E: packages/bundle/web-app/package.json:98] [E: packages/bundle/web-app/package.json:99] [E: packages/bundle/web-app/package.json:100] [E: packages/bundle/web-app/package.json:65] [E: packages/bundle/web-app/package.json:66] `verify-cordis-config` 把 auto 会 `loader.create` 的运行时字符串做成硬编码清单：yml 扫到 `CHOOSER_PACKAGE` 时，四个 `CHOOSER_BACKEND_PACKAGES` 必须出现在同一 bundle 的 `dependencies`。[E: scripts/verify-cordis-config.ts:42] [E: scripts/verify-cordis-config.ts:51] [E: scripts/verify-cordis-config.ts:455]

4. **auto 等 `webServer`，再采样一次。** `apply` 的 `inject = ['webServer', 'loader']`，`name = 'directory-picker-auto'`。它读 `ctx.webServer.host`（getter 返回 **config** 字面量，不是 OS 实际 bind）、`process.platform`、`process.env`，并用 `hasLinuxChooserBinary(process.env.PATH, canExecute)` 探 `zenity` / `kdialog`。`--host 0.0.0.0` 若在 `web-startup` 被拒，`webserver` 因 yml `inject: [webStartup]` pending，本行同样不跑。[E: packages/host/directory-picker-auto/src/index.ts:27] [E: packages/host/directory-picker-auto/src/index.ts:29] [E: packages/host/directory-picker-auto/src/index.ts:63] [E: packages/host/webserver/src/index.ts:155]

5. **`resolveDirectoryPickerBackend` 按序短路（后条只在前条未命中时生效）。**

   | # | 条件 | 结果 | 证据 |
   |---|---|---|---|
   | 1 | `bindHost !== '127.0.0.1'`（schema 里即 `'0.0.0.0'`） | `browse` | [E: packages/host/directory-picker-auto/src/resolve.ts:48] |
   | 2 | `SSH_CONNECTION` 或 `SSH_TTY` **非空**（空字符串当 unset） | `browse` | [E: packages/host/directory-picker-auto/src/resolve.ts:49] |
   | 3 | `platform === 'darwin' \|\| 'win32'` | `native` | [E: packages/host/directory-picker-auto/src/resolve.ts:50] |
   | 4 | 非 `linux`，或 `linuxChooser === false` | `browse` | [E: packages/host/directory-picker-auto/src/resolve.ts:51] |
   | 5 | linux 且有 chooser：`DISPLAY` 或 `WAYLAND_DISPLAY` 非空 → `native`，否则 `browse` | 见右 | [E: packages/host/directory-picker-auto/src/resolve.ts:52] |

   测试钉死：attended darwin/win32 → `native`；`bindHost: '0.0.0.0'` 不论其它信号 → `browse`；任一种 SSH 标记 → `browse`；linux 无 display 或无 chooser → `browse`；freebsd/openbsd 即使有 display+chooser → `browse`；空白 `SSH_*` / `DISPLAY` 当未设置。[E: packages/host/directory-picker-auto/tests/resolve.spec.ts:19] [E: packages/host/directory-picker-auto/tests/resolve.spec.ts:24] [E: packages/host/directory-picker-auto/tests/resolve.spec.ts:28] [E: packages/host/directory-picker-auto/tests/resolve.spec.ts:34] [E: packages/host/directory-picker-auto/tests/resolve.spec.ts:40] [E: packages/host/directory-picker-auto/tests/resolve.spec.ts:45]

6. **Linux chooser 探测是 PATH 扫描，不是试跑对话框。** `LINUX_CHOOSER_BINARIES = ['zenity', 'kdialog']`；`hasLinuxChooserBinary` 按 `path.delimiter` 拆 PATH，跳过空段，对每段 `join(dir, name)` 调 `canExecute`（`accessSync(..., X_OK)`）。缺 PATH / 空 PATH / 没有任何可执行文件 → `false`，规则 4 把 linux 打成 browse。[E: packages/host/directory-picker-auto/src/probe.ts:13] [E: packages/host/directory-picker-auto/src/probe.ts:36] [E: packages/host/directory-picker-auto/src/probe.ts:40]

7. **决议结果写成一对 Loader 行，不写回 config。** `apply` 在 `ctx.effect` 里先 `loader.create({ name: BACKEND_PACKAGES[backend] })`，再 create 对应 `SURFACE_PACKAGES`。root-tree create：Loader 根是内存树，`write()` 对这次挂载是 no-op。真 Loader 测试：attended loopback 挂 native + native surface，配置文件不含 native 包名；`0.0.0.0` 或 SSH 挂 browse 一对。[E: packages/host/directory-picker-auto/src/index.ts:37] [E: packages/host/directory-picker-auto/src/index.ts:50] [E: packages/host/directory-picker-auto/src/index.ts:85] [E: packages/host/directory-picker-auto/tests/loader-composition.spec.ts:181] [E: packages/host/directory-picker-auto/tests/loader-composition.spec.ts:216]

8. **surface 失败必须带走已挂的 backend。** create 循环 catch 里先 `unmount()` 再抛。留下半套会让重试撞 `directoryPicker` 重复登记。测试：surface import 失败后 store 里没有 native、`ctx.get('directoryPicker')` 为 `undefined`。[E: packages/host/directory-picker-auto/src/index.ts:92] [E: packages/host/directory-picker-auto/tests/loader-composition.spec.ts:237]

9. **重复 Provider 抛 Cordis 标准错。** `reflect.provide` 发现同 isolate key 已有 impl 时抛 `service "${name}" has been registered at <fiber>`。[E: vendor/cordis/src/reflect.ts:290]

10. **native backend：稳定对象 + 只适合坐在 host 屏幕前的人。** `NativeDirectoryPicker` 私有字段 `nativeCapability = { kind: 'native', pick: signal => pickNativeDirectory(signal) }`，`capability()` 每次返回同一引用（测试 `toBe`）。`pickNativeDirectory`：darwin 跑 `osascript` `choose folder`；win32 默认走 `pickWin32Directory`（`spawnWorker` → `spawnDialogWorker` 用 `node:child_process.spawn` 拉子进程；子进程 `import('koffi')` 后 `CoCreateInstance(..., IID_IFILE_OPEN_DIALOG, …)`；对话框失败原样上抛，`run` 命令通道不被调用）；linux 先 `zenity --file-selection --directory`，`ENOENT` 再 `kdialog --getexistingdirectory`，两个都缺则抛 `install zenity or kdialog`。取消映射为 `null`。其它 platform 抛 `unsupported`。[E: packages/host/directory-picker-native/src/index.ts:21] [E: packages/host/directory-picker-native/tests/service.spec.ts:17] [E: packages/host/directory-picker-native/src/native-picker.ts:57] [E: packages/host/directory-picker-native/src/native-picker.ts:75] [E: packages/host/directory-picker-native/src/win32-dialog.ts:71] [E: packages/host/directory-picker-native/src/win32-dialog-host.ts:30] [E: packages/host/directory-picker-native/src/win32-dialog-bindings.ts:90] [E: packages/host/directory-picker-native/src/win32-dialog-bindings.ts:145] [E: packages/host/directory-picker-native/tests/native-picker.spec.ts:70] [E: packages/host/directory-picker-native/src/native-picker.ts:81] [E: packages/host/directory-picker-native/src/native-picker.ts:92] [E: packages/host/directory-picker-native/src/native-picker.ts:100] [E: packages/host/directory-picker-native/tests/native-picker.spec.ts:38]

11. **browse backend：fully-qualified 篱笆 + 有界 listing + 单段 create。** `BrowseDirectoryPicker` 握一份稳定 `{ kind: 'browse', list, createDirectory }`。`list`：缺 path 列 `homedir()`；给出的 path 必须 `fullyQualified`（POSIX 绝对路径；Win32 只要盘符根 `C:\` / `C:/` 或完整 UNC），否则 `directory-unreadable` 且 **path 保持 wire 原值**。`opendir` 流式读入 `maxEntries+1` 的 name-sorted 窗口；只让 dirent 目录或 symlink 进窗口；symlink 再 `stat` 跟到目录。`hidden` 只是 `name.startsWith('.')`。`createDirectory`：父路径同一篱笆（失败码 `directory-create-failed`）；`name` 拒绝空白 / `.` / `..` / 含 `/` `\`；`mkdir` **非递归**；`EEXIST` → `directory-exists`。[E: packages/host/directory-picker-browse/src/index.ts:50] [E: packages/host/directory-picker-browse/src/index.ts:199] [E: packages/host/directory-picker-browse/src/index.ts:222] [E: packages/host/directory-picker-browse/src/index.ts:302] [E: packages/host/directory-picker-browse/src/index.ts:308] [E: packages/host/directory-picker-browse/src/index.ts:315] [E: packages/host/directory-picker-browse/tests/service.spec.ts:195]

12. **workspace-controller 是 host 面 Consumer，按 kind 开门。** `WorkspaceController` 构造里 `ctx.plugin(DirectoryPickerController)`：directory-picker 缝本身不是 Loader 行，没有 backend 时 child 保持 pending，不注册 picking namespace。[E: packages/api/workspace-controller/src/index.ts:49] `DirectoryPickerController.static inject = ['directoryPicker']`，服务名 `'directoryPickerController'`，Remote namespace `'directoryPicker'`。[E: packages/api/workspace-controller/src/directory-picker.ts:42] [E: packages/api/workspace-controller/src/directory-picker.ts:46] `@Remote('pick')` 要求 `kind === 'native'`，否则 `directory-picker/unavailable`（details `{ capability }`）；abort → `gateway/cancelled`，其它 throw → `gateway/internal`。`list` / `createDirectory` 要求 `kind === 'browse'`；`DirectoryPickerError` 经 `BROWSE_FAILURE_CODES` 上 wire；无效 `name` 在 dispatch 前 `gateway/bad-request`。测试：browse composition 调 `pick`、native composition 调 list/create，都是 `directory-picker/unavailable`。[E: packages/api/workspace-controller/src/directory-picker.ts:54] [E: packages/api/workspace-controller/src/directory-picker.ts:71] [E: packages/api/workspace-controller/src/directory-picker.ts:87] [E: packages/api/workspace-controller/src/directory-picker.ts:112] [E: packages/api/workspace-controller/src/directory-picker.ts:127] [E: packages/api/workspace-controller/tests/directory-picker.host.spec.ts:100] [E: packages/api/workspace-controller/tests/directory-picker.host.spec.ts:164]

13. **client 经 `ctx.remote.directoryPicker`，不 switch kind。** `ui-workspace` `inject` 含 `'remote.directoryPicker'`；`UiWorkspaceService.pickDirectory` 调 `directoryPicker.pick()`，list/create 同名。[E: packages/client/ui-workspace/src/client/index.ts:63] [E: packages/client/ui-workspace/src/client/navigation.ts:140] native surface 把 renderless occupant 填进 `conversation.hero.workspace.directoryFlow` 与 `sidebar.workspaces.directoryFlow`，每次 `open` 调 `ctx.uiWorkspace.pickDirectory()`。browse surface 填同一对 hole，驱动 `listDirectory` / `createDirectory`。两种 surface **不会**同时被 auto 挂上。[E: packages/client/ui-directory-picker-native/src/client/index.ts:29] [E: packages/client/ui-directory-picker-browse/src/client/index.ts:79]

14. **未知 kind / 没挂 surface → 隐藏入口，不是 Remote fail-loud。** `WorkspacePicker` 用 `useDirectoryFlow` 看 hole 是否被占：未被占则 `addEntries = []`；`menuIsEmpty` 时锚点手势不弹 Menu。硬调错 kind 的 Remote 仍回 `directory-picker/unavailable`。[E: packages/client/ui-workspace/src/client/WorkspacePicker.tsx:92] [E: packages/client/ui-workspace/src/client/WorkspacePicker.tsx:101] [E: packages/client/ui-workspace/src/client/WorkspacePicker.tsx:118] [E: packages/client/ui-workspace/src/client/WorkspacePicker.tsx:186]

15. **卸载：auto 的 disposer 按反序 `loader.remove`，并 join fiber teardown。** HMR / 卸插件后 `ctx.directoryPicker` 消失。树 teardown 已删掉的 entry 会 skip。本缝没有 Cordis `Events.waterfall`；门控是 Loader `inject` 与 kind 分支。

## 设计动机

- **交互形状不同，不能做成一套方法。** native 是「一块 OS 模态框、取消即 `null`」；browse 是「一级一列、可建子目录、远程也能用」。
- **auto 采样一次，满足 seam 的稳定 capability。** bind / SSH / display 在进程生命里不热切换；换交互等于换 composition。
- **all-interfaces 与 SSH 一律 browse。** OS chooser 画在 **host 显示器** 上。`--host 0.0.0.0` 旗标路径在 `provide` webStartup 之前被拒；若 overlay 仍把 `WebServer.Config.host` 写成 `'0.0.0.0'`，auto 必须选 browse。
- **成对挂 backend + surface。** client 不必打听 `kind`。一边失败就两边卸，避免重复 `provide('directoryPicker')`。
- **`fullyQualified` 反 rebase。** wire 上的相对路径或 Win32 无盘符根若交给 `path.resolve`，会落到 host 进程 cwd / 当前盘。
- **未知 kind 默认隐藏。** union 可 merge-extend；旧 client 碰到新 kind 不应崩。

## Gotcha

- **定义包 ≠ shipped 行。** 在 yml 里写 `@deepseek-ai/dsh-host-directory-picker` 得不到 backend。web 的 id 是 `directory-picker`，name 是 **auto**。[E: packages/bundle/web-app/cordis.patch.yml:79]
- **只有 web bundle 有此缝。** `dsh-base` / `dsh-headless` 无此行；`sdk` / `sdk-minimal` / `acp` 同样是 startup profile、不叠 web-app，没有 webserver+auto。选目录是 Web GUI 的 host 能力，不是 agent-preset 工具。宿主入口除 `dsh web` 外还有 `dsh --profile sdk|sdk-minimal|acp|headless`。
- **`--host 0.0.0.0` 被拒 ≠ schema 禁止 all-interfaces。** 旗标失败时 `webStartup → webserver → directory-picker-auto` 都不激活。overlay 把 `webserver.config.host` 改成 `'0.0.0.0'` 时 webserver **会** listen，auto 选 browse。[E: packages/host/webserver/src/index.ts:61] [E: packages/host/directory-picker-auto/tests/resolve.spec.ts:24]
- **空白 `SSH_CONNECTION` / `SSH_TTY` / `DISPLAY` 当未设置。** shell 里 `export SSH_CONNECTION=` 不会把 attended darwin 打成 browse。[E: packages/host/directory-picker-auto/tests/resolve.spec.ts:45]
- **linux native 要 chooser 二进制和 display 同时在。** 有 `DISPLAY` 但 PATH 上没有 zenity/kdialog → browse。boot 之后才装 zenity 不会热切换。
- **`hidden` 不是「过滤」。** 点目录仍出现在 `entries` 里并计入 `maxEntries`。Windows hidden 属性不读。
- **symlink 跟到目录，不跟到文件。** 坏链静默跳过。窗口里被 skip 的 candidate **不**从窗口外回填。
- **`createDirectory` 非递归。** 缺失的父目录是失败。
- **wire 名不是 `host.pickDirectory`。** 现为 Typert Remote `directoryPicker/pick|list|createDirectory`。旧 `PRIVILEGED_METHODS` / `packages/host/apiproxy` 已不存在。
- **`pick` 没有业务超时。** 人关对话框之前调用一直挂着；abort 仍会杀掉 native 进程。
- **钉死交互 = 不要 auto，直接 compose 那一对包** [I]。只挂 backend 不挂 surface：RPC 可用，但 GUI 入口被藏。只挂 surface 不挂 backend：`DirectoryPickerController` 因 `inject: ['directoryPicker']` pending。
- **native chooser 画在 host 上。** SSH 端口转发打开的浏览器点「添加工作区」若被误判成 native，对话框会出现在无人看的服务器屏幕上。
- **本缝不走 `ctx.fs`。** browse listing 不受 sandbox / observation policy 约束。

## Seam 三角

| 缝 | Definition | Provider | Consumer |
|---|---|---|---|
| `ctx.directoryPicker` | `@deepseek-ai/dsh-host-directory-picker`：`DirectoryPicker` / `DirectoryPickerCapability` / `DirectoryPickerError`。服务名 `'directoryPicker'`。定义包 **不是** Loader 行。 | **web-app**：`id: directory-picker` → auto → `loader.create` `NativeDirectoryPicker` 或 `BrowseDirectoryPicker`。**base / headless / sdk / sdk-minimal / acp**：无此行。 | `DirectoryPickerController` `static inject` 含 `directoryPicker`；Remote `pick` / `list` / `createDirectory`。client 经 `ctx.remote.directoryPicker` 与 `uiWorkspace.*`。 |
| auto 装配 | `resolveDirectoryPickerBackend` + `BACKEND_PACKAGES` / `SURFACE_PACKAGES`。`inject = ['webServer', 'loader']`。 | **web-app** 行 `name: '@deepseek-ai/dsh-host-directory-picker-auto'`。boot 采样一次。 | Loader store 里的一对 entry；卸 auto 带走两面。钉死交互则绕过本 Provider。 |
| `native` capability | `DirectoryPickerNativeCapability.pick(signal)` → 绝对路径或 `null`。 | `NativeDirectoryPicker`（auto 在 loopback + 非 SSH + darwin/win32/linux-display+chooser 时挂）。 | `directoryPicker/pick`；`ui-directory-picker-native` 占 `directoryFlow` hole。错 kind → `directory-picker/unavailable`。 |
| `browse` capability | `DirectoryPickerBrowseCapability.list` / `createDirectory` + `fullyQualified` 篱笆。 | `BrowseDirectoryPicker`（auto 在 all-interfaces / SSH / 无显示器平台时挂）。`maxEntries` 默认 1000。 | `directoryPicker/list` / `createDirectory`；`ui-directory-picker-browse`。 |
| bind 采样 | `WebServer.Config.host`：`'127.0.0.1' \| '0.0.0.0'`；`webServer.host` getter。 | **web-app** `id: webserver` `inject: [webStartup]`，缺省 `127.0.0.1:3080`。旗标 `--host 0.0.0.0` 在 provide webStartup 前被拒。 | auto 规则 1。overlay 把 host 改成 `'0.0.0.0'` 时 Provider 仍合法，必须选 browse。 |
| 空 hole 隐藏入口 | `DirectoryPickerCapabilities` 可 merge-extend；未知 kind 文档默认隐藏 [I]。 | 只有匹配的 `ui-directory-picker-*` 去 `slots.register` 两个 `directoryFlow` hole。 | `WorkspacePicker`：`flowAvailable === false` 则不加「添加工作区」。client **不** switch `kind`。 |

换 Provider（删 auto、只挂 browse、或 overlay 绑 `0.0.0.0`）会带走对应 Consumer：GUI 入口消失，或 `directoryPicker/pick` 变 `directory-picker/unavailable`。Definition（服务名与 discriminated union）保持不变。

## Sources

- packages/host/directory-picker/src/index.ts
- packages/host/directory-picker/src/types.ts
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
- packages/api/workspace-controller/src/index.ts
- packages/api/workspace-controller/src/directory-picker.ts
- packages/api/workspace-controller/tests/directory-picker.host.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/package.json
- packages/bundle/web-app/src/startup.ts
- scripts/verify-cordis-config.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/host/webserver/src/index.ts
- packages/client/ui-workspace/src/client/index.ts
- packages/client/ui-workspace/src/client/navigation.ts
- packages/client/ui-workspace/src/client/WorkspacePicker.tsx
- packages/client/ui-directory-picker-native/src/client/index.ts
- packages/client/ui-directory-picker-browse/src/client/index.ts
- vendor/cordis/src/service.ts
- vendor/cordis/src/reflect.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — web overlay 的 insert / disable；本缝是其中一行 host insert。
- [`subsys.host.webserver`](webserver.md) — listen 面与 `Config.host`；auto 读 `webServer.host`。
- [`subsys.host.apiproxy`](apiproxy.md) — Host HTTP API（三个 controller + webserver）；directory picker Remote 挂在 workspace-controller 包内。
- [`surface.profiles.web`](../../surface/profiles/web.md) — `dsh web` / `--profile web` 产品面与 host 插入 id 表（含 `directory-picker`）。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — 从 web 入口到第一轮提问；workspace 选择发生在 session create 之前。
- [`subsys.client.connection`](../client/connection.md) — `/api` carrier 与浏览器 trust fence。
- [`subsys.composition.bundle-headless`](../composition/bundle-headless.md) — 另一份 mode bundle：无 webserver、无 directory-picker。

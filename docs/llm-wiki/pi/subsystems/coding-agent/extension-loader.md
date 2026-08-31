---
id: subsys.coding-agent.extension-loader
title: 扩展发现与加载
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/extensions/loader.ts
  - packages/coding-agent/src/core/extensions/index.ts
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/resource-loader.ts
  - packages/coding-agent/src/core/extensions/runner.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/docs/extensions.md
  - packages/coding-agent/test/extensions-discovery.test.ts
  - packages/coding-agent/test/suite/regressions/extension-factory-cache.test.ts
  - packages/coding-agent/test/suite/regressions/8423-extension-factory-failure.test.ts
  - packages/coding-agent/test/suite/regressions/8237-node-sea-extension-loading.test.ts
  - scripts/build-coding-agent-bundle.mjs
symbols: [discoverAndLoadExtensions, loadExtension, createExtensionRuntime]
related: [spine.extension-lifecycle, subsys.coding-agent.extension-runner, subsys.coding-agent.resource-loader]
evidence: explicit
status: verified
updated: 853a80d26c
---

> `extension-loader` 是 pi-coding-agent 的 TypeScript extension discovery and loading 子系统: 它把 `.pi/extensions`、`~/.pi/agent/extensions`、settings/CLI paths 或 inline factories 变成 `LoadExtensionsResult`, 其中包含 loaded `Extension[]`、load errors 和尚未绑定到会话动作的 shared `ExtensionRuntime`。

## 能回答的问题

- `discoverAndLoadExtensions` 会按什么顺序发现 project/global/configured extension entry points?
- extension directory 支持哪些入口格式, `package.json` 里的 `pi.extensions` 和 `index.ts` 谁优先?
- loader 阶段哪些 `pi.*` API 只是 registration, 哪些 action 会因为 runtime 未绑定而不能用?
- `createExtensionRuntime` 为什么会先生成 throwing stubs, 再由 `ExtensionRunner.bindCore` 补真实实现?
- `loadExtensionsCached` 的 cache 作用域是什么, reload 为什么会清掉 cache?
- factory 抛错后, pending flag / provider / EventBus 订阅会不会留在 shared runtime 上?
- Node SEA 或 bundled Node CLI 下, jiti 为什么走 `virtualModules` 而不是 filesystem alias?
- loader、resource-loader、extension-runner、agent-session 的职责边界怎么分?

## 职责边界

`packages/coding-agent/src/core/extensions/loader.ts` 负责发现 extension entry point、用 `jiti` 导入 default factory、创建 `Extension` collection、创建 `ExtensionAPI` registration surface, 并把 factory 执行期间注册的 handlers/tools/commands/flags/shortcuts/renderers 收集进 `Extension` 对象。[E: packages/coding-agent/src/core/extensions/loader.ts:510] [E: packages/coding-agent/src/core/extensions/loader.ts:524] [E: packages/coding-agent/src/core/extensions/loader.ts:545] [E: packages/coding-agent/src/core/extensions/loader.ts:556] factory 成功后 `commit()` 才把 pending flag defaults 与 provider register/unregister 写进 shared runtime; factory 抛错则 `discard()` 退订 loading-phase EventBus 订阅并把 API 标为 `failed`, 避免半成品状态泄漏。[E: packages/coding-agent/src/core/extensions/loader.ts:461] [E: packages/coding-agent/src/core/extensions/loader.ts:463] [E: packages/coding-agent/src/core/extensions/loader.ts:473] [E: packages/coding-agent/src/core/extensions/loader.ts:557] [E: packages/coding-agent/src/core/extensions/loader.ts:559] loader 不负责 event dispatch, 也不负责把 action methods 接到真实会话; `ExtensionRunner.bindCore()` 才会把 `sendMessage`、tool getters/setters、`setModel` 等 action implementations 写入 shared runtime。[E: packages/coding-agent/src/core/extensions/runner.ts:317] [E: packages/coding-agent/src/core/extensions/runner.ts:327] [E: packages/coding-agent/src/core/extensions/runner.ts:336] [E: packages/coding-agent/src/core/extensions/runner.ts:338]

`packages/coding-agent/src/core/extensions/index.ts` 是 extension subsystem 的 public barrel export: 它 re-export `createExtensionRuntime`、`discoverAndLoadExtensions`、`loadExtensionFromFactory`、`loadExtensions`, 以及 `ExtensionRunner` 和 `ExtensionAPI`/`ExtensionRuntime` 等类型。[E: packages/coding-agent/src/core/extensions/index.ts:7] [E: packages/coding-agent/src/core/extensions/index.ts:21] [E: packages/coding-agent/src/core/extensions/index.ts:60] [E: packages/coding-agent/src/core/extensions/index.ts:76]

## 关键文件

- `packages/coding-agent/src/core/extensions/loader.ts`: `discoverAndLoadExtensions`、`loadExtensions`、`loadExtensionsCached`、`loadExtensionFromFactory`、`createExtensionRuntime` 的实现。
- `packages/coding-agent/src/core/extensions/index.ts`: 对外导出 loader 函数、runner、types 和 wrapper。
- `packages/coding-agent/src/core/extensions/types.ts`: `ExtensionRuntime`、`Extension`、`LoadExtensionsResult` 的数据合同。
- `packages/coding-agent/src/core/resource-loader.ts`: product startup/reload 时组合 package manager、project trust、CLI paths、inline factories, 然后调用 loader。
- `packages/coding-agent/src/core/extensions/runner.ts`: 把 loader 产物绑定到 session actions, 并负责 event dispatch。
- `packages/coding-agent/test/extensions-discovery.test.ts`: 发现规则、入口优先级、错误收集和显式路径的行为测试。
- `packages/coding-agent/test/suite/regressions/extension-factory-cache.test.ts`: factory cache 的 reload/cwd 作用域回归测试。
- `packages/coding-agent/test/suite/regressions/8423-extension-factory-failure.test.ts`: factory 失败后 discard pending flag / provider / EventBus 订阅 (`#8424`)。
- `packages/coding-agent/test/suite/regressions/8237-node-sea-extension-loading.test.ts`: Node SEA 下 jiti 使用 `virtualModules` 且 `tryNative: false` (`#8237`)。

## 数据模型

`ExtensionRuntime` 是 loader 创建、runner 完成的 shared runtime: 类型层把它定义成 `ExtensionRuntimeState` 加 `ExtensionActions`。[E: packages/coding-agent/src/core/extensions/types.ts:1756] loader 创建 runtime 时把 action methods 指到 `notInitialized` throwing stub, runner 绑定时再把真实 actions 写回 shared runtime。[E: packages/coding-agent/src/core/extensions/loader.ts:179] [E: packages/coding-agent/src/core/extensions/loader.ts:180] [E: packages/coding-agent/src/core/extensions/loader.ts:192] [E: packages/coding-agent/src/core/extensions/runner.ts:327] runtime state 里有 `flagValues`、load 阶段暂存 provider registrations 的 `pendingProviderRegistrations`、`assertActive()` 和 `invalidate()`。[E: packages/coding-agent/src/core/extensions/types.ts:1663] [E: packages/coding-agent/src/core/extensions/types.ts:1664] [E: packages/coding-agent/src/core/extensions/types.ts:1666] [E: packages/coding-agent/src/core/extensions/types.ts:1670] [E: packages/coding-agent/src/core/extensions/types.ts:1672]

`Extension` 是单个 loaded extension 的 registration bag: 它保留原始 `path`、`resolvedPath`、`sourceInfo`, 以及 `handlers`、`tools`、`messageRenderers`、`commands`、`flags`、`shortcuts` 六类 collection。[E: packages/coding-agent/src/core/extensions/types.ts:1759] [E: packages/coding-agent/src/core/extensions/types.ts:1760] [E: packages/coding-agent/src/core/extensions/types.ts:1764] [E: packages/coding-agent/src/core/extensions/types.ts:1771] loader 的 `createExtension()` 会实际创建这些 `Map`。[E: packages/coding-agent/src/core/extensions/loader.ts:531] [E: packages/coding-agent/src/core/extensions/loader.ts:535] [E: packages/coding-agent/src/core/extensions/loader.ts:541]

`LoadExtensionsResult` 是 loader 交给上游的批量结果: 它包含 `extensions`、`errors` 和一个 shared `runtime`。[E: packages/coding-agent/src/core/extensions/types.ts:1775] [E: packages/coding-agent/src/core/extensions/types.ts:1776] [E: packages/coding-agent/src/core/extensions/types.ts:1777] [E: packages/coding-agent/src/core/extensions/types.ts:1779] `loadExtensionsInternal()` 在同一批 paths 内创建或复用同一个 `EventBus` 和同一个 `ExtensionRuntime`, 然后把同一个 `resolvedRuntime` 放进返回值。[E: packages/coding-agent/src/core/extensions/loader.ts:619] [E: packages/coding-agent/src/core/extensions/loader.ts:620] [E: packages/coding-agent/src/core/extensions/loader.ts:627] [E: packages/coding-agent/src/core/extensions/loader.ts:644]

## 控制流

1. `discoverAndLoadExtensions(configuredPaths, cwd, agentDir, eventBus)` 先把 `cwd` 与 `agentDir` 解析成绝对路径, 建立 `allPaths` 与 `seen` 去重集合。[E: packages/coding-agent/src/core/extensions/loader.ts:764] [E: packages/coding-agent/src/core/extensions/loader.ts:765] [E: packages/coding-agent/src/core/extensions/loader.ts:766] [E: packages/coding-agent/src/core/extensions/loader.ts:767]

2. discovery 顺序是 project-local `cwd/${CONFIG_DIR_NAME}/extensions`, global `agentDir/extensions`, 最后 configured paths。[E: packages/coding-agent/src/core/extensions/loader.ts:780] [E: packages/coding-agent/src/core/extensions/loader.ts:781] [E: packages/coding-agent/src/core/extensions/loader.ts:784] [E: packages/coding-agent/src/core/extensions/loader.ts:785] [E: packages/coding-agent/src/core/extensions/loader.ts:788] user docs 把这些位置描述为 trusted locations, 并说明 project-local `.pi/extensions` only load after project trust。[E: packages/coding-agent/docs/extensions.md:113]

3. `discoverExtensionsInDir(dir)` 对一个 extensions directory 做 shallow discovery: 直接文件或 symlink 只接受 `.ts`/`.js`; 子目录或 symlink 交给 `resolveExtensionEntries()` 判断入口。[E: packages/coding-agent/src/core/extensions/loader.ts:722] [E: packages/coding-agent/src/core/extensions/loader.ts:735] [E: packages/coding-agent/src/core/extensions/loader.ts:742]

4. `resolveExtensionEntries(dir)` 先读取 `package.json` 的 `pi.extensions`; 存在且声明的 entry file 真实存在时, 返回这些 entry paths。[E: packages/coding-agent/src/core/extensions/loader.ts:681] [E: packages/coding-agent/src/core/extensions/loader.ts:683] [E: packages/coding-agent/src/core/extensions/loader.ts:684] [E: packages/coding-agent/src/core/extensions/loader.ts:687] [E: packages/coding-agent/src/core/extensions/loader.ts:688] 如果没有 manifest entry, 再按 `index.ts` 优先、`index.js` 其次返回入口。[E: packages/coding-agent/src/core/extensions/loader.ts:699] [E: packages/coding-agent/src/core/extensions/loader.ts:701] [E: packages/coding-agent/src/core/extensions/loader.ts:704]

5. tests 明确覆盖入口优先级和深度限制: `package.json` 的 `pi.extensions` 会优先于同目录 `index.ts`, 没有 index/manifest 的子目录会被忽略, 且不会递归到第二层目录。[E: packages/coding-agent/test/extensions-discovery.test.ts:208] [E: packages/coding-agent/test/extensions-discovery.test.ts:223] [E: packages/coding-agent/test/extensions-discovery.test.ts:229] [E: packages/coding-agent/test/extensions-discovery.test.ts:252] [E: packages/coding-agent/test/extensions-discovery.test.ts:258] [E: packages/coding-agent/test/extensions-discovery.test.ts:264] [E: packages/coding-agent/test/extensions-discovery.test.ts:272]

6. configured path 如果解析后是 directory, loader 先尝试 package manifest 或 index entry; 找不到 entry 时才在该目录内发现直接文件和一层子目录。[E: packages/coding-agent/src/core/extensions/loader.ts:788] [E: packages/coding-agent/src/core/extensions/loader.ts:790] [E: packages/coding-agent/src/core/extensions/loader.ts:792] [E: packages/coding-agent/src/core/extensions/loader.ts:798] 如果 configured path 不是 existing directory, loader 会直接把 resolved path 加入 `allPaths`, 后续 import 失败再形成 load error。[E: packages/coding-agent/src/core/extensions/loader.ts:802]

7. `loadExtensionsInternal(paths, cwd, eventBus, runtime, useCache)` 逐个调用 private `loadExtension()`, 把成功的 `Extension` push 到 `extensions`, 把失败的 `{ path, error }` push 到 `errors`, 最后返回 `LoadExtensionsResult`。[E: packages/coding-agent/src/core/extensions/loader.ts:608] [E: packages/coding-agent/src/core/extensions/loader.ts:622] [E: packages/coding-agent/src/core/extensions/loader.ts:631] [E: packages/coding-agent/src/core/extensions/loader.ts:637] [E: packages/coding-agent/src/core/extensions/loader.ts:641]

8. `loadExtension()` 先用 `resolvePath(extensionPath, cwd, { normalizeUnicodeSpaces: true })` 解析路径, 再调用 `loadExtensionModule(resolvedPath, cacheToken)` 导入 factory。[E: packages/coding-agent/src/core/extensions/loader.ts:573] [E: packages/coding-agent/src/core/extensions/loader.ts:576] `loadExtensionModule()` 使用 `createJiti(import.meta.url, options)` 和 `jiti.import(extensionPath, { default: true })`, default export 不是函数时会返回 invalid factory error。[E: packages/coding-agent/src/core/extensions/loader.ts:498] [E: packages/coding-agent/src/core/extensions/loader.ts:510] [E: packages/coding-agent/src/core/extensions/loader.ts:512] [E: packages/coding-agent/src/core/extensions/loader.ts:578] [E: packages/coding-agent/src/core/extensions/loader.ts:579]

9. jiti 的 import resolution 按运行时分成三支: Bun binary、Node SEA (`process.features.sea` 或 `node:sea.isSea()`) 和 bundled Node (`PI_BUNDLED_NODE`) 走 `virtualModules` 且 `tryNative: false`; source TypeScript 走 `virtualModules` + `tsconfigPaths`; 未打包的 Node dist 走 `alias: getAliases()`。[E: packages/coding-agent/src/core/extensions/loader.ts:78] [E: packages/coding-agent/src/core/extensions/loader.ts:81] [E: packages/coding-agent/src/core/extensions/loader.ts:82] [E: packages/coding-agent/src/core/extensions/loader.ts:498] [E: packages/coding-agent/src/core/extensions/loader.ts:503] [E: packages/coding-agent/src/core/extensions/loader.ts:504] [E: packages/coding-agent/src/core/extensions/loader.ts:506] [E: packages/coding-agent/src/core/extensions/loader.ts:507] SEA 回归测试断言 compiled-binary 分支覆盖 source 分支: `tryNative === false`、没有 `alias`、`virtualModules` 含 typebox 与 `@earendil-works/pi-coding-agent`。[E: packages/coding-agent/test/suite/regressions/8237-node-sea-extension-loading.test.ts:35] [E: packages/coding-agent/test/suite/regressions/8237-node-sea-extension-loading.test.ts:45] [E: packages/coding-agent/test/suite/regressions/8237-node-sea-extension-loading.test.ts:46] [E: packages/coding-agent/test/suite/regressions/8237-node-sea-extension-loading.test.ts:47] bundled Node CLI 的 esbuild 把 `jiti/static` 换成 lazy `require("jiti")`, 因此 jiti/Babel 只在真正 import extension 时才加载。[E: scripts/build-coding-agent-bundle.mjs:28] [E: scripts/build-coding-agent-bundle.mjs:81] [E: scripts/build-coding-agent-bundle.mjs:94] `getAliases()` 同时支持当前 `@earendil-works/*` 包名和旧的 `@mariozechner/*` 包名。[E: packages/coding-agent/src/core/extensions/loader.ts:123] [E: packages/coding-agent/src/core/extensions/loader.ts:131]

10. `initializeExtension()` 创建空 `Extension` 和带 `commit`/`discard` 的 API wrapper, 然后 `await factory(load.api)`: 成功则 `commit()`, 抛错则 `discard()` 再把异常交给 `loadExtension()` 转成 `Failed to load extension: ...`。[E: packages/coding-agent/src/core/extensions/loader.ts:553] [E: packages/coding-agent/src/core/extensions/loader.ts:554] [E: packages/coding-agent/src/core/extensions/loader.ts:556] [E: packages/coding-agent/src/core/extensions/loader.ts:557] [E: packages/coding-agent/src/core/extensions/loader.ts:559] [E: packages/coding-agent/src/core/extensions/loader.ts:582] [E: packages/coding-agent/src/core/extensions/loader.ts:585] [E: packages/coding-agent/src/core/extensions/loader.ts:587] tests 覆盖了 invalid code、初始化抛错和缺少 default export 三种错误路径。[E: packages/coding-agent/test/extensions-discovery.test.ts:339] [E: packages/coding-agent/test/extensions-discovery.test.ts:342] [E: packages/coding-agent/test/extensions-discovery.test.ts:399] [E: packages/coding-agent/test/extensions-discovery.test.ts:407] [E: packages/coding-agent/test/extensions-discovery.test.ts:414] [E: packages/coding-agent/test/extensions-discovery.test.ts:422]

11. `createExtensionAPI()` 的 registration methods 只写当前 `Extension`: `pi.on()` 写 `handlers`, `registerTool()` 写 `tools`, `registerCommand()` 写 `commands`, `registerShortcut()` 写 `shortcuts`, `registerFlag()` 写 `flags`, `registerMessageRenderer()` 写 `messageRenderers`。[E: packages/coding-agent/src/core/extensions/loader.ts:282] [E: packages/coding-agent/src/core/extensions/loader.ts:286] [E: packages/coding-agent/src/core/extensions/loader.ts:289] [E: packages/coding-agent/src/core/extensions/loader.ts:291] [E: packages/coding-agent/src/core/extensions/loader.ts:298] [E: packages/coding-agent/src/core/extensions/loader.ts:300] [E: packages/coding-agent/src/core/extensions/loader.ts:313] [E: packages/coding-agent/src/core/extensions/loader.ts:315] [E: packages/coding-agent/src/core/extensions/loader.ts:318] [E: packages/coding-agent/src/core/extensions/loader.ts:328] [E: packages/coding-agent/src/core/extensions/loader.ts:338] [E: packages/coding-agent/src/core/extensions/loader.ts:340] `registerFlag()` 在 loading 阶段把 default 放进 `pendingFlagValues` 而不是立刻写 `runtime.flagValues`; `default` 的 typeof 必须匹配 `type`, 否则立即抛错。[E: packages/coding-agent/src/core/extensions/loader.ts:323] [E: packages/coding-agent/src/core/extensions/loader.ts:330] [E: packages/coding-agent/src/core/extensions/loader.ts:331] [E: packages/coding-agent/src/core/extensions/types.ts:1331]

12. `createExtensionRuntime()` 的 pre-bind runtime 把 action methods 初始化为 throwing stubs, 但 `refreshTools` 是 no-op, 因为 `registerTool()` 在 load 阶段是合法 registration 而不需要马上刷新 session tool registry。[E: packages/coding-agent/src/core/extensions/loader.ts:179] [E: packages/coding-agent/src/core/extensions/loader.ts:180] [E: packages/coding-agent/src/core/extensions/loader.ts:181] [E: packages/coding-agent/src/core/extensions/loader.ts:191] [E: packages/coding-agent/src/core/extensions/loader.ts:202] [E: packages/coding-agent/src/core/extensions/loader.ts:295] action API 如 `sendMessage()`、`getActiveTools()`、`getCommands()`、`setModel()` 在 loader 阶段只会 `assertActive()` 后委托 runtime, 因而真实动作取决于 runner 之后是否绑定。[E: packages/coding-agent/src/core/extensions/loader.ts:362] [E: packages/coding-agent/src/core/extensions/loader.ts:364] [E: packages/coding-agent/src/core/extensions/loader.ts:397] [E: packages/coding-agent/src/core/extensions/loader.ts:399] [E: packages/coding-agent/src/core/extensions/loader.ts:412] [E: packages/coding-agent/src/core/extensions/loader.ts:414] [E: packages/coding-agent/src/core/extensions/loader.ts:417] [E: packages/coding-agent/src/core/extensions/loader.ts:419]

13. provider registration 是特殊两阶段路径: factory 里的 `registerProvider()` / `unregisterProvider()` 经 `applyRuntimeChange()` 在 loading 阶段只入队, `commit()` 后才调用 runtime; 绑定期 `ExtensionRunner.bindCore()` 再 flush `pendingProviderRegistrations`。[E: packages/coding-agent/src/core/extensions/loader.ts:270] [E: packages/coding-agent/src/core/extensions/loader.ts:436] [E: packages/coding-agent/src/core/extensions/loader.ts:444] [E: packages/coding-agent/src/core/extensions/loader.ts:469] [E: packages/coding-agent/src/core/extensions/loader.ts:232] [E: packages/coding-agent/src/core/extensions/runner.ts:357] factory 失败时这些 runtime change 从未 apply, 并发成功的另一个 factory 的 pending provider 也不会被 discard。[E: packages/coding-agent/test/suite/regressions/8423-extension-factory-failure.test.ts:12] [E: packages/coding-agent/test/suite/regressions/8423-extension-factory-failure.test.ts:48] [E: packages/coding-agent/test/suite/regressions/8423-extension-factory-failure.test.ts:49] [E: packages/coding-agent/test/suite/regressions/8423-extension-factory-failure.test.ts:57]

14. `loadExtensionFromFactory()` 给 SDK/inline factories 绕过 filesystem discovery: 它解析 cwd 后同样走 `initializeExtension()`, 因此 inline factory 失败也会 `discard()`。[E: packages/coding-agent/src/core/extensions/loader.ts:594] [E: packages/coding-agent/src/core/extensions/loader.ts:598] [E: packages/coding-agent/src/core/extensions/loader.ts:602] `DefaultResourceLoader` 会把 inline factories 用同一个 runtime 载入并追加到 path-loaded extensions 后面。[E: packages/coding-agent/src/core/resource-loader.ts:579] [E: packages/coding-agent/src/core/resource-loader.ts:580] [E: packages/coding-agent/src/core/resource-loader.ts:581]

15. cache 只用于 `loadExtensionsCached()`: direct `loadExtensions()` 调 `loadExtensionsInternal(..., useCache=false)`, cached 版本调 `loadExtensionsInternal(..., useCache=true)`。[E: packages/coding-agent/src/core/extensions/loader.ts:648] [E: packages/coding-agent/src/core/extensions/loader.ts:654] [E: packages/coding-agent/src/core/extensions/loader.ts:657] [E: packages/coding-agent/src/core/extensions/loader.ts:663] cache token 由 resolved cwd 和 generation 组成, cwd 变化会 `clearExtensionCache()`。[E: packages/coding-agent/src/core/extensions/loader.ts:166] [E: packages/coding-agent/src/core/extensions/loader.ts:168] [E: packages/coding-agent/src/core/extensions/loader.ts:169] [E: packages/coding-agent/src/core/extensions/loader.ts:172]

16. cache 缓存的是 imported factory, 不是 `Extension` instance 或 runtime: regression test 断言 same-cwd cached loads 只产生一次 module load, 但 factory run 两次, 且两次返回的 `Extension` 和 runtime 都不是同一个对象。[E: packages/coding-agent/test/suite/regressions/extension-factory-cache.test.ts:74] [E: packages/coding-agent/test/suite/regressions/extension-factory-cache.test.ts:75] [E: packages/coding-agent/test/suite/regressions/extension-factory-cache.test.ts:77] [E: packages/coding-agent/test/suite/regressions/extension-factory-cache.test.ts:78] [E: packages/coding-agent/test/suite/regressions/extension-factory-cache.test.ts:79] [E: packages/coding-agent/test/suite/regressions/extension-factory-cache.test.ts:80] direct `loadExtensions()` 不走 cache, resource-loader reload 会清 cache, cache 也按 cwd 隔离。[E: packages/coding-agent/test/suite/regressions/extension-factory-cache.test.ts:88] [E: packages/coding-agent/test/suite/regressions/extension-factory-cache.test.ts:91] [E: packages/coding-agent/test/suite/regressions/extension-factory-cache.test.ts:108] [E: packages/coding-agent/test/suite/regressions/extension-factory-cache.test.ts:111] [E: packages/coding-agent/test/suite/regressions/extension-factory-cache.test.ts:124] [E: packages/coding-agent/test/suite/regressions/extension-factory-cache.test.ts:128]

17. Product startup/reload 路径通常不直接调用 `discoverAndLoadExtensions`; `DefaultResourceLoader.reload()` 通过 package manager 得到 resolved extension resources 和 CLI extension sources, 用 `loadFinalExtensionSet()` 调 `loadExtensionsCached()`。[E: packages/coding-agent/src/core/resource-loader.ts:404] [E: packages/coding-agent/src/core/resource-loader.ts:405] [E: packages/coding-agent/src/core/resource-loader.ts:428] [E: packages/coding-agent/src/core/resource-loader.ts:447] [E: packages/coding-agent/src/core/resource-loader.ts:456] [E: packages/coding-agent/src/core/resource-loader.ts:579] 这意味着 `discoverAndLoadExtensions` 更像 low-level discovery API 和测试入口, 而实际产品路径把 discovery/package resolution 的一部分放在 package-manager/resource-loader 层。[I]

18. `AgentSession._buildRuntime()` 从 resource loader 取 `LoadExtensionsResult`, 用 `extensions` 和 shared `runtime` 构造 `ExtensionRunner`, 再调用 `_bindExtensionCore()` 和 `_applyExtensionBindings()`。[E: packages/coding-agent/src/core/agent-session.ts:2781] [E: packages/coding-agent/src/core/agent-session.ts:2788] [E: packages/coding-agent/src/core/agent-session.ts:2789] [E: packages/coding-agent/src/core/agent-session.ts:2790] [E: packages/coding-agent/src/core/agent-session.ts:2798] [E: packages/coding-agent/src/core/agent-session.ts:2799] `_bindExtensionCore()` 注入的 product actions 包括 tool list 操作、`refreshTools`、`setModel` 以及 provider register/unregister 后刷新当前模型。[E: packages/coding-agent/src/core/agent-session.ts:2602] [E: packages/coding-agent/src/core/agent-session.ts:2605] [E: packages/coding-agent/src/core/agent-session.ts:2607] [E: packages/coding-agent/src/core/agent-session.ts:2648] [E: packages/coding-agent/src/core/agent-session.ts:2654] [E: packages/coding-agent/src/core/agent-session.ts:2656] [E: packages/coding-agent/src/core/agent-session.ts:2658]

## 设计动机与权衡

- loader 把 import/registration 和 runtime binding 分开, 让 extension factory 在 startup 阶段声明贡献, 而真正依赖 session state 的 action methods 等到 `ExtensionRunner.bindCore()` 再接线。[E: packages/coding-agent/src/core/extensions/loader.ts:179] [E: packages/coding-agent/src/core/extensions/loader.ts:554] [E: packages/coding-agent/src/core/extensions/runner.ts:317] 这是从 pre-bind stubs 与 bind-time action injection 共同推出的 lifecycle split。[I]
- `package.json` `pi.extensions` 优先于 `index.ts`, 允许 package 显式声明多个或非标准入口; 缺失的 manifest entry 会被跳过而不是报错。[E: packages/coding-agent/src/core/extensions/loader.ts:683] [E: packages/coding-agent/src/core/extensions/loader.ts:684] [E: packages/coding-agent/src/core/extensions/loader.ts:688] [E: packages/coding-agent/test/extensions-discovery.test.ts:187] [E: packages/coding-agent/test/extensions-discovery.test.ts:202] [E: packages/coding-agent/test/extensions-discovery.test.ts:299] [E: packages/coding-agent/test/extensions-discovery.test.ts:314]
- factory cache 的粒度是 cwd-scoped module factory cache, 不是 loaded extension cache; 这样 reload 和不同 cwd 不共享可能陈旧的 imported factory, 但同 cwd cached loads 可以避免重复 module import。[E: packages/coding-agent/src/core/extensions/loader.ts:151] [E: packages/coding-agent/src/core/extensions/loader.ts:153] [E: packages/coding-agent/src/core/extensions/loader.ts:168] [E: packages/coding-agent/src/core/extensions/loader.ts:516] [E: packages/coding-agent/test/suite/regressions/extension-factory-cache.test.ts:69] [E: packages/coding-agent/test/suite/regressions/extension-factory-cache.test.ts:115] “避免跨 cwd 污染”是从 cwd token 与回归测试行为推出的设计解释。[I]
- factory 对 shared runtime 的副作用(flag default、provider register/unregister、EventBus `on`)在 `commit()` 前只存在于 per-load pending 结构里。失败的 factory 调用 `discard()`: 退订 loading-phase subscriptions、丢掉 pending flags/changes, 并把该 API 标成 `failed`, 后续调用抛 `failed to load and its API is no longer active`。[E: packages/coding-agent/src/core/extensions/loader.ts:260] [E: packages/coding-agent/src/core/extensions/loader.ts:265] [E: packages/coding-agent/src/core/extensions/loader.ts:473] [E: packages/coding-agent/src/core/extensions/loader.ts:475] [E: packages/coding-agent/test/suite/regressions/8423-extension-factory-failure.test.ts:48] [E: packages/coding-agent/test/suite/regressions/8423-extension-factory-failure.test.ts:52] 这对应 `#8424`: 失败 factory 不得留下 event subscription、provider registration 或 default flag。[I]
- Node SEA (`#8237`) 与 bundled Node (`PI_BUNDLED_NODE`) 必须用嵌入的 `virtualModules` 且关闭 `tryNative`, 否则 jiti 会按 filesystem alias 解析不到编译进 binary/bundle 的包。[E: packages/coding-agent/src/core/extensions/loader.ts:78] [E: packages/coding-agent/src/core/extensions/loader.ts:503] [E: packages/coding-agent/test/suite/regressions/8237-node-sea-extension-loading.test.ts:45]

## Gotchas

- `loadExtensions()` 不做 directory discovery, 只加载传入的 explicit paths; test 中同目录的 discoverable file 不会被 `loadExtensions([explicitPath])` 自动加载。[E: packages/coding-agent/test/extensions-discovery.test.ts:503] [E: packages/coding-agent/test/extensions-discovery.test.ts:513] [E: packages/coding-agent/test/extensions-discovery.test.ts:517]
- `discoverExtensionsInDir()` swallow `readdirSync` 异常并返回空数组, 所以扫描目录失败不会直接产生 load error。[E: packages/coding-agent/src/core/extensions/loader.ts:728] [E: packages/coding-agent/src/core/extensions/loader.ts:748] [E: packages/coding-agent/src/core/extensions/loader.ts:749]
- `pi.exec()` 是 loader API 中少数可在 bound runtime 之外直接走实现的 action-like method: 它调用 `execCommand(command, args, options?.cwd ?? cwd, options)` 而不是 runtime slot。[E: packages/coding-agent/src/core/extensions/loader.ts:392] [E: packages/coding-agent/src/core/extensions/loader.ts:394]
- captured runtime/API 可能因 reload 或 session replacement 变 stale; loader 创建的 runtime 提供 `invalidate()` 和 `assertActive()` 状态, 所有 registration/action methods 都先 `assertActive()`。[E: packages/coding-agent/src/core/extensions/loader.ts:185] [E: packages/coding-agent/src/core/extensions/loader.ts:210] [E: packages/coding-agent/src/core/extensions/loader.ts:211] [E: packages/coding-agent/src/core/extensions/loader.ts:264]
- factory 失败后同一 `pi` 对象不能再用来注册: `state === "failed"` 时 `assertActive()` 抛该 extension path 的 failed-to-load 错误, 即使 shared runtime 本身仍 active。[E: packages/coding-agent/src/core/extensions/loader.ts:264] [E: packages/coding-agent/src/core/extensions/loader.ts:266] [E: packages/coding-agent/test/suite/regressions/8423-extension-factory-failure.test.ts:52]

## 跨包关系

- [spine.extension-lifecycle](../../spine/extension-lifecycle.md): 端到端描述 loader、runtime、runner、resource loader、`AgentSession` 和 agent loop hooks 的全链路; 本节点只详写 discovery/import/registration 和 pre-bind runtime。
- [subsys.coding-agent.extension-runner](extension-runner.md): runner 消费 `LoadExtensionsResult`, 执行 `bindCore()`、event dispatch、error reporting 和 UI/mode binding; loader 只生产 runner 需要的 `Extension[]` 与 shared runtime。
- [subsys.coding-agent.resource-loader](resource-loader.md): resource loader 负责 project trust、package manager resolution、CLI extension sources、inline factories 和 reload cache clearing; loader 只接受 paths/factories 并返回 loaded result。[E: packages/coding-agent/src/core/resource-loader.ts:380] [E: packages/coding-agent/src/core/resource-loader.ts:392] [E: packages/coding-agent/src/core/resource-loader.ts:559] [E: packages/coding-agent/src/core/resource-loader.ts:564]

## 推断与存疑

- [I] `discoverAndLoadExtensions` 是 low-level discovery API 和测试入口, 当前 product reload 主路径更多依赖 package-manager/resource-loader 产出的 resolved paths。
- [I] loader/runtime split 的设计意图是把 extension declaration phase 与 session-bound action phase 分开。
- [I] cwd-scoped factory cache 的风险控制目标是避免跨 cwd 污染和 reload 后陈旧 import。
- [U] 无。

## Sources

- packages/coding-agent/src/core/extensions/loader.ts
- packages/coding-agent/src/core/extensions/index.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/resource-loader.ts
- packages/coding-agent/src/core/extensions/runner.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/docs/extensions.md
- packages/coding-agent/test/extensions-discovery.test.ts
- packages/coding-agent/test/suite/regressions/extension-factory-cache.test.ts
- packages/coding-agent/test/suite/regressions/8423-extension-factory-failure.test.ts
- packages/coding-agent/test/suite/regressions/8237-node-sea-extension-loading.test.ts
- scripts/build-coding-agent-bundle.mjs

## 相关

- [spine.extension-lifecycle](../../spine/extension-lifecycle.md)
- [subsys.coding-agent.extension-runner](extension-runner.md)
- [subsys.coding-agent.resource-loader](resource-loader.md)

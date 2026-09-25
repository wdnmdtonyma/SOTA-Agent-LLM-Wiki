---
id: surface.misc.packages
title: pi packages(npm/git 资源包)
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/package-manager.ts
  - packages/coding-agent/src/core/pi-manifest.ts
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/package-manager-cli.ts
  - packages/coding-agent/src/cli/config-selector.ts
  - packages/coding-agent/docs/packages.md
  - packages/coding-agent/src/core/resource-loader.ts
symbols:
  - PackageSource
  - package manifest
related:
  - subsys.coding-agent.package-manager
  - subsys.coding-agent.resource-loader
evidence: explicit
status: verified
updated: ff72faba28
---

> `surface.misc.packages` 描述 pi-coding-agent 的资源包可见面:用户可以用 npm、git 或本地路径安装包含 extensions、skills、prompt templates、themes 的 package,再由 package-manager 解析成资源路径。

## 能回答的问题

- pi package 能打包哪些资源,安装命令有哪些?
- `npm:`、`git:`、裸 HTTPS/SSH URL 和本地路径分别怎样解释?
- `package.json` 的 `pi` manifest 支持哪些 key,没有 manifest 时有哪些约定目录?
- settings 里的 `packages` string form 和 object filter form 有什么区别?
- user scope、project scope、temporary source、offline mode 和 trust 对 package 有什么影响?
- package surface 与 `subsys.coding-agent.package-manager`、`subsys.coding-agent.resource-loader` 的边界在哪里?

## 用户可见入口

pi package 是共享资源的封装:用户文档定义它可以 bundle extensions、skills、prompt templates 和 themes,并可通过 npm 或 git 分享;package root 的 `package.json` 可以声明 `pi` 字段,也可以使用约定目录 [E: packages/coding-agent/docs/packages.md:3]。

公开命令面包括 `pi install <source>`、`pi remove <source>`、`pi list` 和 `pi update --extensions`；文档示例覆盖 npm、git shorthand 和本地路径 [E: packages/coding-agent/docs/packages.md:12] [E: packages/coding-agent/docs/packages.md:13] [E: packages/coding-agent/docs/packages.md:14] [E: packages/coding-agent/docs/packages.md:17]。`pi update --extensions` 用来 reconcile package 安装；完整 flag 集合以 CLI 实现为准 [E: packages/coding-agent/docs/packages.md:17] [I]。

实验性 installer-managed 安装里,`pi update` 把选中版本 stage 到 `staging/update-*`、`npm ci` 后用 `pi --version` verify,再 `rename` 到 `releases/<version>` 并用 `current-version` 原子激活;失败则留下当前 release。managed install 不支持 `--force`,损坏时重跑 installer。[E: packages/coding-agent/src/package-manager-cli.ts:171] [E: packages/coding-agent/src/package-manager-cli.ts:213] [E: packages/coding-agent/src/package-manager-cli.ts:214] [E: packages/coding-agent/src/package-manager-cli.ts:215] [E: packages/coding-agent/src/package-manager-cli.ts:216] [E: packages/coding-agent/src/package-manager-cli.ts:126] [E: packages/coding-agent/src/package-manager-cli.ts:1024]

安全边界很直接:用户文档明确说 packages 可执行 extension 代码、skills 可指示模型运行程序,所以第三方 package 安装前应审查源码,授予 project trust 前应审查项目 package 声明 [E: packages/coding-agent/docs/packages.md:21]。

## Source 形式

`PackageSource` 的导出类型本身不在本节点 index source 中:package-manager 只把它作为来自 settings-manager 的 type import 使用 [E: packages/coding-agent/src/core/package-manager.ts:47]。从 index source 能核到 runtime 消费形态:package entry 若为 string 就直接作为 source,若为 object 就取 `source` 并把 object 当 filter;filter keys 覆盖 `extensions`、`skills`、`prompts`、`themes` [E: packages/coding-agent/src/core/package-manager.ts:1257] [E: packages/coding-agent/src/core/package-manager.ts:1258] [E: packages/coding-agent/src/core/package-manager.ts:1259] [E: packages/coding-agent/src/core/package-manager.ts:1414] [E: packages/coding-agent/src/core/package-manager.ts:195] [E: packages/coding-agent/src/core/package-manager.ts:197] [E: packages/coding-agent/src/core/package-manager.ts:198] [E: packages/coding-agent/src/core/package-manager.ts:199] [E: packages/coding-agent/src/core/package-manager.ts:200]。完整 public settings schema 的定义位置超出本节点 index source,仍作为 source-set 不确定项保留 [U]。

package-manager 的解析顺序是:以 `npm:` 开头的 source 解析为 npm package;命中本地路径规则的 source 解析为 local path;剩余输入先尝试按 git URL 解析,解析失败再退回 local path [E: packages/coding-agent/src/core/package-manager.ts:1450] [E: packages/coding-agent/src/core/package-manager.ts:1451] [E: packages/coding-agent/src/core/package-manager.ts:1464] [E: packages/coding-agent/src/core/package-manager.ts:1469] [E: packages/coding-agent/src/core/package-manager.ts:1474]。

用户文档列出的 npm source 形态是 `npm:@example/pi-tools@1.0.0`；带版本 spec 的 npm package 被视为 pinned [E: packages/coding-agent/docs/packages.md:33] [E: packages/coding-agent/docs/packages.md:38]。npm 安装路径由源码决定：`<agentDir>/npm/node_modules/<name>` 和 `<cwd>/.pi/npm/node_modules/<name>` [E: packages/coding-agent/src/core/package-manager.ts:2096] [E: packages/coding-agent/src/core/package-manager.ts:2100] [E: packages/coding-agent/src/core/package-manager.ts:2104]。

git source 文档形态是 `git:github.com/example/pi-tools@v1` 与裸 `https://github.com/example/pi-tools`；后者被当成 git source [E: packages/coding-agent/docs/packages.md:34] [E: packages/coding-agent/docs/packages.md:35]。git 安装路径由源码 `getGitInstallPath()` 把 host/path 放在 scope install root 下并防止逃逸 managed root [E: packages/coding-agent/src/core/package-manager.ts:2124] [E: packages/coding-agent/src/core/package-manager.ts:2133] [E: packages/coding-agent/src/core/package-manager.ts:2156] [E: packages/coding-agent/src/core/package-manager.ts:2160]。

local path 文档说相对路径按其所在 settings file 解析；文件路径作为单个 extension 加载，目录路径按 package 规则加载，且不复制到 managed storage [E: packages/coding-agent/docs/packages.md:36] [E: packages/coding-agent/docs/packages.md:40]。源码的 local source 也体现了这个分支:文件直接加入 extensions,目录交给 `collectPackageResources()`,如果目录没有 manifest/filter 产出的 package resources 且没有约定资源目录,则把目录本身作为 extension source 加入 [E: packages/coding-agent/src/core/package-manager.ts:1330] [E: packages/coding-agent/src/core/package-manager.ts:1343] [E: packages/coding-agent/src/core/package-manager.ts:1345] [E: packages/coding-agent/src/core/package-manager.ts:1346] [E: packages/coding-agent/src/core/package-manager.ts:1349] [E: packages/coding-agent/src/core/package-manager.ts:1352] [E: packages/coding-agent/src/core/package-manager.ts:1354]。

## Manifest 与约定目录

package 作者可以在 `package.json` 写 `pi` manifest,把 `extensions`、`skills`、`prompts`、`themes` 指向 package root 下的路径或 glob;文档示例还建议加 `pi-package` keyword 便于发现 [E: packages/coding-agent/docs/packages.md:57] [E: packages/coding-agent/docs/packages.md:62] [E: packages/coding-agent/docs/packages.md:64] [E: packages/coding-agent/docs/packages.md:74]。positive glob 按 lexical order 发现可见 path; 点前缀路径和需要穿过 symlink 的资源根必须写成 exact path。[E: packages/coding-agent/docs/packages.md:72] [E: packages/coding-agent/src/core/package-manager.ts:289] [E: packages/coding-agent/src/core/package-manager.ts:292] `PiManifest` 投影只读取这四类资源 key；`readPiManifest()` 解析 package JSON,仅在 parse 失败或 `pkg.pi` 不是非数组 object 时返回 `null`。某个 resource field 不是全 string array 时跳过该 field,仍返回(可能为空的)`PiManifest` [E: packages/coding-agent/src/core/pi-manifest.ts:4] [E: packages/coding-agent/src/core/pi-manifest.ts:5] [E: packages/coding-agent/src/core/pi-manifest.ts:8] [E: packages/coding-agent/src/core/pi-manifest.ts:17] [E: packages/coding-agent/src/core/pi-manifest.ts:19] [E: packages/coding-agent/src/core/pi-manifest.ts:20] [E: packages/coding-agent/src/core/pi-manifest.ts:24] [E: packages/coding-agent/src/core/pi-manifest.ts:27] [E: packages/coding-agent/src/core/pi-manifest.ts:31] [E: packages/coding-agent/src/core/pi-manifest.ts:32]。

没有 `pi` manifest 时,文档承诺约定目录 `extensions/`、`skills/`、`prompts/`、`themes/`：发现 TypeScript/JavaScript extensions、skill directories、Markdown prompts 和 JSON themes [E: packages/coding-agent/docs/packages.md:44] [E: packages/coding-agent/docs/packages.md:55]。源码 fallback 同样扫描 package root 下的四个 resource type 目录,存在则按 resource type 收集文件 [E: packages/coding-agent/src/core/package-manager.ts:2220] [E: packages/coding-agent/src/core/package-manager.ts:2222] [E: packages/coding-agent/src/core/package-manager.ts:2225] [E: packages/coding-agent/src/core/package-manager.ts:2227]。

gallery metadata 是 package gallery 的展示信息：文档写可选 `pi.image` 与 `pi.video` 字段添加 preview [E: packages/coding-agent/docs/packages.md:74]。runtime `PiManifest` 类型没有 `video` 或 `image` 字段,所以 resource resolution 不依赖这些 gallery 字段 [E: packages/coding-agent/src/core/pi-manifest.ts:4] [E: packages/coding-agent/src/core/pi-manifest.ts:8] [I]。

## Filter 与 enabled 状态

settings 的 object form 可以对一个 package 做资源过滤:文档示例里 `extensions`、`skills`、`prompts`、`themes` 可以分别给 pattern 数组;省略某个 key 表示该类型全部加载,空数组表示该类型全部不加载,`!pattern` 排除 glob match,`+path` force-include exact path,`-path` force-exclude exact path [E: packages/coding-agent/docs/packages.md:96] [E: packages/coding-agent/docs/packages.md:113] [E: packages/coding-agent/docs/packages.md:114] [E: packages/coding-agent/docs/packages.md:115] [E: packages/coding-agent/docs/packages.md:116] [E: packages/coding-agent/docs/packages.md:117]。

`autoload: false` 改变 object form 的基线：它从“默认加载全部”切到“默认全关、只应用显式 patterns”；project entry 与同 identity global entry 并存时，它还作为 global package 的 delta，而不是整包替换 [E: packages/coding-agent/src/core/settings-manager.ts:103] [E: packages/coding-agent/src/core/package-manager.ts:195] [E: packages/coding-agent/src/core/package-manager.ts:1259] [E: packages/coding-agent/src/core/package-manager.ts:2194] [E: packages/coding-agent/src/core/package-manager.ts:2195] [E: packages/coding-agent/docs/packages.md:125]。

源码把 filter object 按 resource type 应用:`autoload === false` 时走 `applyPackageDeltaFilter()`,否则设置了该 type patterns 时调用 `applyPackageFilter()`,未设置时调用 `collectDefaultResources()`;空 patterns array 会把该 type 的所有候选资源以 disabled 状态加入,而不是完全不可见 [E: packages/coding-agent/src/core/package-manager.ts:2190] [E: packages/coding-agent/src/core/package-manager.ts:2192] [E: packages/coding-agent/src/core/package-manager.ts:2194] [E: packages/coding-agent/src/core/package-manager.ts:2195] [E: packages/coding-agent/src/core/package-manager.ts:2197] [E: packages/coding-agent/src/core/package-manager.ts:2199] [E: packages/coding-agent/src/core/package-manager.ts:2266] [E: packages/coding-agent/src/core/package-manager.ts:2269]。这解释了为什么 `ResolvedResource` 有 `enabled` boolean:resource-loader 可以看到 path 与启用状态,再决定是否加载或展示配置开关 [E: packages/coding-agent/src/core/package-manager.ts:75] [E: packages/coding-agent/src/core/package-manager.ts:77] [I]。

`pi config` 是用户启用/禁用 installed packages 和 local directories 中资源的可见入口：默认打开 personal 配置，Tab 可切 scope，`pi config --local` 从 project override 开始；写 project config 前必须通过 trust gate [E: packages/coding-agent/docs/packages.md:121] [E: packages/coding-agent/src/package-manager-cli.ts:796] [E: packages/coding-agent/src/package-manager-cli.ts:808] [E: packages/coding-agent/src/package-manager-cli.ts:836] [E: packages/coding-agent/src/package-manager-cli.ts:837] [E: packages/coding-agent/src/package-manager-cli.ts:848] [E: packages/coding-agent/src/cli/config-selector.ts:20]。

## Scope、trust 与 update

`install` 和 `remove` 默认写 user settings `~/.pi/agent/settings.json`;使用 `-l` 写 project settings `.pi/settings.json`。项目 package 只在 project trust 通过后安装和加载 [E: packages/coding-agent/docs/packages.md:19] [E: packages/coding-agent/docs/packages.md:21]。源码的 package resolution 也先读取 project settings packages,再读取 global settings packages,随后按 package identity 去重 [E: packages/coding-agent/src/core/package-manager.ts:915] [E: packages/coding-agent/src/core/package-manager.ts:916] [E: packages/coding-agent/src/core/package-manager.ts:919] [E: packages/coding-agent/src/core/package-manager.ts:920] [E: packages/coding-agent/src/core/package-manager.ts:923] [E: packages/coding-agent/src/core/package-manager.ts:928]。

project scope 通常在冲突时优先于 user scope；例外是 project object entry 设置 `autoload: false`，此时 dedupe 保留 global entry，并让 project patterns 作为 delta 应用在 global package 安装/路径上 [E: packages/coding-agent/docs/packages.md:125] [E: packages/coding-agent/src/core/package-manager.ts:1712] [E: packages/coding-agent/src/core/package-manager.ts:1725] [E: packages/coding-agent/src/core/package-manager.ts:1727] [E: packages/coding-agent/src/core/package-manager.ts:1729] [E: packages/coding-agent/src/core/package-manager.ts:1315] [E: packages/coding-agent/src/core/package-manager.ts:1325]。identity 对 npm 是 package name,对 git 是 normalized repository host/path,对 local 是按 scope base 解析后的 absolute path [E: packages/coding-agent/src/core/package-manager.ts:1691] [E: packages/coding-agent/src/core/package-manager.ts:1700] [E: packages/coding-agent/docs/packages.md:127]。

`pi update --models` 是只刷新 model catalogs 的 package CLI target，直接调用 model-catalog refresh 而不进入 extension package update；这条用户入口对应 model catalog publication/下载管线 [E: packages/coding-agent/src/package-manager-cli.ts:345] [E: packages/coding-agent/src/package-manager-cli.ts:914]。

temporary package source 用于“试用不安装”:文档把 `pi -e npm:@example/pi-tools` 描述为只对当前 invocation 生效、不写入 settings [E: packages/coding-agent/docs/packages.md:23] [E: packages/coding-agent/docs/packages.md:26]。源码为 temporary npm/git 使用 `getExtensionTempFolder(agentDir)` 下的 managed temp path,并通过 hash/suffix 组合防止路径逃逸 [E: packages/coding-agent/src/core/package-manager.ts:226] [E: packages/coding-agent/src/core/package-manager.ts:2056] [E: packages/coding-agent/src/core/package-manager.ts:2097] [E: packages/coding-agent/src/core/package-manager.ts:2125] [E: packages/coding-agent/src/core/package-manager.ts:2116] [E: packages/coding-agent/src/core/package-manager.ts:2153] [I]。

`PI_OFFLINE=1|true|yes` 会让 package-manager 避免网络安装或 update checks;源码在 missing npm/git source 时若 offline 就不 install,在 npm/git update check 中也直接返回 false [E: packages/coding-agent/src/core/package-manager.ts:53] [E: packages/coding-agent/src/core/package-manager.ts:56] [E: packages/coding-agent/src/core/package-manager.ts:1272] [E: packages/coding-agent/src/core/package-manager.ts:1249] [E: packages/coding-agent/src/core/package-manager.ts:1485] [E: packages/coding-agent/src/core/package-manager.ts:1487] [E: packages/coding-agent/src/core/package-manager.ts:1536] [E: packages/coding-agent/src/core/package-manager.ts:1538]。

## 依赖与安装行为

第三方 runtime 依赖放进 `dependencies`。host-provided 包必须写在 `peerDependencies` 且 range 为 `"*"`，不要 bundle：`@earendil-works/pi-ai`、`@earendil-works/pi-agent-core`、`@earendil-works/pi-coding-agent`、`@earendil-works/pi-tui`、`typebox` [E: packages/coding-agent/docs/packages.md:78] [E: packages/coding-agent/docs/packages.md:82] [E: packages/coding-agent/docs/packages.md:88]。Pi 对 managed npm **和** git 安装（npm / pnpm / Bun）都抑制自动 peer 安装；local package 不安装、不改依赖树 [E: packages/coding-agent/docs/packages.md:88]。

源码：managed npm 的 `getNpmInstallArgs()` 对 bun 加 `--omit=peer`，pnpm 加 `auto-install-peers=false`，npm 加 `--legacy-peer-deps` [E: packages/coding-agent/src/core/package-manager.ts:1815] [E: packages/coding-agent/src/core/package-manager.ts:1822] [E: packages/coding-agent/src/core/package-manager.ts:1830] [E: packages/coding-agent/src/core/package-manager.ts:1835]。git clone / update 后若有 `package.json`，走 `getGitDependencyInstallArgs()`：bun `--omit=dev --omit=peer`，pnpm `--prod` + `auto-install-peers=false`，npm `--omit=dev --legacy-peer-deps` [E: packages/coding-agent/src/core/package-manager.ts:1791] [E: packages/coding-agent/src/core/package-manager.ts:1794] [E: packages/coding-agent/src/core/package-manager.ts:1799] [E: packages/coding-agent/src/core/package-manager.ts:1804] [E: packages/coding-agent/src/core/package-manager.ts:1884] [E: packages/coding-agent/src/core/package-manager.ts:1886] [E: packages/coding-agent/src/core/package-manager.ts:1955]。git **不会**自动装 Pi peer。

不要把 host-provided 包写进 `dependencies`。装出来的物理副本会绕过 extension module mapping，造成 duplicate class / registry [E: packages/coding-agent/docs/packages.md:90]。`DefaultResourceLoader` 扫每个 extension `packageRoot` 的 `package.json.dependencies`：命中 `HOST_PROVIDED_EXTENSION_PACKAGES`（含 `@earendil-works/pi-*`、legacy `@mariozechner/pi-*`、`typebox` / `@sinclair/typebox`）就往 `LoadExtensionsResult.warnings` 推一条 [E: packages/coding-agent/src/core/resource-loader.ts:41] [E: packages/coding-agent/src/core/resource-loader.ts:75] [E: packages/coding-agent/src/core/resource-loader.ts:79] [E: packages/coding-agent/src/core/resource-loader.ts:81]。

## 跨包关系

[subsys.coding-agent.package-manager](../../subsystems/coding-agent/package-manager.md) 是内部实现节点:它权威覆盖 `DefaultPackageManager` 的 install/update/remove/resolve 控制流、storage path、pattern 处理和 CLI command dispatch;本节点只保留用户可见语义与 manifest/filter 写法 [I]。

[subsys.coding-agent.resource-loader](../../subsystems/coding-agent/resource-loader.md) 是 package-manager 的下游:package-manager 产出 extensions、skills、prompts、themes 的 `ResolvedPaths`,resource-loader 再负责真正加载 extension module、skill markdown、prompt template 和 theme JSON [E: packages/coding-agent/src/core/package-manager.ts:81] [E: packages/coding-agent/src/core/package-manager.ts:82] [E: packages/coding-agent/src/core/package-manager.ts:83] [E: packages/coding-agent/src/core/package-manager.ts:84] [I]。

## Sources

- packages/coding-agent/src/core/package-manager.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/package-manager-cli.ts
- packages/coding-agent/src/cli/config-selector.ts
- packages/coding-agent/docs/packages.md
- packages/coding-agent/src/core/resource-loader.ts

## 相关

- [subsys.coding-agent.package-manager](../../subsystems/coding-agent/package-manager.md): package resolution、install/update/remove 和 storage layout 的内部实现。
- [subsys.coding-agent.resource-loader](../../subsystems/coding-agent/resource-loader.md): package-manager 输出的 resource paths 如何进入 extension、skill、prompt 和 theme loading。

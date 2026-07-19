---
id: surface.misc.packages
title: pi packages(npm/git 资源包)
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/package-manager.ts
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/package-manager-cli.ts
  - packages/coding-agent/src/cli/config-selector.ts
  - packages/coding-agent/docs/packages.md
symbols:
  - PackageSource
  - package manifest
related:
  - subsys.coding-agent.package-manager
  - subsys.coding-agent.resource-loader
evidence: explicit
status: verified
updated: 3da591ab
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

pi package 是共享资源的封装:用户文档定义它可以 bundle extensions、skills、prompt templates 和 themes,并可通过 npm 或 git 分享;package root 的 `package.json` 可以声明 `pi` 字段,也可以使用约定目录 [E: packages/coding-agent/docs/packages.md:5]。

公开命令面包括 `pi install <source>`、`pi remove <source>`、`pi list` 和 `pi update`,文档示例覆盖 npm、git、裸 GitHub URL、绝对路径和相对路径 [E: packages/coding-agent/docs/packages.md:23] [E: packages/coding-agent/docs/packages.md:24] [E: packages/coding-agent/docs/packages.md:25] [E: packages/coding-agent/docs/packages.md:26] [E: packages/coding-agent/docs/packages.md:27] [E: packages/coding-agent/docs/packages.md:29] [E: packages/coding-agent/docs/packages.md:30] [E: packages/coding-agent/docs/packages.md:31] [E: packages/coding-agent/docs/packages.md:38]。`pi update` 默认只更新 pi 自身,`pi update --extensions` 更新 packages 并 reconcile pinned git refs,`pi update --all` 同时更新 pi、packages 和 pinned git refs [E: packages/coding-agent/docs/packages.md:31] [E: packages/coding-agent/docs/packages.md:33] [E: packages/coding-agent/docs/packages.md:32] [I]。

安全边界很直接:用户文档明确说 pi packages 以完整系统权限运行,extensions 可执行任意代码,skills 可指示模型执行包括运行可执行文件在内的动作,所以第三方 package 安装前应审查源码 [E: packages/coding-agent/docs/packages.md:20]。

## Source 形式

`PackageSource` 的导出类型本身不在本节点 index source 中:package-manager 只把它作为来自 settings-manager 的 type import 使用 [E: packages/coding-agent/src/core/package-manager.ts:36]。从 index source 能核到 runtime 消费形态:package entry 若为 string 就直接作为 source,若为 object 就取 `source` 并把 object 当 filter;filter keys 覆盖 `extensions`、`skills`、`prompts`、`themes` [E: packages/coding-agent/src/core/package-manager.ts:1245] [E: packages/coding-agent/src/core/package-manager.ts:1246] [E: packages/coding-agent/src/core/package-manager.ts:1247] [E: packages/coding-agent/src/core/package-manager.ts:1399] [E: packages/coding-agent/src/core/package-manager.ts:190] [E: packages/coding-agent/src/core/package-manager.ts:192] [E: packages/coding-agent/src/core/package-manager.ts:193] [E: packages/coding-agent/src/core/package-manager.ts:194] [E: packages/coding-agent/src/core/package-manager.ts:195]。完整 public settings schema 的定义位置超出本节点 index source,仍作为 source-set 不确定项保留 [U]。

package-manager 的解析顺序是:以 `npm:` 开头的 source 解析为 npm package;命中本地路径规则的 source 解析为 local path;剩余输入先尝试按 git URL 解析,解析失败再退回 local path [E: packages/coding-agent/src/core/package-manager.ts:1435] [E: packages/coding-agent/src/core/package-manager.ts:1436] [E: packages/coding-agent/src/core/package-manager.ts:1449] [E: packages/coding-agent/src/core/package-manager.ts:1454] [E: packages/coding-agent/src/core/package-manager.ts:1459]。

用户文档列出的 npm source 形态是 `npm:@scope/pkg@1.2.3` 和 `npm:pkg`;带版本 spec 的 npm package 被视为 pinned,在 package update 中跳过 [E: packages/coding-agent/docs/packages.md:59] [E: packages/coding-agent/docs/packages.md:60] [E: packages/coding-agent/docs/packages.md:63]。npm user installs 位于 `~/.pi/agent/npm/`,project installs 位于 `.pi/npm/`;源码对应的 managed install path 是 `<agentDir>/npm/node_modules/<name>` 和 `<cwd>/.pi/npm/node_modules/<name>` [E: packages/coding-agent/docs/packages.md:64] [E: packages/coding-agent/docs/packages.md:65] [E: packages/coding-agent/src/core/package-manager.ts:1997] [E: packages/coding-agent/src/core/package-manager.ts:2001] [E: packages/coding-agent/src/core/package-manager.ts:2005]。

git source 支持 `git:` 前缀的 shorthand、裸协议 URL、HTTPS 和 SSH;没有 `git:` 前缀时只有 `https://`、`http://`、`ssh://`、`git://` 这类协议 URL 被文档承诺为 git source [E: packages/coding-agent/docs/packages.md:79] [E: packages/coding-agent/docs/packages.md:81] [E: packages/coding-agent/docs/packages.md:85] [E: packages/coding-agent/docs/packages.md:86] [E: packages/coding-agent/docs/packages.md:87]。git user clones 位于 `~/.pi/agent/git/<host>/<path>`,project clones 位于 `.pi/git/<host>/<path>`;源码通过 `getGitInstallPath()` 把 host/path 放在 scope install root 下并防止逃逸 managed root [E: packages/coding-agent/docs/packages.md:92] [E: packages/coding-agent/src/core/package-manager.ts:2025] [E: packages/coding-agent/src/core/package-manager.ts:2033] [E: packages/coding-agent/src/core/package-manager.ts:2056] [E: packages/coding-agent/src/core/package-manager.ts:2060]。

local path 可以是绝对路径或相对路径,文档说它不会被复制到 managed storage;相对路径按其所在 settings file 解析,文件路径作为单个 extension 加载,目录路径按 package 规则加载 [E: packages/coding-agent/docs/packages.md:110] [E: packages/coding-agent/docs/packages.md:111] [E: packages/coding-agent/docs/packages.md:114]。源码的 local source 也体现了这个分支:文件直接加入 extensions,目录交给 `collectPackageResources()`,如果目录没有 manifest/filter 产出的 package resources 且没有约定资源目录,则把目录本身作为 extension source 加入 [E: packages/coding-agent/src/core/package-manager.ts:1316] [E: packages/coding-agent/src/core/package-manager.ts:1329] [E: packages/coding-agent/src/core/package-manager.ts:1331] [E: packages/coding-agent/src/core/package-manager.ts:1332] [E: packages/coding-agent/src/core/package-manager.ts:1335] [E: packages/coding-agent/src/core/package-manager.ts:1337] [E: packages/coding-agent/src/core/package-manager.ts:1339]。

## Manifest 与约定目录

package 作者可以在 `package.json` 写 `pi` manifest,把 `extensions`、`skills`、`prompts`、`themes` 指向 package root 下的路径或 glob;文档示例还建议加 `pi-package` keyword 便于发现 [E: packages/coding-agent/docs/packages.md:118] [E: packages/coding-agent/docs/packages.md:120] [E: packages/coding-agent/docs/packages.md:124] [E: packages/coding-agent/docs/packages.md:125] [E: packages/coding-agent/docs/packages.md:126] [E: packages/coding-agent/docs/packages.md:127] [E: packages/coding-agent/docs/packages.md:128] [E: packages/coding-agent/docs/packages.md:133]。package-manager 的 `PiManifest` 投影只读取这四类资源 key,`readPiManifest()` 从 package root 的 `package.json` 返回 `pkg.pi` 或 null [E: packages/coding-agent/src/core/package-manager.ts:158] [E: packages/coding-agent/src/core/package-manager.ts:159] [E: packages/coding-agent/src/core/package-manager.ts:160] [E: packages/coding-agent/src/core/package-manager.ts:161] [E: packages/coding-agent/src/core/package-manager.ts:162] [E: packages/coding-agent/src/core/package-manager.ts:2228] [E: packages/coding-agent/src/core/package-manager.ts:2235] [E: packages/coding-agent/src/core/package-manager.ts:2237]。

没有 `pi` manifest 时,文档承诺约定目录: `extensions/` 加载 `.ts` 和 `.js`,`skills/` 递归发现 `SKILL.md` folders 并把顶层 `.md` 当作 skills,`prompts/` 加载 `.md`,`themes/` 加载 `.json` [E: packages/coding-agent/docs/packages.md:160] [E: packages/coding-agent/docs/packages.md:162] [E: packages/coding-agent/docs/packages.md:163] [E: packages/coding-agent/docs/packages.md:164] [E: packages/coding-agent/docs/packages.md:165]。源码 fallback 同样扫描 package root 下的四个 resource type 目录,存在则按 resource type 收集文件 [E: packages/coding-agent/src/core/package-manager.ts:2120] [E: packages/coding-agent/src/core/package-manager.ts:2122] [E: packages/coding-agent/src/core/package-manager.ts:2125] [E: packages/coding-agent/src/core/package-manager.ts:2127]。

gallery metadata 是 package gallery 的展示信息,文档写 `pi.video` 支持 MP4 preview,`pi.image` 支持 PNG/JPEG/GIF/WebP preview,且 video 优先于 image [E: packages/coding-agent/docs/packages.md:137] [E: packages/coding-agent/docs/packages.md:145] [E: packages/coding-agent/docs/packages.md:146] [E: packages/coding-agent/docs/packages.md:151] [E: packages/coding-agent/docs/packages.md:152] [E: packages/coding-agent/docs/packages.md:154]。package-manager 的 `PiManifest` 类型没有 `video` 或 `image` 字段,所以 runtime resource resolution 不依赖这些 gallery 字段 [E: packages/coding-agent/src/core/package-manager.ts:158] [I]。

## Filter 与 enabled 状态

settings 的 object form 可以对一个 package 做资源过滤:文档示例里 `extensions`、`skills`、`prompts`、`themes` 可以分别给 pattern 数组;省略某个 key 表示该类型全部加载,空数组表示该类型全部不加载,`!pattern` 排除 glob match,`+path` force-include exact path,`-path` force-exclude exact path [E: packages/coding-agent/docs/packages.md:192] [E: packages/coding-agent/docs/packages.md:199] [E: packages/coding-agent/docs/packages.md:200] [E: packages/coding-agent/docs/packages.md:201] [E: packages/coding-agent/docs/packages.md:203] [E: packages/coding-agent/docs/packages.md:209] [E: packages/coding-agent/docs/packages.md:211] [E: packages/coding-agent/docs/packages.md:212] [E: packages/coding-agent/docs/packages.md:213] [E: packages/coding-agent/docs/packages.md:214] [E: packages/coding-agent/docs/packages.md:215]。

`autoload: false` 改变 object form 的基线：它从“默认加载全部”切到“默认全关、只应用显式 patterns”；project entry 与同 identity global entry 并存时，它还作为 global package 的 delta，而不是整包替换 [E: packages/coding-agent/src/core/settings-manager.ts:76] [E: packages/coding-agent/src/core/package-manager.ts:190] [E: packages/coding-agent/src/core/package-manager.ts:1247] [E: packages/coding-agent/src/core/package-manager.ts:2094] [E: packages/coding-agent/src/core/package-manager.ts:2095] [E: packages/coding-agent/docs/packages.md:224]。

源码把 filter object 按 resource type 应用:设置了该 type patterns 时调用 `applyPackageFilter()`,未设置时调用 `collectDefaultResources()`;空 patterns array 会把该 type 的所有候选资源以 disabled 状态加入,而不是完全不可见 [E: packages/coding-agent/src/core/package-manager.ts:2090] [E: packages/coding-agent/src/core/package-manager.ts:2092] [E: packages/coding-agent/src/core/package-manager.ts:2052] [E: packages/coding-agent/src/core/package-manager.ts:2097] [E: packages/coding-agent/src/core/package-manager.ts:2099] [E: packages/coding-agent/src/core/package-manager.ts:2166] [E: packages/coding-agent/src/core/package-manager.ts:2169]。这解释了为什么 `ResolvedResource` 有 `enabled` boolean:resource-loader 可以看到 path 与启用状态,再决定是否加载或展示配置开关 [E: packages/coding-agent/src/core/package-manager.ts:63] [E: packages/coding-agent/src/core/package-manager.ts:65] [I]。

`pi config` 是用户启用/禁用 installed packages 和 local directories 中资源的可见入口：默认打开 global `~/.pi/agent/settings.json`，Tab 可切 global/project，`pi config -l` 直接从 project override 开始并把 inherited global resources dimmed；写 project config 前必须通过 trust gate [E: packages/coding-agent/docs/packages.md:220] [E: packages/coding-agent/src/package-manager-cli.ts:608] [E: packages/coding-agent/src/package-manager-cli.ts:620] [E: packages/coding-agent/src/package-manager-cli.ts:648] [E: packages/coding-agent/src/package-manager-cli.ts:649] [E: packages/coding-agent/src/package-manager-cli.ts:660] [E: packages/coding-agent/src/cli/config-selector.ts:20]。

## Scope、trust 与 update

`install` 和 `remove` 默认写 user settings `~/.pi/agent/settings.json`;使用 `-l` 写 project settings `.pi/settings.json`,project settings 可与团队共享,项目被 trust 后 pi 会在启动时自动安装缺失 packages [E: packages/coding-agent/docs/packages.md:43]。源码的 package resolution 也先读取 project settings packages,再读取 global settings packages,随后按 package identity 去重 [E: packages/coding-agent/src/core/package-manager.ts:903] [E: packages/coding-agent/src/core/package-manager.ts:904] [E: packages/coding-agent/src/core/package-manager.ts:907] [E: packages/coding-agent/src/core/package-manager.ts:908] [E: packages/coding-agent/src/core/package-manager.ts:911] [E: packages/coding-agent/src/core/package-manager.ts:916]。

project scope 通常在冲突时优先于 user scope；例外是 project object entry 设置 `autoload: false`，此时 dedupe 保留 global entry，并让 project patterns 作为 delta 应用在 global package 安装/路径上 [E: packages/coding-agent/docs/packages.md:224] [E: packages/coding-agent/src/core/package-manager.ts:1697] [E: packages/coding-agent/src/core/package-manager.ts:1710] [E: packages/coding-agent/src/core/package-manager.ts:1712] [E: packages/coding-agent/src/core/package-manager.ts:1714] [E: packages/coding-agent/src/core/package-manager.ts:1301] [E: packages/coding-agent/src/core/package-manager.ts:1311]。identity 对 npm 是 package name,对 git 是 normalized repository host/path,对 local 是按 scope base 解析后的 absolute path [E: packages/coding-agent/src/core/package-manager.ts:1676] [E: packages/coding-agent/src/core/package-manager.ts:1685]。

`pi update --models` 是只刷新 model catalogs 的 package CLI target，直接调用 model-catalog refresh 而不进入 extension package update；这条用户入口对应 model catalog publication/下载管线 [E: packages/coding-agent/docs/packages.md:34] [E: packages/coding-agent/src/package-manager-cli.ts:159] [E: packages/coding-agent/src/package-manager-cli.ts:726]。

temporary package source 用于“试用不安装”:文档把 `pi -e npm:@foo/bar` 和 `pi -e git:github.com/user/repo` 描述为只安装到当前 run 的 temporary directory [E: packages/coding-agent/docs/packages.md:45] [E: packages/coding-agent/docs/packages.md:48] [E: packages/coding-agent/docs/packages.md:49]。源码为 temporary npm/git 使用 `getExtensionTempFolder(agentDir)` 下的 managed temp path,并通过 hash/suffix 组合防止路径逃逸 [E: packages/coding-agent/src/core/package-manager.ts:221] [E: packages/coding-agent/src/core/package-manager.ts:1957] [E: packages/coding-agent/src/core/package-manager.ts:1998] [E: packages/coding-agent/src/core/package-manager.ts:2026] [E: packages/coding-agent/src/core/package-manager.ts:2047] [E: packages/coding-agent/src/core/package-manager.ts:2053] [I]。

`PI_OFFLINE=1|true|yes` 会让 package-manager 避免网络安装或 update checks;源码在 missing npm/git source 时若 offline 就不 install,在 npm/git update check 中也直接返回 false [E: packages/coding-agent/src/core/package-manager.ts:42] [E: packages/coding-agent/src/core/package-manager.ts:45] [E: packages/coding-agent/src/core/package-manager.ts:1260] [E: packages/coding-agent/src/core/package-manager.ts:1237] [E: packages/coding-agent/src/core/package-manager.ts:1470] [E: packages/coding-agent/src/core/package-manager.ts:1472] [E: packages/coding-agent/src/core/package-manager.ts:1521] [E: packages/coding-agent/src/core/package-manager.ts:1523]。

## 依赖与安装行为

文档要求第三方 runtime dependencies 放进 `dependencies`,因为 pi 从 npm 或 git 安装 package 时会运行 `npm install`;导入 pi core packages 时应放进 `peerDependencies` 且使用 `"*"` range,不要 bundle `@earendil-works/pi-ai`、`@earendil-works/pi-agent-core`、`@earendil-works/pi-coding-agent`、`@earendil-works/pi-tui` 和 `typebox` [E: packages/coding-agent/docs/packages.md:169] [E: packages/coding-agent/docs/packages.md:171]。源码的 managed npm install 会创建私有 npm project,对 npm/pnpm/bun 分别加参数来避免安装或解析 host-provided pi peer dependencies [E: packages/coding-agent/src/core/package-manager.ts:1933] [E: packages/coding-agent/src/core/package-manager.ts:1941] [E: packages/coding-agent/src/core/package-manager.ts:1774] [E: packages/coding-agent/src/core/package-manager.ts:1780] [E: packages/coding-agent/src/core/package-manager.ts:1783] [E: packages/coding-agent/src/core/package-manager.ts:1794] [I]。

git source clone 后如果 package root 有 `package.json`,install flow 会运行 npm install;git update 也会在 checkout 变更后重新运行依赖安装 [E: packages/coding-agent/src/core/package-manager.ts:1837] [E: packages/coding-agent/src/core/package-manager.ts:1841] [E: packages/coding-agent/src/core/package-manager.ts:1843] [E: packages/coding-agent/src/core/package-manager.ts:1880] [E: packages/coding-agent/src/core/package-manager.ts:1883] [E: packages/coding-agent/src/core/package-manager.ts:1885] [E: packages/coding-agent/src/core/package-manager.ts:1887]。文档把这一点暴露为“reconciliation changes checkout 时 reset/clean clone,然后如果存在 package.json 就 npm install” [E: packages/coding-agent/docs/packages.md:93]。

## 跨包关系

[subsys.coding-agent.package-manager](../../subsystems/coding-agent/package-manager.md) 是内部实现节点:它权威覆盖 `DefaultPackageManager` 的 install/update/remove/resolve 控制流、storage path、pattern 处理和 CLI command dispatch;本节点只保留用户可见语义与 manifest/filter 写法 [I]。

[subsys.coding-agent.resource-loader](../../subsystems/coding-agent/resource-loader.md) 是 package-manager 的下游:package-manager 产出 extensions、skills、prompts、themes 的 `ResolvedPaths`,resource-loader 再负责真正加载 extension module、skill markdown、prompt template 和 theme JSON [E: packages/coding-agent/src/core/package-manager.ts:69] [E: packages/coding-agent/src/core/package-manager.ts:70] [E: packages/coding-agent/src/core/package-manager.ts:71] [E: packages/coding-agent/src/core/package-manager.ts:72] [I]。

## Sources

- packages/coding-agent/src/core/package-manager.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/package-manager-cli.ts
- packages/coding-agent/src/cli/config-selector.ts
- packages/coding-agent/docs/packages.md

## 相关

- [subsys.coding-agent.package-manager](../../subsystems/coding-agent/package-manager.md): package resolution、install/update/remove 和 storage layout 的内部实现。
- [subsys.coding-agent.resource-loader](../../subsystems/coding-agent/resource-loader.md): package-manager 输出的 resource paths 如何进入 extension、skill、prompt 和 theme loading。

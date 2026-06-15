---
id: subsys.plugins
path: subsystems/plugins.md
title: Plugins
kind: subsystem
tier: T2
status: verified
source: [utils/plugins/, plugins/]
symbols: [LoadedPlugin, PluginManifestMetadataSchema, createPluginFromPath, loadAllPlugins, loadAllPluginsCacheOnly, assemblePluginLoadResult, loadPluginHooks, extractMcpServersFromPlugins, getPluginLspServers, getBuiltinPlugins]
related: []
updated: 2026-06-14
evidence: explicit
---

Plugins 子系统是 Claude Code 的扩展装载层: 它把 marketplace、session-only 和 builtin plugin 合并成 `LoadedPlugin`, 再把 commands、agents、skills、hooks、MCP servers、LSP servers、output styles 和 allowlisted settings 暴露给其它子系统。[E: types/plugin.ts:48][E: utils/plugins/pluginLoader.ts:3155][E: utils/plugins/pluginLoader.ts:3177][E: utils/plugins/pluginLoader.ts:3198]

## 能回答的问题

- 一个 plugin manifest 可以声明哪些组件?
- marketplace、session-only、builtin plugin 如何合并和启用?
- plugin hooks/MCP/LSP/settings 如何进入对应子系统?
- cache-only 和 full plugin load 的边界在哪里?

## 职责边界

Plugins 负责发现、校验、缓存、合并和转换 plugin 组件; 各组件的运行语义仍归属具体子系统。比如 plugin skill 会转成 Command 后由 Skills/commands 使用, plugin hook 会注册到 Hooks feature, plugin MCP/LSP server 会进入 MCP/LSP 配置层。[E: utils/plugins/loadPluginCommands.ts:840][E: utils/plugins/loadPluginHooks.ts:91][E: utils/plugins/mcpPluginIntegration.ts:366][E: utils/plugins/lspPluginIntegration.ts:322]

## 关键文件

- `types/plugin.ts`: 定义 builtin plugin、repository/config、`LoadedPlugin` 和 plugin component/error 类型。[E: types/plugin.ts:18][E: types/plugin.ts:37][E: types/plugin.ts:48][E: types/plugin.ts:72][E: types/plugin.ts:101]
- `utils/plugins/schemas.ts`: 定义 manifest metadata、commands、agents、skills、hooks、MCP、LSP 和 settings schema。[E: utils/plugins/schemas.ts:274][E: utils/plugins/schemas.ts:429][E: utils/plugins/schemas.ts:460][E: utils/plugins/schemas.ts:484][E: utils/plugins/schemas.ts:348][E: utils/plugins/schemas.ts:543][E: utils/plugins/schemas.ts:797][E: utils/plugins/schemas.ts:857]
- `utils/plugins/pluginLoader.ts`: 从路径创建 plugin, 处理 marketplace/cache-only/full load, 合并来源和依赖降级。[E: utils/plugins/pluginLoader.ts:1348][E: utils/plugins/pluginLoader.ts:1888][E: utils/plugins/pluginLoader.ts:3096][E: utils/plugins/pluginLoader.ts:3137][E: utils/plugins/pluginLoader.ts:3155]
- `utils/plugins/loadPluginHooks.ts`: 把 enabled plugin 的 hooksConfig 转成带 pluginRoot/pluginName/pluginId 的 hook matchers, 并原子注册。[E: utils/plugins/loadPluginHooks.ts:28][E: utils/plugins/loadPluginHooks.ts:91][E: utils/plugins/loadPluginHooks.ts:147]
- `utils/plugins/mcpPluginIntegration.ts` 和 `utils/plugins/lspPluginIntegration.ts`: 提取 plugin MCP/LSP servers, 做变量替换和 plugin scope 前缀。[E: utils/plugins/mcpPluginIntegration.ts:131][E: utils/plugins/mcpPluginIntegration.ts:341][E: utils/plugins/lspPluginIntegration.ts:57][E: utils/plugins/lspPluginIntegration.ts:298]
- `plugins/builtinPlugins.ts`: 管理随 CLI 分发的 builtin plugins 及其启用状态和 bundled skill commands。[E: plugins/builtinPlugins.ts:21][E: plugins/builtinPlugins.ts:57][E: plugins/builtinPlugins.ts:108]

## 数据模型 / 状态

`LoadedPlugin` 保存 manifest、path、source、repository、enabled/isBuiltin/sha, 以及 commands/agents/skills/output-styles path、hooksConfig、mcpServers、lspServers 和 settings。[E: types/plugin.ts:48] Manifest schema 要求 plugin name 非空且不能包含空格, metadata 还可包含 version、description、author、homepage、repository、license、keywords 和 dependencies。[E: utils/plugins/schemas.ts:276][E: utils/plugins/schemas.ts:286][E: utils/plugins/schemas.ts:292][E: utils/plugins/schemas.ts:313]

插件目录由 mode 和 env 共同决定: cowork 模式或 `CLAUDE_CODE_USE_COWORK_PLUGINS` 使用 `cowork_plugins`, 否则使用 `plugins`; `CLAUDE_CODE_PLUGIN_CACHE_DIR` 可以覆盖完整路径。[E: utils/plugins/pluginDirectories.ts:22][E: utils/plugins/pluginDirectories.ts:34][E: utils/plugins/pluginDirectories.ts:53] 每个 plugin 还有持久 data dir, `getPluginDataDir` 会按 sanitized plugin ID 建目录, 用于 `${CLAUDE_PLUGIN_DATA}`。[E: utils/plugins/pluginDirectories.ts:92][E: utils/plugins/pluginDirectories.ts:119]

Builtin plugin 使用 `name@builtin` 作为 source, 用户设置优先于 plugin default, default 再优先于 true; 启用的 builtin plugin 会转成 `LoadedPlugin`, hooks 和 MCP servers 也挂在同一对象上。[E: plugins/builtinPlugins.ts:70][E: plugins/builtinPlugins.ts:73][E: plugins/builtinPlugins.ts:78][E: plugins/builtinPlugins.ts:90]

## 控制流

`createPluginFromPath` 从 `.claude-plugin/plugin.json` 读取 manifest, 创建 base `LoadedPlugin`, 并在 manifest 未显式声明时自动探测 `commands/agents/skills/output-styles` 目录。[E: utils/plugins/pluginLoader.ts:1359][E: utils/plugins/pluginLoader.ts:1364][E: utils/plugins/pluginLoader.ts:1374] Manifest commands 支持 object mapping、inline content、单路径或路径数组; agents、skills、output-styles 支持额外 path 列表。[E: utils/plugins/pluginLoader.ts:1394][E: utils/plugins/pluginLoader.ts:1426][E: utils/plugins/pluginLoader.ts:1473][E: utils/plugins/pluginLoader.ts:1536][E: utils/plugins/pluginLoader.ts:1564][E: utils/plugins/pluginLoader.ts:1592]

Hooks 先加载标准 `hooks/hooks.json`, 再加载或合并 manifest `hooks` 字段中的 path 或 inline hooks, 最后写入 `plugin.hooksConfig`。[E: utils/plugins/pluginLoader.ts:1618][E: utils/plugins/pluginLoader.ts:1652][E: utils/plugins/pluginLoader.ts:1710][E: utils/plugins/pluginLoader.ts:1750][E: utils/plugins/pluginLoader.ts:1757] `loadPluginHooks` 会为 27 个 HookEvent 初始化数组, 只处理 enabled plugin, 并在注册前清空旧的 plugin hooks 再注册新集合。[E: utils/plugins/loadPluginHooks.ts:31][E: utils/plugins/loadPluginHooks.ts:91][E: utils/plugins/loadPluginHooks.ts:124][E: utils/plugins/loadPluginHooks.ts:147]

Marketplace loader 只处理 `plugin@marketplace` 格式, 跳过 `builtin`, 预加载 marketplace catalog, 并在 enterprise policy 无法验证 marketplace source 时 fail-closed。[E: utils/plugins/pluginLoader.ts:1906][E: utils/plugins/pluginLoader.ts:1912][E: utils/plugins/pluginLoader.ts:1951][E: utils/plugins/pluginLoader.ts:1982] `loadAllPlugins` 使用 full marketplace loader 并暖 cache-only cache; `loadAllPluginsCacheOnly` 默认只走 cache-only, 但 `CLAUDE_CODE_SYNC_PLUGIN_INSTALL` 会委托 full loader。[E: utils/plugins/pluginLoader.ts:3096][E: utils/plugins/pluginLoader.ts:3106][E: utils/plugins/pluginLoader.ts:3137][E: utils/plugins/pluginLoader.ts:3139]

`assemblePluginLoadResult` 并行加载 marketplace 与 session-only plugins, 加入 builtin plugins, 通过 `mergePluginSources` 合并, 再验证依赖并把 demoted plugin 标为 disabled, 最后缓存 enabled plugin settings。[E: utils/plugins/pluginLoader.ts:3164][E: utils/plugins/pluginLoader.ts:3172][E: utils/plugins/pluginLoader.ts:3177][E: utils/plugins/pluginLoader.ts:3192][E: utils/plugins/pluginLoader.ts:3204]

MCP 集成先读取 plugin 根目录 `.mcp.json`, 再用 manifest `mcpServers` 覆盖或追加; 支持 JSON path、MCPB、inline record 和数组。[E: utils/plugins/mcpPluginIntegration.ts:138][E: utils/plugins/mcpPluginIntegration.ts:147][E: utils/plugins/mcpPluginIntegration.ts:151][E: utils/plugins/mcpPluginIntegration.ts:172][E: utils/plugins/mcpPluginIntegration.ts:207] 返回给 MCP 子系统前, server name 会变成 `plugin:${pluginName}:${name}`, scope 设为 dynamic, 并保存 pluginSource。[E: utils/plugins/mcpPluginIntegration.ts:341][E: utils/plugins/mcpPluginIntegration.ts:350][E: utils/plugins/mcpPluginIntegration.ts:353] LSP 集成同样支持 `.lsp.json` 和 manifest `lspServers`, 并给 server name 加 plugin scope。[E: utils/plugins/lspPluginIntegration.ts:64][E: utils/plugins/lspPluginIntegration.ts:109][E: utils/plugins/lspPluginIntegration.ts:306]

## 设计动机与权衡

- cache-only loader 避免 startup 阶段因为 git clone 或网络安装阻塞, explicit refresh/install 路径才用 full loader; 这是启动速度与最新源码之间的取舍。[E: utils/plugins/pluginLoader.ts:3137][E: utils/plugins/pluginLoader.ts:3142][I]
- plugin hooks、MCP、LSP 都加 plugin scope 或 plugin context, 这是为了避免不同 plugin 的名字冲突, 也让 hooks/tracing 能知道来源。[E: utils/plugins/loadPluginHooks.ts:74][E: utils/plugins/mcpPluginIntegration.ts:350][E: utils/plugins/lspPluginIntegration.ts:306][I]
- Builtin plugin 走同一个 `LoadedPlugin` 形状, 但 path 使用 `builtin` sentinel, 说明 builtin 是可开关的 plugin surface, 不是磁盘 plugin cache 的一部分。[E: plugins/builtinPlugins.ts:78][E: plugins/builtinPlugins.ts:85][I]

## Gotchas

- Manifest `settings` 只保留 allowlisted keys, 当前 schema 描述为 agent; 不要假设 plugin 可以随意合并所有设置。[E: utils/plugins/schemas.ts:857][E: utils/plugins/schemas.ts:863]
- Plugin MCP/LSP env 会注入 `CLAUDE_PLUGIN_ROOT` 和 `CLAUDE_PLUGIN_DATA`, 且 `${user_config.X}` 只有 manifest 声明 userConfig 时才会读取 plugin options。[E: utils/plugins/mcpPluginIntegration.ts:511][E: utils/plugins/mcpPluginIntegration.ts:451][E: utils/plugins/lspPluginIntegration.ts:266][E: utils/plugins/lspPluginIntegration.ts:343]
- Session-only plugin 会覆盖已安装同名 plugin, 但 managed plugin names 会影响 merge 行为; 调试时要看 source 合并结果, 不能只看 enabledPlugins 设置。[E: utils/plugins/pluginLoader.ts:3177][E: utils/plugins/pluginLoader.ts:3177]

## Sources

- `utils/plugins/`
- `plugins/`

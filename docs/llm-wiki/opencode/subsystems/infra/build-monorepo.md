---
id: infra.build-monorepo
title: 构建与 monorepo(Bun + Turbo + catalog)
kind: subsystem
tier: T2
v: na
source:
  - package.json
  - turbo.json
  - bunfig.toml
  - packages/opencode/package.json
  - AGENTS.md
symbols:
  - packageManager
  - workspaces.catalog
  - turbo.tasks
  - bunfig.install
related:
  - infra.native-binary-release
evidence: explicit
status: verified
updated: 355a0bcf5
---

> 构建与 monorepo 节点描述 opencode 仓库的 root-level 包管理、脚本入口、Turbo task graph 和 Bun install 策略；它是终端 AI agent、Web/Desktop/Console 客户端与发布脚本共用的工程地基。

## 能回答的问题

- root `package.json` 如何组织 opencode 的 Bun workspaces?
- `workspaces.catalog` 为什么是依赖版本的单一来源?
- root `test` 为什么不能跑, 正确的局部测试边界是什么?
- Turbo 只缓存哪些任务输出?
- Bun install 策略怎样降低供应链与漂移风险?

## 职责边界

monorepo 构建层只规定包集合、脚本入口、依赖版本与任务图, 不实现 V1 `SessionPrompt.runLoop` 或 V2 `SessionRunner` [I]。root package 是 private ESM 包, package manager 固定为 `bun@1.3.14` [E: package.json:5] [E: package.json:6] [E: package.json:7]。root workspaces 包含 `packages/*`, `packages/console/*`, `packages/stats/*`, `packages/sdk/js`, `packages/slack` 五类 glob [E: package.json:24] [E: package.json:26] [E: package.json:27] [E: package.json:28] [E: package.json:29] [E: package.json:30]。

V1/V2 关系: monorepo build 是 `v: na`。V1 当前活跑代码在 `packages/opencode`, V2 新内核在 `packages/core`, 但 root catalog 和 Turbo task graph 对两代代码都是共享的工程基础 [I]。

## 技术栈

- Bun workspaces: root `packageManager` 固定 Bun 版本, package scripts 直接用 `bun run --cwd ...` 进入各包 [E: package.json:7] [E: package.json:9] [E: package.json:10] [E: package.json:11]。
- Turbo: root `typecheck` 运行 `bun turbo typecheck`, `turbo.json` 定义 `typecheck`, `build`, `opencode#test`, `@opencode-ai/app#test`, `@opencode-ai/ui#test` 任务 [E: package.json:16] [E: turbo.json:6] [E: turbo.json:7] [E: turbo.json:11] [E: turbo.json:16] [E: turbo.json:20]。
- Bun catalog: root `workspaces.catalog` 固定 Effect、AI SDK、Solid、SST、Vite、Tailwind、OpenTUI 等版本, package 内用 `catalog:` 消费这些版本 [E: package.json:32] [E: package.json:64] [E: package.json:65] [E: package.json:80] [E: packages/opencode/package.json:79] [E: packages/opencode/package.json:110]。

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `package.json` | root workspace manifest。定义 dev/typecheck/test 脚本、workspace globs、catalog、trusted dependencies、overrides、patched dependencies [E: package.json:8] [E: package.json:24] [E: package.json:32] [E: package.json:126] [E: package.json:136] [E: package.json:143]。 |
| `turbo.json` | task graph。`build` 输出 `dist/**`, `opencode#test` 依赖上游 build, app/ui test 也依赖上游 build [E: turbo.json:7] [E: turbo.json:9] [E: turbo.json:11] [E: turbo.json:12] [E: turbo.json:16] [E: turbo.json:17] [E: turbo.json:20] [E: turbo.json:21]。 |
| `bunfig.toml` | Bun install/test guard。开启 exact install, 新解析版本默认要求发布至少 259200 秒, root test 指向 `./do-not-run-tests-from-root` [E: bunfig.toml:2] [E: bunfig.toml:4] [E: bunfig.toml:8]。 |
| `packages/opencode/package.json` | V1 CLI package manifest。`build` 调 `script/build.ts`, `bin.opencode` 指向 `./bin/opencode`, dependency 列表同时包含 Vercel AI SDK provider 和 `@opencode-ai/llm` native provider 引擎 [E: packages/opencode/package.json:14] [E: packages/opencode/package.json:18] [E: packages/opencode/package.json:75] [E: packages/opencode/package.json:87]。 |
| `AGENTS.md` | repo-local agent 操作约束。默认分支是 `dev`, root tests 明确禁止, typecheck 必须从 package directory 跑 `bun typecheck` [E: AGENTS.md:2] [E: AGENTS.md:142] [E: AGENTS.md:146]。 |

## 数据模型

`workspaces.catalog` 是 monorepo 的版本 catalog。包内使用 `catalog:` 指向 root 版本, 例如 `packages/opencode/package.json` 的 `typescript`, `@effect/opentelemetry`, `@effect/platform-node`, `ai`, `effect`, `zod` 都从 catalog 取版本 [E: package.json:32] [E: packages/opencode/package.json:50] [E: packages/opencode/package.json:79] [E: packages/opencode/package.json:80] [E: packages/opencode/package.json:110] [E: packages/opencode/package.json:118] [E: packages/opencode/package.json:150]。这种设计把高频共享依赖的版本决策收拢到 root manifest, 减少 27-package 级别的 provider/runtime/UI 版本漂移 [I]。

`turbo.tasks` 是任务图数据。`build.outputs` 只有 `dist/**`, test 任务 `outputs: []`, 因此测试不会把结果当作构建产物复用 [E: turbo.json:7] [E: turbo.json:9] [E: turbo.json:13] [E: turbo.json:18] [E: turbo.json:22]。`globalEnv` 与 `globalPassThroughEnv` 都包含 `CI` 和 `OPENCODE_DISABLE_SHARE`, 表明这两个变量参与 Turbo cache 或透传边界 [E: turbo.json:3] [E: turbo.json:4]。

## 控制流

1. 开发 CLI 时, root `dev` 进入 `packages/opencode` 并带 `--conditions=browser` 运行 `src/index.ts` [E: package.json:9]。
2. 开发 Desktop/Web/Console/Storybook 时, root scripts 分别进入 `packages/desktop`, `packages/app`, `packages/console/app`, `packages/storybook` [E: package.json:10] [E: package.json:11] [E: package.json:12] [E: package.json:14]。
3. 类型检查从 root 触发 `bun turbo typecheck`, Turbo 把 `typecheck` 作为无额外 outputs 的任务执行 [E: package.json:16] [E: turbo.json:6]。
4. 构建任务写 `dist/**`, 后续 package-specific test 可以声明依赖 `^build` [E: turbo.json:7] [E: turbo.json:11]。
5. root `test` 故意输出 `do not run tests from root` 并 exit 1, repo 指令要求从包目录执行测试 [E: package.json:22] [E: AGENTS.md:142]。

## 设计动机与权衡

root `bunfig.toml` 用 `exact = true` 和 minimum release age 限制新解析依赖, 但把 AI provider、OpenTUI、Electron builder 等发布节奏敏感的包列入 exclude, 这是稳定性与上游快速发布之间的折中 [E: bunfig.toml:2] [E: bunfig.toml:4] [E: bunfig.toml:5]。root `trustedDependencies` 明确允许会执行 install scripts 或 native setup 的依赖, 包括 esbuild、node-pty、tree-sitter、web-tree-sitter、electron [E: package.json:126] [E: package.json:128] [E: package.json:130] [E: package.json:133] [E: package.json:134]。

## Gotcha

- root `bun test` 不是总测试入口, 它是 guard。局部测试应从受影响 package 内运行, 这与 repo-local `AGENTS.md` 的测试约束一致 [E: package.json:22] [E: AGENTS.md:142]。
- root `package.json` 的 `dependencies` 不等于 CLI runtime 全部依赖。CLI runtime 主要在 `packages/opencode/package.json` 内声明, root dependencies 只放 workspace-level 脚本和 SDK/plugin/script 共享依赖 [E: package.json:109] [E: packages/opencode/package.json:54]。
- `catalog:` 是 Bun workspace 版本引用, 不是 npm 包名的一部分 [I]。

## Sources

- `package.json`
- `turbo.json`
- `bunfig.toml`
- `packages/opencode/package.json`
- `AGENTS.md`

## 相关

- [原生二进制与发布](native-binary-release.md)

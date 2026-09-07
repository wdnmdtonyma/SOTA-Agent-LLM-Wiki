# DSH wiki 增量刷新令（0a53fb55be → d347e70390）

给 filler 读。规范仍以 `../conventions.md` 与 `../RUN.md` 为准。本文件只补充**这一轮**的路径重映射、架构事实和文件纪律。

本轮 **不跑逐节点独立 L2**。filler 自己核 `[E:]`（每页至少抽 3 条 `read_file` 对行），写完将 `status: verified`。过宽结论宁可降 `[I]/[U]`。

## 冻结点

- **base**(上一轮 verified): `0a53fb55be` (`0.1.2-alpha.2`)
- **target**(必须对照的源码 HEAD): `d347e70390` (`0.1.3-alpha.1`；全 SHA `d347e703908d0406b7a7ef80e3a0e594d86b2215`)
- 源码根: `deepseek-harness/`（相对本 wiki `../../../deepseek-harness/`）
- 节点 `updated:` 一律写成 `d347e70390`
- 工作树可能残留已删除包的空壳目录（只有 `node_modules`、没有 `package.json`）。**那些不是源码**。判断路径是否存在：看 git 跟踪的 `package.json` / `.ts` / `.yml`，或 `test -f`。

## 路径重映射（frontmatter `source:` 与 `[E:]` 必须改到右边）

| 旧路径 | 新路径 / 处理 |
|---|---|
| `packages/session/session-persistence/src/coordinator.ts` | **已删除**。缝定义在 `packages/session/session-persistence/src/{index,handle,storage-contract,errors,revision}.ts` |
| `packages/session/session-persistence/src/preparations.ts` | **已删除**。读 `handle.ts` + jsonl `storage.ts` |
| `packages/session/session-persistence/src/write-behind.ts` | **已删除**。jsonl 写路径 + `lease.ts` |
| `packages/session/session-persistence-sqlite/**` | **包已删除**（目录若还在，只有 `node_modules` 空壳）。session 盘只剩 JSONL。`session-query-sqlite` 与 `storage-sqlite` **仍在**，不要一起退役 |
| `packages/subagent/tool-subagent-report/**` | **包已删除**。`surface.tools.report` 保留 id，改写成退役页 |
| `packages/subagent/subagent/src/descriptor-seed.ts` | `packages/subagent/subagent/src/descriptor.ts` |
| `packages/subagent/subagent/src/activation-setup-registry.ts` | **已删除**。改读 `child-agent.ts` / `continuation.ts` / `lifecycle.ts` |
| `packages/code-runtime/code-runtime-python/**` | `packages/experimental/code-runtime-python/**`；包名 `@deepseek-ai/dsh-experimental-code-runtime-python` |
| `packages/examples/agent-spine-demo/**` | **已删除**。`subsys.core.invariants` 不要再引用 demo |
| 绝大多数 `packages/*/src/invariant.ts` | **本轮大批删掉**（251 → 39）。文件不存在就从 `source:` / `[E:]` / Sources 删掉，不要虚构 companion |
| `packages/*/tests/fixtures/loader/cordis.yml` | 改为同目录 `*.patch.yml`（如 `acp.patch.yml`、`codex.patch.yml`、`dsh-sdk.patch.yml`、`child.patch.yml`） |
| `packages/context/time-context/tests/fixtures/cordis.yml` | `packages/context/time-context/tests/fixtures/time-context.patch.yml` |

找不到替换文件就从 `source:` 删掉该条。禁止把 `[E:]` 指到已删除路径。禁止把空壳 `node_modules` 当源。

## 必须写进正文的架构事实（先读源再写，不要照抄本表当 [E]）

1. **`SESSION_FORMAT_VERSION = 2`**（`packages/core/session/src/types.ts`）。不再写「现为 0、没有自动 migration」。当前有 **adjacent** 链：`session-format-v0-to-v1` → `session-format-v1-to-v2`，由 `dsh-session-format` + `dsh-session-format-catalog` 规划，JSONL 后端在 load 时走 catalog。比 2 新的盘仍拒。
2. **session persistence 是 handle 缝**：`create`/`open` 得到 `SessionHandle`；`coordinator.ts` 不存在。
3. **shipped session 盘只有 JSONL**。`dsh-base` 仍挂 `session-persistence-jsonl`。jsonl 有跨进程 write-ownership **lease**。SQLite **session persistence** 包已删除；节点 `subsys.persistence.sqlite` **保留 id**，改写成退役 + 指向仍活着的 `session-query-sqlite` / `storage-sqlite`。
4. **`report` 工具包已删除**。`surface.tools.report` 保留 id，标明退役。tools-catalog / package-index / presets 表里删掉活行。base bundle 不再挂 `tool-subagent-report`。
5. **PTC 不再向模型发布 `workflow`**：`presets/ptc/agent.cordis.yml` 里 `tool-workflow` 为 `disabled: true`（留下 engine 给 `ralph`）。`run_code` 仍是 PTC 的模型编排面。
6. **Python code-runtime 现在是真正的 `CodeRuntime` Provider**（CPython subprocess，fd-3 JSON-lines），包在 `packages/experimental/code-runtime-python`。旧页「只 re-export protocol、不占 seam」已经过时，必须重读 `src/index.ts`。
7. **http-proxy 是库不是插件**：`@deepseek-ai/dsh-http-proxy`，`installProxyFromEnvironment` 在 `apps/cli/src/profile-boot.ts` 安装 undici dispatcher。不要写成 Cordis 行。
8. **file-upload** 是 web-app 挂载的 client 服务（`dsh-client-file-upload`），不是新的模型可见工具。
9. **session-turn-outline** 是 web-app 上的 projection unit。写进 `subsys.persistence.projection`，**不要另建节点**。
10. **五个 profile / 四个 preset / 六个 bundle 名字没变**。默认模型仍是 `deepseek-official` / `deepseek-v4-flash`。
11. 叶 package 约 **265**（以 `packages/**/package.json` 现数为准，catalog 重数）。产品版本 `0.1.3-alpha.1`。
12. 正文凡写 `SESSION_FORMAT_VERSION = 0`、`没有 migration`、`session-persistence-sqlite` 仍是可选后端、`tool-subagent-report` 仍 shipped、Python runtime 仍在 `packages/code-runtime/code-runtime-python`、PTC 仍发布 `workflow` 工具——全部改掉。

## 本轮新节点（3）

| 节点 | 路径 | 判定 |
|---|---|---|
| `subsys.persistence.session-format` | `subsystems/persistence/session-format.md` | v0→v1→v2 链、catalog、与 jsonl load 的接缝 |
| `subsys.client.file-upload` | `subsystems/client/file-upload.md` | web-app 浏览器上传 / staged receipt |
| `subsys.util.http-proxy` | `subsystems/util/http-proxy.md` | 进程级 outbound proxy 库 |

不要为 inspector / webworker preview / 单个 ui-* 控件另建节点。

## 不要退役的节点（就地改 source / 标题）

- `surface.tools.report` → 退役映射，不要删文件
- `subsys.persistence.sqlite` → 退役 session-persistence-sqlite；讲清 query/storage sqlite 仍在
- `subsys.execution.code-runtime-python` → 改 experimental 路径与 Provider 身份
- `surface.presets.code` / `subsys.core.code-mode` → 稳定别名，继续讲 PTC

## filler 纪律

只写两类文件：

1. 自己批次里的节点 `docs/llm-wiki/deepseek-harness/<path>`
2. 可选 `_staging/uncertainty-update-<slug>.md`

禁止改：`index.json`、`llms.txt`、`reference/uncertainty.md`、`README.md`、`conventions.md`、`RUN.md`、`tools/*`、别人批次的节点、`deepseek-harness/` 源码。

步骤：

1. 读本文件 + `conventions.md` 对应模板。
2. 读现有节点 `.md`（remap 批次不要写成空模板；rewrite 批次保留仍成立的问题列表）。
3. 用 `read_file` / `grep` 读 **target** 源码。`source:` 失效路径先按上表重映射，再核对文件确实存在。
4. 每个 load-bearing 论断的 `[E: path:line]` 必须落在被断言的那一行代码上（不是空行/注释/纯括号）。
5. `status: verified`（自己核过至少 3 条 `[E:]`）或 `draft`（核不完），`updated: d347e70390`，`evidence: explicit`。
6. 跑 lint 时只处理带自己 `node:<path>` 的报错。

### 按批次深度

- **rewrite**：重写 load-bearing 段与 source/symbols，页结构可留。
- **remap**：禁止从零重写。删缺失 source、改 `[E:]`、改过时一句；其余不动。
- **refresh**：对照变更过的 source 修假话、重落行号，不扩写。
- **create**：按 conventions 模板从零写新文件。

质量：不要为过 lint 写空话；不要把官方 `docs/**` 当 `[E]`；冲突时跟代码。

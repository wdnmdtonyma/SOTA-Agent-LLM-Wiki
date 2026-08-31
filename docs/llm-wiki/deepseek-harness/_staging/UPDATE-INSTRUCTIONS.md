# DSH wiki 增量刷新令（47f943859b → 0a53fb55be）

给 filler / verifier 读。规范仍以 `../conventions.md` 与 `../RUN.md` 为准。本文件只补充**这一轮**的路径重映射、架构事实和文件纪律。

## 冻结点

- **base**(上一轮 verified): `47f943859b` (`0.1.0-rc.5`)
- **target**(必须对照的源码 HEAD): `0a53fb55be` (`0.1.2-alpha.2`)
- 源码根: 仓库 `deepseek-harness/`(相对本 wiki `../../../deepseek-harness/`)
- 节点 `updated:` 一律写成 `0a53fb55be`
- 工作树可能残留已删除包的空壳目录(只有 `node_modules`、没有 `package.json`)。**那些不是源码**。判断某路径是否存在:看 `package.json` / `.ts` / `.yml` 是否仍被 git 跟踪,或 `test -f`。

## 路径重映射(frontmatter `source:` 与 `[E:]` 必须改到右边)

| 旧路径 | 新路径 |
|---|---|
| `apps/cli/config/agent-presets/minimal/` | `packages/preset/agent-presets/presets/minimal/` |
| `apps/cli/config/agent-presets/standard/` | `packages/preset/agent-presets/presets/standard/` |
| `apps/cli/config/agent-presets/code/` | `packages/preset/agent-presets/presets/ptc/` |
| `apps/cli/config/agent-presets/cordis/` | `packages/preset/agent-presets/presets/cordis/` |
| `packages/core/tools/src/code-mode.ts` | `packages/core/tools/src/ptc.ts` |
| `packages/core/tools/tests/code-mode.spec.ts` | `packages/core/tools/tests/ptc.spec.ts` |
| `packages/host/apiproxy/**` | `packages/api/session-controller/**`、`packages/api/settings-controller/**`、`packages/api/workspace-controller/**`;宿主 HTTP 入口仍在 `packages/host/webserver` |
| `packages/client/runtime/**` | `packages/client/store/**` + 各 `packages/client/ui-*` + `packages/api/session-controller/src/client/` |
| `packages/client/web-react/**` | `packages/client/ui-renderer/**` |
| `packages/client/web/src/boot.tsx` | 在 `packages/client/web/src/` 下重新定位实际 boot 文件;不要臆造 |
| `examples/**` 若干 yaml | 多数迁到 `apps/cli/config/examples/`;根 `examples/` git 树已不存在 |
| `packages/examples/acp-demo/**`、`packages/examples/jsonrpc-demo/**` | 包已删除;改指向现有 `packages/bundle/acp-app` / `packages/bundle/sdk-app` / `apps/cli` 测试夹具 |

找不到替换文件就从 `source:` 删掉该条,改读 target 上真实还在的文件。禁止把 `[E:]` 指到已删除路径。

## 必须写进正文的架构事实(先读源再写,不要照抄本表当 [E])

1. **四个 shipped preset 目录名**:`minimal` / `standard` / `ptc` / `cordis`。旧名 `code` 就是 PTC。wiki 节点 id `surface.presets.code` 与 `subsys.core.code-mode` **保持不变**(稳定别名),但标题和正文必须说 PTC / `presets/ptc/` / `packages/core/tools/src/ptc.ts`。
2. **五个 shipped profile**:`web`(live)、`headless` / `sdk` / `sdk-minimal` / `acp`(startup)。见 `PROFILE_TEMPLATES`。
3. **六个 bundle**:`dsh-base`、`dsh-web-app`、`dsh-headless`、`dsh-sdk-app`、`dsh-sdk-minimal`、`dsh-acp-app`。`sdk-minimal` 不叠 base。
4. **PTC `run_code`**:TypeScript 与 Python 两套 flavor;子调用重入 `TOOL_RUNTIME_SCHEDULER`;权威 `ptc.ts`。
5. **新工具包**:`dsh-tool-pwsh-persistent`(持久 `pwsh`,对标 bash-persistent);`dsh-experimental-tool-agent-team`(opt-in,挂 `ctx.agentTeams`)。
6. **webhook**:`ctx.webhookRuntime`;GitHub adapter 在 `packages/webhook/webhook-github`。
7. **Agent Teams**:experimental,`ctx.agentTeams`,roster / mailbox / task board,叠在 continuable subagent 上。
8. **默认模型**仍是 `deepseek-official` / `deepseek-v4-flash`(以 `dsh-base` 的 `agent-default-model` 行与 `dsh-agent-default-model` 源为准,读到什么写什么)。
9. 正文里凡写「四个 preset: … code …」的枚举,改成 `minimal` / `standard` / `ptc` / `cordis`。
10. 正文里凡写 `dsh web` 是唯一宿主入口的,补上 `dsh --profile sdk|sdk-minimal|acp`。

## filler 纪律

只写两类文件:

1. 自己的节点 `docs/llm-wiki/deepseek-harness/<path>`
2. 可选 `_staging/uncertainty-update-<slug>.md`(`<slug>` = 节点 id 末段)

禁止改:`index.json`、`llms.txt`、`reference/uncertainty.md`、`tools/*`、别人的节点、`deepseek-harness/` 源码。

步骤:

1. 读本文件 + `conventions.md` 对应模板。
2. 读现有节点 `.md`(保留仍然成立的结构与问题列表;不要写成空模板)。
3. 用 `read_file` / `grep` 读 **target** 源码。frontmatter `source:` 里失效的路径先按上表重映射,再核对文件确实存在。
4. 重写所有 load-bearing 论断与 `[E: path:line]`,使行号落在被断言的那一行代码上(不是空行/注释/纯括号)。
5. 更新 `source:` / `symbols:` / `related:`(可指向本轮新增节点 id,即使 index 还没登记;lead reconcile 会收)。
6. `status: draft`,`updated: 0a53fb55be`,`evidence: explicit`(除非整页只能 inferred)。
7. 跑 `node docs/llm-wiki/deepseek-harness/tools/lint.mjs` 时,只处理带自己 `node:<path>` 的报错。

质量:不要为过 lint 写空话;不要把官方 `docs/**` 当 `[E]`;冲突时跟代码。

## verifier 纪律

独立证伪,不信任 filler 叙述。

1. 读节点全文。
2. 对每个 `[E: path:line]`:`read_file` 该行,确认那一行就是被断言的代码。
3. 路径必须存在于 target;`updated` 必须是 `0a53fb55be`。
4. 过宽/过时结论(仍写 `code` preset 路径、仍写 apiproxy 活着、仍写 Code Mode 文件名 `code-mode.ts`、仍写只有 web/headless 两个 profile)必须改掉。
5. 修节点本身(L3 合并进本步),然后 `status: verified`。
6. 无法核到的降 `[I]`/`[U]`,并写 `_staging/uncertainty-update-<slug>.md`。不能核到就不要标 verified。

## 不要退役的节点(就地改 source / 标题)

- `surface.presets.code` → 标题改成 PTC,source 改 `presets/ptc/`
- `subsys.core.code-mode` → 标题可加 PTC,source 改 `ptc.ts`
- `subsys.host.apiproxy` → 改写为 Host HTTP API(三个 `packages/api/*-controller`),不要假装 apiproxy 包还在
- `subsys.client.runtime` → 改写为 `packages/client/store` + session-controller 客户端 + 仍存在的 client 启动路径

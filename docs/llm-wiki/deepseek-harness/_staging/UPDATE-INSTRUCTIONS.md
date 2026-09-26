# UPDATE INSTRUCTIONS — DSH wiki c291e7961a → 477b4f4205

> 给 filler / L2 verifier 用。事实以 `deepseek-harness/` checkout `477b4f4205` 为准，不以本文件或 update-facts 转述为准。写前必须打开被引用的源文件。

## 目标

- **base（上一轮 verified）**: `c291e7961a515f6d7af9304e7fd1d257929aef26`（`0.1.5-rc.2`）
- **target（官方 `origin/master`）**: `477b4f420553e8a52c2fbccc464d7561b239c443`（`0.1.7-rc.2`；describe `dsh-v0.1.7-rc.2`）
- **短 SHA**: `477b4f4205`
- **跨度**: 3511 commits · 8702 files · +1334135 / -155240
- **中间 tag**: `dsh-v0.1.6-alpha.1/2` → `dsh-v0.1.7-alpha.1/2` → `dsh-v0.1.7-rc.1` → `dsh-v0.1.7-rc.2`
- **节点影响**: 0 A-BROKEN（机械；删除源被当成 churn）/ 122 B-HEAVY / 83 C-DRIFT / 1 D-CLEAN
- **包**: `packages/**/package.json` **321**（含 7 个 typert `@fixture/*` + 2 个 skill template）；产品叶 `packages/*/*` **312**

## 硬规则

1. 中文讲解，英文标识符。节点自包含。套 `docs/llm-wiki/deepseek-harness/conventions.md` 对应模板。
2. 每条 load-bearing 论断就近 `[E: relative/path:line]`，相对 `deepseek-harness/`。行号必须落在**被断言的代码行本身**，不是上方注释、空行、或 lone `}`。
3. frontmatter: `status: verified`、`updated: 477b4f4205`、`evidence: explicit`（除非真是 inferred）。`status: verified` 只在你用 Read 抽检至少 3 条 `[E]` 之后。
4. 只写你被分配的 node `.md`，以及可选 `docs/llm-wiki/deepseek-harness/_staging/uncertainty-update-<id-last-segment>.md`。
5. **不要**改 `index.json`、`llms.txt`、`reference/uncertainty.md`、`README.md`、`conventions.md`、`RUN.md`、`tools/*`、其它节点、`deepseek-harness/` 源码。
6. `[E]` 不得指向 `docs/**`、`.agents/notes/**`、已删除包。
7. 产品版本现为 **0.1.7-rc.2**。Node `^22.19.0 || >=24.0.0`、pnpm `11.7.0` 未变。
8. 写完后抽 3 条 `[E]` 用 Read 对一下行号。过宽结论宁可降 `[I]/[U]`。
9. 旧路径一律改到本文件「路径重映射」表的右边；找不到替换就从 `source:` 删掉。

### 按批次深度

- **rewrite**：重写 load-bearing 段与 source/symbols，页结构可留，保留仍成立的问句。
- **refresh**：对照当前 source 修假话、重落行号、改过时一句；不扩写成新书。
- **retire**：保留 id 与文件，改成退役页（像 `surface.tools.report`），指向替代缝。
- **create**：按 conventions 模板从零写新文件。父目录已存在。
- **sha-bump**：只改 `updated:`（lead 机械做；`ref.uncertainty` 由 reconcile 重建）。

## 路径重映射（frontmatter `source:` 与 `[E:]` 必须改到右边）

| 旧路径 | 新路径 / 处理 |
|---|---|
| `packages/preset/agent-presets/presets/{standard,ptc,minimal,cordis}/agent.cordis.yml` | **`packages/bundle/web-app/presets/{standard,ptc,minimal,cordis}.patch.yml`** |
| `packages/preset/agent-presets/src/*` | **`packages/preset/agent-preset-registry/src/*`** + **`packages/preset/agent-preset/src/index.ts`** |
| `packages/fs/tool-present/**` | **`packages/deliverables/tool-present/**`** |
| `packages/code-runtime/code-runtime/**` | **`packages/ptc-runtime/ptc-runtime/**`**（`ctx.ptcRuntime` / `PtcRuntime`） |
| `packages/code-runtime/code-runtime-worker-thread/**` | **`packages/ptc-runtime/ptc-runtime-node/**`** |
| `packages/experimental/code-runtime-python/**` | **`packages/experimental/ptc-runtime-python/**`** |
| `packages/e2b/**` | **已删除**。远程缝改读 `packages/ssh/{ssh,fs-ssh,subprocess-ssh,sandbox-ssh}` |
| `packages/workflow/workflow-worker-thread/**` | **`packages/workflow/workflow-ptc/**`** |
| `packages/settings/settings-file/**` | **已删除**。改读仍活的 `packages/settings/settings` |

找不到替换文件就从 `source:` 删掉该条。禁止把 `[E:]` 指到已删除路径。

## 必须写进正文的架构事实（先读源再写，不要照抄本表当 [E]）

1. **`SESSION_FORMAT_VERSION = 4`**（`packages/core/session/src/types.ts`）。catalog `currentVersion: 4`，adjacent 链 **v0→v1→v2→v3→v4**（新包 `session-format-v3-to-v4`）。比 4 新的盘仍拒。禁止再写「现为 3 / 链止于 v3」。
2. **v4 tool 角色**：`tool/result` 不再是 user 消息里的 `tool-result` wrapper；migrator `liftToolResult` 抬成 first-class `role: 'tool'`。v4 仍拒绝 `request/header.system`。
3. **声明式 preset**：不再扫目录。`@deepseek-ai/dsh-agent-preset` 在普通 Cordis YAML 里声明 `id` + `plugins[]`；`@deepseek-ai/dsh-agent-preset-registry` 管 roster / revision / bind。Web 编辑保存写 **profile user patch**，不是独立 preset 目录。
4. **四个 shipped preset 只在 `dsh-web-app`**：`package.json` `dsh.bundle.patch` = `cordis.patch.yml` + `presets/{standard,ptc,minimal,cordis}.patch.yml`。`PROFILE_TEMPLATES.headless/sdk/acp` **不含**这些 preset 文件。
5. **preset 成员（以 patch 为准）**：
   - **minimal**：complete persona + persistent bash/pwsh 组。无 fs / 无 compaction。
   - **standard**：编码工具 + 启用的 `workflow-ptc` + `tool-workflow`；`tool-ralph` `disabled: true`；`present`；`plugin_manager` `disabled: true`。
   - **ptc**：standard 同类工具 + `agent-tool-presentation` `mode: ptc`；**`workflow-ptc` / `tool-workflow` / `tool-ralph` 均为 `disabled: true`**。
   - **cordis**：standard + `tool-cordis` + creator skills；`plugin_manager` 仅当 `ctx.get('profileContext')`。
6. **`subagent_fork` 出厂 `backgroundMode: continuable`**（standard/ptc/cordis）。不要再写 one-shot fork 作为 shipped 默认。
7. **`ctx.ptcRuntime` / `PtcRuntime`** 取代 `ctx.codeRuntime`。Node 实现 `ptc-runtime-node`；Python 仍 experimental。
8. **E2B 包已删除**。`subsys.execution.e2b` 改成退役页，指向 `packages/ssh/*`。
9. **新产品工具**：`load_workspace_dependencies`（sdk-app 挂；web preset 默认不挂）、`plugin_manager`（preset 行默认 disabled）。lead 会另建节点；本轮 rewrite 页只需在 catalog / 装配段点名。
10. **五个 shipped CLI profile 未变**：`web` / `headless` / `sdk` / `sdk-minimal` / `acp`。`desktop` 仍不是 CLI profile。`OPTIONAL_BUNDLES`：agent-team-profile / voice-input-bundle / auto-review。
11. **base 默认模型**仍是 `deepseek-official` / `deepseek-flash`；acp-app 与 SDK 客户端构造仍默认 `deepseek-v4-flash`。
12. **Inbox** 仍在 `packages/core/agent-loop/src/inbox.ts` 的 `ReactLoopInbox`。
13. 正文凡写 `SESSION_FORMAT_VERSION = 3`、preset 目录 `agent-presets/presets/`、`ctx.codeRuntime`、E2B 仍 shipped、ptc 把 workflow engine 留给 ralph、`subagent_fork` 出厂 one-shot、`present` 在 `packages/fs/tool-present`——全部改掉。

## 本轮新节点（lead 登记；指定 filler create）

| 节点 | 路径 | 判定 |
|---|---|---|
| `surface.tools.workspace-dependencies` | `surface/tools/workspace-dependencies.md` | wire `load_workspace_dependencies`；sdk-app 挂 |
| `surface.tools.plugin-manager` | `surface/tools/plugin-manager.md` | wire `plugin_manager`；出厂 disabled |
| `subsys.execution.ssh` | `subsystems/execution/ssh.md` | `ctx` SSH 缝；fs/subprocess/sandbox providers |

不要为 voice / browser-use / computer-use / auto-review / 每个 ui-settings-* 另建节点。fold 进 overview / package-index / app-boot / 既有 UI 页。v3→v4 fold 进 `subsys.persistence.session-format`。

## 退役（保留 id）

- `subsys.execution.e2b` → 退役页，指向 ssh
- `surface.tools.report` / `subsys.persistence.sqlite` → 继续退役
- `surface.tools.str-replace-editor` → 包在、出厂不挂
- `surface.presets.code` / `subsys.core.code-mode` → 稳定别名，继续讲 PTC；改 `ctx.ptcRuntime`
- `subsys.execution.code-runtime` / `subsys.execution.code-runtime-python` → **不退役**，改写到 ptc-runtime 路径

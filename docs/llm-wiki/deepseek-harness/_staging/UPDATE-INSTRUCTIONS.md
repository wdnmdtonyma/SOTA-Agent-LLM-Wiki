# UPDATE INSTRUCTIONS — DSH wiki d347e70390 → c291e7961a

> 给 filler / L2 verifier 用。事实以 `deepseek-harness/` checkout `c291e7961a` 为准，不以本文件或 update-facts 转述为准。写前必须打开被引用的源文件。

## 目标

- **base（上一轮 verified）**: `d347e703908d0406b7a7ef80e3a0e594d86b2215`（`0.1.3-alpha.1`）
- **target（官方 `origin/master`）**: `c291e7961a515f6d7af9304e7fd1d257929aef26`（`0.1.5-rc.2`；describe `dsh-v0.1.5-rc.2-139-gc291e7961a`）
- **短 SHA**: `c291e7961a`
- **跨度**: 1301 commits · 6327 files · +165004 / -36468
- **节点影响**: 11 A-BROKEN / 115 B-HEAVY / 76 C-DRIFT / 2 D-CLEAN
- **新增节点**: `surface.tools.present`、`surface.profiles.desktop`（lead 会登记 llms.txt / index）
- **不退役**: `surface.tools.report`、`subsys.persistence.sqlite` 继续当退役页；`surface.tools.str-replace-editor` **保留**，改成「包在、出厂不挂」

## 硬规则

1. 中文讲解，英文标识符。节点自包含。套 `docs/llm-wiki/deepseek-harness/conventions.md` 对应模板。
2. 每条 load-bearing 论断就近 `[E: relative/path:line]`，相对 `deepseek-harness/`。行号必须落在**被断言的代码行本身**，不是上方注释、空行、或 lone `}`。
3. frontmatter: `status: verified`、`updated: c291e7961a`、`evidence: explicit`（除非真是 inferred）。`status: verified` 只在你用 Read 抽检至少 3 条 `[E]` 之后。
4. 只写你被分配的 node `.md`，以及可选 `docs/llm-wiki/deepseek-harness/_staging/uncertainty-update-<id-last-segment>.md`。
5. **不要**改 `index.json`、`llms.txt`、`reference/uncertainty.md`、`README.md`、`conventions.md`、`RUN.md`、`tools/*`、其它节点、`deepseek-harness/` 源码。
6. `[E]` 不得指向 `docs/**`、`.agents/notes/**`、已删除包。
7. 产品版本现为 **0.1.5-rc.2**。Node `^22.19.0 || >=24.0.0`、pnpm `11.7.0` 未变。`packages/**/package.json` = **275**（含 7 个 `@fixture/*`）；产品叶 `packages/*/*` = **268**。
8. 写完后抽 3 条 `[E]` 用 Read 对一下行号。过宽结论宁可降 `[I]/[U]`。

### 按批次深度

- **rewrite**：重写 load-bearing 段与 source/symbols，页结构可留，保留仍成立的问句。
- **remap**：禁止从零重写。删缺失 source、改 `[E:]`、改过时一句；其余不动。
- **refresh**：对照当前 source 修假话、重落行号，不扩写。
- **create**：按 conventions 模板从零写新文件。父目录已存在。

## 路径重映射（frontmatter `source:` 与 `[E:]` 必须改到右边）

| 旧路径 | 新路径 / 处理 |
|---|---|
| `packages/core/agent/src/inbox.ts` | **`packages/core/agent-loop/src/inbox.ts`**（`ReactLoopInbox`） |
| `packages/feedback/message-feedback/src/spec.ts` | **已删除**。改读 `packages/feedback/message-feedback/src/{index,types}.ts` |
| `packages/client/ui-chat/src/client/details/DetailsPanel.tsx` | **已删除**。改读 `packages/client/ui-chat/src/client/chat/` 与 conversation-nodes；详情/预览落到右侧栏节点或 `ui-layout` |
| `native/landlock-run/package.json` | **包 json 已不在此**。native 工作区现为 `native/system`（`@deepseek-ai/node-addon-system-workspace`）。空壳 `native/landlock-run/` 只剩 `node_modules`，**不是源** |
| 已退役包（仍不存在） | `session-persistence-sqlite`、`tool-subagent-report`、`host/apiproxy`、`client/runtime`、`client/web-react`、`examples/agent-spine-demo`、`packages/code-runtime/code-runtime-python` |

找不到替换文件就从 `source:` 删掉该条。禁止把 `[E:]` 指到已删除路径或空壳 `node_modules`。

## 必须写进正文的架构事实（先读源再写，不要照抄本表当 [E]）

1. **`SESSION_FORMAT_VERSION = 3`**（`packages/core/session/src/types.ts`）。catalog `currentVersion: 3`，adjacent 链 **v0→v1→v2→v3**（新增 `session-format-v2-to-v3`）。比 3 新的盘仍拒。禁止再写「现为 2 / 链止于 v2 / 比 2 新拒绝」。
2. **system prompt 进 derived history**：独立 `system/message` 事件；`request/header` / `EpochHeader` **不再带 `system` 字符串**。v2→v3 迁移会插入 synthetic system messages，并把旧 preset id `code` 重写为 `ptc`。
3. **同步读 API 弃用**：`eventAt()` / `snapshotEvents()` / `ownEvents()` 禁止新增生产调用（session README）。wiki 叙述以当前源码合同为准，不要把废弃同步读写成推荐路径。
4. **session persistence 仍是 handle 缝**：`create`/`open` → `SessionHandle`；JSONL + write lease；**无 coordinator**；session 盘 shipped 只有 JSONL。
5. **base 默认模型** = `deepseek-official` / **`deepseek-flash`**（不是 `deepseek-v4-flash`）。catalog **两者并存**；**acp-app 仍硬编码 `deepseek-v4-flash`**。区分「base 新 Agent 默认」与「acp 专用默认」。
6. **persona 配置**：bundle `system-prompt` 用 `personaPrefix` / `personaSuffix`；preset `@deepseek-ai/dsh-persona` 用 `prefix` / `suffix`。不要再写旧键 `text` / 单字段 `persona`。
7. **`present` 是新的模型可见工具**（wire 名 `present`，包 `@deepseek-ai/dsh-tool-present`）。挂在 **standard / ptc / cordis**（不在 minimal）。成功后 append `deliverables/presented`。
8. **`str_replace_editor` 退出出厂路径**：base / web-app / 四个 preset yml **都不挂**。包仍在。minimal **只剩 persistent shell**（无 fs / 无 str_replace）。
9. **`tool-workflow` 在 ptc 仍 `disabled: true`**，engine 留给 `ralph`。
10. **五个 shipped CLI profile 未变**：`web` / `headless` / `sdk` / `sdk-minimal` / `acp`。**`desktop` 不是第六个 CLI profile**：Electron 壳独占 `$DSH_HOME/profiles/desktop`；`dsh --profile desktop` 被 `rejectElectronProfile` 拒绝。
11. **六个 shipped bundle 名字未变**。web-app 新增 open-in-app / resources / workspace-files / 右侧 sidebar 栈；**不要**为单个 ui-* 另建节点（fold 进 workbench / ui-layout / apiproxy）。
12. **message-feedback 进 Session log**：`feedback/message-put` / `feedback/message-delete`（另有 `feedback/record` 来自 command-feedback）。不再是 storage-domain sidecar。
13. **Inbox 实现在 agent-loop**：`packages/core/agent-loop/src/inbox.ts` 的 `ReactLoopInbox`。
14. **Python runtime** 仍是 `packages/experimental/code-runtime-python`（真正的 CodeRuntime Provider）。http-proxy / file-upload 路径未变。
15. 正文凡写 `SESSION_FORMAT_VERSION = 2`、默认模型全局 `deepseek-v4-flash`、minimal = persistent shell + str_replace_editor、inbox 在 `agent/src/inbox.ts`、header 仍带 system 字符串、feedback 只写 sidecar——全部改掉。

## 本轮新节点（2）

| 节点 | 路径 | 判定 |
|---|---|---|
| `surface.tools.present` | `surface/tools/present.md` | 新 wire 名；standard/ptc/cordis；`deliverables/presented` |
| `surface.profiles.desktop` | `surface/profiles/desktop.md` | Electron 无端口壳；**不是** `PROFILE_TEMPLATES` 成员 |

不要为 workspace-files / open-in-app / resources / ui-dockkit / ui-sidebar-* / package-manifest / chunked-list / remote-mock / session-format-v2-to-v3 另建节点。v2→v3 fold 进 `subsys.persistence.session-format`；Web 新行 fold 进 `surface.web.workbench`、`subsys.client.ui-layout`、`subsys.host.apiproxy`、`subsys.composition.bundle-web-app`。

## 不要退役的节点

- `surface.tools.report` / `subsys.persistence.sqlite` → 继续退役页
- `surface.tools.str-replace-editor` → 包在、出厂不挂
- `surface.presets.code` / `subsys.core.code-mode` → 稳定别名，继续讲 PTC
- `subsys.host.apiproxy` → 稳定别名，HTTP 仍是 controllers + gateway；可加 workspace-files 一节

# UPDATE SCOPE — Pi Wiki follow-up（c1019d9202 → 305c014dcc）

> 本文件记录 2026-08-03 的第三次 Pi-only follow-up。
> **旧父仓 gitlink / Wiki 基线**：`c1019d9202b648143d123b7e6fb76543a6b82de6`
> **最终点时快照 target**：`305c014dcccfe97ebd3f4057ac16c436f1e2c71e`
> **冻结时间**：2026-08-03 21:44:27 +0800；冻结时已确认 target 是官方 `origin/main`
> **跨度**：2 commits · 30 files changed · +92 / -141

本轮采用点时快照语义：提交紧前 fetch 只观测冻结后的 remote drift；即使 `origin/main` 已前进，也不再扩入本轮，root gitlink 与全部 Wiki SHA 仍固定为 `305c014dcc`。

复现：

```bash
git -C pi fetch origin main
git -C pi rev-list --count c1019d9202b648143d123b7e6fb76543a6b82de6..305c014dcccfe97ebd3f4057ac16c436f1e2c71e
git -C pi diff --shortstat c1019d9202b648143d123b7e6fb76543a6b82de6..305c014dcccfe97ebd3f4057ac16c436f1e2c71e
git -C pi diff --name-status c1019d9202b648143d123b7e6fb76543a6b82de6..305c014dcccfe97ebd3f4057ac16c436f1e2c71e
```

上游提交：

- `0e633790c5a007f6d4bf35ba67ced457287c25ac` — `fix(tui): handle batched color scheme reports (#7550)`
- `305c014dcccfe97ebd3f4057ac16c436f1e2c71e` — `fix: make session authentication transport-specific (#7551)`

## 1. 影响分类

真实 diff 没有 source 删除、移动或新增源码面。以基线 202 个节点为总体，按 source 求交并沿调用/API contract 扩展后：

| 分类 | 节点数 | 判定 |
|---|---:|---|
| A-BROKEN | 0 | 无删除、移动或失效 source |
| B-HEAVY | 0 | 无需新增节点或结构重写 |
| C-DRIFT | 7 | TUI 2；protocol/client/server transport-auth 5 |
| D-CLEAN | 195 | 含 6 个 source 直接命中但语义未变的节点，以及其它无依赖变化节点 |
| 合计 | 202 | 新增 0、退役 0 |

实际语义更新节点：

- `subsys.tui.terminal-colors`
- `subsys.tui.key-pipeline`
- `subsys.protocol.wire-protocol`
- `subsys.client.remote-session-client`
- `subsys.client.unix-transport`
- `subsys.server.session-server`
- `subsys.server.unix-transport`

`subsys.client.session-leases`、`subsys.server.live-sessions`、`subsys.server.ipc-transport`、`subsys.server.message-protocol`、`subsys.server.storage`、`ref.server.ipc-messages` 虽直接命中已修改 source/README/test，但本轮 diff 不改变其 domain 语义，只做 evidence/target SHA 复核。`subsys.protocol.cbor-framing` 等引用同文件的节点也只需精确 anchor 重定位。

## 2. TUI 增量语义（c1019d9202 → 0e633790c5）

- `COLOR_SCHEME_REPORT_PATTERN` 从单条 report 改为一个或多个首尾连续拼接的 `ESC [ ? 997 ; (1|2) n`；outer anchors 继续拒绝前后缀与非法中间 bytes。[E: packages/tui/src/terminal-colors.ts:29]
- repeated capture 保留 batch 末条 report：末条 `2` 映射 `light`，末条 `1` 映射 `dark`；新增 `2,1,1 → dark` 与 `1,2,2 → light` 测试。[E: packages/tui/src/terminal-colors.ts:67] [E: packages/tui/src/terminal-colors.ts:68] [E: packages/tui/src/terminal-colors.ts:72] [E: packages/tui/test/terminal-colors.test.ts:118] [E: packages/tui/test/terminal-colors.test.ts:119]
- 若某个 `Terminal` adapter 单次交付完整 batch，`TuiBase.handleTerminalInput()` 会在普通 listeners/focused dispatch 前折叠并消费它；默认 `ProcessTerminal` 则由 `StdinBuffer` 按完整 CSI sequence 逐条拆分，不能无条件声称 raw stdin batch 只回调一次。[E: packages/tui/src/tui.ts:792] [E: packages/tui/src/tui.ts:796] [E: packages/tui/src/tui.ts:800] [E: packages/tui/src/tui.ts:858] [E: packages/tui/src/tui.ts:892] [E: packages/tui/src/tui.ts:899] [E: packages/tui/src/stdin-buffer.ts:192] [E: packages/tui/src/stdin-buffer.ts:231] [E: packages/tui/src/terminal.ts:181] [E: packages/tui/src/terminal.ts:191]

## 3. Transport-specific auth 增量语义（0e633790c5 → 305c014dcc）

- protocol version 从 `2` 固定回 `1`；`ClientHello` 仅为 `{type, version}`，strict schema 明确拒绝 credential/token 字段。[E: packages/protocol/src/schemas.ts:3] [E: packages/protocol/src/schemas.ts:380] [E: packages/protocol/src/schemas.ts:381] [E: packages/protocol/src/schemas.ts:382] [E: packages/protocol/test/protocol.test.ts:55] [E: packages/protocol/test/protocol.test.ts:58] [E: packages/protocol/test/protocol.test.ts:73] [E: packages/protocol/test/protocol.test.ts:76]
- `ProtocolErrorCode` 删除 `auth`，只剩 `version | busy | session_locked | not_found | invalid_request`；带 `auth` 的 `hello_error` 也不再是 schema-valid message。[E: packages/protocol/src/schemas.ts:266] [E: packages/protocol/src/schemas.ts:267] [E: packages/protocol/src/schemas.ts:268] [E: packages/protocol/src/schemas.ts:269] [E: packages/protocol/src/schemas.ts:270] [E: packages/protocol/src/schemas.ts:271] [E: packages/protocol/test/protocol.test.ts:103] [E: packages/protocol/test/protocol.test.ts:110] [E: packages/protocol/test/protocol.test.ts:114]
- `PiClientOptions.token` 被删除且没有替代 credential field。`ByteTransportFactory` 必须在 resolve 前建立并认证 transport，client 随后只发 version hello；factory failure 归一成 `PiDisconnectedError`，schema-valid `hello_error` 才成为 `PiServerError`。[E: packages/client/src/types.ts:14] [E: packages/client/src/types.ts:15] [E: packages/client/src/types.ts:18] [E: packages/client/README.md:26] [E: packages/client/src/connection.ts:122] [E: packages/client/src/connection.ts:124] [E: packages/client/src/connection.ts:135] [E: packages/client/src/errors.ts:53] [E: packages/client/src/errors.ts:55]
- `PiServerOptions.token`、digest/constant-time compare 与 core authenticate branch 被删除。listener contract 要求把已授权 connection 交给 core，`finishHandshake()` 只校验 protocol version；这是实现者责任，public `accept()` 不会 runtime attestation。[E: packages/server/src/types.ts:14] [E: packages/server/src/types.ts:15] [E: packages/server/README.md:42] [E: packages/server/src/server.ts:107] [E: packages/server/src/server.ts:125] [E: packages/server/src/server.ts:216] [E: packages/server/src/server.ts:217]
- built-in Unix client/server options 都没有 credential；server listener 不检查 peer credentials，依赖 socket path permissions（默认 `0o600`，parent mkdir 请求 `0o700`）作为 access-control boundary。[E: packages/client/src/unix.ts:7] [E: packages/client/src/unix.ts:9] [E: packages/server/src/transports/unix/listener.ts:11] [E: packages/server/src/transports/unix/listener.ts:67] [E: packages/server/src/transports/unix/listener.ts:92] [E: packages/server/src/transports/unix/listener.ts:108] [E: packages/server/src/transports/unix/listener.ts:124]
- testing API 也 breaking：删除 `TEST_TOKEN`，`ProtocolTestClient.hello()` 改为只接 optional version，test server 不再注入 default token。[E: packages/server/src/testing/index.ts:1] [E: packages/server/src/testing/client.ts:43] [E: packages/server/src/testing/client.ts:45] [E: packages/server/src/testing/server.ts:15] [E: packages/server/src/testing/server.ts:18]
- 兼容性是 lockstep：旧 v2+token client 会被新 strict schema 拒绝；new v1/tokenless client 也不满足旧 server。protocol 本身仍是 experimental 且无兼容保证。[E: packages/protocol/README.md:67][I]

## 4. 节点、catalog 与 evidence 收口

- 202 个节点 frontmatter、`index.json.updated`、所有 index node `updated` 与 `llms.txt` 状态统一为 `305c014dcc`；planned 仍为 0。
- provider 39、models 1,169、wire 10、config 76、slash 22、keybindings 79、extension events 33、RPC 32、CLI 62、env 94、interactive components 40、TUI components 15，均无 membership 变化。
- 对 0e633→305c 的 evidence rebase 先安全写入 278 个 exact anchor；14 个 contextual candidate 均按新语义手工重落，不自动接受低置信映射。
- README 当前状态与 root `pi` gitlink 同步到冻结 target；无新增或退役 Wiki 节点。

## 5. 独立 L2 证伪

- TUI verifier 首轮 FAIL 反证了“默认管道整批一次消费”并发现旧方法名/cell-size 顺序；修正后同 verifier PASS。记录：`_research/update-c1019d9202-0e633790c5-l2.md`。
- protocol、client、server 三个只读 verifier 独立检查 transport-auth commit；首轮均 FAIL，集中反证旧 hello token、`auth` code、server SHA-256 auth 与 Unix “会认证 peer”等描述。修订后由同三位 verifier 分别复核为 PASS。记录：`_research/update-0e633790c5-305c014dcc-l2.md`。

## 6. 验证、冻结后漂移与残余风险

收尾命令：

```bash
node docs/llm-wiki/pi/tools/reconcile.mjs
node docs/llm-wiki/pi/tools/lint.mjs
node docs/llm-wiki/pi/tools/reconcile.mjs
node docs/llm-wiki/pi/tools/lint.mjs
git diff --check -- docs/llm-wiki/pi pi
git -C pi fetch origin main
```

最终断言：

- 202 个节点全部 verified，0 planned，T0/T1/T2/T3 为 12/34/121/35；
- index/file tree/`llms.txt` 是同一 202-node 集，target SHA 全为 `305c014dcc`；
- 所有 `[E:path:line]` 路径与代码行有效，两次 lint 均为 0 error / 0 warning；
- catalog counts 与冻结前一致；root gitlink 和 clean submodule HEAD 都是冻结 target；
- staged/commit scope 只能是 `docs/llm-wiki/pi/**` 与 `pi`。

提交紧前于 2026-08-03 21:53:40 +0800 再次 fetch：`origin/main` 仍为 `305c014dcccfe97ebd3f4057ac16c436f1e2c71e`，与冻结 target 和 submodule HEAD 一致；本轮未观测到 post-freeze drift。

残余风险：Pi checkout 没有安装依赖，本轮不宣称 upstream TUI/protocol/client/server runtime tests pass；验证以冻结 target 源码、对应测试实现、独立 L2、Wiki reconcile/lint 与一致性审计为准。transport authentication 是 custom factory/listener 的 contract，core 无法证明实现者确实执行认证。

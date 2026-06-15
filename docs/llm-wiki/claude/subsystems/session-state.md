---
id: subsys.session-state
path: subsystems/session-state.md
title: 会话持久化与状态
kind: subsystem
tier: T2
status: verified
source: [state/, utils/sessionStorage.ts, history.ts]
symbols: [createStore, AppState, getDefaultAppState, recordTranscript, loadTranscriptFromFile, loadTranscriptFile, addToPromptHistory, getHistory]
related: [subsys.memory]
updated: 2026-06-14
evidence: explicit
---

Session state 分成三层: React-facing `AppState` store 管 UI 和运行时状态, `sessionStorage` 用 JSONL transcript 保存会话消息链和 metadata, `history.ts` 维护 prompt history。[E: state/store.ts:10][E: state/AppStateStore.ts:89][E: utils/sessionStorage.ts:1408][E: history.ts:190]

## 能回答的问题

- UI 状态和 transcript 持久化分别在哪里维护?
- transcript 如何按 session、agent 和 project 生成路径?
- 写 transcript 时如何排队、flush、恢复和加载链?
- prompt history 如何记录普通输入和 pasted file references?

## 职责边界

`state/` 是进程内状态, 不负责把消息写到磁盘; `utils/sessionStorage.ts` 是 transcript、metadata、file history、context collapse 等持久化入口; `history.ts` 是用户 prompt 输入历史, 不是 assistant transcript。[E: state/AppState.tsx:142][E: utils/sessionStorage.ts:1408][E: history.ts:355] Memory 子系统可能从 transcript 中提取摘要, 但 transcript 本身仍由 session storage 记录和加载。[E: services/SessionMemory/sessionMemory.ts:272][E: utils/sessionStorage.ts:2294][I]

## 关键文件

- `state/store.ts`: 最小化 store 实现, 提供 `getState/setState/subscribe`。[E: state/store.ts:4][E: state/store.ts:10]
- `state/AppState.tsx`: React provider、`useAppState`、`useSetAppState` 和 store context。[E: state/AppState.tsx:50][E: state/AppState.tsx:142][E: state/AppState.tsx:170]
- `state/AppStateStore.ts`: `AppState` 大结构和默认值, 覆盖设置、模型、bridge、tasks、plugins、MCP、todos、hooks、team context 等运行时字段。[E: state/AppStateStore.ts:89][E: state/AppStateStore.ts:118][E: state/AppStateStore.ts:160][E: state/AppStateStore.ts:173][E: state/AppStateStore.ts:217][E: state/AppStateStore.ts:323]
- `utils/sessionStorage.ts`: transcript 路径、metadata、写队列、record/load/relink/remove/context-collapse 等持久化逻辑。[E: utils/sessionStorage.ts:198][E: utils/sessionStorage.ts:606][E: utils/sessionStorage.ts:1408][E: utils/sessionStorage.ts:2294]
- `history.ts`: prompt history 的读取、写入、flush、删除最后一条和 pasted file reference 展开。[E: history.ts:47][E: history.ts:190][E: history.ts:355][E: history.ts:453]

## 数据模型 / 状态

`createStore` 保存当前 state 和 listener 集合, `setState` 用 `Object.is` 跳过无变化更新, 否则替换 state 并通知所有 listener。[E: state/store.ts:11][E: state/store.ts:23][E: state/store.ts:24] `useAppState` 通过 `useSyncExternalStore` 订阅 selector 结果, 因此 React 组件看到的是 store snapshot, 不是直接引用全局变量。[E: state/AppState.tsx:142][E: state/AppState.tsx:153]

`AppState` 包含 settings/mainLoopModel/status/UI、bridge/remote 状态、任务 map、agent name registry、MCP/plugin 状态、agent definitions、file history、todos、notifications、elicitation 和 session hooks 等字段。[E: state/AppStateStore.ts:89][E: state/AppStateStore.ts:118][E: state/AppStateStore.ts:160][E: state/AppStateStore.ts:163][E: state/AppStateStore.ts:173][E: state/AppStateStore.ts:217][E: state/AppStateStore.ts:231] `getDefaultAppState` 还会在 teammate plan mode 下把初始 permission mode 改成 plan, 然后返回默认状态对象。[E: state/AppStateStore.ts:456][E: state/AppStateStore.ts:468]

Transcript 只把 user、assistant、attachment、system 识别为 transcript message; progress message 不属于 transcript message 类型。[E: utils/sessionStorage.ts:139] session transcript 路径由 project directory、session ID 和 agent ID 组合; agent transcript 额外在主 session 下挂 agent transcript path。[E: utils/sessionStorage.ts:202][E: utils/sessionStorage.ts:207][E: utils/sessionStorage.ts:247]

## 控制流

写 transcript 时, `recordTranscript` 先清理已记录消息、维护 chain parent, 然后把新消息交给 `getProject().insertMessageChain`; sidechain 入口同样委托该 project API, 只是把 `isSidechain` 设为 true 并可携带 agent ID。[E: utils/sessionStorage.ts:1408][E: utils/sessionStorage.ts:1414][E: utils/sessionStorage.ts:1432][E: utils/sessionStorage.ts:1433][E: utils/sessionStorage.ts:1451][E: utils/sessionStorage.ts:1456][E: utils/sessionStorage.ts:1458][E: utils/sessionStorage.ts:1459] `sessionStorage` 内部仍有 `enqueueWrite`/`drainWriteQueue` 的 JSONL append queue helper, 它按 path 分组批量 append 并在写入后 resolve 对应 entry。[E: utils/sessionStorage.ts:606][E: utils/sessionStorage.ts:618][E: utils/sessionStorage.ts:645][E: utils/sessionStorage.ts:650][E: utils/sessionStorage.ts:660][E: utils/sessionStorage.ts:672]

加载会话时, `loadTranscriptFromFile` 调用 `loadTranscriptFile`, 校验消息、leaf uuid 和 chain, 再返回包含 log、summaries、leafUuid、sessionId、fileHistory、contextCollapse、worktree 等信息的结果。[E: utils/sessionStorage.ts:2294][E: utils/sessionStorage.ts:2305][E: utils/sessionStorage.ts:2329] `loadTranscriptFile` 会初始化消息和 metadata maps, 对大 transcript 走预读取/预压缩路径, 然后解析 JSONL entry、处理 compact boundary、metadata、file history、content replacement、context collapse 和 relink/remove 操作。[E: utils/sessionStorage.ts:3472][E: utils/sessionStorage.ts:3496][E: utils/sessionStorage.ts:3520][E: utils/sessionStorage.ts:3614][E: utils/sessionStorage.ts:3642][E: utils/sessionStorage.ts:3658][E: utils/sessionStorage.ts:3704]

Prompt history 先读取 JSONL history, 用 `makeLogEntryReader` 过滤合法 entry 并生成 timestamped history; `addToPromptHistory` 会展开 pasted file references, 再调用 `addToHistory` 写入 pending history buffer。[E: history.ts:106][E: history.ts:162][E: history.ts:190][E: history.ts:355][E: history.ts:411] `immediateFlushHistory` 会把 pending entries 写入历史文件并清空 pending buffer。[E: history.ts:292]

## 设计动机与权衡

- `AppState` 的 store 很薄, 复杂度集中在 state shape 和各业务模块的更新逻辑; 这让 React hooks 能统一订阅, 但也意味着 `AppStateStore.ts` 是跨子系统共享的大对象。[E: state/store.ts:10][E: state/AppStateStore.ts:89][I]
- Transcript 写入路径把消息链交给 project storage, 同时保留批量 append queue helper 处理 JSONL entry; 崩溃前仍要依赖 `flushSessionStorage` 把 project storage 的 pending writes 清空。[E: utils/sessionStorage.ts:1433][E: utils/sessionStorage.ts:606][E: utils/sessionStorage.ts:645][E: utils/sessionStorage.ts:1583][I]
- Loader 对 transcript 做 metadata 预处理、compact boundary 和 relink/remove, 说明 transcript 是可演化日志, 不是简单的 messages 数组 dump。[E: utils/sessionStorage.ts:3585][E: utils/sessionStorage.ts:3642][E: utils/sessionStorage.ts:3704][I]

## Gotchas

- `AppStateProvider` 禁止嵌套 provider; 如果测试或 storybook 包了两层 provider, 会直接抛错。[E: state/AppState.tsx:44]
- `recordSidechainTranscript` 使用 sidechain 标记写入 transcript, 所以不要把 sidechain message 当成主 conversation chain 的普通 user/assistant 消息处理。[E: utils/sessionStorage.ts:1451]
- `removeLastFromHistory` 只改 prompt history, 不会撤销 transcript 中已经记录的消息。[E: history.ts:453][E: utils/sessionStorage.ts:1472][I]

## Sources

- `state/`
- `utils/sessionStorage.ts`
- `history.ts`

## 相关

- `subsys.memory`

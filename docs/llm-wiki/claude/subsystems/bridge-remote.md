---
id: subsys.bridge-remote
path: subsystems/bridge-remote.md
title: IDE bridge / remote / CCR
kind: subsystem
tier: T2
status: verified
source: [bridge/, remote/, upstreamproxy/, server/]
symbols: [BridgeConfig, WorkResponse, WorkSecret, BridgeApiClient, runBridgeLoop, createSessionSpawner, initBridgeCore, ReplBridgeTransport, createV2ReplTransport, RemoteSessionManager, SessionsWebSocket, DirectConnectSessionManager, initUpstreamProxy]
related: []
updated: 2026-06-14
evidence: explicit
---

Bridge/Remote/CCR 子系统把本地 CLI 会话暴露给 web/app/remote clients: standalone bridge 注册 environment 并轮询 work, REPL bridge 把当前交互会话接到 session ingress 或 CCR v2, remote/direct-connect 管理观看和控制通道, upstreamproxy 在 CCR 容器内代理 HTTPS 出站流量。[E: bridge/types.ts:81][E: bridge/bridgeMain.ts:141][E: bridge/replBridge.ts:260][E: remote/RemoteSessionManager.ts:95][E: server/directConnectManager.ts:40][E: upstreamproxy/upstreamproxy.ts:79]

## 能回答的问题

- Remote Control environment、work item、session token、worker epoch 分别是什么?
- standalone bridge 和 REPL bridge 的控制流差异在哪里?
- v1 Session-Ingress WebSocket 与 CCR v2 SSE/CCRClient 如何切换?
- permission request、interrupt、direct connect 和 upstream proxy 如何穿过这些通道?

## 职责边界

`bridge/` 负责 environment registration、session spawn、REPL bridge transport 和 work secret/CCR URL; `remote/` 负责订阅远端 session 并处理 control messages; `server/` 是 direct connect 的本地/自托管 server client; `upstreamproxy/` 只在 CCR remote 环境里把 HTTPS CONNECT tunnel 转成带会话鉴权的 WebSocket relay。[E: bridge/bridgeApi.ts:142][E: bridge/sessionRunner.ts:248][E: bridge/replBridgeTransport.ts:119][E: remote/SessionsWebSocket.ts:100][E: server/createDirectConnectSession.ts:26][E: upstreamproxy/relay.ts:155]

## 关键文件

- `bridge/types.ts`: 定义 work、work secret、spawn mode、bridge config、API client 和 session handle 契约。[E: bridge/types.ts:18][E: bridge/types.ts:33][E: bridge/types.ts:69][E: bridge/types.ts:81][E: bridge/types.ts:133][E: bridge/types.ts:178]
- `bridge/bridgeApi.ts`: 封装 Environments API、work poll/ack/stop/heartbeat、session archive/reconnect 和 permission event POST。[E: bridge/bridgeApi.ts:68][E: bridge/bridgeApi.ts:142][E: bridge/bridgeApi.ts:199][E: bridge/bridgeApi.ts:249][E: bridge/bridgeApi.ts:387][E: bridge/bridgeApi.ts:419]
- `bridge/bridgeMain.ts`: standalone `claude remote-control` 的 trust/auth/spawn-mode 校验、environment 注册、poll loop、worktree/session spawn 和 resume。[E: bridge/bridgeMain.ts:1980][E: bridge/bridgeMain.ts:2086][E: bridge/bridgeMain.ts:2179][E: bridge/bridgeMain.ts:2290][E: bridge/bridgeMain.ts:2451]
- `bridge/sessionRunner.ts`: 以 `--print --sdk-url --session-id --input-format stream-json --output-format stream-json` 子进程方式运行 session worker。[E: bridge/sessionRunner.ts:287][E: bridge/sessionRunner.ts:306][E: bridge/sessionRunner.ts:335]
- `bridge/replBridge.ts` 与 `bridge/replBridgeTransport.ts`: 当前 REPL 的 bridge core、pointer/reconnect、v1/v2 transport adapter 和 CCR v2 worker transport。[E: bridge/replBridge.ts:319][E: bridge/replBridge.ts:484][E: bridge/replBridge.ts:537][E: bridge/replBridgeTransport.ts:78][E: bridge/replBridgeTransport.ts:119]
- `remote/RemoteSessionManager.ts`、`remote/SessionsWebSocket.ts`: OAuth WebSocket subscribe、SDK/control message 分发、permission response、interrupt 和 reconnect。[E: remote/RemoteSessionManager.ts:108][E: remote/SessionsWebSocket.ts:108][E: remote/RemoteSessionManager.ts:154][E: remote/RemoteSessionManager.ts:247]
- `server/createDirectConnectSession.ts` 与 `server/directConnectManager.ts`: direct connect session 创建和 WebSocket 消息/权限/interrupt 管理。[E: server/createDirectConnectSession.ts:49][E: server/directConnectManager.ts:50][E: server/directConnectManager.ts:82]
- `upstreamproxy/upstreamproxy.ts` 与 `upstreamproxy/relay.ts`: CCR 中的 HTTPS proxy env、CA bundle、CONNECT relay 和 WebSocket tunnel。[E: upstreamproxy/upstreamproxy.ts:85][E: upstreamproxy/upstreamproxy.ts:125][E: upstreamproxy/relay.ts:295][E: upstreamproxy/relay.ts:344]

## 数据模型 / 状态

`WorkResponse` 是 environment poll 返回的 work item, 包含 environment id、state、data、secret 和 created_at; data type 只有 `session` 或 `healthcheck`。[E: bridge/types.ts:18][E: bridge/types.ts:23] `WorkSecret` 是 base64url JSON, 至少含 session ingress token、API base URL、sources、auth、可选 args/MCP/env 和 `use_code_sessions` v2 selector。[E: bridge/types.ts:33][E: bridge/workSecret.ts:6][E: bridge/workSecret.ts:21][E: bridge/workSecret.ts:28] `BridgeConfig` 保存 dir、machine、branch、git remote、max sessions、spawn mode、sandbox、bridgeId、workerType、environmentId、API/session ingress URL 和 session timeout。[E: bridge/types.ts:81]

Standalone loop 用 `activeSessions`、`sessionWorkIds`、`sessionIngressTokens`、`sessionTimers`、`completedWorkIds` 和 `sessionWorktrees` 等 map/set 管理运行中 sessions、租约和 worktree cleanup。[E: bridge/bridgeMain.ts:163][E: bridge/bridgeMain.ts:165][E: bridge/bridgeMain.ts:173][E: bridge/bridgeMain.ts:174][E: bridge/bridgeMain.ts:175][E: bridge/bridgeMain.ts:176] `SessionHandle` 把 child session 的 done promise、kill/forceKill、activities、current activity、access token、stderr ring buffer 和 stdin 写入暴露给 bridge loop。[E: bridge/types.ts:178]

REPL bridge transport 接口统一了 write/writeBatch/close/connect/status、sequence number、state/metadata/delivery report 和 flush; v1 adapter 包 HybridTransport, v2 adapter 包 SSETransport + CCRClient。[E: bridge/replBridgeTransport.ts:23][E: bridge/replBridgeTransport.ts:78][E: bridge/replBridgeTransport.ts:119][E: bridge/replBridgeTransport.ts:202]

## 控制流

Standalone bridge 启动时先设置 cwd state, 要求 workspace trust 已接受, 要求 bridge OAuth token, 生产非 localhost HTTP base URL 会被拒绝。[E: bridge/bridgeMain.ts:2080][E: bridge/bridgeMain.ts:2086][E: bridge/bridgeMain.ts:2102][E: bridge/bridgeMain.ts:2182] spawn mode 的优先级是 resume、显式 flag、项目保存值、gate default; single-session 最大 session 数是 1, 其它模式使用解析 capacity 或默认值。[E: bridge/bridgeMain.ts:2290][E: bridge/bridgeMain.ts:2293][E: bridge/bridgeMain.ts:2296][E: bridge/bridgeMain.ts:2300][E: bridge/bridgeMain.ts:2303] worktree mode 必须有 git root 或 WorktreeCreate hooks。[E: bridge/bridgeMain.ts:2212][E: bridge/bridgeMain.ts:2331]

注册 environment 时, API POST `/v1/environments/bridge`, 发送 machine、directory、branch、git repo、max sessions、worker type metadata 和可选 reuse environment id。[E: bridge/bridgeApi.ts:142][E: bridge/bridgeApi.ts:155][E: bridge/bridgeApi.ts:157][E: bridge/bridgeApi.ts:165][E: bridge/bridgeApi.ts:169][E: bridge/bridgeApi.ts:175] poll loop 调用 `pollForWork`, 无 work 时按容量和 heartbeat 配置 sleep; 有 work 时先 decode secret, 再在确定能处理之后 ack。[E: bridge/bridgeMain.ts:607][E: bridge/bridgeMain.ts:637][E: bridge/bridgeMain.ts:790][E: bridge/bridgeMain.ts:837][E: bridge/bridgeMain.ts:898]

Session work 会先检查是否已在运行, 已运行则只更新 access token 和 work id; at capacity 时不 spawn; 新 session 会根据 work secret 选择 CCR v2 或 v1 URL。[E: bridge/bridgeMain.ts:873][E: bridge/bridgeMain.ts:875][E: bridge/bridgeMain.ts:891][E: bridge/bridgeMain.ts:915][E: bridge/bridgeMain.ts:918][E: bridge/bridgeMain.ts:960] CCR v2 会调用 `registerWorker` 得到 worker epoch, v1 用 `buildSdkUrl` 生成 session ingress WS URL。[E: bridge/bridgeMain.ts:923][E: bridge/workSecret.ts:41][E: bridge/workSecret.ts:81][E: bridge/workSecret.ts:97]

Worktree spawn mode 对非初始 session 创建隔离 worktree, 然后 `safeSpawn` 调用 `SessionSpawner.spawn`, 成功后记录 session maps、logger、timeout 和 token refresh。[E: bridge/bridgeMain.ts:977][E: bridge/bridgeMain.ts:983][E: bridge/bridgeMain.ts:1026][E: bridge/bridgeMain.ts:1114][E: bridge/bridgeMain.ts:1180][E: bridge/bridgeMain.ts:1201] `createSessionSpawner` 生成 child args, 移除父进程 OAuth token, 设置 bridge environment kind、session access token 和可选 CCR v2 env, 再 spawn 子进程并解析 stdout NDJSON 中的 activity、permission request 和首个 user message。[E: bridge/sessionRunner.ts:287][E: bridge/sessionRunner.ts:306][E: bridge/sessionRunner.ts:313][E: bridge/sessionRunner.ts:319][E: bridge/sessionRunner.ts:335][E: bridge/sessionRunner.ts:387][E: bridge/sessionRunner.ts:417]

REPL bridge core 同样注册 environment, 然后尽量用 pointer 做 reconnect-in-place; 如果不能复用, 就创建新 session 并写 crash-recovery pointer。[E: bridge/replBridge.ts:319][E: bridge/replBridge.ts:352][E: bridge/replBridge.ts:381][E: bridge/replBridge.ts:425][E: bridge/replBridge.ts:457][E: bridge/replBridge.ts:484] 它随后开启 poll loop, 根据 work secret 在 v1 HybridTransport 和 v2 SSETransport+CCRClient 之间选择 transport, 并用 sequence number 防止 v2 重连时重放整个 session history。[E: bridge/replBridge.ts:537][E: bridge/replBridge.ts:543][E: bridge/replBridge.ts:562][E: bridge/replBridgeTransport.ts:183][E: bridge/replBridgeTransport.ts:193]

Remote viewer path 中, `RemoteSessionManager` 创建 `SessionsWebSocket`, 对 `control_request`、`control_cancel_request`、`control_response` 和 SDK message 分流; permission request 只支持 `can_use_tool`, response 会回写 `control_response`。[E: remote/RemoteSessionManager.ts:133][E: remote/RemoteSessionManager.ts:154][E: remote/RemoteSessionManager.ts:160][E: remote/RemoteSessionManager.ts:175][E: remote/RemoteSessionManager.ts:181][E: remote/RemoteSessionManager.ts:192][E: remote/RemoteSessionManager.ts:263] `SessionsWebSocket` 用 OAuth header 连接 `/v1/sessions/ws/{sessionId}/subscribe`, 4001 有有限重试, permanent close code 不重连。[E: remote/SessionsWebSocket.ts:108][E: remote/SessionsWebSocket.ts:114][E: remote/SessionsWebSocket.ts:247][E: remote/SessionsWebSocket.ts:258][E: remote/SessionsWebSocket.ts:275]

Direct connect 先 POST server `/sessions` 创建 session, 返回 session id、ws URL 和工作目录; manager 连接 ws 后按 NDJSON 行解析 stdout message, 处理 `control_request.can_use_tool`, 过滤 control/keepalive/streamlined/post_turn_summary, 并用 SDK user/control formats 发送消息、权限响应和 interrupt。[E: server/createDirectConnectSession.ts:49][E: server/createDirectConnectSession.ts:71][E: server/directConnectManager.ts:50][E: server/directConnectManager.ts:64][E: server/directConnectManager.ts:82][E: server/directConnectManager.ts:103][E: server/directConnectManager.ts:125][E: server/directConnectManager.ts:144][E: server/directConnectManager.ts:172]

Upstream proxy 只在 `CLAUDE_CODE_REMOTE` 和 `CCR_UPSTREAM_PROXY_ENABLED` 都 truthy 时启用, 需要 remote session id 和 token file; 它下载 CCR CA bundle、启动本地 relay、unlink token file, 再通过 `getUpstreamProxyEnv` 给 subprocess 暴露 HTTPS proxy 和 CA env。[E: upstreamproxy/upstreamproxy.ts:85][E: upstreamproxy/upstreamproxy.ts:92][E: upstreamproxy/upstreamproxy.ts:96][E: upstreamproxy/upstreamproxy.ts:105][E: upstreamproxy/upstreamproxy.ts:125][E: upstreamproxy/upstreamproxy.ts:133][E: upstreamproxy/upstreamproxy.ts:140][E: upstreamproxy/upstreamproxy.ts:185] Relay 只接受 CONNECT, 把 CONNECT line 和 Proxy-Authorization 编码进 WebSocket chunk, 之后按 512KB chunk 双向转发。[E: upstreamproxy/relay.ts:319][E: upstreamproxy/relay.ts:356][E: upstreamproxy/relay.ts:378][E: upstreamproxy/relay.ts:436]

## 设计动机与权衡

- Standalone bridge 把 environment/work/session 分层: environment 表示可接活的本机 worker, work item 表示待处理 session, child session 才是真正跑模型循环的 CLI 进程。[E: bridge/types.ts:81][E: bridge/types.ts:18][E: bridge/sessionRunner.ts:335][I]
- CCR v2 用 worker epoch 和 SSE sequence number 解决多 worker/reconnect 的一致性问题; v1 保留 Session-Ingress WebSocket 兼容路径。[E: bridge/workSecret.ts:97][E: bridge/replBridgeTransport.ts:183][E: bridge/replBridgeTransport.ts:193][E: bridge/replBridgeTransport.ts:249][E: bridge/replBridgeTransport.ts:78][I]
- Upstream proxy 把出站 HTTPS 鉴权放在本地 CONNECT relay 和远端 WebSocket tunnel 中, 让容器里的子进程可以用标准 HTTPS_PROXY/CA env, 但只有 HTTPS 被代理。[E: upstreamproxy/upstreamproxy.ts:185][E: upstreamproxy/upstreamproxy.ts:189][E: upstreamproxy/relay.ts:319][I]

## Gotchas

- Standalone bridge 绕过普通 `main.tsx` setup screens, 所以必须已有 workspace trust; 没有 trust 会要求先在目录里运行普通 `claude`。[E: bridge/bridgeMain.ts:2086][E: bridge/bridgeMain.ts:2086]
- Work ack 发生在确认要处理 session 之后, at-capacity 分支不会 ack; 否则会丢 work。[E: bridge/bridgeMain.ts:837][E: bridge/bridgeMain.ts:891][E: bridge/bridgeMain.ts:898]
- v2 transport 的 write readiness 与 SSE read readiness 不同, `isConnectedStatus` 看的是 CCR client initialized, 不是 SSE 已连接。[E: bridge/replBridgeTransport.ts:270][E: bridge/replBridgeTransport.ts:289]
- Direct connect 的 WebSocket message 可能包含多行 NDJSON; manager 会 split newline 后逐行 parse。[E: server/directConnectManager.ts:64][E: server/directConnectManager.ts:68]

## Sources

- `bridge/`
- `remote/`
- `upstreamproxy/`
- `server/`

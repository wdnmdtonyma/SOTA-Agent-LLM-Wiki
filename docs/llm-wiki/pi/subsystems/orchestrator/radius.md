---
id: subsys.orchestrator.radius
title: Radius 云端集成
kind: subsystem
tier: T2
pkg: orchestrator
source:
  - packages/orchestrator/src/radius.ts
  - packages/orchestrator/src/serve.ts
  - packages/orchestrator/src/supervisor.ts
  - packages/orchestrator/src/types.ts
  - packages/orchestrator/package.json
symbols:
  - radiusPresence
  - isRadiusEnabled
related:
  - subsys.orchestrator.supervisor
evidence: explicit
status: verified
updated: 8c943640
---

> Radius 云端集成是 `pi-orchestrator` 的 experimental presence layer: 本地 orchestrator 在凭据存在时向 Radius 注册 machine 和 Pi instance, 并用 heartbeat 维持云端可见性。

## 能回答的问题

- `isRadiusEnabled` 到底看哪些 credential 或 env var?
- Radius 默认 endpoint、覆盖 endpoint、access token 从哪里来?
- machine presence 和 Pi presence 的 HTTP payload 分别包含哪些字段?
- Radius heartbeat 如何处理 404、瞬时失败和重新注册?
- supervisor 与 `radiusPresence` 的边界在哪里?
- Radius 云端实际如何展示、路由或 relay Pi instance?

## 职责边界

`RadiusPresence` 的本地可见职责集中在 Radius presence: 注册 machine、注册 Pi instance、断开连接、定时 heartbeat、404 后重新注册；本地 IPC server 与 live RPC child lifecycle 分别出现在 `serve()`/`OrchestratorSupervisor` 路径中。[E: packages/orchestrator/src/radius.ts:148][E: packages/orchestrator/src/radius.ts:161][E: packages/orchestrator/src/radius.ts:194][E: packages/orchestrator/src/radius.ts:308][E: packages/orchestrator/src/radius.ts:354][E: packages/orchestrator/src/radius.ts:407][E: packages/orchestrator/src/serve.ts:12][E: packages/orchestrator/src/supervisor.ts:63][I]

Radius 集成是可选的 env/credential gated path: `serve()` 启动时先恢复 supervisor 状态，再用 `isRadiusEnabled()` 决定是否调用 `radiusPresence.start()`；未启用时只打印登录 `~/.pi/agent/auth.json` 或设置 `PI_RADIUS_API_KEY` 的提示。[E: packages/orchestrator/src/serve.ts:19][E: packages/orchestrator/src/serve.ts:20][E: packages/orchestrator/src/serve.ts:21][E: packages/orchestrator/src/serve.ts:27]

稳定性应标为 experimental: orchestrator 包的 package description 明确写着 `experimental orchestrator package for pi`。[E: packages/orchestrator/package.json:4] Radius 云端服务本身的状态模型、可见 UI、调度策略、relay 语义和鉴权刷新策略没有在本节点源码中实现或描述，本文只把这些行为标为 [U]。

## 关键文件

- `packages/orchestrator/src/radius.ts`: Radius HTTP client、credential gating、machine/Pi registration、heartbeat、re-registration、singleton `radiusPresence`。[E: packages/orchestrator/src/radius.ts:46][E: packages/orchestrator/src/radius.ts:63][E: packages/orchestrator/src/radius.ts:145][E: packages/orchestrator/src/radius.ts:202][E: packages/orchestrator/src/radius.ts:239][E: packages/orchestrator/src/radius.ts:314][E: packages/orchestrator/src/radius.ts:365][E: packages/orchestrator/src/radius.ts:407][E: packages/orchestrator/src/radius.ts:421][E: packages/orchestrator/src/radius.ts:445]
- `packages/orchestrator/src/serve.ts`: orchestrator server 启动/关闭时对 Radius presence 的装配与清理。[E: packages/orchestrator/src/serve.ts:21][E: packages/orchestrator/src/serve.ts:49]
- `packages/orchestrator/src/supervisor.ts`: live instance lifecycle 与 Radius Pi register/disconnect 的调用点, 以及传给 `RadiusPresence` 的 coordinator adapter。[E: packages/orchestrator/src/supervisor.ts:127][E: packages/orchestrator/src/supervisor.ts:161][E: packages/orchestrator/src/supervisor.ts:252][E: packages/orchestrator/src/supervisor.ts:291][E: packages/orchestrator/src/supervisor.ts:344]
- `packages/orchestrator/src/types.ts`: persisted `MachineRecord`、`InstanceRecord.radiusPiId` 和 Radius 返回的 `heartbeatIntervalMs`/`expiresInMs` shape。[E: packages/orchestrator/src/types.ts:3][E: packages/orchestrator/src/types.ts:10][E: packages/orchestrator/src/types.ts:11][E: packages/orchestrator/src/types.ts:12][E: packages/orchestrator/src/types.ts:24]

## 数据模型

`RadiusRegistration` 是本地代码可见的 Radius registration response 公共部分, 字段是 `heartbeatIntervalMs` 和 `expiresInMs`; `RegisterMachineResponse` 与 `RegisterPiResponse` 在 `radius.ts` 内部扩展出 `id` 字段, 这个 `id` 被分别保存为 machine id 或 instance 的 `radiusPiId`。[E: packages/orchestrator/src/types.ts:10][E: packages/orchestrator/src/types.ts:11][E: packages/orchestrator/src/types.ts:12][E: packages/orchestrator/src/radius.ts:14][E: packages/orchestrator/src/radius.ts:15][E: packages/orchestrator/src/radius.ts:18][E: packages/orchestrator/src/radius.ts:19][E: packages/orchestrator/src/radius.ts:251][E: packages/orchestrator/src/radius.ts:212]

`MachineRecord` 字段是 `id`、`createdAt`、可选 `lastSeenAt` 与 `label`; 对照 machine registration/heartbeat payload, `cwd`、`socketPath`、platform、arch、version 等字段没有出现在这个 persisted type 里。[E: packages/orchestrator/src/types.ts:3][E: packages/orchestrator/src/types.ts:4][E: packages/orchestrator/src/types.ts:5][E: packages/orchestrator/src/types.ts:6][E: packages/orchestrator/src/types.ts:7][E: packages/orchestrator/src/radius.ts:243][E: packages/orchestrator/src/radius.ts:244][E: packages/orchestrator/src/radius.ts:245][E: packages/orchestrator/src/radius.ts:315][E: packages/orchestrator/src/radius.ts:316][I]

`InstanceRecord` 是本地 Pi instance 记录, Radius 只在该记录上增加可选 `radiusPiId`; `RadiusPresenceCoordinator` 用 `getLiveInstance`、`listLiveInstances`、`updateInstance` 把 re-registration 结果写回 supervisor。[E: packages/orchestrator/src/types.ts:15][E: packages/orchestrator/src/types.ts:24][E: packages/orchestrator/src/radius.ts:22][E: packages/orchestrator/src/radius.ts:23][E: packages/orchestrator/src/radius.ts:24][E: packages/orchestrator/src/radius.ts:25][E: packages/orchestrator/src/radius.ts:439][E: packages/orchestrator/src/radius.ts:440]

## Endpoint 与 credential gating

默认 Radius base URL 是 `https://radius.pi.dev/`, 默认 orchestrator API base path 是 `/v1/`; `PI_RADIUS_URL` 可替换 base URL, `PI_RADIUS_ORCHESTRATOR_URL` 可直接替换 orchestrator API URL。[E: packages/orchestrator/src/radius.ts:7][E: packages/orchestrator/src/radius.ts:8][E: packages/orchestrator/src/radius.ts:107][E: packages/orchestrator/src/radius.ts:111][E: packages/orchestrator/src/radius.ts:113][E: packages/orchestrator/src/radius.ts:116]

本地 Radius HTTP helper 都用 POST, endpoint path 通过 `new URL(path, getRadiusOrchestratorBaseUrl())` 拼到 orchestrator API base 上, headers 带 `Authorization: Bearer ${getRadiusAccessToken()}` 和 JSON content type。[E: packages/orchestrator/src/radius.ts:47][E: packages/orchestrator/src/radius.ts:48][E: packages/orchestrator/src/radius.ts:50][E: packages/orchestrator/src/radius.ts:51][E: packages/orchestrator/src/radius.ts:64][E: packages/orchestrator/src/radius.ts:65][E: packages/orchestrator/src/radius.ts:67][E: packages/orchestrator/src/radius.ts:68]

`getRadiusAccessToken()` 优先读取 `AuthStorage` 里 provider 名为 `radius` 且 type 为 `oauth` 的 stored credential access token, 然后 fallback 到 `PI_RADIUS_API_KEY`; 两者都没有时抛出需要 `~/.pi/agent/auth.json` 或 `PI_RADIUS_API_KEY` 的错误。[E: packages/orchestrator/src/radius.ts:121][E: packages/orchestrator/src/radius.ts:123][E: packages/orchestrator/src/radius.ts:124][E: packages/orchestrator/src/radius.ts:130][E: packages/orchestrator/src/radius.ts:131][E: packages/orchestrator/src/radius.ts:132][E: packages/orchestrator/src/radius.ts:136][E: packages/orchestrator/src/radius.ts:141]

`isRadiusEnabled()` 是纯本地门控: 只要 stored radius OAuth access token 或 `PI_RADIUS_API_KEY` 任一存在即返回 true; 它不验证 token 是否仍被云端接受。[E: packages/orchestrator/src/radius.ts:145][I]

## Presence payload 与 endpoint

Machine registration 调用 `POST machines/register`, payload 包含旧 machine id、用户 label、当前 hostname、platform、arch、orchestrator `VERSION`, 以及 `{ spawn: true, relay: false, iroh: false }` capabilities。[E: packages/orchestrator/src/radius.ts:239][E: packages/orchestrator/src/radius.ts:240][E: packages/orchestrator/src/radius.ts:241][E: packages/orchestrator/src/radius.ts:242][E: packages/orchestrator/src/radius.ts:243][E: packages/orchestrator/src/radius.ts:244][E: packages/orchestrator/src/radius.ts:245][E: packages/orchestrator/src/radius.ts:246]

Machine heartbeat 调用 `POST machines/{machine.id}/heartbeat`, payload 只包含 orchestrator data directory `cwd` 和 Unix socket path `socketPath`; machine disconnect 调用 `POST machines/{machine.id}/disconnect` 且 body 是空对象。[E: packages/orchestrator/src/radius.ts:314][E: packages/orchestrator/src/radius.ts:315][E: packages/orchestrator/src/radius.ts:316][E: packages/orchestrator/src/radius.ts:186]

Pi instance registration 调用 `POST pis/register`, payload 包含 `machineId`、instance `label`、instance `cwd`、当前 hostname、当前 orchestrator process pid、`transport: "local-rpc"`、`{ rpc: true, relay: false, iroh: false }` capabilities, 以及 `sessionId`。[E: packages/orchestrator/src/radius.ts:202][E: packages/orchestrator/src/radius.ts:203][E: packages/orchestrator/src/radius.ts:204][E: packages/orchestrator/src/radius.ts:205][E: packages/orchestrator/src/radius.ts:206][E: packages/orchestrator/src/radius.ts:207][E: packages/orchestrator/src/radius.ts:208][E: packages/orchestrator/src/radius.ts:209][E: packages/orchestrator/src/radius.ts:210]

Pi heartbeat 调用 `POST pis/{radiusPiId}/heartbeat` 且 body 为空对象; Pi disconnect 调用 `POST pis/{radiusPiId}/disconnect` 且 body 为空对象。[E: packages/orchestrator/src/radius.ts:365][E: packages/orchestrator/src/radius.ts:229]

源码可证实 Radius client 在 machine 与 Pi capabilities 中宣称 `relay: false` 与 `iroh: false`; 云端是否仍会通过其它机制显示、路由或连接这些 Pi instance, 本节点源码无法证实。[E: packages/orchestrator/src/radius.ts:209][E: packages/orchestrator/src/radius.ts:246][U]

## 控制流

1. `serve@packages/orchestrator/src/serve.ts:9` 创建 IPC server 并恢复 supervisor 后, 若 `isRadiusEnabled@packages/orchestrator/src/radius.ts:145` 为 true, 调用 `radiusPresence.start@packages/orchestrator/src/radius.ts:161` 注册 machine 并启动 machine heartbeat。[E: packages/orchestrator/src/serve.ts:12][E: packages/orchestrator/src/serve.ts:19][E: packages/orchestrator/src/serve.ts:20][E: packages/orchestrator/src/serve.ts:21][E: packages/orchestrator/src/radius.ts:161][E: packages/orchestrator/src/radius.ts:166][E: packages/orchestrator/src/radius.ts:167]
2. `registerMachine@packages/orchestrator/src/radius.ts:237` 读取已有 machine record, 向 `machines/register` POST payload, 保存返回的 machine id 和时间戳, 再清零 machine failure counters。[E: packages/orchestrator/src/radius.ts:238][E: packages/orchestrator/src/radius.ts:239][E: packages/orchestrator/src/radius.ts:249][E: packages/orchestrator/src/radius.ts:251][E: packages/orchestrator/src/radius.ts:256][E: packages/orchestrator/src/radius.ts:257][E: packages/orchestrator/src/radius.ts:258]
3. `OrchestratorSupervisor.spawnInstance@packages/orchestrator/src/supervisor.ts:270` 启动 RPC child、同步 session metadata 后调用 `radiusPresence.registerPi`, 成功后把 `radiusPiId` 写回 instance record 并把 status 设为 `online`。[E: packages/orchestrator/src/supervisor.ts:288][E: packages/orchestrator/src/supervisor.ts:290][E: packages/orchestrator/src/supervisor.ts:291][E: packages/orchestrator/src/supervisor.ts:292][E: packages/orchestrator/src/supervisor.ts:293]
4. `registerPi@packages/orchestrator/src/radius.ts:194` 在 Radius disabled 时原样返回 instance, 否则要求已有 machine, POST `pis/register`, 把返回 id 写成 `radiusPiId`, 并按返回的 heartbeat interval 启动 Pi heartbeat。[E: packages/orchestrator/src/radius.ts:195][E: packages/orchestrator/src/radius.ts:196][E: packages/orchestrator/src/radius.ts:198][E: packages/orchestrator/src/radius.ts:199][E: packages/orchestrator/src/radius.ts:202][E: packages/orchestrator/src/radius.ts:212][E: packages/orchestrator/src/radius.ts:213]
5. `shutdown@packages/orchestrator/src/serve.ts:40` 关闭 server、让 supervisor 停实例、再调用 `radiusPresence.stop`; `stop()` 会清掉 machine 与 Pi timers, 并在有 machine 且 Radius enabled 时 POST machine disconnect。[E: packages/orchestrator/src/serve.ts:47][E: packages/orchestrator/src/serve.ts:48][E: packages/orchestrator/src/serve.ts:49][E: packages/orchestrator/src/radius.ts:172][E: packages/orchestrator/src/radius.ts:173][E: packages/orchestrator/src/radius.ts:176][E: packages/orchestrator/src/radius.ts:178][E: packages/orchestrator/src/radius.ts:180][E: packages/orchestrator/src/radius.ts:182][E: packages/orchestrator/src/radius.ts:186]

## 设计动机与权衡

Radius presence 在本地代码中分两层: machine payload 描述本地 orchestrator/host 能力, Pi payload 描述 supervisor 注册的 RPC child instance; 这种拆分由 `machines/*` 与 `pis/*` 两套 endpoints、两套 heartbeat state 以及 `machineId` 关联字段体现。[E: packages/orchestrator/src/radius.ts:153][E: packages/orchestrator/src/radius.ts:239][E: packages/orchestrator/src/radius.ts:242][E: packages/orchestrator/src/radius.ts:246][E: packages/orchestrator/src/radius.ts:202][E: packages/orchestrator/src/radius.ts:203][E: packages/orchestrator/src/radius.ts:208][I]

Heartbeat transient failure 使用 exponential backoff with jitter: 基础 1s、最大 30s, 失败后按 `2 ** (failureCount - 1)` 放大并加随机 jitter; 成功 heartbeat 会重置 transient counter 并回到注册返回的 interval。[E: packages/orchestrator/src/radius.ts:10][E: packages/orchestrator/src/radius.ts:11][E: packages/orchestrator/src/radius.ts:84][E: packages/orchestrator/src/radius.ts:86][E: packages/orchestrator/src/radius.ts:323][E: packages/orchestrator/src/radius.ts:324][E: packages/orchestrator/src/radius.ts:318][E: packages/orchestrator/src/radius.ts:319][E: packages/orchestrator/src/radius.ts:320][E: packages/orchestrator/src/radius.ts:366][E: packages/orchestrator/src/radius.ts:367][E: packages/orchestrator/src/radius.ts:368]

404 被当作云端 state 丢失信号: machine 或 Pi heartbeat 的第 1/2 次连续 404 继续按正常 interval 重试, 达到第 3 次后尝试重新注册 machine/Pi。[E: packages/orchestrator/src/radius.ts:9][E: packages/orchestrator/src/radius.ts:77][E: packages/orchestrator/src/radius.ts:331][E: packages/orchestrator/src/radius.ts:332][E: packages/orchestrator/src/radius.ts:333][E: packages/orchestrator/src/radius.ts:338][E: packages/orchestrator/src/radius.ts:379][E: packages/orchestrator/src/radius.ts:380][E: packages/orchestrator/src/radius.ts:381][E: packages/orchestrator/src/radius.ts:386][I]

Re-registration 依赖 coordinator 只处理 live instances: machine re-register 后遍历 `coordinator.listLiveInstances()`, Pi re-register 找不到 live instance 时清掉该 Pi heartbeat state 并返回 false。[E: packages/orchestrator/src/radius.ts:411][E: packages/orchestrator/src/radius.ts:414][E: packages/orchestrator/src/radius.ts:422][E: packages/orchestrator/src/radius.ts:423][E: packages/orchestrator/src/radius.ts:424][E: packages/orchestrator/src/radius.ts:429][E: packages/orchestrator/src/radius.ts:431]

## Gotcha

- `isRadiusEnabled()` 不做网络探测; token 存在但之后 Radius HTTP response 非 2xx 时, `post`/`maybePost` 才会抛出 `RadiusHttpError`。过期、scope 不足等具体原因不在本地源码中判定。[E: packages/orchestrator/src/radius.ts:145][E: packages/orchestrator/src/radius.ts:56][E: packages/orchestrator/src/radius.ts:57][E: packages/orchestrator/src/radius.ts:72][E: packages/orchestrator/src/radius.ts:73][I]
- `registerPi()` 在 enabled 且没有 registered machine 时会抛错, 所以正常路径需要先由 `serve()` 注册 machine; 测试或嵌入式调用若直接注册 Pi, 需要先准备 machine state。[E: packages/orchestrator/src/radius.ts:198][E: packages/orchestrator/src/radius.ts:199][E: packages/orchestrator/src/serve.ts:21][I]
- `stop()` 和 `disconnectPi()` 对 404 不再抛出, 非 404 HTTP error 会继续抛出。[E: packages/orchestrator/src/radius.ts:186][E: packages/orchestrator/src/radius.ts:188][E: packages/orchestrator/src/radius.ts:189][E: packages/orchestrator/src/radius.ts:229][E: packages/orchestrator/src/radius.ts:231][E: packages/orchestrator/src/radius.ts:232]
- `expiresInMs` 出现在 Radius response type, 但当前 `radius.ts` 只使用 `heartbeatIntervalMs` 和 `id`; 本地代码没有依据 `expiresInMs` 安排续约。[E: packages/orchestrator/src/types.ts:12][E: packages/orchestrator/src/radius.ts:166][E: packages/orchestrator/src/radius.ts:167][E: packages/orchestrator/src/radius.ts:212][E: packages/orchestrator/src/radius.ts:213][I]

## 跨包边界

本节点属于 `pkg: orchestrator`, 但 credential storage 来自 `@earendil-works/pi-coding-agent` 的 `AuthStorage`, 因此 Radius OAuth credential 的文件格式与登录写入逻辑不在 orchestrator 包内实现。[E: packages/orchestrator/src/radius.ts:2][E: packages/orchestrator/src/radius.ts:119][I]

`subsys.orchestrator.supervisor` 负责 live instance lifecycle: spawn 时注册 Pi, unexpected exit / stop / restart recovery 时断开 Pi, 并通过 `setCoordinator` 暴露 live instance 查询与 update adapter 给 `RadiusPresence`。[E: packages/orchestrator/src/supervisor.ts:127][E: packages/orchestrator/src/supervisor.ts:161][E: packages/orchestrator/src/supervisor.ts:252][E: packages/orchestrator/src/supervisor.ts:291][E: packages/orchestrator/src/supervisor.ts:344][E: packages/orchestrator/src/supervisor.ts:345][E: packages/orchestrator/src/supervisor.ts:348][E: packages/orchestrator/src/supervisor.ts:351]

## 不确定项

- Radius 云端服务端如何展示、路由或 relay 已注册的 machine/Pi instance, 本地源码无法证实, 已降级为 [U] 并记录到 staging。[U]
- Radius credential 的云端接受状态、过期原因、scope 语义和刷新行为不在 orchestrator 源码中实现, 本节点只能证明本地 token 读取与 HTTP error 抛出路径。[U]

## Sources

- `packages/orchestrator/src/radius.ts`
- `packages/orchestrator/src/serve.ts`
- `packages/orchestrator/src/supervisor.ts`
- `packages/orchestrator/src/types.ts`
- `packages/orchestrator/package.json`

## 相关

- `subsys.orchestrator.supervisor`: 管理 orchestrator live instances、RPC child process lifecycle, 并在 spawn/stop/recover 时调用 `radiusPresence`。

---
id: subsys.cost-usage
path: subsystems/cost-usage.md
title: 成本与用量
kind: subsystem
tier: T2
source: [cost-tracker.ts, costHook.ts, bootstrap/state.ts]
symbols: [addToTotalSessionCost, saveCurrentSessionCosts, useCostSummary]
related: []
status: verified
evidence: explicit
updated: 2026-06-14
---

> 成本与用量子系统把 API response cost、token counts、duration、line changes、web search requests 和 per-model usage 聚合到 bootstrap state, 再在 exit/project config/telemetry 中输出。[E: bootstrap/state.ts:51][E: bootstrap/state.ts:52][E: bootstrap/state.ts:54][E: bootstrap/state.ts:63][E: bootstrap/state.ts:64][E: bootstrap/state.ts:67][E: cost-tracker.ts:270][E: cost-tracker.ts:271][E: cost-tracker.ts:278][E: costHook.ts:11][E: costHook.ts:15]

## 能回答的问题

- session cost 与 per-model token usage 如何累计?
- 恢复会话时成本状态从哪里读回?
- exit 时怎样输出 cost summary 并保存项目配置?
- OTel cost/token counters 在哪里写入?

## 职责边界

`bootstrap/state.ts` 是运行中 mutable counters 的权威存储: 它持有 total cost、API/tool durations、line changes、unknown model cost flag、model usage 和 OTel counters。[E: bootstrap/state.ts:51][E: bootstrap/state.ts:52][E: bootstrap/state.ts:63][E: bootstrap/state.ts:65][E: bootstrap/state.ts:67][E: bootstrap/state.ts:95] `cost-tracker.ts` 负责 session restore/save、format summary、per-model aggregation 和把新 usage 写入 state/counters。[E: cost-tracker.ts:90][E: cost-tracker.ts:144][E: cost-tracker.ts:181][E: cost-tracker.ts:255][E: cost-tracker.ts:283] `costHook.ts` 只在 React lifecycle 中注册 process exit handler。[E: costHook.ts:9][E: costHook.ts:17]

## 关键文件

- `bootstrap/state.ts`: cost/token/duration/lines fields、getters、reset/restore 和 OTel counter factory。[E: bootstrap/state.ts:277][E: bootstrap/state.ts:557][E: bootstrap/state.ts:705][E: bootstrap/state.ts:865][E: bootstrap/state.ts:900][E: bootstrap/state.ts:968]
- `cost-tracker.ts`: stored session state、restore/save、formatting、model usage aggregation 和 session cost increment。[E: cost-tracker.ts:72][E: cost-tracker.ts:73][E: cost-tracker.ts:75][E: cost-tracker.ts:76][E: cost-tracker.ts:77][E: cost-tracker.ts:78][E: cost-tracker.ts:79][E: cost-tracker.ts:135][E: cost-tracker.ts:144][E: cost-tracker.ts:177][E: cost-tracker.ts:255][E: cost-tracker.ts:283]
- `costHook.ts`: exit-time summary print 与 project config save hook。[E: costHook.ts:11][E: costHook.ts:12][E: costHook.ts:15][E: costHook.ts:17]

## 数据模型

runtime state 初始化时把 `totalCostUSD` 设为 0, `hasUnknownModelCost` 设为 false, `modelUsage` 设为空对象, cost/token counters 设为 null。[E: bootstrap/state.ts:280][E: bootstrap/state.ts:294][E: bootstrap/state.ts:296][E: bootstrap/state.ts:326][E: bootstrap/state.ts:327] `StoredCostState` 保存 last cost、durations、lines 和 model usage; web search requests 存在 per-model usage 内, 并只在 `lastSessionId` 匹配时恢复。[E: cost-tracker.ts:72][E: cost-tracker.ts:73][E: cost-tracker.ts:74][E: cost-tracker.ts:75][E: cost-tracker.ts:76][E: cost-tracker.ts:77][E: cost-tracker.ts:78][E: cost-tracker.ts:79][E: cost-tracker.ts:93][E: cost-tracker.ts:160][E: cost-tracker.ts:168]

per-model usage 包括 input/output/cache read/cache creation tokens、web search requests、cost、context window 和 max output; `addToTotalModelUsage` 按 model key 累加这些字段。[E: cost-tracker.ts:255][E: cost-tracker.ts:266][E: cost-tracker.ts:267][E: cost-tracker.ts:268][E: cost-tracker.ts:269][E: cost-tracker.ts:270][E: cost-tracker.ts:272][E: cost-tracker.ts:273][E: cost-tracker.ts:274] token total getters 直接对 `STATE.modelUsage` 求和。[E: bootstrap/state.ts:705][E: bootstrap/state.ts:709][E: bootstrap/state.ts:713][E: bootstrap/state.ts:717][E: bootstrap/state.ts:721]

## 控制流

1. API response cost 进入 `addToTotalSessionCost`, 先聚合 per-model usage, 再调用 `addToTotalCostState` 写 total cost 和 modelUsage。[E: cost-tracker.ts:278][E: cost-tracker.ts:283][E: cost-tracker.ts:284][E: bootstrap/state.ts:562][E: bootstrap/state.ts:563]
2. 同一函数会把 cost 与各类 token usage 写入 OTel counters; optional chaining 使 counter 不存在时跳过。[E: cost-tracker.ts:291][E: cost-tracker.ts:292][E: cost-tracker.ts:293][E: cost-tracker.ts:294][E: cost-tracker.ts:298][E: bootstrap/state.ts:1010][E: bootstrap/state.ts:1014]
3. advisor tool 的 nested cost 会递归计入 session cost, 并记录 advisor tool use analytics metadata。[E: cost-tracker.ts:304][E: cost-tracker.ts:306][E: cost-tracker.ts:314][E: cost-tracker.ts:316][E: cost-tracker.ts:320]
4. 会话恢复时, `getStoredSessionCosts` 从 current project config 读出 persisted fields, 校验 session id, 重建 model usage, 再由 `setCostStateForRestore` 写回 runtime state。[E: cost-tracker.ts:90][E: cost-tracker.ts:93][E: cost-tracker.ts:100][E: cost-tracker.ts:112][E: cost-tracker.ts:135][E: bootstrap/state.ts:900][E: bootstrap/state.ts:909]
5. `useCostSummary` 在 process exit 时, 如果 console billing 可见就写出 formatted summary, 然后无论是否打印都保存当前 session costs。[E: costHook.ts:11][E: costHook.ts:12][E: costHook.ts:15]

## 设计动机与权衡

成本状态同时写 runtime state 和 project config; UI/telemetry 可以读当前累计值是由 getters/counters 暴露能力推出的。[E: bootstrap/state.ts:557][E: cost-tracker.ts:144][E: cost-tracker.ts:93][I] `formatModelUsage` 会按 canonical short model name 聚合显示, 因此 display summary 不是逐 raw model id 列出。[E: cost-tracker.ts:181][E: cost-tracker.ts:190]

unknown model cost 是单独 boolean, 与 total cost 数值分开; 这允许 summary 同时展示已知累计成本和存在未知价格模型的事实。[E: bootstrap/state.ts:745][E: bootstrap/state.ts:749][I]

## Gotcha

- `resetCostState` 会重置 cost、durations、tool duration、startTime、line changes、unknown flag、modelUsage 和 promptId, 不是只清 cost 数字。[E: bootstrap/state.ts:865][E: bootstrap/state.ts:866][E: bootstrap/state.ts:868][E: bootstrap/state.ts:869][E: bootstrap/state.ts:870][E: bootstrap/state.ts:872][E: bootstrap/state.ts:873][E: bootstrap/state.ts:874]
- `saveCurrentSessionCosts` 保存的是 current project config 的 last* 字段, 不是 global config。[E: cost-tracker.ts:144][E: cost-tracker.ts:146][E: cost-tracker.ts:173]
- exit summary 只有在 `hasConsoleBillingAccess()` 为 true 时打印, 但保存 session costs 不受这个条件限制。[E: costHook.ts:11][E: costHook.ts:15]
- `setCostStateForRestore` 会用 persisted last duration 调整 `startTime`, 从而让 wall duration 接续历史值。[E: bootstrap/state.ts:914]

## Sources

- `cost-tracker.ts`
- `costHook.ts`
- `bootstrap/state.ts`

## 相关

- 无

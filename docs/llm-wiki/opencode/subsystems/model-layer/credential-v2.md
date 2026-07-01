---
id: model-layer.credential-v2
title: Credential V2
kind: subsystem
tier: T2
v: v2
source: [packages/core/src/credential.ts, packages/core/src/credential/sql.ts, packages/core/src/integration.ts, packages/core/src/integration/connection.ts, packages/schema/src/credential.ts, packages/schema/src/integration.ts, packages/schema/src/connection.ts, packages/schema/src/integration-id.ts, packages/core/src/catalog.ts, packages/core/src/plugin/models-dev.ts]
symbols: [Credential.Service, CredentialTable, Integration.Service, IntegrationConnection.Info, Integration.Attempt]
related: [model-layer.auth, model-layer.model-catalog-v2, integrations.integration-v2]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V2 credential layer 把 provider credentials 存在 SQLite `credential` 表；`Integration.Service` 注册 key/OAuth/env methods、暴露 active connection，并管理 OAuth attempt lifecycle。schema 定义在 `@opencode-ai/schema` 的 credential/integration/connection 文件中，core 的 `credential.ts` 与 `integration.ts` 负责 re-export 和服务实现。

## 能回答的问题
- `credential` 表现在有哪些字段，哪些字段是旧 schema compatibility?
- `Credential.Info` 和 `Credential.Value` 如何区分 persisted row 与 secret value?
- `Integration.Service` 如何注册 methods、列出 connections、写入 key credential?
- OAuth attempt 的 pending/complete/failed/expired 状态怎么维护?
- Catalog provider availability 如何由 integration connection 派生?

## Storage Schema

`CredentialTable` 表名仍是 `credential`，新读写路径使用 `id`、`integration_id`、`label`、JSON `value` 和 timestamps；`connector_id`、`method_id`、`active` 仍留在表中以兼容旧迁移/旧 schema，但当前 `Credential.Info` 投影只读取 `id`、`integration_id`、`label` 和 `value`。[E: packages/core/src/credential/sql.ts:5][E: packages/core/src/credential/sql.ts:6][E: packages/core/src/credential/sql.ts:7][E: packages/core/src/credential/sql.ts:8][E: packages/core/src/credential/sql.ts:9][E: packages/core/src/credential/sql.ts:10][E: packages/core/src/credential/sql.ts:11][E: packages/core/src/credential/sql.ts:12][E: packages/core/src/credential/sql.ts:13][E: packages/core/src/credential.ts:56][E: packages/core/src/credential.ts:59][E: packages/core/src/credential.ts:60][E: packages/core/src/credential.ts:61][E: packages/core/src/credential.ts:62]

`Credential.Value` 是 secret value union：OAuth value 有 `type/methodID/refresh/access/expires/metadata`，Key value 有 `type/key/metadata`。[E: packages/schema/src/credential.ts:16][E: packages/schema/src/credential.ts:18][E: packages/schema/src/credential.ts:19][E: packages/schema/src/credential.ts:20][E: packages/schema/src/credential.ts:21][E: packages/schema/src/credential.ts:22][E: packages/schema/src/credential.ts:26][E: packages/schema/src/credential.ts:28][E: packages/schema/src/credential.ts:29][E: packages/schema/src/credential.ts:32]

`Credential.Info` 是 persisted credential shape：`id`、`integrationID`、`label`、`value`。[E: packages/core/src/credential.ts:23][E: packages/core/src/credential.ts:24][E: packages/core/src/credential.ts:25][E: packages/core/src/credential.ts:26][E: packages/core/src/credential.ts:27]

## Credential.Service

`Credential.Service` 暴露 `all/list/get/create/update/remove` 六个方法；没有旧版 `activate/active/activeAll/forConnector` surface。[E: packages/core/src/credential.ts:30][E: packages/core/src/credential.ts:32][E: packages/core/src/credential.ts:34][E: packages/core/src/credential.ts:36][E: packages/core/src/credential.ts:38][E: packages/core/src/credential.ts:44][E: packages/core/src/credential.ts:46]

`create` 生成 `cred_` id，默认 label 是 `"default"`，并在 transaction 中先删除同 integration 的所有旧 credential，再插入新 credential；这意味着当前实现是一 integration 一 credential replacement，而不是旧 active flag 切换模型。[E: packages/schema/src/credential.ts:9][E: packages/schema/src/credential.ts:11][E: packages/core/src/credential.ts:94][E: packages/core/src/credential.ts:96][E: packages/core/src/credential.ts:98][E: packages/core/src/credential.ts:101][E: packages/core/src/credential.ts:104][E: packages/core/src/credential.ts:106][E: packages/core/src/credential.ts:108][E: packages/core/src/credential.ts:112][E: packages/core/src/credential.ts:114][E: packages/core/src/credential.ts:120]

`update` 只在 `updates.label` 或 `updates.value` 为 truthy 时发起 row update，不读取旧 row 比较差异；`remove` 直接按 credential id 删除，不再寻找 replacement active credential。[E: packages/core/src/credential.ts:122][E: packages/core/src/credential.ts:123][E: packages/core/src/credential.ts:126][E: packages/core/src/credential.ts:127][E: packages/core/src/credential.ts:131][E: packages/core/src/credential.ts:132]

## Integration Registry

`Integration.ID` 与 `Integration.MethodID` 来自 `packages/schema/src/integration-id.ts`，再由 schema integration 和 core integration re-export；attempt id 仍用 `con_` prefix 加 ascending identifier 创建。[E: packages/schema/src/integration-id.ts:3][E: packages/schema/src/integration-id.ts:6][E: packages/schema/src/integration.ts:11][E: packages/schema/src/integration.ts:14][E: packages/core/src/integration.ts:24][E: packages/core/src/integration.ts:27][E: packages/schema/src/integration.ts:102][E: packages/schema/src/integration.ts:104]

method shape 包含 OAuth、key 和 env 三类：OAuth method 有 id、label、optional prompts；key method 只有 type 与 optional label；env method 记录 env var names。[E: packages/schema/src/integration.ts:52][E: packages/schema/src/integration.ts:53][E: packages/schema/src/integration.ts:55][E: packages/schema/src/integration.ts:56][E: packages/schema/src/integration.ts:60][E: packages/schema/src/integration.ts:62][E: packages/schema/src/integration.ts:66][E: packages/schema/src/integration.ts:68][E: packages/schema/src/integration.ts:71]

`Integration.Info` 包含 id、name、methods 和 current connections；connection info 是 `{ type: "credential", id, label }` 或 `{ type: "env", name }`。[E: packages/schema/src/integration.ts:95][E: packages/schema/src/integration.ts:96][E: packages/schema/src/integration.ts:97][E: packages/schema/src/integration.ts:98][E: packages/schema/src/integration.ts:99][E: packages/schema/src/connection.ts:7][E: packages/schema/src/connection.ts:14][E: packages/schema/src/connection.ts:19]

registry editor 的 `method.update` 会按 method type 和 OAuth method id upsert method；只有 OAuth implementation 存入 `implementations` map，因为 key/env methods 没有 authorize callback implementation。[E: packages/core/src/integration.ts:246][E: packages/core/src/integration.ts:258][E: packages/core/src/integration.ts:260][E: packages/core/src/integration.ts:263][E: packages/core/src/integration.ts:265][E: packages/core/src/integration.ts:266]

## Connection Flow

`Integration.list()` 会把 `credentials.all()` 按 `integrationID` 分组，并只投影 registry 中存在的 integration；`connection.active(id)` 取该 integration 的第一条 resolved connection。credential connection 优先，env method 只在对应 process env 存在时作为 fallback。[E: packages/core/src/integration.ts:374][E: packages/core/src/integration.ts:375][E: packages/core/src/integration.ts:376][E: packages/core/src/integration.ts:377][E: packages/core/src/integration.ts:381][E: packages/core/src/integration.ts:383][E: packages/core/src/integration.ts:288][E: packages/core/src/integration.ts:295][E: packages/core/src/integration.ts:296][E: packages/core/src/integration.ts:298][E: packages/core/src/integration.ts:300]

`connection.key()` 只检查 integration 是否注册了 key method；存在则用 `Credential.Key` 包装用户输入 secret，调用 `credentials.create({ integrationID, label, value })`，再发布 connection 与 integration update events。[E: packages/core/src/integration.ts:404][E: packages/core/src/integration.ts:408][E: packages/core/src/integration.ts:410][E: packages/core/src/integration.ts:411][E: packages/core/src/integration.ts:412][E: packages/core/src/integration.ts:413][E: packages/core/src/integration.ts:415][E: packages/core/src/integration.ts:416]

`connection.update()` 与 `connection.remove()` 是 connection-facing wrapper：它们分别调用 `credentials.update` 与 `credentials.remove`，随后发布 connection 与 integration update events。[E: packages/core/src/integration.ts:458][E: packages/core/src/integration.ts:459][E: packages/core/src/integration.ts:460][E: packages/core/src/integration.ts:462][E: packages/core/src/integration.ts:464][E: packages/core/src/integration.ts:466][E: packages/core/src/integration.ts:468][E: packages/core/src/integration.ts:470][E: packages/core/src/integration.ts:472]

## OAuth Attempt Lifecycle

attempt lifetime 是 10 分钟，terminal retention 是 1 分钟，scrub 每 30 秒运行。[E: packages/core/src/integration.ts:198][E: packages/core/src/integration.ts:199][E: packages/core/src/integration.ts:200][E: packages/core/src/integration.ts:364]

`connection.oauth()` 查找 OAuth implementation，fork attempt scope，执行 authorize，写入 pending attempt；auto mode 会 fork callback，并在 callback 完成后调用 `settle`。[E: packages/core/src/integration.ts:418][E: packages/core/src/integration.ts:419][E: packages/core/src/integration.ts:423][E: packages/core/src/integration.ts:424][E: packages/core/src/integration.ts:428][E: packages/core/src/integration.ts:431][E: packages/core/src/integration.ts:443][E: packages/core/src/integration.ts:444][E: packages/core/src/integration.ts:446][E: packages/core/src/integration.ts:447]

`attempt.status()` 返回 pending/complete/failed/expired；failed 会带 message。[E: packages/schema/src/integration.ts:121][E: packages/schema/src/integration.ts:122][E: packages/schema/src/integration.ts:123][E: packages/schema/src/integration.ts:124][E: packages/schema/src/integration.ts:125][E: packages/core/src/integration.ts:476][E: packages/core/src/integration.ts:479][E: packages/core/src/integration.ts:480][E: packages/core/src/integration.ts:482]

`attempt.complete()` 会拒绝重复 completion，code mode 没 code 时返回 `Integration.CodeRequired`，执行 callback 后调用 `settle`；callback failure 会以 `AuthorizationError` 形式返回给 caller。[E: packages/core/src/integration.ts:484][E: packages/core/src/integration.ts:487][E: packages/core/src/integration.ts:493][E: packages/core/src/integration.ts:494][E: packages/core/src/integration.ts:496][E: packages/core/src/integration.ts:497][E: packages/core/src/integration.ts:500][E: packages/core/src/integration.ts:501][E: packages/core/src/integration.ts:502][E: packages/core/src/integration.ts:503]

`settle` 在 success 时调用 `credentials.create` 保存 OAuth value，并发布 connection 与 integration update events；failure 则把 attempt 标为 failed，保留 message，并关闭 attempt scope。[E: packages/core/src/integration.ts:322][E: packages/core/src/integration.ts:327][E: packages/core/src/integration.ts:329][E: packages/core/src/integration.ts:335][E: packages/core/src/integration.ts:338][E: packages/core/src/integration.ts:340][E: packages/core/src/integration.ts:341][E: packages/core/src/integration.ts:343]

## 与 Catalog 的关系

Catalog availability 不再读取 credential active flag；`Catalog.provider.available()` 先读取 integration list，再用 `provider.integrationID ?? provider.id` 判断 provider 是否可用。[E: packages/core/src/catalog.ts:184][E: packages/core/src/catalog.ts:185][E: packages/core/src/catalog.ts:186][E: packages/core/src/catalog.ts:187]

availability 判断规则是：provider disabled 则不可用；provider request body 已有 string `apiKey` 则可用；存在 connection 则可用；如果 provider 没有 `integrationID` 且没有对应 integration 也可用。[E: packages/core/src/catalog.ts:71][E: packages/core/src/catalog.ts:72][E: packages/core/src/catalog.ts:73][E: packages/core/src/catalog.ts:74][E: packages/core/src/catalog.ts:75]

`ModelsDevPlugin` 为 models.dev provider 注册 integration metadata：有 env names 的 provider 会注册 key method 和 env method，然后把 provider/model 写进 catalog。[E: packages/core/src/plugin/models-dev.ts:124][E: packages/core/src/plugin/models-dev.ts:127][E: packages/core/src/plugin/models-dev.ts:128][E: packages/core/src/plugin/models-dev.ts:130][E: packages/core/src/plugin/models-dev.ts:131][E: packages/core/src/plugin/models-dev.ts:135][E: packages/core/src/plugin/models-dev.ts:142][E: packages/core/src/plugin/models-dev.ts:147][E: packages/core/src/plugin/models-dev.ts:162][E: packages/core/src/plugin/models-dev.ts:164]

## 易错点

- `Integration` 是本地 auth/integration registry，不是 workspace remote adapter；workspace/control-plane adapter 仍在 server/control-plane 相关代码中。[I]
- `credential` table 保留 `connector_id/method_id/active` compatibility columns，但新 `Credential.Info` 使用 `integration_id`。[E: packages/core/src/credential/sql.ts:7][E: packages/core/src/credential/sql.ts:10][E: packages/core/src/credential/sql.ts:11][E: packages/core/src/credential/sql.ts:12][E: packages/core/src/credential.ts:25]
- 当前 key connection 不调用 method-specific key authorize implementation；它只要求 key method 已注册，然后直接存 `Credential.Key`。[E: packages/core/src/integration.ts:404][E: packages/core/src/integration.ts:408][E: packages/core/src/integration.ts:410][E: packages/core/src/integration.ts:413]

## Sources
- packages/core/src/credential.ts
- packages/core/src/credential/sql.ts
- packages/core/src/integration.ts
- packages/core/src/integration/connection.ts
- packages/schema/src/credential.ts
- packages/schema/src/integration.ts
- packages/schema/src/connection.ts
- packages/schema/src/integration-id.ts
- packages/core/src/catalog.ts
- packages/core/src/plugin/models-dev.ts

## Related
- model-layer.auth
- model-layer.model-catalog-v2
- integrations.integration-v2

---
id: subsys.ai.model-catalog-publication
title: 模型目录生成与发布管线
kind: subsystem
tier: T2
pkg: ai
source:
 - packages/ai/scripts/generate-models.ts
 - packages/ai/scripts/model-data.ts
 - packages/ai/scripts/check-model-data.ts
 - scripts/diff-model-catalog.mjs
 - scripts/publish-model-catalog.mjs
 - scripts/model-catalog-protocol.ts
 - .github/workflows/publish-model-catalog.yml
 - package.json
 - packages/ai/package.json
 - packages/ai/src/models.generated.ts
symbols:
 - validateBundle
 - buildIndex
 - MODEL_DATA_SCHEMA_VERSION
 - MODEL_CATALOG_SCHEMA_VERSION
related:
 - ref.ai.model-catalog
 - subsys.ai.model-discovery
evidence: explicit
status: verified
updated: ff72faba28
---

> `subsys.ai.model-catalog-publication` 是独立于 npm package release 的 artifact pipeline：生成完整 JSON model bundle(含 typed `.all.json`)，验证 bundle 内部一致性，以内容 hash 建不可变 revision，并在受控窗口发布到 S3-compatible R2。本地 ignored model JSON 走 schema **v6** 的 `hydrate:model-data`。

## 能回答的问题

- model catalog artifact 包含哪些文件，`models.json` 与 `models.all.json` 有何不同?
- 本地 `hydrate:model-data` 与 published catalog schema 是不是同一个 version?
- 发布前有哪些 schema、provider、shard、model type、model count 防线?
- revision、minimum Pi version、source commit 和 index 怎样关联?
- immutable revision objects 与 mutable index 使用什么 cache policy?
- CI success、schedule、manual dispatch 与业务时段怎样决定是否上传?

## 为什么值得独立节点

这批面跨越 generator CLI、bundle contract、diff tooling、content-addressed storage、兼容版本 index、secrets/environment、CI artifact handoff 与发布时间门控。该生命周期有独立故障模式和运维语义，因此建成 T2 节点，而不是把发布逻辑塞进静态 model reference。[I]

## 两套 schema,不要混

本地 generated model data(gitignored `src/providers/data/*.json` + `.manifest.json`)的 schema 是 `MODEL_DATA_SCHEMA_VERSION = 6`。manifest 的 `schemaVersion` 必须等于 6,否则 `validateModelDataDirectory` 报 stale,并提示从仓库根运行 `npm run hydrate:model-data`。[E: packages/ai/scripts/model-data.ts:5] [E: packages/ai/scripts/model-data.ts:232] [E: packages/ai/scripts/model-data.ts:234] [E: packages/ai/scripts/check-model-data.ts:14]

根 scripts 把 hydrate 暴露为 `hydrate:model-data` → `packages/ai` 的 `hydrate-model-data`:`node scripts/generate-models.ts --strict --data-only`。`--data-only` 不能和 JSON catalog output 组合。[E: package.json:31] [E: packages/ai/package.json:57] [E: packages/ai/scripts/generate-models.ts:68] [E: packages/ai/scripts/generate-models.ts:90]

published catalog 的 wire protocol schema 仍是 `MODEL_CATALOG_SCHEMA_VERSION = 1`,存储前缀 `models/v1`。这不是 v6。artifact 名含 `models.json` 与 `models.all.json`;representation 分 `"legacy"` 与 `"typed"`。[E: scripts/model-catalog-protocol.ts:28] [E: scripts/model-catalog-protocol.ts:29] [E: scripts/model-catalog-protocol.ts:39] [E: scripts/model-catalog-protocol.ts:41] [E: scripts/publish-model-catalog.mjs:21]

## 生成物 contract

root scripts 把 `generate:model-catalog`、`diff:model-catalog` 和 `check:model-catalog` 分成三个命令；check 以 `--dry-run` 调用 publisher 的同一 validator。[E: package.json:33] [E: package.json:34] [E: package.json:36] AI package 的生成命令固定使用 `--strict --json-only --json-output ../../.artifacts/model-catalog`。[E: packages/ai/package.json:58]

`generate-models.ts` 的 CLI 明确区分 `strict`、`dataOnly`、`jsonOnly`、`jsonOutputDir` 与 `pretty`,并拒绝没有 output directory 的 `--json-only`。[E: packages/ai/scripts/generate-models.ts:49] [E: packages/ai/scripts/generate-models.ts:51] [E: packages/ai/scripts/generate-models.ts:72] [E: packages/ai/scripts/generate-models.ts:89]

JSON output directory 被重建后包含:

- 聚合 `models.json`(legacy keyed **chat** catalog)
- 聚合 `models.all.json`(provider → **array** of every type)
- 排序的 `providers.json`
- `providers/<id>.json`(chat projection)与 `providers/<id>.all.json`(typed array)

`.all` 用 array,好让同一 upstream id 按 type 各出现一次。[E: packages/ai/scripts/generate-models.ts:3516] [E: packages/ai/scripts/generate-models.ts:3517] [E: packages/ai/scripts/generate-models.ts:3518] [E: packages/ai/scripts/generate-models.ts:3520] [E: packages/ai/scripts/generate-models.ts:3521]

generator 在内存里把模型分成 `chat` / `image` / `classifier` 三个 bucket,chat entry 写入 `{ ...model, type: "chat" }`。`jsonAllProviders[providerId]` 是 chat + image + classifier values 拼成的 array。[E: packages/ai/scripts/generate-models.ts:3301] [E: packages/ai/scripts/generate-models.ts:3310] [E: packages/ai/scripts/generate-models.ts:3331] [E: packages/ai/scripts/generate-models.ts:3342]

validator 把允许的 type 钉死成 `["chat", "image", "classifier"]`。[E: scripts/publish-model-catalog.mjs:34] [E: scripts/publish-model-catalog.mjs:129]

普通 package build 还生成只保留类型结构的 `.models.ts` 与 gitignored adjacent JSON values；两者来自同一 provider data,但输出位置和消费方不同。`--data-only` 成功时打印 `Hydrated JSON model values under src/providers/data/`。[E: packages/ai/scripts/generate-models.ts:3498]

当前 generated aggregator 有 **42** 个 provider bucket(含 `meta`、`typesafe`、`radius`)。[E: packages/ai/src/models.generated.ts:47] [E: packages/ai/src/models.generated.ts:64] [E: packages/ai/src/models.generated.ts:79] [E: packages/ai/src/models.generated.ts:81]

## 发布前验证

`validateBundle()` 同时读取 `models.json`、`models.all.json`、provider index 和 shard directory。[E: scripts/publish-model-catalog.mjs:85] [E: scripts/publish-model-catalog.mjs:87] [E: scripts/publish-model-catalog.mjs:88]

1. `models.json` 与 `models.all.json` 都必须是 object(后者的 value 才是 array)。[E: scripts/publish-model-catalog.mjs:96] [E: scripts/publish-model-catalog.mjs:97]
2. `providers.json` 必须等于 `models.all.json` keys 的排序结果,且与 `models.json` keys 相同;至少包含 Anthropic、OpenAI、OpenRouter。[E: scripts/publish-model-catalog.mjs:102] [E: scripts/publish-model-catalog.mjs:106] [E: scripts/publish-model-catalog.mjs:32]
3. 每个 provider 的 `.all.json` shard 必须 deep-equal `models.all.json[providerId]`,且该 value **必须是 array**。[E: scripts/publish-model-catalog.mjs:118] [E: scripts/publish-model-catalog.mjs:119] [E: scripts/publish-model-catalog.mjs:121]
4. 每个 array entry 必须是 object,`model.id` 为 string,`model.provider === providerId`,`model.type` 属于 `chat|image|classifier`;identity 是 `` `${type}:${id}` ``,同一 provider 内不得重复。[E: scripts/publish-model-catalog.mjs:126] [E: scripts/publish-model-catalog.mjs:129] [E: scripts/publish-model-catalog.mjs:132]
5. legacy `models.json[providerId]` 必须恰好是 chat projection(`type === "chat"` keyed by id)。[E: scripts/publish-model-catalog.mjs:81] [E: scripts/publish-model-catalog.mjs:141]
6. shard filenames 必须是每个 provider 的 `.json` + `.all.json`;chat model count 少于 500 时拒绝发布。[E: scripts/publish-model-catalog.mjs:150] [E: scripts/publish-model-catalog.mjs:155]

验证成功后,revision 是 **`models.all.json` 原始 bytes** 的 SHA-256,格式 `sha256-<digest>`。chat-only 或 image-only 更新都会改 revision。[E: scripts/publish-model-catalog.mjs:161] [E: scripts/publish-model-catalog.mjs:174]

## Versioned storage 与 index

schema prefix 固定为 `models/v1`;当前 minimum compatible Pi version 是 `0.80.7`。[E: scripts/publish-model-catalog.mjs:28] [E: scripts/model-catalog-protocol.ts:29] revision objects 使用一年 immutable cache,mutable `models/v1/index.json` 使用 `no-store`。[E: scripts/publish-model-catalog.mjs:30] [E: scripts/publish-model-catalog.mjs:31]

publication metadata 记录 schema version、minimum Pi version、revision、source commit、provider count、chat/image/classifier counts,以及 `modelTypes: ["chat", "image", "classifier"]`,并落成 bundle 内 `publication.json`。[E: scripts/publish-model-catalog.mjs:267] [E: scripts/publish-model-catalog.mjs:280] [E: scripts/publish-model-catalog.mjs:280] [E: scripts/publish-model-catalog.mjs:282]

`buildIndex()` 对同一个 minimum version 做 replace,再按 numeric version parts 排序。publisher 若发现 current index 已把同一 revision 同时设为 default 和当前 minimum-version entry,就幂等退出。否则先上传 aggregate、`models.all.json`、provider index 和所有 `.json` / `.all.json` shards,最后才替换 mutable index。[E: scripts/publish-model-catalog.mjs:298] [E: scripts/publish-model-catalog.mjs:305] [E: scripts/publish-model-catalog.mjs:306] [E: scripts/publish-model-catalog.mjs:309]

## CI、artifact handoff 与发布时间

workflow 的 generate job checkout `workflow_run.head_sha` / manual ref / event SHA,安装依赖,生成并 dry-run validate JSON,再上传名为 `model-catalog-json` 的 14-day artifact。[E: .github/workflows/publish-model-catalog.yml:43] [E: .github/workflows/publish-model-catalog.yml:48] [E: .github/workflows/publish-model-catalog.yml:61] [E: .github/workflows/publish-model-catalog.yml:64] [E: .github/workflows/publish-model-catalog.yml:69] [E: .github/workflows/publish-model-catalog.yml:72]

publish job 依赖 generate artifact,运行在 `pi-model-upload` environment,并用 concurrency group 串行化 R2 发布。[E: .github/workflows/publish-model-catalog.yml:75] [E: .github/workflows/publish-model-catalog.yml:76] [E: .github/workflows/publish-model-catalog.yml:78] [E: .github/workflows/publish-model-catalog.yml:79]

schedule 在工作日 UTC 8–13 点每小时产生候选。[E: .github/workflows/publish-model-catalog.yml:20] [E: .github/workflows/publish-model-catalog.yml:21] 真正上传还受 Europe/Vienna 本地时间门控:工作日 10:00–15:00;scheduled event 只允许 10/12/14 点;explicit manual publish 可绕过该窗口。[E: .github/workflows/publish-model-catalog.yml:125] [E: .github/workflows/publish-model-catalog.yml:128] [E: .github/workflows/publish-model-catalog.yml:129] 最终命令显式传入 artifact path、bucket、endpoint 与 checkout HEAD source commit。[E: .github/workflows/publish-model-catalog.yml:143] [E: .github/workflows/publish-model-catalog.yml:147]

## 本地 diff 工具

`diff-model-catalog.mjs` 创建 detached HEAD worktree,再分别以 strict/json-only 模式生成 HEAD baseline 与 current worktree catalog。[E: scripts/diff-model-catalog.mjs:57] [E: scripts/diff-model-catalog.mjs:65] [E: scripts/diff-model-catalog.mjs:66]

## Gotcha

- published bundle 是生成时外部 catalog 输入的 snapshot;`sourceCommit` 绑定生成逻辑版本,但不证明未来重新运行同一 commit 会得到相同远端数据。[I]
- 本轮目标 tree 仍不包含 ignored model JSON;可复现的 membership 证据必须组合 publication/npm artifact 与带时间/hash 的 generator 输入。checkout 能核的是 42 个 structural bucket,flattened model count 不能从 checkout 标成 `[E]`。[E: packages/ai/src/models.generated.ts:47] [I]
- 本地 data schema 是 **v6**,published catalog protocol 是 **v1**。不要把 `hydrate:model-data` 的 6 写成 R2 prefix `models/v6`。[E: packages/ai/scripts/model-data.ts:5] [E: scripts/model-catalog-protocol.ts:28]
- dry-run 仍会写 `publication.json` 到 input directory,然后在上传前退出。[E: scripts/publish-model-catalog.mjs:282] [E: scripts/publish-model-catalog.mjs:285]
- revision 现在 hash 的是 `models.all.json` bytes,不是 chat-only `models.json`。[E: scripts/publish-model-catalog.mjs:161]
- scheduler 的 cron 只是候选触发器,Europe/Vienna check 才是实际 publication policy。[E: .github/workflows/publish-model-catalog.yml:21] [E: .github/workflows/publish-model-catalog.yml:141]

## 跨包边界

[ref.ai.model-catalog](../../reference/model-catalog.md) 枚举 commit 中显式 provider structure,并用同版本官方 npm 制品补足逐模型 id/provider/api `[I]`;本节点描述完整 JSON values 如何产生、校验与发布。

[subsys.ai.model-discovery](model-discovery.md) 描述 provider/runtime 如何读取或刷新 catalogs;本节点停在 producer、validator 和 artifact publication 边界。

## Sources

- packages/ai/scripts/generate-models.ts
- packages/ai/scripts/model-data.ts
- packages/ai/scripts/check-model-data.ts
- scripts/diff-model-catalog.mjs
- scripts/publish-model-catalog.mjs
- scripts/model-catalog-protocol.ts
- .github/workflows/publish-model-catalog.yml
- package.json
- packages/ai/package.json
- packages/ai/src/models.generated.ts

## 相关

- [ref.ai.model-catalog](../../reference/model-catalog.md): 当前 commit 的逐 model structural catalog。
- [subsys.ai.model-discovery](model-discovery.md): runtime provider catalog 查询与 refresh。

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
  - .github/workflows/publish-model-catalog.yml
  - package.json
  - packages/ai/package.json
symbols:
  - validateBundle
  - buildIndex
  - CATALOG_SCHEMA_VERSION
related:
  - ref.ai.model-catalog
  - subsys.ai.model-discovery
evidence: explicit
status: verified
updated: a8ee03b815
---

> `subsys.ai.model-catalog-publication` 是独立于 npm package release 的 artifact pipeline：生成完整 JSON model bundle，验证 bundle 内部一致性，以内容 hash 建不可变 revision，并在受控窗口发布到 S3-compatible R2。

## 能回答的问题

- model catalog artifact 包含哪些文件，怎样从 generator 产生?
- 发布前有哪些 schema、provider、shard、model count 防线?
- revision、minimum Pi version、source commit 和 index 怎样关联?
- immutable revision objects 与 mutable index 使用什么 cache policy?
- CI success、schedule、manual dispatch 与业务时段怎样决定是否上传?
- 本地怎样比较 HEAD 和 worktree 的逐 model JSON 差异?

## 为什么值得独立节点

这批新增面不只是 `ref.ai.model-catalog` 的生成细节：它跨越 generator CLI、bundle contract、diff tooling、content-addressed storage、兼容版本 index、secrets/environment、CI artifact handoff 与发布时间门控。该生命周期有独立故障模式和运维语义，因此建成 T2 节点，而不是把约 600 行发布逻辑塞进静态 model reference。[I]

## 生成物 contract

root scripts 把 `generate:model-catalog`、`diff:model-catalog` 和 `check:model-catalog` 分成三个命令；check 以 `--dry-run` 调用 publisher 的同一 validator [E: package.json:27] [E: package.json:28] [E: package.json:30]。AI package 的生成命令固定使用 `--strict --json-only --json-output ../../.artifacts/model-catalog` [E: packages/ai/package.json:54]。

`generate-models.ts` 的 CLI 明确区分 `strict`、`jsonOnly`、`jsonOutputDir` 与 `pretty`，并拒绝没有 output directory 的 `--json-only` [E: packages/ai/scripts/generate-models.ts:35] [E: packages/ai/scripts/generate-models.ts:50] [E: packages/ai/scripts/generate-models.ts:58] [E: packages/ai/scripts/generate-models.ts:66] [E: packages/ai/scripts/generate-models.ts:75]。

JSON output directory 被重建后包含三层：聚合 `models.json`、排序的 `providers.json`、以及 `providers/<provider>.json` shards [E: packages/ai/scripts/generate-models.ts:2733] [E: packages/ai/scripts/generate-models.ts:2737] [E: packages/ai/scripts/generate-models.ts:2738] [E: packages/ai/scripts/generate-models.ts:2739]。普通 package build 还生成只保留类型结构的 `.models.ts` 与 gitignored adjacent JSON values；两者来自同一 provider data，但输出位置和消费方不同 [E: packages/ai/scripts/generate-models.ts:2678] [E: packages/ai/scripts/generate-models.ts:2680] [E: packages/ai/scripts/generate-models.ts:2709]。

本地 data 另有 schema-3 manifest：记录 generatedAt、structure hash 与逐文件 SHA-256。validator 对 aggregator/provider shards、data files、manifest filenames/hash、model id/provider/api 和完整 model shape 做一致性检查；缺失或 stale data 会要求运行 `hydrate:model-data`。[E: packages/ai/scripts/model-data.ts:5] [E: packages/ai/scripts/model-data.ts:10] [E: packages/ai/scripts/model-data.ts:66] [E: packages/ai/scripts/model-data.ts:142] [E: packages/ai/scripts/model-data.ts:166] [E: packages/ai/scripts/check-model-data.ts:9] [E: packages/ai/scripts/check-model-data.ts:13]

## 发布前验证

`validateBundle()` 同时读取 aggregate、provider index 和 shard directory [E: scripts/publish-model-catalog.mjs:68] [E: scripts/publish-model-catalog.mjs:74]，然后实施这些防线：

1. `models.json` 必须是 object，`providers.json` 必须是 string array [E: scripts/publish-model-catalog.mjs:77] [E: scripts/publish-model-catalog.mjs:79]。
2. provider index 必须等于 aggregate keys 的排序结果，且至少包含 Anthropic、OpenAI、OpenRouter [E: scripts/publish-model-catalog.mjs:83] [E: scripts/publish-model-catalog.mjs:87]。
3. 每个 provider shard 必须 deep-equal aggregate 中对应 bucket [E: scripts/publish-model-catalog.mjs:92] [E: scripts/publish-model-catalog.mjs:98]。
4. 每个 entry 必须是 object，且 `model.id === key`、`model.provider === providerId` [E: scripts/publish-model-catalog.mjs:101] [E: scripts/publish-model-catalog.mjs:109]。
5. shard filenames 必须与 provider index 一一对应；总 model count 少于 500 时拒绝发布 [E: scripts/publish-model-catalog.mjs:115] [E: scripts/publish-model-catalog.mjs:120]。

验证成功后，revision 是 `models.json` 原始 bytes 的 SHA-256，格式 `sha256-<digest>` [E: scripts/publish-model-catalog.mjs:124] [E: scripts/publish-model-catalog.mjs:132]。这意味着 whitespace/serialization bytes 也是 revision identity 的一部分。[I]

## Versioned storage 与 index

schema prefix 固定为 `models/v1`；当前 minimum compatible Pi version 是 `0.80.7` [E: scripts/publish-model-catalog.mjs:16] [E: scripts/publish-model-catalog.mjs:17] [E: scripts/publish-model-catalog.mjs:20]。revision objects 使用一年 immutable cache，mutable `models/v1/index.json` 使用 `no-store` [E: scripts/publish-model-catalog.mjs:22] [E: scripts/publish-model-catalog.mjs:23]。

publication metadata 记录 schema version、minimum Pi version、revision、source commit、provider count 与 model count，并落成 bundle 内 `publication.json` [E: scripts/publish-model-catalog.mjs:247] [E: scripts/publish-model-catalog.mjs:255]。`buildIndex()` 对同一个 minimum version 做 replace，再按 numeric version parts 排序；index 同时给出 `defaultRevision` 和历史/兼容 catalogs [E: scripts/publish-model-catalog.mjs:223] [E: scripts/publish-model-catalog.mjs:233] [E: scripts/publish-model-catalog.mjs:236]。

publisher 若发现 current index 已把同一 revision 同时设为 default 和当前 minimum-version entry，就幂等退出 [E: scripts/publish-model-catalog.mjs:268] [E: scripts/publish-model-catalog.mjs:271]。否则先上传 aggregate、provider index 和所有 provider shards 到 `models/v1/revisions/<revision>/...`，最后才替换 mutable index [E: scripts/publish-model-catalog.mjs:276] [E: scripts/publish-model-catalog.mjs:277] [E: scripts/publish-model-catalog.mjs:285] [E: scripts/publish-model-catalog.mjs:298]。这使 index 成为 publication commit point。[I]

## CI、artifact handoff 与发布时间

workflow 的 generate job checkout `workflow_run.head_sha` / manual ref / event SHA，安装依赖，生成并 dry-run validate JSON，再上传名为 `model-catalog-json` 的 14-day artifact [E: .github/workflows/publish-model-catalog.yml:39] [E: .github/workflows/publish-model-catalog.yml:42] [E: .github/workflows/publish-model-catalog.yml:57] [E: .github/workflows/publish-model-catalog.yml:60] [E: .github/workflows/publish-model-catalog.yml:63] [E: .github/workflows/publish-model-catalog.yml:68] [E: .github/workflows/publish-model-catalog.yml:71]。

publish job 依赖 generate artifact，运行在 `pi-model-upload` environment，并用 concurrency group 串行化 R2 发布 [E: .github/workflows/publish-model-catalog.yml:73] [E: .github/workflows/publish-model-catalog.yml:75] [E: .github/workflows/publish-model-catalog.yml:77] [E: .github/workflows/publish-model-catalog.yml:79]。R2 credentials 来自 environment secrets；artifact 被下载到与 generator 相同的 `.artifacts/model-catalog` 路径 [E: .github/workflows/publish-model-catalog.yml:83] [E: .github/workflows/publish-model-catalog.yml:87] [E: .github/workflows/publish-model-catalog.yml:101] [E: .github/workflows/publish-model-catalog.yml:104]。

schedule 在工作日 UTC 8–13 点每小时产生候选 [E: .github/workflows/publish-model-catalog.yml:19] [E: .github/workflows/publish-model-catalog.yml:20]，真正上传还受 Europe/Vienna 本地时间门控：工作日 10:00–15:00；scheduled event 只允许 10/12/14 点；explicit manual publish 可绕过该窗口 [E: .github/workflows/publish-model-catalog.yml:117] [E: .github/workflows/publish-model-catalog.yml:124] [E: .github/workflows/publish-model-catalog.yml:127] [E: .github/workflows/publish-model-catalog.yml:128]。最终命令显式传入 artifact path、bucket、endpoint 与 checkout HEAD source commit [E: .github/workflows/publish-model-catalog.yml:142] [E: .github/workflows/publish-model-catalog.yml:146]。

## 本地 diff 工具

`diff-model-catalog.mjs` 创建 detached HEAD worktree，把当前 `node_modules` 以 symlink/junction 复用，再分别以 strict/json-only 模式生成 HEAD baseline 与 current worktree catalog [E: scripts/diff-model-catalog.mjs:56] [E: scripts/diff-model-catalog.mjs:57] [E: scripts/diff-model-catalog.mjs:65] [E: scripts/diff-model-catalog.mjs:148] [E: scripts/diff-model-catalog.mjs:157] [E: scripts/diff-model-catalog.mjs:160] [E: scripts/diff-model-catalog.mjs:164]。

比较粒度是 provider/model id：相同 JSON skip，不同 entry 写入 temporary snapshots 后用 `git diff --no-index --unified=0` 展示 changed lines [E: scripts/diff-model-catalog.mjs:184] [E: scripts/diff-model-catalog.mjs:191] [E: scripts/diff-model-catalog.mjs:195] [E: scripts/diff-model-catalog.mjs:197] [E: scripts/diff-model-catalog.mjs:205]。`finally` 会移除 worktree 和整个 temporary root [E: scripts/diff-model-catalog.mjs:232] [E: scripts/diff-model-catalog.mjs:235] [E: scripts/diff-model-catalog.mjs:240]。

## Gotcha

- published bundle 是生成时外部 catalog 输入的 snapshot；`sourceCommit` 绑定生成逻辑版本，但不证明未来重新运行同一 commit 会得到相同远端数据。[I]
- 本轮目标 tree 不包含 ignored model JSON；可复现的 membership 证据必须是 publication/npm artifact 自带 manifest，加上 registry/workflow 记录的 `sourceCommit`。官方 v0.83.0 artifact 的 registry `gitHead=845d6ff1f6643aba440341cce877ce1c43ebbc39` 是 target 祖先，flatten count 为 1,153；release→target 未改 structural shards，因此 1,153 可作为 target membership `[I]`，但不能标成 target checkout 内显式 `[E]`。
- dry-run 仍会写 `publication.json` 到 input directory，然后在上传前退出 [E: scripts/publish-model-catalog.mjs:255] [E: scripts/publish-model-catalog.mjs:258]。
- revision objects 先于 index 上传；上传中途失败可能留下不可达 immutable objects，但不会把 index 指向不完整 revision。[I]
- scheduler 的 cron 只是候选触发器，Europe/Vienna check 才是实际 publication policy [E: .github/workflows/publish-model-catalog.yml:20] [E: .github/workflows/publish-model-catalog.yml:140]。

## 跨包边界

[ref.ai.model-catalog](../../reference/model-catalog.md) 枚举 commit 中显式 provider structure，并用同版本官方 npm 制品补足逐模型 id/provider/api `[I]`；本节点描述完整 JSON values 如何产生、校验与发布。

[subsys.ai.model-discovery](model-discovery.md) 描述 provider/runtime 如何读取或刷新 catalogs；本节点停在 producer、validator 和 artifact publication 边界。

## Sources

- packages/ai/scripts/generate-models.ts
- packages/ai/scripts/model-data.ts
- packages/ai/scripts/check-model-data.ts
- scripts/diff-model-catalog.mjs
- scripts/publish-model-catalog.mjs
- .github/workflows/publish-model-catalog.yml
- package.json
- packages/ai/package.json

## 相关

- [ref.ai.model-catalog](../../reference/model-catalog.md): 当前 commit 的逐 model structural catalog。
- [subsys.ai.model-discovery](model-discovery.md): runtime provider catalog 查询与 refresh。

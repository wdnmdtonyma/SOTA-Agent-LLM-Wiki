# uncertainty · projection

- **`projectionCacheDomainSpec` 注释写「version bump 丢整份 medium」，json backend 实际是拒开。** `packages/session/session-projection-cache/src/spec.ts` 在 `version: 3` 旁写 cache 语义：stale / 不可读只让下次 tail 更长。`packages/storage/storage-json/src/format.ts` 对 `stored version != expected` 抛 `version-mismatch`；`SessionProjectionCache` 的 `Service.init` 直接 `storageDomain.open(projectionCacheDomainSpec)`，没有把 mismatch 收成空盘重建。wiki 只钉 domain 名为 `session_projcache`、version 为 3、行级过期靠 unit `stateVersion`；介质 version 不匹配时插件会不会起不来，留给 storage 页与实装验证。

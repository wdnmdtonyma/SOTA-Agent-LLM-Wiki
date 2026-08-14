# uncertainty · subsys.execution.e2b

- **「API key 不进 sandbox」的范围。** `Config` JSDoc 写 never forwarded into the sandbox。可证路径是：`apiKey` 只交给 `Sandbox.create`；控制面 `e2bControlEnvs` 只钉 `HOME`；用户进程 env 先 `scrubRemoteEnvironment`（剥 `DSH_*` 与 `SENSITIVE_ENV_PATTERN`）再叠 `spec.env`。E2B SaaS / SDK 是否在 VM 元数据或 login 环境里留一份 key，本仓没有 SDK 源可核。wiki 只写 DSH 这一侧。
- **POC overlay 的 disable 目标是 example 的 `id`，不是 `dsh-base`。** `e2b.cordis.yml` disable `subprocess` / `fs-local`。`dsh-base` 的 fs 行是 `id: fs-sandbox`。把同一份 overlay 叠到 `dsh web` 不会关掉 host `fs-sandbox`。

# uncertainty-update-deepseek-extensions

- **`dsh_session_log` 默认开。** `packages/session/session-log-deepseek/src/index.ts` schema `enabled` 默认 `true`；`apply` 仍 `if (config.enabled !== true) return`。注释写 Schemastery 在 `apply` 前填默认。shipped `dsh-base` / `sdk-minimal` 行无 `config:`，因此会登记字段。旧 wiki 写「默认关、必须显式 true」已过时。
- inventory 对 standing preset 根 bare 行用 host `baseUrl` 解析。测试 `inventory.spec.ts`「resolves a declared preset plugin from its owning composition」钉的是能解析到 preset 包，不是「preset 自己的 node_modules 版本会被忽略」那句旧断言；若产品仍依赖「忽略 preset 目录 node_modules」，需要补测。

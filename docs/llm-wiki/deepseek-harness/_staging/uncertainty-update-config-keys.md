# uncertainty-update-config-keys

- 本 catalog 在 `0a53fb55be` 对 **已删除包**（apiproxy / client-runtime / web-react / acp-demo）与 **PTC / 五 profile / 四 preset** 做了权威改写。
- 仍有大量 `packages/*/src/index.ts` 的 `Config` 顶层键未在实例表里逐字段展开（文末名单）。完整机械枚举以各文件 `export const Config` / `static Config` 为准；filler 未把官方 `docs/config-catalog.md` 当 [E]。
- `dsh-webhook` 运行时无插件 Config；`dsh-acp-app` `apply` 无 config 参数。

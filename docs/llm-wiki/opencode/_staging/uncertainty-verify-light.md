# L2-light verify notes — e207624c48

抽核 `opencode/` `e207624c48`，不信任 filler 转述。

## 拒绝项

- 这批节点没有把 SessionV2 写成默认活跑路径；`embedded-public-api` 只描述 V2 embedding surface。
- 没有残留 `1.18.25`。
- V1/V2 model-visible tool wire name 无增删改名；`execute` 仍是 experimental Code Mode。
- 没有 Azure `provider.models` / deployment auto-discover 说法。
- 没有把 opencode 两个 HTTP server 写成 Hono；`function` / `enterprise` 的 Hono 明确是外围 Worker / SolidStart。

## 已就地修正

- `tool.read`：`SessionTools.resolve` 转 AI SDK tool 的 [E] 从 `tools.ts:81`（`ask`）改到 `:92`/`:99`。
- `tool.execute`：去掉落到 `registry.ts:328`（`.join`）的假 [E]；移除逻辑在 `:308`。
- `plugin-api.v2-hooks`：SDK cache key 是 `{providerID, api, options}`，language cache 是 `providerID/model.id/variant`，不是混成一个 provider/model/options key。
- `integrations.mcp-client`：SessionTools 路径下 `resource` blob 不是无条件 attachment，受 mime allowlist 与 10 MiB 限制。
- `peripheral.script-identity`：TEAM_MEMBERS 名单仍在，但本 range 未改该文件；去掉“本 SHA 新增”措辞。

## 未扩写

- `apply_patch` 省略空 `movePath`、`tools.ts` 复用 running `time.start`、processor thinking-dropped log：这批节点原先没有对应假话，按规则不扩写。

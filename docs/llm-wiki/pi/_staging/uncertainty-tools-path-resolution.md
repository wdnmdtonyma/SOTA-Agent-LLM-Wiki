# uncertainty: tools path resolution

- `resolveToolPath` naming drift: 当前 `5a073885` 源码和 `index.json` symbols 未找到 `resolveToolPath`; 实际工具侧入口是 `resolveToCwd()`、`resolveReadPath()`、`resolveReadPathAsync()` 和 `expandPath()`。节点正文已按源码写为 [U], 后续若有历史文档或未枚举 source 证明 `resolveToolPath` 是旧名/外部 API, 再补充来源。

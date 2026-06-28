# uncertainty: ref.tui.key-codes

batch: tui
node: ref.tui.key-codes
updated: 5a073885

本轮未登记需要同步到 `reference/uncertainty.md` 的 `[U]` 项。

保留为 `[I]` 的边界判断:

- `kpEnter` 是 `CODEPOINTS` 的内部 Kitty keypad Enter codepoint,但不是 `SpecialKey` 暴露的 key identifier;源码可证明 `CODEPOINTS.kpEnter` 存在并格式化为 `enter`,“不暴露单独 kpEnter identifier”是由 `SpecialKey` union 与 `formatParsedKey()` 共同推出的边界判断。
- `ARROW_CODEPOINTS` 与 `FUNCTIONAL_CODEPOINTS` 邻近 `CODEPOINTS`,但不在本任务指定 symbols 中;本节点只简要说明它们不是 `CODEPOINTS` 覆盖范围,未做逐实例 catalog。

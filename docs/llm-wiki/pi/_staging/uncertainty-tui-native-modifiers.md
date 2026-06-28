# uncertainty-tui-native-modifiers

- `packages/tui/src/native-modifiers.ts` 只暴露 native addon 的加载路径、runtime shape guard 和 failure fallback; `darwin-modifiers.node` 内部如何读取 macOS modifier state 未在该 TypeScript source 中呈现, 因此节点只把 native implementation detail 标为 [U]。

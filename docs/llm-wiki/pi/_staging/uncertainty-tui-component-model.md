# uncertainty-tui-component-model

本轮未记录 U 级不确定项。

## 降级为 [I] 的判断

- `TUI extends Container` 说明 runtime 复用 `Container.render()` 的 child aggregation 语义; 代码可见继承与调用链, 但“复用语义”是设计解释。
- component model 像 retained tree + immediate render function 的混合; `children` 与每帧 `render(width)` 可核, 分类术语是解释。
- `isFocusable()` 体现 structural typing 风格的 focus marker; 属性检查可核, 类型风格归纳是解释。
- `Container.render(width)` 是 vertical concatenation, 不是 flex/grid/layout engine; 顺序 append 可核, 排除其它 layout 语义是解释。
- input handler 只更新 state、由 TUI 触发后续 render; 转发后 `requestRender()` 可核, 对 component author 的职责描述是解释。
- component contract 极小、layout/diff/cursor/overlay 集中在 runtime; 各代码位置可核, 设计动机是解释。
- base component 需要自己控制 line width; crash guard 可核, 对作者责任的表达是解释。
- 普通 component 可以保持 render-only, 需要 focus 的 component 才实现 `focused`; interface 可核, 使用建议是解释。
- 未 focus 的 component 不会被 TUI 直接调用 `handleInput`; 当前实现只转发到 `focusedComponent`, 但“不会”限于这条 runtime path。
- `Container.invalidate()` 的 optional chaining 表明 runtime 对结构化对象有宽容度; 代码可核, 兼容性意图是解释。
- `subsys.tui.runtime` 与 `ref.tui.component-types` 的职责边界来自 index related 与节点命名, 相关节点文件本轮尚未存在。

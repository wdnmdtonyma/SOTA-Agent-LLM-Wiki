# uncertainty: surface.cli.overview

L1 填充后 `surface.cli.overview` 未新增 `[U]`。

已降级为 `[I]` 的内容:

- `install/remove/uninstall/update/list/config` 被归类为 CLI bootstrap surface,不是普通 agent turn surface;源码能证明它们在 `parseArgs` 前由 package/config handlers 处理,但"surface"归类是 wiki 分层判断。
- piped stdin 内容会在 runtime 创建后把 interactive 降级为 print;源码能证明赋值,但"不是最终模式的唯一输入"是对控制流的解释性总结。
- unknown long flags 是 extension-visible CLI input,不是 built-in `Args` 字段;源码能证明 unknownFlags 传入 `extensionFlagValues`,但 extension 消费语义需由 extension 节点继续展开。
- `--mode text` 被解析为合法 `Mode` 但没有专门 app-mode 分支;本节点把其行为解释为继续按 `--print` / TTY 规则选择模式。
- 本节点与 `spine.process-lifecycle`、`ref.coding-agent.cli-flags`、`surface.modes.interactive` 的 ownership 边界是 wiki 结构推断,不是单行源码事实。

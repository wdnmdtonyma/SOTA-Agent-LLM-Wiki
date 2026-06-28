# uncertainty-surface-modes-interactive

本轮核验 `surface.modes.interactive` 后未留下需要登记为 `[U]` 的源码不确定项；节点已通过并标记为 `status: verified`。

保留的 `[I]` 均为边界性或分层性归纳, 用于把源码事实压成 wiki 检索语义:

- `InteractiveMode` 不是直接创建 session 的 factory;它通过 `runtimeHost.session` 访问当前 session。
- built-in slash commands 在 submit handler 内 return, 不进入 `getUserInput()` 的普通 prompt queue。
- `onInputCallback`/`pendingUserInputs` 这个 callback queue 的作用是解耦 editor submit timing 和 `run()` 的 awaited prompt loop。
- related 节点的职责边界按 index title/source/symbols 与现有已填节点归纳;`subsys.tui.runtime` 本身仍是 planned。

# Uncertainty batch: session (3fd77ae980)

- `session-v2.projector` / `spine.v2-context-epoch`: `SessionContextEpoch.reset` 仍导出并会删除 epoch row,但当前 `packages/core` production path 没有 caller。`SessionProjector` 的 `Moved` 只更新 location fields,`RevertEvent.Committed` 删除 boundary 之后的 messages/inputs,两者都不再 reset epoch。无法从本轮源码确认这是有意让 destination Location 复用旧 baseline,还是漏掉的 call site。[U]

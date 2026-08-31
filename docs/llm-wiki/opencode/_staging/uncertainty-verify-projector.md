# uncertainty-verify-projector

- node: `session-v2.projector`
- SHA: `9f69463f1d`

## SessionContextEpoch.reset has no production caller

`SessionContextEpoch.reset` is exported at `packages/core/src/session/context-epoch.ts:111` and deletes the `session_context_epoch` row.

Production packages have no caller. `SessionProjector` `Moved` (`packages/core/src/session/projector.ts:242`) only updates `SessionTable` directory/path/workspace_id/time_updated. `RevertEvent.Committed` (`packages/core/src/session/projector.ts:413`) deletes later `session_message` rows and does not call `reset`.

`CONTEXT.md:118` still says moving a Session clears its active Context Epoch. Whether move/revert should reset epoch is unprovable from current call sites.

Already marked `[U]` in `subsystems/session-v2/projector.md`.

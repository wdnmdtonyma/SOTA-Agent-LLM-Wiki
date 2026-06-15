# uncertainty-r2t2

- `[cmd.feature-flagged]` `commands.ts` references feature-gated command implementations that are absent from the current source dump: `commands/proactive.js`, `commands/assistant/index.js`, `commands/remoteControlServer/index.js`, `commands/force-snip.js`, `commands/workflows/index.js`, `commands/subscribe-pr.js`, `commands/torch.js`, `commands/peers/index.js`, `commands/fork/index.js`, and `commands/buddy/index.js`. Only registry facts are documented; command metadata and behavior remain `[U]`.
- `[cmd.internal-only]` Many `INTERNAL_ONLY_COMMANDS` entries resolve to disabled hidden `name: 'stub'` objects in the current source dump. Their original internal command names, parameters, and behavior remain `[U]`.
- `[cmd.internal-only]` `agentsPlatform` is conditionally required from `commands/agents-platform/index.js` when `USER_TYPE === 'ant'`, but that implementation directory is absent from the current source dump. Its command metadata and behavior remain `[U]`.

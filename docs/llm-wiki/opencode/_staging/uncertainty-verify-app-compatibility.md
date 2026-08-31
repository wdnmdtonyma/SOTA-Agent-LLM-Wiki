# uncertainty-verify-app-compatibility

- node: `clients.app-compatibility`
- SHA: `9f69463f1d`

## current source turn order

- claim: current session source turn order is not resorted by timestamp or durable sequence; App layer does not prove that input order equals aggregate seq.
- status: still `[U]`
- inspected: `packages/app/src/pages/session/timeline/projection.ts:32-40` feeds `input.sessionMessages()` into `constructSessionMessageRows`, which walks source order (`rows.ts:47`).

## current PTY connect-token

- claim: active `connectToken()` only calls the legacy endpoint on protocol V1; current path returns `undefined` ticket. Source cannot prove ticketless current handshake succeeds.
- status: still `[U]`
- inspected:
  - `packages/app/src/components/terminal.tsx:560-586` V1-only live call; current branch is commented out
  - `packages/app/src/components/terminal.tsx:611-627` continues WebSocket open with optional ticket
  - `packages/app/V1_API_MIGRATION.md:193` checklist marks connect-token migrated

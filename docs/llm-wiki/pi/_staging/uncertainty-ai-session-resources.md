# Uncertainty: subsys.ai.session-resources

No unresolved `[U]` claims after L2 verification.

Inferred boundaries checked during L2:

- The registry itself has no per-session keying beyond passing `sessionId` into callbacks; this is inferred from the module-scope `Set<SessionResourceCleanup>` and the absence of any session map in `packages/ai/src/session-resources.ts`.
- `cleanupSessionResources(undefined)` only becomes "close all Codex WebSocket sessions" for Codex because `closeOpenAICodexWebSocketSessions` implements that behavior; the generic registry does not define that policy.
- The lifecycle ownership is cross-package: `pi-ai` owns the registry, while the visible session-lifecycle call site is `AgentSession` in `pi-coding-agent`.

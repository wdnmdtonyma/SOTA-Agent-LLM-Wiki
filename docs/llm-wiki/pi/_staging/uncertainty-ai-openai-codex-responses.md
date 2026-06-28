# Uncertainty: subsys.ai.openai-codex-responses

L2 verified with no unresolved `[U]` claims. Corrections made in the node:

- Tightened line anchors for `RequestBody`, cached WebSocket continuation, SSE retry/timeout behavior, stream event normalization, WebSocket idle-timeout failure, and the ordinary OpenAI Responses system-prompt comparison.
- Narrowed the WebSocket fallback claim: non-connection-limit Codex API/protocol errors are thrown, while connection-limit-before-start has its own retry/fallback path.
- Narrowed the cached-context gotcha: explicit `transport: "auto"`/`"websocket-cached"` enables `useCachedContext`, but actual delta rewriting requires compatible continuation state; an unset transport only defaults the outer WebSocket-vs-SSE selection.

Remaining `[I]` markers are boundary/rationale statements rather than unverifiable facts: node ownership vs shared normalizer coverage, session-resource ownership semantics beyond the local registration call, absence-style comparisons with ordinary OpenAI Responses, and cross-node scope boundaries.

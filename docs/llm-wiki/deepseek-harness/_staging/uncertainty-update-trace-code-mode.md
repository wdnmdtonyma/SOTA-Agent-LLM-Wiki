# uncertainty-update-trace-code-mode

- node: `spine.trace-code-mode`
- SHA: `477b4f4205`
- `dsh-agent-tool-presentation` JSDoc still says a PTC row against a deployment with no `ptcRuntime` “fails at mount, named in the preset's own activation audit”. `auditRows` only inspects static `fiber.inject` (the row lists `['tools']`, not `ptcRuntime`), so the dynamic `ctx.inject(['ptcRuntime'], …)` wait is invisible to that audit. The presentation spec asserts assemble stays native (`echo`) until a runtime plugin arrives. Keep as `[U]` until the JSDoc, mount audit, or wait inject list are aligned.

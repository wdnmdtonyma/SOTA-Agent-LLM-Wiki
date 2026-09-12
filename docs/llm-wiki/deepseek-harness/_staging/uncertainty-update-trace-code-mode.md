# uncertainty-update-trace-code-mode

- node: `spine.trace-code-mode`
- SHA: `c291e7961a`
- `dsh-agent-tool-presentation` JSDoc still says a PTC row against a deployment with no `codeRuntime` “fails at mount, named in the preset's own activation audit”. `inactiveRows` only inspects static `fiber.inject` (the row lists `['tools']`, not `codeRuntime`), so the dynamic `ctx.inject(['codeRuntime'], …)` wait is invisible to that audit. The presentation spec asserts assemble stays native (`echo`) until a runtime plugin arrives. Keep as `[U]` until the JSDoc, mount audit, or wait inject list are aligned.

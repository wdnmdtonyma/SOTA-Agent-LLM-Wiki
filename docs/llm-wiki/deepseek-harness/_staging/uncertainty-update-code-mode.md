# uncertainty-update-code-mode

- `inactiveRows` only inspects static `fiber.inject` (`['tools']` on `tool-presentation`). YAML/JSDoc still claim a missing `codeRuntime` fails the preset at mount and names that row. Tests: `row.await()` succeeds; assemble stays native (`echo`) until `StubRuntime` is plugged. Marked `[U]` on `subsys.core.code-mode`.

# Uncertainty: subsys.tui.terminal-capabilities

- [U] `setKittyProtocolActive` is listed in the node symbols, but the requested source list only includes `packages/tui/src/terminal.ts`; in that file it is imported and called, while its definition lives outside the node source. The node documents the terminal-side calls and links the parsing-side semantics to `subsys.tui.key-parsing` rather than expanding the definition file.

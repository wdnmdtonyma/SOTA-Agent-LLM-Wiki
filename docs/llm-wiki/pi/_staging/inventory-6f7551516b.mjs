#!/usr/bin/env node
// Recount Pi wiki catalogs at the frozen target checkout.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../pi")

function read(p) {
  return fs.readFileSync(path.join(SRC, p), "utf8")
}

function list(dir, pred) {
  const abs = path.join(SRC, dir)
  return fs.readdirSync(abs).filter(pred)
}

const allTs = read("packages/ai/src/providers/all.ts")
const builtin = [...allTs.matchAll(/^\s+([a-zA-Z0-9]+)Provider\(\),?$/gm)].map((m) => m[1])
const knownProvider = (read("packages/ai/src/types.ts").match(/export type KnownProvider =([\s\S]*?);/) || [])[1] || ""
const knownProviderIds = [...knownProvider.matchAll(/"([^"]+)"/g)].map((m) => m[1])
const knownApi = (read("packages/ai/src/types.ts").match(/export type KnownApi =([\s\S]*?);/) || [])[1] || ""
const knownApiIds = [...knownApi.matchAll(/"([^"]+)"/g)].map((m) => m[1])
const knownImageApi = [...((read("packages/ai/src/types.ts").match(/export type KnownImageApi =([\s\S]*?);/) || [])[1] || "").matchAll(/"([^"]+)"/g)].map((m) => m[1])
const knownClassifierApi = [...((read("packages/ai/src/types.ts").match(/export type KnownClassifierApi =([\s\S]*?);/) || [])[1] || "").matchAll(/"([^"]+)"/g)].map((m) => m[1])
const modelShards = list("packages/ai/src/providers", (n) => n.endsWith(".models.ts"))
const tools = read("packages/coding-agent/src/core/tools/index.ts")
const toolNames = [...(tools.match(/export type ToolName = ([^;]+);/) || ["", ""])[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
const rpc = read("packages/coding-agent/src/modes/rpc/rpc-types.ts")
const rpcTypes = [...rpc.matchAll(/type: "([a-z0-9_]+)"/g)].map((m) => m[1])
const ext = read("packages/coding-agent/src/core/extensions/types.ts")
const extEvents = (ext.match(/export type ExtensionEvent =([\s\S]*?);/) || [])[1] || ""
const extEventNames = [...extEvents.matchAll(/^\s*\| ([A-Za-z0-9]+)/gm)].map((m) => m[1])
const slash = read("packages/coding-agent/src/core/slash-commands.ts")
const slashNames = [...slash.matchAll(/name:\s*"(\/[a-z0-9-]+)"/g)].map((m) => m[1])
if (slashNames.length === 0) {
  // fallback: command table
}
const keyApp = read("packages/coding-agent/src/core/keybindings.ts")
const keyTui = read("packages/tui/src/keybindings.ts")
function countKeys(text) {
  // KEYBINDINGS / TUI_KEYBINDINGS object keys of form "foo.bar":
  const m = text.match(/(?:export const (?:KEYBINDINGS|TUI_KEYBINDINGS)[^=]*=\s*\{)([\s\S]*?)^\}/m)
  if (!m) return { n: -1, keys: [] }
  const keys = [...m[1].matchAll(/^\s*"?([A-Za-z0-9.]+)"?\s*:/gm)].map((x) => x[1])
  return { n: keys.length, keys }
}
const appKeys = countKeys(keyApp)
const tuiKeys = countKeys(keyTui)
const components = list("packages/coding-agent/src/modes/interactive/components", (n) => n.endsWith(".ts") || n.endsWith(".tsx"))
const tuiComp = list("packages/tui/src/components", (n) => n.endsWith(".ts") || n.endsWith(".tsx"))
const firstPkgs = list("packages", (n) => fs.statSync(path.join(SRC, "packages", n)).isDirectory())
const pkgJson = JSON.parse(read("package.json"))

console.log(JSON.stringify({
  version_coding_agent: JSON.parse(read("packages/coding-agent/package.json")).version,
  version_durable: JSON.parse(read("packages/durable/package.json")).version,
  workspaces: pkgJson.workspaces,
  first_packages: firstPkgs,
  build: pkgJson.scripts.build,
  builtinProviders: builtin.length,
  builtinProviderFactories: builtin,
  knownProvider: knownProviderIds.length,
  knownProviderIds,
  knownApi: knownApiIds.length,
  knownApiIds,
  knownImageApi,
  knownClassifierApi,
  modelShards: modelShards.length,
  modelShardFiles: modelShards.sort(),
  tools: toolNames.length,
  toolNames,
  rpcTypesUnique: [...new Set(rpcTypes)],
  rpcTypesCount: new Set(rpcTypes).size,
  extensionEvents: extEventNames,
  extensionEventCount: extEventNames.length,
  slashNames,
  slashCount: slashNames.length,
  appKeybindings: appKeys.n,
  tuiKeybindings: tuiKeys.n,
  interactiveComponents: components.length,
  tuiComponents: tuiComp.length,
  tuiComponentFiles: tuiComp,
}, null, 2))

# DeepSeek Harness vs Claude Code / Codex / Pi / OpenCode

- Date: 2026-08-13
- Subject: official DeepSeek Harness (`dsh`) public developer preview vs four coding-agent harnesses already mapped in this wiki
- DSH commit: `47f943859bef60e4160492346772ded9b24f765a` on `master`
- DSH version: `0.1.0-rc.5` (`package.json`)
- Repo created: 2026-08-13T11:56:32Z ([GitHub](https://github.com/deepseek-ai/deepseek-harness))

This note follows claims back to primary sources. Secondary press (APPSO / 爱范儿) is used only as a product-experience report and is labeled as such.

## 0. Identity: which "DeepSeek Harness"?

Three different things share the name:

| Thing | Owner | What it actually is |
|---|---|---|
| **Official DSH** | `deepseek-ai/deepseek-harness` | MIT TypeScript/Cordis agent runtime. This note. |
| V4-Flash changelog footnote | DeepSeek API docs 2026-07-31 | Benchmark runner: "DeepSeek Harness minimal mode (to be released soon)" |
| Community repos | `HenryZ838978/deepseek-harness`, `morlay/deepseek-harness`, etc. | Protocol adapters or OpenCode/Pi plugins. Not DeepSeek. |

The July 4 local gap list at `docs/deepseek-tool-gap-list.md` compared a **different** Rust agent (`/Users/makii/Project/deepseek/crates/ds-tools`). That codebase is not this repository.

## 1. Official facts

### 1.1 Product stance

From [README.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md):

- Open-source agent harness by DeepSeek AI.
- Architecture: **everything is a plugin**, powered by [Cordis](https://github.com/cordiverse/cordis) ([paper](https://github.com/cordiverse/paper): *A Programming Paradigm for Spatiotemporal Composability*).
- Status: **developer preview**. Compatibility-breaking changes are promised.
- License: MIT.
- Run: `npx @deepseek-ai/dsh web` → `http://127.0.0.1:3080`. The launcher **rejects `--host 0.0.0.0`**.
- Home: `$DSH_HOME`, else `~/.dsh`.
- Plugin discoverability topic: `dsh-plugin`.
- Issues and PRs are disabled; Discussions are enabled.
- No published docs hostname. `website/` is local VitePress (`pnpm docs:dev` → `:5173`). `https://docs.deepseek.com/harness/plugins` appears only as a test fixture.

### 1.2 Runtime

From root `package.json` and `AGENTS.md`:

- Node `^22.19.0 || >=24.0.0`, pnpm 11, TypeScript ESM.
- Workspace: `vendor/*` (vendored Cordis), `packages/*/*` (`@deepseek-ai/dsh-*`), `apps/*`, `website`, `python/`, `native/` (landlock).
- CI coverage gate: per-file 100% on `packages/*/*/src`.
- Pre-release: `SESSION_FORMAT_VERSION` stays `0` with **no compatibility promise**. SQLite uses monotonic `SCHEMA_VERSION`; backends reject old on-disk formats.

### 1.3 Benchmark coupling

DeepSeek API changelog 2026-07-31 and Hugging Face `deepseek-ai/DeepSeek-V4-Flash-0731`:

> For the Code Agent tasks among the public benchmarks, DeepSeek-V4-Flash-0731 is evaluated with the **minimal mode** of DeepSeek Harness (to be released) … `max` reasoning effort, `temperature = 1.0`, `top_p = 0.95`.

Shipped preset `apps/cli/config/agent-presets/minimal/agent.cordis.yml` matches that name: complete persona, **no compaction**, only persistent `bash` + `str_replace_editor`.

2026-08-13 changelog is V4-Pro GA + Responses API / Codex adapter. It does **not** announce DSH. The GitHub repo is the product announcement.

## 2. Architecture in one paragraph

A running `dsh` is an ordered Cordis plugin tree, not a privileged core with bolt-on plugins ([docs/architecture.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)):

1. **Profile** (`web` / `headless` templates): process-level composition. Bundles + `cordis.patch.yml` + home patch + `--patch`.
2. **Bundle** (`dsh-base`, `dsh-web-app`, `dsh-headless`): patch-layer distribution of plugin rows.
3. **Agent preset** (`minimal` / `standard` / `code` / `cordis`): per-session `agent.cordis.yml` mounted under an agent scope. Tools, persona, prompt sections. Must isolate any service it publishes.

After Web, there are two planes: **host** keeps registries / sandbox / persistence / subagent backends; **agent presets** mount per-session tools and persona. `dsh-web-app` disables the model-facing tool rows that `dsh-base` still keeps for a hypothetical single-session TUI.

Invariant: **model-visible ⟺ logged**. Anything that reaches a model request must be reconstructable from the append-only `SessionEvent` log. Compaction uses `surfaceOp: replace` (no delete op); original events stay. Checkpoints land **before** the model adapter sees a request and **before** a top-level tool body can side-effect (`packages/session/session-checkpoint-policy`).

Capability seams are three-role: Service Definition / Provider / Consumer. Swapping `ctx.fs` + `ctx.subprocess` to E2B moves Bash, PTY, and LSP together.

## 3. Peer identity (this wiki)

Wiki spine pass 2026-08-13 (Claude reverse-engineered; Codex `@7750465934`; Pi `@305c014dcc`; OpenCode `@89130db6b0`):

| Harness | Wiki | Language | Openness | Distinctive spine |
|---|---|---|---|---|
| Claude Code | `docs/llm-wiki/claude/` | TypeScript (decompiled; wiki ~1884 files / ~513K LOC) | reverse-engineered | `main()` → `queryLoop()` → `Tool` contract; ~57 surface tools, 27 `HookEvent`s; Ink TUI |
| Codex | `docs/llm-wiki/codex/` | Rust (`codex-rs/` 128 crates) | public | SQ/EQ: `Op` in, `EventMsg` out; `apply_patch` + unified exec; first-class OS sandbox |
| Pi | `docs/llm-wiki/pi/` | TypeScript monorepo (9 packages) | public | `pi-ai` / `pi-agent-core` / `pi-coding-agent`; 7 built-ins (often 4 active); **no in-core MCP / subagent / OS sandbox** |
| OpenCode | `docs/llm-wiki/opencode/` | Bun/TS/Effect (~36 packages) | public | V1 AI-SDK loop still default; V2 event-sourced kernel; **ACP** among the original four; GPT-gated `apply_patch` |
| DSH | this note | TypeScript + vendored Cordis | public preview | everything is a plugin, including the loop and the Web UI |

## 4. Comparison by axis

### 4.1 Product thesis

| | Thesis |
|---|---|
| **Claude Code** | Ship a complete coding employee: TUI/REPL, 50+ tools, swarm, hooks, MCP, cron, browser, worktrees. |
| **Codex** | Ship a protocol runtime (SQ/EQ) that TUI / exec / IDE / MCP / cloud all sit on. Ready-to-use agent with a typed extension registry. |
| **Pi** | Ship a *reusable* agent runtime plus a minimal coding-agent product. "Many agents, this one is yours" via TypeScript extensions. |
| **OpenCode** | Ship a multi-surface coding product (TUI/desktop/web) with plugins/MCP, while migrating the kernel to durable V2. |
| **DSH** | Ship an *assembly runtime*. The product is the composition system. Users assemble many Codex-like agents; the agent can rewrite the runtime (`cordis` preset). |

APPSO (2026-08-13): "Codex 尝试交付一个拿来即用的 Agent。DeepSeek Harness 更像一套组装 Agent 的运行时。" That matches `docs/architecture.md` ("There is no privileged core to patch").

### 4.2 Loop / session / compaction

| | Loop | Durable log | Compaction |
|---|---|---|---|
| Claude | `queryLoop` while; tool_use blocks, not `stop_reason` | messages in process + session files | auto-compact / microcompact / collapse inside the loop |
| Codex | `submission_loop` → `RegularTask` → `run_turn` | rollout / EQ events | pre-sampling compaction |
| Pi | `runAgentLoop` in `pi-agent-core` | session tree (optional SQLite) | compaction + branch summaries in core |
| OpenCode V1 | `SessionPrompt.runLoop` → `SessionProcessor` → `LLM.stream` | V1 messages; EventV2Bridge dual-write | overflow compaction |
| OpenCode V2 | `SessionRunner` + EventV2 | event-sourced, admission durable | designed into V2 |
| **DSH** | `ctx.agentLoop` is itself a plugin. Turn = 0..n steps. Inbox: `followup` / `steer` / `inject`. Checkpoint **before** `llm/stream` and **before** tool body | append-only `SessionEvent`; `deriveMessages()` projects model history | `surfaceOp: replace` only (no delete). `replaceGeneration` bumps. Default `thresholdRatio: 0.8` / `retainRatio: 0.16` |

DSH is closest to OpenCode V2 / Codex on "log is truth", and unique in making the **loop replaceable from config**.

### 4.3 Extension model

| | What a plugin can change | Depth |
|---|---|---|
| Claude | hooks (many lifecycle events), MCP, skills, plugins dir | product hooks; core loop not user-replaceable |
| Codex | Rust `ext/` contributors (tools, MCP, prompt, lifecycle) + portable plugin.json (skills/MCP/hooks). Portable plugins do **not** load new Rust crates | two-layer; native ext is compile-time |
| Pi | TypeScript extensions: tools, model request, session behavior, TUI | deepest among "coding agent products"; still a coding-agent shell |
| OpenCode | plugin API + MCP + experimental Code Mode | V1 plugin/MCP glue; V2 still migrating |
| **DSH** | model adapter, tool registry, session log, **agent loop**, sandbox, FS, shell, UI mount points, client HMR. Registrations are reversible effects | whole product is a plugin tree. UI is a second plugin tree |

Pi vs DSH (APPSO + source): Pi lets you extend *a* coding agent. DSH lets you recompose *the product*. The `cordis` preset adds `cordis_define` / `cordis_run` / `cordis_inspect_*` so the model authors plugins against the live runtime. Trust model: "treat a session on this preset as shell access."

### 4.4 Surfaces

| | TUI | Web | Headless / print | IDE / ACP | SDK |
|---|---|---|---|---|---|
| Claude | REPL TUI (primary) | — | `--print` | VS Code / deeplink | SDK URL |
| Codex | TUI crate | — | exec | app-server | TS + Python SDK |
| Pi | differential TUI (primary) | experimental server | print / RPC | remote session protocol | `pi-agent-core` as library |
| OpenCode | OpenTUI+Solid | web + desktop + console | `run` | **ACP** (`opencode acp`) | SDK + server |
| **DSH** | not a shipped profile (`dsh --profile tui` is documented as "if installed") | **primary**: `dsh web` | `dsh --profile headless` | ACP server package | TS JSON-RPC + **Python SDK** |

Among the original four wiki harnesses, **only OpenCode documents ACP**. DSH also ships `packages/acp/acp` (JSON-RPC stdio). DSH ACP is **fresh-session only**: no resume/fork, committed text only, baseline prompt. The `dsh --profile tui` example is a **custom** profile (`dsh plugin --profile tui add github:deepseek-harness/turtle-ui`); there is no TUI package in this repo. DSH is the only one of the five whose default install path is a **local Web GUI**, not a terminal.

### 4.5 Tools (shipped / built-in)

Pi built-ins (wiki `ref.tools-catalog`): `read`, `bash`, `edit`, `write`, `grep`, `find`, `ls`. Default active set is often 4 (`read`/`bash`/`edit`/`write`).

Claude wiki catalogs **57** surface tools. Codex wiki catalogs **37** nodes around `spec_plan::build_tool_router`. OpenCode V1 registry is ~16 resident slots plus MCP/plugin; **GPT models** (`modelID` contains `gpt-` but not `oss` / `gpt-4`) expose `apply_patch` and **hide** `edit`/`write`.

OpenCode V1 built-ins: `bash`, `read`, `glob`, `grep`, `edit`, `write`, `task`, `webfetch`, `todowrite`, `websearch`, `skill`, `apply_patch`, optional `execute` / `lsp` / `plan_exit` / `question`.

DSH generated [tool-catalog.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/tool-catalog.md) (default configs; not every tool is in every preset):

| Family | Names |
|---|---|
| FS | `read`, `read_image`, `write`, `edit`, `glob`, `grep`, `str_replace_editor` |
| Shell | `bash` (one-shot or persistent), `pwsh` |
| Terminal | `terminal_open/list/read/send/signal/close` — **opt-in, not in shipped presets** |
| Jobs | `job_list`, `job_output`, `job_kill` |
| Plan / todo / goal | `exit_plan_mode`, `todo_write`, `create_goal`, `get_goal`, `update_goal` |
| Subagent | `subagent`, `subagent_fork`, `send_message`, `interrupt_agent`, `list_agents`, `report` |
| Workflow | `workflow`, `ralph` |
| Web | `web_search` (shipped), `web_fetch` (**off**; SSRF unfinished) |
| Skill / ask | `skill`, `ask_user_question` |
| Code Mode | `run_code` |
| LSP | `lsp` (4 ops) — **opt-in, not in shipped presets** |
| Session query | `session_search`, `session_trace`, `session_event_*` — **opt-in** |
| Schedule | `schedule_create/list/delete` — **opt-in** |
| Self-mod | `cordis_define`, `cordis_run`, `cordis_stop`, `cordis_undefine`, `cordis_inspect_{list,query,self}` — **no `cordis_mount` / `cordis_unmount`** |

`web_search` is **not** a standalone search API: `dsh-web-search-deepseek` makes a full auxiliary Anthropic-compatible Messages call with server tool `web_search_20250305`. Credentials: `DEEPSEEK_API_KEY`. Base URL is `$DEEPSEEK_SEARCH_BASE_URL` or `https://api.deepseek.com/anthropic/v1`, **not** `$DEEPSEEK_BASE_URL`.

Missing vs Codex/OpenCode: **no first-class `apply_patch`**. DSH uses `edit`/`write` plus optional `str_replace_editor` (minimal / Anthropic-style). Persistent PTY exists as `ctx.terminals` and as `dsh-tool-bash-persistent` (minimal's `bash`); the six `terminal_*` tools are product-present but not in shipped presets.

### 4.6 Multi-agent

| | Mechanism |
|---|---|
| Claude | `Agent`/`Task` + swarm (tmux / iTerm / in-process backends; TeamCreate/SendMessage) |
| Codex | MultiAgent V2: `spawn_agent` / `send_message` / `followup_task` / `wait` / `interrupt` / `list`; child thread + `parent_turn_id`; plaintext/encrypted envelopes |
| Pi | no built-in subagent tool; extensions can add. Remote session server/client is the wiki's multi-session story, not teammate spawn |
| OpenCode | V1 `task` + `subagent_type` (optional experimental background). **V2 builtins have not ported Task** |
| **DSH** | `ctx.subagents` providers: in-process spawn, in-process fork, ACP, DSH SDK subprocess. Control tools: send/interrupt/list. `workflow` JS orchestrator. `ralph` fresh-agent loop. `goal` same-session continuation. Codex / Claude Code **packages exist** (`dsh-subagent-codex`, `dsh-subagent-claude-code`) |

Shipped `standard`/`code`/`cordis` enable spawn + fork. Codex/Claude Code **tool rows are `disabled: true` in presets**, but after `feat/npm-public` they are **not in `dsh-base` either** (`packages/bundle/base/cordis.patch.yml` has 0 rows; `base.spec.ts` asserts this). Older Agent Notes that say "every shipped profile loads dormant backends in the host" are **stale**. To turn them on: (1) insert the provider plugin yourself, (2) copy the preset and drop `disabled`. Codex talks to `codex app-server --stdio`; Claude talks to `@anthropic-ai/claude-agent-sdk@0.3.220` + `claude` on PATH. `inheritsParentContext: false`. Unattended decline/cancel (no approval UI).

### 4.7 Permissions / sandbox

| | Model |
|---|---|
| Claude | layered permission modes (`default` / `acceptEdits` / `bypass` / `dontAsk` / `plan` + internal auto/bubble); rules, hooks, auto classifier, filesystem carve-outs. Sandbox appears as a permission/Bash/UI surface, not a standalone OS-sandbox crate in the wiki |
| Codex | **first-class OS sandbox**: Seatbelt / Linux seccomp(+bwrap) / Windows restricted token. `SandboxManager` maps permission profile → `SandboxExecRequest`. Approval policy + execpolicy DSL + guardian |
| Pi | **no built-in OS sandbox**. Process runs as the launching user. **Project trust is an input-loading gate** (settings/extensions/skills), not an execution sandbox. Isolation is user-supplied (container / Gondolin / OpenShell) |
| OpenCode | in-process `ask\|allow\|deny` with wildcard last-match-wins; `always` is **not** persisted to disk. Worktree used as agent sandbox narrative, not Codex-grade multi-OS host |
| **DSH** | `ctx.sandbox` + `ctx.sandboxPolicy`. Sandbox covers **file side effects only** — not network or process visibility. Modes: `read-only` / `workspace-write` (default new session) / `danger-full-access` (bypasses confinement, never calls `ctx.sandbox`). Local runner (`dsh-sandbox-local`): Linux **bwrap first, then Landlock**; **macOS Seatbelt** (`sandbox-exec`); Windows ACL restricted token. Unavailable → `SANDBOX_UNAVAILABLE`, **never silent unsandboxed**. Landlock/Windows may report `enforcement: 'partial'`. Approval: `ask` \| `never`; grant is `allowed-once` (**no allow-always**). No answerer → fail closed. E2B POC swaps the whole fs+subprocess world |

Correction vs an earlier draft of this note: Pi does **not** ship bash OS-sandbox as a product kernel. The wiki's `surface/misc/security.md` is explicit. DSH is closer to Codex's OS-sandbox ceiling than the first write-up implied (Seatbelt on macOS, bwrap on Linux), with a narrower scope (files only) and a louder fail.

### 4.8 Skills / MCP / hooks

| | Skills | MCP | Hooks |
|---|---|---|---|
| Claude | `Skill` tool + SKILL.md (disk/plugin/bundled/MCP) | first-class + resource tools (stdio/sse/http/ws/sdk/IDE) | **27** `HookEvent`s (command/prompt/agent/http/callback/function) |
| Codex | skills ext + dynamic selector | MCP namespace + resource tools | Claude-style lifecycle (~11 event keys); discovery currently mainly **command** handlers |
| Pi | skills in agent-core; gated by project trust | **none built-in** (wiki has no MCP subsystem) | agent-core tool hooks + extension event handlers (not a `hooks.json` host) |
| OpenCode | `skill` tool (V1/V2); model reads full SKILL.md on demand | V1 client (stdio/HTTP/SSE/OAuth) injects SessionTools | plugin hooks (~20 V1 Promise hooks), not Claude-style external `hooks.json` |
| **DSH** | `ctx.skills` + `skill` tool. Scan: `<project>/.dsh/skills`, `.agents/skills`, `$DSH_HOME/skills`, `~/.agents/skills` | `mcp-client` (stdio or streamable-http). Names `mcp__<server>__<raw>` like Claude/Codex. **No servers by default.** Tools only — no Resources/Prompts | Native = Cordis listeners. **Bridges** replay Claude Code `hooks.json` and Codex hooks onto the same interception points |

### 4.9 Models / providers

| | Default | Multi-provider |
|---|---|---|
| Claude | Anthropic only (product) | not the point |
| Codex | OpenAI / Responses | model_provider config; OSS path |
| Pi | 38+ static catalogs, 10 wire protocols | **the** point of `pi-ai` |
| OpenCode | many providers via AI SDK + native `packages/llm` | first-class |
| **DSH** | `@deepseek-ai/dsh-llm-deepseek`, route **`deepseek-official`** (distinct from pi-ai's `deepseek`). Default model `deepseek-v4-flash`. `reasoningEffort`: `off \| high \| max`, omit → `high`. Stream-only | **`dsh-llm-pi-ai` always loads**, but with **zero routes** until Settings → Models adds a profile. Allowed hand-written protocols: `openai-completions` / `openai-responses` / `anthropic-messages`. Cannot describe Bedrock SigV4 / Vertex ADC / Azure api-version / **Codex OAuth** via that config shape |

This is the strongest Pi↔DSH coupling: DSH did not reimplement the provider zoo; it consumed Pi's. Twin-adapter decision: 2026-06-13 Agent Note.

### 4.10 Code Mode

| | Status |
|---|---|
| OpenCode | experimental `execute` / `packages/codemode`; MCP tools as JS tree |
| **DSH** | first-class `code` preset: `run_code` is the **only** wire tool; other tools become a generated TypeScript SDK. Nested calls re-enter the full guarded pipeline |
| Others | not a product mode |

### 4.11 Plan / goal / Ralph

DSH splits three continuation styles that peers mix:

- **Plan mode**: explore-only; `exit_plan_mode` for human approve (Claude / OpenCode analogue). Tool catalog stays constant across modes (KV cache).
- **Goal**: same-session autonomous rounds (`create_goal` / `update_goal`). Phase `active\|paused\|blocked\|complete`. Activation `armed\|disarmed` is **not** persisted; resume does **not** auto-continue.
- **Ralph**: *fresh* child each round, no conversation seed; workspace + bounded handoff. Preset `maxRounds: 64`; tool default 256.

### 4.12 Default shipped presets

From `apps/cli/config/agent-presets/`:

| id (dir) | `preset.yml` name | Intent | Notable omissions |
|---|---|---|---|
| `minimal` | 极简模式 | benchmark / smallest agent | no compaction, no skills, no subagent, no web, no todo; persistent bash + str_replace_editor; complete persona; **own `isolate.fs`**, editor wants absolute paths |
| `standard` | 标准模式 (Web default) | full coding agent | one-shot bash/pwsh, fs, jobs, skills, goals, plan, compaction, spawn/fork, workflow, ralph, ask_user, todo, web_search (fetch off). No terminal_*/lsp/schedule/session-query |
| `code` | **PTC 模式** | standard + Code Mode | `dsh-agent-tool-presentation` `mode: code`. `run_code` is the only wire tool |
| `cordis` | 创造模式 | standard + self-modification, **for authoring other presets** | `tool-cordis` + composition-authoring skills. Dynamic packages live in memory only. Do not edit shipped presets |

## 5. Similarities (the 2026 coding-agent consensus)

All five, including DSH, have converged on:

1. Turn loop: assemble prompt + tools → stream → execute tools → continue.
2. Workspace-scoped FS + shell as the kernel tools.
3. Permission / sandbox around destructive ops.
4. Session persistence and some compaction story.
5. Skills as SKILL.md-shaped on-demand instructions (Pi/DSH/Claude/OpenCode/Codex).
6. MCP as the external-tool bus (Pi is the holdout in-core).
7. Subagents for context isolation (Pi again the holdout).

DSH does not invent the coding-agent *job*. It invents a **composition kernel** that can host that job, other jobs, and other products' agents.

## 6. Differences that actually matter

1. **Replaceable core vs product core.** Claude/Codex/OpenCode have a privileged loop. Pi extracts a reusable loop into `pi-agent-core` but still ships one product shell. DSH's loop is a plugin row.
2. **Web-first vs TUI-first.** DSH's happy path is a browser workbench. The others are terminal natives (OpenCode also has desktop/web).
3. **Event log as model context.** DSH and OpenCode V2 treat the log as the projection source. Claude/Pi keep a live message array as the working set.
4. **Meta-harness (packages exist; host does not load them).** DSH *can* spawn Claude Code and Codex as subagent backends and replay their hook files, but after the public npm cut those providers are **not** dormant-loaded in `dsh-base`. None of the others even ship the packages.
5. **Pi as a library inside DSH.** `llm-pi-ai` is an official DeepSeek package depending on `@earendil-works/pi-ai`.
6. **Self-hosting.** `cordis` preset + HMR client plugins: the agent authors UI and tools at runtime. Pi extensions are the closest prior art, but they are load-time TS modules, not a live vm-mounted plugin with inspect/rollback.
7. **Sandbox spectrum.** Codex is still the ceiling (Seatbelt/seccomp/bwrap + execpolicy DSL + guardian). DSH is now clearly in the same family: macOS Seatbelt, Linux bwrap-then-Landlock, Windows ACL — but **files only**, `allowed-once` (no always), fail-loud if the sandbox binary is missing. Claude/OpenCode are permission-first. **Pi has no in-core execution sandbox** — project trust only gates loading.
8. **Engineering bar.** Generated catalogs with completeness guards, bilingual docs with budgets, per-file 100% coverage, fail-loud config. This is closer to Codex's crate discipline than to a weekend agent.
9. **Maturity.** DSH is day-0 preview (`SESSION_FORMAT_VERSION = 0`). Claude/Codex/Pi/OpenCode are production-used. Breaking changes are an explicit policy.
10. **No apply_patch.** If your model was post-trained on Codex patch grammar, DSH's `edit`/`write` is a different dialect. Minimal mode even uses `str_replace_editor`.
11. **Contribution surface.** GitHub issues/PRs disabled at launch; Discussions only. Plugin ecosystem is `#dsh-plugin`.

## 7. When to use which

| Need | Pick |
|---|---|
| Best out-of-box coding TUI, Anthropic models | Claude Code |
| Rust protocol runtime, IDE, apply_patch, OpenAI | Codex |
| Minimal, hackable, your own agent, multi-provider | Pi |
| Open-source product with TUI+desktop, plugins, many models | OpenCode |
| Assemble multiple agent *products*, replayable logs, Web workbench, DeepSeek-native + on-demand Pi providers. Hosting Claude/Codex as children requires inserting the provider yourself | **DSH** |
| Reproduce DeepSeek's published agent scores | DSH `minimal` + V4 Flash/Pro `max` effort, T=1.0, top_p=0.95 |

## 8. Sources

### DSH (primary)

- https://github.com/deepseek-ai/deepseek-harness
- `README.md`, `README.zh.md`, `AGENTS.md`, `package.json`, `BENCHMARK.md`
- `docs/architecture.md`, `docs/agent-lifecycle.md`, `docs/capability-seams.md`, `docs/tool-catalog.md`
- `docs/user/guide/index.md`, `docs/user/guide/providers.md`
- `apps/cli/README.md`
- `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`
- `packages/bundle/base/cordis.patch.yml`, `packages/bundle/web-app/cordis.patch.yml`
- `packages/sandbox/`, `packages/session/session-checkpoint-policy/README.md`
- `packages/extensions/tool-cordis/`
- `packages/llm/README.md`, `packages/llm/llm-pi-ai/README.md`
- `packages/preset/README.md`, `packages/mcp/README.md`, `packages/hooks/README.md`

Source conflict, resolved in favor of current patch/tests: `.agents/notes/implemented/architecture/2026-08-10-product-subagent-providers-in-shared-host.md` and `packages/bundle/base/README.md` still say Codex/Claude Code load dormant in every host. `cordis.patch.yml` + `base.spec.ts` after `feat/npm-public` say they do not.

### DeepSeek model/API

- https://api-docs.deepseek.com/updates/ (2026-07-31, 2026-08-13)
- https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731

### This wiki

- `docs/llm-wiki/claude/README.md`, `spine/overview.md`, `spine/agent-loop.md`, `subsystems/{hooks-feature,plugins,permissions,swarm,skills,mcp}.md`
- `docs/llm-wiki/codex/README.md`, `spine/{overview,sq-eq-architecture,extension-system,context-and-compaction}.md`, `subsystems/exec-sandbox/overview.md`
- `docs/llm-wiki/pi/README.md`, `spine/{overview,layered-architecture,extension-lifecycle}.md`, `surface/misc/security.md`, `surface/trust/model.md`, `reference/tools-catalog.md`
- `docs/llm-wiki/opencode/README.md`, `spine/{overview,v1-v2-relationship,v2-overview}.md`, `subsystems/{tools/v1,integrations/acp,integrations/mcp-client,execution/permissions-v1}.md`

### Secondary (experience, not spec)

- APPSO / 爱范儿 首发体验, 2026-08-13 20:54 CST — beta UI, ~300 community plugins, Three.js harness A/B. Treat as product report; confirm against source above.

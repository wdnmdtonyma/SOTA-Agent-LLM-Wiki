---
id: ref.env-vars
title: 环境变量目录
kind: reference
tier: T3
path: reference/env-vars.md
source: [utils/env.ts]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `utils/env.ts` 聚合环境探测：配置文件路径、terminal/IDE/SSH/WSL/CI/cloud/container detection、runtime/package-manager detection 和 analytics host platform override。

## 能回答的问题

- `CLAUDE_CONFIG_DIR` 如何影响全局 Claude config 文件路径？
- `utils/env.ts` 如何识别 Cursor、Windsurf、JetBrains、Ghostty、tmux、screen、SSH、WSL？
- 哪些 env var 会把 deployment environment 判为 codespaces/gitpod/vercel/aws/gcp/ci/docker？
- `env` export 暴露哪些 detection helper？
- analytics host platform override 用哪个 env var？

## Exported symbols

| symbol | 签名/形状 | 含义 | 定义处 |
|---|---|---|---|
| `getGlobalClaudeFile` | memoized `() => string` | 如果 legacy `.config.json` 存在则返回 legacy path；否则使用 `.claude${fileSuffixForOauthConfig()}.json`，目录来自 `CLAUDE_CONFIG_DIR || homedir()`。[E: utils/env.ts:14][E: utils/env.ts:17][E: utils/env.ts:24][E: utils/env.ts:25] | `utils/env.ts` |
| `JETBRAINS_IDES` | IDE slug array | bundle id detection 用的 JetBrains IDE slug 列表。[E: utils/env.ts:115] | `utils/env.ts` |
| `detectDeploymentEnvironment` | memoized `() => string` | 识别 cloud dev、cloud platform、CI/CD、container 和 OS fallback。[E: utils/env.ts:240][E: utils/env.ts:242][E: utils/env.ts:285][E: utils/env.ts:300] | `utils/env.ts` |
| `env` | object | export 汇总 internet access、CI、platform、arch、node version、terminal、SSH、package managers、runtimes、Bun、WSL、Conductor、deployment detection。[E: utils/env.ts:316][E: utils/env.ts:318][E: utils/env.ts:319][E: utils/env.ts:322][E: utils/env.ts:323][E: utils/env.ts:324][E: utils/env.ts:325][E: utils/env.ts:326][E: utils/env.ts:327][E: utils/env.ts:328][E: utils/env.ts:329][E: utils/env.ts:330][E: utils/env.ts:331][E: utils/env.ts:332] | `utils/env.ts` |
| `getHostPlatformForAnalytics` | `() => Platform` | `CLAUDE_CODE_HOST_PLATFORM` 为 `win32`/`darwin`/`linux` 时覆盖 analytics host platform，否则返回 detected platform。[E: utils/env.ts:341][E: utils/env.ts:342][E: utils/env.ts:344][E: utils/env.ts:346] | `utils/env.ts` |

## Config 与 runtime 探测变量

| env var / signal | 命中结果 | 说明 | 定义处 |
|---|---|---|---|
| `CLAUDE_CONFIG_DIR` | config home override | `getGlobalClaudeFile` 使用 `CLAUDE_CONFIG_DIR || homedir()` 拼接 `.claude*.json`。[E: utils/env.ts:25] | `utils/env.ts` |
| filesystem `.config.json` | legacy global config | 如果 `getClaudeConfigHomeDir()/.config.json` 存在，优先返回 legacy fallback。[E: utils/env.ts:17][E: utils/env.ts:18][E: utils/env.ts:21] | `utils/env.ts` |
| commands `npm`, `yarn`, `pnpm` | package managers list | `detectPackageManagers` 通过 `which` 检查三种 package manager 是否可用。[E: utils/env.ts:40][E: utils/env.ts:43][E: utils/env.ts:49][E: utils/env.ts:52][E: utils/env.ts:53][E: utils/env.ts:54] | `utils/env.ts` |
| commands `bun`, `deno`, `node` | runtimes list | `detectRuntimes` 通过 `which` 检查三种 runtime 是否可用。[E: utils/env.ts:40][E: utils/env.ts:43][E: utils/env.ts:59][E: utils/env.ts:62][E: utils/env.ts:63][E: utils/env.ts:64] | `utils/env.ts` |
| `/proc/sys/fs/binfmt_misc/WSLInterop` | WSL | `isWslEnvironment` 通过 WSLInterop 文件判断 WSL。[E: utils/env.ts:73][E: utils/env.ts:77] | `utils/env.ts` |
| npm path starts `/mnt/c/` | Windows npm in WSL | `isNpmFromWindowsPath` 在 WSL 内通过 `findExecutable('npm')` 路径判断 npm 是否来自 Windows filesystem。[E: utils/env.ts:89][E: utils/env.ts:97][E: utils/env.ts:100] | `utils/env.ts` |
| `__CFBundleIdentifier === 'com.conductor.app'` | Conductor | `isConductor()` 用 macOS bundle id 判定 Conductor。[E: utils/env.ts:111][E: utils/env.ts:112] | `utils/env.ts` |
| `stdout.isTTY === false` | non-interactive terminal fallback | terminal detection 未命中其它规则且 stdout 非 TTY 时返回 `non-interactive`。[E: utils/env.ts:231] | `utils/env.ts` |

## Terminal/IDE detection 变量

| env var / signal | 返回值 | 说明 | 定义处 |
|---|---|---|---|
| `CURSOR_TRACE_ID` | `cursor` | Cursor 直接检测。[E: utils/env.ts:136] | `utils/env.ts` |
| `VSCODE_GIT_ASKPASS_MAIN` includes `cursor` | `cursor` | Cursor/Windsurf under WSL 可能表现为 VS Code terminal，该变量用于细分。[E: utils/env.ts:138][E: utils/env.ts:139] | `utils/env.ts` |
| `VSCODE_GIT_ASKPASS_MAIN` includes `windsurf` | `windsurf` | Windsurf detection。[E: utils/env.ts:141][E: utils/env.ts:142] | `utils/env.ts` |
| `VSCODE_GIT_ASKPASS_MAIN` includes `antigravity` | `antigravity` | Antigravity detection。[E: utils/env.ts:144][E: utils/env.ts:145] | `utils/env.ts` |
| `__CFBundleIdentifier` includes `vscodium` | `codium` | macOS bundle id 识别 VSCodium。[E: utils/env.ts:147][E: utils/env.ts:148] | `utils/env.ts` |
| `__CFBundleIdentifier` includes `windsurf` | `windsurf` | macOS bundle id 识别 Windsurf。[E: utils/env.ts:149] | `utils/env.ts` |
| `__CFBundleIdentifier` includes `com.google.android.studio` | `androidstudio` | macOS bundle id 识别 Android Studio。[E: utils/env.ts:150] | `utils/env.ts` |
| `__CFBundleIdentifier` includes a `JETBRAINS_IDES` slug | matching slug | 遍历 JetBrains IDE slugs 并返回命中的 slug。[E: utils/env.ts:152][E: utils/env.ts:153][E: utils/env.ts:154] | `utils/env.ts` |
| `VisualStudioVersion` | `visualstudio` | 区分 desktop Visual Studio，不是 VS Code。[E: utils/env.ts:158][E: utils/env.ts:160] | `utils/env.ts` |
| `TERMINAL_EMULATOR === 'JetBrains-JediTerm'` | `pycharm` | JetBrains terminal 在 Linux/Windows 返回 pycharm；macOS 已由 bundle id 处理。[E: utils/env.ts:164][E: utils/env.ts:166][E: utils/env.ts:169] | `utils/env.ts` |
| `TERM === 'xterm-ghostty'` | `ghostty` | Ghostty terminal detection。[E: utils/env.ts:174][E: utils/env.ts:175] | `utils/env.ts` |
| `TERM` includes `kitty` | `kitty` | Kitty terminal detection。[E: utils/env.ts:177][E: utils/env.ts:178] | `utils/env.ts` |
| `TERM_PROGRAM` | `TERM_PROGRAM` value | 通用 terminal program fallback。[E: utils/env.ts:181][E: utils/env.ts:182] | `utils/env.ts` |
| `TMUX` | `tmux` | tmux session detection。[E: utils/env.ts:185] | `utils/env.ts` |
| `STY` | `screen` | GNU screen detection。[E: utils/env.ts:186] | `utils/env.ts` |
| `KONSOLE_VERSION` | `konsole` | Konsole detection。[E: utils/env.ts:189] | `utils/env.ts` |
| `GNOME_TERMINAL_SERVICE` | `gnome-terminal` | GNOME Terminal detection。[E: utils/env.ts:190] | `utils/env.ts` |
| `XTERM_VERSION` | `xterm` | xterm detection。[E: utils/env.ts:191] | `utils/env.ts` |
| `VTE_VERSION` | `vte-based` | VTE-based terminal detection。[E: utils/env.ts:192] | `utils/env.ts` |
| `TERMINATOR_UUID` | `terminator` | Terminator detection。[E: utils/env.ts:193] | `utils/env.ts` |
| `KITTY_WINDOW_ID` | `kitty` | Kitty secondary detection。[E: utils/env.ts:194][E: utils/env.ts:195] | `utils/env.ts` |
| `ALACRITTY_LOG` | `alacritty` | Alacritty detection。[E: utils/env.ts:197] | `utils/env.ts` |
| `TILIX_ID` | `tilix` | Tilix detection。[E: utils/env.ts:198] | `utils/env.ts` |
| `WT_SESSION` | `windows-terminal` | Windows Terminal detection。[E: utils/env.ts:201] | `utils/env.ts` |
| `SESSIONNAME` + `TERM === 'cygwin'` | `cygwin` | Cygwin detection。[E: utils/env.ts:202] | `utils/env.ts` |
| `MSYSTEM` | lowercased value | MSYS/MINGW family detection。[E: utils/env.ts:203] | `utils/env.ts` |
| `ConEmuANSI`/`ConEmuPID`/`ConEmuTask` | `conemu` | ConEmu detection。[E: utils/env.ts:205][E: utils/env.ts:206][E: utils/env.ts:207][E: utils/env.ts:209] | `utils/env.ts` |
| `WSL_DISTRO_NAME` | `wsl-${name}` | WSL distro name terminal label。[E: utils/env.ts:213] | `utils/env.ts` |
| SSH vars | `ssh-session` | `SSH_CONNECTION`、`SSH_CLIENT`、`SSH_TTY` 任一存在时 `isSSHSession()` 为 true，terminal fallback 返回 `ssh-session`。[E: utils/env.ts:217][E: utils/env.ts:310][E: utils/env.ts:311][E: utils/env.ts:312] | `utils/env.ts` |
| `TERM` fallback | specific or raw TERM | 未命中其它 terminal 时，`TERM` 包含 alacritty/rxvt/termite 会返回对应名，否则返回 raw TERM。[E: utils/env.ts:222][E: utils/env.ts:224][E: utils/env.ts:225][E: utils/env.ts:226][E: utils/env.ts:227] | `utils/env.ts` |

## Deployment environment detection 变量

| env var / signal | 返回值 | 定义处 |
|---|---|---|
| `CODESPACES` truthy | `codespaces` | [E: utils/env.ts:242] |
| `GITPOD_WORKSPACE_ID` | `gitpod` | [E: utils/env.ts:243] |
| `REPL_ID` or `REPL_SLUG` | `replit` | [E: utils/env.ts:244] |
| `PROJECT_DOMAIN` | `glitch` | [E: utils/env.ts:245] |
| `VERCEL` truthy | `vercel` | [E: utils/env.ts:248] |
| `RAILWAY_ENVIRONMENT_NAME` or `RAILWAY_SERVICE_NAME` | `railway` | [E: utils/env.ts:250][E: utils/env.ts:253] |
| `RENDER` truthy | `render` | [E: utils/env.ts:255] |
| `NETLIFY` truthy | `netlify` | [E: utils/env.ts:256] |
| `DYNO` | `heroku` | [E: utils/env.ts:257] |
| `FLY_APP_NAME` or `FLY_MACHINE_ID` | `fly.io` | [E: utils/env.ts:258] |
| `CF_PAGES` truthy | `cloudflare-pages` | [E: utils/env.ts:259] |
| `DENO_DEPLOYMENT_ID` | `deno-deploy` | [E: utils/env.ts:260] |
| `AWS_LAMBDA_FUNCTION_NAME` | `aws-lambda` | [E: utils/env.ts:261] |
| `AWS_EXECUTION_ENV === 'AWS_ECS_FARGATE'` | `aws-fargate` | [E: utils/env.ts:262] |
| `AWS_EXECUTION_ENV === 'AWS_ECS_EC2'` | `aws-ecs` | [E: utils/env.ts:263] |
| `/sys/hypervisor/uuid` starts `ec2` | `aws-ec2` | [E: utils/env.ts:266][E: utils/env.ts:270] |
| `K_SERVICE` | `gcp-cloud-run` | [E: utils/env.ts:274] |
| `GOOGLE_CLOUD_PROJECT` | `gcp` | [E: utils/env.ts:275] |
| `WEBSITE_SITE_NAME` or `WEBSITE_SKU` | `azure-app-service` | [E: utils/env.ts:276][E: utils/env.ts:277] |
| `AZURE_FUNCTIONS_ENVIRONMENT` | `azure-functions` | [E: utils/env.ts:278] |
| `APP_URL` includes `ondigitalocean.app` | `digitalocean-app-platform` | [E: utils/env.ts:279][E: utils/env.ts:280] |
| `SPACE_CREATOR_USER_ID` | `huggingface-spaces` | [E: utils/env.ts:282] |
| `GITHUB_ACTIONS` truthy | `github-actions` | [E: utils/env.ts:285] |
| `GITLAB_CI` truthy | `gitlab-ci` | [E: utils/env.ts:286] |
| `CIRCLECI` | `circleci` | [E: utils/env.ts:287] |
| `BUILDKITE` | `buildkite` | [E: utils/env.ts:288] |
| `CI` truthy | `ci` | [E: utils/env.ts:289] |
| `KUBERNETES_SERVICE_HOST` | `kubernetes` | [E: utils/env.ts:292] |
| filesystem `/.dockerenv` exists | `docker` | [E: utils/env.ts:294] |
| `env.platform` fallback | `unknown-darwin`/`unknown-linux`/`unknown-win32` | [E: utils/env.ts:300][E: utils/env.ts:301][E: utils/env.ts:302] |

## Sources

- `utils/env.ts`

## 相关

- `ref.feature-flags` 覆盖 beta/feature/growthbook 逻辑中读取的 env kill switch；`ref.env-vars` 只以 `utils/env.ts` 的环境检测为权威范围。

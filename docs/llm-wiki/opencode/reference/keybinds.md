---
id: ref.keybinds
title: TUI Keybinds
kind: reference
tier: T3
v: na
source:
  - packages/tui/src/config/keybind.ts
symbols:
  - Definitions
  - CommandMap
  - KeybindOverrides
related:
  - tui.keybindings
evidence: explicit
status: verified
updated: 355a0bcf5
---

> TUI keybind catalog 由 181 个 `Definitions` 和 160 个 `CommandMap` entries 组成；未映射 command 的点号 key 多数是 dialog/prompt 内部绑定。

## 能回答的问题

- 每个 TUI keybind 的默认按键和描述是什么？
- 哪些 keybind 会映射到 command id？
- 用户配置如何被 schema 校验，未知 key 如何报错？

## Schema 和解析

`KeyStroke` 支持 `name` 以及 `ctrl`、`shift`、`meta`、`super`、`hyper` modifier [E: packages/tui/src/config/keybind.ts:8] [E: packages/tui/src/config/keybind.ts:9] [E: packages/tui/src/config/keybind.ts:10] [E: packages/tui/src/config/keybind.ts:14]。`BindingObject` 允许一个 `key` 携带可选 `event`、`preventDefault`、`fallthrough` 和任意扩展字段 [E: packages/tui/src/config/keybind.ts:17] [E: packages/tui/src/config/keybind.ts:19] [E: packages/tui/src/config/keybind.ts:20] [E: packages/tui/src/config/keybind.ts:22] [E: packages/tui/src/config/keybind.ts:24]。`BindingValueSchema` 允许 `false`、`"none"`、单个 binding item 或 binding item 数组 [E: packages/tui/src/config/keybind.ts:28] [E: packages/tui/src/config/keybind.ts:29] [E: packages/tui/src/config/keybind.ts:30] [E: packages/tui/src/config/keybind.ts:31] [E: packages/tui/src/config/keybind.ts:32]。

默认 leader 是 `ctrl+x`，`keybind()` helper 只把默认值和说明包装成 `Definition` [E: packages/tui/src/config/keybind.ts:41] [E: packages/tui/src/config/keybind.ts:43]。`KeybindOverrides` 由 `Definitions` 动态生成 schema，每个 key 都带对应 description annotation [E: packages/tui/src/config/keybind.ts:242] [E: packages/tui/src/config/keybind.ts:249]。`parse()` 会收集 unknown keys 并返回 `ConfigError`，因此配置文件中的未知 key 不会被静默忽略 [E: packages/tui/src/config/keybind.ts:443] [E: packages/tui/src/config/keybind.ts:444] [E: packages/tui/src/config/keybind.ts:445] [E: packages/tui/src/config/keybind.ts:456] [E: packages/tui/src/config/keybind.ts:457]。

## Definitions 和 CommandMap

| Key | Default | Description | CommandMap |
| --- | --- | --- | --- |
| `leader` | `LeaderDefault` [E: packages/tui/src/config/keybind.ts:46] | Leader key for keybind combinations | - |
| `app_exit` | `ctrl+c,ctrl+d,<leader>q` [E: packages/tui/src/config/keybind.ts:48] | Exit the application | `app.exit` [E: packages/tui/src/config/keybind.ts:254] |
| `app_debug` | `none` [E: packages/tui/src/config/keybind.ts:49] | Toggle debug panel | `app.debug` [E: packages/tui/src/config/keybind.ts:255] |
| `app_console` | `none` [E: packages/tui/src/config/keybind.ts:50] | Toggle console | `app.console` [E: packages/tui/src/config/keybind.ts:256] |
| `app_heap_snapshot` | `none` [E: packages/tui/src/config/keybind.ts:51] | Write heap snapshot | `app.heap_snapshot` [E: packages/tui/src/config/keybind.ts:257] |
| `app_toggle_animations` | `none` [E: packages/tui/src/config/keybind.ts:52] | Toggle animations | `app.toggle.animations` [E: packages/tui/src/config/keybind.ts:258] |
| `app_toggle_file_context` | `none` [E: packages/tui/src/config/keybind.ts:53] | Toggle file context | `app.toggle.file_context` [E: packages/tui/src/config/keybind.ts:259] |
| `app_toggle_diffwrap` | `none` [E: packages/tui/src/config/keybind.ts:54] | Toggle diff wrapping | `app.toggle.diffwrap` [E: packages/tui/src/config/keybind.ts:260] |
| `app_toggle_paste_summary` | `none` [E: packages/tui/src/config/keybind.ts:55] | Toggle paste summary | `app.toggle.paste_summary` [E: packages/tui/src/config/keybind.ts:261] |
| `app_toggle_session_directory_filter` | `none` [E: packages/tui/src/config/keybind.ts:56] | Toggle session directory filtering | `app.toggle.session_directory_filter` [E: packages/tui/src/config/keybind.ts:262] |
| `command_list` | `ctrl+p` [E: packages/tui/src/config/keybind.ts:57] | List available commands | `command.palette.show` [E: packages/tui/src/config/keybind.ts:263] |
| `help_show` | `none` [E: packages/tui/src/config/keybind.ts:58] | Open help dialog | `help.show` [E: packages/tui/src/config/keybind.ts:264] |
| `docs_open` | `none` [E: packages/tui/src/config/keybind.ts:59] | Open documentation | `docs.open` [E: packages/tui/src/config/keybind.ts:265] |
| `diff_close` | `escape,q` [E: packages/tui/src/config/keybind.ts:60] | Close diff viewer | `diff.close` [E: packages/tui/src/config/keybind.ts:266] |
| `diff_toggle` | `enter,space` [E: packages/tui/src/config/keybind.ts:61] | Toggle diff viewer item | `diff.toggle` [E: packages/tui/src/config/keybind.ts:267] |
| `diff_expand` | `right` [E: packages/tui/src/config/keybind.ts:62] | Expand diff viewer item | `diff.expand` [E: packages/tui/src/config/keybind.ts:268] |
| `diff_expand_all` | `E` [E: packages/tui/src/config/keybind.ts:63] | Expand all diff viewer folders | `diff.expand_all` [E: packages/tui/src/config/keybind.ts:269] |
| `diff_collapse` | `left` [E: packages/tui/src/config/keybind.ts:64] | Collapse diff viewer item | `diff.collapse` [E: packages/tui/src/config/keybind.ts:270] |
| `diff_switch_focus` | `tab` [E: packages/tui/src/config/keybind.ts:65] | Switch diff viewer focus | `diff.switch_focus` [E: packages/tui/src/config/keybind.ts:271] |
| `diff_next_hunk` | `]` [E: packages/tui/src/config/keybind.ts:66] | Jump to next diff hunk | `diff.next_hunk` [E: packages/tui/src/config/keybind.ts:272] |
| `diff_previous_hunk` | `[` [E: packages/tui/src/config/keybind.ts:67] | Jump to previous diff hunk | `diff.previous_hunk` [E: packages/tui/src/config/keybind.ts:273] |
| `diff_next_file` | `n` [E: packages/tui/src/config/keybind.ts:68] | Jump to next diff file | `diff.next_file` [E: packages/tui/src/config/keybind.ts:274] |
| `diff_previous_file` | `p` [E: packages/tui/src/config/keybind.ts:69] | Jump to previous diff file | `diff.previous_file` [E: packages/tui/src/config/keybind.ts:275] |
| `diff_toggle_file_tree` | `b` [E: packages/tui/src/config/keybind.ts:70] | Toggle diff viewer file tree | `diff.toggle_file_tree` [E: packages/tui/src/config/keybind.ts:276] |
| `diff_single_patch` | `s` [E: packages/tui/src/config/keybind.ts:71] | Toggle single patch view | `diff.single_patch` [E: packages/tui/src/config/keybind.ts:277] |
| `diff_switch_source` | `d` [E: packages/tui/src/config/keybind.ts:72] | Switch diff viewer source | `diff.switch_source` [E: packages/tui/src/config/keybind.ts:278] |
| `diff_toggle_view` | `v` [E: packages/tui/src/config/keybind.ts:73] | Toggle diff viewer split or unified view | `diff.toggle_view` [E: packages/tui/src/config/keybind.ts:279] |
| `diff_help` | `?` [E: packages/tui/src/config/keybind.ts:74] | Show more diff viewer shortcuts | `diff.help` [E: packages/tui/src/config/keybind.ts:280] |
| `editor_open` | `<leader>e` [E: packages/tui/src/config/keybind.ts:76] | Open external editor | `prompt.editor` [E: packages/tui/src/config/keybind.ts:281] |
| `theme_list` | `<leader>t` [E: packages/tui/src/config/keybind.ts:77] | List available themes | `theme.switch` [E: packages/tui/src/config/keybind.ts:282] |
| `theme_switch_mode` | `none` [E: packages/tui/src/config/keybind.ts:78] | Switch between light and dark theme mode | `theme.switch_mode` [E: packages/tui/src/config/keybind.ts:283] |
| `theme_mode_lock` | `none` [E: packages/tui/src/config/keybind.ts:79] | Lock or unlock theme mode | `theme.mode.lock` [E: packages/tui/src/config/keybind.ts:284] |
| `sidebar_toggle` | `<leader>b` [E: packages/tui/src/config/keybind.ts:80] | Toggle sidebar | `session.sidebar.toggle` [E: packages/tui/src/config/keybind.ts:285] |
| `scrollbar_toggle` | `none` [E: packages/tui/src/config/keybind.ts:81] | Toggle session scrollbar | `session.toggle.scrollbar` [E: packages/tui/src/config/keybind.ts:286] |
| `status_view` | `<leader>s` [E: packages/tui/src/config/keybind.ts:82] | View status | `opencode.status` [E: packages/tui/src/config/keybind.ts:287] |
| `session_export` | `<leader>x` [E: packages/tui/src/config/keybind.ts:84] | Export session to editor | `session.export` [E: packages/tui/src/config/keybind.ts:288] |
| `session_copy` | `none` [E: packages/tui/src/config/keybind.ts:85] | Copy session transcript | `session.copy` [E: packages/tui/src/config/keybind.ts:289] |
| `session_new` | `<leader>n` [E: packages/tui/src/config/keybind.ts:86] | Create a new session | `session.new` [E: packages/tui/src/config/keybind.ts:290] |
| `session_list` | `<leader>l` [E: packages/tui/src/config/keybind.ts:87] | List all sessions | `session.list` [E: packages/tui/src/config/keybind.ts:291] |
| `session_timeline` | `<leader>g` [E: packages/tui/src/config/keybind.ts:88] | Show session timeline | `session.timeline` [E: packages/tui/src/config/keybind.ts:292] |
| `session_fork` | `none` [E: packages/tui/src/config/keybind.ts:89] | Fork session from message | `session.fork` [E: packages/tui/src/config/keybind.ts:293] |
| `session_rename` | `ctrl+r` [E: packages/tui/src/config/keybind.ts:90] | Rename session | `session.rename` [E: packages/tui/src/config/keybind.ts:294] |
| `session_delete` | `ctrl+d` [E: packages/tui/src/config/keybind.ts:91] | Delete session | `session.delete` [E: packages/tui/src/config/keybind.ts:295] |
| `session_share` | `none` [E: packages/tui/src/config/keybind.ts:92] | Share current session | `session.share` [E: packages/tui/src/config/keybind.ts:296] |
| `session_unshare` | `none` [E: packages/tui/src/config/keybind.ts:93] | Unshare current session | `session.unshare` [E: packages/tui/src/config/keybind.ts:297] |
| `session_interrupt` | `escape` [E: packages/tui/src/config/keybind.ts:94] | Interrupt current session | `session.interrupt` [E: packages/tui/src/config/keybind.ts:298] |
| `session_background` | `ctrl+b` [E: packages/tui/src/config/keybind.ts:95] | Background synchronous subagents | `session.background` [E: packages/tui/src/config/keybind.ts:299] |
| `session_compact` | `<leader>c` [E: packages/tui/src/config/keybind.ts:96] | Compact the session | `session.compact` [E: packages/tui/src/config/keybind.ts:300] |
| `session_toggle_timestamps` | `none` [E: packages/tui/src/config/keybind.ts:97] | Toggle message timestamps | `session.toggle.timestamps` [E: packages/tui/src/config/keybind.ts:301] |
| `session_toggle_generic_tool_output` | `none` [E: packages/tui/src/config/keybind.ts:98] | Toggle generic tool output | `session.toggle.generic_tool_output` [E: packages/tui/src/config/keybind.ts:302] |
| `session_queued_prompts` | `<leader>q` [E: packages/tui/src/config/keybind.ts:99] | Manage queued prompts | `session.queued_prompts` [E: packages/tui/src/config/keybind.ts:303] |
| `session_child_first` | `<leader>down` [E: packages/tui/src/config/keybind.ts:100] | Go to first child session | `session.child.first` [E: packages/tui/src/config/keybind.ts:304] |
| `session_child_cycle` | `right` [E: packages/tui/src/config/keybind.ts:101] | Go to next child session | `session.child.next` [E: packages/tui/src/config/keybind.ts:305] |
| `session_child_cycle_reverse` | `left` [E: packages/tui/src/config/keybind.ts:102] | Go to previous child session | `session.child.previous` [E: packages/tui/src/config/keybind.ts:306] |
| `session_parent` | `up` [E: packages/tui/src/config/keybind.ts:103] | Go to parent session | `session.parent` [E: packages/tui/src/config/keybind.ts:307] |
| `session_pin_toggle` | `ctrl+f` [E: packages/tui/src/config/keybind.ts:104] | Pin or unpin session in the session list | `session.pin.toggle` [E: packages/tui/src/config/keybind.ts:308] |
| `session_quick_switch_1` | `<leader>1` [E: packages/tui/src/config/keybind.ts:105] | Switch to session in quick slot 1 | `session.quick_switch.1` [E: packages/tui/src/config/keybind.ts:309] |
| `session_quick_switch_2` | `<leader>2` [E: packages/tui/src/config/keybind.ts:106] | Switch to session in quick slot 2 | `session.quick_switch.2` [E: packages/tui/src/config/keybind.ts:310] |
| `session_quick_switch_3` | `<leader>3` [E: packages/tui/src/config/keybind.ts:107] | Switch to session in quick slot 3 | `session.quick_switch.3` [E: packages/tui/src/config/keybind.ts:311] |
| `session_quick_switch_4` | `<leader>4` [E: packages/tui/src/config/keybind.ts:108] | Switch to session in quick slot 4 | `session.quick_switch.4` [E: packages/tui/src/config/keybind.ts:312] |
| `session_quick_switch_5` | `<leader>5` [E: packages/tui/src/config/keybind.ts:109] | Switch to session in quick slot 5 | `session.quick_switch.5` [E: packages/tui/src/config/keybind.ts:313] |
| `session_quick_switch_6` | `<leader>6` [E: packages/tui/src/config/keybind.ts:110] | Switch to session in quick slot 6 | `session.quick_switch.6` [E: packages/tui/src/config/keybind.ts:314] |
| `session_quick_switch_7` | `<leader>7` [E: packages/tui/src/config/keybind.ts:111] | Switch to session in quick slot 7 | `session.quick_switch.7` [E: packages/tui/src/config/keybind.ts:315] |
| `session_quick_switch_8` | `<leader>8` [E: packages/tui/src/config/keybind.ts:112] | Switch to session in quick slot 8 | `session.quick_switch.8` [E: packages/tui/src/config/keybind.ts:316] |
| `session_quick_switch_9` | `<leader>9` [E: packages/tui/src/config/keybind.ts:113] | Switch to session in quick slot 9 | `session.quick_switch.9` [E: packages/tui/src/config/keybind.ts:317] |
| `stash_delete` | `ctrl+d` [E: packages/tui/src/config/keybind.ts:115] | Delete stash entry | `stash.delete` [E: packages/tui/src/config/keybind.ts:318] |
| `model_provider_list` | `ctrl+a` [E: packages/tui/src/config/keybind.ts:116] | Open provider list from model dialog | `model.dialog.provider` [E: packages/tui/src/config/keybind.ts:319] |
| `model_favorite_toggle` | `ctrl+f` [E: packages/tui/src/config/keybind.ts:117] | Toggle model favorite status | `model.dialog.favorite` [E: packages/tui/src/config/keybind.ts:320] |
| `model_list` | `<leader>m` [E: packages/tui/src/config/keybind.ts:118] | List available models | `model.list` [E: packages/tui/src/config/keybind.ts:321] |
| `model_cycle_recent` | `f2` [E: packages/tui/src/config/keybind.ts:119] | Next recently used model | `model.cycle_recent` [E: packages/tui/src/config/keybind.ts:322] |
| `model_cycle_recent_reverse` | `shift+f2` [E: packages/tui/src/config/keybind.ts:120] | Previous recently used model | `model.cycle_recent_reverse` [E: packages/tui/src/config/keybind.ts:323] |
| `model_cycle_favorite` | `none` [E: packages/tui/src/config/keybind.ts:121] | Next favorite model | `model.cycle_favorite` [E: packages/tui/src/config/keybind.ts:324] |
| `model_cycle_favorite_reverse` | `none` [E: packages/tui/src/config/keybind.ts:122] | Previous favorite model | `model.cycle_favorite_reverse` [E: packages/tui/src/config/keybind.ts:325] |
| `mcp_list` | `none` [E: packages/tui/src/config/keybind.ts:123] | List MCP servers | `mcp.list` [E: packages/tui/src/config/keybind.ts:326] |
| `provider_connect` | `none` [E: packages/tui/src/config/keybind.ts:124] | Connect provider | `provider.connect` [E: packages/tui/src/config/keybind.ts:327] |
| `console_org_switch` | `none` [E: packages/tui/src/config/keybind.ts:125] | Switch console organization | `console.org.switch` [E: packages/tui/src/config/keybind.ts:328] |
| `agent_list` | `<leader>a` [E: packages/tui/src/config/keybind.ts:126] | List agents | `agent.list` [E: packages/tui/src/config/keybind.ts:329] |
| `agent_cycle` | `tab` [E: packages/tui/src/config/keybind.ts:127] | Next agent | `agent.cycle` [E: packages/tui/src/config/keybind.ts:330] |
| `agent_cycle_reverse` | `shift+tab` [E: packages/tui/src/config/keybind.ts:128] | Previous agent | `agent.cycle.reverse` [E: packages/tui/src/config/keybind.ts:331] |
| `variant_cycle` | `ctrl+t` [E: packages/tui/src/config/keybind.ts:129] | Cycle model variants | `variant.cycle` [E: packages/tui/src/config/keybind.ts:332] |
| `variant_list` | `none` [E: packages/tui/src/config/keybind.ts:130] | List model variants | `variant.list` [E: packages/tui/src/config/keybind.ts:333] |
| `messages_page_up` | `pageup,ctrl+alt+b` [E: packages/tui/src/config/keybind.ts:132] | Scroll messages up by one page | `session.page.up` [E: packages/tui/src/config/keybind.ts:334] |
| `messages_page_down` | `pagedown,ctrl+alt+f` [E: packages/tui/src/config/keybind.ts:133] | Scroll messages down by one page | `session.page.down` [E: packages/tui/src/config/keybind.ts:335] |
| `messages_line_up` | `ctrl+alt+y` [E: packages/tui/src/config/keybind.ts:134] | Scroll messages up by one line | `session.line.up` [E: packages/tui/src/config/keybind.ts:336] |
| `messages_line_down` | `ctrl+alt+e` [E: packages/tui/src/config/keybind.ts:135] | Scroll messages down by one line | `session.line.down` [E: packages/tui/src/config/keybind.ts:337] |
| `messages_half_page_up` | `ctrl+alt+u` [E: packages/tui/src/config/keybind.ts:136] | Scroll messages up by half page | `session.half.page.up` [E: packages/tui/src/config/keybind.ts:338] |
| `messages_half_page_down` | `ctrl+alt+d` [E: packages/tui/src/config/keybind.ts:137] | Scroll messages down by half page | `session.half.page.down` [E: packages/tui/src/config/keybind.ts:339] |
| `messages_first` | `ctrl+g,home` [E: packages/tui/src/config/keybind.ts:138] | Navigate to first message | `session.first` [E: packages/tui/src/config/keybind.ts:340] |
| `messages_last` | `ctrl+alt+g,end` [E: packages/tui/src/config/keybind.ts:139] | Navigate to last message | `session.last` [E: packages/tui/src/config/keybind.ts:341] |
| `messages_next` | `none` [E: packages/tui/src/config/keybind.ts:140] | Navigate to next message | `session.message.next` [E: packages/tui/src/config/keybind.ts:342] |
| `messages_previous` | `none` [E: packages/tui/src/config/keybind.ts:141] | Navigate to previous message | `session.message.previous` [E: packages/tui/src/config/keybind.ts:343] |
| `messages_last_user` | `none` [E: packages/tui/src/config/keybind.ts:142] | Navigate to last user message | `session.messages_last_user` [E: packages/tui/src/config/keybind.ts:344] |
| `messages_copy` | `<leader>y` [E: packages/tui/src/config/keybind.ts:143] | Copy message | `messages.copy` [E: packages/tui/src/config/keybind.ts:345] |
| `messages_undo` | `<leader>u` [E: packages/tui/src/config/keybind.ts:144] | Undo message | `session.undo` [E: packages/tui/src/config/keybind.ts:346] |
| `messages_redo` | `<leader>r` [E: packages/tui/src/config/keybind.ts:145] | Redo message | `session.redo` [E: packages/tui/src/config/keybind.ts:347] |
| `messages_toggle_conceal` | `<leader>h` [E: packages/tui/src/config/keybind.ts:146] | Toggle code block concealment in messages | `session.toggle.conceal` [E: packages/tui/src/config/keybind.ts:348] |
| `tool_details` | `none` [E: packages/tui/src/config/keybind.ts:147] | Toggle tool details visibility | `session.toggle.actions` [E: packages/tui/src/config/keybind.ts:349] |
| `display_thinking` | `none` [E: packages/tui/src/config/keybind.ts:148] | Toggle thinking blocks visibility | `session.toggle.thinking` [E: packages/tui/src/config/keybind.ts:350] |
| `prompt_submit` | `none` [E: packages/tui/src/config/keybind.ts:150] | Submit prompt | `prompt.submit` [E: packages/tui/src/config/keybind.ts:351] |
| `prompt_editor_context_clear` | `none` [E: packages/tui/src/config/keybind.ts:151] | Clear editor context | `prompt.editor_context.clear` [E: packages/tui/src/config/keybind.ts:352] |
| `prompt_skills` | `none` [E: packages/tui/src/config/keybind.ts:152] | Open skill selector | `prompt.skills` [E: packages/tui/src/config/keybind.ts:353] |
| `prompt_stash` | `none` [E: packages/tui/src/config/keybind.ts:153] | Stash prompt | `prompt.stash` [E: packages/tui/src/config/keybind.ts:354] |
| `prompt_stash_pop` | `none` [E: packages/tui/src/config/keybind.ts:154] | Pop stashed prompt | `prompt.stash.pop` [E: packages/tui/src/config/keybind.ts:355] |
| `prompt_stash_list` | `none` [E: packages/tui/src/config/keybind.ts:155] | List stashed prompts | `prompt.stash.list` [E: packages/tui/src/config/keybind.ts:356] |
| `workspace_set` | `none` [E: packages/tui/src/config/keybind.ts:156] | Set workspace | `workspace.set` [E: packages/tui/src/config/keybind.ts:357] |
| `input_clear` | `ctrl+c` [E: packages/tui/src/config/keybind.ts:158] | Clear input field | `prompt.clear` [E: packages/tui/src/config/keybind.ts:358] |
| `input_paste` | `{ key: "ctrl+v", preventDefault: false }` [E: packages/tui/src/config/keybind.ts:159] | Paste from clipboard | `prompt.paste` [E: packages/tui/src/config/keybind.ts:359] |
| `input_submit` | `return` [E: packages/tui/src/config/keybind.ts:160] | Submit input | `input.submit` [E: packages/tui/src/config/keybind.ts:360] |
| `input_newline` | `shift+return,ctrl+return,alt+return,ctrl+j` [E: packages/tui/src/config/keybind.ts:161] | Insert newline in input | `input.newline` [E: packages/tui/src/config/keybind.ts:361] |
| `input_move_left` | `left,ctrl+b` [E: packages/tui/src/config/keybind.ts:162] | Move cursor left in input | `input.move.left` [E: packages/tui/src/config/keybind.ts:362] |
| `input_move_right` | `right,ctrl+f` [E: packages/tui/src/config/keybind.ts:163] | Move cursor right in input | `input.move.right` [E: packages/tui/src/config/keybind.ts:363] |
| `input_move_up` | `up` [E: packages/tui/src/config/keybind.ts:164] | Move cursor up in input | `input.move.up` [E: packages/tui/src/config/keybind.ts:364] |
| `input_move_down` | `down` [E: packages/tui/src/config/keybind.ts:165] | Move cursor down in input | `input.move.down` [E: packages/tui/src/config/keybind.ts:365] |
| `input_select_left` | `shift+left` [E: packages/tui/src/config/keybind.ts:166] | Select left in input | `input.select.left` [E: packages/tui/src/config/keybind.ts:366] |
| `input_select_right` | `shift+right` [E: packages/tui/src/config/keybind.ts:167] | Select right in input | `input.select.right` [E: packages/tui/src/config/keybind.ts:367] |
| `input_select_up` | `shift+up` [E: packages/tui/src/config/keybind.ts:168] | Select up in input | `input.select.up` [E: packages/tui/src/config/keybind.ts:368] |
| `input_select_down` | `shift+down` [E: packages/tui/src/config/keybind.ts:169] | Select down in input | `input.select.down` [E: packages/tui/src/config/keybind.ts:369] |
| `input_line_home` | `ctrl+a` [E: packages/tui/src/config/keybind.ts:170] | Move to start of line in input | `input.line.home` [E: packages/tui/src/config/keybind.ts:370] |
| `input_line_end` | `ctrl+e` [E: packages/tui/src/config/keybind.ts:171] | Move to end of line in input | `input.line.end` [E: packages/tui/src/config/keybind.ts:371] |
| `input_select_line_home` | `ctrl+shift+a` [E: packages/tui/src/config/keybind.ts:172] | Select to start of line in input | `input.select.line.home` [E: packages/tui/src/config/keybind.ts:372] |
| `input_select_line_end` | `ctrl+shift+e` [E: packages/tui/src/config/keybind.ts:173] | Select to end of line in input | `input.select.line.end` [E: packages/tui/src/config/keybind.ts:373] |
| `input_visual_line_home` | `alt+a` [E: packages/tui/src/config/keybind.ts:174] | Move to start of visual line in input | `input.visual.line.home` [E: packages/tui/src/config/keybind.ts:374] |
| `input_visual_line_end` | `alt+e` [E: packages/tui/src/config/keybind.ts:175] | Move to end of visual line in input | `input.visual.line.end` [E: packages/tui/src/config/keybind.ts:375] |
| `input_select_visual_line_home` | `alt+shift+a` [E: packages/tui/src/config/keybind.ts:176] | Select to start of visual line in input | `input.select.visual.line.home` [E: packages/tui/src/config/keybind.ts:376] |
| `input_select_visual_line_end` | `alt+shift+e` [E: packages/tui/src/config/keybind.ts:177] | Select to end of visual line in input | `input.select.visual.line.end` [E: packages/tui/src/config/keybind.ts:377] |
| `input_buffer_home` | `home` [E: packages/tui/src/config/keybind.ts:178] | Move to start of buffer in input | `input.buffer.home` [E: packages/tui/src/config/keybind.ts:378] |
| `input_buffer_end` | `end` [E: packages/tui/src/config/keybind.ts:179] | Move to end of buffer in input | `input.buffer.end` [E: packages/tui/src/config/keybind.ts:379] |
| `input_select_buffer_home` | `shift+home` [E: packages/tui/src/config/keybind.ts:180] | Select to start of buffer in input | `input.select.buffer.home` [E: packages/tui/src/config/keybind.ts:380] |
| `input_select_buffer_end` | `shift+end` [E: packages/tui/src/config/keybind.ts:181] | Select to end of buffer in input | `input.select.buffer.end` [E: packages/tui/src/config/keybind.ts:381] |
| `input_delete_line` | `ctrl+shift+d` [E: packages/tui/src/config/keybind.ts:182] | Delete line in input | `input.delete.line` [E: packages/tui/src/config/keybind.ts:382] |
| `input_delete_to_line_end` | `ctrl+k` [E: packages/tui/src/config/keybind.ts:183] | Delete to end of line in input | `input.delete.to.line.end` [E: packages/tui/src/config/keybind.ts:383] |
| `input_delete_to_line_start` | `ctrl+u` [E: packages/tui/src/config/keybind.ts:184] | Delete to start of line in input | `input.delete.to.line.start` [E: packages/tui/src/config/keybind.ts:384] |
| `input_backspace` | `backspace,shift+backspace` [E: packages/tui/src/config/keybind.ts:185] | Backspace in input | `input.backspace` [E: packages/tui/src/config/keybind.ts:385] |
| `input_delete` | `ctrl+d,delete,shift+delete` [E: packages/tui/src/config/keybind.ts:186] | Delete character in input | `input.delete` [E: packages/tui/src/config/keybind.ts:386] |
| `input_undo` | `ctrl+-,super+z` [E: packages/tui/src/config/keybind.ts:187] | Undo in input | `input.undo` [E: packages/tui/src/config/keybind.ts:387] |
| `input_redo` | `ctrl+.,super+shift+z` [E: packages/tui/src/config/keybind.ts:188] | Redo in input | `input.redo` [E: packages/tui/src/config/keybind.ts:388] |
| `input_word_forward` | `alt+f,alt+right,ctrl+right` [E: packages/tui/src/config/keybind.ts:189] | Move word forward in input | `input.word.forward` [E: packages/tui/src/config/keybind.ts:389] |
| `input_word_backward` | `alt+b,alt+left,ctrl+left` [E: packages/tui/src/config/keybind.ts:190] | Move word backward in input | `input.word.backward` [E: packages/tui/src/config/keybind.ts:390] |
| `input_select_word_forward` | `alt+shift+f,alt+shift+right` [E: packages/tui/src/config/keybind.ts:191] | Select word forward in input | `input.select.word.forward` [E: packages/tui/src/config/keybind.ts:391] |
| `input_select_word_backward` | `alt+shift+b,alt+shift+left` [E: packages/tui/src/config/keybind.ts:192] | Select word backward in input | `input.select.word.backward` [E: packages/tui/src/config/keybind.ts:392] |
| `input_delete_word_forward` | `alt+d,alt+delete,ctrl+delete` [E: packages/tui/src/config/keybind.ts:193] | Delete word forward in input | `input.delete.word.forward` [E: packages/tui/src/config/keybind.ts:393] |
| `input_delete_word_backward` | `ctrl+w,ctrl+backspace,alt+backspace` [E: packages/tui/src/config/keybind.ts:194] | Delete word backward in input | `input.delete.word.backward` [E: packages/tui/src/config/keybind.ts:394] |
| `input_select_all` | `super+a` [E: packages/tui/src/config/keybind.ts:195] | Select all in input | `input.select.all` [E: packages/tui/src/config/keybind.ts:395] |
| `history_previous` | `up` [E: packages/tui/src/config/keybind.ts:196] | Previous history item | `prompt.history.previous` [E: packages/tui/src/config/keybind.ts:396] |
| `history_next` | `down` [E: packages/tui/src/config/keybind.ts:197] | Next history item | `prompt.history.next` [E: packages/tui/src/config/keybind.ts:397] |
| `dialog.select.prev` | `up,ctrl+p` [E: packages/tui/src/config/keybind.ts:199] | Move to previous dialog item | - |
| `dialog.select.next` | `down,ctrl+n` [E: packages/tui/src/config/keybind.ts:200] | Move to next dialog item | - |
| `dialog.select.page_up` | `pageup` [E: packages/tui/src/config/keybind.ts:201] | Move up one page in dialog | - |
| `dialog.select.page_down` | `pagedown` [E: packages/tui/src/config/keybind.ts:202] | Move down one page in dialog | - |
| `dialog.select.home` | `home` [E: packages/tui/src/config/keybind.ts:203] | Move to first dialog item | - |
| `dialog.select.end` | `end` [E: packages/tui/src/config/keybind.ts:204] | Move to last dialog item | - |
| `dialog.select.submit` | `return` [E: packages/tui/src/config/keybind.ts:205] | Submit selected dialog item | - |
| `dialog.prompt.submit` | `return` [E: packages/tui/src/config/keybind.ts:206] | Submit dialog prompt | - |
| `dialog.mcp.toggle` | `space` [E: packages/tui/src/config/keybind.ts:207] | Toggle MCP in MCP dialog | - |
| `dialog.move_session.new` | `ctrl+m` [E: packages/tui/src/config/keybind.ts:208] | New project copy | - |
| `dialog.move_session.delete` | `ctrl+d` [E: packages/tui/src/config/keybind.ts:209] | Delete project copy | - |
| `dialog.move_session.refresh` | `ctrl+r` [E: packages/tui/src/config/keybind.ts:210] | Refresh project copies | - |
| `prompt.autocomplete.prev` | `up,ctrl+p` [E: packages/tui/src/config/keybind.ts:211] | Move to previous autocomplete item | - |
| `prompt.autocomplete.next` | `down,ctrl+n` [E: packages/tui/src/config/keybind.ts:212] | Move to next autocomplete item | - |
| `prompt.autocomplete.hide` | `escape` [E: packages/tui/src/config/keybind.ts:213] | Hide autocomplete | - |
| `prompt.autocomplete.select` | `return` [E: packages/tui/src/config/keybind.ts:214] | Select autocomplete item | - |
| `prompt.autocomplete.complete` | `tab` [E: packages/tui/src/config/keybind.ts:215] | Complete autocomplete item | - |
| `permission.prompt.fullscreen` | `ctrl+f` [E: packages/tui/src/config/keybind.ts:216] | Toggle permission prompt fullscreen | - |
| `plugins.toggle` | `space` [E: packages/tui/src/config/keybind.ts:217] | Toggle plugin | - |
| `dialog.plugins.install` | `shift+i` [E: packages/tui/src/config/keybind.ts:218] | Install plugin from plugin dialog | - |
| `terminal_suspend` | `ctrl+z` [E: packages/tui/src/config/keybind.ts:220] | Suspend terminal | `terminal.suspend` [E: packages/tui/src/config/keybind.ts:398] |
| `terminal_title_toggle` | `none` [E: packages/tui/src/config/keybind.ts:221] | Toggle terminal title | `terminal.title.toggle` [E: packages/tui/src/config/keybind.ts:399] |
| `tips_toggle` | `<leader>h` [E: packages/tui/src/config/keybind.ts:222] | Toggle tips on home screen | `tips.toggle` [E: packages/tui/src/config/keybind.ts:400] |
| `plugin_manager` | `none` [E: packages/tui/src/config/keybind.ts:223] | Open plugin manager dialog | `plugins.list` [E: packages/tui/src/config/keybind.ts:401] |
| `plugin_install` | `none` [E: packages/tui/src/config/keybind.ts:224] | Install plugin | `plugins.install` [E: packages/tui/src/config/keybind.ts:402] |
| `which_key_toggle` | `ctrl+alt+k` [E: packages/tui/src/config/keybind.ts:226] | Toggle which-key panel | `which-key.toggle` [E: packages/tui/src/config/keybind.ts:403] |
| `which_key_layout_toggle` | `ctrl+alt+shift+k` [E: packages/tui/src/config/keybind.ts:227] | Switch which-key layout | `which-key.layout.toggle` [E: packages/tui/src/config/keybind.ts:404] |
| `which_key_pending_toggle` | `ctrl+alt+shift+p` [E: packages/tui/src/config/keybind.ts:228] | Toggle which-key pending preview | `which-key.pending.toggle` [E: packages/tui/src/config/keybind.ts:405] |
| `which_key_group_previous` | `ctrl+alt+left,ctrl+alt+[` [E: packages/tui/src/config/keybind.ts:229] | Previous which-key group | `which-key.group.previous` [E: packages/tui/src/config/keybind.ts:406] |
| `which_key_group_next` | `ctrl+alt+right,ctrl+alt+]` [E: packages/tui/src/config/keybind.ts:230] | Next which-key group | `which-key.group.next` [E: packages/tui/src/config/keybind.ts:407] |
| `which_key_scroll_up` | `ctrl+alt+up,ctrl+alt+p` [E: packages/tui/src/config/keybind.ts:231] | Scroll which-key up | `which-key.scroll.up` [E: packages/tui/src/config/keybind.ts:408] |
| `which_key_scroll_down` | `ctrl+alt+down,ctrl+alt+n` [E: packages/tui/src/config/keybind.ts:232] | Scroll which-key down | `which-key.scroll.down` [E: packages/tui/src/config/keybind.ts:409] |
| `which_key_page_up` | `ctrl+alt+pageup` [E: packages/tui/src/config/keybind.ts:233] | Page which-key up | `which-key.page.up` [E: packages/tui/src/config/keybind.ts:410] |
| `which_key_page_down` | `ctrl+alt+pagedown` [E: packages/tui/src/config/keybind.ts:234] | Page which-key down | `which-key.page.down` [E: packages/tui/src/config/keybind.ts:411] |
| `which_key_home` | `ctrl+alt+home` [E: packages/tui/src/config/keybind.ts:235] | Jump to first which-key binding | `which-key.home` [E: packages/tui/src/config/keybind.ts:412] |
| `which_key_end` | `ctrl+alt+end` [E: packages/tui/src/config/keybind.ts:236] | Jump to last which-key binding | `which-key.end` [E: packages/tui/src/config/keybind.ts:413] |

## Sources

- `packages/tui/src/config/keybind.ts`

## 相关

- `tui.keybindings`

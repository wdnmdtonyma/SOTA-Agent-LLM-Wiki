---
id: subsys.tui.chatwidget
title: ChatWidget
kind: subsystem
tier: T2
source:
  - codex-rs/tui/src/chatwidget.rs
  - codex-rs/tui/src/history_cell.rs
  - codex-rs/tui/src/bottom_pane/chat_composer.rs
symbols:
  - ChatWidget
  - ChatWidget::new_with_app_event
  - ChatWidget::handle_key_event
  - ChatWidget::on_commit_tick
  - ChatWidget::on_task_complete
  - ChatWidget::maybe_send_next_queued_input
  - HistoryCell
related:
  - subsys.tui.architecture
  - subsys.tui.streaming-pipeline
  - subsys.tui.bottom-pane
  - subsys.tui.status-surfaces
evidence: explicit
status: verified
updated: 37aadeaa13
---

`ChatWidget` 是 TUI 的主交互 widget，集中保存 bottom pane、active cell、config、model/session header、stream controllers、running command/task state、reasoning buffers、thread metadata、queued input、plan state、runtime metrics 和 cwd/rollout metadata [E: codex-rs/tui/src/chatwidget.rs:751][E: codex-rs/tui/src/chatwidget.rs:766][E: codex-rs/tui/src/chatwidget.rs:767][E: codex-rs/tui/src/chatwidget.rs:778][E: codex-rs/tui/src/chatwidget.rs:786][E: codex-rs/tui/src/chatwidget.rs:788][E: codex-rs/tui/src/chatwidget.rs:802][E: codex-rs/tui/src/chatwidget.rs:804][E: codex-rs/tui/src/chatwidget.rs:830][E: codex-rs/tui/src/chatwidget.rs:845][E: codex-rs/tui/src/chatwidget.rs:873][E: codex-rs/tui/src/chatwidget.rs:893][E: codex-rs/tui/src/chatwidget.rs:915][E: codex-rs/tui/src/chatwidget.rs:958][E: codex-rs/tui/src/chatwidget.rs:975][E: codex-rs/tui/src/chatwidget.rs:980][E: codex-rs/tui/src/chatwidget.rs:983]。

## 能回答的问题

- `ChatWidget` 如何把 key/paste 转成 user message、queued input 或 UI command。
- app-server notification 如何变成 history cell、streaming delta、status update 或 approval overlay。
- active cell、history cell、final separator、bottom pane render 如何组合成屏幕内容。
- 为什么 `ChatWidget` 既持有 display state 又持有 thread metadata。
- 任务运行中按 Enter(引导 / steer)与 Tab(排队 / queue)分别把输入送到哪里、行为有何不同。
- 排队的多条消息在 turn 结束时是一次性全发还是每轮只释放一条。

## 职责边界

- `ChatWidget` 不是 terminal backend；`ChatWidget` 实现 `Renderable` 并返回 active cell + bottom pane 的组合布局，实际 terminal draw 由 `App`/`Tui` 调用是架构边界推断 [E: codex-rs/tui/src/chatwidget.rs:11254][E: codex-rs/tui/src/chatwidget.rs:11270][E: codex-rs/tui/src/chatwidget.rs:11274][E: codex-rs/tui/src/chatwidget.rs:11278][E: codex-rs/tui/src/chatwidget.rs:11315][I]。
- `ChatWidget` 不拥有 app event loop；它保存 `app_event_tx`，通过事件把 UI action 交回 `App` 是从 event sender 字段与 `submit_op` 的 app-event target 得出的职责边界 [E: codex-rs/tui/src/chatwidget.rs:764][E: codex-rs/tui/src/chatwidget.rs:10869][E: codex-rs/tui/src/chatwidget.rs:10870][I]。
- `BottomPane` 被 `ChatWidget` 持有并委派 key handling；`handle_key_event` 调用 `self.bottom_pane.handle_key_event(key_event)` 得到 `InputResult` [E: codex-rs/tui/src/chatwidget.rs:766][E: codex-rs/tui/src/chatwidget.rs:5398][E: codex-rs/tui/src/chatwidget.rs:5399]。
- app-server thread op 由 `submit_op` 分流：direct target 直接提交 core op，app-event target 发送 `AppEvent::CodexOp(op)` [E: codex-rs/tui/src/chatwidget.rs:10861][E: codex-rs/tui/src/chatwidget.rs:10864][E: codex-rs/tui/src/chatwidget.rs:10869][E: codex-rs/tui/src/chatwidget.rs:10870]。

## 关键 crate/文件

- `codex-rs/tui/src/chatwidget.rs`: widget state、keyboard routing、app-server notification handling、stream integration 和 renderable。
- `codex-rs/tui/src/history_cell.rs`: transcript cell 抽象，承载 text、command、plan、approval、status 等历史展示单元。
- `codex-rs/tui/src/bottom_pane`: composer、views、approval overlays、selection views。
- `codex-rs/tui/src/streaming`: `ChatWidget` 使用的 answer/plan streaming controller。

## 数据模型

- input/render state: `bottom_pane`、`active_cell`、`active_cell_revision`、`current_status`、`active_hook_cell`、`terminal_title_status_kind` [E: codex-rs/tui/src/chatwidget.rs:766][E: codex-rs/tui/src/chatwidget.rs:767][E: codex-rs/tui/src/chatwidget.rs:777][E: codex-rs/tui/src/chatwidget.rs:880][E: codex-rs/tui/src/chatwidget.rs:885][E: codex-rs/tui/src/chatwidget.rs:887]。
- model/session state: `config`、`current_collaboration_mode`、`model_catalog`、`session_header`, `thread_id`、`thread_name` 和 `forked_from` [E: codex-rs/tui/src/chatwidget.rs:778][E: codex-rs/tui/src/chatwidget.rs:782][E: codex-rs/tui/src/chatwidget.rs:786][E: codex-rs/tui/src/chatwidget.rs:788][E: codex-rs/tui/src/chatwidget.rs:893][E: codex-rs/tui/src/chatwidget.rs:895][E: codex-rs/tui/src/chatwidget.rs:900]。
- streaming state: `adaptive_chunking`、`stream_controller`、`plan_stream_controller`、`plan_delta_buffer` 和 `plan_item_active` [E: codex-rs/tui/src/chatwidget.rs:800][E: codex-rs/tui/src/chatwidget.rs:802][E: codex-rs/tui/src/chatwidget.rs:804][E: codex-rs/tui/src/chatwidget.rs:967][E: codex-rs/tui/src/chatwidget.rs:969]。
- queued input state: `queued_user_messages`、`rejected_steers_queue`、`pending_steers` 和 `submit_pending_steers_after_interrupt` 支持 turn 正在运行或 plan streaming 时的延迟提交/重试 [E: codex-rs/tui/src/chatwidget.rs:914][E: codex-rs/tui/src/chatwidget.rs:915][E: codex-rs/tui/src/chatwidget.rs:918][E: codex-rs/tui/src/chatwidget.rs:919][E: codex-rs/tui/src/chatwidget.rs:924][E: codex-rs/tui/src/chatwidget.rs:927][I]。

## 控制流

1. `new_with_app_event` 委托 `new_with_op_target(common, CodexOpTarget::AppEvent)`，后者构造 placeholder session header history cell、`BottomPane` 和各字段默认值，`session_header` 字段单独初始化，stream controllers 初始为 `None` [E: codex-rs/tui/src/chatwidget.rs:5052][E: codex-rs/tui/src/chatwidget.rs:5053][E: codex-rs/tui/src/chatwidget.rs:5105][E: codex-rs/tui/src/chatwidget.rs:5113][E: codex-rs/tui/src/chatwidget.rs:5133][E: codex-rs/tui/src/chatwidget.rs:5146][E: codex-rs/tui/src/chatwidget.rs:5147][E: codex-rs/tui/src/chatwidget.rs:10274]。
2. `handle_key_event` 先处理全局快捷键，例如 Ctrl+O copy、Ctrl+C/Ctrl+D、Ctrl/Alt+V image paste、Esc interrupt、BackTab collaboration mode；之后把 key 交给 bottom pane [E: codex-rs/tui/src/chatwidget.rs:5300][E: codex-rs/tui/src/chatwidget.rs:5309][E: codex-rs/tui/src/chatwidget.rs:5318][E: codex-rs/tui/src/chatwidget.rs:5341][E: codex-rs/tui/src/chatwidget.rs:5345][E: codex-rs/tui/src/chatwidget.rs:5372][E: codex-rs/tui/src/chatwidget.rs:5394][E: codex-rs/tui/src/chatwidget.rs:5398]。
3. bottom pane 返回 `InputResult::Submitted` 时，`ChatWidget` 根据 session、plan-streaming state、running shell-command state 与 `!` prefix 决定提交 user message 或 queue；返回 `InputResult::Queued` 时调用 queue-with-options；slash command 则走 `InputResult::Command`/`CommandWithArgs` 分支 [E: codex-rs/tui/src/chatwidget.rs:5399][E: codex-rs/tui/src/chatwidget.rs:5422][E: codex-rs/tui/src/chatwidget.rs:5425][E: codex-rs/tui/src/chatwidget.rs:5428][E: codex-rs/tui/src/chatwidget.rs:5436][E: codex-rs/tui/src/chatwidget.rs:5438][E: codex-rs/tui/src/chatwidget.rs:5441][E: codex-rs/tui/src/chatwidget.rs:5459][E: codex-rs/tui/src/chatwidget.rs:5461][E: codex-rs/tui/src/chatwidget.rs:5465]。
4. `flush_active_cell` 把当前 active cell 通过 `AppEvent::InsertHistoryCell` 交给 App 写入 transcript，并用 `take()` 清空 active cell [E: codex-rs/tui/src/chatwidget.rs:5659][E: codex-rs/tui/src/chatwidget.rs:5660][E: codex-rs/tui/src/chatwidget.rs:5662]。
5. `on_agent_message_delta` 进入 `handle_streaming_delta`，创建 `StreamController`、push delta、发送 `StartCommitAnimation`，并在需要 catch-up 时触发 catch-up tick [E: codex-rs/tui/src/chatwidget.rs:2370][E: codex-rs/tui/src/chatwidget.rs:4661][E: codex-rs/tui/src/chatwidget.rs:4664][E: codex-rs/tui/src/chatwidget.rs:4667][E: codex-rs/tui/src/chatwidget.rs:4669][E: codex-rs/tui/src/chatwidget.rs:4670]。
6. `on_commit_tick` 间接调用 `run_commit_tick_with_scope`：`on_commit_tick` 调用 `run_commit_tick`，`run_commit_tick` 再调用 scoped helper；scoped helper 把 drained cells 加入 UI、在全部 idle 时 restore status 并发送 `StopCommitAnimation` [E: codex-rs/tui/src/chatwidget.rs:4562][E: codex-rs/tui/src/chatwidget.rs:4567][E: codex-rs/tui/src/chatwidget.rs:4590][E: codex-rs/tui/src/chatwidget.rs:4595][E: codex-rs/tui/src/chatwidget.rs:4596][E: codex-rs/tui/src/chatwidget.rs:4597]。
7. app-server notification 分派中，`AgentMessageDelta`、`PlanDelta` 和 reasoning summary deltas 分别调用 streaming/reasoning handlers；raw `ReasoningTextDelta` 只有在 `show_raw_agent_reasoning` 为 true 时调用 raw reasoning handler [E: codex-rs/tui/src/chatwidget.rs:6493][E: codex-rs/tui/src/chatwidget.rs:6496][E: codex-rs/tui/src/chatwidget.rs:6498][E: codex-rs/tui/src/chatwidget.rs:6500][E: codex-rs/tui/src/chatwidget.rs:6502]。

## 输入排队与引导(queue / steer)的释放语义

> 任务运行中,用户新输入有两条互斥路径:**引导(steer)**把内容并入正在跑的 turn,**排队(queue)**把内容暂存在 `ChatWidget`、turn 结束时**每轮只释放一条**另起新 turn。两条路径由 `ChatComposer` 的按键(Enter / Tab)在 `bottom_pane::chat_composer` 分流;composer 按键处理的权威节点是 [subsys.tui.bottom-pane](bottom-pane.md),本节只覆盖 `ChatWidget` 侧的 release 语义。

### 按键分流:Enter = 引导,Tab = 排队

- `ChatComposer` 的无修饰 `Enter` 调用 `handle_submission(should_queue = false)`,产出 `InputResult::Submitted` [E: codex-rs/tui/src/bottom_pane/chat_composer.rs:2901]。
- `ChatComposer` 的无修饰 `Tab` 在任务运行时把 `should_queue` 取成 `self.is_task_running`(即 true),产出 `InputResult::Queued` [E: codex-rs/tui/src/bottom_pane/chat_composer.rs:2894][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:2895];`handle_submission` 在 `should_queue` 为 true 时直接构造 `InputResult::Queued` 并附带 `QueuedInputAction` [E: codex-rs/tui/src/bottom_pane/chat_composer.rs:2440][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:2454]。
- `QueuedInputAction` 由 `queued_input_action` 按文本前缀决定:`/` 前缀(延迟校验)为 `ParseSlash`,`!` 前缀为 `RunShell`,否则 `Plain` [E: codex-rs/tui/src/bottom_pane/chat_composer.rs:2673][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:2675][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:2677]。
- 旧的"steer 模式开关"已移除:`set_steer_enabled` 现在只是 test-only 的 no-op 兼容 shim [E: codex-rs/tui/src/bottom_pane/chat_composer.rs:634]。因此引导/排队不再由一个独立模式标志切换,而是 Enter/Tab 两键并存决定。

### 引导(Submitted):并入当前 turn,多条一次性合并

- `InputResult::Submitted` 进入 `ChatWidget`,在 session 已配置且非 plan streaming 时立即 `submit_user_message` [E: codex-rs/tui/src/chatwidget.rs:5436]。
- `submit_user_message_with_shell_escape_policy` 以 `render_in_history = !self.agent_turn_running` 区分"开新 turn"与"引导现有 turn":turn 正在运行时 `render_in_history` 为 false [E: codex-rs/tui/src/chatwidget.rs:5771]。
- `render_in_history` 为 false 时构造 `PendingSteer` [E: codex-rs/tui/src/chatwidget.rs:5929],提交 `AppCommand::user_turn(...)` op [E: codex-rs/tui/src/chatwidget.rs:5945][E: codex-rs/tui/src/chatwidget.rs:5959],并把 steer 入 `pending_steers` 队列 [E: codex-rs/tui/src/chatwidget.rs:5982]。该 op 进 core 后由 steering 路径并入当前 active turn 的 pending input、不新建 task,因此同一 turn 内的多条引导会在下一次 sampling 边界被**一次性 drain**;core 侧机制见 [spine.turn-end-to-end](../../spine/turn-end-to-end.md) 与 [ref.session-tasks](../../reference/session-tasks.md) [I]。

### 排队(Queued):暂存 ChatWidget,每轮只释放一条

- `InputResult::Queued` 进 `ChatWidget` 后走 `queue_user_message_with_options`,在 session 未配置或有 turn pending/running 时把消息 `push_back` 进 `queued_user_messages` [E: codex-rs/tui/src/chatwidget.rs:5698]。
- turn 收束时 `on_task_complete` 先把 `agent_turn_running` 置 false [E: codex-rs/tui/src/chatwidget.rs:2580],随后调用 `maybe_send_next_queued_input`,源码注释明确 "send exactly one now to begin the next turn" [E: codex-rs/tui/src/chatwidget.rs:2601][E: codex-rs/tui/src/chatwidget.rs:2602]。
- `maybe_send_next_queued_input` 在没有 turn pending/running 时循环 `pop_next_queued_user_message`;命中 `QueuedInputAction::Plain` 时立即 `submit_user_message` 后 `break`,即**一条普通排队消息开一个新 turn 即停**,剩余消息留待下一次 turn 收束 [E: codex-rs/tui/src/chatwidget.rs:7465][E: codex-rs/tui/src/chatwidget.rs:7470][E: codex-rs/tui/src/chatwidget.rs:7471][E: codex-rs/tui/src/chatwidget.rs:7472]。
- 只有 `ParseSlash` / `RunShell` 且对应 `submit_queued_*_prompt` 返回 `QueueDrain::Continue`(例如空 shell 命令只打印帮助、不开 turn)时才继续 drain 下一条;返回 `QueueDrain::Stop`(真正开了 turn)则 break [E: codex-rs/tui/src/chatwidget.rs:7474][E: codex-rs/tui/src/chatwidget.rs:7476][E: codex-rs/tui/src/chatwidget.rs:7481][E: codex-rs/tui/src/chatwidget.rs:5721][E: codex-rs/tui/src/chatwidget.rs:5705]。

### 出队顺序与被拒引导的回收

- `pop_next_queued_user_message`:`rejected_steers_queue` 为空时从 `queued_user_messages` `pop_front`(FIFO,一次一条)[E: codex-rs/tui/src/chatwidget.rs:2687][E: codex-rs/tui/src/chatwidget.rs:2688];非空时把整个 `rejected_steers_queue` 用 `drain(..)` 取出、`merge_user_messages` 合并成一条优先发出 [E: codex-rs/tui/src/chatwidget.rs:2690][E: codex-rs/tui/src/chatwidget.rs:2691]。
- `rejected_steers_queue` 的来源:一条引导被 core 以 `ActiveTurnNotSteerable` 拒绝时,`enqueue_rejected_steer` 把 `pending_steers` 队首弹出、改投到 `rejected_steers_queue` [E: codex-rs/tui/src/chatwidget.rs:2703][E: codex-rs/tui/src/chatwidget.rs:2704][E: codex-rs/tui/src/chatwidget.rs:2710][E: codex-rs/tui/src/chatwidget.rs:2711]。即"引导失败兜底"走**合并**语义,普通排队走**逐条**语义。

## 设计动机与权衡

- `ChatWidget` 集中处理 key routing，避免 bottom pane 直接了解 running task、queued steers、collaboration mode 等 thread-level 状态是从 state ownership 与 key-routing control flow 得出的设计推断；这些字段都在 `ChatWidget` 而不是 composer 中 [E: codex-rs/tui/src/chatwidget.rs:782][E: codex-rs/tui/src/chatwidget.rs:845][E: codex-rs/tui/src/chatwidget.rs:924][I]。
- `ChatWidget` 通过 `AppEvent::InsertHistoryCell` 间接写 transcript，使 `App` 可以同步 overlay transcript、deferred history lines 和 global history cells [E: codex-rs/tui/src/chatwidget.rs:5659][E: codex-rs/tui/src/app/event_dispatch.rs:179][E: codex-rs/tui/src/app/event_dispatch.rs:181][E: codex-rs/tui/src/app/event_dispatch.rs:185][E: codex-rs/tui/src/app/event_dispatch.rs:199][E: codex-rs/tui/src/app/event_dispatch.rs:201]。
- plan streaming 使用独立 controller 和 buffer；plan stream cell 的 header/prefix/style 与普通 assistant answer cell 的显示语义不同，这是从普通 `AgentMessageCell` emit 与 `PlanStreamController::emit` 的 header/style 构造差异得出的因果解释 [E: codex-rs/tui/src/chatwidget.rs:804][E: codex-rs/tui/src/chatwidget.rs:967][E: codex-rs/tui/src/streaming/controller.rs:103][E: codex-rs/tui/src/streaming/controller.rs:107][E: codex-rs/tui/src/streaming/controller.rs:219][E: codex-rs/tui/src/streaming/controller.rs:235][E: codex-rs/tui/src/streaming/controller.rs:237][I]。

## gotcha

- `Esc` 不总是退出 view；当没有 modal/popup、pending steers 非空且 task running 时，它优先尝试 interrupt flow [E: codex-rs/tui/src/chatwidget.rs:5372][E: codex-rs/tui/src/chatwidget.rs:5374][E: codex-rs/tui/src/chatwidget.rs:5375][E: codex-rs/tui/src/chatwidget.rs:5379]。
- `submit_user_message_with_mode` 在 plan streaming 时会 queue 用户输入，而不是立即提交，避免在计划还在增量渲染时混入新的 turn [E: codex-rs/tui/src/chatwidget.rs:10764][E: codex-rs/tui/src/chatwidget.rs:10772][I]。
- app-server notification mapping 同时处理 v2 `ServerNotification` 和 legacy/test-only core `EventMsg` dispatch；排查重复事件时要确认走的是 v2 notification path 还是 legacy test-only dispatch [E: codex-rs/tui/src/chatwidget.rs:6430][E: codex-rs/tui/src/chatwidget.rs:6454][E: codex-rs/tui/src/chatwidget.rs:6493][E: codex-rs/tui/src/chatwidget.rs:6975][I]。
- 排队(`queued_user_messages`)与引导(`pending_steers`)是两套不同队列、释放语义相反：排队每轮 `on_task_complete` 只放一条、各自成 turn [E: codex-rs/tui/src/chatwidget.rs:2602][E: codex-rs/tui/src/chatwidget.rs:7472]；引导并入当前 turn、同轮多条一次性消费 [E: codex-rs/tui/src/chatwidget.rs:5982]。把"连发多条都进同一轮"当成排队行为是常见误解。
- 即便走 `InputResult::Submitted` 路径，若当前只有 user-shell 命令在跑(非 agent turn)且文本不以 `!` 开头，也会被改投到排队而非立即提交 [E: codex-rs/tui/src/chatwidget.rs:5425][E: codex-rs/tui/src/chatwidget.rs:5428]。

## Sources

- `codex-rs/tui/src/chatwidget.rs`
- `codex-rs/tui/src/history_cell.rs`
- `codex-rs/tui/src/bottom_pane/chat_composer.rs`

## 相关

- `subsys.tui.architecture`
- `subsys.tui.streaming-pipeline`
- `subsys.tui.bottom-pane`
- `subsys.tui.status-surfaces`

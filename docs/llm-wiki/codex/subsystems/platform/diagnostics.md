---
id: subsys.platform.diagnostics
title: Diagnostics（doctor + process gauges）
kind: subsystem
tier: T2
source: [codex-rs/diagnostics/src/lib.rs, codex-rs/cli/src/doctor.rs, codex-rs/cli/src/doctor/disk.rs, codex-rs/cli/src/doctor/security.rs, codex-rs/cli/src/doctor/windows_dev_drive.rs, codex-rs/app-server/src/request_processors/diagnostics.rs, codex-rs/app-server/src/message_processor.rs, codex-rs/app-server-protocol/src/protocol/v2/diagnostics.rs, codex-rs/app-server-protocol/src/protocol/common.rs]
symbols: [Gauge, GaugeGuard, DiagnosticsSnapshot, snapshot, run_doctor, DoctorCheck, check, read_server_diagnostics, ServerDiagnostics, ServerDiagnosticsResponse]
related: [cli.subcommands, rpc.overview, subsys.platform.telemetry-otel, config.storage-telemetry-misc]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> `codex_diagnostics` 提供进程内、无内容的 gauge/process snapshot；`codex doctor` 用只读检查拼出人读/JSON 报告；app-server 的 experimental `server/diagnostics` RPC 把同一 snapshot 映射成协议响应。三者都不修复环境。[E: codex-rs/diagnostics/src/lib.rs:90][E: codex-rs/cli/src/doctor.rs:311][E: codex-rs/cli/src/doctor.rs:331][E: codex-rs/app-server/src/request_processors/diagnostics.rs:5][E: codex-rs/app-server-protocol/src/protocol/common.rs:496]

## 能回答的问题

- `codex-rs/diagnostics` crate 记录什么，怎样注册 gauge？
- `codex doctor` 检查哪些类别，失败时退出码是什么？
- disk / endpoint security / Windows Dev Drive / storage 检查分别怎样判定？
- `server/diagnostics` 的 wire 名、experimental 门控和响应字段是什么？
- process snapshot 在 macOS / Linux / Windows 上分别填哪些内存字段？

## 职责边界

`codex_diagnostics` 只暴露进程级 `ProcessSnapshot` 与已注册 `Gauge`；它不读用户文件内容，也不实现 doctor 检查。[E: codex-rs/diagnostics/src/lib.rs:75][E: codex-rs/diagnostics/src/lib.rs:83][E: codex-rs/diagnostics/src/lib.rs:90]

`codex doctor` 是 CLI 只读报告：检查安装、配置、auth、终端、state 路径和有界可达性，失败写入报告并以非零退出；它不修复问题，也不启动长生命周期服务。[E: codex-rs/cli/src/doctor.rs:311][E: codex-rs/cli/src/doctor.rs:317][E: codex-rs/cli/src/doctor.rs:331]

`server/diagnostics` 是 app-server experimental client method；handler 直接调用 `codex_diagnostics::snapshot()` 并拷贝 process/gauge 字段。[E: codex-rs/app-server-protocol/src/protocol/common.rs:494][E: codex-rs/app-server-protocol/src/protocol/common.rs:496][E: codex-rs/app-server/src/message_processor.rs:921][E: codex-rs/app-server/src/request_processors/diagnostics.rs:5]

## 关键 crate/文件

- `codex-rs/diagnostics/src/lib.rs`：`Gauge`、`GaugeGuard`、`snapshot()`、按 OS 填 `ProcessSnapshot`。[E: codex-rs/diagnostics/src/lib.rs:9][E: codex-rs/diagnostics/src/lib.rs:41][E: codex-rs/diagnostics/src/lib.rs:90]
- `codex-rs/cli/src/doctor.rs`：`run_doctor`、并行检查编排、state/storage 检查。[E: codex-rs/cli/src/doctor.rs:311][E: codex-rs/cli/src/doctor.rs:338][E: codex-rs/cli/src/doctor.rs:2198]
- `codex-rs/cli/src/doctor/disk.rs`：`CODEX_HOME` 与 worktree 可用空间阈值。[E: codex-rs/cli/src/doctor/disk.rs:16]
- `codex-rs/cli/src/doctor/security.rs`：endpoint 产品探测与未验证 exclusion 警告。[E: codex-rs/cli/src/doctor/security.rs:34]
- `codex-rs/cli/src/doctor/windows_dev_drive.rs`：Windows Dev Drive / trusted volume 检查。[E: codex-rs/cli/src/doctor/windows_dev_drive.rs:42]
- `codex-rs/app-server/src/request_processors/diagnostics.rs` 与 `protocol/v2/diagnostics.rs`：RPC 映射。[E: codex-rs/app-server/src/request_processors/diagnostics.rs:5][E: codex-rs/app-server-protocol/src/protocol/v2/diagnostics.rs:14]

## 数据模型

- `Gauge` 用 `AtomicU64` 保存值，`Once` 保证首次 `increment()`/`track()` 才把自己推进程级 `GAUGES` 列表；`decrement()` 用 saturating subtract 防止下溢。[E: codex-rs/diagnostics/src/lib.rs:9][E: codex-rs/diagnostics/src/lib.rs:26][E: codex-rs/diagnostics/src/lib.rs:32][E: codex-rs/diagnostics/src/lib.rs:46]
- `GaugeGuard` 在 Drop 时 decrement，用于对象生命周期计数。[E: codex-rs/diagnostics/src/lib.rs:57][E: codex-rs/diagnostics/src/lib.rs:62]
- `ProcessSnapshot` 含 `id`、`resident_memory_bytes`、`physical_footprint_bytes`；macOS 填两者（`ri_resident_size` / `ri_phys_footprint`），Linux 只从 `/proc/self/statm` 页数推 resident，Windows 只填 working set，其它 OS 只填 pid。[E: codex-rs/diagnostics/src/lib.rs:76][E: codex-rs/diagnostics/src/lib.rs:124][E: codex-rs/diagnostics/src/lib.rs:141][E: codex-rs/diagnostics/src/lib.rs:187][E: codex-rs/diagnostics/src/lib.rs:195]
- `DiagnosticsSnapshot` 把 process 与按 name 排序后的 gauges 放在一起。[E: codex-rs/diagnostics/src/lib.rs:84][E: codex-rs/diagnostics/src/lib.rs:100]
- `ServerDiagnosticsParams` 是空对象；`ServerDiagnosticsResponse` 镜像 process + gauges，字段 camelCase。[E: codex-rs/app-server-protocol/src/protocol/v2/diagnostics.rs:9][E: codex-rs/app-server-protocol/src/protocol/v2/diagnostics.rs:14][E: codex-rs/app-server-protocol/src/protocol/v2/diagnostics.rs:22][E: codex-rs/app-server-protocol/src/protocol/v2/diagnostics.rs:33]
- `DoctorCheck` 是 doctor 行：id、类别、status、summary、details、issues、remediation；JSON/human 渲染共用同一结构。[E: codex-rs/cli/src/doctor.rs:222]

## 控制流

1. `snapshot()` 锁 `GAUGES`，读每个 gauge 的 relaxed 值，按 name 排序，再附加当前 `process_snapshot()`。[E: codex-rs/diagnostics/src/lib.rs:90][E: codex-rs/diagnostics/src/lib.rs:100]
2. `run_doctor` 先 `build_report`，再按 `--json` 打印 JSON 或人读报告；`overall_status == Fail` 时 `exit(1)`。[E: codex-rs/cli/src/doctor.rs:317][E: codex-rs/cli/src/doctor.rs:319][E: codex-rs/cli/src/doctor.rs:331]
3. `build_report` 先跑 system、endpoint protection、installation、runtime、search；加载 config 后再跑 disk，Windows 上再跑 Dev Drive；config 成功时并行跑 config/auth/updates/network/websocket/MCP/sandbox/terminal/git/title/state/thread inventory/app-server/provider reachability。[E: codex-rs/cli/src/doctor.rs:346][E: codex-rs/cli/src/doctor.rs:366][E: codex-rs/cli/src/doctor.rs:369][E: codex-rs/cli/src/doctor.rs:394]
4. disk 检查 `CODEX_HOME` 与 worktree：可用空间 `< 1 GiB` 为 Fail，`< 5 GiB` 为 Warning，测不到容量为 Warning。[E: codex-rs/cli/src/doctor/disk.rs:12][E: codex-rs/cli/src/doctor/disk.rs:13][E: codex-rs/cli/src/doctor/disk.rs:59]
5. security 在 macOS/Windows 探测已知 endpoint 产品；检测到产品时 Warning 并给出产品特定 exclusion 建议，不声称已验证 exclusion。[E: codex-rs/cli/src/doctor/security.rs:34][E: codex-rs/cli/src/doctor/security.rs:75][E: codex-rs/cli/src/doctor/security.rs:83]
6. Windows Dev Drive 检查：无 git worktree 或 Windows build `< 22621` 记 Ok；非 Dev Drive / 未 trusted / 无法探测记 Warning。[E: codex-rs/cli/src/doctor/windows_dev_drive.rs:43][E: codex-rs/cli/src/doctor/windows_dev_drive.rs:48][E: codex-rs/cli/src/doctor/windows_dev_drive.rs:59][E: codex-rs/cli/src/doctor/windows_dev_drive.rs:68]
7. `state_check` 检查 `CODEX_HOME`、log dir、sqlite home 与每个 runtime DB 路径，并对存在的 SQLite 做 integrity check；失败建议把损坏库挪开后让 CLI/app-server 重建。[E: codex-rs/cli/src/doctor.rs:2198][E: codex-rs/cli/src/doctor.rs:2204][E: codex-rs/cli/src/doctor.rs:2230]
8. app-server 收到 `ClientRequest::ServerDiagnostics` 后调用 `read_server_diagnostics()`；该方法拷贝 `snapshot()` 的 pid/内存/gauge 列表。[E: codex-rs/app-server/src/message_processor.rs:921][E: codex-rs/app-server/src/request_processors/diagnostics.rs:5][E: codex-rs/app-server/src/request_processors/diagnostics.rs:8]

## 设计动机与权衡

doctor 刻意只读：同一套 redacted 行同时喂人读报告和 `--json`，避免诊断命令改用户状态。[I][E: codex-rs/cli/src/doctor.rs:311][E: codex-rs/cli/src/doctor.rs:319]

`server/diagnostics` 标 `#[experimental("server/diagnostics")]`，响应不含用户内容或日志正文，只给进程计数与内存足迹，降低把会话数据暴露给 IDE/client 的风险。[E: codex-rs/app-server-protocol/src/protocol/common.rs:494][E: codex-rs/app-server-protocol/src/protocol/v2/diagnostics.rs:14][I]

## gotcha

- `Gauge::decrement` 在未 register 时也可以调用，但未 `increment`/`track` 过的 gauge 不会出现在 `snapshot()` 里。[E: codex-rs/diagnostics/src/lib.rs:32][E: codex-rs/diagnostics/src/lib.rs:46]
- Linux `physical_footprint_bytes` 恒为 `None`；不要把 macOS footprint 当成跨平台字段。[E: codex-rs/diagnostics/src/lib.rs:146]
- `server/diagnostics` 需要 experimental API capability；测试断言缺 capability 时拒绝该方法。[E: codex-rs/app-server-protocol/src/protocol/common.rs:494][E: codex-rs/app-server/tests/suite/v2/server_diagnostics.rs:106]
- doctor 的 state 检查失败不会自动修复 SQLite；其它 entry point 也不保证会重建。[E: codex-rs/cli/src/doctor.rs:2230]

## Sources

- `codex-rs/diagnostics/src/lib.rs`
- `codex-rs/cli/src/doctor.rs`
- `codex-rs/cli/src/doctor/disk.rs`
- `codex-rs/cli/src/doctor/security.rs`
- `codex-rs/cli/src/doctor/windows_dev_drive.rs`
- `codex-rs/app-server/src/request_processors/diagnostics.rs`
- `codex-rs/app-server/src/message_processor.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/diagnostics.rs`
- `codex-rs/app-server-protocol/src/protocol/common.rs`

## 相关

- [CLI 子命令 catalog](../../surface/cli/subcommands.md)
- [App-server RPC overview](../../surface/app-server/overview.md)
- [遥测 / OTEL](telemetry-otel.md)
- [存储与遥测配置](../../surface/config/storage-telemetry-misc.md)

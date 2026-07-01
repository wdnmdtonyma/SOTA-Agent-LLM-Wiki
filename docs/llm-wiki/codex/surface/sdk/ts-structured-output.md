---
id: sdk.ts-structured-output
title: TypeScript structured output
kind: sdk
tier: T1
source: [sdk/typescript/src/turnOptions.ts, sdk/typescript/src/outputSchemaFile.ts, sdk/typescript/src/thread.ts, sdk/typescript/src/exec.ts, sdk/typescript/README.md, sdk/typescript/samples/structured_output_zod.ts, codex-rs/exec/src/cli.rs, codex-rs/exec/src/lib.rs]
symbols: [TurnOptions, createOutputSchemaFile, CodexExecArgs.outputSchemaFile, output_schema, load_output_schema]
related: [sdk.ts-overview, sdk.ts-events-items, sdk.sdk-architecture]
evidence: explicit
status: verified
updated: db887d03e1
---

> TypeScript structured output 是 per-turn `outputSchema` 到 CLI `--output-schema FILE` 的桥接：SDK 只接受 plain JSON object schema，写入临时 `schema.json`，把路径传给 `codex exec`，最终 response 仍从 agent message item text 读取。

## 能回答的问题

- TS SDK 的 `outputSchema` 在哪个 option 上暴露？
- SDK 如何校验 schema、写临时文件并清理？
- CLI 哪个 flag 接收 schema 文件？
- Zod schema 是否是 SDK 内建功能？

## Public API

`TurnOptions` 暴露 `outputSchema?: unknown` 和 `signal?: AbortSignal`；README 的 structured output 示例把 plain JSON schema object 作为 `thread.run(..., { outputSchema: schema })` 的 per-turn option。[E: sdk/typescript/src/turnOptions.ts:1][E: sdk/typescript/src/turnOptions.ts:3][E: sdk/typescript/src/turnOptions.ts:5][E: sdk/typescript/README.md:55][E: sdk/typescript/README.md:68]

README 和 sample 展示的是调用方通过外部 `zod-to-json-schema` 把 Zod schema 转成 JSON schema，再传给 `outputSchema`；SDK core 不直接依赖 Zod 是从本节点读取的 TS core files 中没有 Zod import 推断出的实现边界。[E: sdk/typescript/README.md:72][E: sdk/typescript/README.md:81][E: sdk/typescript/samples/structured_output_zod.ts:5][E: sdk/typescript/samples/structured_output_zod.ts:6][E: sdk/typescript/samples/structured_output_zod.ts:17][I]

## File bridge control flow

`Thread.runStreamedInternal()` 在每次 turn 开始前调用 `createOutputSchemaFile(turnOptions.outputSchema)`，把返回的 `schemaPath` 传给 `CodexExec.run({ outputSchemaFile: schemaPath })`，并在 generator finally 中调用 cleanup。[E: sdk/typescript/src/thread.ts:70][E: sdk/typescript/src/thread.ts:74][E: sdk/typescript/src/thread.ts:87][E: sdk/typescript/src/thread.ts:109][E: sdk/typescript/src/thread.ts:110]

`createOutputSchemaFile()` 对 undefined schema 返回 no-op cleanup；实现中的 `isJsonObject()` 接受 non-null 且 non-array 的 object，若检查失败则抛出错误文本 `outputSchema must be a plain JSON object`；对有效 object，在 OS tmpdir 下创建 `codex-output-schema-` 目录并写 `schema.json`，cleanup 递归删除该目录。[E: sdk/typescript/src/outputSchemaFile.ts:10][E: sdk/typescript/src/outputSchemaFile.ts:11][E: sdk/typescript/src/outputSchemaFile.ts:12][E: sdk/typescript/src/outputSchemaFile.ts:15][E: sdk/typescript/src/outputSchemaFile.ts:16][E: sdk/typescript/src/outputSchemaFile.ts:19][E: sdk/typescript/src/outputSchemaFile.ts:20][E: sdk/typescript/src/outputSchemaFile.ts:23][E: sdk/typescript/src/outputSchemaFile.ts:30][E: sdk/typescript/src/outputSchemaFile.ts:38][E: sdk/typescript/src/outputSchemaFile.ts:39]

`CodexExecArgs` 有 `outputSchemaFile?: string` 字段，`CodexExec.run()` 在该字段存在时追加 `--output-schema <file>`。[E: sdk/typescript/src/exec.ts:27][E: sdk/typescript/src/exec.ts:28][E: sdk/typescript/src/exec.ts:124][E: sdk/typescript/src/exec.ts:125]

## CLI side

Rust exec CLI 把 `--output-schema` 定义为 “Path to a JSON Schema file describing the model's final response shape”；exec runtime 的 `load_output_schema()` 读取该文件并按 JSON 解析，读文件失败或 JSON 无效时打印错误并 exit 1。[E: codex-rs/exec/src/cli.rs:52][E: codex-rs/exec/src/cli.rs:53][E: codex-rs/exec/src/cli.rs:54][E: codex-rs/exec/src/lib.rs:747][E: codex-rs/exec/src/lib.rs:1789][E: codex-rs/exec/src/lib.rs:1792][E: codex-rs/exec/src/lib.rs:1799][E: codex-rs/exec/src/lib.rs:1803][E: codex-rs/exec/src/lib.rs:1810]

`Thread.run()` 不解析 structured output JSON，它仍从 completed `agent_message` item 的 `text` 字段更新并返回 `finalResponse` string；调用方需要按自身 schema 解析 `finalResponse` 是由该返回类型推导出的使用要求。[E: sdk/typescript/src/thread.ts:122][E: sdk/typescript/src/thread.ts:123][E: sdk/typescript/src/thread.ts:124][E: sdk/typescript/src/thread.ts:137][I]

## 设计动机

structured output 通过临时文件桥接到 CLI flag，而不是把 schema 嵌入 stdin prompt 或 JSONL control channel；这样 SDK 不需要改变 `CodexExec.run()` 的 line-oriented stdout contract，也能复用 exec CLI 既有 `--output-schema` 入口。[I] `outputSchema?: unknown` 加 runtime plain-object 校验让 TS API 可接受 `as const` JSON schema，也允许用户自行从其他 schema library 转换。[I]

## Sources

- `sdk/typescript/src/turnOptions.ts`
- `sdk/typescript/src/outputSchemaFile.ts`
- `sdk/typescript/src/thread.ts`
- `sdk/typescript/src/exec.ts`
- `sdk/typescript/README.md`
- `sdk/typescript/samples/structured_output_zod.ts`
- `codex-rs/exec/src/cli.rs`
- `codex-rs/exec/src/lib.rs`

## 相关

- `sdk.ts-overview` -> [TypeScript SDK 总览](ts-overview.md)
- `sdk.ts-events-items` -> [TypeScript events/items](ts-events-items.md)

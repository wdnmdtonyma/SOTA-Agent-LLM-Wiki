---
id: ref.tool-schema-conversion
title: Tool Schema Conversion Reference
kind: reference
tier: T3
v: v1
source:
  - packages/opencode/src/tool/json-schema.ts
  - packages/opencode/src/tool/registry.ts
status: verified
updated: 355a0bcf5
evidence: explicit
symbols:
  - fromSchema
  - fromTool
  - normalize
  - legacyJsonSchema
  - zodJsonSchema
related:
  - ref.tool-interface
---

# Tool Schema Conversion Reference

本节点只描述 V1 schema conversion。V2 的 canonical tool schema conversion 在 `packages/core/src/tool/tool.ts` 由 `Tool.toJsonSchema` 私有使用，不走 `packages/opencode/src/tool/json-schema.ts` 的 V1 normalization path。[E: packages/core/src/tool/tool.ts:140] [I]

## V1 Pipeline

1. `fromSchema(schema)` 以 Effect `Schema.toJsonSchemaDocument(schema, { additionalProperties: true })` 生成 draft-2020-12 JSON schema document。[E: packages/opencode/src/tool/json-schema.ts:8] [E: packages/opencode/src/tool/json-schema.ts:12]
2. 转换器把 draft-2020-12 `$schema`、root schema 和非空 definitions 合成一个 root schema；非空 definitions 在这里保留为 `$defs`。[E: packages/opencode/src/tool/json-schema.ts:14] [E: packages/opencode/src/tool/json-schema.ts:16]
3. root schema 经过 `normalize(...)`、`inlineLocalReferences(...)` 和 `dropDefinitionsIfResolved(...)`，然后写入 `WeakMap` cache。[E: packages/opencode/src/tool/json-schema.ts:18] [E: packages/opencode/src/tool/json-schema.ts:20]
4. `fromTool(tool)` 优先使用 `tool.jsonSchema` override；只有没有 override 才从 `tool.parameters` 转换。[E: packages/opencode/src/tool/json-schema.ts:24] [E: packages/opencode/src/tool/json-schema.ts:25]

## V1 Normalization Rules

| 规则 | 输入迹象 | 输出行为 | 设计动机 |
| --- | --- | --- | --- |
| 递归对象/数组 | `normalize` 对 object 递归 entries，对 array 递归 map。[E: packages/opencode/src/tool/json-schema.ts:28] [E: packages/opencode/src/tool/json-schema.ts:35] | 所有 nested schema 都会被同一组规则处理。 | 避免只修 root schema 导致 provider 看到未兼容的 nested schema。[I] |
| 删除 `additionalProperties: true` | normalized schema 上的 `additionalProperties` 为 `true`。[E: packages/opencode/src/tool/json-schema.ts:49] | 默认开放属性不显式输出。 | V1 生成时先允许 additional properties，再删掉冗余 true。[E: packages/opencode/src/tool/json-schema.ts:12] |
| 可选字段 null cleanup | object property 不在 `required` 且 `anyOf` 含 `null`。[E: packages/opencode/src/tool/json-schema.ts:51] | 从 optional property 的 `anyOf` 删除 `null` branch。 | 让 optional 用 missing 表达，减少 union-null schema。[I] |
| 单元素 `anyOf` | `anyOf` normalize 后只剩一个 item。[E: packages/opencode/src/tool/json-schema.ts:72] | 用唯一 item 代替 wrapper。 | 压平无意义 union。[I] |
| safe `allOf` flatten | `canFlattenAllOf(schema.allOf, schema)` 允许合并。[E: packages/opencode/src/tool/json-schema.ts:78] [E: packages/opencode/src/tool/json-schema.ts:110] | merge allOf object branches。 | 降低 provider 对 `allOf` 支持差异。[I] |
| integer safe range | type 为 integer 且 `maximum === undefined`。[E: packages/opencode/src/tool/json-schema.ts:83] | 返回对象会保留已有字段、补 `minimum: Number.MIN_SAFE_INTEGER`，并设置 `maximum: Number.MAX_SAFE_INTEGER`。[E: packages/opencode/src/tool/json-schema.ts:84] | 避免 unbounded integer 在 provider 侧表现不稳定。[I] |
| local ref inline | `$ref` 以 `#/$defs/` 或 `#/definitions/` 开头且定义存在。[E: packages/opencode/src/tool/json-schema.ts:125] [E: packages/opencode/src/tool/json-schema.ts:127] | 用 referenced definition 内容替换 `$ref`。[E: packages/opencode/src/tool/json-schema.ts:132] | 减少 provider 不支持 local refs 的风险。[I] |
| unused definitions drop | `hasLocalReference` 返回 false。[E: packages/opencode/src/tool/json-schema.ts:146] [E: packages/opencode/src/tool/json-schema.ts:147] | 删除 root 上的 `$defs` 和 `definitions`。[E: packages/opencode/src/tool/json-schema.ts:148] | inline 之后避免悬空 defs。 |

## Plugin Tool Conversion

V1 registry 的 plugin tool conversion 是 schema conversion 的第二入口。`fromPlugin(id, input)` 先把缺失 args 归一为 `{}`，然后判断 args 是否全是 Zod schema。[E: packages/opencode/src/tool/registry.ts:114] [E: packages/opencode/src/tool/registry.ts:119] [E: packages/opencode/src/tool/registry.ts:121]

| plugin args 类型 | `parameters` | `jsonSchema` | 证据 |
| --- | --- | --- | --- |
| 全部 Zod | `zodParams(zodArgs)`，也就是 `Schema.Any` 占位 | `zodJsonSchema(z.object(zodArgs))` | [E: packages/opencode/src/tool/registry.ts:122] [E: packages/opencode/src/tool/registry.ts:123] [E: packages/opencode/src/tool/registry.ts:125] |
| legacy JSON shape | `Schema.Struct(...)`，每个 key 都是 `Schema.Any` | `legacyJsonSchema(args)` | [E: packages/opencode/src/tool/registry.ts:124] [E: packages/opencode/src/tool/registry.ts:126] |

`legacyJsonSchema` 只接受 `input.type === "object"` 的 legacy shape；它把 properties 的每个 key 都列入 `required`。[E: packages/opencode/src/tool/registry.ts:354] [E: packages/opencode/src/tool/registry.ts:359] `zodJsonSchema` 使用 `z.toJSONSchema` 和 metadata registry，再把 `$defs` 改成 `definitions`。[E: packages/opencode/src/tool/registry.ts:365] [E: packages/opencode/src/tool/registry.ts:369]

## Provider-Facing Mutation During Tool Materialization

V1 registry 在 `tools(input)` 里把每个 initialized tool 映射为 model-facing definition。plugin hook `tool.definition` 可以改 description、parameters 和 jsonSchema；当 `parameters` 未变化或 hook 显式改了 `jsonSchema` 时，registry 保留或更新 `jsonSchema` 字段。[E: packages/opencode/src/tool/registry.ts:284] [E: packages/opencode/src/tool/registry.ts:290] task tool 还会在 materialization 时按 agent 生成动态 description。[E: packages/opencode/src/tool/registry.ts:295]

## Sources

- packages/opencode/src/tool/json-schema.ts
- packages/opencode/src/tool/registry.ts

## Related

- ref.tool-interface

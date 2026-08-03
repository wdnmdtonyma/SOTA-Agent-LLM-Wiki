# Baseten model catalog audit — c1019d9202

## Source boundary

- target: `c1019d9202b648143d123b7e6fb76543a6b82de6`
- fetched URL: `https://models.dev/api.json`
- fetched at: `2026-08-03T13:10:07Z`
- response SHA-256: `b3a52ba98bb4b58714734f8bb98c9bc7ffeff3558f915bcc3211cfe5f276728d`
- Baseten input rows: 18
- active rows: 16
- deprecated rows: 2

The target tree contains only the generated wrapper, which imports the ignored `providers/data/baseten.json`; it does not contain the final row payload.[E: packages/ai/src/providers/baseten.models.ts:4] [E: packages/ai/src/providers/baseten.models.ts:7] The generator fetches models.dev, passes `data.baseten` to the Baseten processor, skips exactly the rows whose status is `deprecated`, and emits the remaining ids with provider `baseten` and API `openai-completions`.[E: packages/ai/scripts/generate-models.ts:1094] [E: packages/ai/scripts/generate-models.ts:1142] [E: packages/ai/scripts/generate-models.ts:1143] [E: packages/ai/scripts/generate-models.ts:1164] [E: packages/ai/scripts/generate-models.ts:1167] [E: packages/ai/scripts/generate-models.ts:1168] [E: packages/ai/scripts/generate-models.ts:1191] [E: packages/ai/scripts/generate-models.ts:1193] [E: packages/ai/scripts/generate-models.ts:1746]

## Active ids after applying the target filter

1. `nvidia/Nemotron-120B-A12B`
2. `nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B`
3. `thinkingmachines/inkling-small`
4. `thinkingmachines/inkling`
5. `zai-org/GLM-5`
6. `zai-org/GLM-5.2-Fast`
7. `zai-org/GLM-5.2`
8. `zai-org/GLM-5.1`
9. `zai-org/GLM-4.7`
10. `deepseek-ai/DeepSeek-V4-Flash-0731`
11. `deepseek-ai/DeepSeek-V4-Pro`
12. `moonshotai/Kimi-K2.6`
13. `moonshotai/Kimi-K2.5`
14. `moonshotai/Kimi-K2.7-Code`
15. `moonshotai/Kimi-K3`
16. `openai/gpt-oss-120b`

## Count derivation and evidence grade

The latest published `@earendil-works/pi-ai@0.83.0` artifact remains the 37-shard, 1,153-model baseline documented in `model-catalog-v0.83.0.md`. The target adds one Baseten shard; applying target generator semantics to the hashed remote snapshot contributes 16 rows, so the updated catalog count is `1,153 + 16 = 1,169` and the static bucket count is 38. Because the Baseten JSON payload is remote and absent from the target Git tree, every Baseten row and the derived exact total remain `[I]`, not `[E]`.

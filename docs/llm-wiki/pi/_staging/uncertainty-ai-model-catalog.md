# uncertainty-ai-model-catalog

- L2 verified `ref.ai.model-catalog` against current `pi/packages/ai/src/models.generated.ts` import expansion: 35 provider buckets, 1019 expected model instances, 1019 Markdown rows, 0 missing, 0 extra, 0 duplicate, 0 identity/field drift for id/name/provider/api/context/cost/reasoning/input.
- L2 verified `[E]` references: 17161 total refs, 16139 unique refs, 37 source files, 0 missing paths or out-of-range lines; row evidence labels checked against 16046 cited source lines with 0 mismatches.
- L3 lint fix: generated-file header comments in `ref.ai.model-catalog` now use path-level evidence markers instead of line-level evidence anchors.
- [U] `index.json` still lists `group.models.instance_count` as `200`, but current `MODELS` import expansion produced `1019` rows for this node. I did not update `index.json` because this task requested only the catalog node and this staging file.

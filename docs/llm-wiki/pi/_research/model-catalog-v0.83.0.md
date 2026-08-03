# Pi AI model catalog v0.83.0 artifact audit

- package: `@earendil-works/pi-ai@0.83.0`
- registry gitHead: `845d6ff1f6643aba440341cce877ce1c43ebbc39`
- target: `a8ee03b8156c2232d67ad2cdb79683b4a5c8fdbe`
- ancestry: `git merge-base --is-ancestor 845d6ff1... a8ee03b8...` passed
- tarball SHA-256: `f983c28a21209305ed9c274977e29130fa4d8848df6cdf37e9094d95cc7bc6d4`
- manifest schema: 3
- manifest structureHash: `5d82f5b1946bdf6d01733aa2a4e4410849c6d44a2ad3038171078c17aed367ce`
- manifest files: 37; bad hashes: 0
- flattened model membership: 1,153
- v0.82.1 → v0.83.0: +51 / -7 = +44
- target inferred API distribution: anthropic-messages 276; azure-openai-responses 38; bedrock-converse-stream 114; google-generative-ai 29; google-vertex 12; mistral-conversations 30; openai-codex-responses 7; openai-completions 556; openai-responses 91.

The target Git tree does not contain the final generated model JSON. Release-to-target generator changes move two Fireworks Kimi K3 rows from Anthropic compatibility to OpenAI Completions without changing membership. Therefore the 1,153-instance catalog remains `[I]`, not commit-local `[E]`.

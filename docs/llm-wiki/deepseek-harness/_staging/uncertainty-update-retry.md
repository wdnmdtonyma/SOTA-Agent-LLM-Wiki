# uncertainty-update-retry

- Package README prose claiming retry “closes the failed turn / fresh numbered turn” is not present under `packages/llm/llm-retry/` at `0a53fb55be`. Loop code still `continue`s the same `while` (`agent.ts` 407) and tests see one `step/start`. Left `[U]` on that gotcha so a later README regression is not treated as verified text.

# uncertainty-update-workflow

- 工具 description 写脚本「has no filesystem, network, timer, or Node.js APIs」。shipped `PtcWorkflowEngine` 在 confined Node 进程里跑 guest `vm`；测试仍用 `globalThis.constructor.constructor('return process')()` 摸到 `process`，只钉死 guest `process.env` 为空对象。正文按 containment + session file policy 写，不把「无 Node API」当成可执行安全边界。见 `packages/workflow/tool-workflow/src/index.ts:166` 与 `packages/workflow/workflow-ptc/tests/egress.spec.ts:35`。

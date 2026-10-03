# uncertainty: surface.skills.system

本轮 rewrite `surface.skills.system` 未新增 `[U]`。已删除 harness loader 对照;不再登记把 `packages/agent/src/harness/system-prompt.ts` 加入 source 的 unknown。

文档 `/skill:name` 现写 arguments are appended to the loaded instructions as a user request,`_expandSkillCommand()` 把 trim 后的 args 追加到 skill block 后,本轮不再保留旧的 `User: <args>` 前缀不一致 `[U]`。

保留 `[I]`:

- `disable-model-invocation` 不禁用 `/skill:name`:formatter 过滤该字段,`_expandSkillCommand()` 不检查。
- `enableSkillCommands=false` 只影响 interactive autocomplete 注册。

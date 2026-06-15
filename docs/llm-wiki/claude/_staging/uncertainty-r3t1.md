# Uncertainty — round r3t1 (subsystems/buddy.md)

本文件汇总 `subsystems/buddy.md` 写作中标 `[U]` 的待证实项。源码根:`Best/claude/`,相对本目录 `../../../claude/`。

## buddy 子系统 [U] 项

- **`/buddy` slash command 实现**:`commands.ts:120` 通过 `require('./commands/buddy/index.js')` feature-gated 加载,但 `commands/buddy/` 目录未含在 dump 中(`ls commands/buddy/` 不存在)。因此 `/buddy`、`/buddy pet`、孵化(hatch)写 `config.companion` 的具体流程、soul(name/personality)由哪个模型/prompt 生成、`companionPetAt` 由谁写入,均 **无法从所给 6 文件证实**。属注册级薄页之外的实现细节,记 `[U]`,不臆造。 [U]

- **`companionReaction` 的来源 observer**:`state/AppStateStore.ts:168` 注释指向 `src/buddy/observer.ts`(“friend observer”),`screens/REPL.tsx:2805` 调 `fireCompanionObserver(...)` 把 reaction 写进 AppState。`buddy/observer.ts` 与 `fireCompanionObserver` 的定义均未含在 dump 的 6 文件中,reaction 文本如何按 per-turn 生成(模型调用?prompt?节流?)**未知**。 [U]

- **`companionIntroText` 中 “its bubble will answer” 的 bubble 应答链路**:prompt.ts 注入的系统提示让主模型在用户点名 companion 时“让位、一行内回答”,但“bubble 自己回答”所依赖的 observer/soul 生成不在本 dump,端到端对话链路 **部分未知**。 [U]

- **`hatchedAt` 写入时机**:`types.ts:118` 定义 `Companion.hatchedAt: number`、`StoredCompanion` 持久化它,但写入发生在缺失的 `/buddy` 孵化命令中,**无法证实**。 [U]

- **species canary / `excluded-strings.txt`**:`types.ts:10-13` 注释称某 species 名与 `excluded-strings.txt` 里的 model-codename canary 撞名,故用 `String.fromCharCode` 运行时构造以避免字面量进 bundle。`excluded-strings.txt` 与该构建检查脚本不在 dump,注释所述构建机制 **无法独立核对**,按 `[I]` 采信注释意图。 [U]

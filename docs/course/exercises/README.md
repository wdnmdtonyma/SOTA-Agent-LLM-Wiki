# Agent Runtime 设计课 · 配套习题

这是 [`../`](../) 那门「Agent Runtime 设计课」(基于 claude / codex 真实源码、落到 deepseek)的**配套习题集**。它不是复习题——**除了热身,答案大多不在课文里**,题目把你扔进课文没替你解过的局面,逼你现场把机制拼起来推、算、诊断、设计。目标:

1. **巩固**——把课文的真实机制、字段、阈值、控制流钉死;
2. **牵引深思**——围绕「如何建设一个**更强、更稳、更自动**的 agent harness」,逼你以 deepseek harness 架构师的身份做决策并辩护。

---

## 每份习题的四层结构

| 层 | 目标 | 题型 | 标准答案 |
|---|---|---|---|
| **热身** | 快速校准,破除凭印象 | 判断改错(**埋雷**:常有一句其实是对的,别逢句就改) | 有 |
| **机制层** | 把机制逼到你必须真懂 | `推演`(脑里跑一遍机器)· `量化`(建成本模型、算临界点、给一个敢写进代码的常量)· `破`(构造一个课文那个"解决方案"机制**救不了**的反例) | 有 |
| **实战层(主菜)** | 干高级工程师每天真干的活 | `故障排查`(差分诊断一个欠定的线上事故)· `效果优化`(works 但不够好,在约束下调旋钮、权衡反作用)· `架构设计`(设计一个子系统/系统级取舍,用具体场景验证) | 无(给「评点」:维度+陷阱);`故障排查`有 root cause |
| **收口** | 把本课机制收到主线上 | 强 / 稳 / 自动 三性综合 | 无(给「评点」) |

**两个设计原则**:

- **答案不在课文里、题面不替你拆好子问题**。课文给零件(机制、字段、阈值),题目给一个没解过的局面;"看出该先问哪几个子问题"本身就是一半难度。
- **实战层对着主线练**:`故障排查 ↔ 练"稳"`(内化失败模式)、`效果优化 ↔ 练"强"`(摸清性能/质量旋钮)、`架构设计 ↔ 练综合`。牵引线不只是每课末尾收口一句,而是每课用三道实战题真刀真枪练一遍。

---

## 怎么用

1. **全部闭卷先做**。`热身/推演/量化/破/故障排查` 有标准解,做完对照文末「参考解」。
2. `效果优化/架构设计/收口` 无标准答案,先独立写自己的方案,再看「评点」里「强答案应触及的维度 + 常见陷阱」自评。
3. 每题后的 `[决策X]` 指向课文对应小节,卡住了回去找零件。

---

## 目录与状态

| 课 | 习题 | 状态 |
|---|---|---|
> 全部 12 份于 **2026-06-26 对齐重写后的新课文整体重制**:01–07 因课文更新而推倒重出、08–12 新建;每份由一个 subagent 独立出题并**对抗性回查源码**(防答案键出错)。

| 课 | 习题 | 状态 |
|---|---|---|
| 第 1 课 Agent 主循环 | [`lesson-01-agent-loop.md`](lesson-01-agent-loop.md) | ✅ 重制·已核源码 |
| 第 2 课 工具系统 | [`lesson-02-tool-system.md`](lesson-02-tool-system.md) | ✅ 重制·已核源码 |
| 第 3 课 上下文工程与压缩 | [`lesson-03-context-compaction.md`](lesson-03-context-compaction.md) | ✅ 重制·已核源码 |
| 第 4 课 记忆系统 | [`lesson-04-memory-system.md`](lesson-04-memory-system.md) | ✅ 重制·已核源码 |
| 第 5 课 持久化 / 回放 / 回滚 | [`lesson-05-persistence-replay-rollback.md`](lesson-05-persistence-replay-rollback.md) | ✅ 重制·已核源码 |
| 第 6 课 权限 / 审批 / 沙箱 | [`lesson-06-permissions-approval-sandbox.md`](lesson-06-permissions-approval-sandbox.md) | ✅ 重制·已核源码 |
| 第 7 课 多 agent 编排 | [`lesson-07-multi-agent-orchestration.md`](lesson-07-multi-agent-orchestration.md) | ✅ 重制·已核源码 |
| 第 8 课 Prompt / 指令架构 | [`lesson-08-prompt-instruction-architecture.md`](lesson-08-prompt-instruction-architecture.md) | ✅ 新建·已核源码 |
| 第 9 课 模型 / API 层 | [`lesson-09-model-api-layer.md`](lesson-09-model-api-layer.md) | ✅ 新建·已核源码 |
| 第 10 课 可扩展性 | [`lesson-10-extensibility.md`](lesson-10-extensibility.md) | ✅ 新建·已核源码 |
| 第 11 课 优化方法论 | [`lesson-11-optimization-methodology.md`](lesson-11-optimization-methodology.md) | ✅ 新建·已核源码 |
| 第 12 课 capstone(终章综合) | [`lesson-12-capstone.md`](lesson-12-capstone.md) | ✅ 新建·终章 capstone |

---

## 终章 capstone:已并入第 12 课

原计划单独写一份 `capstone-harness-blueprint.md`,把全部课程综合成一份 deepseek harness 蓝图。课程已补齐到 12 课,**第 12 课本身就是 capstone**,这份终章综合已直接做进 [`lesson-12-capstone.md`](lesson-12-capstone.md) 的实战层与收口,不再另起文件。它涵盖原计划的四块:

- **A 综合蓝图**:架构设计题「只给 M0 预算,画出 M0 总装蓝图」——把各课「deepseek 落地」综合成一张图,标出缓存 / 持久化 / 压缩 / 权限 / 隔离边界;
- **B 三性清单**:收口题把 **强 / 稳 / 自动** 收成可执行判据,每条回扣出自哪课;
- **C 跨课陷阱**:破题与故障排查用「一个横切不变量被某子系统破坏、连锁炸几个系统」的跨课陷阱(压缩炸缓存、自动写记忆引污染 / 递归);
- **D 终极开放题**:架构设计正题「只能先实现 N 个机制做 M0,选哪几个、为什么是地基」,呼应宪法 parity-first。

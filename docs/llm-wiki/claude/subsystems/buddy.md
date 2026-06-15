---
id: subsys.buddy
path: subsystems/buddy.md
title: Buddy 伙伴 / companion 子系统（easter-egg）
kind: subsystem
tier: T2
status: verified
source: [buddy/companion.ts, buddy/CompanionSprite.tsx, buddy/prompt.ts, buddy/sprites.ts, buddy/types.ts, buddy/useBuddyNotification.tsx]
symbols: [getCompanion, roll, rollWithSeed, companionUserId, renderSprite, renderFace, CompanionSprite, CompanionFloatingBubble, companionReservedColumns, useBuddyNotification, findBuddyTriggerPositions, isBuddyTeaserWindow, isBuddyLive, companionIntroText, getCompanionIntroAttachment, CompanionBones, CompanionSoul, StoredCompanion, Companion, SPECIES, RARITY_WEIGHTS, RARITY_COLORS]
related: [subsys.session-state, ref.feature-flags, subsys.config-settings, ui.prompt-input, ui.messages, tool.repl]
updated: 2026-06-14
evidence: explicit
---

> `buddy/` 是一个 **feature-gated 的 easter-egg 子系统**:一只 ASCII 动画"伙伴"(companion)坐在 PromptInput 输入框旁,有稀有度/属性/名字,会 idle 摆动、被 `/buddy pet` 时冒爱心、并在每轮对话后由 observer 让它在气泡里说俏皮话。整套由 `feature('BUDDY')` 编译期标志门控,2026-04-01~04-07 有一周 `/buddy` rainbow teaser。

## 能回答的问题

- buddy / companion 是什么?是哪种 easter-egg,谁门控它?
- companion 的外观(species/eye/hat/稀有度/属性)从哪来、为什么不能靠改 config 刷出 legendary?
- `/buddy` teaser 通知什么时候弹、弹多久、由哪个 hook 触发?
- sprite 的 idle 动画、blink、pet 爱心、speech bubble 是怎么渲染的?
- companion 怎么"插话"进主模型对话?`companion_intro` attachment 干什么?
- buddy 在窄/宽终端、fullscreen/非 fullscreen 下分别怎么布局?为什么要 reserve 列宽?

## 职责边界

buddy 子系统 **只负责**:① 从 `userId` 确定性派生 companion 的"骨架"(bones:species/eye/hat/rarity/stats)`[E: buddy/companion.ts:91]`;② 把骨架渲染成多帧 ASCII sprite 与单行 face `[E: buddy/sprites.ts:454]`;③ 在 REPL/PromptInput 旁挂载动画组件、teaser 通知、并向主模型注入一段 `companion_intro` 系统提示 `[E: buddy/prompt.ts:31]`。

它 **不负责**(均在所给 6 文件之外):`/buddy` slash command 的孵化(hatch)/pet 实现(feature-gated,装配在 `commands.ts:120` 经 `require('./commands/buddy/index.js')`,该目录未含在 dump,实现细节 `[U]`);per-turn reaction 文本的生成器 `buddy/observer.ts` / `fireCompanionObserver`(由 `state/AppStateStore.ts:168` 注释与 `screens/REPL.tsx:2805` 引用,本体不在 dump,机制 `[U]`)。companion 的 **soul**(name + personality)由模型生成并存入 config,但生成发生在缺失的命令里,故"如何生成"`[U]`。

## 关键文件(证据)

| 文件 | 角色 | 关键导出 |
|---|---|---|
| `buddy/types.ts` | 数据模型 + 常量表 | `SPECIES`/`EYES`/`HATS`/`STAT_NAMES`、`RARITY_WEIGHTS`/`RARITY_STARS`/`RARITY_COLORS`、`CompanionBones`/`CompanionSoul`/`StoredCompanion`/`Companion` |
| `buddy/companion.ts` | 确定性 roll + 取 companion | `roll`/`rollWithSeed`/`companionUserId`/`getCompanion` |
| `buddy/sprites.ts` | ASCII 帧库 + 渲染 | `BODIES`/`HAT_LINES`、`renderSprite`/`renderFace`/`spriteFrameCount` |
| `buddy/CompanionSprite.tsx` | Ink 动画组件 + 布局预算 | `CompanionSprite`/`CompanionFloatingBubble`/`companionReservedColumns`/`MIN_COLS_FOR_FULL_SPRITE` |
| `buddy/useBuddyNotification.tsx` | teaser 通知 hook + 触发探测 | `useBuddyNotification`/`findBuddyTriggerPositions`/`isBuddyTeaserWindow`/`isBuddyLive` |
| `buddy/prompt.ts` | 注入主模型的 companion 系统提示 | `companionIntroText`/`getCompanionIntroAttachment` |

每个对外入口都先查 `feature('BUDDY')`:`getCompanionIntroAttachment` `[E: buddy/prompt.ts:18]`、`useBuddyNotification` 的 effect `[E: buddy/useBuddyNotification.tsx:53]`、`findBuddyTriggerPositions` `[E: buddy/useBuddyNotification.tsx:83]`、`companionReservedColumns` `[E: buddy/CompanionSprite.tsx:168]`、`CompanionSprite` `[E: buddy/CompanionSprite.tsx:215]`、`CompanionFloatingBubble` `[E: buddy/CompanionSprite.tsx:340]`。`feature` 来自 `bun:bundle`,是 **编译期裁剪**:关闭时整段 dead-code 被消除,companion 在生产构建里默认不存在。见 [Feature flags](../reference/feature-flags.md)。

## 数据模型

companion 拆成"骨架 + 灵魂"两层,**只有灵魂持久化**:

- `CompanionBones`(确定性,从 `hash(userId)` 派生,**从不存盘**):`rarity`/`species`/`eye`/`hat`/`shiny`/`stats` `[E: buddy/types.ts:101]`。
- `CompanionSoul`(模型生成,首次孵化后存 config):`name`/`personality` `[E: buddy/types.ts:111]`。
- `Companion` = `CompanionBones & CompanionSoul & { hatchedAt }` `[E: buddy/types.ts:116]`,运行时合成对象。
- `StoredCompanion` = `CompanionSoul & { hatchedAt }` `[E: buddy/types.ts:124]` —— **真正落进 config 的只有这个**;`config.companion` 类型即 `StoredCompanion` `[E: utils/config.ts:270]`,另有 `companionMuted?: boolean` `[E: utils/config.ts:271]`。

常量表:`RARITIES` 五档 common→legendary `[E: buddy/types.ts:1]`;掉率权重 `RARITY_WEIGHTS = {common:60, uncommon:25, rare:10, epic:4, legendary:1}` `[E: buddy/types.ts:126]`;`SPECIES` 18 种(duck/goose/blob/cat/dragon/…/chonk)`[E: buddy/types.ts:54]`;`EYES` 6 个字符 `[E: buddy/types.ts:76]`;`HATS` 8 种(含 `none`)`[E: buddy/types.ts:79]`;`STAT_NAMES` 5 项 `DEBUGGING/PATIENCE/CHAOS/WISDOM/SNARK` `[E: buddy/types.ts:91]`。稀有度→主题色映射 `RARITY_COLORS`(common→`inactive`、legendary→`warning`)`[E: buddy/types.ts:142]`。

**species 字符串的反 canary 编码**:18 个 species 名不写字面量,而用 `const c = String.fromCharCode` `[E: buddy/types.ts:14]` 运行时逐字符构造(如 `duck = c(0x64,0x75,0x63,0x6b)` `[E: buddy/types.ts:17]`)。源码注释(`types.ts:10-13`)称某 species 名与 `excluded-strings.txt` 里的 model-codename canary 撞名,该检查 grep 的是构建产物而非源码,运行时构造能让字面量不进 bundle、同时让 canary 检查对真正的 codename 仍生效 [I]。`as 'duck'` 等只是 type 位置断言,bundle 前擦除。`excluded-strings.txt` 与该构建检查不在 dump,注释意图采信但未独立核对 [U],见 `_staging/uncertainty-r3t1.md`。

## 控制流

### A. companion 的确定性派生(`getCompanion`)

1. `companionUserId()` 取 `config.oauthAccount?.accountUuid ?? config.userID ?? 'anon'` 作为身份 `[E: buddy/companion.ts:121]`。
2. `roll(userId)`:key = `userId + SALT`(`SALT='friend-2026-401'`)`[E: buddy/companion.ts:84]`,用 `mulberry32(hashString(key))` 这个 seeded PRNG 生成 `[E: buddy/companion.ts:110]`;结果按 key 缓存(`rollCache`),因为同一 userId 会被 500ms sprite tick、每键 PromptInput、每轮 observer 三条热路径反复调用 `[E: buddy/companion.ts:109]`。
3. `rollFrom`:先 `rollRarity`(按 `RARITY_WEIGHTS` 加权轮盘)`[E: buddy/companion.ts:43]`,再 `pick` species/eye `[E: buddy/companion.ts:95]`;hat 仅当非 common 才掷,common 恒 `none` `[E: buddy/companion.ts:97]`;`shiny` 概率 1%(`rng() < 0.01`)`[E: buddy/companion.ts:98]`;`rollStats` 按稀有度 floor 给一个 peak、一个 dump、其余散布 `[E: buddy/companion.ts:62]`。
4. `getCompanion()`:**没有 `config.companion`(未孵化)就返回 `undefined`** `[E: buddy/companion.ts:129]`;否则重新 roll 出 bones,以 `{ ...stored, ...bones }` 合并,bones 放在后面覆盖 `[E: buddy/companion.ts:132]`。

> **为什么 bones 不存盘**:持久化类型 `StoredCompanion` 只含 soul+`hatchedAt`、不含 bones `[E: buddy/types.ts:124]`,`getCompanion` 每次读都重算 bones 并以 `{ ...stored, ...bones }` 覆盖 `[E: buddy/companion.ts:132]`。结果:① SPECIES 数组改动 / 改名不会弄坏已存档的 companion,② 用户改 `config.companion` 也伪造不出 rarity(只能改 soul,bones 由 userId 锁定)。

### B. `/buddy` teaser 通知(`useBuddyNotification`)

1. PromptInput 渲染时调 `useBuddyNotification()` `[E: components/PromptInput/PromptInput.tsx:1983]`。
2. effect 内:`feature('BUDDY')` 关 → 直接返回 `[E: buddy/useBuddyNotification.tsx:53]`;若 **已有 `config.companion` 或不在 teaser 窗口** → 不弹 `[E: buddy/useBuddyNotification.tsx:57]`。
3. 否则 `addNotification` 一条 key=`buddy-teaser`、`priority:'immediate'`、`timeoutMs:15000` 的彩虹 `/buddy` 通知,cleanup 时 `removeNotification` `[E: buddy/useBuddyNotification.tsx:60]`。通知系统见 [notifications hook](../surface/hooks/notification.md) / [notifications React hook](../reference/react-hooks/notifications.md)。
4. teaser 窗口判定 `isBuddyTeaserWindow()`:仅 2026 年 4 月 1–7 日(`getMonth()===3 && getDate()<=7`)`[E: buddy/useBuddyNotification.tsx:15]`;`isBuddyLive()` 则 2026-04 起永久为真 `[E: buddy/useBuddyNotification.tsx:20]`。两者都有 `if ("external" === 'ant') return true` 的内部分支(编译期常量替换)`[E: buddy/useBuddyNotification.tsx:13]`,即内部构建恒开。判定用本地 `new Date()`(非 UTC)`[E: buddy/useBuddyNotification.tsx:14]`;据源码注释,这样取本地日期是为了 24h 滚动而非 UTC-午夜尖峰、减轻 soul-gen 负载 [I]。
5. `findBuddyTriggerPositions(text)` 用 `/\/buddy\b/g` 扫输入框文本里的 `/buddy` 位置 `[E: buddy/useBuddyNotification.tsx:88]`,PromptInput 据此高亮(`useMemo` over `displayedValue`)`[E: components/PromptInput/PromptInput.tsx:525]`。

### C. sprite 渲染(`renderSprite` / `renderFace`)

1. 每个 species 在 `BODIES` 里有多帧、每帧 5 行(hat 槽是第 0 行)`[E: buddy/sprites.ts:26]`。
2. `renderSprite(bones, frame)`:取该 species 第 `frame % frames.length` 帧,把每行的 `{E}` 占位替换成 `bones.eye` `[E: buddy/sprites.ts:456]`;若有 hat 且第 0 行为空则填 `HAT_LINES[hat]` `[E: buddy/sprites.ts:461]`;若该 species **所有**帧第 0 行都空(没 hat 也没烟雾/天线)则 `shift()` 掉空行省一行 `[E: buddy/sprites.ts:467]`。
3. `renderFace(bones)`:窄终端用的单行脸,按 species switch 出 `(·>` / `(··)` 等 `[E: buddy/sprites.ts:475]`。
4. `spriteFrameCount(species)` = 该 species 帧数 `[E: buddy/sprites.ts:471]`。

### D. 动画组件(`CompanionSprite`)

tick 计时 `TICK_MS=500` `[E: buddy/CompanionSprite.tsx:16]`。它从 AppState 读三个信号:`companionReaction`(气泡台词)`[E: buddy/CompanionSprite.tsx:177]`、`companionPetAt`(pet 时间戳)`[E: buddy/CompanionSprite.tsx:178]`、`footerSelection==='companion'`(是否聚焦)`[E: buddy/CompanionSprite.tsx:179]`。

1. **守卫**:`feature('BUDDY')` 关、无 companion、或 `companionMuted` → `return null` `[E: buddy/CompanionSprite.tsx:217]`。
2. **气泡寿命**:有 reaction 时起一个 `BUBBLE_SHOW*TICK_MS`(20 tick≈10s)的 timeout 清掉 `companionReaction` `[E: buddy/CompanionSprite.tsx:208]`;最后 `FADE_WINDOW=6` tick(≈3s)进入 `fading` 变暗 `[E: buddy/CompanionSprite.tsx:221]`。
3. **pet 爱心**:`petting = petAge*TICK_MS < PET_BURST_MS`(2500ms)`[E: buddy/CompanionSprite.tsx:223]`;爱心帧 `PET_HEARTS` 浮动 5 帧,prepend 到 sprite 上方 `[E: buddy/CompanionSprite.tsx:259]`。pet 起点用 **render 期同步 setState**(非 useEffect)以保证首帧 petAge=0 不被跳过 `[E: buddy/CompanionSprite.tsx:195]`。
4. **窄终端**(`columns < MIN_COLS_FOR_FULL_SPRITE`,即 <100)`[E: buddy/CompanionSprite.tsx:227]`:塌缩成单行 `renderFace`+名字,说话时 quip 顶替名字。
5. **帧选择**:reaction 或 petting 时 `spriteFrame = tick % frameCount` 快速循环所有 fidget 帧 `[E: buddy/CompanionSprite.tsx:248]`;否则走 `IDLE_SEQUENCE`(多为 rest 帧 0,偶尔 fidget,`-1` 表示在帧 0 上 blink)`[E: buddy/CompanionSprite.tsx:23]`;blink 时把 eye 字符替成 `-` `[E: buddy/CompanionSprite.tsx:258]`。
6. **布局分流**:无 reaction → 仅 sprite 列 `[E: buddy/CompanionSprite.tsx:275]`;fullscreen 下 sprite-only(气泡另由 `CompanionFloatingBubble` 渲染)`[E: buddy/CompanionSprite.tsx:283]`;非 fullscreen → sprite 旁内联 `SpeechBubble`(`tail="right"`)`[E: buddy/CompanionSprite.tsx:286]`。
7. **`CompanionFloatingBubble`**:fullscreen 专用的浮动气泡,渲染 `SpeechBubble ... tail="down"` `[E: buddy/CompanionSprite.tsx:350]`;它先 `!feature("BUDDY") || !reaction` 守卫、无 reaction 即 `return null` `[E: buddy/CompanionSprite.tsx:340]`,再查 `companionMuted` `[E: buddy/CompanionSprite.tsx:344]`。clear-after-10s 计时器不在它这里、归 `CompanionSprite` 的 reaction-timeout 所有 `[E: buddy/CompanionSprite.tsx:208]`,REPL 把它挂在 `FullscreenLayout` 的 `bottomFloat` 槽 `[E: screens/REPL.tsx:4565]`。

### E. 列宽预算(`companionReservedColumns`)

PromptInput 计算可用文本宽时减去 sprite 占的列:`textInputColumns = columns - 3 - companionReservedColumns(columns, companionSpeaking)` `[E: components/PromptInput/PromptInput.tsx:1991]`。该函数:flag 关/无 companion/muted/终端 <100 列 → 返回 0 `[E: buddy/CompanionSprite.tsx:171]`;否则 = sprite 列宽 + padding + (说话且非 fullscreen 时再加 `BUBBLE_WIDTH`)`[E: buddy/CompanionSprite.tsx:174]`。REPL 在 `bottomFloat`/inline 两处按 `feature('BUDDY')` 与窄/宽决定挂 `CompanionFloatingBubble` 还是 `CompanionSprite` `[E: screens/REPL.tsx:4565]`。

### F. 接入主模型对话(`companion_intro` attachment)

1. attachment 收集阶段调 `getCompanionIntroAttachment(messages)`(feature-gated 块内)`[E: utils/attachments.ts:867]`。
2. 该函数:flag 关 / 无 companion / muted → 返回 `[]` `[E: buddy/prompt.ts:20]`;若历史里已对**当前同名 companion** 发过 `companion_intro` 则跳过(避免重复宣告)`[E: buddy/prompt.ts:23]`;否则产出一条 `{ type:'companion_intro', name, species }` `[E: buddy/prompt.ts:31]`。
3. 渲染成 prompt:`messages.ts` 对 `companion_intro` 用 `companionIntroText(name, species)` 包成 isMeta 的 user message(system-reminder 包裹)`[E: utils/messages.ts:4235]`。
4. `companionIntroText` 文案告诉主模型:一只小 `${species}` 名叫 `${name}` 坐在输入框旁、偶尔在气泡里评论;**"你不是它,它是独立的 watcher"**;用户点名它时主模型要让位、一行内回答、别解释自己不是它 `[E: buddy/prompt.ts:10]`。该 attachment 在 UI 里不渲染气泡(列于 `nullRenderingAttachments`)`[E: components/messages/nullRenderingAttachments.ts:35]`。companion_intro 是 attachment 联合类型的一员 `[E: utils/attachments.ts:708]`。

## 设计动机与权衡

- **确定性 bones + 只存 soul**:把可被用户篡改的部分(name/personality)与不可篡改的部分(rarity/species/stats)分开——`StoredCompanion` 只存 soul `[E: buddy/types.ts:124]`,bones 每读必从 `hash(userId)` 重算并覆盖 `[E: buddy/companion.ts:132]`,改 config 刷不出 legendary、SPECIES 数组演进也不会破坏旧存档。代价:每次读都重算 + PRNG,故加 `rollCache` 抵消三条热路径的重复开销 `[E: buddy/companion.ts:106]`。
- **编译期 feature flag**:`feature('BUDDY')` 让整个 easter-egg 在生产构建可被 dead-code 消除,零运行时成本、也不泄露字符串。配合 species 的 `String.fromCharCode` 运行时编码 `[E: buddy/types.ts:14]`,据注释意在避免 model-codename canary 字面量进 bundle [I]。
- **本地日期 teaser**:teaser 判定用 local `new Date()` `[E: buddy/useBuddyNotification.tsx:14]`;据注释,用 local date 做 24h 滚动而非 UTC-午夜,意在摊平 soul 生成压力、又制造持续的社交媒体话题 [I]。
- **fullscreen 气泡拆成两个组件**:`overflowY:hidden` 会裁掉 `position:absolute` 浮层,故 fullscreen 分支(`isFullscreenActive()`)只渲 sprite-only `[E: buddy/CompanionSprite.tsx:283]`、把气泡交给 `bottomFloat` 槽的 `CompanionFloatingBubble`;而非 fullscreen 让 `SpeechBubble`(`tail="right"`)内联在 sprite 旁 `[E: buddy/CompanionSprite.tsx:287]`(浮进 Static scrollback 无法清除)。
- **observer 是"独立 watcher"**:prompt 刻意把 companion 设成与主模型分离的角色,主模型被要求"让位"——避免 companion 的俏皮话污染主回答的语气 `[E: buddy/prompt.ts:10]`。

## gotcha

- **`getCompanion()` 返回 `undefined` 即"未孵化"**:`config.companion` 不存在时全链路(sprite/预算/intro)都短路 `[E: buddy/companion.ts:129]`,所以默认用户看不到任何 buddy 痕迹,直到跑过缺失的孵化命令。
- **bones 字段在合并时一定覆盖 stored**:`{ ...stored, ...bones }` 顺序使旧格式 config 里残留的 bones 字段被新算出的覆盖 `[E: buddy/companion.ts:132]`;不要假设 `config.companion` 里的 rarity/species 有意义。
- **sprite 高度会因 hat/烟雾帧而抖动**:`renderSprite` 只在 **所有帧第 0 行都空**时才 `shift()` 掉空行 `[E: buddy/sprites.ts:467]`,否则保留以免帧间高度震荡。
- **气泡清除计时器只挂在 `CompanionSprite`**:reaction-timeout 在 `CompanionSprite` 内(`BUBBLE_SHOW*TICK_MS` 后清 `companionReaction`)`[E: buddy/CompanionSprite.tsx:208]`;`CompanionFloatingBubble` 只读 reaction 渲染、不拥有计时器 `[E: buddy/CompanionSprite.tsx:340]`;若只挂浮动气泡而不挂 sprite,reaction 不会被自动清。实际 REPL 两者按窄/宽互斥挂载 `[E: screens/REPL.tsx:4565]`。
- **`companionReaction` 的写入方不在本 dump**:由 `buddy/observer.ts` / `fireCompanionObserver`(`state/AppStateStore.ts:168` 注释、`screens/REPL.tsx:2805`)写,本子系统只消费;reaction 如何生成属 `[U]`,见 `_staging/uncertainty-r3t1.md`。

## Sources

- `buddy/companion.ts`
- `buddy/CompanionSprite.tsx`
- `buddy/prompt.ts`
- `buddy/sprites.ts`
- `buddy/types.ts`
- `buddy/useBuddyNotification.tsx`
- `utils/config.ts`
- `utils/attachments.ts`
- `utils/messages.ts`
- `commands.ts`
- `state/AppStateStore.ts`
- `screens/REPL.tsx`
- `components/PromptInput/PromptInput.tsx`
- `components/messages/nullRenderingAttachments.ts`

## 相关

- [subsys.session-state](session-state.md) —— `companionReaction`/`companionPetAt`/`footerSelection` 都是 AppState 字段,buddy 组件读它们驱动动画。
- [ref.feature-flags](../reference/feature-flags.md) —— `BUDDY` 是裁剪整套 easter-egg 的编译期 flag。
- [subsys.config-settings](config-settings.md) —— `config.companion`(`StoredCompanion`)与 `companionMuted` 的持久化位置。
- [ui.prompt-input](../surface/components/prompt-input.md) —— companion sprite 挂在 PromptInput 旁,并占用其文本列宽预算。
- [ui.messages](../surface/components/messages.md) —— `companion_intro` attachment 被渲染成注入主模型的 isMeta 系统提示。
- [tool.repl](../surface/tools/repl.md) —— REPL 决定 fullscreen/inline 下挂 `CompanionSprite` 还是 `CompanionFloatingBubble`。

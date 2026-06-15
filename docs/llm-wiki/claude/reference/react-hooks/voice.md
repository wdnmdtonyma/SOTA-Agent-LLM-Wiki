---
id: rhook.voice
title: React hooks catalog: voice
kind: reference
tier: T3
source: [hooks/useVoice.ts, hooks/useVoiceEnabled.ts, hooks/useVoiceIntegration.tsx]
symbols: [normalizeLanguageForSTT, computeLevel, useVoice, useVoiceEnabled, useVoiceIntegration, useVoiceKeybindingHandler, VoiceKeybindingHandler]
related: [subsys.input-vim, subsys.keybindings, subsys.ui-components]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `rhook.voice` catalog 收录 voice mode 的 enablement、recording/STT hook、prompt integration 和 keybinding handler；这个 category 边界来自 voice 文件名、voice context 和导出名的人工归纳 [I]。

## 能回答的问题

- voice mode 的核心 hook 在哪个文件?
- `useVoiceEnabled` 如何作为 enablement hook 暴露?
- voice integration 和 voice keybinding handler 的关键签名是什么?
- voice 相关 helper 与 hook 是否在同一 use* 文件中?

## Hook catalog

| hook | 文件 | 一句话用途 | 关键签名 |
|---|---|---|---|
| `useVoice`; `normalizeLanguageForSTT`; `computeLevel` | `hooks/useVoice.ts` | 管理 hold-to-talk voice recording、STT connection 和 audio level helpers [I]。 | `normalizeLanguageForSTT(...)` [E: hooks/useVoice.ts:121]; `computeLevel(chunk)` [E: hooks/useVoice.ts:185]; `useVoice(...)` [E: hooks/useVoice.ts:199] |
| `useVoiceEnabled` | `hooks/useVoiceEnabled.ts` | 返回 voice mode 是否同时满足 user intent、auth 和 feature enablement [I]。 | `useVoiceEnabled(): boolean` [E: hooks/useVoiceEnabled.ts:19] |
| `useVoiceIntegration`; `useVoiceKeybindingHandler`; `VoiceKeybindingHandler` | `hooks/useVoiceIntegration.tsx` | 将 voice transcript 写回 prompt input，并注册 voice keybinding handler [I]。 | `useVoiceIntegration(...)` [E: hooks/useVoiceIntegration.tsx:118]; `useVoiceKeybindingHandler(...)` [E: hooks/useVoiceIntegration.tsx:373]; `VoiceKeybindingHandler(props)` [E: hooks/useVoiceIntegration.tsx:673] |

## Sources

- `hooks/useVoice.ts`
- `hooks/useVoiceEnabled.ts`
- `hooks/useVoiceIntegration.tsx`

## 相关

- [文本输入与 Vim](../../subsystems/input-vim.md)
- [Keybindings](../../subsystems/keybindings.md)
- [UI 组件族](../../subsystems/ui-components.md)

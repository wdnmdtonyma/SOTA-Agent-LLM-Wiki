---
id: tool.config
path: surface/tools/config.md
title: Config
kind: tool
tier: T1
status: verified
source: [tools/ConfigTool/ConfigTool.ts]
symbols: [ConfigTool]
related: [subsys.config-settings]
updated: 2026-06-14
evidence: explicit
---

`Config` 是 ant-only 的设置读写工具, 通过 `setting` 读取当前值或通过 `value` 写入 supported setting, 并对部分设置同步 AppState 以立即影响 UI/runtime。[E: tools/ConfigTool/constants.ts:1][E: tools/ConfigTool/ConfigTool.ts:67][E: tools.ts:214][E: tools/ConfigTool/ConfigTool.ts:91][E: tools/ConfigTool/ConfigTool.ts:137][E: tools/ConfigTool/ConfigTool.ts:356]

## 能回答的问题

- `Config` 如何区分 get 和 set?
- `Config` 支持哪些 setting 来源和类型?
- `Config` 写入设置前做哪些校验?

## 1 Identity

- Tool name: `Config`。[E: tools/ConfigTool/constants.ts:1][E: tools/ConfigTool/ConfigTool.ts:68]
- `tools.ts` 只在 `process.env.USER_TYPE === 'ant'` 时注册 `ConfigTool`。[E: tools.ts:214]
- `searchHint`: `get or set Claude Code settings (theme, model)`。[E: tools/ConfigTool/ConfigTool.ts:69]
- `maxResultSizeChars`: `100_000`。[E: tools/ConfigTool/ConfigTool.ts:70]
- `userFacingName()`: `Config`。[E: tools/ConfigTool/ConfigTool.ts:83][E: tools/ConfigTool/ConfigTool.ts:84]

## 2 用途定位

`Config` 覆盖 `SUPPORTED_SETTINGS` 中声明的 global config 和 settings.json key, 包括 `theme`、`editorMode`、`verbose`、`model`、`permissions.defaultMode` 等, 并可根据 feature flags 增加 ant-only、voice、bridge、push notification settings。[E: tools/ConfigTool/supportedSettings.ts:30][E: tools/ConfigTool/supportedSettings.ts:36][E: tools/ConfigTool/supportedSettings.ts:42][E: tools/ConfigTool/supportedSettings.ts:90][E: tools/ConfigTool/supportedSettings.ts:113][E: tools/ConfigTool/supportedSettings.ts:134][E: tools/ConfigTool/supportedSettings.ts:144][E: tools/ConfigTool/supportedSettings.ts:153][E: tools/ConfigTool/supportedSettings.ts:164]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `setting` | `string` | 是 | 无 | 设置 key, 例如 `theme`、`model`、`permissions.defaultMode`。[E: tools/ConfigTool/ConfigTool.ts:38][E: tools/ConfigTool/ConfigTool.ts:41] |
| `value` | `string | boolean | number` | 否 | `undefined` | 新值; 省略表示 get current value。[E: tools/ConfigTool/ConfigTool.ts:43][E: tools/ConfigTool/ConfigTool.ts:46] |

`SUPPORTED_SETTINGS` 的每个 config 声明 `source`、`type`、description、可选 path/options/getOptions/appStateKey/validateOnWrite/formatOnRead。[E: tools/ConfigTool/supportedSettings.ts:16][E: tools/ConfigTool/supportedSettings.ts:26]

## 4 输出 & maxResultSizeChars

输出 schema 包含 `success`、可选 `operation`、`setting`、`value`、`previousValue`、`newValue` 和 `error`。[E: tools/ConfigTool/ConfigTool.ts:53][E: tools/ConfigTool/ConfigTool.ts:59] get 成功返回 `operation: 'get'` 和 display value; set 成功返回 previous/new value; 失败映射为 `is_error: true` 的 tool result。[E: tools/ConfigTool/ConfigTool.ts:142][E: tools/ConfigTool/ConfigTool.ts:398][E: tools/ConfigTool/ConfigTool.ts:427][E: tools/ConfigTool/ConfigTool.ts:431]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `shouldDefer` | `true` | 工具定义显式设置 deferred loading。[E: tools/ConfigTool/ConfigTool.ts:86] |
| `isConcurrencySafe()` | `true` | 源码直接返回 true。[E: tools/ConfigTool/ConfigTool.ts:87][E: tools/ConfigTool/ConfigTool.ts:88] |
| `isReadOnly(input)` | `input.value === undefined` | 省略 value 是 get, 传 value 是 set。[E: tools/ConfigTool/ConfigTool.ts:91] |
| `checkPermissions(input)` | get allow, set ask | get 自动 allow; set 返回 ask, message 为 `Set ${setting} to ${value}`。[E: tools/ConfigTool/ConfigTool.ts:101][E: tools/ConfigTool/ConfigTool.ts:104][E: tools/ConfigTool/ConfigTool.ts:105] |
| `toAutoClassifierInput()` | get: setting, set: `setting = value` | 分类器输入区分读取和写入。[E: tools/ConfigTool/ConfigTool.ts:94][E: tools/ConfigTool/ConfigTool.ts:96] |

## 6 权限

未看到 `Config` 自定义 `validateInput()`[I]; 运行时 `call()` 执行 supported key 校验, voice runtime gate, type/options/async validation, 然后才写入。[E: tools/ConfigTool/ConfigTool.ts:116][E: tools/ConfigTool/ConfigTool.ts:126][E: tools/ConfigTool/ConfigTool.ts:185][E: tools/ConfigTool/ConfigTool.ts:204][E: tools/ConfigTool/ConfigTool.ts:205][E: tools/ConfigTool/ConfigTool.ts:217][E: tools/ConfigTool/ConfigTool.ts:225] 写操作需要 permission prompt, 读操作自动 allow。[E: tools/ConfigTool/ConfigTool.ts:101][E: tools/ConfigTool/ConfigTool.ts:104]

## 7 call() 走读

`call()` 先把 disabled voice setting 当作 unknown setting, 再通过 `isSupported(setting)` 拒绝未知 key。[E: tools/ConfigTool/ConfigTool.ts:116][E: tools/ConfigTool/ConfigTool.ts:129] get 分支读取 config source/path, 应用可选 `formatOnRead`, 返回 display value。[E: tools/ConfigTool/ConfigTool.ts:137][E: tools/ConfigTool/ConfigTool.ts:142]

set 分支对 `remoteControlAtStartup="default"` 做特殊 unset 并同步 `replBridgeEnabled`/`replBridgeOutboundOnly`。[E: tools/ConfigTool/ConfigTool.ts:150][E: tools/ConfigTool/ConfigTool.ts:180] boolean setting 会把 string `true`/`false` 转成 boolean, 其他非 boolean 值报错。[E: tools/ConfigTool/ConfigTool.ts:185][E: tools/ConfigTool/ConfigTool.ts:200] options 和 `validateOnWrite` 不通过时返回 error。[E: tools/ConfigTool/ConfigTool.ts:204][E: tools/ConfigTool/ConfigTool.ts:205][E: tools/ConfigTool/ConfigTool.ts:217][E: tools/ConfigTool/ConfigTool.ts:225] 写入 global config 使用 `saveGlobalConfig`, 写入 settings 使用 `updateSettingsForSource('userSettings', update)`。[E: tools/ConfigTool/ConfigTool.ts:326][E: tools/ConfigTool/ConfigTool.ts:332]

## 8 渲染

工具定义挂载从 `UI.js` 导入的 `renderToolUseMessage`、`renderToolResultMessage` 和 `renderToolUseRejectedMessage`。[E: tools/ConfigTool/ConfigTool.ts:30][E: tools/ConfigTool/ConfigTool.ts:34][E: tools/ConfigTool/ConfigTool.ts:108][E: tools/ConfigTool/ConfigTool.ts:110] 模型侧 result 对 get 返回 `setting = value`, 对 set 返回 `Set setting to newValue`, 对 error 返回 `Error: ...` 且 `is_error: true`。[E: tools/ConfigTool/ConfigTool.ts:418][E: tools/ConfigTool/ConfigTool.ts:424][E: tools/ConfigTool/ConfigTool.ts:430][E: tools/ConfigTool/ConfigTool.ts:431]

## 9 设计动机·edge·历史

- `getPath(key)` 默认为 `key.split('.')`, 因此 `permissions.defaultMode` 这类 dotted key 会映射到 nested settings path。[E: tools/ConfigTool/supportedSettings.ts:208][E: tools/ConfigTool/supportedSettings.ts:210]
- `model` setting 写入前调用 `validateModel`, 读取时把 `null` 格式化为 `default`。[E: tools/ConfigTool/supportedSettings.ts:104][E: tools/ConfigTool/supportedSettings.ts:105]
- 写入带 `appStateKey` 的 setting 会同步 AppState; `remoteControlAtStartup` 因 key 名和 AppState 字段不同走专门同步逻辑。[E: tools/ConfigTool/ConfigTool.ts:356][E: tools/ConfigTool/ConfigTool.ts:367][E: tools/ConfigTool/ConfigTool.ts:369][E: tools/ConfigTool/ConfigTool.ts:377][E: tools/ConfigTool/ConfigTool.ts:378]

## Sources

- `tools/ConfigTool/ConfigTool.ts`
- `tools/ConfigTool/constants.ts`
- `tools/ConfigTool/supportedSettings.ts`
- `tools.ts`

## 相关

- `subsys.config-settings`

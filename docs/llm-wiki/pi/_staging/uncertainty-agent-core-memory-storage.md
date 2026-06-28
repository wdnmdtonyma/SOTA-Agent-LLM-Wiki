# uncertainty-agent-core-memory-storage

本轮填充 `subsys.agent-core.memory-storage` 未新增 `[U]` 存疑项。

L2 verifier 复核结论: 已逐条证伪 `[E]` 的可核性、行号精度和过度推断风险; 143 个 `[E]` 引用均可落到指定 source 的有效行,未发现需要降级或新增 `[U]` 的结论。

保持为 `[I]` 的主要结论:

- `InMemorySessionRepo` 不读写文件、目录或 JSONL header: 两个指定 source 中只出现 `Map`、`InMemorySessionStorage` 和 `toSession()`,未出现 filesystem API 或 JSONL header 处理;这是从 source absence 和实现边界得出的推断。
- `getMetadata()`、`open()`、`getEntries()` 的 object identity / shallow-copy gotcha: 源码能证明返回保存的对象或浅拷贝 array,但没有注释把 entry object identity 声明成公共契约。
- `setLeafId()` 把导航写入 append-only entry stream: 源码能证明追加 `LeafEntry`,但“append-only navigation log”是对该实现效果的解释。
- 测试建议“reload persistence 用 JSONL storage/repo”: 源码能证明内存 repo 返回 live session object 且 process-local,但选择 JSONL 作为持久化测试替代是测试策略推导。

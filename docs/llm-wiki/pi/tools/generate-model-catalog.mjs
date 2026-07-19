#!/usr/bin/env node
// Rebuild reference/model-catalog.md from the committed structural model shards.
// Full model values live in generated, gitignored JSON; this catalog therefore
// records only the id/provider/api facts that the target commit can prove.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const WIKI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.resolve(WIKI, "../../../pi");
const PROVIDERS = path.join(SRC, "packages/ai/src/providers");
const OUTPUT = path.join(WIKI, "reference/model-catalog.md");
const SHA = execFileSync("git", ["-C", SRC, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();

const aggregatorPath = "packages/ai/src/models.generated.ts";
const generatorPath = "packages/ai/scripts/generate-models.ts";
const typesPath = "packages/ai/src/types.ts";
const aggregatorLines = fs.readFileSync(path.join(SRC, aggregatorPath), "utf8").split("\n");
const providerFiles = fs
	.readdirSync(PROVIDERS)
	.filter((name) => name.endsWith(".models.ts"))
	.sort();

const providers = [];
for (const file of providerFiles) {
	const sourcePath = `packages/ai/src/providers/${file}`;
	const lines = fs.readFileSync(path.join(PROVIDERS, file), "utf8").split("\n");
	const models = [];
	for (let index = 0; index < lines.length; index++) {
		const start = lines[index].match(/^\t("(?:[^"\\]|\\.)*"):\s+Model<("(?:[^"\\]|\\.)*")>\s+&\s+\{$/);
		if (!start) continue;
		const id = JSON.parse(start[1]);
		const api = JSON.parse(start[2]);
		const idLine = index + 2;
		const providerLine = index + 3;
		const idMatch = lines[index + 1]?.match(/^\t\tid:\s+("(?:[^"\\]|\\.)*");$/);
		const providerMatch = lines[index + 2]?.match(/^\t\tprovider:\s+("(?:[^"\\]|\\.)*");$/);
		if (!idMatch || !providerMatch) throw new Error(`Unexpected model shape in ${sourcePath}:${index + 1}`);
		const literalId = JSON.parse(idMatch[1]);
		const provider = JSON.parse(providerMatch[1]);
		if (literalId !== id) throw new Error(`Model key/id mismatch in ${sourcePath}:${index + 1}`);
		models.push({ id, api, provider, keyLine: index + 1, idLine, providerLine });
	}
	if (!models.length) throw new Error(`No model shapes found in ${sourcePath}`);
	const provider = models[0].provider;
	if (!models.every((model) => model.provider === provider)) throw new Error(`Mixed providers in ${sourcePath}`);
	const bucketLine = aggregatorLines.findIndex((line) => line.startsWith(`\t${JSON.stringify(provider)}:`)) + 1;
	if (!bucketLine) throw new Error(`No MODELS bucket for ${provider}`);
	providers.push({ provider, sourcePath, bucketLine, models });
}

const total = providers.reduce((sum, provider) => sum + provider.models.length, 0);
const sourcePaths = [aggregatorPath, ...providers.map((provider) => provider.sourcePath), generatorPath, typesPath];
const lines = [
	"---",
	"id: ref.ai.model-catalog",
	"title: 模型结构目录(generated)",
	"kind: catalog",
	"tier: T3",
	"pkg: ai",
	"source:",
	...sourcePaths.map((sourcePath) => `  - ${sourcePath}`),
	"symbols:",
	"  - MODELS",
	"  - Model",
	"related:",
	"  - subsys.ai.model-discovery",
	"  - subsys.ai.model-catalog-publication",
	"evidence: explicit",
	"status: verified",
	`updated: ${SHA}`,
	"---",
	"",
	"> `ref.ai.model-catalog` 逐实例枚举目标 commit 中已提交的 generated model 结构：模型 id、provider bucket 与 `Model.api` wire 协议；完整 name/cost/context 等值在构建时生成的 JSON 中，不属于 git 可核证面。",
	"",
	"## 能回答的问题",
	"",
	"- 当前提交的 `MODELS` 有哪些 provider bucket，每桶有多少结构化 model id?",
	"- 某个 model id 属于哪个 provider，使用哪个 `Model.api` wire 协议?",
	"- 为什么本页不再声称能从已提交源码核对 name、cost、contextWindow、maxTokens?",
	"- model structure、gitignored JSON values 与远端发布 bundle 分别由哪一层负责?",
	"",
	"## 证据边界",
	"",
	`目标 commit 提交了 ${providers.length} 个 provider structural shard，共 ${total} 个 model id。\`models.generated.ts\` 把这些 shard 聚合为 \`MODELS\`；每个 shard 只保留 model key、literal \`id\`、literal \`provider\` 和泛型参数中的 \`api\`，实际 values 从相邻 \`./data/<provider>.json\` 导入 [E: ${aggregatorPath}:4] [E: ${providers[0].sourcePath}:4] [E: ${providers[0].sourcePath}:7]。`,
	"",
	`\`generate-models.ts\` 会先按 provider/model id 排序，再生成 structural \`.models.ts\` 与 \`src/providers/data/*.json\`；后者由仓库忽略，不应拿旧 commit 的 literal metadata 行号冒充当前证据 [E: ${generatorPath}:2341] [E: ${generatorPath}:2352] [E: ${generatorPath}:2361] [E: ${generatorPath}:2365] [E: ${generatorPath}:2373]。`,
	"",
	"因此，本页的逐实例表只声明已提交源码能证明的三件事：id、provider、api。name、baseUrl、reasoning、input、cost、contextWindow、maxTokens、headers 与 compat 的当前值要从同一 source commit 生成的 JSON bundle 查询；其生成、校验和 content-addressed 发布见 `subsys.ai.model-catalog-publication` [I]。",
	"",
	"## Provider 覆盖摘要",
	"",
	"| provider | instances | structural shard | MODELS bucket |",
	"|---|---:|---|---|",
];

for (const provider of providers) {
	lines.push(
		`| \`${provider.provider}\` | ${provider.models.length} | \`${provider.sourcePath}\` | [E: ${aggregatorPath}:${provider.bucketLine}] |`,
	);
}

lines.push("", "## MODELS 逐实例目录", "");
for (const provider of providers) {
	lines.push(
		`### ${provider.provider}`,
		"",
		"| id | provider | api/wire | committed structural evidence |",
		"|---|---|---|---|",
	);
	for (const model of provider.models) {
		lines.push(
			`| \`${model.id}\` | \`${model.provider}\` | \`${model.api}\` | key/api [E: ${provider.sourcePath}:${model.keyLine}] · id [E: ${provider.sourcePath}:${model.idLine}] · provider [E: ${provider.sourcePath}:${model.providerLine}] |`,
		);
	}
	lines.push("");
}

lines.push(
	"## 设计动机与 gotcha",
	"",
	"- `*.models.ts` 现在是 TypeScript structure/type surface，不是完整 metadata snapshot；把旧版 literal cost/context 表原样保留会制造无法在目标 commit 复核的 `[E]`。[I]",
	"- structural shard 的 model count 是静态 checkout 可复现的数量；发布 bundle 的 count 由生成时外部 catalog 输入与 strict validation 决定，二者应通过 source commit 关联而不能默认永远相等。[I]",
	"- `MODELS` 仍提供 typed built-in catalog aggregation；运行时 dynamic refresh 和远端 overlay 属于 `subsys.ai.model-discovery` 与 coding-agent model runtime，不由本引用页展开。[I]",
	"",
	"## Sources",
	"",
	...sourcePaths.map((sourcePath) => `- ${sourcePath}`),
	"",
	"## 相关",
	"",
	"- [subsys.ai.model-discovery](../subsystems/ai/model-discovery.md): provider catalog 装配、查询与动态刷新。",
	"- [subsys.ai.model-catalog-publication](../subsystems/ai/model-catalog-publication.md): JSON bundle 生成、校验、版本化发布与 CI 门控。",
);

fs.writeFileSync(OUTPUT, `${lines.join("\n")}\n`);
console.log(`generated ${path.relative(WIKI, OUTPUT)}: ${providers.length} providers, ${total} models, ${sourcePaths.length} sources`);

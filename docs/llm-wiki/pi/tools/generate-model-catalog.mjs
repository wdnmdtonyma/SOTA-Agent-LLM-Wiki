#!/usr/bin/env node
// Rebuild reference/model-catalog.md from committed structural model shards.
// Full model values live in generated, gitignored JSON; this catalog therefore
// records bucket membership plus the few id/api facts that generate-models.ts
// still hard-codes (Qwen Individual allowlist, DeepSeek V4 vision, CF prefix).
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
const catalogPath = "packages/ai/src/model-catalog.ts";
const generatorPath = "packages/ai/scripts/generate-models.ts";
const typesPath = "packages/ai/src/types.ts";
const aggregatorLines = fs.readFileSync(path.join(SRC, aggregatorPath), "utf8").split("\n");
const catalogLines = fs.readFileSync(path.join(SRC, catalogPath), "utf8").split("\n");
const generatorText = fs.readFileSync(path.join(SRC, generatorPath), "utf8");
const generatorLines = generatorText.split("\n");

function lineOf(lines, predicate, label) {
	const index = lines.findIndex(predicate);
	if (index < 0) throw new Error(`Could not find ${label}`);
	return index + 1;
}

function lineOfText(needle, label, startAt = 1) {
	const index = generatorLines.findIndex((line, i) => i >= startAt - 1 && line.includes(needle));
	if (index < 0) throw new Error(`Could not find ${label}`);
	return index + 1;
}

function parseQuotedSet(constName) {
	const start = generatorLines.findIndex((line) => line.includes(`const ${constName}`));
	if (start < 0) throw new Error(`Could not find ${constName}`);
	const ids = [];
	for (let i = start; i < generatorLines.length; i++) {
		const match = generatorLines[i].match(/"([^"]+)"/);
		if (match) ids.push({ id: match[1], line: i + 1 });
		if (generatorLines[i].includes("]);")) break;
	}
	if (!ids.length) throw new Error(`Empty set ${constName}`);
	return ids;
}

const flattenLine = lineOf(catalogLines, (line) => line.startsWith("export function flattenModelCatalog"), "flattenModelCatalog");
const typeLine = lineOf(aggregatorLines, (line) => line.includes('"qwen-token-plan-individual": typeof QWEN_TOKEN_PLAN_INDIVIDUAL_MODELS'), "MODELS type individual");
const importLine = lineOf(aggregatorLines, (line) => line.includes("QWEN_TOKEN_PLAN_INDIVIDUAL_MODELS } from"), "individual import");
const shardImportLine = lineOfText('import values from "./data/${providerId}.json"', "shard json import template");
const shardFlattenLine = lineOfText("flattenModelCatalog(${JSON.stringify(providerId)}, values)", "shard flatten template");
const shardWriteLine = lineOfText("writeFileSync(join(providersDir, filename), output)", "shard write");
const aggregatorWriteLine = lineOfText("writeFileSync(aggregatorPath, output)", "aggregator write");
const individualVariantLine = lineOfText('provider: "qwen-token-plan-individual"', "individual variant");
const individualModelIdsLine = lineOfText("modelIds: QWEN_TOKEN_PLAN_INDIVIDUAL_MODEL_IDS", "individual modelIds");
const excludedCheckLine = lineOfText("QWEN_TOKEN_PLAN_EXCLUDED_MODEL_IDS.has(modelId)", "excluded skip");
const individualApiLine = lineOfText('api: "openai-completions"', "qwen api", individualVariantLine);
const workersAiApiLine = lineOfText('upstream === "workers-ai"', "cf workers-ai api");
const workersAiPrefixLine = lineOfText("id = prefixedId", "cf prefixed id", workersAiApiLine);
const workersAiMirrorLine = lineOfText('data["cloudflare-workers-ai"]?.models', "cf workers-ai mirror", workersAiApiLine);
const workersAiIdLine = lineOfText("`workers-ai/${modelId}`", "cf workers-ai id template", workersAiMirrorLine);
const deepseekVisionLine = lineOfText('id: "deepseek-v4-flash-vision-exp"', "deepseek vision id");

const individualIds = parseQuotedSet("QWEN_TOKEN_PLAN_INDIVIDUAL_MODEL_IDS");
const excludedIds = parseQuotedSet("QWEN_TOKEN_PLAN_EXCLUDED_MODEL_IDS");

const providerFiles = fs
	.readdirSync(PROVIDERS)
	.filter((name) => name.endsWith(".models.ts"))
	.sort();

const providers = [];
for (const file of providerFiles) {
	const sourcePath = `packages/ai/src/providers/${file}`;
	const lines = fs.readFileSync(path.join(PROVIDERS, file), "utf8").split("\n");
	const importValuesLine = lineOf(lines, (line) => line.includes('from "./data/') && line.includes('.json"'), `${sourcePath} json import`);
	const flattenCallLine = lineOf(lines, (line) => line.includes("flattenModelCatalog("), `${sourcePath} flatten`);
	const providerMatch = lines[flattenCallLine - 1].match(/flattenModelCatalog\("([^"]+)",\s*values\)/);
	if (!providerMatch) throw new Error(`Unexpected flatten call in ${sourcePath}:${flattenCallLine}`);
	const provider = providerMatch[1];
	const valueLine = lineOf(
		aggregatorLines,
		(line) => line.startsWith(`\t${JSON.stringify(provider)}:`),
		`MODELS value ${provider}`,
	);
	providers.push({ provider, sourcePath, importValuesLine, flattenCallLine, valueLine });
}
providers.sort((a, b) => a.valueLine - b.valueLine);

if (!providers.length) throw new Error("No flattenModelCatalog shards found");

const first = providers[0];
const individual = providers.find((item) => item.provider === "qwen-token-plan-individual");
if (!individual) throw new Error("Missing qwen-token-plan-individual shard");

const sourcePaths = [aggregatorPath, catalogPath, ...providers.map((item) => item.sourcePath), generatorPath, typesPath];
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
	"> `ref.ai.model-catalog` 记录目标 commit 已提交的 generated model **结构**。 [I] 完整模型值（name / cost / context / 逐 id 的 `Model.api`）在 generated、gitignored 的 `src/providers/data/<provider>.json`；本 catalog 只记录 id / provider / api 中源码能证明的结构事实。",
	"",
	"## 能回答的问题",
	"",
	"- 当前提交的 `MODELS` 有哪些 provider bucket?",
	"- 为什么本页不再逐行枚举上千个 model id?",
	"- `qwen-token-plan-individual` 的 committed allowlist 有哪些 id?",
	"- model structure、gitignored JSON values 与远端发布 bundle 分别由哪一层负责?",
	"",
	"## 证据边界",
	"",
	`目标 commit 提交了 **${providers.length}** 个 provider structural shard。每个 shard 只保留 \`import values from "./data/<provider>.json"\` 和 \`flattenModelCatalog(provider, values)\`；实际 id/api/cost 等值不在 git tree [E: ${individual.sourcePath}:${individual.importValuesLine}] [E: ${individual.sourcePath}:${individual.flattenCallLine}] [E: ${first.sourcePath}:${first.importValuesLine}] [E: ${first.sourcePath}:${first.flattenCallLine}] [E: ${catalogPath}:${flattenLine}]。`,
	"",
	`\`models.generated.ts\` 把这 ${providers.length} 个 shard 聚合为 \`MODELS\`；type 面与 value 面都包含 \`qwen-token-plan-individual\` [E: ${aggregatorPath}:${importLine}] [E: ${aggregatorPath}:${typeLine}] [E: ${aggregatorPath}:${individual.valueLine}]。Radius 不在此 object 中。`,
	"",
	`\`generate-models.ts\` 先写 structural \`.models.ts\` 与 gitignored \`src/providers/data/*.json\`，再写 \`models.generated.ts\` [E: ${generatorPath}:${shardImportLine}] [E: ${generatorPath}:${shardFlattenLine}] [E: ${generatorPath}:${shardWriteLine}] [E: ${generatorPath}:${aggregatorWriteLine}]。因此 checkout 可复现的是 **${providers.length} 个 bucket 结构**，不是 flattened model 总数。`,
	"",
	"`tools/generate-model-catalog.mjs` 按 `flattenModelCatalog` wrapper + `generate-models.ts` 硬编码 allowlist 生成本页；不再寻找旧的逐模型 `Model<\"api\">` shard key。[I]",
	"",
	"## Provider 覆盖摘要",
	"",
	"| provider | structural shard | MODELS value bucket | committed per-model ids |",
	"|---|---|---|---|",
];

for (const provider of providers) {
	const idsCell =
		provider.provider === "qwen-token-plan-individual"
			? `generator allowlist ${individualIds.length} ids（见下表） [E: ${generatorPath}:${individualIds[0].line - 1}]`
			: "gitignored JSON only [I]";
	lines.push(
		`| \`${provider.provider}\` | \`${provider.sourcePath}\` | [E: ${aggregatorPath}:${provider.valueLine}] | ${idsCell} |`,
	);
}

lines.push("", `共 ${providers.length} 个 structural provider bucket。`, "", "## 本轮可从源码证明的 model id", "");
lines.push(
	`\`qwen-token-plan-individual\` 是国际 Token Plan 源的 allowlist 视图。生成器把 \`alibaba-token-plan\` 输入过滤到 \`QWEN_TOKEN_PLAN_INDIVIDUAL_MODEL_IDS\`，并固定 \`api: "openai-completions"\`、同一新加坡 compatible-mode base URL [E: ${generatorPath}:${individualVariantLine}] [E: ${generatorPath}:${individualModelIdsLine}] [E: ${generatorPath}:${individualApiLine}]。最终 JSON 是否包含这 ${individualIds.length} 个 id 仍取决于生成时的远端 catalog，因此下表是 **generator allowlist**，不是 gitignored JSON 的 membership 证明 [I]。`,
	"",
	"| id | provider | api/wire | committed evidence |",
	"|---|---|---|---|",
);
for (const item of individualIds) {
	lines.push(
		`| \`${item.id}\` | \`qwen-token-plan-individual\` | \`openai-completions\` | [E: ${generatorPath}:${item.line}] [E: ${generatorPath}:${individualModelIdsLine}] |`,
	);
}

const excludedList = excludedIds.map((item) => `\`${item.id}\``).join(" / ");
const excludedEvidence = excludedIds.map((item) => `[E: ${generatorPath}:${item.line}]`).join(" ");
lines.push(
	"",
	`${excludedList} 在 \`QWEN_TOKEN_PLAN_EXCLUDED_MODEL_IDS\` 中，国际 / CN / Individual 三条变体都会跳过 ${excludedEvidence} [E: ${generatorPath}:${excludedCheckLine}]。`,
	"",
	`DeepSeek 官方 bucket 另有一组 **generator 硬编码** 的 V4 行，不依赖 gitignored JSON。\`deepseek-v4-flash-vision-exp\` 的 id / \`openai-completions\` / \`input: ["text", "image"]\` 写在生成器里 [E: ${generatorPath}:${deepseekVisionLine}] [E: ${generatorPath}:${deepseekVisionLine + 2}] [E: ${generatorPath}:${deepseekVisionLine + 6}]。这不是 Individual allowlist 成员。`,
	"",
	`\`cloudflare-ai-gateway\` bucket 的 \`workers-ai\` upstream 固定 \`api: "openai-completions"\`、compat base URL，id 为 \`workers-ai/\${modelId}\`；models.dev 漏掉该前缀时，生成器从 \`cloudflare-workers-ai\` catalog 镜像补行。具体 id 仍在 gitignored JSON，本页只记录此前缀规则 [E: ${generatorPath}:${workersAiApiLine}] [E: ${generatorPath}:${workersAiPrefixLine}] [E: ${generatorPath}:${workersAiMirrorLine}] [E: ${generatorPath}:${workersAiIdLine}] [I]。`,
	"",
	"## 设计动机与 gotcha",
	"",
	"- `*.models.ts` 现在是 TypeScript structure/type surface，不是完整 metadata snapshot；把旧版 npm artifact 的逐 id 表原样保留会冒充当前 checkout 可核的 `[E]`。[I]",
	`- structural shard 的 bucket count（${providers.length}）是静态 checkout 可复现的数量；发布 bundle 的 model count 由生成时外部 catalog 输入决定，二者应通过 source commit 关联而不能默认永远相等。[I]`,
	"- `MODELS` 仍提供 typed built-in catalog aggregation；运行时 dynamic refresh 和远端 overlay 属于 `subsys.ai.model-discovery`，不由本引用页展开。[I]",
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
console.log(
	`generated ${path.relative(WIKI, OUTPUT)}: ${providers.length} buckets, ${individualIds.length} individual allowlist ids, ${sourcePaths.length} sources`,
);

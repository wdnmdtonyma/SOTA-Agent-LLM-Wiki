---
id: ref.bash-arity
title: Bash 命令 arity 表
kind: reference
tier: T3
v: v1
source:
  - packages/opencode/src/permission/arity.ts
status: verified
symbols:
  - prefix
  - ARITY
evidence: explicit
updated: 92c70c9c3
---

> 这份节点是 V1 shell permission 的命令前缀归一化表：给一串 shell tokens，`prefix()` 决定审批时保留几个 token。

## 能回答的问题

- `git config user.name` 这类命令审批时按几个 token 匹配？
- 哪些命令有更长前缀覆盖短前缀？
- 未列入 `ARITY` 的命令会怎样降级？
- 这张表属于 V1 还是 V2？

## V1 行为

`prefix(tokens)` 会从最长 token prefix 往 1 个 token 倒序尝试，把命中的 prefix 对应 arity 作为返回长度；如果输入为空返回空数组，未命中任何 `ARITY` 时返回第一个 token。[E: packages/opencode/src/permission/arity.ts:2][E: packages/opencode/src/permission/arity.ts:5][E: packages/opencode/src/permission/arity.ts:7][E: packages/opencode/src/permission/arity.ts:8]

源码注释要求生成规则满足三条约束：flag 不计入 arity、最长匹配优先、只有当更长 prefix 的 arity 不同才加入表；注释里的例子包括 `git checkout main`、`npm install`、`npm run dev`、`python script.py`。[E: packages/opencode/src/permission/arity.ts:14][E: packages/opencode/src/permission/arity.ts:15][E: packages/opencode/src/permission/arity.ts:16][E: packages/opencode/src/permission/arity.ts:24]

本表源码当前有 136 个 `ARITY` entry；“约 150 条”与源码实际条目存在小偏差，本节点以源码实际条目为准。[E: packages/opencode/src/permission/arity.ts:24][E: packages/opencode/src/permission/arity.ts:160][I]

## V2

V2 Bash tool 在 `packages/core/src/tool/bash.ts` 中直接以完整 command 字符串做 permission `resources` 与 `save`；源码 TODO 还写着要移植 BashArity reusable command-prefix logic，因此当前没有复用 V1 前缀表。[E: packages/core/src/tool/bash.ts:93][E: packages/core/src/tool/bash.ts:145][E: packages/core/src/tool/bash.ts:146][I] 因此这个节点的 `v` 是 `v1`，不是 shared。

## ARITY catalog

| Prefix | Arity | 示例 | Evidence |
|---|---:|---|---|
| `cat` | 1 | `cat file.txt` | [E: packages/opencode/src/permission/arity.ts:25] |
| `cd` | 1 | `cd /path/to/dir` | [E: packages/opencode/src/permission/arity.ts:26] |
| `chmod` | 1 | `chmod 755 script.sh` | [E: packages/opencode/src/permission/arity.ts:27] |
| `chown` | 1 | `chown user:group file.txt` | [E: packages/opencode/src/permission/arity.ts:28] |
| `cp` | 1 | `cp source.txt dest.txt` | [E: packages/opencode/src/permission/arity.ts:29] |
| `echo` | 1 | `echo "hello world"` | [E: packages/opencode/src/permission/arity.ts:30] |
| `env` | 1 | `env` | [E: packages/opencode/src/permission/arity.ts:31] |
| `export` | 1 | `export PATH=/usr/bin` | [E: packages/opencode/src/permission/arity.ts:32] |
| `grep` | 1 | `grep pattern file.txt` | [E: packages/opencode/src/permission/arity.ts:33] |
| `kill` | 1 | `kill 1234` | [E: packages/opencode/src/permission/arity.ts:34] |
| `killall` | 1 | `killall process` | [E: packages/opencode/src/permission/arity.ts:35] |
| `ln` | 1 | `ln -s source target` | [E: packages/opencode/src/permission/arity.ts:36] |
| `ls` | 1 | `ls -la` | [E: packages/opencode/src/permission/arity.ts:37] |
| `mkdir` | 1 | `mkdir new-dir` | [E: packages/opencode/src/permission/arity.ts:38] |
| `mv` | 1 | `mv old.txt new.txt` | [E: packages/opencode/src/permission/arity.ts:39] |
| `ps` | 1 | `ps aux` | [E: packages/opencode/src/permission/arity.ts:40] |
| `pwd` | 1 | `pwd` | [E: packages/opencode/src/permission/arity.ts:41] |
| `rm` | 1 | `rm file.txt` | [E: packages/opencode/src/permission/arity.ts:42] |
| `rmdir` | 1 | `rmdir empty-dir` | [E: packages/opencode/src/permission/arity.ts:43] |
| `sleep` | 1 | `sleep 5` | [E: packages/opencode/src/permission/arity.ts:44] |
| `source` | 1 | `source ~/.bashrc` | [E: packages/opencode/src/permission/arity.ts:45] |
| `tail` | 1 | `tail -f log.txt` | [E: packages/opencode/src/permission/arity.ts:46] |
| `touch` | 1 | `touch file.txt` | [E: packages/opencode/src/permission/arity.ts:47] |
| `unset` | 1 | `unset VAR` | [E: packages/opencode/src/permission/arity.ts:48] |
| `which` | 1 | `which node` | [E: packages/opencode/src/permission/arity.ts:49] |
| `aws` | 3 | `aws s3 ls` | [E: packages/opencode/src/permission/arity.ts:50] |
| `az` | 3 | `az storage blob list` | [E: packages/opencode/src/permission/arity.ts:51] |
| `bazel` | 2 | `bazel build` | [E: packages/opencode/src/permission/arity.ts:52] |
| `brew` | 2 | `brew install node` | [E: packages/opencode/src/permission/arity.ts:53] |
| `bun` | 2 | `bun install` | [E: packages/opencode/src/permission/arity.ts:54] |
| `bun run` | 3 | `bun run dev` | [E: packages/opencode/src/permission/arity.ts:55] |
| `bun x` | 3 | `bun x vite` | [E: packages/opencode/src/permission/arity.ts:56] |
| `cargo` | 2 | `cargo build` | [E: packages/opencode/src/permission/arity.ts:57] |
| `cargo add` | 3 | `cargo add tokio` | [E: packages/opencode/src/permission/arity.ts:58] |
| `cargo run` | 3 | `cargo run main` | [E: packages/opencode/src/permission/arity.ts:59] |
| `cdk` | 2 | `cdk deploy` | [E: packages/opencode/src/permission/arity.ts:60] |
| `cf` | 2 | `cf push app` | [E: packages/opencode/src/permission/arity.ts:61] |
| `cmake` | 2 | `cmake build` | [E: packages/opencode/src/permission/arity.ts:62] |
| `composer` | 2 | `composer require laravel` | [E: packages/opencode/src/permission/arity.ts:63] |
| `consul` | 2 | `consul members` | [E: packages/opencode/src/permission/arity.ts:64] |
| `consul kv` | 3 | `consul kv get config/app` | [E: packages/opencode/src/permission/arity.ts:65] |
| `crictl` | 2 | `crictl ps` | [E: packages/opencode/src/permission/arity.ts:66] |
| `deno` | 2 | `deno run server.ts` | [E: packages/opencode/src/permission/arity.ts:67] |
| `deno task` | 3 | `deno task dev` | [E: packages/opencode/src/permission/arity.ts:68] |
| `doctl` | 3 | `doctl kubernetes cluster list` | [E: packages/opencode/src/permission/arity.ts:69] |
| `docker` | 2 | `docker run nginx` | [E: packages/opencode/src/permission/arity.ts:70] |
| `docker builder` | 3 | `docker builder prune` | [E: packages/opencode/src/permission/arity.ts:71] |
| `docker compose` | 3 | `docker compose up` | [E: packages/opencode/src/permission/arity.ts:72] |
| `docker container` | 3 | `docker container ls` | [E: packages/opencode/src/permission/arity.ts:73] |
| `docker image` | 3 | `docker image prune` | [E: packages/opencode/src/permission/arity.ts:74] |
| `docker network` | 3 | `docker network inspect` | [E: packages/opencode/src/permission/arity.ts:75] |
| `docker volume` | 3 | `docker volume ls` | [E: packages/opencode/src/permission/arity.ts:76] |
| `eksctl` | 2 | `eksctl get clusters` | [E: packages/opencode/src/permission/arity.ts:77] |
| `eksctl create` | 3 | `eksctl create cluster` | [E: packages/opencode/src/permission/arity.ts:78] |
| `firebase` | 2 | `firebase deploy` | [E: packages/opencode/src/permission/arity.ts:79] |
| `flyctl` | 2 | `flyctl deploy` | [E: packages/opencode/src/permission/arity.ts:80] |
| `gcloud` | 3 | `gcloud compute instances list` | [E: packages/opencode/src/permission/arity.ts:81] |
| `gh` | 3 | `gh pr list` | [E: packages/opencode/src/permission/arity.ts:82] |
| `git` | 2 | `git checkout main` | [E: packages/opencode/src/permission/arity.ts:83] |
| `git config` | 3 | `git config user.name` | [E: packages/opencode/src/permission/arity.ts:84] |
| `git remote` | 3 | `git remote add origin` | [E: packages/opencode/src/permission/arity.ts:85] |
| `git stash` | 3 | `git stash pop` | [E: packages/opencode/src/permission/arity.ts:86] |
| `go` | 2 | `go build` | [E: packages/opencode/src/permission/arity.ts:87] |
| `gradle` | 2 | `gradle build` | [E: packages/opencode/src/permission/arity.ts:88] |
| `helm` | 2 | `helm install mychart` | [E: packages/opencode/src/permission/arity.ts:89] |
| `heroku` | 2 | `heroku logs` | [E: packages/opencode/src/permission/arity.ts:90] |
| `hugo` | 2 | `hugo new site blog` | [E: packages/opencode/src/permission/arity.ts:91] |
| `ip` | 2 | `ip link show` | [E: packages/opencode/src/permission/arity.ts:92] |
| `ip addr` | 3 | `ip addr show` | [E: packages/opencode/src/permission/arity.ts:93] |
| `ip link` | 3 | `ip link set eth0 up` | [E: packages/opencode/src/permission/arity.ts:94] |
| `ip netns` | 3 | `ip netns exec foo bash` | [E: packages/opencode/src/permission/arity.ts:95] |
| `ip route` | 3 | `ip route add default via 1.1.1.1` | [E: packages/opencode/src/permission/arity.ts:96] |
| `kind` | 2 | `kind delete cluster` | [E: packages/opencode/src/permission/arity.ts:97] |
| `kind create` | 3 | `kind create cluster` | [E: packages/opencode/src/permission/arity.ts:98] |
| `kubectl` | 2 | `kubectl get pods` | [E: packages/opencode/src/permission/arity.ts:99] |
| `kubectl kustomize` | 3 | `kubectl kustomize overlays/dev` | [E: packages/opencode/src/permission/arity.ts:100] |
| `kubectl rollout` | 3 | `kubectl rollout restart deploy/api` | [E: packages/opencode/src/permission/arity.ts:101] |
| `kustomize` | 2 | `kustomize build .` | [E: packages/opencode/src/permission/arity.ts:102] |
| `make` | 2 | `make build` | [E: packages/opencode/src/permission/arity.ts:103] |
| `mc` | 2 | `mc ls myminio` | [E: packages/opencode/src/permission/arity.ts:104] |
| `mc admin` | 3 | `mc admin info myminio` | [E: packages/opencode/src/permission/arity.ts:105] |
| `minikube` | 2 | `minikube start` | [E: packages/opencode/src/permission/arity.ts:106] |
| `mongosh` | 2 | `mongosh test` | [E: packages/opencode/src/permission/arity.ts:107] |
| `mysql` | 2 | `mysql -u root` | [E: packages/opencode/src/permission/arity.ts:108] |
| `mvn` | 2 | `mvn compile` | [E: packages/opencode/src/permission/arity.ts:109] |
| `ng` | 2 | `ng generate component home` | [E: packages/opencode/src/permission/arity.ts:110] |
| `npm` | 2 | `npm install` | [E: packages/opencode/src/permission/arity.ts:111] |
| `npm exec` | 3 | `npm exec vite` | [E: packages/opencode/src/permission/arity.ts:112] |
| `npm init` | 3 | `npm init vue` | [E: packages/opencode/src/permission/arity.ts:113] |
| `npm run` | 3 | `npm run dev` | [E: packages/opencode/src/permission/arity.ts:114] |
| `npm view` | 3 | `npm view react version` | [E: packages/opencode/src/permission/arity.ts:115] |
| `nvm` | 2 | `nvm use 18` | [E: packages/opencode/src/permission/arity.ts:116] |
| `nx` | 2 | `nx build` | [E: packages/opencode/src/permission/arity.ts:117] |
| `openssl` | 2 | `openssl genrsa 2048` | [E: packages/opencode/src/permission/arity.ts:118] |
| `openssl req` | 3 | `openssl req -new -key key.pem` | [E: packages/opencode/src/permission/arity.ts:119] |
| `openssl x509` | 3 | `openssl x509 -in cert.pem` | [E: packages/opencode/src/permission/arity.ts:120] |
| `pip` | 2 | `pip install numpy` | [E: packages/opencode/src/permission/arity.ts:121] |
| `pipenv` | 2 | `pipenv install flask` | [E: packages/opencode/src/permission/arity.ts:122] |
| `pnpm` | 2 | `pnpm install` | [E: packages/opencode/src/permission/arity.ts:123] |
| `pnpm dlx` | 3 | `pnpm dlx create-next-app` | [E: packages/opencode/src/permission/arity.ts:124] |
| `pnpm exec` | 3 | `pnpm exec vite` | [E: packages/opencode/src/permission/arity.ts:125] |
| `pnpm run` | 3 | `pnpm run dev` | [E: packages/opencode/src/permission/arity.ts:126] |
| `poetry` | 2 | `poetry add requests` | [E: packages/opencode/src/permission/arity.ts:127] |
| `podman` | 2 | `podman run alpine` | [E: packages/opencode/src/permission/arity.ts:128] |
| `podman container` | 3 | `podman container ls` | [E: packages/opencode/src/permission/arity.ts:129] |
| `podman image` | 3 | `podman image prune` | [E: packages/opencode/src/permission/arity.ts:130] |
| `psql` | 2 | `psql -d mydb` | [E: packages/opencode/src/permission/arity.ts:131] |
| `pulumi` | 2 | `pulumi up` | [E: packages/opencode/src/permission/arity.ts:132] |
| `pulumi stack` | 3 | `pulumi stack output` | [E: packages/opencode/src/permission/arity.ts:133] |
| `pyenv` | 2 | `pyenv install 3.11` | [E: packages/opencode/src/permission/arity.ts:134] |
| `python` | 2 | `python -m venv env` | [E: packages/opencode/src/permission/arity.ts:135] |
| `rake` | 2 | `rake db:migrate` | [E: packages/opencode/src/permission/arity.ts:136] |
| `rbenv` | 2 | `rbenv install 3.2.0` | [E: packages/opencode/src/permission/arity.ts:137] |
| `redis-cli` | 2 | `redis-cli ping` | [E: packages/opencode/src/permission/arity.ts:138] |
| `rustup` | 2 | `rustup update` | [E: packages/opencode/src/permission/arity.ts:139] |
| `serverless` | 2 | `serverless invoke` | [E: packages/opencode/src/permission/arity.ts:140] |
| `sfdx` | 3 | `sfdx force:org:list` | [E: packages/opencode/src/permission/arity.ts:141] |
| `skaffold` | 2 | `skaffold dev` | [E: packages/opencode/src/permission/arity.ts:142] |
| `sls` | 2 | `sls deploy` | [E: packages/opencode/src/permission/arity.ts:143] |
| `sst` | 2 | `sst deploy` | [E: packages/opencode/src/permission/arity.ts:144] |
| `swift` | 2 | `swift build` | [E: packages/opencode/src/permission/arity.ts:145] |
| `systemctl` | 2 | `systemctl restart nginx` | [E: packages/opencode/src/permission/arity.ts:146] |
| `terraform` | 2 | `terraform apply` | [E: packages/opencode/src/permission/arity.ts:147] |
| `terraform workspace` | 3 | `terraform workspace select prod` | [E: packages/opencode/src/permission/arity.ts:148] |
| `tmux` | 2 | `tmux new -s dev` | [E: packages/opencode/src/permission/arity.ts:149] |
| `turbo` | 2 | `turbo run build` | [E: packages/opencode/src/permission/arity.ts:150] |
| `ufw` | 2 | `ufw allow 22` | [E: packages/opencode/src/permission/arity.ts:151] |
| `vault` | 2 | `vault login` | [E: packages/opencode/src/permission/arity.ts:152] |
| `vault auth` | 3 | `vault auth list` | [E: packages/opencode/src/permission/arity.ts:153] |
| `vault kv` | 3 | `vault kv get secret/api` | [E: packages/opencode/src/permission/arity.ts:154] |
| `vercel` | 2 | `vercel deploy` | [E: packages/opencode/src/permission/arity.ts:155] |
| `volta` | 2 | `volta install node` | [E: packages/opencode/src/permission/arity.ts:156] |
| `wp` | 2 | `wp plugin install` | [E: packages/opencode/src/permission/arity.ts:157] |
| `yarn` | 2 | `yarn add react` | [E: packages/opencode/src/permission/arity.ts:158] |
| `yarn dlx` | 3 | `yarn dlx create-react-app` | [E: packages/opencode/src/permission/arity.ts:159] |
| `yarn run` | 3 | `yarn run dev` | [E: packages/opencode/src/permission/arity.ts:160] |

## Sources

- `packages/opencode/src/permission/arity.ts`
- `packages/core/src/tool/bash.ts`

## 相关

- `execution.shell-v1`
- `tool.bash`
- `ref.permission-actions`

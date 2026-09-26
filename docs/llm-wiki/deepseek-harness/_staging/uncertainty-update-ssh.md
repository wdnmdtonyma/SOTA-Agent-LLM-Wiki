# uncertainty-update-ssh

- 「任何 shipped bundle / preset 都没有 ssh 行」来自对 `packages/bundle/**/cordis.patch.yml` 与 `packages/bundle/web-app/presets/*.patch.yml` 的全文检索（无 `dsh-ssh` / `fs-ssh` / `subprocess-ssh` / `sandbox-ssh` 字符串），标 `[I]`。live e2e 缺 `DSH_SSH_TEST_CONFIG` 时 skip，CI 绿不代表打过真远端。

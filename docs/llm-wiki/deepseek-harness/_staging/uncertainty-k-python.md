# uncertainty · surface.sdk.python

- **官方 README 把默认孩子简写成 `dsh-jsonrpc-agent`。** `python/sdk/README.md` 写 bundled single-file `dsh-jsonrpc-agent`。`HarnessClient._default_launch_args` 没有这个字面量：无 `runtime_bin` / `bridge_bin` / `launch_args_override` 时调用 `deepseek_harness_runtime.resolve_bundled_launch_args()`，exe mode 的 argv[0] 是 `runtime/dsh-jsonrpc-agent-pkg-<plat>-<arch>`。wiki 跟 `client.py` / `sdk-runtime` 解析路径。

# uncertainty: tools file-mutation-queue

- [I] `withFileMutationQueue` appears to be process-local rather than cross-process, because implementation state is a module-level `Map<string, Promise<void>>` plus a module-level registration promise, with no file lock, lockfile, IPC, or shared storage in `packages/coding-agent/src/core/tools/file-mutation-queue.ts`.
- [I] Missing-path aliasing is only resolved by textual `resolve(filePath)` fallback before the file exists; once `realpath()` cannot run, the code cannot prove that two different future paths will land on the same inode.

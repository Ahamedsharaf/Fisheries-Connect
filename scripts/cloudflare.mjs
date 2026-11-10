import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
const run = (args) => {
  const result = spawnSync(process.execPath, [wrangler, ...args], {
    stdio: "inherit",
    env: { ...process.env, CI: "true" },
  });
  if (result.status !== 0) process.exit(result.status || 1);
};
run(["d1", "migrations", "apply", "DB", "--remote"]);
if (process.argv[2] === "deploy") run(["deploy"]);

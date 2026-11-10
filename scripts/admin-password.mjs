import { emitKeypressEvents } from "node:readline";
import { stdin, stdout } from "node:process";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { hashPassword } from "../lib/password.ts";

function secret(label) {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY)
      return reject(Error("Run this command in an interactive terminal."));
    stdout.write(label + ": ");
    let value = "";
    emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    const onKey = (text, key) => {
      if (key?.ctrl && key.name === "c") {
        done();
        reject(Error("Cancelled"));
      } else if (key?.name === "return" || key?.name === "enter") {
        done();
        resolve(value);
      } else if (key?.name === "backspace") {
        value = value.slice(0, -1);
      } else if (
        !key?.ctrl &&
        !key?.meta &&
        text &&
        !/[\x00-\x1f\x7f]/.test(text)
      ) {
        value += text;
      }
    };
    const done = () => {
      stdin.off("keypress", onKey);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };
    stdin.on("keypress", onKey);
  });
}
try {
  const config = JSON.parse(await readFile("wrangler.jsonc", "utf8"));
  if (!config.vars?.ADMIN_EMAIL || config.vars.ADMIN_EMAIL.includes("REPLACE"))
    throw Error("Run npm run configure first.");
  console.log(
    "Set the Fisheries Connect admin password for " +
      config.vars.ADMIN_EMAIL +
      ".",
  );
  console.log(
    "Use a unique 12–128 character application password. Input stays hidden.",
  );
  const password = await secret("New admin password"),
    confirm = await secret("Confirm password");
  if (password !== confirm)
    throw Error("Passwords do not match. Nothing changed.");
  const hash = await hashPassword(password);
  console.log("Saving the password hash to the configured Cloudflare Worker…");
  const result = spawnSync(
    process.execPath,
    [
      resolve("node_modules/wrangler/bin/wrangler.js"),
      "secret",
      "put",
      "ADMIN_PASSWORD_HASH",
    ],
    {
      input: hash + "\n",
      encoding: "utf8",
      env: { ...process.env, CI: "true" },
      maxBuffer: 1024 * 1024,
    },
  );
  // Never echo secret input, including if an upstream process unexpectedly includes it.
  const output = (result.stdout || "") + (result.stderr || "");
  stdout.write(
    output
      .replaceAll(hash, "[password hash hidden]")
      .replaceAll(password, "[password hidden]"),
  );
  if (result.status !== 0)
    throw Error(
      "Password upload did not complete. Check Cloudflare login and Worker configuration, then retry.",
    );
  console.log(
    "Admin password saved. Open " + config.vars.APP_URL + "/admin and sign in.",
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}

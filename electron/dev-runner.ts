import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const electronBinary =
  process.platform === "win32"
    ? path.join(__dirname, "../node_modules/electron/dist/electron.exe")
    : path.join(__dirname, "../node_modules/.bin/electron");

const child = spawn(
  electronBinary,
  ["--require", "tsx/cjs", path.join(__dirname, "main.ts")],
  {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env
    }
  }
);

child.on("close", (code) => {
  process.exit(code ?? 0);
});
// SPDX-License-Identifier: MIT
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  registerYamlFiles,
  repositoryPath,
  root,
  translationYamlFiles,
} from "./library-files.mjs";

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", stdio: "inherit" });
  if (result.error?.code === "ENOENT") return false;
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
  return true;
}

const files = (await registerYamlFiles()).map(repositoryPath);
if (!files.length) {
  console.error("no register YAML files found");
  process.exit(1);
}

const validator = join("tools", "validate_register_yaml.py");
const pythonCandidates = process.platform === "win32"
  ? [["py", ["-3"]], ["python", []], ["python3", []]]
  : [["python3", []], ["python", []]];
let pythonRan = false;
for (const [command, prefix] of pythonCandidates) {
  if (run(command, [...prefix, validator, "--strict", ...files])) {
    pythonRan = true;
    break;
  }
}
if (!pythonRan) {
  console.error("Python 3 was not found");
  process.exit(2);
}

run(process.execPath, [
  join("tools", "check-browser-yaml.cjs"),
  "--parser",
  join("tools", "yaml-lite.js"),
  ...files,
]);

const translations = (await translationYamlFiles()).map(repositoryPath);
run(process.execPath, [join("tools", "validate-translations.mjs"), ...translations]);
if (translations.length) {
  run(process.execPath, [
    join("tools", "check-browser-yaml.cjs"),
    "--translation",
    "--parser",
    join("tools", "yaml-lite.js"),
    ...translations,
  ]);
}

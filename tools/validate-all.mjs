// SPDX-License-Identifier: MIT
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
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

const descriptionQualityRules = [
  {
    pattern: /desc:\s*["']CMSIS\s+[^"'\r\n]+\s+field["']/gi,
    message: "contains an unresolved CMSIS field-description placeholder",
  },
  {
    pattern: /desc:\s*["'](?:able bit|ecurity status\b)/gi,
    message: "contains a field description truncated by short-name cleanup",
  },
  {
    pattern: /desc:\s*["'][^"'\r\n]*CMSIS\s+[^"'\r\n：]+\s+位域[^"'\r\n]*["']/gi,
    message: "contains an unresolved translated CMSIS field placeholder",
  },
  {
    pattern: /DWT CTRL NO(?:CYCCNT|EXTTRIG|PRFCNT|TRCPKT) disable control|DWT CTRL\.NO(?:CYCCNT|EXTTRIG|PRFCNT|TRCPKT) 禁用控制/gi,
    message: "treats a read-only DWT capability indicator as a disable control",
  },
];

async function checkDescriptionQuality(paths) {
  const errors = [];
  for (const path of paths) {
    const source = await readFile(join(root, path), "utf8");
    for (const { pattern, message } of descriptionQualityRules) {
      pattern.lastIndex = 0;
      for (const match of source.matchAll(pattern)) {
        const line = source.slice(0, match.index).split("\n").length;
        errors.push(`${path}:${line}: ${message}`);
      }
    }
  }
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
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
await checkDescriptionQuality([...files, ...translations]);
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

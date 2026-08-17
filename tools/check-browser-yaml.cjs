#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function usage() {
  console.error("Usage: node check-browser-yaml.js [--parser /path/to/yaml-lite.js] <chip.yaml> [...]");
}

function findDefaultParser() {
  const candidates = [path.resolve(process.cwd(), "yaml-lite.js")];
  let current = __dirname;
  for (let depth = 0; depth < 8; depth += 1) {
    candidates.push(path.join(current, "yaml-lite.js"));
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function parseArgs(argv) {
  const files = [];
  let parserPath = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--parser") {
      index += 1;
      parserPath = argv[index] || null;
    } else {
      files.push(argv[index]);
    }
  }
  return { files, parserPath };
}

const args = parseArgs(process.argv.slice(2));
if (!args.files.length) {
  usage();
  process.exit(2);
}

const parserPath = args.parserPath ? path.resolve(args.parserPath) : findDefaultParser();
if (!parserPath) {
  console.error("ERROR: 找不到 yaml-lite.js；请在项目根目录运行，或使用 --parser 指定路径");
  process.exit(2);
}

let parseRegisterYaml;
try {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(parserPath, "utf8"), context, { filename: parserPath });
  parseRegisterYaml = context.window.parseRegisterYaml;
  if (typeof parseRegisterYaml !== "function") throw new Error("未导出 window.parseRegisterYaml");
} catch (error) {
  console.error(`ERROR: 无法加载浏览器解析器 ${parserPath}: ${error.message}`);
  process.exit(2);
}

let failed = false;
for (const fileName of args.files) {
  const filePath = path.resolve(fileName);
  try {
    const data = parseRegisterYaml(fs.readFileSync(filePath, "utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("YAML 顶层必须是 object");
    }
    if (!data.pages || typeof data.pages !== "object" || Array.isArray(data.pages)) {
      throw new Error("缺少 pages object");
    }
    console.log(`OK    ${fileName}: browser parser compatible`);
  } catch (error) {
    failed = true;
    console.error(`FAIL  ${fileName}: ${error.message}`);
  }
}

process.exit(failed ? 1 : 0);

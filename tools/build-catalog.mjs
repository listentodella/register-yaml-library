// SPDX-License-Identifier: MIT
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import YAML from "yaml";
import { registerYamlFiles, repositoryPath, root } from "./library-files.mjs";

function countData(data) {
  const pages = Object.values(data.pages || {});
  const registers = pages.flatMap((page) => page.registers || []);
  return {
    pages: pages.length,
    registers: registers.length,
    fields: registers.reduce((sum, register) => sum + (register.fields?.length || 0), 0),
  };
}

function sourceData(source) {
  if (!source || typeof source !== "object") return null;
  return {
    title: source.title || null,
    version: source.version || null,
    revision: source.revision || null,
    url: source.url || null,
    license: source.license || null,
  };
}

async function buildCatalog() {
  const entries = [];
  for (const file of await registerYamlFiles()) {
    const text = await readFile(file, "utf8");
    const data = YAML.parse(text);
    const path = repositoryPath(file);
    const taxonomy = path.split("/").slice(0, -1);
    entries.push({
      id: path.replace(/\.ya?ml$/i, "").replaceAll("/", ":"),
      path,
      category: taxonomy[0],
      taxonomy,
      sensor: data.sensor,
      vendor: data.vendor || null,
      family: data.family || null,
      device_type: data.device_type || null,
      schema_version: data.schema_version,
      register_space: data.register_space?.kind || "mmio",
      architecture: data.register_space?.architecture || null,
      profile: data.register_space?.profile || null,
      source: sourceData(data.source),
      stats: countData(data),
      sha256: createHash("sha256").update(text).digest("hex"),
    });
  }
  return { schema_version: 1, format: "register-reference-yaml-catalog", entries };
}

const outputPath = join(root, "catalog.json");
const output = `${JSON.stringify(await buildCatalog(), null, 2)}\n`;
if (process.argv.includes("--check")) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== output) {
    console.error("catalog.json is stale; run npm run catalog");
    process.exit(1);
  }
  console.log("catalog.json is current");
} else {
  await writeFile(outputPath, output);
  console.log(`wrote ${outputPath}`);
}

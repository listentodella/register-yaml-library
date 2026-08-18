// SPDX-License-Identifier: MIT
import { readdir } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

export const root = resolve(import.meta.dirname, "..");
const dataRoots = ["architecture", "controllers", "sensors", "soc"];
const translationsRoot = "locales";

async function walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (/\.ya?ml$/i.test(entry.name)) files.push(path);
  }
  return files;
}

export async function registerYamlFiles() {
  const files = [];
  for (const directory of dataRoots) files.push(...await walk(join(root, directory)));
  return files.sort((left, right) => left.localeCompare(right));
}

export async function translationYamlFiles() {
  return (await walk(join(root, translationsRoot)))
    .filter((file) => !file.endsWith(`${sep}README.yaml`))
    .sort((left, right) => left.localeCompare(right));
}

export function repositoryPath(path) {
  return relative(root, path).split(sep).join("/");
}

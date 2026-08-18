// SPDX-License-Identifier: MIT
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import YAML from "yaml";
import {
  repositoryPath,
  root,
  translationYamlFiles,
} from "./library-files.mjs";

const FORMAT = "register-reference-translation";
const DATA_ROOTS = new Set(["architecture", "controllers", "sensors", "soc"]);
const LOCALE_PATTERN = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-[A-Z]{2}|-\d{3})?$/;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function scalarKey(value) {
  if (typeof value === "number" && Number.isInteger(value)) return `integer:${BigInt(value)}`;
  if (typeof value !== "string") return `${typeof value}:${String(value)}`;

  const text = value.trim();
  try {
    if (/^[+-]?\d+$/.test(text)) return `integer:${BigInt(text)}`;
    if (/^0x[0-9a-f]+$/i.test(text) || /^0b[01]+$/i.test(text)) {
      return `integer:${BigInt(text)}`;
    }
  } catch {
    // Preserve an invalid or unusually large selector as text so validation can report no match.
  }
  return `string:${text}`;
}

function sourceValues(values) {
  if (Array.isArray(values)) {
    return values.filter(isObject).filter((item) => hasOwn(item, "value"));
  }
  if (isObject(values)) {
    return Object.entries(values).map(([value, desc]) => ({ value, desc }));
  }
  return [];
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function validateTranslationDocument(document, source, options = {}) {
  const errors = [];
  let translatedTextCount = 0;
  const error = (path, message) => errors.push(`${path}: ${message}`);

  function object(value, path) {
    if (!isObject(value)) {
      error(path, "must be a mapping");
      return null;
    }
    return value;
  }

  function array(value, path) {
    if (!Array.isArray(value)) {
      error(path, "must be a list");
      return null;
    }
    return value;
  }

  function allowedKeys(value, allowed, path) {
    if (!isObject(value)) return;
    for (const key of Object.keys(value)) {
      if (!allowed.has(key)) error(`${path}.${key}`, "unknown field");
    }
  }

  function requiredText(value, key, path) {
    if (!hasOwn(value, key) || typeof value[key] !== "string" || !value[key].trim()) {
      error(`${path}.${key}`, "must be a non-empty string");
      return null;
    }
    return value[key];
  }

  function translatedText(value, key, sourceValue, path) {
    if (!hasOwn(value, key)) return;
    if (typeof value[key] !== "string" || !value[key].trim()) {
      error(`${path}.${key}`, "must be a non-empty translated string");
      return;
    }
    if (typeof sourceValue !== "string" || !sourceValue.trim()) {
      error(`${path}.${key}`, "has no source text to translate");
      return;
    }
    translatedTextCount += 1;
  }

  function uniqueSelector(seen, selector, path) {
    if (seen.has(selector)) error(path, `duplicates selector ${selector}`);
    seen.add(selector);
  }

  function selectByCondition(candidates, item, path) {
    if (hasOwn(item, "source_condition")) {
      if (typeof item.source_condition !== "string" || !item.source_condition.trim()) {
        error(`${path}.source_condition`, "must be a non-empty source-language string");
        return [];
      }
      return candidates.filter((candidate) => candidate.condition === item.source_condition);
    }
    return candidates;
  }

  function validateValueTranslations(itemsValue, sourceValue, path) {
    const items = array(itemsValue, path);
    if (!items) return;
    const available = sourceValues(sourceValue);
    const seen = new Set();

    items.forEach((rawItem, index) => {
      const itemPath = `${path}[${index}]`;
      const item = object(rawItem, itemPath);
      if (!item) return;
      const before = translatedTextCount;
      allowedKeys(item, new Set(["value", "source_condition", "desc", "condition"]), itemPath);
      if (!hasOwn(item, "value")) {
        error(`${itemPath}.value`, "is required");
        return;
      }

      let candidates = available.filter((candidate) => scalarKey(candidate.value) === scalarKey(item.value));
      candidates = selectByCondition(candidates, item, itemPath);
      const selector = `${scalarKey(item.value)}@${item.source_condition || ""}`;
      uniqueSelector(seen, selector, itemPath);
      if (candidates.length !== 1) {
        error(itemPath, candidates.length ? "value selector is ambiguous; add source_condition" : "value selector does not exist in source");
        return;
      }

      const selected = candidates[0];
      translatedText(item, "desc", selected.desc, itemPath);
      translatedText(item, "condition", selected.condition, itemPath);
      if (translatedTextCount === before) error(itemPath, "contains no translated text");
    });
  }

  function validateFieldTranslations(itemsValue, sourceRegister, path) {
    const items = array(itemsValue, path);
    if (!items) return;
    const fields = Array.isArray(sourceRegister.fields) ? sourceRegister.fields : [];
    const seen = new Set();

    items.forEach((rawItem, index) => {
      const itemPath = `${path}[${index}]`;
      const item = object(rawItem, itemPath);
      if (!item) return;
      const before = translatedTextCount;
      allowedKeys(item, new Set([
        "name", "bits", "source_condition", "desc", "condition", "reset_info", "values",
      ]), itemPath);
      const name = requiredText(item, "name", itemPath);
      const bits = requiredText(item, "bits", itemPath);
      if (!name || !bits) return;

      let candidates = fields.filter((field) => field.name === name && String(field.bits) === bits);
      candidates = selectByCondition(candidates, item, itemPath);
      const selector = `${name}@${bits}@${item.source_condition || ""}`;
      uniqueSelector(seen, selector, itemPath);
      if (candidates.length !== 1) {
        error(itemPath, candidates.length ? "field selector is ambiguous; add source_condition" : "field selector does not exist in source");
        return;
      }

      const selected = candidates[0];
      translatedText(item, "desc", selected.desc, itemPath);
      translatedText(item, "condition", selected.condition, itemPath);
      translatedText(item, "reset_info", selected.reset_info, itemPath);
      if (hasOwn(item, "values")) validateValueTranslations(item.values, selected.values, `${itemPath}.values`);
      if (translatedTextCount === before) error(itemPath, "contains no translated text");
    });
  }

  function validateRegisterTranslations(itemsValue, sourcePage, path) {
    const items = array(itemsValue, path);
    if (!items) return;
    const registers = Array.isArray(sourcePage.registers) ? sourcePage.registers : [];
    const seen = new Set();

    items.forEach((rawItem, index) => {
      const itemPath = `${path}[${index}]`;
      const item = object(rawItem, itemPath);
      if (!item) return;
      const before = translatedTextCount;
      allowedKeys(item, new Set([
        "name", "desc", "condition", "alias_note", "no_dump_reason", "fields",
      ]), itemPath);
      const name = requiredText(item, "name", itemPath);
      if (!name) return;
      uniqueSelector(seen, name, itemPath);
      const candidates = registers.filter((register) => register.name === name);
      if (candidates.length !== 1) {
        error(itemPath, candidates.length ? "register name is ambiguous in this page" : "register does not exist in source page");
        return;
      }

      const selected = candidates[0];
      translatedText(item, "desc", selected.desc, itemPath);
      translatedText(item, "condition", selected.condition, itemPath);
      translatedText(item, "alias_note", selected.alias_note, itemPath);
      translatedText(item, "no_dump_reason", selected.no_dump_reason, itemPath);
      if (hasOwn(item, "fields")) validateFieldTranslations(item.fields, selected, `${itemPath}.fields`);
      if (translatedTextCount === before) error(itemPath, "contains no translated text");
    });
  }

  const rootObject = object(document, "file");
  const sourceObject = object(source, "source");
  if (!rootObject || !sourceObject) return errors;
  allowedKeys(rootObject, new Set([
    "translation_schema_version", "format", "source_locale", "locale", "source_file",
    "source_sha256", "metadata", "translations",
  ]), "file");

  if (rootObject.translation_schema_version !== 1) {
    error("file.translation_schema_version", "must be 1");
  }
  if (rootObject.format !== FORMAT) error("file.format", `must be ${FORMAT}`);
  const sourceLocale = requiredText(rootObject, "source_locale", "file");
  const locale = requiredText(rootObject, "locale", "file");
  const sourceFile = requiredText(rootObject, "source_file", "file");
  const sourceSha256 = requiredText(rootObject, "source_sha256", "file");
  if (sourceLocale && !LOCALE_PATTERN.test(sourceLocale)) error("file.source_locale", "must be a canonical language tag such as en");
  if (locale && !LOCALE_PATTERN.test(locale)) error("file.locale", "must be a canonical language tag such as zh-CN");
  if (sourceLocale && locale && sourceLocale === locale) error("file.locale", "must differ from source_locale");
  if (options.sourceFile && sourceFile !== options.sourceFile) error("file.source_file", `must be ${options.sourceFile}`);
  if (sourceSha256 && !/^[0-9a-f]{64}$/.test(sourceSha256)) error("file.source_sha256", "must be a lowercase SHA-256 digest");
  if (options.sourceSha256 && sourceSha256 !== options.sourceSha256) {
    error("file.source_sha256", "does not match source file; review and refresh this translation");
  }

  const metadata = object(rootObject.metadata, "file.metadata");
  if (metadata) {
    allowedKeys(metadata, new Set([
      "status", "coverage", "method", "translator", "updated", "reviewer", "reviewed_at", "notes",
    ]), "file.metadata");
    const status = requiredText(metadata, "status", "file.metadata");
    const coverage = requiredText(metadata, "coverage", "file.metadata");
    const method = requiredText(metadata, "method", "file.metadata");
    requiredText(metadata, "translator", "file.metadata");
    const updated = requiredText(metadata, "updated", "file.metadata");
    if (status && !new Set(["draft", "reviewed"]).has(status)) error("file.metadata.status", "must be draft or reviewed");
    if (coverage && !new Set(["partial", "complete"]).has(coverage)) error("file.metadata.coverage", "must be partial or complete");
    if (method && !new Set(["ai", "human", "ai-assisted"]).has(method)) error("file.metadata.method", "must be ai, human, or ai-assisted");
    if (updated && !validDate(updated)) error("file.metadata.updated", "must be a valid YYYY-MM-DD date");
    if (hasOwn(metadata, "notes") && (typeof metadata.notes !== "string" || !metadata.notes.trim())) {
      error("file.metadata.notes", "must be a non-empty string when present");
    }
    if (status === "reviewed") {
      requiredText(metadata, "reviewer", "file.metadata");
      const reviewedAt = requiredText(metadata, "reviewed_at", "file.metadata");
      if (reviewedAt && !validDate(reviewedAt)) error("file.metadata.reviewed_at", "must be a valid YYYY-MM-DD date");
    }
  }

  const translations = object(rootObject.translations, "file.translations");
  if (!translations) return errors;
  allowedKeys(translations, new Set(["sensor", "family", "who_am_i", "pages"]), "file.translations");
  translatedText(translations, "sensor", sourceObject.sensor, "file.translations");
  translatedText(translations, "family", sourceObject.family, "file.translations");

  if (hasOwn(translations, "who_am_i")) {
    const identity = object(translations.who_am_i, "file.translations.who_am_i");
    if (identity) {
      allowedKeys(identity, new Set(["values"]), "file.translations.who_am_i");
      if (hasOwn(identity, "values")) {
        validateValueTranslations(identity.values, sourceObject.who_am_i?.values, "file.translations.who_am_i.values");
      }
    }
  }

  if (hasOwn(translations, "pages")) {
    const pages = array(translations.pages, "file.translations.pages");
    const seen = new Set();
    pages?.forEach((rawPage, index) => {
      const pagePath = `file.translations.pages[${index}]`;
      const page = object(rawPage, pagePath);
      if (!page) return;
      const before = translatedTextCount;
      allowedKeys(page, new Set(["name", "title", "access", "desc", "registers"]), pagePath);
      const name = requiredText(page, "name", pagePath);
      if (!name) return;
      uniqueSelector(seen, name, pagePath);
      const sourcePage = sourceObject.pages?.[name];
      if (!isObject(sourcePage)) {
        error(pagePath, "page does not exist in source");
        return;
      }
      if (hasOwn(page, "title")) {
        if (typeof page.title !== "string" || !page.title.trim()) error(`${pagePath}.title`, "must be a non-empty translated string");
        else translatedTextCount += 1;
      }
      translatedText(page, "access", sourcePage.access, pagePath);
      translatedText(page, "desc", sourcePage.desc, pagePath);
      if (hasOwn(page, "registers")) validateRegisterTranslations(page.registers, sourcePage, `${pagePath}.registers`);
      if (translatedTextCount === before) error(pagePath, "contains no translated text");
    });
  }

  if (translatedTextCount === 0) error("file.translations", "must contain at least one translated user-facing string");
  return errors;
}

async function validateFile(file) {
  const path = resolve(file);
  const relativePath = repositoryPath(path);
  let document;
  try {
    document = YAML.parse(await readFile(path, "utf8"));
  } catch (parseError) {
    return [`file: invalid YAML: ${parseError.message}`];
  }

  const sourceFile = typeof document?.source_file === "string" ? document.source_file : "";
  const locale = typeof document?.locale === "string" ? document.locale : "";
  const sourceTopLevel = sourceFile.split("/")[0];
  const errors = [];
  if (!DATA_ROOTS.has(sourceTopLevel) || sourceFile.includes("..") || sourceFile.startsWith("/")) {
    errors.push("file.source_file: must point to a register YAML under architecture, controllers, sensors, or soc");
    return errors;
  }
  const expectedPath = `locales/${locale}/${sourceFile}`;
  if (relativePath !== expectedPath) errors.push(`file: must be stored at ${expectedPath}`);

  const sourcePath = resolve(root, sourceFile);
  let sourceText;
  let source;
  try {
    sourceText = await readFile(sourcePath, "utf8");
    source = YAML.parse(sourceText);
  } catch (sourceError) {
    errors.push(`file.source_file: cannot read source YAML: ${sourceError.message}`);
    return errors;
  }
  const sourceSha256 = createHash("sha256").update(sourceText).digest("hex");
  return errors.concat(validateTranslationDocument(document, source, { sourceFile, sourceSha256 }));
}

async function main() {
  const requested = process.argv.slice(2);
  const files = requested.length ? requested : await translationYamlFiles();
  if (!files.length) {
    console.log("no translation sidecars found");
    return;
  }

  let failed = false;
  for (const file of files) {
    const errors = await validateFile(file);
    const name = repositoryPath(resolve(file));
    if (errors.length) {
      failed = true;
      console.error(`FAIL  ${name}`);
      errors.forEach((message) => console.error(`      ${message}`));
    } else {
      console.log(`OK    ${name}: translation matches source`);
    }
  }
  if (failed) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) await main();

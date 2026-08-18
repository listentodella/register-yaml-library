// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import YAML from "yaml";
import { root } from "./library-files.mjs";
import { validateTranslationDocument } from "./validate-translations.mjs";

const sourceFile = "architecture/arm/m-profile/arm-cm0-system-registers.yaml";
const sourceText = await readFile(`${root}/${sourceFile}`, "utf8");
const source = YAML.parse(sourceText);
const sourceSha256 = createHash("sha256").update(sourceText).digest("hex");

function validDocument() {
  return {
    translation_schema_version: 1,
    format: "register-reference-translation",
    source_locale: "en",
    locale: "zh-CN",
    source_file: sourceFile,
    source_sha256: sourceSha256,
    metadata: {
      status: "draft",
      coverage: "partial",
      method: "ai",
      translator: "translation test",
      updated: "2026-08-17",
    },
    translations: {
      sensor: "Arm Cortex-M0 系统寄存器",
      pages: [
        {
          name: "Special Registers",
          title: "特殊寄存器",
          registers: [
            {
              name: "APSR",
              desc: "返回 APSR 寄存器的内容。",
              fields: [
                { name: "N", bits: "31", desc: "负数条件标志。" },
              ],
            },
          ],
        },
      ],
    },
  };
}

const options = { sourceFile, sourceSha256 };
assert.deepEqual(validateTranslationDocument(validDocument(), source, options), []);

const stale = validDocument();
stale.source_sha256 = "0".repeat(64);
assert.match(validateTranslationDocument(stale, source, options).join("\n"), /does not match source file/);

const unknownRegister = validDocument();
unknownRegister.translations.pages[0].registers[0].name = "NOT_A_REGISTER";
assert.match(validateTranslationDocument(unknownRegister, source, options).join("\n"), /does not exist in source page/);

const changedFact = validDocument();
changedFact.translations.pages[0].registers[0].addr = 0x00;
assert.match(validateTranslationDocument(changedFact, source, options).join("\n"), /unknown field/);

console.log("translation validator tests passed");

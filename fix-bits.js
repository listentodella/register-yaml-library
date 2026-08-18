const fs = require('fs');
const yaml = require('yaml');

const sourcePath = process.argv[2] || 'architecture/arm/m-profile/cortex-m3.yaml';
const transPath = process.argv[3] || 'locales/zh-CN/architecture/arm/m-profile/cortex-m3.yaml';

const source = yaml.parse(fs.readFileSync(sourcePath, 'utf8'));
const trans = yaml.parse(fs.readFileSync(transPath, 'utf8'));

// Build bits map from source pages
const bitsMap = {};
for (const [pageName, pageData] of Object.entries(source.pages)) {
  if (!pageData.registers) continue;
  bitsMap[pageName] = {};
  for (const reg of pageData.registers) {
    if (!reg.fields) continue;
    bitsMap[pageName][reg.name] = {};
    for (const field of reg.fields) {
      bitsMap[pageName][reg.name][field.name] = field.bits;
    }
  }
}

// Traverse trans.translations.pages
for (const transPage of trans.translations.pages) {
  const pageName = transPage.name;
  const sourcePage = bitsMap[pageName];
  if (!sourcePage) continue;
  if (!transPage.registers) continue;
  for (const transReg of transPage.registers) {
    const regName = transReg.name;
    const sourceReg = sourcePage[regName];
    if (!sourceReg) continue;
    if (!transReg.fields) continue;
    for (const transField of transReg.fields) {
      const fieldName = transField.name;
      const bits = sourceReg[fieldName];
      if (bits !== undefined) {
        transField.bits = bits;
      }
    }
  }
}

// Write back
fs.writeFileSync(transPath, yaml.stringify(trans), 'utf8');
console.log('Bits added successfully.');
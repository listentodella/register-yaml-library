const fs = require('fs');
const yaml = require('yaml');

const transPath = 'locales/zh-CN/architecture/arm/m-profile/cortex-m3.yaml';
const trans = yaml.parse(fs.readFileSync(transPath, 'utf8'));

function fixDesc(obj) {
  if (typeof obj === 'string') {
    if (obj.includes('\n')) {
      return obj.replace(/\n/g, '\\n');
    }
    return obj;
  } else if (Array.isArray(obj)) {
    return obj.map(fixDesc);
  } else if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key === 'desc' && typeof obj[key] === 'string' && obj[key].includes('\n')) {
        obj[key] = obj[key].replace(/\n/g, '\\n');
      } else {
        obj[key] = fixDesc(obj[key]);
      }
    }
    return obj;
  } else {
    return obj;
  }
}

const fixed = fixDesc(trans);
fs.writeFileSync(transPath, yaml.stringify(fixed, { indent: 2 }), 'utf8');
console.log('Fixed desc fields.');
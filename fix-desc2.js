const fs = require('fs');
const yaml = require('yaml');

const transPath = 'locales/zh-CN/architecture/arm/m-profile/cortex-m3.yaml';
const trans = yaml.parse(fs.readFileSync(transPath, 'utf8'));

function fixDesc(obj) {
  if (typeof obj === 'string') {
    // 如果字符串包含换行，替换为 \n（转义字符）
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

// 使用 doubleQuoted: true 强制所有字符串使用双引号，并设置 lineWidth: 0 避免折行
const output = yaml.stringify(fixed, {
  indent: 2,
  lineWidth: 0,
  doubleQuoted: true,
  // 不要使用块样式，保持单行
});

fs.writeFileSync(transPath, output, 'utf8');
console.log('Fixed desc fields with double quotes.');
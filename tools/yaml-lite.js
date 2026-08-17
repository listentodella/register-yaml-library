(function () {
  function stripComment(line) {
    let quote = "";
    let escaped = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (quote === '"' && char === "\\") {
        escaped = true;
        continue;
      }
      if ((char === '"' || char === "'") && !quote) {
        quote = char;
        continue;
      }
      if (char === quote) {
        quote = "";
        continue;
      }
      if (char === "#" && !quote) {
        return line.slice(0, i);
      }
    }

    return line;
  }

  function countIndent(line) {
    const match = line.match(/^ */);
    return match ? match[0].length : 0;
  }

  function splitTopLevel(text, separator) {
    const parts = [];
    let quote = "";
    let escaped = false;
    let depth = 0;
    let start = 0;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (quote === '"' && char === "\\") {
        escaped = true;
        continue;
      }
      if ((char === '"' || char === "'") && !quote) {
        quote = char;
        continue;
      }
      if (char === quote) {
        quote = "";
        continue;
      }
      if (!quote && (char === "[" || char === "{")) depth += 1;
      if (!quote && (char === "]" || char === "}")) depth -= 1;
      if (!quote && depth === 0 && char === separator) {
        parts.push(text.slice(start, i).trim());
        start = i + 1;
      }
    }

    parts.push(text.slice(start).trim());
    return parts.filter(Boolean);
  }

  function findTopLevelColon(text) {
    let quote = "";
    let escaped = false;
    let depth = 0;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (quote === '"' && char === "\\") {
        escaped = true;
        continue;
      }
      if ((char === '"' || char === "'") && !quote) {
        quote = char;
        continue;
      }
      if (char === quote) {
        quote = "";
        continue;
      }
      if (!quote && (char === "[" || char === "{")) depth += 1;
      if (!quote && (char === "]" || char === "}")) depth -= 1;
      if (!quote && depth === 0 && char === ":") return i;
    }

    return -1;
  }

  function unquote(text) {
    if (text.length < 2) return text;
    const quote = text[0];
    if ((quote !== '"' && quote !== "'") || text[text.length - 1] !== quote) return text;

    const body = text.slice(1, -1);
    if (quote === "'") return body.replace(/''/g, "'");

    return body.replace(/\\([nrt"\\])/g, (_, char) => {
      if (char === "n") return "\n";
      if (char === "r") return "\r";
      if (char === "t") return "\t";
      return char;
    });
  }

  function parseScalar(text) {
    const value = text.trim();
    if (value === "") return "";
    if (value === "null" || value === "~") return null;
    if (value === "true") return true;
    if (value === "false") return false;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      return unquote(value);
    }
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      return inner ? splitTopLevel(inner, ",").map(parseScalar) : [];
    }
    if (/^0x[0-9a-f]+$/i.test(value)) {
      const parsed = BigInt(value);
      return parsed <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(parsed) : value;
    }
    if (/^-?\d+$/.test(value)) {
      const parsed = BigInt(value);
      return parsed >= BigInt(Number.MIN_SAFE_INTEGER) && parsed <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(parsed) : value;
    }
    if (/^-?\d+\.\d+$/.test(value)) return Number.parseFloat(value);
    return value;
  }

  function parseKeyValue(text) {
    const colon = findTopLevelColon(text);
    if (colon < 0) return null;
    return {
      key: text.slice(0, colon).trim(),
      valueText: text.slice(colon + 1).trim(),
    };
  }

  function prepareLines(text) {
    return text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .map((raw) => {
        const clean = stripComment(raw).replace(/\s+$/, "");
        return { raw: clean, indent: countIndent(clean), text: clean.trim() };
      })
      .filter((line) => line.text.length > 0);
  }

  function assignUnique(target, key, value, lineNumber) {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      throw new Error(`存在重复字段 ${key}：第 ${lineNumber} 行`);
    }
    target[key] = value;
  }

  function parseRegisterYaml(text) {
    const lines = prepareLines(text);
    let index = 0;

    function parseBlock(indent) {
      const line = lines[index];
      if (!line || line.indent < indent) return {};
      return line.text.startsWith("- ") ? parseArray(indent) : parseObject(indent);
    }

    function parseObject(indent) {
      const object = {};

      while (index < lines.length) {
        const line = lines[index];
        if (line.indent < indent) break;
        if (line.indent > indent) {
          throw new Error(`无法解析缩进：第 ${index + 1} 行`);
        }
        if (line.text.startsWith("- ")) break;

        const pair = parseKeyValue(line.text);
        if (!pair) throw new Error(`无法解析键值：第 ${index + 1} 行`);
        index += 1;

        if (pair.valueText) {
          assignUnique(object, pair.key, parseScalar(pair.valueText), index);
        } else {
          assignUnique(
            object,
            pair.key,
            index < lines.length && lines[index].indent > indent ? parseBlock(lines[index].indent) : {},
            index,
          );
        }
      }

      return object;
    }

    function parseArray(indent) {
      const array = [];

      while (index < lines.length) {
        const line = lines[index];
        if (line.indent < indent) break;
        if (line.indent > indent) {
          throw new Error(`无法解析列表缩进：第 ${index + 1} 行`);
        }
        if (!line.text.startsWith("- ")) break;

        const rest = line.text.slice(2).trim();
        index += 1;

        if (!rest) {
          array.push(index < lines.length && lines[index].indent > indent ? parseBlock(lines[index].indent) : null);
          continue;
        }

        const pair = parseKeyValue(rest);
        if (!pair) {
          array.push(parseScalar(rest));
          continue;
        }

        const item = {};
        assignUnique(
          item,
          pair.key,
          pair.valueText
            ? parseScalar(pair.valueText)
            : index < lines.length && lines[index].indent > indent
              ? parseBlock(lines[index].indent)
              : {},
          index,
        );

        while (index < lines.length && lines[index].indent > indent) {
          const childIndent = lines[index].indent;
          const child = lines[index];
          if (child.text.startsWith("- ")) break;
          const childPair = parseKeyValue(child.text);
          if (!childPair) throw new Error(`无法解析列表对象：第 ${index + 1} 行`);
          index += 1;
          assignUnique(
            item,
            childPair.key,
            childPair.valueText
              ? parseScalar(childPair.valueText)
              : index < lines.length && lines[index].indent > childIndent
                ? parseBlock(lines[index].indent)
                : {},
            index,
          );
        }

        array.push(item);
      }

      return array;
    }

    return parseBlock(lines[0] ? lines[0].indent : 0);
  }

  window.parseRegisterYaml = parseRegisterYaml;
})();

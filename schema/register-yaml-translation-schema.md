# Register YAML 翻译 Sidecar Schema v1

翻译 sidecar 为英文寄存器 YAML 提供本地化显示文本。它不是独立芯片定义，不能脱离 `source_file` 使用。

## 顶层结构

```yaml
translation_schema_version: 1
format: "register-reference-translation"
source_locale: "en"
locale: "zh-CN"
source_file: "architecture/arm/m-profile/arm-cm33-system-registers.yaml"
source_sha256: "替换为英文源文件的64位小写SHA-256"
metadata:
  status: "draft"
  coverage: "partial"
  method: "ai"
  translator: "翻译器或贡献者名称"
  updated: "2026-08-17"
translations:
  sensor: "Arm Cortex-M33 系统寄存器"
  pages: []
```

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `translation_schema_version` | integer | 必填，固定为 `1` | 翻译格式版本 |
| `format` | string | 必填 | 固定为 `register-reference-translation` |
| `source_locale` | language tag | 必填 | 英文源使用 `en` |
| `locale` | language tag | 必填 | 简体中文使用 `zh-CN` |
| `source_file` | repository path | 必填 | 英文源 YAML 的仓库相对路径 |
| `source_sha256` | string | 必填 | 英文源文件完整字节内容的 SHA-256 |
| `metadata` | mapping | 必填 | 翻译状态与责任信息 |
| `translations` | mapping | 必填 | 实际译文，至少包含一个用户可见文本 |

文件必须位于 `locales/<locale>/<source_file>`。`source_file` 只能指向 `architecture`、`controllers`、`sensors` 或 `soc` 下的寄存器 YAML。

## metadata

| 字段 | 值 | 要求 |
| --- | --- | --- |
| `status` | `draft` / `reviewed` | 必填；AI 输出只能填写 `draft` |
| `coverage` | `partial` / `complete` | 必填；如实表示翻译完整度 |
| `method` | `ai` / `human` / `ai-assisted` | 必填 |
| `translator` | string | 必填；记录模型、工具或贡献者 |
| `updated` | `YYYY-MM-DD` | 必填 |
| `reviewer` | string | `reviewed` 时必填 |
| `reviewed_at` | `YYYY-MM-DD` | `reviewed` 时必填 |
| `notes` | string | 可选；只记录整份翻译的维护说明 |

机器校验能够检查结构和引用，但不能证明译文正确。`reviewed` 必须代表独立的语义审校，不能由生成译文的同一次 AI 任务自行声明。

## translations

顶层允许：

```yaml
translations:
  sensor: "本地化显示名称"
  family: "本地化系列名称"
  who_am_i:
    values: []
  pages: []
```

`sensor`、`family` 可选，并且只能在英文源存在相应文本时填写。`vendor`、`device_type` 和整个 `source` 块不进入翻译文件。

### 页面

```yaml
pages:
  - name: "Special Registers"
    title: "特殊寄存器"
    access: "MRS/MSR 特殊寄存器接口"
    desc: "处理器状态、屏蔽和控制寄存器"
    registers: []
```

- `name` 是选择器，必须逐字匹配英文源 `pages` 的 key，不会作为译文显示。
- `title` 是该页面 key 的本地化显示标题。
- `access`、`desc` 只能在源页面存在对应文本时填写。
- 同一 sidecar 中不得重复页面选择器。

### 寄存器

```yaml
registers:
  - name: "BASEPRI"
    desc: "设置或读取基础优先级屏蔽值。"
    condition: "仅在实现相应架构功能时可用。"
    alias_note: "与另一个寄存器视图共享同一地址。"
    no_dump_reason: "读取会消耗流式数据。"
    fields: []
```

`name` 必须逐字匹配当前源页面中的寄存器名，而且源页面内该名称必须唯一。允许翻译 `desc`、`condition`、`alias_note`、`no_dump_reason`；只有源寄存器存在相应字段时才能填写。

地址、访问属性、宽度、reset、encoding、accessors、source_ref 等结构字段不允许出现在翻译条目中。

### 位域

```yaml
fields:
  - name: "MODE"
    bits: "3:1"
    desc: "选择工作模式。"
    condition: "仅当 FEAT_EXAMPLE 已实现时有效。"
    reset_info: "复位值由实现定义。"
    values: []
```

- `name` 和 `bits` 共同选择英文源位域，两者必须逐字匹配；`bits` 始终使用引号。
- 如果英文源有多个同名、同位范围但条件不同的条目，增加 `source_condition`，其值必须原样复制英文条件。
- `source_condition` 只用于选择原文，不能翻译；翻译后的条件写入 `condition`。
- 允许翻译 `desc`、`condition`、`reset_info`。

条件重叠示例：

```yaml
- name: "FIELD"
  bits: "7:4"
  source_condition: "When FEAT_EXAMPLE is implemented"
  desc: "功能字段。"
  condition: "当 FEAT_EXAMPLE 已实现时。"
```

### 枚举值

无论英文源使用 mapping 还是 list，翻译文件统一使用 list：

```yaml
values:
  - value: 0x00
    desc: "禁用"
  - value: "0b10xx"
    source_condition: "When FEAT_EXAMPLE is implemented"
    desc: "选择扩展模式"
    condition: "当 FEAT_EXAMPLE 已实现时。"
```

`value` 是选择器，不得改变。十六进制、二进制和十进制的等值整数可以匹配；范围和带 `x` 的模式必须保持原字符串。存在同值不同条件时使用 `source_condition` 消除歧义。

`who_am_i.values` 使用相同结构：

```yaml
who_am_i:
  values:
    - value: 0x42
      desc: "器件身份值"
```

## 部分翻译

所有翻译节点都可省略。不要为尚未翻译的文本创建空字符串，也不要把英文原文复制到译文字段。应用应按单个字段回退到英文，而不是按整个文件回退。

页面条目可以只包含寄存器翻译，寄存器条目也可以只包含位域翻译；但每个选择器节点最终必须包含至少一个实际译文。

## YAML 子集

sidecar 与寄存器数据使用相同的浏览器兼容 YAML 子集：

- 两个空格缩进，不使用 Tab。
- 不使用 anchor、alias、tag、directive、内联 object 或多文档语法。
- 不使用 `|`、`>` 块字符串；多行译文写为双引号字符串并使用 `\n`。
- `bits`、日期、包含 `:` 或 `#` 的文本必须加引号。
- 不依赖 `yes`、`no`、`on`、`off` 等 YAML 1.1 隐式布尔值。

## 校验

```bash
npm run translations:validate
npm test
```

校验内容包括：sidecar 镜像路径、语言标签、源文件存在性、SHA-256、允许字段、页面/寄存器/位域/枚举选择器、重复与歧义引用、审阅元数据和浏览器解析器兼容性。

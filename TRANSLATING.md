# 翻译寄存器数据

本仓库使用“英文源 YAML + 语言 sidecar”的方式维护翻译。英文源文件是寄存器结构、原文和来源信息的唯一真源；翻译文件只包含面向用户的本地化文本，不复制或修改地址、位宽、位域、复位值、访问属性和编码。

完整格式见 [`schema/register-yaml-translation-schema.md`](schema/register-yaml-translation-schema.md)，起始文件见 [`templates/register-translation-template.yaml`](templates/register-translation-template.yaml)。

Register Reference 已支持直接导入语言 sidecar，并提供 `中文 | 中英 | EN` 展示模式、逐字段英文回退和中英联合搜索。应用会按 `source_sha256` 绑定英文源；译文过期或选择器失效时会拒绝导入。

## 文件位置

翻译文件在 `locales/<目标语言>/` 下镜像英文源文件路径。例如：

```text
英文源文件：architecture/arm/m-profile/arm-cm33-system-registers.yaml
简体中文：locales/zh-CN/architecture/arm/m-profile/arm-cm33-system-registers.yaml

英文源文件：architecture/riscv/rv64/riscv-rv64-csr.yaml
简体中文：locales/zh-CN/architecture/riscv/rv64/riscv-rv64-csr.yaml
```

不要创建一份包含完整寄存器结构的中文版 YAML，也不要把中文直接写回英文源文件。

## 翻译 AI 工作流程

1. 完整阅读目标英文 YAML、同页寄存器和相邻位域，先理解上下文再翻译。
2. 从翻译模板创建镜像路径文件，填写 `source_file`。
3. 从 `catalog.json` 中复制该源文件的 SHA-256 到 `source_sha256`。
4. 设置 `source_locale: en`、`locale: zh-CN`、`metadata.status: draft` 和 `metadata.method: ai`。
5. 只写需要翻译的条目。允许分批提交；未翻译文本由应用回退显示英文。
6. 按页面名、寄存器名、位域名与 `bits` 精确引用英文源条目，不改变任何选择器。
7. 遇到原文错误、歧义、疑似 OCR 问题或源文件中已有混合语言时，不猜测、不反向补写英文；省略该译文并在提交说明中列出。
8. 运行 `npm run translations:validate` 和 `npm test`，修复所有错误后交付。

AI 生成的翻译必须保持 `status: draft`。只有完成独立人工或专门审校后，才可以改为 `reviewed` 并填写 `reviewer`、`reviewed_at`。

## 允许翻译

- 芯片或寄存器集的显示名称：`sensor`、`family`
- 页面显示标题、接口说明和页面说明：`title`、`access`、`desc`
- 寄存器说明、存在条件、别名说明和禁止普通读取原因
- 位域说明、存在条件和复位补充信息
- 枚举值说明及其条件
- `who_am_i` 值的说明

只翻译源文件确实存在的文本。sidecar 不能借翻译增加原文没有的行为说明、经验建议或推断。

## 禁止翻译或改写

- YAML key、页面选择器、寄存器名、位域名
- 地址、页号、位宽、`bits`、复位值、枚举值和掩码
- `RO`、`RW`、`WO`、`W1C`、`RES0`、`RES1` 等机器语义标记
- `FEAT_*`、指令、intrinsic、编码、accessor、变量和寄存器别名
- `source`、URL、文档名、revision、许可证、版权与 notice
- 英文源 YAML 的结构、顺序或内容

专业缩写可以在中文说明中解释，但标识符本身必须原样保留。例如可以写“写 1 清零（W1C）”，不能把字段名 `W1C` 改成中文。

## 质量要求

- 使用简体中文和工程技术语体，忠实完整，不写宣传性或口语化表达。
- 不摘要原文，不省略限制条件、例外、警告、副作用和前后因果。
- 严格保留否定关系以及 `must`、`must not`、`should`、`may` 的强度差异。
- 数值、进制、位号、范围、公式、单位、寄存器引用和信号方向必须与原文一致。
- 保留段落和列表关系。多行内容使用双引号中的 `\n`，不得使用 YAML 块字符串。
- 区分“保留”“忽略”“未知”“实现定义”“不可预测”，不得统一翻译成“无效”。
- `Secure` / `Non-secure` 使用“安全”/“非安全”；`Exception level` 使用“异常级别”。
- A-profile 中的 `translation regime` 使用“地址转换机制”，`Warm reset` / `Cold reset` 使用“温复位”/“冷复位”。
- RISC-V 中的 `hart` 保留 `hart`，首次出现可解释为“硬件线程”；`privilege mode` 使用“特权模式”，`CSR`、扩展名和 `XLEN` 保留原标识。
- `UNKNOWN`、`UNPREDICTABLE`、`CONSTRAINED UNPREDICTABLE`、`IMPLEMENTATION DEFINED` 等架构关键字保留英文标识符，中文句子负责解释其语义。
- `read-clear` 使用“读后清零”，`write-one-to-clear` 使用“写 1 清零”，`memory-mapped` 使用“内存映射”。
- 对可能有多种译法的术语，优先沿用同一芯片和同一架构文件中已经审校的表达。

## 完整度与回退

`metadata.coverage` 有两个值：

- `partial`：只翻译了一部分文本，适合分批工作。
- `complete`：所有适合本地化的用户可见原文都已处理；标识符和无需翻译的技术短语可以保持回退。

不要用空字符串、占位文本或直接复制英文来伪造完整度。未翻译条目应从 sidecar 中省略，让界面明确回退到英文。

## 源文件更新

`source_sha256` 锁定翻译所依据的英文版本。校验失败说明英文源文件已变化：

1. 比较新旧英文源文件。
2. 复核受影响页面、寄存器、位域和枚举译文。
3. 更新或删除失效译文。
4. 完成复核后再填写新的 SHA-256。

禁止只更新哈希值来绕过过期检查。翻译仍受英文源资料的原始许可和署名要求约束，sidecar 不会改变其分发条件。

## 可交给翻译 AI 的任务文本

```text
请为 <source_file> 创建简体中文寄存器翻译 sidecar。

开始前必须阅读 TRANSLATING.md、schema/register-yaml-translation-schema.md 和英文源文件。
英文源 YAML 只读，不得修改。输出必须位于 locales/zh-CN/<source_file>，并使用
register-reference-translation schema v1。只翻译源文件已有的用户可见文本；寄存器名、
位域名、地址、位号、数值、访问属性、编码、指令、FEAT_*、许可证和来源信息保持原样。
不得总结、补充常识或猜测歧义。保留所有条件、否定、警告、单位、公式和副作用。
不确定的条目请省略并在交付说明中列出。AI 产物必须标记 status: draft、method: ai，
并如实填写 coverage。完成后运行 npm run translations:validate 和 npm test。
```

## 提交前检查

- `git diff -- <source_file>` 没有输出，确认英文源文件未被翻译任务修改。
- sidecar 路径与 `source_file` 完全镜像。
- `source_sha256` 与 `catalog.json` 一致。
- 所有页面、寄存器、位域和枚举选择器都能匹配英文源文件。
- 所有数值、单位、位号、标识符和条件均与原文逐项核对。
- 不确定内容已经省略并记录，没有自行补全。
- `npm run translations:validate` 和 `npm test` 全部通过。

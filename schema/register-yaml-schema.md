# 寄存器 YAML 规范

## 目录

- 顶层结构（MMIO 与 ARM system register）
- 页面结构
- 寄存器结构
- 位域结构
- 枚举写法
- 特殊寄存器建模
- 浏览器 YAML 子集
- 生成检查表

## 顶层结构

```yaml
schema_version: 1
sensor: CHIP_MODEL
vendor: VENDOR_NAME
family: CHIP_FAMILY
device_type: sensor
who_am_i:
  reg: 0x00
  values:
    - value: 0x42
      desc: "芯片身份值"

pages:
  UI:
    page_id: 0x00
    access: "SPI / I2C"
    desc: "主接口寄存器页"
    registers: []
```

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `schema_version` | positive integer | 必填 | MMIO 文件使用 `1`；非 MMIO 系统寄存器使用 `2` |
| `sensor` | string | 必填 | 下拉框显示的芯片型号，也是生成 `_id` 的来源 |
| `vendor` | string | 可选 | 芯片或 IP 供应商 |
| `family` | string | 可选 | 产品系列或 IP 家族 |
| `device_type` | string | 可选 | 固有器件类型，如 `imu`、`usb_controller` |
| `who_am_i` | object | 建议 | 身份寄存器信息；当前前端保留数据但不单独渲染 |
| `who_am_i.reg` | integer/null | 必填 | 身份寄存器地址；资料未提供时写 `null` |
| `who_am_i.values` | list | 必填 | 可接受的身份值；未知时写空列表 |
| `pages` | mapping | 必填 | 键是页面名称，例如 `UI`、`OIS`、`BANK1` |

`who_am_i.values` 的每项包含数值 `value` 和文字 `desc`。不同 silicon revision 可列出多个值。不要把芯片版本寄存器值误写成 WHO_AM_I。

### ARM 系统寄存器顶层结构（schema v2）

ARM 的 A-profile MRS/MSR 或 MRC/MCR 系统寄存器不是 MMIO 地址，不能把编码拼成伪 `addr`。M-profile 可以在同一份 YAML 中同时表达 CPU 特殊寄存器和真实的 System Control Space（SCS）MMIO 寄存器：前者使用 `m_profile_special`，后者使用真实 `addr`。

```yaml
schema_version: 2
sensor: "ARM AArch64 system registers"
vendor: "Arm"
family: "A-profile architecture"
device_type: "architecture_registers"
register_space:
  kind: "arm_system"
  architecture: "AArch64"
  profile: "A"
source:
  title: "Arm Architecture System Registers XML"
  version: "2026-06"
  revision: "M.c"
  document: "Arm Architecture Reference Manual, A-profile system-register XML"
  url: "https://developer.arm.com/.../SysReg_xml_A_profile-2026-06_mc.tar.gz"
  license: "Arm proprietary; review notice.xml before use"
  notice: "LES-PRE-20349"
pages: {}
```

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `register_space.kind` | string | 必填 | 当前支持 `mmio`、`arm_system` |
| `register_space.architecture` | string | system 必填 | `AArch64`、`AArch32` 或 `Armv6-M`/`Armv7-M`/`Armv8-M` 等 |
| `register_space.profile` | string | system 必填 | A-profile 使用 `A`；Cortex-M 使用 `M` |
| `source.title` | string | system 必填 | 数据源名称，不写成目标 SoC 手册 |
| `source.version` | string | system 必填 | 机器可读包版本；不得只写“最新” |
| `source.revision` | string | 建议 | 对应 Arm ARM revision |
| `source.document` | string | system 必填 | 官方文档或数据包名称 |
| `source.url` | string | system 必填 | 官方下载页或固定版本 URL |
| `source.license` | string | system 必填 | 授权性质；Arm notice 不是 SPDX 开源许可证 |
| `source.notice` | string | 建议 | 包内 notice 标识，例如 `LES-PRE-20349` |

`arm_system` 不得包含 `who_am_i`。A-profile 完整 Arm XML 和从中生成的大型 YAML 受 Arm 包内专有条款约束，本项目只提供导入器，不默认再分发这些数据。CMSIS-Core(M) 头文件使用 Apache-2.0；生成的 M-profile YAML 应保留 Arm 版权、许可证和来源说明。

## 页面结构

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `page_id` | integer | MMIO 必填 | 页编号；无分页芯片使用 `0x00`；`arm_system` 分类页不得填写 |
| `address_unit_bits` | positive integer | 可选 | 一个地址单位的位数，默认 8 |
| `access` | string | 必填 | 页面访问接口，例如 `"SPI / I2C / I3C"` |
| `desc` | string | 必填 | 页用途、切页方式或资料版本说明 |
| `registers` | list | 必填 | 本页寄存器列表，可为空 |

不同页面可以使用相同寄存器地址。页面名和 `page_id` 应在芯片内唯一；如果 datasheet 使用 bank 概念，仍使用 `pages` 表示。

对 `arm_system`，`pages` 是功能分类（如 `Identification Registers`、`Memory`），不是硬件分页；`access` 通常写 `MRS / MSR system-register interface`。

## 寄存器结构

最小寄存器：

```yaml
- addr: 0x10
  name: CTRL0
  access: RW
  width: 1
  desc: "控制寄存器 0"
  fields:
    - name: enable
      bits: "0:0"
      desc: "功能使能"
      values:
        0x00: "禁用"
        0x01: "使能"
```

| 字段 | 类型 | 要求 | 前端行为 |
| --- | --- | --- | --- |
| `addr` | integer | 必填 | 起始字节地址，矩阵和表格用于定位 |
| `name` | string | 必填 | 寄存器名称和搜索关键字 |
| `access` | string | 必填 | 建议使用 `RO`、`RW`、`WO` |
| `width` | positive integer | 必填 | 占用字节数；默认视为 1，但应显式填写 |
| `bit_width` | positive integer | 可选 | 实际有效位数，默认 `width * 8` |
| `address_span` | positive integer | 可选 | 占用地址单位数，默认等于 `width` |
| `byte_order` | string | 可选 | 多字节数值的字节序，使用 `little` 或 `big` |
| `reset` | integer/numeric string | 可选 | 寄存器复位值；超过 YAML/JavaScript 安全整数范围时使用带 `0x`/`0b` 前缀的字符串 |
| `desc` | string | 必填 | 寄存器用途和重要行为 |
| `fields` | list | 可选 | 位域列表；没有可靠位域资料时可省略 |
| `multi_byte` | boolean | 可选 | 标记多字节聚合/联合读取视图；前端不会直接显示该聚合条目 |
| `read_clear` | boolean | 可选 | 显示 `read-clear` 警示 |
| `no_dump` | boolean | 可选 | 显示 `no-dump` 警示，标记不应普通遍历读取的端口 |
| `no_dump_reason` | string | 可选 | 记录不能普通读取的原因；当前 UI 不渲染 |
| `alias_note` | string | 可选 | 显示地址重叠或别名说明 |
| `roles` | list[string] | 可选 | 语义标签；当前 UI 仅据其标记特殊寄存器 |
| `event` | string | 可选 | 下游事件语义；当前 UI 不渲染 |
| `target` | string | 可选 | 下游目标语义，如 `int1`；当前 UI 不渲染 |
| `action_hint` | string | 可选 | 下游建议动作；当前 UI 不渲染 |
| `ignore_by_default` | boolean | 可选 | 下游默认忽略提示；当前 UI 不渲染 |

对 `register_space.kind: arm_system` 且 `profile: M` 的条目，`addr` 表示真实 SCS/CoreSight MMIO 地址；这类条目不需要 `encoding` 或 `accessors`，但仍必须有 `access`、`width`、`desc`。A-profile 和 M-profile 特殊寄存器仍禁止填写 `addr`。

`addr + address_span - 1` 是该条目覆盖的最后地址；省略 `address_span` 时使用 `width`。当前前端允许地址重叠，以便同时表达一个多字节逻辑视图和多个单字节物理寄存器；此时为相关条目填写 `alias_note`。

### ARM system register 寄存器结构

```yaml
- name: "SCTLR_EL1"
  access: "RW"
  width: 8
  bit_width: 64
  desc: "System Control Register (EL1)"
  execution_state: "AArch64"
  condition: "when FEAT_AA64 is implemented"
  encoding:
    scheme: "aarch64_sysreg"
    op0: 3
    op1: 0
    crn: 1
    crm: 0
    op2: 0
  accessors:
    - name: "SCTLR_EL1"
      kind: "read"
      instruction: "MRS <Xt>, SCTLR_EL1"
      encoding:
        scheme: "aarch64_sysreg"
        op0: 3
        op1: 0
        crn: 1
        crm: 0
        op2: 0
  source_ref: "AArch64-sctlr_el1.xml"
```

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `encoding` | mapping | system 必填 | 规范编码，也是备注稳定身份的一部分 |
| `encoding.scheme` | string | system 特殊寄存器必填 | AArch64 使用 `aarch64_sysreg`/`aarch64_special`；AArch32 使用 `aarch32_cp15`、`aarch32_coproc`、`aarch32_special` 或 `aarch32_vfp`；M-profile CPU 特殊寄存器使用 `m_profile_special` |
| `encoding.op0/op1/crn/crm/op2` | integer/string | AArch64 | 固定编码用整数，参数化编码可保留表达式字符串 |
| `encoding.coproc/opc1/crn/crm/crd/opc2` | integer/string | AArch32 coprocessor | MRC/MCR/MRRC/MCRR/LDC/STC 编码；CP15 之外的协处理器使用 `aarch32_coproc` |
| `encoding.r/m/m1` | integer/string | AArch32 banked | banked MRS/MSR 编码 |
| `encoding.reg` | integer/string | AArch32 VFP | VMRS/VMSR 特殊寄存器选择器 |
| `encoding.selector` | string | special | XML 没有独立位编码时使用的架构寄存器选择器 |
| `encoding.selector`（M-profile） | string | special | `APSR`、`CONTROL`、`MSP`、`PSP`、`PRIMASK`、`BASEPRI`、`FAULTMASK`、`MSPLIM`、`PSPLIM` 及其 `_NS` 变体 |
| `accessors` | list | system 必填 | 每种读写方式；含 `name`、`kind`、`instruction`、`encoding` 和可选 `condition` |
| `execution_state` | string | 建议 | `AArch64` 或 `AArch32` |
| `condition` | string | 可选 | 寄存器存在条件，如架构 feature |
| `groups` | list[string] | 可选 | 官方功能分组；首项通常决定页面分类 |
| `aliases` | list[string] | 可选 | AArch32/AArch64 映射或别名 |
| `variables` | list | 可选 | 参数化寄存器变量，项可含 `name`、`min`、`max`、`values` |
| `source_ref` | string | 建议 | 原始 XML 文件名，便于追溯 |

system register 仍使用 `width` 表示容纳值所需字节数，`bit_width` 可为 32、64、128 或资料定义的其他宽度。A-profile 和 M-profile CPU 特殊寄存器不得填写 `addr`、`address_span`、`byte_order`；M-profile SCS MMIO 条目可以使用真实 `addr`，也可以按需要使用 `address_span`。

### M-profile 混合示例

```yaml
register_space:
  kind: "arm_system"
  architecture: "Armv8-M Mainline"
  profile: "M"

pages:
  Special Registers:
    access: "MRS / MSR special-register interface"
    desc: "CPU special registers"
    registers:
      - name: "CONTROL"
        access: "RW"
        width: 4
        bit_width: 32
        desc: "Control Register"
        encoding:
          scheme: "m_profile_special"
          selector: "CONTROL"
        accessors:
          - name: "__get_CONTROL"
            kind: "read"
            instruction: "MRS <value>, CONTROL"
            encoding:
              scheme: "m_profile_special"
              selector: "CONTROL"
  SCB:
    access: "Memory-mapped Core Peripheral access"
    desc: "System Control Block"
    registers:
      - addr: 0xE000ED00
        name: "CPUID"
        access: "RO"
        width: 4
        desc: "CPUID Base Register"
```

## 位域结构

```yaml
fields:
  - name: mode
    bits: "3:1"
    desc: "工作模式"
```

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 必填 | 位域标识符，优先保留 datasheet 名称 |
| `bits` | quoted string | 必填 | `"7:4"`、`"0"`；非连续位域用 `"87:80,47:5"` |
| `desc` | string | 必填 | 含义、单位、公式、有效条件和跨寄存器拼接方式 |
| `access` | string | 可选 | 位域访问属性，如 `RO`、`RW`、`RW_SC` |
| `reset` | integer/numeric string | 可选 | 位域复位值，优先使用十六进制；超过 YAML/JavaScript 安全整数范围时用带 `0x`/`0b` 前缀的字符串 |
| `values` | mapping/list | 可选 | 结构化枚举 |
| `condition` | string | 可选 | 当前字段布局的 feature/状态条件；有条件的同位范围允许重叠 |
| `reserved` | string | 可选 | 官方保留语义，如 `RES0`、`RES1` |
| `reset_info` | string | 可选 | `AU`、条件复位或表达式等无法表示为单一整数的复位信息 |
| `access_rules` | list | 可选 | 条件访问列表，每项含 `access` 和可选 `condition` |
| `variable_length` | boolean | 可选 | 位域长度依赖实现参数 |
| `roles`、`event`、`target`、`action_hint`、`ignore_by_default` | mixed | 可选 | 与寄存器同名语义元数据 |

位域最高位必须小于 `bit_width`；省略 `bit_width` 时使用 `width * 8`。同一寄存器内的普通位域不应重叠。仅当两个字段都带明确 `condition` 时，允许表达 ARM feature 造成的条件重叠。非连续位域按从高到低列出，解码时按该顺序拼成连续字段值。

为已知但保留的位创建 `reserved7_4` 等字段，并在 `desc` 中写“保留”或资料中的写入要求。不要假设 reserved 位应写 0，除非资料明确说明。

## 枚举写法

优先使用 mapping：

```yaml
values:
  0x00: "待机"
  0x01: "正常工作"
  0x02: "低功耗"
```

需要为值附加更多可读信息时可使用 list：

```yaml
values:
  - value: 0x00
    desc: "待机"
  - value: 0x01
    desc: "正常工作"
```

也兼容将枚举逐行放入 `desc`：

```yaml
desc: "工作模式\n0x00 = 待机\n0x01 = 正常工作\n0x04~0x07 = 保留"
```

内联枚举行必须单独成行，格式为 `值 = 描述` 或 `起值~止值 = 描述`。优先使用 `0x` 前缀；裸数字在短位域中可能被解释为二进制。

schema v2 的 list 枚举还支持 ARM 官方 XML 使用的区间和二进制通配模式：

```yaml
values:
  - value: "0b0000..0b0111"
    desc: "数值区间"
  - value: "0b10xx"
    desc: "高两位为 10"
    condition: "When FEAT_EXAMPLE is implemented"
```

通配符仅支持 `0b` 后的 `0`、`1`、`x`。条件表达式本身不求值，只作为可检索说明展示。

## 特殊寄存器建模

多字节数据块：设置 `width` 和 `multi_byte: true`，说明字节序；如同时保留单字节条目，给双方添加 `alias_note`。前端展示时优先使用范围内已有的细粒度物理寄存器；若没有物理条目，则按字节对齐的 `fields` 运行时拆分显示。YAML 中仍应保留聚合定义，以供驱动读取和下游工具使用。

FIFO 或流式数据端口：设置 `no_dump: true` 和 `no_dump_reason`，说明正确读取流程。不要把连续读取次数误写为寄存器 `width`。

读清零状态：设置 `read_clear: true`，并在 `desc` 中说明清除条件。若只清除部分位，在对应位域描述中精确说明。

写命令寄存器：使用 `WO` 或 datasheet 指定的访问属性；用枚举列出命令值，并说明完成/确认协议。

分页寄存器：每个页分别建模。页切换寄存器本身仍放在 datasheet 指定的页面中，在页面 `desc` 说明切换顺序。

## 浏览器 YAML 子集

项目的 `yaml-lite.js` 不是完整 YAML 解析器。生成文件时遵守以下限制：

- 仅使用空格缩进，推荐每级 2 个空格；不要使用 Tab。
- 使用普通 mapping、list 和标量；允许 `[item1, item2]` 内联列表。
- 使用 `null`、`true`、`false`、十进制、十六进制和普通字符串。
- 将包含 `:`、`#`、换行转义或特殊符号的描述放进引号。
- 多行描述使用双引号内的 `\n`，不要使用 `|` 或 `>` 块字符串。
- 不要使用 `{key: value}` 内联对象、anchor、alias、tag、directive、复杂 key 或 `---` 多文档分隔符。
- 避免依赖 YAML 1.1 隐式类型，例如 `yes`、`no`、`on`、`off`。

应用导入时会自动执行严格 schema 和浏览器兼容性检查，不合规 YAML 不会写入芯片库。安装后的应用使用内置 Rust/JavaScript 校验器，不需要 Python 或 Node；制作 YAML 和 CI 时仍应运行独立脚本进行预检。两项检查都通过才算完成。

## 生成检查表

- 型号、资料名称和 revision 是否对应。
- WHO_AM_I 地址和值是否来自明确资料。
- 页面是否完整，页号和切页说明是否正确。
- 地址、名称、RO/RW/WO 和字节宽度是否逐项核对。
- 所有位域是否在范围内，是否存在意外重叠或遗漏。
- 枚举值是否适合位域宽度，单位和公式是否保留。
- 多字节数据的字节序、符号位和有效位是否说明。
- read-clear、write-one-to-clear、FIFO、命令端口等副作用是否说明。
- 未知信息是否明确标记，而不是推测补齐。
- 两个校验脚本和 `npm run data:build` 是否通过。

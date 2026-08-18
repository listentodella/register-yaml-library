# Register YAML Library

可复用的芯片与处理器寄存器 YAML 数据库，可直接导入 [Register Reference](https://github.com/listentodella/register-reference)，也可供代码生成器、文档工具和调试脚本使用。

## 目录分类

```text
architecture/
  arm/a-profile/          Arm AArch32/AArch64 架构系统寄存器
  arm/m-profile/          Arm Cortex-M 架构与系统寄存器
  riscv/rv32/             RISC-V RV32 架构 CSR
  riscv/rv64/             RISC-V RV64 架构 CSR
controllers/
  usb/rockchip/           Rockchip SoC 中的 USB 控制器
sensors/
  imu/bosch/              Bosch BMI 系列惯性测量单元
  imu/qst/                QST QMA/QMI 系列运动传感器
  imu/st/                 STMicroelectronics LSM6 系列惯性测量单元
  imu/tdk/                TDK InvenSense ICM 系列惯性测量单元
schema/                   YAML 格式说明
templates/                新数据文件模板
locales/                  按语言和源路径组织的翻译 sidecar
tools/                    目录生成与严格校验工具
catalog.json              机器可读的全库索引
```

分类固定采用“器件类型 / 接口或架构 / 厂商 / 系列”的层次。新增文件时应放入最具体的稳定分类，不以项目名称或贡献者名称建目录。

## 当前数据

### Arm A-profile

数据位于 [`architecture/arm/a-profile`](architecture/arm/a-profile)，由 Arm 官方 A-profile System Register XML 2026-06（Arm ARM revision M.c）生成。

| 执行状态 | 文件 |
| --- | --- |
| AArch64 | [`arm-aarch64-system-registers.yaml`](architecture/arm/a-profile/arm-aarch64-system-registers.yaml) |
| AArch32 | [`arm-aarch32-system-registers.yaml`](architecture/arm/a-profile/arm-aarch32-system-registers.yaml) |

文件保留官方包 URL、Arm 版权、专有许可标记和 `LES-PRE-20349` notice。仓库不分发原始 XML 压缩包。

### Arm Cortex-M

数据位于 [`architecture/arm/m-profile`](architecture/arm/m-profile)，来源为 Arm CMSIS-Core(M) 6.3.0。

| 架构 | 处理器与文件 |
| --- | --- |
| Armv6-M | [Cortex-M0](architecture/arm/m-profile/arm-cm0-system-registers.yaml)、[Cortex-M0+](architecture/arm/m-profile/arm-cm0plus-system-registers.yaml)、[Cortex-M1](architecture/arm/m-profile/arm-cm1-system-registers.yaml) |
| Armv7-M | [Cortex-M3](architecture/arm/m-profile/arm-cm3-system-registers.yaml) |
| Armv7E-M | [Cortex-M4](architecture/arm/m-profile/arm-cm4-system-registers.yaml)、[Cortex-M7](architecture/arm/m-profile/arm-cm7-system-registers.yaml) |
| Armv8-M Baseline | [Cortex-M23](architecture/arm/m-profile/arm-cm23-system-registers.yaml) |
| Armv8-M Mainline | [Cortex-M33](architecture/arm/m-profile/arm-cm33-system-registers.yaml)、[Cortex-M35P](architecture/arm/m-profile/arm-cm35p-system-registers.yaml) |
| Armv8.1-M Mainline | [Cortex-M52](architecture/arm/m-profile/arm-cm52-system-registers.yaml)、[Cortex-M55](architecture/arm/m-profile/arm-cm55-system-registers.yaml)、[Cortex-M85](architecture/arm/m-profile/arm-cm85-system-registers.yaml) |

### RISC-V 架构 CSR

数据位于 [`architecture/riscv`](architecture/riscv)，由公开的 [RISC-V Unified Database](https://github.com/riscv-software-src/riscv-unified-db) `spec/std/isa/csr` 生成。RV32 与 RV64 分开提供，保留 CSR 编号、扩展条件、动态访问和复位表达式；CSR 编号使用 `encoding.scheme: riscv_csr` 与 `encoding.address` 表达，不是 MMIO 地址。

| XLEN | 文件 |
| --- | --- |
| RV32 | [`riscv-rv32-csr.yaml`](architecture/riscv/rv32/riscv-rv32-csr.yaml) |
| RV64 | [`riscv-rv64-csr.yaml`](architecture/riscv/rv64/riscv-rv64-csr.yaml) |

### USB 控制器

| 厂商 / 平台 | 控制器 | 文件 |
| --- | --- | --- |
| Rockchip RK3588 | Synopsys DesignWare USB 3 DRD | [`rk3588-dwc3.yaml`](controllers/usb/rockchip/rk3588-dwc3.yaml) |

### QST 运动传感器

| 类型 | 系列 | 文件 |
| --- | --- | --- |
| 三轴加速度计 | QMA6100P | [`qma6100p.yaml`](sensors/imu/qst/qma6100p.yaml) |
| 三轴加速度计 | QMA6101T | [`qma6101t.yaml`](sensors/imu/qst/qma6101t.yaml) |
| 六轴惯性测量单元 | QMI8658A | [`qmi8658a.yaml`](sensors/imu/qst/qmi8658a.yaml) |
| 六轴惯性测量单元 | QMI8660 | [`qmi8660.yaml`](sensors/imu/qst/qmi8660.yaml) |

这些文件保留现有解析结果中的中文寄存器说明。数据来源、文档版本和许可状态记录在各文件的 `source` 字段及 [`NOTICE.md`](NOTICE.md) 中；仓库不分发原始厂商文档。

### Bosch 惯性测量单元

| 类型 | 系列 | 文件 |
| --- | --- | --- |
| 六轴惯性测量单元 | BMI323 | [`bmi323.yaml`](sensors/imu/bosch/bmi323.yaml) |

BMI323 使用 Bosch Sensortec BMI323 Datasheet BST-BMI323-DS000-11（文档修订 1.5，2025-03-27）。主寄存器页按 16 位字编址，扩展特性寄存器通过 `FEATURE_DATA_ADDR`、`FEATURE_DATA_TX` 和 `FEATURE_DATA_STATUS` 事务访问。来源与许可边界见 [`NOTICE.md`](NOTICE.md)。

### TDK InvenSense 惯性测量单元

| 类型 | 系列 | 文件 |
| --- | --- | --- |
| 六轴惯性测量单元 | ICM-42688-P | [`icm42688-p.yaml`](sensors/imu/tdk/icm42688-p.yaml) |

ICM-42688-P 使用 TDK InvenSense Datasheet DS-000347（修订 1.2，2020-04-19）。寄存器按 `REG_BANK_SEL` 分为用户 Bank 0、1、2 和 4；用户原始型号文字 `ICM24688` 对应手册中的真实型号 ICM-42688-P。

### STMicroelectronics 惯性测量单元

| 类型 | 系列 | 文件 |
| --- | --- | --- |
| 六轴惯性测量单元 | LSM6DSV | [`lsm6dsv.yaml`](sensors/imu/st/lsm6dsv.yaml) |

LSM6DSV 使用 STMicroelectronics Datasheet DS13476 Rev 5（2023-08），并用 ST 标准 C 驱动的位域定义交叉核对。文件分别建模主接口、辅助 SPI2、嵌入式功能、三个高级页和 Sensor Hub 寄存器页。

完整统计、来源版本、许可证和 SHA-256 位于 [`catalog.json`](catalog.json)。

## 使用

在 Register Reference 中点击“导入 YAML / 译文”，选择需要的寄存器文件即可。需要中文时，再选择对应的 `locales/zh-CN/<源路径>` sidecar；也可以在同一次文件选择中同时导入英文源与译文。应用会严格校验 `source_sha256` 和所有翻译选择器。其他程序可以读取 `catalog.json` 查找数据文件，并按 `schema_version` 选择解析策略。

克隆并验证整个数据仓库：

```bash
git clone https://github.com/listentodella/register-yaml-library.git
cd register-yaml-library
npm install
python3 -m pip install PyYAML
npm test
```

## 数据边界

- 只接收来源清楚、允许再分发且通过严格校验的数据。
- 不提交原始手册、受限数据包、保密资料或无法确认分发权限的派生文件。
- Arm A-profile YAML 是官方 XML 的生成派生数据；使用或再分发前应查阅文件中的 Arm 版权与 `LES-PRE-20349` 来源声明。
- YAML 中的 `source` 字段、文件头注释和目录 NOTICE 是来源与许可判断的依据。

格式与贡献要求见 [`schema/register-yaml-schema.md`](schema/register-yaml-schema.md) 和 [`CONTRIBUTING.md`](CONTRIBUTING.md)。翻译工作请先阅读 [`TRANSLATING.md`](TRANSLATING.md) 和 [`schema/register-yaml-translation-schema.md`](schema/register-yaml-translation-schema.md)。

## 许可

本仓库采用按内容来源区分的许可方式。工具与仓库自有文档使用 MIT；CMSIS 派生数据遵循 Apache-2.0；RISC-V Unified Database CSR 派生数据遵循 BSD-3-Clause-Clear；其他寄存器数据保留其来源说明。详见 [`LICENSE`](LICENSE)、[`LICENSES`](LICENSES) 与 [`NOTICE.md`](NOTICE.md)。

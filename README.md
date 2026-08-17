# Register YAML Library

可复用的芯片与处理器寄存器 YAML 数据库，可直接导入 [Register Reference](https://github.com/listentodella/register-reference)，也可供代码生成器、文档工具和调试脚本使用。

## 目录分类

```text
architecture/
  arm/m-profile/          Arm Cortex-M 架构与系统寄存器
controllers/
  usb/rockchip/           Rockchip SoC 中的 USB 控制器
schema/                   YAML 格式说明
templates/                新数据文件模板
tools/                    目录生成与严格校验工具
catalog.json              机器可读的全库索引
```

分类固定采用“器件类型 / 接口或架构 / 厂商 / 系列”的层次。新增文件时应放入最具体的稳定分类，不以项目名称或贡献者名称建目录。

## 当前数据

### Arm Cortex-M

数据位于 [`architecture/arm/m-profile`](architecture/arm/m-profile)，来源为 Arm CMSIS-Core(M) 6.3.0。

| 架构 | 处理器 |
| --- | --- |
| Armv6-M | Cortex-M0、Cortex-M0+、Cortex-M1 |
| Armv7-M | Cortex-M3 |
| Armv7E-M | Cortex-M4、Cortex-M7 |
| Armv8-M Baseline | Cortex-M23 |
| Armv8-M Mainline | Cortex-M33、Cortex-M35P |
| Armv8.1-M Mainline | Cortex-M52、Cortex-M55、Cortex-M85 |

### USB 控制器

| 厂商 / 平台 | 控制器 | 文件 |
| --- | --- | --- |
| Rockchip RK3588 | Synopsys DesignWare USB 3 DRD | [`rk3588-dwc3.yaml`](controllers/usb/rockchip/rk3588-dwc3.yaml) |

完整统计、来源版本、许可证和 SHA-256 位于 [`catalog.json`](catalog.json)。

## 使用

在 Register Reference 中点击“导入 YAML”，选择需要的文件即可。其他程序可以读取 `catalog.json` 查找数据文件，并按 `schema_version` 选择解析策略。

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
- Arm A-profile 专有 XML 的完整派生数据不在本仓库分发。
- YAML 中的 `source` 字段、文件头注释和目录 NOTICE 是来源与许可判断的依据。

格式与贡献要求见 [`schema/register-yaml-schema.md`](schema/register-yaml-schema.md) 和 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

## 许可

本仓库采用按内容来源区分的许可方式。工具与仓库自有文档使用 MIT；CMSIS 派生数据遵循 Apache-2.0；其他寄存器数据保留其来源说明。详见 [`LICENSE`](LICENSE) 与 [`NOTICE.md`](NOTICE.md)。

# 贡献寄存器数据

## 放置位置

根据数据的固有属性选择目录：

- `architecture/<vendor>/<profile>/`：处理器架构与系统寄存器
- `controllers/<interface>/<vendor>/`：USB、PCIe、Ethernet 等控制器
- `sensors/<type>/<vendor>/`：IMU、磁力计、环境传感器等独立器件
- `soc/<vendor>/<family>/`：无法归入独立控制器的 SoC 寄存器块

文件名使用小写型号和连字符，例如 `cortex-m52.yaml`、`rk3588-dwc3.yaml`。不要在仓库根目录放置数据 YAML。

## 来源与许可

1. 优先使用厂商官方 datasheet、reference manual、SVD、CMSIS 或公开头文件。
2. 在 YAML 的 `source` 字段或文件头注释中记录文档、版本、URL 和许可。
3. 不提交原始 PDF、压缩包、XML 或厂商工具安装文件。
4. 不提交保密资料、内部文件、来源不明的抓取内容，或明确禁止再分发的数据。
5. 不根据相邻型号或经验猜测缺失位域；未知内容应明确保留为空或标注资料缺失。

## 数据要求

- 遵循 [`schema/register-yaml-schema.md`](schema/register-yaml-schema.md)。
- MMIO 数据使用 `schema_version: 1`；架构系统寄存器使用 `schema_version: 2`。
- `width` 表示物理字节数，`bit_width` 表示有效位数。
- 保留 reserved 位、访问属性、复位值、枚举、字节序及读清零等副作用。
- 同一页按地址递增；同地址别名相邻，并用 `alias_note` 说明。
- 仅使用浏览器解析器支持的 YAML 子集，不使用锚点、标签、块字符串或内联对象。

## 本地检查

```bash
npm install
python3 -m pip install PyYAML
npm run catalog
npm test
```

`npm run catalog` 会更新机器可读索引。提交前，`catalog.json` 必须与数据文件一致，结构校验不得出现错误或警告。

# RISC-V Architectural CSRs

本目录包含从公开的 [RISC-V Unified Database](https://github.com/riscv-software-src/riscv-unified-db) 生成的架构 CSR YAML。

## 数据集

| XLEN | 路径 | 寄存器 | 字段 |
| --- | --- | ---: | ---: |
| RV32 | `rv32/riscv-rv32-csr.yaml` | 396 | 1010 |
| RV64 | `rv64/riscv-rv64-csr.yaml` | 281 | 974 |

来源快照：

- 日期：`2026-08-18`
- Git commit：`22776b219c386d549e07b14ed0e781ae7956e11a`
- 输入：`spec/std/isa/csr/**/*.yaml`
- 许可：`BSD-3-Clause-Clear`

RV32 数量更大是正常现象：Unified Database 将 `mcycleh`、`minstreth`、`mhpmcounter*h`、状态/环境配置高半等 RV32 高半 CSR 建模为独立条目，这些条目在 RV64 下不存在。

## 数据模型

- `register_space.kind: riscv_system`
- `register_space.architecture: RV32` 或 `RV64`
- `encoding.scheme: riscv_csr`
- `encoding.address`: 12-bit CSR 编号，不是 MMIO 地址

无法静态求值的访问类型、复位值、实现参数和受限写入表达式会原样保留在扩展元数据中。使用者不能把这些表达式误解为已经针对某个具体 hart 配置求值的结果。

## 更新

生成器位于 Register Reference 仓库的 `tools/import-riscv-csr.mjs`。更新 Unified Database 快照时必须同时更新两份 YAML、此处统计、根目录 `NOTICE.md` 和 `catalog.json`，并运行两边仓库的完整测试。

# Data Notices

## Arm A-profile

`architecture/arm/a-profile/*.yaml` 由 Arm 官方 A-profile System Register XML 2026-06（Arm ARM revision M.c）生成。原始数据包来源：

<https://developer.arm.com/-/cdn-downloads/permalink/Exploration-Tools-Arm-Architecture-System-Registers/SysReg/SysReg_xml_A_profile-2026-06_mc.tar.gz>

Copyright (c) 2010-2026 Arm Limited (or its affiliates). All rights reserved.

源数据包标记为 Arm proprietary，notice 标识为 `LES-PRE-20349`。本仓库保留来源、版权与许可标记，不分发原始 XML 或压缩包。文件使用者应自行确认其使用和再分发符合 Arm notice。

## Arm Cortex-M

`architecture/arm/m-profile/*.yaml` 根据 Arm CMSIS-Core(M) 6.3.0 头文件生成。CMSIS_6 来源：

<https://github.com/ARM-software/CMSIS_6>

这些文件保留 `source.license: Apache-2.0`、版本和 Arm 来源说明。Apache-2.0 全文位于 `LICENSES/Apache-2.0.txt`。Arm、Cortex 和 CMSIS 是其各自权利人的商标。

## Rockchip RK3588 DWC3

`controllers/usb/rockchip/rk3588-dwc3.yaml` 中的寄存器事实整理自 RK3588 TRM Part 2 Chapter 13 的 USB3 Controller 表格。仓库不分发原始手册，也不授予对 Rockchip 或 Synopsys 文档、商标及实现的额外权利。

## QST QMA/QMI Sensors

`sensors/imu/qst/*.yaml` 整理自 QST QMA/QMI 系列厂商文档。其中 QMA6100P 使用 application note v02(1)，QMA6101T 使用 Preliminary Datasheet Rev D（QST-PD-B002-22）；QMI8658A 的公开产品页为 <https://www.qstcorp.com/imu_prod/QMI8658>，QMI8660 解析源未记录公开版本号。

本仓库只提供人工整理的寄存器事实和说明，不分发原始 PDF。QST 厂商文档未在现有资料中声明开源许可或明确的再分发条款，因此这些 YAML 不按仓库的 MIT 许可授权；使用者应自行确认其使用和再分发符合原始文档条款。QST、QMA 和 QMI 是其各自权利人的名称或商标。

## Bosch BMI323 Sensor

`sensors/imu/bosch/bmi323.yaml` 整理自 Bosch Sensortec BMI323 Datasheet，文档号 `BST-BMI323-DS000-11`，文档修订 1.5，发布日期 2025-03-27。产品页：<https://www.bosch-sensortec.com/products/motion-sensors/imus/bmi323/>。

本仓库不分发原始 PDF，只提供寄存器地址、访问属性、复位值和位域等事实的结构化整理。Bosch Sensortec 文档未在现有资料中声明开源许可证或明确的再分发条款，因此该 YAML 不按仓库的 MIT 许可授权；使用者应自行确认其使用和再分发符合原始文档条款。Bosch、Bosch Sensortec 和 BMI323 是其各自权利人的名称或商标。

## RISC-V Unified Database CSR

`architecture/riscv/rv32/riscv-rv32-csr.yaml` 和 `architecture/riscv/rv64/riscv-rv64-csr.yaml` 由 RISC-V Unified Database 的 `spec/std/isa/csr` 目录生成。

来源：<https://github.com/riscv-software-src/riscv-unified-db>

生成所依据的提交为 `22776b219c386d549e07b14ed0e781ae7956e11a`（2026-08-18）。全部 396 个 CSR 源 YAML 都标注 `BSD-3-Clause-Clear`。源文件中的版权声明包括 Qualcomm Technologies, Inc. and/or its subsidiaries、Katherine Hsu、Muhammad Abdullah - 10xEngineers、Salil Mittal 和 Syed Owais Ali Shah；生成文件通过 `source_ref` 保留逐条来源路径。本批数据不包含 `data/arch_overlay` 下的 CC-BY-4.0 文档导入内容。

## Repository Tools And Documentation

`tools/`、仓库维护脚本及本仓库原创文档按 MIT 许可提供，全文位于 `LICENSES/MIT.txt`。该许可不覆盖具有独立来源声明的 YAML 数据。

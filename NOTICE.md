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

## Repository Tools And Documentation

`tools/`、仓库维护脚本及本仓库原创文档按 MIT 许可提供，全文位于 `LICENSES/MIT.txt`。该许可不覆盖具有独立来源声明的 YAML 数据。

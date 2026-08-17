# Arm Cortex-M System Registers

本目录数据由 Arm CMSIS-Core(M) 6.3.0 的 `core_cm*.h` 和 `m-profile/cmsis_gcc_m.h` 生成，包含 MRS/MSR 特殊寄存器以及 SCS、CoreSight 等真实 MMIO 寄存器。

- 来源：<https://github.com/ARM-software/CMSIS_6>
- 许可证：Apache-2.0
- `source_ref`：指向生成时使用的 CMSIS 头文件符号
- `register_space.kind`：`arm_system`

CMSIS 未提供完整位域宏的少量特殊寄存器，只保留生成器中明确记录的稳定 M-profile 架构语义，不根据处理器型号猜测扩展。

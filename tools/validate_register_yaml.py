#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    print("ERROR: 缺少 PyYAML，请安装后重试：python3 -m pip install PyYAML", file=sys.stderr)
    raise SystemExit(2)


BIT_RANGE_RE = re.compile(r"^(\d+)(?::(\d+))?$")
KNOWN_ACCESS = {"RO", "RW", "WO"}
TOP_KEYS = {
    "schema_version", "sensor", "vendor", "family", "device_type", "register_space", "source", "who_am_i", "pages",
}
REGISTER_SPACE_KEYS = {"kind", "architecture", "profile"}
SOURCE_KEYS = {"title", "version", "revision", "document", "url", "license", "notice"}
WHO_KEYS = {"reg", "values"}
WHO_VALUE_KEYS = {"value", "desc"}
PAGE_KEYS = {"page_id", "address_unit_bits", "access", "desc", "registers"}
REGISTER_KEYS = {
    "addr", "name", "access", "width", "bit_width", "address_span", "byte_order",
    "reset", "desc", "fields", "multi_byte",
    "read_clear", "no_dump", "no_dump_reason", "alias_note", "roles",
    "event", "target", "action_hint", "ignore_by_default", "encoding", "accessors",
    "execution_state", "condition", "groups", "aliases", "variables", "source_ref",
}
FIELD_KEYS = {
    "name", "bits", "access", "reset", "desc", "values", "roles", "event", "target",
    "action_hint", "ignore_by_default", "condition", "reserved", "reset_info", "access_rules", "variable_length",
}
ENCODING_KEYS = {"scheme", "op0", "op1", "crn", "crm", "crd", "op2", "coproc", "opc1", "opc2", "r", "m", "m1", "reg", "selector"}
ACCESSOR_KEYS = {"name", "kind", "instruction", "condition", "encoding"}
VARIABLE_KEYS = {"name", "min", "max", "values"}
ACCESS_RULE_KEYS = {"access", "condition"}
ENUM_VALUE_KEYS = {"value", "desc", "name", "condition"}
SYSTEM_ENCODING_SCHEMES = {
    "aarch64_sysreg", "aarch64_special", "aarch32_cp15", "aarch32_coproc", "aarch32_special", "aarch32_vfp",
    "m_profile_special",
}


class UniqueKeyLoader(yaml.SafeLoader):
    pass


def construct_unique_mapping(loader: UniqueKeyLoader, node: yaml.MappingNode, deep: bool = False) -> dict[Any, Any]:
    mapping: dict[Any, Any] = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        try:
            duplicate = key in mapping
        except TypeError as exc:
            raise yaml.constructor.ConstructorError(
                "while constructing a mapping",
                node.start_mark,
                "found an unhashable key",
                key_node.start_mark,
            ) from exc
        if duplicate:
            raise yaml.constructor.ConstructorError(
                "while constructing a mapping",
                node.start_mark,
                f"found duplicate key {key!r}",
                key_node.start_mark,
            )
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping


UniqueKeyLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG,
    construct_unique_mapping,
)


@dataclass
class Report:
    path: Path
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    pages: int = 0
    registers: int = 0
    fields: int = 0

    def error(self, location: str, message: str) -> None:
        self.errors.append(f"{location}: {message}")

    def warn(self, location: str, message: str) -> None:
        self.warnings.append(f"{location}: {message}")


def is_integer(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def require_mapping(report: Report, value: Any, location: str) -> dict[Any, Any] | None:
    if not isinstance(value, dict):
        report.error(location, "必须是 mapping/object")
        return None
    return value


def require_list(report: Report, value: Any, location: str) -> list[Any] | None:
    if not isinstance(value, list):
        report.error(location, "必须是 list/array")
        return None
    return value


def require_string(report: Report, value: Any, location: str) -> bool:
    if not isinstance(value, str) or not value.strip():
        report.error(location, "必须是非空字符串")
        return False
    return True


def warn_unknown_keys(report: Report, value: dict[Any, Any], allowed: set[str], location: str) -> None:
    for key in value:
        if not isinstance(key, str) or key not in allowed:
            report.warn(location, f"未知字段 {key!r}，请确认不是拼写错误")


def parse_enum_value(value: Any) -> int | None:
    if is_integer(value):
        return value
    if isinstance(value, str):
        try:
            return int(value, 0)
        except ValueError:
            return None
    return None


def validate_enum_value(report: Report, value: Any, bit_width: int, location: str) -> str | None:
    parsed = parse_enum_value(value)
    if parsed is not None:
        if parsed < 0 or parsed >= (1 << bit_width):
            report.error(location, f"枚举值 {value!r} 超出 {bit_width} bit 范围")
        return f"exact:{parsed}"
    if isinstance(value, str):
        text = value.strip()
        pattern = re.fullmatch(r"0[bB]([01xX]+)", text)
        if pattern and "x" in pattern.group(1).lower():
            if len(pattern.group(1)) > bit_width:
                report.error(location, f"枚举模式 {value!r} 超出 {bit_width} bit 范围")
            return f"pattern:{pattern.group(1).lower()}"
        parts = text.split("..")
        if len(parts) == 2:
            start = parse_enum_value(parts[0])
            end = parse_enum_value(parts[1])
            if start is None or end is None or start < 0 or start > end:
                report.error(location, "枚举区间必须是由 .. 连接的递增非负整数")
                return None
            if end >= (1 << bit_width):
                report.error(location, f"枚举值 {value!r} 超出 {bit_width} bit 范围")
            return f"range:{start}:{end}"
    report.error(location, "枚举值必须是整数、数字字符串、二进制通配模式或数值区间")
    return None


def parse_bit_ranges(report: Report, value: Any, bit_width: int, location: str) -> list[tuple[int, int]] | None:
    if not isinstance(value, str):
        report.error(location, '必须是带引号的字符串，例如 "7:0" 或 "87:80,47:5"')
        return None
    ranges: list[tuple[int, int]] = []
    for token in value.split(","):
        match = BIT_RANGE_RE.fullmatch(token.strip())
        if not match:
            report.error(location, "格式必须是 hi:lo、单个 bit，或由逗号分隔的多个范围")
            return None
        hi = int(match.group(1))
        lo = int(match.group(2) if match.group(2) is not None else match.group(1))
        if hi < lo:
            report.error(location, "最高位 hi 不能小于最低位 lo")
            return None
        if hi >= bit_width:
            report.error(location, f"bit {hi} 超出寄存器有效位宽 {bit_width}")
            return None
        if any(max(lo, other_lo) <= min(hi, other_hi) for other_hi, other_lo in ranges):
            report.error(location, "同一位域的多个 bit 范围不能互相重叠")
            return None
        ranges.append((hi, lo))
    return ranges or None


def validate_encoding(report: Report, value: Any, location: str) -> None:
    encoding = require_mapping(report, value, location)
    if encoding is None:
        return
    warn_unknown_keys(report, encoding, ENCODING_KEYS, location)
    if encoding.get("scheme") not in SYSTEM_ENCODING_SCHEMES:
        report.error(f"{location}.scheme", f"必须是 {'、'.join(sorted(SYSTEM_ENCODING_SCHEMES))} 之一")
    fields = [(key, item) for key, item in encoding.items() if key != "scheme"]
    if not fields:
        report.error(location, "至少需要一个编码字段")
    for key, item in fields:
        if not ((is_integer(item) and item >= 0) or (isinstance(item, str) and item.strip())):
            report.error(f"{location}.{key}", "必须是非负整数或非空编码表达式")


def validate_accessors(report: Report, value: Any, location: str) -> None:
    accessors = require_list(report, value, location)
    if accessors is None:
        return
    if not accessors:
        report.error(location, "至少需要一个访问方式")
    for index, item in enumerate(accessors):
        item_location = f"{location}[{index}]"
        accessor = require_mapping(report, item, item_location)
        if accessor is None:
            continue
        warn_unknown_keys(report, accessor, ACCESSOR_KEYS, item_location)
        require_string(report, accessor.get("name"), f"{item_location}.name")
        if require_string(report, accessor.get("kind"), f"{item_location}.kind") and accessor["kind"] not in {"read", "write", "implicit"}:
            report.error(f"{item_location}.kind", "必须是 read、write 或 implicit")
        require_string(report, accessor.get("instruction"), f"{item_location}.instruction")
        if "condition" in accessor:
            require_string(report, accessor["condition"], f"{item_location}.condition")
        validate_encoding(report, accessor.get("encoding"), f"{item_location}.encoding")


def validate_variables(report: Report, value: Any, location: str) -> None:
    variables = require_list(report, value, location)
    if variables is None:
        return
    for index, item in enumerate(variables):
        item_location = f"{location}[{index}]"
        variable = require_mapping(report, item, item_location)
        if variable is None:
            continue
        warn_unknown_keys(report, variable, VARIABLE_KEYS, item_location)
        require_string(report, variable.get("name"), f"{item_location}.name")
        for key in ("min", "max"):
            if key in variable and not is_integer(variable[key]):
                report.error(f"{item_location}.{key}", "必须是整数")
        if "values" in variable:
            values = require_list(report, variable["values"], f"{item_location}.values")
            for value_index, entry in enumerate(values or []):
                if not (is_integer(entry) or (isinstance(entry, str) and entry.strip())):
                    report.error(f"{item_location}.values[{value_index}]", "必须是整数或非空字符串")


def validate_access_rules(report: Report, value: Any, location: str) -> None:
    rules = require_list(report, value, location)
    if rules is None:
        return
    for index, item in enumerate(rules):
        item_location = f"{location}[{index}]"
        rule = require_mapping(report, item, item_location)
        if rule is None:
            continue
        warn_unknown_keys(report, rule, ACCESS_RULE_KEYS, item_location)
        require_string(report, rule.get("access"), f"{item_location}.access")
        if "condition" in rule:
            require_string(report, rule["condition"], f"{item_location}.condition")


def validate_values(report: Report, values: Any, bit_width: int, location: str) -> None:
    if isinstance(values, dict):
        for key, desc in values.items():
            validate_enum_value(report, key, bit_width, f"{location}.{key}")
            require_string(report, desc, f"{location}.{key}")
        return

    items = require_list(report, values, location)
    if items is None:
        return
    seen: set[str] = set()
    for index, item in enumerate(items):
        item_location = f"{location}[{index}]"
        item_map = require_mapping(report, item, item_location)
        if item_map is None:
            continue
        warn_unknown_keys(report, item_map, ENUM_VALUE_KEYS, item_location)
        if "value" not in item_map:
            report.error(item_location, "缺少 value")
        else:
            parsed = validate_enum_value(report, item_map["value"], bit_width, f"{item_location}.value")
            if parsed is not None and parsed in seen:
                report.warn(item_location, f"枚举值 {item_map['value']!r} 重复")
            if parsed is not None:
                seen.add(parsed)
        if "desc" in item_map:
            require_string(report, item_map["desc"], f"{item_location}.desc")
        elif "name" in item_map:
            require_string(report, item_map["name"], f"{item_location}.name")
        else:
            report.error(item_location, "缺少 desc 或 name")
        if "condition" in item_map:
            require_string(report, item_map["condition"], f"{item_location}.condition")


def validate_field(report: Report, item: Any, reg_bit_width: int, location: str) -> dict[str, Any] | None:
    field_map = require_mapping(report, item, location)
    if field_map is None:
        return None
    warn_unknown_keys(report, field_map, FIELD_KEYS, location)
    require_string(report, field_map.get("name"), f"{location}.name")
    require_string(report, field_map.get("desc"), f"{location}.desc")

    ranges = parse_bit_ranges(report, field_map.get("bits"), reg_bit_width, f"{location}.bits")
    if ranges is None:
        return None

    if "access" in field_map:
        require_string(report, field_map["access"], f"{location}.access")
    if "condition" in field_map:
        require_string(report, field_map["condition"], f"{location}.condition")
    if "reserved" in field_map:
        require_string(report, field_map["reserved"], f"{location}.reserved")
    if "reset_info" in field_map:
        require_string(report, field_map["reset_info"], f"{location}.reset_info")
    if "variable_length" in field_map and not isinstance(field_map["variable_length"], bool):
        report.error(f"{location}.variable_length", "必须是布尔值")
    if "access_rules" in field_map:
        validate_access_rules(report, field_map["access_rules"], f"{location}.access_rules")
    field_width = sum(hi - lo + 1 for hi, lo in ranges)
    if "reset" in field_map:
        reset = parse_enum_value(field_map["reset"])
        if reset is None or reset < 0 or reset >= (1 << field_width):
            report.error(f"{location}.reset", f"必须是 {field_width} bit 范围内的非负整数")

    if "values" in field_map:
        validate_values(report, field_map["values"], field_width, f"{location}.values")
    return {
        "hi": max(hi for hi, _ in ranges),
        "lo": min(lo for _, lo in ranges),
        "ranges": ranges,
        "condition": field_map.get("condition", "").strip() if isinstance(field_map.get("condition"), str) else "",
    }


def validate_register(
    report: Report,
    item: Any,
    page_name: str,
    index: int,
    is_system: bool = False,
    allows_system_mmio: bool = False,
) -> dict[str, Any] | None:
    location = f"pages.{page_name}.registers[{index}]"
    reg = require_mapping(report, item, location)
    if reg is None:
        return None
    warn_unknown_keys(report, reg, REGISTER_KEYS, location)

    addr = reg.get("addr")
    is_system_mmio = is_system and allows_system_mmio and is_integer(addr) and addr >= 0
    if is_system:
        if "addr" in reg and not allows_system_mmio:
            report.error(f"{location}.addr", "A-profile arm_system 寄存器不能使用 MMIO 地址")
        if "addr" in reg and allows_system_mmio and not is_system_mmio:
            report.error(f"{location}.addr", "M-profile MMIO 地址必须是非负整数")
        if not is_system_mmio:
            validate_encoding(report, reg.get("encoding"), f"{location}.encoding")
            validate_accessors(report, reg.get("accessors"), f"{location}.accessors")
        if "execution_state" in reg:
            require_string(report, reg["execution_state"], f"{location}.execution_state")
        if "condition" in reg:
            require_string(report, reg["condition"], f"{location}.condition")
        for key in ("groups", "aliases"):
            if key in reg:
                values = require_list(report, reg[key], f"{location}.{key}")
                for item_index, value in enumerate(values or []):
                    require_string(report, value, f"{location}.{key}[{item_index}]")
        if "variables" in reg:
            validate_variables(report, reg["variables"], f"{location}.variables")
        if "source_ref" in reg:
            require_string(report, reg["source_ref"], f"{location}.source_ref")
    elif not is_integer(addr) or addr < 0:
        report.error(f"{location}.addr", "必须是非负整数")
    require_string(report, reg.get("name"), f"{location}.name")
    access_ok = require_string(report, reg.get("access"), f"{location}.access")
    if access_ok and reg["access"] not in KNOWN_ACCESS:
        report.warn(f"{location}.access", f"非常用访问属性 {reg['access']!r}，建议使用 RO/RW/WO")
    require_string(report, reg.get("desc"), f"{location}.desc")

    width = reg.get("width")
    if not is_integer(width) or width < 1:
        report.error(f"{location}.width", "必须是正整数字节数")
        width = 1
    bit_width = reg.get("bit_width", width * 8)
    if not is_integer(bit_width) or bit_width < 1:
        report.error(f"{location}.bit_width", "必须是正整数")
        bit_width = width * 8
    elif bit_width > width * 8:
        report.error(f"{location}.bit_width", f"不能超过 width={width} 对应的 {width * 8} bit")

    address_span = reg.get("address_span", width)
    if is_system and not is_system_mmio and "address_span" in reg:
        report.error(f"{location}.address_span", "非 MMIO arm_system 寄存器不能声明地址跨度")
    elif not is_integer(address_span) or address_span < 1:
        report.error(f"{location}.address_span", "必须是正整数")

    if is_system and not is_system_mmio and "byte_order" in reg:
        report.error(f"{location}.byte_order", "非 MMIO arm_system 寄存器不能声明字节序")
    if "byte_order" in reg and reg["byte_order"] not in {"little", "big"}:
        report.error(f"{location}.byte_order", "必须是 little 或 big")
    if "reset" in reg:
        reset = parse_enum_value(reg["reset"])
        if reset is None or reset < 0 or reset >= (1 << bit_width):
            report.error(f"{location}.reset", f"必须是 {bit_width} bit 范围内的非负整数")

    fields = reg.get("fields")
    if fields is not None:
        field_items = require_list(report, fields, f"{location}.fields")
        if field_items is not None:
            ranges: list[dict[str, Any]] = []
            names: set[str] = set()
            reset_mask = 0
            reset_value = 0
            for field_index, field_item in enumerate(field_items):
                field_location = f"{location}.fields[{field_index}]"
                bit_range = validate_field(report, field_item, bit_width, field_location)
                report.fields += 1
                if (
                    isinstance(field_item, dict)
                    and isinstance(field_item.get("name"), str)
                    and not field_item.get("reserved")
                    and not re.fullmatch(r"RES(?:ERVED)?\d*", field_item["name"], re.IGNORECASE)
                ):
                    field_name = f"{field_item['name']}\0{str(field_item.get('condition', '')).strip()}"
                    if field_name in names:
                        report.warn(field_location, f"位域名 {field_item['name']!r} 在相同条件下重复")
                    names.add(field_name)
                if bit_range is not None:
                    for other in ranges:
                        overlaps = any(
                            max(lo, other_lo) <= min(hi, other_hi)
                            for hi, lo in bit_range["ranges"]
                            for other_hi, other_lo in other["ranges"]
                        )
                        if overlaps and not bit_range["condition"] and not other["condition"]:
                            report.warn(field_location, f"位域与 {other['location']} 重叠")
                    ranges.append({**bit_range, "location": field_location})
                    field_reset = parse_enum_value(field_item.get("reset")) if isinstance(field_item, dict) else None
                    if field_reset is not None and field_reset >= 0:
                        remaining = field_reset
                        for hi, lo in reversed(bit_range["ranges"]):
                            part_width = hi - lo + 1
                            part_value_mask = (1 << part_width) - 1
                            physical_mask = part_value_mask << lo
                            reset_mask |= physical_mask
                            reset_value = (reset_value & ~physical_mask) | ((remaining & part_value_mask) << lo)
                            remaining >>= part_width

            register_reset = parse_enum_value(reg.get("reset"))
            if register_reset is not None and register_reset >= 0 and reset_mask:
                mismatched = (register_reset ^ reset_value) & reset_mask
                if mismatched:
                    report.error(
                        f"{location}.reset",
                        f"与位域复位值不一致，差异位掩码为 {mismatched:#x}",
                    )

    report.registers += 1
    return reg


def validate_who_am_i(report: Report, value: Any) -> int | None:
    location = "who_am_i"
    who = require_mapping(report, value, location)
    if who is None:
        return None
    warn_unknown_keys(report, who, WHO_KEYS, location)
    if "reg" not in who:
        report.error("who_am_i.reg", "缺少 reg；未知时应填写 null")
    reg = who.get("reg")
    if reg is not None and (not is_integer(reg) or reg < 0):
        report.error("who_am_i.reg", "必须是非负整数或 null")
        reg = None
    values = require_list(report, who.get("values"), "who_am_i.values")
    if values is not None:
        seen: set[int] = set()
        for index, item in enumerate(values):
            item_location = f"who_am_i.values[{index}]"
            item_map = require_mapping(report, item, item_location)
            if item_map is None:
                continue
            warn_unknown_keys(report, item_map, WHO_VALUE_KEYS, item_location)
            if "value" not in item_map or not is_integer(item_map.get("value")):
                report.error(f"{item_location}.value", "必须是整数")
            else:
                enum_value = item_map["value"]
                if enum_value < 0:
                    report.error(f"{item_location}.value", "不能为负数")
                if enum_value in seen:
                    report.warn(item_location, f"WHO_AM_I 值 {enum_value:#x} 重复")
                seen.add(enum_value)
            require_string(report, item_map.get("desc"), f"{item_location}.desc")
    return reg


def validate_document(path: Path) -> Report:
    report = Report(path=path)
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        report.error("file", f"无法按 UTF-8 读取：{exc}")
        return report
    if "\t" in text:
        report.error("file", "包含 Tab；浏览器解析器只接受空格缩进")

    try:
        data = yaml.load(text, Loader=UniqueKeyLoader)
    except yaml.YAMLError as exc:
        report.error("file", f"YAML 解析失败：{exc}")
        return report

    root = require_mapping(report, data, "root")
    if root is None:
        return report
    warn_unknown_keys(report, root, TOP_KEYS, "root")
    if "schema_version" in root and (not is_integer(root["schema_version"]) or root["schema_version"] < 1):
        report.error("schema_version", "必须是正整数")
    require_string(report, root.get("sensor"), "sensor")
    for metadata_key in ("vendor", "family", "device_type"):
        if metadata_key in root:
            require_string(report, root[metadata_key], metadata_key)

    register_space_kind = "mmio"
    if "register_space" in root:
        register_space = require_mapping(report, root["register_space"], "register_space")
        if register_space is not None:
            warn_unknown_keys(report, register_space, REGISTER_SPACE_KEYS, "register_space")
            kind_ok = require_string(report, register_space.get("kind"), "register_space.kind")
            if kind_ok and register_space["kind"] not in {"mmio", "arm_system"}:
                report.error("register_space.kind", "必须是 mmio 或 arm_system")
            elif kind_ok:
                register_space_kind = register_space["kind"]
            for key in ("architecture", "profile"):
                if key in register_space:
                    require_string(report, register_space[key], f"register_space.{key}")
    is_system = register_space_kind == "arm_system"
    allows_system_mmio = is_system and isinstance(root.get("register_space"), dict) and root["register_space"].get("profile") == "M"
    if is_system and (not is_integer(root.get("schema_version")) or root["schema_version"] < 2):
        report.error("schema_version", "arm_system 需要 schema_version: 2 或更高版本")
    if "source" in root:
        source = require_mapping(report, root["source"], "source")
        if source is not None:
            warn_unknown_keys(report, source, SOURCE_KEYS, "source")
            for key, value in source.items():
                require_string(report, value, f"source.{key}")
    elif is_system:
        report.error("source", "arm_system 数据必须记录官方来源和版本")

    if is_system and "who_am_i" in root:
        report.error("who_am_i", "arm_system 数据不使用 MMIO WHO_AM_I")
        who_reg = None
    elif not is_system and "who_am_i" not in root:
        report.warn("root", "缺少 who_am_i；未知时也建议显式写 reg: null 和 values: []")
        who_reg = None
    elif not is_system:
        who_reg = validate_who_am_i(report, root["who_am_i"])
    else:
        who_reg = None

    pages = require_mapping(report, root.get("pages"), "pages")
    if pages is None:
        return report
    if not pages:
        report.error("pages", "至少需要一个页面")
        return report

    page_ids: dict[int, str] = {}
    all_addresses: set[int] = set()
    for page_name, page_value in pages.items():
        page_location = f"pages.{page_name}"
        if not isinstance(page_name, str) or not page_name.strip():
            report.error("pages", "页面名必须是非空字符串")
        page = require_mapping(report, page_value, page_location)
        if page is None:
            continue
        report.pages += 1
        warn_unknown_keys(report, page, PAGE_KEYS, page_location)
        page_id = page.get("page_id")
        if is_system and "page_id" in page:
            report.error(f"{page_location}.page_id", "arm_system 分类页不能使用 MMIO page_id")
        elif not is_system and (not is_integer(page_id) or page_id < 0):
            report.error(f"{page_location}.page_id", "必须是非负整数")
        elif not is_system and page_id in page_ids:
            report.warn(f"{page_location}.page_id", f"与页面 {page_ids[page_id]!r} 使用相同 page_id")
        elif not is_system:
            page_ids[page_id] = str(page_name)
        require_string(report, page.get("access"), f"{page_location}.access")
        require_string(report, page.get("desc"), f"{page_location}.desc")
        if "address_unit_bits" in page and (
            not is_integer(page["address_unit_bits"]) or page["address_unit_bits"] < 1
        ):
            report.error(f"{page_location}.address_unit_bits", "必须是正整数")

        registers = require_list(report, page.get("registers"), f"{page_location}.registers")
        if registers is None:
            continue
        intervals: list[tuple[int, int, dict[str, Any], str]] = []
        names: set[str] = set()
        previous_addr = -1
        for index, register_item in enumerate(registers):
            reg = validate_register(report, register_item, str(page_name), index, is_system, allows_system_mmio)
            if reg is None:
                continue
            location = f"{page_location}.registers[{index}]"
            addr = reg.get("addr")
            width = reg.get("width")
            address_span = reg.get("address_span", width)
            name = reg.get("name")
            if isinstance(name, str):
                if name in names:
                    report.warn(location, f"寄存器名 {name!r} 在页面内重复")
                names.add(name)
            if is_system:
                continue
            if (
                not is_integer(addr) or addr < 0
                or not is_integer(width) or width < 1
                or not is_integer(address_span) or address_span < 1
            ):
                continue
            all_addresses.update(range(addr, addr + address_span))
            end = addr + address_span - 1
            overlaps_existing = any(
                max(addr, other_start) <= min(end, other_end)
                for other_start, other_end, _, _ in intervals
            )
            if addr < previous_addr and not overlaps_existing:
                report.warn(location, "地址小于前一条目；建议按地址递增排列")
            previous_addr = addr
            for other_start, other_end, other_reg, other_location in intervals:
                if max(addr, other_start) <= min(end, other_end):
                    if not reg.get("alias_note") and not other_reg.get("alias_note"):
                        report.warn(location, f"地址范围与 {other_location} 重叠但双方都没有 alias_note")
            intervals.append((addr, end, reg, location))

    if who_reg is not None and who_reg not in all_addresses:
        report.warn("who_am_i.reg", "没有匹配到任何页面中的寄存器地址")
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="校验寄存器速查工具使用的芯片 YAML")
    parser.add_argument("paths", nargs="+", type=Path, help="一个或多个 YAML 文件")
    parser.add_argument("--strict", action="store_true", help="将警告也视为失败")
    args = parser.parse_args()

    failed = False
    for path in args.paths:
        report = validate_document(path)
        for message in report.errors:
            print(f"ERROR {path}: {message}")
        for message in report.warnings:
            print(f"WARN  {path}: {message}")
        if report.errors:
            failed = True
            print(f"FAIL  {path}: {len(report.errors)} error(s), {len(report.warnings)} warning(s)")
        else:
            print(
                f"OK    {path}: {report.pages} page(s), {report.registers} register(s), "
                f"{report.fields} field(s), {len(report.warnings)} warning(s)"
            )
        if args.strict and report.warnings:
            failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Code2,
  Cpu,
  Download,
  FileText,
  MemoryStick,
  Pause,
  Play,
  Plus,
  RotateCcw,
  StepForward,
  Timer,
  Trash2,
  Upload,
  Wifi,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import CodeMirror from "@uiw/react-codemirror";
import {
  StreamLanguage,
  HighlightStyle,
  syntaxHighlighting,
  type StringStream,
} from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Checkbox } from "./components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import "./styles.css";
import { Cpu8085 } from "./core/cpu";
import { hex, type Flags, type Listing, type TraceEntry } from "./core/types";
const samplePrograms = [
  {
    id: "add",
    name: "Addition of two 8-bit numbers",
    description: "Adds two registers and stores the result at 9000H.",
    code: `; Addition of two 8-bit numbers
ORG 8000H
LXI SP, FFFFH
MVI A, 14H
MVI B, 2FH
ADD B
STA 9000H
HLT`,
  },
  {
    id: "sub",
    name: "Subtraction",
    description: "Subtracts one 8-bit value from another.",
    code: `; Subtraction
ORG 8000H
MVI A, 50H
MVI B, 18H
SUB B
STA 9000H
HLT`,
  },
  {
    id: "sum-array",
    name: "Sum an array",
    description: "Sums four bytes stored in memory.",
    code: `; Sum four bytes
ORG 8000H
LXI H, 9000H
MVI B, 04H
MVI A, 00H
LOOP: ADD M
INX H
DCR B
JNZ LOOP
STA 9010H
HLT
ORG 9000H
DATA: DB 05H, 03H, 09H, 01H`,
  },
  {
    id: "largest",
    name: "Find largest number",
    description: "Finds the largest value in a four-byte array.",
    code: `; Find largest value
ORG 8000H
LXI H, 9000H
MOV A, M
INX H
MVI B, 03H
LOOP: CMP M
JNC NEXT
MOV A, M
NEXT: INX H
DCR B
JNZ LOOP
STA 9010H
HLT
ORG 9000H
DB 23H, 7AH, 19H, 4CH`,
  },
  {
    id: "smallest",
    name: "Find smallest number",
    description: "Finds the smallest value in a four-byte array.",
    code: `; Find smallest value
ORG 8000H
LXI H, 9000H
MOV A, M
INX H
MVI B, 03H
LOOP: CMP M
JC NEXT
MOV A, M
NEXT: INX H
DCR B
JNZ LOOP
STA 9010H
HLT
ORG 9000H
DB 23H, 7AH, 19H, 4CH`,
  },
  {
    id: "copy-block",
    name: "Copy a memory block",
    description: "Copies four bytes from one memory area to another.",
    code: `; Copy 4 bytes
ORG 8000H
LXI H, 9000H
LXI D, 9010H
MVI B, 04H
LOOP: MOV A, M
STAX D
INX H
INX D
DCR B
JNZ LOOP
HLT
ORG 9000H
DB 11H, 22H, 33H, 44H`,
  },
  {
    id: "count-zero",
    name: "Count zero values",
    description: "Counts zero bytes in an array.",
    code: `; Count zeros
ORG 8000H
LXI H, 9000H
MVI B, 05H
MVI C, 00H
LOOP: MOV A, M
ORA A
JNZ NEXT
INR C
NEXT: INX H
DCR B
JNZ LOOP
MOV A, C
STA 9010H
HLT
ORG 9000H
DB 00H, 14H, 00H, 27H, 00H`,
  },
  {
    id: "even-odd",
    name: "Count even and odd numbers",
    description: "Separately counts even and odd values.",
    code: `; Count even and odd values
ORG 8000H
LXI H, 9000H
MVI B, 06H
MVI C, 00H
MVI D, 00H
LOOP: MOV A, M
ANI 01H
JZ EVEN
INR D
JMP NEXT
EVEN: INR C
NEXT: INX H
DCR B
JNZ LOOP
MOV A, C
STA 9010H
MOV A, D
STA 9011H
HLT
ORG 9000H
DB 10H, 11H, 20H, 21H, 30H, 31H`,
  },
  {
    id: "increment-array",
    name: "Increment an array",
    description: "Increments every byte in a five-byte array.",
    code: `; Increment each array element
ORG 8000H
LXI H, 9000H
MVI B, 05H
LOOP: INR M
INX H
DCR B
JNZ LOOP
HLT
ORG 9000H
DB 10H, 20H, 30H, 40H, 50H`,
  },
  {
    id: "sort-ascending",
    name: "Bubble sort ascending",
    description: "Sorts four bytes in ascending order.",
    code: `; Bubble sort, 4 elements
ORG 8000H
MVI C, 03H
PASS: LXI H, 9000H
MVI B, 03H
LOOP: MOV A, M
INX H
CMP M
JC KEEP
JZ KEEP
MOV D, M
MOV M, A
DCX H
MOV M, D
INX H
KEEP: DCR B
JNZ LOOP
DCR C
JNZ PASS
HLT
ORG 9000H
DB 42H, 11H, 37H, 05H`,
  },
  {
    id: "factorial",
    name: "Factorial",
    description: "Computes 5! using repeated addition.",
    code: `; 5! using repeated addition
ORG 8000H
MVI A, 05H
MVI C, 04H
OUTER: MOV D, A
MOV E, C
MVI A, 00H
MUL: ADD D
DCR E
JNZ MUL
DCR C
JNZ OUTER
STA 9000H
HLT`,
  },
  {
    id: "delay",
    name: "Software delay loop",
    description: "Demonstrates nested decrement loops and timing.",
    code: `; Software delay
ORG 8000H
MVI B, 05H
OUTER: MVI C, 0FFH
INNER: DCR C
JNZ INNER
DCR B
JNZ OUTER
HLT`,
  },
  {
    id: "io",
    name: "I/O port demonstration",
    description:
      "Reads an input port, stores it, then writes it to an output port.",
    code: `; I/O demonstration
ORG 8000H
IN 10H
STA 9000H
OUT 11H
HLT`,
  },
  {
    id: "stack",
    name: "Stack and subroutine",
    description: "Demonstrates CALL, RET, PUSH and POP.",
    code: `; Stack and subroutine demo
ORG 8000H
LXI SP, FFFFH
MVI A, 25H
CALL DOUBLE
STA 9000H
HLT
DOUBLE: PUSH PSW
ADD A
POP PSW
RET`,
  },
  {
    id: "interrupt",
    name: "Interrupt service routine",
    description:
      "Places an RST 7.5 service routine at 003CH for debugger interrupt testing.",
    code: `; Interrupt demo
ORG 8000H
LXI SP, FFFFH
MVI A, 10H
EI
MAIN: INR A
JMP MAIN
ORG 003CH
PUSH PSW
INR A
STA 9000H
POP PSW
EI
RET`,
  },
  {
    id: "memory-test",
    name: "Memory read/write test",
    description: "Writes known bytes and reads them back through HL.",
    code: `; Memory test
ORG 8000H
LXI H, 9000H
MVI M, 55H
INX H
MVI M, AAH
DCX H
MOV A, M
STA 9010H
HLT`,
  },
] as const;

const starter = samplePrograms[0].code;
const cpu = new Cpu8085();
type CpuHistoryState = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  h: number;
  l: number;
  pc: number;
  sp: number;
  halted: boolean;
  inte: boolean;
  flags: Flags;
  memory: Uint8Array;
  inputs: Uint8Array;
  outputs: Uint8Array;
  instructions: number;
  machineCycles: number;
  tStates: number;
  trace: TraceEntry[];
  modified: Set<number>;
  lastWrites: Set<number>;
};

function captureCpuState(): CpuHistoryState {
  return {
    a: cpu.a,
    b: cpu.b,
    c: cpu.c,
    d: cpu.d,
    e: cpu.e,
    h: cpu.h,
    l: cpu.l,
    pc: cpu.pc,
    sp: cpu.sp,
    halted: cpu.halted,
    inte: cpu.inte,
    flags: { ...cpu.flags },
    memory: cpu.memory.slice(),
    inputs: cpu.inputs.slice(),
    outputs: cpu.outputs.slice(),
    instructions: cpu.instructions,
    machineCycles: cpu.machineCycles,
    tStates: cpu.tStates,
    trace: cpu.trace.map((entry) => ({
      ...entry,
      opcode: [...entry.opcode],
      changes: [...entry.changes],
    })),
    modified: new Set(cpu.modified),
    lastWrites: new Set(cpu.lastWrites),
  };
}

function restoreCpuState(state: CpuHistoryState) {
  cpu.a = state.a;
  cpu.b = state.b;
  cpu.c = state.c;
  cpu.d = state.d;
  cpu.e = state.e;
  cpu.h = state.h;
  cpu.l = state.l;
  cpu.pc = state.pc;
  cpu.sp = state.sp;
  cpu.halted = state.halted;
  cpu.inte = state.inte;
  cpu.flags = { ...state.flags };
  cpu.memory.set(state.memory);
  cpu.inputs.set(state.inputs);
  cpu.outputs.set(state.outputs);
  cpu.instructions = state.instructions;
  cpu.machineCycles = state.machineCycles;
  cpu.tStates = state.tStates;
  cpu.trace = state.trace.map((entry) => ({
    ...entry,
    opcode: [...entry.opcode],
    changes: [...entry.changes],
  }));
  cpu.modified = new Set(state.modified);
  cpu.lastWrites = new Set(state.lastWrites);
}

function pushWordToStack(value: number) {
  cpu.sp = (cpu.sp - 1) & 0xffff;
  cpu.memory[cpu.sp] = (value >> 8) & 0xff;
  cpu.modified.add(cpu.sp);
  cpu.lastWrites.add(cpu.sp);
  cpu.sp = (cpu.sp - 1) & 0xffff;
  cpu.memory[cpu.sp] = value & 0xff;
  cpu.modified.add(cpu.sp);
  cpu.lastWrites.add(cpu.sp);
}

function injectInterrupt(
  kind: "TRAP" | "RST5.5" | "RST6.5" | "RST7.5" | "INTR",
) {
  const vector = {
    TRAP: 0x0024,
    "RST5.5": 0x002c,
    "RST6.5": 0x0034,
    "RST7.5": 0x003c,
    // INTR is acknowledged here as RST 7 for a debugger-friendly
    // simulation. A real 8085 supplies an instruction on INTA.
    INTR: 0x0038,
  }[kind];

  pushWordToStack(cpu.pc);
  cpu.pc = vector;
  cpu.halted = false;
  if (kind !== "TRAP") cpu.inte = false;
  cpu.machineCycles += 2;
  cpu.tStates += kind === "TRAP" ? 12 : 12;
  cpu.lastWrites.clear();
}
// Editing is continuous: operands are allowed to be absent while a user is
// typing, so parsing must never throw into React's render path.
const parse = (v?: string) =>
  typeof v === "string" ? parseInt(v.replace(/H$/i, ""), 16) : Number.NaN;
const labels = new Set([
  "ORG",
  "DB",
  "DW",
  "END",
  "MOV",
  "MVI",
  "LXI",
  "ADD",
  "ADC",
  "SUB",
  "SBB",
  "ANA",
  "XRA",
  "ORA",
  "CMP",
  "INR",
  "DCR",
  "INX",
  "DCX",
  "DAD",
  "JMP",
  "JNZ",
  "JZ",
  "JNC",
  "JC",
  "JPO",
  "JPE",
  "JP",
  "JM",
  "CALL",
  "CNZ",
  "CZ",
  "CNC",
  "CC",
  "CPO",
  "CPE",
  "CP",
  "CM",
  "RET",
  "RNZ",
  "RZ",
  "RNC",
  "RC",
  "RPO",
  "RPE",
  "RP",
  "RM",
  "RST",
  "PUSH",
  "POP",
  "STA",
  "LDA",
  "SHLD",
  "LHLD",
  "OUT",
  "IN",
  "HLT",
]);
const asmEditorTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      backgroundColor: "transparent",
      color: "#e2e8f0",
      fontSize: "13.5px",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "var(--font-mono)",
      lineHeight: "1.7",
    },
    ".cm-content": { caretColor: "#22d3ee", padding: "12px 0 64px" },
    ".cm-line": { padding: "0 16px 0 8px" },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "#475569",
      border: "none",
      paddingLeft: "6px",
    },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 10px 0 6px" },
    ".cm-activeLine": { backgroundColor: "rgba(56,189,248,0.06)" },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "#7dd3fc",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#22d3ee",
      borderLeftWidth: "2px",
    },
    // Translucent selection: syntax colors stay readable on top of it
    ".cm-selectionBackground": {
      backgroundColor: "rgba(56,189,248,0.22) !important",
      borderRadius: "3px",
    },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground":
      {
        backgroundColor: "rgba(56,189,248,0.32) !important",
      },
    ".cm-selectionMatch": {
      backgroundColor: "rgba(251,191,36,0.16)",
      borderRadius: "3px",
    },
    ".cm-searchMatch": {
      backgroundColor: "rgba(232,121,249,0.25)",
      borderRadius: "3px",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "rgba(232,121,249,0.45)",
    },
    ".cm-panels": {
      backgroundColor: "#0b1220",
      color: "#cbd5e1",
      borderTop: "1px solid #1e293b",
    },
    ".cm-panels input, .cm-panels button": {
      fontFamily: "inherit",
      fontSize: "12px",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "#1e293b",
      border: "none",
      color: "#94a3b8",
    },
  },
  { dark: true },
);
const asmHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#fbbf24", fontWeight: "700" },
  { tag: tags.atom, color: "#67e8f9", fontWeight: "600" },
  { tag: tags.number, color: "#f0abfc" },
  { tag: tags.string, color: "#86efac" },
  { tag: tags.comment, color: "#7893bd", fontStyle: "italic" },
  { tag: tags.labelName, color: "#34d399", fontWeight: "700" },
  { tag: tags.variableName, color: "#e2e8f0" },
]);
const asm8085 = {
  name: "8085 assembly",
  token(stream: StringStream) {
    if (stream.eatSpace()) return null;
    if (stream.match(";")) {
      stream.skipToEnd();
      return "comment";
    }
    if (stream.match(/^[A-Za-z_.$][\w.$]*:/)) return "labelName";
    if (stream.match(/^['\"][^'\"]*['\"]/)) return "string";
    if (stream.match(/^(?:[0-9A-F]+H|0X[0-9A-F]+|\d+)/i)) return "number";
    if (stream.match(/^[A-Za-z][\w]*/)) {
      const word = stream.current().toUpperCase();
      if (labels.has(word)) return "keyword";
      if (["A", "B", "C", "D", "E", "H", "L", "M", "SP", "PSW"].includes(word))
        return "atom";
      return "variableName";
    }
    stream.next();
    return null;
  },
};
const asmExtensions = [
  StreamLanguage.define(asm8085),
  syntaxHighlighting(asmHighlight),
  asmEditorTheme,
];
function highlight(line: string) {
  const [body, comment = ""] = line.split(";");
  return (
    <>
      {body.split(/(\s+|,)/).map((t, i) =>
        labels.has(t.toUpperCase()) ? (
          <span key={i} className="text-amber-300 font-semibold">
            {t}
          </span>
        ) : /^[A-Z.$]+:$/.test(t) ? (
          <span key={i} className="text-emerald-300">
            {t}
          </span>
        ) : /^[0-9A-F]+H$/i.test(t) ? (
          <span key={i} className="text-fuchsia-300">
            {t}
          </span>
        ) : /^(A|B|C|D|E|H|L|M|SP|PSW)$/i.test(t) ? (
          <span key={i} className="text-cyan-300">
            {t}
          </span>
        ) : (
          t
        ),
      )}
      {comment && <span className="text-slate-500 italic">;{comment}</span>}
    </>
  );
}
function reportHighlight(line: string) {
  const [body, comment = ""] = line.split(";");
  return (
    <>
      {body.split(/(\s+|,)/).map((token, index) =>
        labels.has(token.toUpperCase()) ? (
          <span key={index} className="font-bold text-amber-700">
            {token}
          </span>
        ) : /^[A-Z.$]+:$/.test(token) ? (
          <span key={index} className="font-bold text-emerald-700">
            {token}
          </span>
        ) : /^[0-9A-F]+H$/i.test(token) ? (
          <span key={index} className="text-fuchsia-700">
            {token}
          </span>
        ) : /^(A|B|C|D|E|H|L|M|SP|PSW)$/i.test(token) ? (
          <span key={index} className="font-semibold text-cyan-700">
            {token}
          </span>
        ) : (
          token
        ),
      )}
      {comment && <span className="italic text-slate-500">;{comment}</span>}
    </>
  );
}
const registers = ["B", "C", "D", "E", "H", "L", "M", "A"],
  registerPairs = ["B", "D", "H", "SP"];
function splitSource(raw: string) {
  let code = raw.split(";")[0].trim(),
    label = "";
  // Markdown fences are presentation syntax, not source instructions.
  if (code.startsWith("```")) return { label, op: "", args: [] };
  const match = code.match(/^([\w.$]+):\s*(.*)$/);
  if (match) {
    label = match[1].toUpperCase();
    code = match[2];
  }
  const [op = "", ...rest] = code.split(/\s+/);
  return {
    label,
    op: op.toUpperCase(),
    args: rest
      .join(" ")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  };
}
function instructionBytes(
  op: string,
  args: string[],
  symbols: Map<string, number>,
  allowUnresolved = false,
): number[] {
  const resolve = (x?: string) => {
    if (!x) throw Error(`${op} is missing an operand`);
    const found = symbols.get(x.toUpperCase());
    const n = found ?? parse(x);
    if (Number.isNaN(n)) {
      if (allowUnresolved) return 0;
      throw Error(`Unknown symbol or value '${x}'`);
    }
    return n;
  };
  const reg = (x?: string) => {
    if (!x) throw Error(`${op} is missing a register operand`);
    const n = registers.indexOf(x.toUpperCase());
    if (n < 0) throw Error(`Invalid register '${x}'`);
    return n;
  };
  const pair = (x?: string) => {
    if (!x) throw Error(`${op} is missing a register-pair operand`);
    const n = registerPairs.indexOf(x.toUpperCase());
    if (n < 0) throw Error(`Invalid register pair '${x}'`);
    return n;
  };
  const word = (opcode: number, value?: string) => {
    const n = resolve(value);
    return [opcode, n & 255, (n >> 8) & 255];
  };
  const simple: Record<string, number> = {
    NOP: 0,
    HLT: 0x76,
    RET: 0xc9,
    EI: 0xfb,
    DI: 0xf3,
    DAA: 0x27,
    CMA: 0x2f,
    STC: 0x37,
    CMC: 0x3f,
    XCHG: 0xeb,
    XTHL: 0xe3,
    PCHL: 0xe9,
    SPHL: 0xf9,
    RLC: 7,
    RRC: 15,
    RAL: 23,
    RAR: 31,
  };
  if (simple[op] !== undefined) return [simple[op]];
  if (op === "MOV") return [0x40 | (reg(args[0]) << 3) | reg(args[1])];
  if (["ADD", "ADC", "SUB", "SBB", "ANA", "XRA", "ORA", "CMP"].includes(op))
    return [
      0x80 |
        (["ADD", "ADC", "SUB", "SBB", "ANA", "XRA", "ORA", "CMP"].indexOf(op) <<
          3) |
        reg(args[0]),
    ];
  if (["INR", "DCR"].includes(op))
    return [(op === "INR" ? 4 : 5) | (reg(args[0]) << 3)];
  if (["INX", "DCX", "DAD"].includes(op))
    return [(op === "INX" ? 3 : op === "DCX" ? 11 : 9) | (pair(args[0]) << 4)];
  if (op === "MVI") return [6 | (reg(args[0]) << 3), resolve(args[1]) & 255];
  if (op === "LXI") return word(1 | (pair(args[0]) << 4), args[1]);
  if (["PUSH", "POP"].includes(op)) {
    const operand = args[0];
    if (!operand) throw Error(`${op} is missing a register-pair operand`);
    const n = operand.toUpperCase() === "PSW" ? 3 : pair(operand);
    return [(op === "PUSH" ? 0xc5 : 0xc1) | (n << 4)];
  }
  const absolute: Record<string, number> = {
    JMP: 0xc3,
    CALL: 0xcd,
    STA: 0x32,
    LDA: 0x3a,
    SHLD: 0x22,
    LHLD: 0x2a,
  };
  if (absolute[op] !== undefined) return word(absolute[op], args[0]);
  const conditional = ["JNZ", "JZ", "JNC", "JC", "JPO", "JPE", "JP", "JM"];
  if (conditional.includes(op))
    return word(0xc2 | (conditional.indexOf(op) << 3), args[0]);
  const conditionalCalls = ["CNZ", "CZ", "CNC", "CC", "CPO", "CPE", "CP", "CM"];
  if (conditionalCalls.includes(op))
    return word(0xc4 | (conditionalCalls.indexOf(op) << 3), args[0]);
  const conditionalReturns = [
    "RNZ",
    "RZ",
    "RNC",
    "RC",
    "RPO",
    "RPE",
    "RP",
    "RM",
  ];
  if (conditionalReturns.includes(op))
    return [0xc0 | (conditionalReturns.indexOf(op) << 3)];
  if (op === "RST") {
    const n = resolve(args[0]);
    if (n < 0 || n > 7) throw Error("RST operand must be 0–7");
    return [0xc7 | (n << 3)];
  }
  const immediate: Record<string, number> = {
    ADI: 0xc6,
    ACI: 0xce,
    SUI: 0xd6,
    SBI: 0xde,
    ANI: 0xe6,
    XRI: 0xee,
    ORI: 0xf6,
    CPI: 0xfe,
    IN: 0xdb,
    OUT: 0xd3,
  };
  if (immediate[op] !== undefined)
    return [immediate[op], resolve(args[0]) & 255];
  if (op === "STAX") return [pair(args[0]) === 0 ? 2 : 18];
  if (op === "LDAX") return [pair(args[0]) === 0 ? 10 : 26];
  throw Error(`Unsupported instruction '${op}'`);
}
function assembleSource(source: string, start: number) {
  const symbols = new Map<string, number>();
  let address = start;
  const lines = source.split("\n");
  for (const raw of lines) {
    const { label, op, args } = splitSource(raw);
    if (label) symbols.set(label, address);
    if (!op) continue;
    if (op === "ORG") {
      const target = parse(args[0]);
      // Keep the live parser stable while an ORG operand is incomplete.
      if (!Number.isNaN(target)) address = target;
      continue;
    }
    if (op === "DB") address += args.length;
    else if (op === "DW") address += args.length * 2;
    else if (op !== "END") {
      // During live editing an instruction may be incomplete (e.g. "RE" while
      // typing RET). Never let the sizing pass throw into React rendering.
      try {
        address += instructionBytes(op, args, symbols, true).length;
      } catch {
        address += 1;
      }
    }
  }
  address = start;
  const listing: Listing[] = [];
  const errors: string[] = [];
  const dataRanges: [number, number][] = [];
  lines.forEach((raw, index) => {
    const { op, args } = splitSource(raw);
    if (!op) return;
    try {
      if (op === "ORG") {
        const target = parse(args[0]);
        if (Number.isNaN(target))
          throw Error("ORG requires a hexadecimal address");
        address = target;
        return;
      }
      if (op === "END") return;
      let bytes: number[];
      if (op === "DB")
        bytes = args.flatMap((x) =>
          /^['\"].*['\"]$/.test(x)
            ? [...x.slice(1, -1)].map((c) => c.charCodeAt(0))
            : (() => {
                const value = parse(x);
                if (Number.isNaN(value)) throw Error(`Invalid DB byte '${x}'`);
                return [value & 255];
              })(),
        );
      else if (op === "DW")
        bytes = args.flatMap((x) => {
          const n = symbols.get(x.toUpperCase()) ?? parse(x);
          if (Number.isNaN(n)) throw Error(`Unknown DW value '${x}'`);
          return [n & 255, (n >> 8) & 255];
        });
      else bytes = instructionBytes(op, args, symbols);
      listing.push({ address, bytes, text: raw, line: index + 1 });
      if ((op === "DB" || op === "DW") && bytes.length)
        dataRanges.push([address, (address + bytes.length - 1) & 0xffff]);
      address += bytes.length;
    } catch (e) {
      errors.push(`Line ${index + 1}: ${(e as Error).message}`);
    }
  });
  const mergedDataRanges = dataRanges.reduce<[number, number][]>(
    (merged, range) => {
      const previous = merged.at(-1);
      if (previous && previous[1] + 1 === range[0]) previous[1] = range[1];
      else merged.push(range);
      return merged;
    },
    [],
  );
  return { listing, errors, dataRanges: mergedDataRanges };
}
const colorCache = new Map<string, string>();
let colorCtx: CanvasRenderingContext2D | null = null;
// Word cannot read oklch()/lab() colors that Tailwind v4 emits, so normalise to rgb().
function cssColor(value: string) {
  if (!value || value === "transparent") return "";
  const cached = colorCache.get(value);
  if (cached !== undefined) return cached;
  colorCtx ??= document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true });
  let out = value;
  if (colorCtx) {
    colorCtx.clearRect(0, 0, 1, 1);
    colorCtx.fillStyle = "#000";
    colorCtx.fillStyle = value;
    colorCtx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = colorCtx.getImageData(0, 0, 1, 1).data;
    out = a === 0 ? "" : `rgb(${r}, ${g}, ${b})`;
  }
  colorCache.set(value, out);
  return out;
}
// Copies the computed look of every element into inline styles so the pasted
// result matches the on-screen report (Word ignores class names and stylesheets).
function inlineForWord(src: Element, dst: HTMLElement) {
  const cs = getComputedStyle(src);
  const css: string[] = [];
  const color = cssColor(cs.color);
  if (color) css.push(`color:${color}`);
  const bg = cssColor(cs.backgroundColor);
  if (bg) css.push(`background-color:${bg}`);
  for (const prop of [
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "text-align",
    "text-transform",
    "white-space",
  ])
    css.push(`${prop}:${cs.getPropertyValue(prop)}`);
  if (cs.lineHeight !== "normal") css.push(`line-height:${cs.lineHeight}`);
  if (cs.letterSpacing !== "normal" && cs.letterSpacing !== "0px")
    css.push(`letter-spacing:${cs.letterSpacing}`);
  const isCell = src.tagName === "TD" || src.tagName === "TH";
  for (const side of ["top", "right", "bottom", "left"]) {
    css.push(`padding-${side}:${cs.getPropertyValue(`padding-${side}`)}`);
    const margin = cs.getPropertyValue(`margin-${side}`);
    if (!isCell && margin !== "0px") css.push(`margin-${side}:${margin}`);
    const width = cs.getPropertyValue(`border-${side}-width`);
    const style = cs.getPropertyValue(`border-${side}-style`);
    if (parseFloat(width) > 0 && style !== "none")
      css.push(
        `border-${side}:${width} ${style} ${cssColor(cs.getPropertyValue(`border-${side}-color`)) || "#000"}`,
      );
  }
  if (src.tagName === "TABLE")
    css.push("width:100%", "border-collapse:collapse");
  if (cs.display === "grid")
    dst.dataset.cols = String(cs.gridTemplateColumns.split(" ").length);
  dst.removeAttribute("class");
  dst.setAttribute("style", css.join(";"));
  for (let i = 0; i < src.children.length; i++)
    inlineForWord(src.children[i], dst.children[i] as HTMLElement);
}
function buildWordHtml(report: HTMLElement) {
  const clone = report.cloneNode(true) as HTMLElement;
  inlineForWord(report, clone);
  // Word has no CSS grid, so grids become real tables.
  clone.querySelectorAll<HTMLElement>("[data-cols]").forEach((grid) => {
    const cols = Number(grid.dataset.cols) || 1;
    const table = document.createElement("table");
    table.setAttribute(
      "style",
      `${grid.getAttribute("style") ?? ""};width:100%;border-collapse:collapse`,
    );
    const body = table.createTBody();
    let row!: HTMLTableRowElement;
    [...grid.children].forEach((child, index) => {
      if (index % cols === 0) row = body.insertRow();
      const cell = row.insertCell();
      cell.setAttribute("style", "padding:4px 10px");
      cell.appendChild(child);
    });
    grid.replaceWith(table);
  });
  return clone.outerHTML;
}
// Serialises the page's compiled stylesheet so exported HTML looks exactly like the preview.
function collectPageCss() {
  let css = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      css +=
        Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .filter((text) => !/cm-|\u037c|sonner/.test(text))
          .join("\n") + "\n";
    } catch {
      /* cross-origin sheet, skip */
    }
  }
  return css;
}
const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
async function writeRichClipboard(html: string, text: string) {
  if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      }),
    ]);
    return;
  }
  const box = document.createElement("div");
  box.contentEditable = "true";
  box.innerHTML = html;
  box.style.cssText = "position:fixed;left:-9999px;top:0;background:#fff";
  document.body.appendChild(box);
  const range = document.createRange();
  range.selectNodeContents(box);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  const ok = document.execCommand("copy");
  selection?.removeAllRanges();
  box.remove();
  if (!ok) throw new Error("Clipboard copy failed");
}

type CycleTiming = {
  machineCycles: string;
  tStates: string;
  bytes: number;
  category: string;
  note: string;
};
function timingFor(line: Listing): CycleTiming | null {
  const { op, args } = splitSource(line.text);
  if (!op || op === "DB" || op === "DW" || op === "ORG" || op === "END")
    return null;
  const size = line.bytes.length;
  const reg = (args[0] ?? "").toUpperCase();
  const isM = args.some((x) => x.toUpperCase() === "M");
  const one = (mc: number, t: number, note = "") => ({
    machineCycles: String(mc),
    tStates: String(t),
    bytes: size,
    category: "Instruction",
    note,
  });
  if (
    op === "NOP" ||
    [
      "RLC",
      "RRC",
      "RAL",
      "RAR",
      "DAA",
      "CMA",
      "STC",
      "CMC",
      "XCHG",
      "EI",
      "DI",
    ].includes(op)
  )
    return one(1, 4);
  if (op === "HLT") return one(1, 5, "Processor enters HALT state.");
  if (op === "MOV")
    return one(
      isM ? 2 : 1,
      isM ? 7 : 5,
      isM
        ? "Memory operand adds a memory-read/write cycle."
        : "Register-to-register transfer.",
    );
  if (op === "MVI") return one(isM ? 2 : 2, isM ? 10 : 7);
  if (op === "LXI") return one(3, 10);
  if (["ADD", "ADC", "SUB", "SBB", "ANA", "XRA", "ORA", "CMP"].includes(op))
    return one(isM ? 2 : 1, isM ? 7 : 4);
  if (["INR", "DCR"].includes(op)) return one(isM ? 2 : 1, isM ? 10 : 5);
  if (["INX", "DCX", "DAD", "INR", "DCR"].includes(op)) return one(1, 6);
  if (["JMP"].includes(op)) return one(3, 10);
  if (["JNZ", "JZ", "JNC", "JC", "JPO", "JPE", "JP", "JM"].includes(op))
    return one(
      2,
      7,
      "Conditional timing depends on whether the branch is taken (3 MC / 10 T when taken).",
    );
  if (op === "CALL") return one(5, 18);
  if (["CNZ", "CZ", "CNC", "CC", "CPO", "CPE", "CP", "CM"].includes(op))
    return one(
      3,
      9,
      "Conditional call: 3 MC / 9 T if not taken; 5 MC / 18 T if taken.",
    );
  if (op === "RET") return one(3, 10);
  if (["RNZ", "RZ", "RNC", "RC", "RPO", "RPE", "RP", "RM"].includes(op))
    return one(
      2,
      6,
      "Conditional return: 2 MC / 6 T if not taken; 3 MC / 12 T if taken.",
    );
  if (["STA", "LDA"].includes(op)) return one(4, 13);
  if (["SHLD", "LHLD"].includes(op)) return one(5, 16);
  if (["PUSH"].includes(op)) return one(3, 12);
  if (["POP"].includes(op)) return one(3, 10);
  if (["IN", "OUT"].includes(op)) return one(3, 10);
  if (op === "STAX" || op === "LDAX") return one(2, 7);
  if (op === "PCHL") return one(1, 5);
  if (op === "SPHL") return one(1, 6);
  if (op === "XTHL") return one(5, 18);
  if (op === "RST") return one(3, 12);
  return one(
    1,
    4,
    "Timing not explicitly mapped; verify against the 8085 datasheet.",
  );
}
function CycleTimingCard({ listing }: { listing: Listing[] }) {
  const instructions = listing.filter((line) => timingFor(line));
  const data = listing.filter((line) => {
    const { op } = splitSource(line.text);
    return op === "DB" || op === "DW";
  });
  const totalT = instructions.reduce(
    (sum, line) => sum + Number(timingFor(line)?.tStates ?? 0),
    0,
  );
  const totalMc = instructions.reduce(
    (sum, line) => sum + Number(timingFor(line)?.machineCycles ?? 0),
    0,
  );
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Timer size={17} className="text-cyan-300" />
          <CardTitle>Instruction cycle analysis</CardTitle>
        </div>
        <span className="text-xs text-slate-500">
          Reference 8085 timing for the assembled listing
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label="Instructions" value={instructions.length} />
          <Metric label="Machine cycles" value={totalMc} />
          <Metric label="T-states" value={totalT} />
          <Metric
            label="Program bytes"
            value={listing.reduce((n, l) => n + l.bytes.length, 0)}
          />
        </div>
        <div className="overflow-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[850px] font-mono text-xs">
            <thead className="bg-slate-900/80 text-left text-slate-500">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2">Address</th>
                <th className="p-2">Bytes</th>
                <th className="p-2">Instruction</th>
                <th className="p-2">Size</th>
                <th className="p-2">Machine cycles</th>
                <th className="p-2">T-states</th>
                <th className="p-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {instructions.map((line, index) => {
                const timing = timingFor(line)!;
                return (
                  <tr
                    key={`${line.address}-${line.line}`}
                    className="border-t border-slate-900"
                  >
                    <td className="p-2 text-slate-500">{index + 1}</td>
                    <td className="p-2 text-blue-300">
                      {hex(line.address, 4)}H
                    </td>
                    <td className="p-2">
                      {line.bytes.map((b) => hex(b)).join(" ")}
                    </td>
                    <td className="p-2 text-cyan-100">
                      {highlight(line.text)}
                    </td>
                    <td className="p-2">{timing.bytes}</td>
                    <td className="p-2 text-amber-200">
                      {timing.machineCycles}
                    </td>
                    <td className="p-2 text-fuchsia-200">{timing.tStates}</td>
                    <td className="p-2 text-slate-400">
                      {timing.note || timing.category}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data.length > 0 && (
          <div className="rounded-lg border border-violet-400/20 bg-violet-400/5 p-3 text-xs text-slate-400">
            <b className="text-violet-200">
              Data declarations excluded from cycle totals:
            </b>{" "}
            {data
              .map((line) => `${hex(line.address, 4)}H · ${line.text.trim()}`)
              .join(" · ")}
          </div>
        )}
        <p className="text-[11px] text-slate-500">
          Conditional instructions show their normal not-taken timing in the
          table; the note includes the taken timing. Runtime CPU counters may
          differ because the simulator's core uses its own execution accounting.
        </p>
      </CardContent>
    </Card>
  );
}
function App() {
  const [code, setCode] = useState(starter),
    [pc, setPc] = useState(0x8000),
    [tick, setTick] = useState(0),
    [page, setPage] = useState(0x80),
    [pageAddress, setPageAddress] = useState("8000"),
    [ports, setPorts] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7]),
    [ranges, setRanges] = useState<[number, number][]>([]),
    [breakpoints, setBreakpoints] = useState<Set<number>>(new Set()),
    [report, setReport] = useState(false),
    [fillAddress, setFillAddress] = useState("9000"),
    [fillData, setFillData] = useState("43 00 00 00"),
    [reportTitle, setReportTitle] = useState(
      "8085 Microprocessor Experiment Report",
    ),
    [speed, setSpeed] = useState("1"),
    [clock, setClock] = useState("6"),
    [running, setRunning] = useState(false),
    [lastOperation, setLastOperation] = useState("Waiting to execute"),
    [recentMemory, setRecentMemory] = useState<Set<number>>(new Set()),
    [assembledKey, setAssembledKey] = useState<string | null>(null),
    [showIo, setShowIo] = useState(true),
    [showIoInput, setShowIoInput] = useState(true),
    [interruptKind, setInterruptKind] = useState<
      "TRAP" | "RST5.5" | "RST6.5" | "RST7.5" | "INTR"
    >("RST7.5");
  const sourceKey = `${pc}|${code}`;
  const isStale = assembledKey !== sourceKey; // source changed since last assemble
  const stepRef = useRef<(fromTimer?: boolean) => void>(() => {});
  const importInput = useRef<HTMLInputElement>(null);
  const programmed = useRef<Set<number>>(new Set());
  const flashTimers = useRef<Map<number, number>>(new Map());
  const history = useRef<CpuHistoryState[]>([]);
  const rerender = () => setTick((x) => x + 1);
  const assembled = useMemo(() => assembleSource(code, pc), [code, pc]);
  const listing = assembled.listing;
  const breakpointAddresses = useMemo(
    () =>
      new Set(
        listing
          .filter((line) => breakpoints.has(line.line))
          .map((line) => line.address),
      ),
    [listing, breakpoints],
  );
  // An id makes identical messages replace each other instead of stacking.
  function notify(message: string, type: "success" | "error" = "success") {
    toast[type](message, { id: message });
  }
  function flashMemory(addresses: Iterable<number>) {
    const unique = [...new Set(addresses)].map((address) => address & 0xffff);
    if (!unique.length) return;
    setRecentMemory((current) => new Set([...current, ...unique]));
    unique.forEach((address) => {
      const oldTimer = flashTimers.current.get(address);
      if (oldTimer) window.clearTimeout(oldTimer);
      flashTimers.current.set(
        address,
        window.setTimeout(() => {
          setRecentMemory((current) => {
            const next = new Set(current);
            next.delete(address);
            return next;
          });
          flashTimers.current.delete(address);
        }, 900),
      );
    });
  }
  function downloadFile(name: string, body: string, type: string) {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function reportElement() {
    if (!report) {
      setReport(true);
      // wait for React to paint the report before reading it from the DOM
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    }
    return document.querySelector<HTMLElement>(".report-document");
  }
  async function copyForWord() {
    const element = await reportElement();
    if (!element) return notify("Generate the report first.", "error");
    try {
      await writeRichClipboard(buildWordHtml(element), element.innerText);
      notify("Report copied with formatting. Paste it into MS Word.");
    } catch {
      notify("Copy failed. Allow clipboard access and try again.", "error");
    }
  }
  async function downloadReport() {
    const element = await reportElement();
    if (!element) return notify("Generate the report first.", "error");
    const css = collectPageCss();
    const sheet = `<div class="report-sheet">${element.outerHTML}</div>`;
    const html = css.trim()
      ? `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(reportTitle)}</title><style>${css}</style><style>html,body{margin:0;background:#f1f5f9!important}.report-sheet{max-width:1100px;margin:32px auto;padding:32px;background:#fff;color:#0f172a;border-radius:8px;box-shadow:0 1px 3px rgba(15,23,42,.18)}@media print{html,body{background:#fff!important}.report-sheet{margin:0;max-width:none;padding:0;border-radius:0;box-shadow:none}}</style></head><body>${sheet}</body></html>`
      : `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(reportTitle)}</title></head><body>${buildWordHtml(element)}</body></html>`;
    downloadFile("8085-lab-report.html", html, "text/html");
    notify("HTML report downloaded.");
  }
  function stop() {
    setRunning(false);
  }
  function assemble() {
    stop();
    history.current = [];
    if (assembled.errors.length) {
      notify(assembled.errors[0], "error");
      return false;
    }
    programmed.current.forEach((address) => (cpu.memory[address] = 0));
    programmed.current = new Set();
    listing.forEach((l) =>
      l.bytes.forEach((byte, offset) => {
        const address = (l.address + offset) & 0xffff;
        cpu.memory[address] = byte;
        programmed.current.add(address);
      }),
    );
    cpu.reset(listing[0]?.address ?? pc);
    setLastOperation("Waiting to execute");
    flashMemory(programmed.current);
    notify(`Assembled ${listing.length} statements at ${hex(cpu.pc, 4)}H`);
    setAssembledKey(sourceKey);
    rerender();
    return true;
  }
  function resetCpu(silent = false) {
    stop();
    history.current = [];
    cpu.reset(listing[0]?.address ?? pc);
    setLastOperation("Waiting to execute");
    rerender();
    if (!silent) notify("Processor reset.");
  }
  function step(fromTimer = false) {
    if (!fromTimer && isStale && !assemble()) return;
    if (cpu.halted) {
      // A stale timer tick must never spam notifications
      if (fromTimer) stop();
      else
        notify(
          "Processor is halted. Press Run or Reset to start again.",
          "error",
        );
      return;
    }
    if (fromTimer && breakpointAddresses.has(cpu.pc)) {
      stop();
      notify(`Paused at breakpoint ${hex(cpu.pc, 4)}H.`);
      return;
    }
    try {
      history.current.push(captureCpuState());
      const instruction = cpu.step();
      flashMemory(cpu.lastWrites);
      setLastOperation(
        `${hex(instruction.address, 4)}H · ${instruction.instruction}`,
      );
      rerender();
      if (cpu.halted) {
        stop();
        notify("Program halted normally (HLT).");
      }
    } catch (e) {
      history.current.pop();
      stop();
      notify((e as Error).message, "error");
    }
  }

  function stepBack() {
    stop();
    const previous = history.current.pop();
    if (!previous) {
      notify("No previous CPU state is available.", "error");
      return;
    }
    restoreCpuState(previous);
    setLastOperation(`Stepped back to ${hex(cpu.pc, 4)}H`);
    rerender();
    notify(`Restored CPU state at ${hex(cpu.pc, 4)}H.`);
  }

  function triggerInterrupt() {
    if (isStale && !assemble()) return;
    history.current.push(captureCpuState());
    injectInterrupt(interruptKind);
    flashMemory(cpu.lastWrites);
    setLastOperation(`${interruptKind} interrupt → ${hex(cpu.pc, 4)}H`);
    rerender();
    notify(`${interruptKind} interrupt accepted at ${hex(cpu.pc, 4)}H.`);
  }
  stepRef.current = step; // timer always calls the latest closure
  function run() {
    if (running) return stop();
    if (isStale) {
      if (!assemble()) return; // source changed → re-assemble
    } else if (cpu.halted) {
      resetCpu(true); // already ran → just restart, no re-assemble
    }
    setRunning(true);
  }
  function assembleAndRun() {
    if (!assemble()) return;
    setRunning(true);
  }
  // The interval is owned by an effect, so changing speed while running just works
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => stepRef.current(true), Number(speed));
    return () => window.clearInterval(id);
  }, [running, speed]);
  useEffect(
    () => () => flashTimers.current.forEach((t) => window.clearTimeout(t)),
    [],
  );
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-8085-print", "true");
    style.textContent = `
      @media print {
        @page { size: A4; margin: 12mm; }
        body { background: #fff !important; }
        body * { visibility: hidden !important; }
        .report-document, .report-document * { visibility: visible !important; }
        .report-document {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          color: #0f172a !important;
          background: #fff !important;
        }
        .report-document section { break-inside: avoid; }
        .report-document table { break-inside: auto; }
        .report-document tr { break-inside: avoid; }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
  useEffect(() => setPageAddress(hex(page * 256, 4)), [page]);
  function setMemory(a: number, v: string) {
    const n = parse(v);
    if (!Number.isNaN(n)) {
      history.current = [];
      cpu.memory[a] = n & 255;
      cpu.modified.add(a);
      flashMemory([a]);
      rerender();
    }
  }
  function prefill() {
    const start = parse(fillAddress);
    if (Number.isNaN(start)) {
      notify("Enter a valid hexadecimal address.", "error");
      return;
    }
    const values = /^['\"].*['\"]$/.test(fillData.trim())
      ? [...fillData.trim().slice(1, -1)].map((c) => c.charCodeAt(0))
      : fillData
          .trim()
          .split(/[\s,]+/)
          .filter(Boolean)
          .map(parse);
    if (values.some(Number.isNaN)) {
      notify("Use hexadecimal bytes, e.g. 14 2F 0A.", "error");
      return;
    }
    history.current = [];
    values.forEach((v, i) => {
      cpu.memory[(start + i) & 65535] = v & 255;
      cpu.modified.add((start + i) & 65535);
    });
    setPage(start >> 8);
    flashMemory(values.map((_, index) => start + index));
    notify(
      `Wrote ${values.length} byte${values.length === 1 ? "" : "s"} at ${hex(start, 4)}H`,
    );
    rerender();
  }
  const mem = Array.from({ length: 256 }, (_, i) => page * 256 + i);
  // No hidden default range: only source DB/DW blocks plus what the user adds.
  const reportRanges = useMemo(
    () => [...assembled.dataRanges, ...ranges],
    [assembled.dataRanges, ranges],
  );
  const reportHTML = (
    <Report
      title={reportTitle}
      listing={listing}
      ranges={reportRanges}
      ports={ports}
      showIo={showIo}
      showIoInput={showIoInput}
    />
  );
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-cyan-400/30">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#090e18]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 font-mono font-black text-slate-950 shadow-lg shadow-cyan-500/20">
              85
            </div>
            <div>
              <h1 className="font-semibold tracking-tight">
                8085 <span className="text-cyan-300">Lab Studio</span>
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                Compiler · emulator · observability · reporting
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Split button: Run + chevron menu (shadcn DropdownMenu) */}
            <DropdownMenu>
              <div className="flex h-9 items-stretch overflow-hidden rounded-lg border border-cyan-400/30">
                <Button
                  size="sm"
                  onClick={run}
                  variant={running ? "destructive" : "default"}
                  className="h-full rounded-none border-0 px-4"
                >
                  {running ? <Pause size={15} /> : <Play size={15} />}
                  {running ? "Pause" : "Run"}
                </Button>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    aria-label="More run options"
                    variant={running ? "destructive" : "default"}
                    className="h-full w-8 rounded-none border-0 border-l border-black/25 [&[data-state=open]>svg]:rotate-180"
                  >
                    <ChevronDown size={15} className="transition-transform" />
                  </Button>
                </DropdownMenuTrigger>
              </div>
              <DropdownMenuContent align="end" sideOffset={8} className="w-56">
                <DropdownMenuItem onSelect={() => assemble()}>
                  <Box className="text-cyan-300" />
                  Assemble
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => assembleAndRun()}>
                  <Play className="text-emerald-300" />
                  Run and Assemble
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => resetCpu()}>
                  <RotateCcw className="text-amber-300" />
                  Reset
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="ml-1 flex items-center gap-2 rounded-full">
              {" "}
              <div className="ml-1 flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-400">
                <span
                  className={`h-2 w-2 rounded-full ${
                    running
                      ? "animate-pulse bg-emerald-400"
                      : cpu.halted
                        ? "bg-amber-400"
                        : isStale
                          ? "bg-slate-500"
                          : "animate-pulse bg-cyan-400"
                  }`}
                />
                {running
                  ? "RUNNING"
                  : cpu.halted
                    ? "HALTED"
                    : isStale
                      ? "EDITED"
                      : "READY"}
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 py-6">
        <Tabs defaultValue="workspace">
          <TabsList className="mb-6 w-full justify-start overflow-x-auto overflow-y-hidden">
            <TabsTrigger value="workspace">
              <Code2 size={15} />
              Workspace
            </TabsTrigger>
            <TabsTrigger value="debug">
              <Cpu size={15} />
              Debugger
            </TabsTrigger>
            <TabsTrigger value="cycles">
              <Timer size={15} />
              Instruction cycles
            </TabsTrigger>
            <TabsTrigger value="memory">
              <MemoryStick size={15} />
              Memory
            </TabsTrigger>
            <TabsTrigger value="ports">
              <Wifi size={15} />
              I/O matrix
            </TabsTrigger>
            <TabsTrigger value="report">
              <FileText size={15} />
              Lab report
            </TabsTrigger>
          </TabsList>
          <TabsContent value="workspace">
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Source workspace</CardTitle>
                    <p className="mt-1 text-xs text-slate-500">
                      Full editor surface · line numbers · syntax colors · live
                      diagnostics
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={importInput}
                      type="file"
                      accept=".asm,.txt,text/plain"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          setCode(String(reader.result ?? ""));
                          notify(`Imported ${file.name}`);
                        };
                        reader.readAsText(file);
                        event.target.value = "";
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => importInput.current?.click()}
                    >
                      <Upload size={14} />
                      Import
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        downloadFile("8085-program.asm", code, "text/plain");
                        notify("Assembly source downloaded.");
                      }}
                    >
                      <Download size={14} />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[min(62vh,680px)] min-h-[420px] overflow-hidden rounded-xl border border-slate-800 bg-[#060a12] shadow-inner transition-colors focus-within:border-cyan-500/40">
                    <CodeMirror
                      value={code}
                      height="100%"
                      className="h-full"
                      theme="none"
                      extensions={asmExtensions}
                      onChange={setCode}
                      basicSetup={{
                        lineNumbers: true,
                        highlightActiveLine: true,
                        foldGutter: true,
                      }}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button onClick={assemble}>
                      <Box size={15} />
                      Assemble program
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary">
                          <BookOpen size={14} />
                          Samples
                          <ChevronDown size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        sideOffset={6}
                        className="w-80 max-h-[min(70vh,520px)] overflow-y-auto"
                      >
                        {samplePrograms.map((sample) => (
                          <DropdownMenuItem
                            key={sample.id}
                            onSelect={() => {
                              setCode(sample.code);
                              notify(`Loaded sample: ${sample.name}`);
                            }}
                          >
                            <div className="min-w-0">
                              <div className="font-medium">{sample.name}</div>
                              <div className="truncate text-xs text-slate-500">
                                {sample.description}
                              </div>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="outline"
                      onClick={() => setCode("ORG 8000H\n\nHLT")}
                    >
                      New program
                    </Button>
                    <div className="ml-auto grid gap-1">
                      <Label htmlFor="entry-address">Entry address</Label>
                      <Input
                        id="entry-address"
                        value={hex(pc, 4)}
                        onChange={(e) => setPc(parse(e.target.value) || 0)}
                        className="h-8 w-24 font-mono text-cyan-300"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <aside className="space-y-5">
                <Card>
                  <CardHeader>
                    <CardTitle>Build intelligence</CardTitle>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${assembled.errors.length ? "bg-rose-400/10 text-rose-300" : "bg-emerald-400/10 text-emerald-300"}`}
                    >
                      {assembled.errors.length
                        ? `${assembled.errors.length} issue${assembled.errors.length === 1 ? "" : "s"}`
                        : "Ready"}
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                      <span className="text-slate-500">Statements</span>
                      <b className="float-right font-mono text-cyan-300">
                        {listing.length}
                      </b>
                    </div>
                    {assembled.errors.length > 0 && (
                      <div
                        role="alert"
                        className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200"
                      >
                        <b className="block pb-1">Live assembly feedback</b>
                        {assembled.errors.slice(0, 3).map((error) => (
                          <p key={error}>{error}</p>
                        ))}
                      </div>
                    )}
                    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                      <span className="text-slate-500">Program bytes</span>
                      <b className="float-right font-mono text-cyan-300">
                        {listing.reduce((n, l) => n + l.bytes.length, 0)}
                      </b>
                    </div>
                    {assembled.dataRanges.length > 0 && (
                      <div className="rounded-lg border border-violet-400/20 bg-violet-400/5 p-3 text-xs">
                        <b className="block text-violet-200">
                          Detected data declarations
                        </b>
                        <p className="mt-1 text-slate-400">
                          These DB/DW ranges are included automatically in the
                          lab report.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1 font-mono text-violet-200">
                          {assembled.dataRanges.map(([start, end]) => (
                            <span
                              key={`${start}-${end}`}
                              className="rounded bg-violet-400/10 px-1.5 py-1"
                            >
                              {hex(start, 4)}H–{hex(end, 4)}H
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Quick reference</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-slate-400">
                    <p>
                      <kbd className="rounded bg-slate-800 px-1.5 py-1">
                        ORG
                      </kbd>{" "}
                      chooses the load address.
                    </p>
                    <p>
                      <kbd className="rounded bg-slate-800 px-1.5 py-1">DB</kbd>
                      /
                      <kbd className="rounded bg-slate-800 px-1.5 py-1">DW</kbd>{" "}
                      initializes data memory.
                    </p>
                    <p>
                      Example:{" "}
                      <code className="text-violet-200">
                        ORG 2050H
                        <br />
                        ARRAY: DB 05H, 03H, 09H, 01H
                      </code>
                    </p>
                    <p>
                      Use{" "}
                      <kbd className="rounded bg-slate-800 px-1.5 py-1">
                        Ctrl
                      </kbd>{" "}
                      +{" "}
                      <kbd className="rounded bg-slate-800 px-1.5 py-1">F</kbd>{" "}
                      to find source text.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-violet-400/25 bg-gradient-to-br from-violet-400/10 to-slate-950">
                  <CardHeader>
                    <div>
                      <CardTitle>Memory recipe</CardTitle>
                      <p className="mt-1 text-xs text-violet-200/70">
                        Lab Studio extension
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-slate-300">
                    <p>
                      Declare test data beside your program instead of
                      hand-entering memory. The report discovers each data block
                      automatically.
                    </p>
                    <pre className="overflow-auto rounded-md border border-violet-400/20 bg-slate-950/80 p-3 font-mono text-[11px] leading-5">
                      <span className="text-amber-300">ORG</span>{" "}
                      <span className="text-fuchsia-300">2050H</span>
                      {"\n"}
                      <span className="text-emerald-300">ARRAY:</span>{" "}
                      <span className="text-amber-300">DB</span>{" "}
                      <span className="text-fuchsia-300">
                        05H, 03H, 09H, 01H
                      </span>
                      {"\n"}
                      <span className="text-emerald-300">COUNT:</span>{" "}
                      <span className="text-amber-300">DW</span>{" "}
                      <span className="text-fuchsia-300">0004H</span>
                    </pre>
                    <p>
                      <b className="text-violet-200">DB</b> writes bytes;{" "}
                      <b className="text-violet-200">DW</b> writes 16-bit
                      values. Add a custom report range only when you want to
                      replace the default memory dump.
                    </p>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </TabsContent>
          <TabsContent value="debug">
            <div className="space-y-5">
              <Card className="border-cyan-950 bg-gradient-to-r from-slate-950 to-cyan-950/30">
                <CardContent className="space-y-4 p-4">
                  <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
                    <div className="flex items-center gap-2">
                      <Button
                        className="h-9"
                        onClick={run}
                        variant={running ? "destructive" : "default"}
                      >
                        {running ? <Pause size={15} /> : <Play size={15} />}
                        {running ? "Pause" : "Run"}
                      </Button>
                      <Button
                        className="h-9"
                        variant="secondary"
                        onClick={() => step(false)}
                        disabled={running}
                      >
                        <StepForward size={15} />
                        Step
                      </Button>
                      <Button
                        className="h-9"
                        variant="outline"
                        onClick={stepBack}
                        disabled={running || history.current.length === 0}
                        title="Restore the CPU state before the last executed instruction"
                      >
                        <ChevronLeft size={15} />
                        Step back
                      </Button>
                      <Button
                        className="h-9"
                        variant="outline"
                        onClick={() => resetCpu()}
                      >
                        <RotateCcw size={15} />
                        Reset
                      </Button>
                    </div>
                    <div className="hidden h-9 w-px bg-slate-800 lg:block" />
                    <div className="grid gap-1.5">
                      <Label
                        htmlFor="visual-speed"
                        className="text-[11px] uppercase tracking-wider text-slate-500"
                      >
                        Visual speed
                      </Label>
                      <Select value={speed} onValueChange={setSpeed}>
                        <SelectTrigger id="visual-speed" className="h-9 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="600">Slow · 600 ms</SelectItem>
                          <SelectItem value="300">Normal · 300 ms</SelectItem>
                          <SelectItem value="80">Fast · 80 ms</SelectItem>
                          <SelectItem value="1">Maximum</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label
                        htmlFor="clock-speed"
                        className="text-[11px] uppercase tracking-wider text-slate-500"
                      >
                        Clock frequency
                      </Label>
                      <Select value={clock} onValueChange={setClock}>
                        <SelectTrigger id="clock-speed" className="h-9 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 MHz</SelectItem>
                          <SelectItem value="3.072">3.072 MHz</SelectItem>
                          <SelectItem value="5">5 MHz</SelectItem>
                          <SelectItem value="6">6 MHz</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="ml-auto grid grid-cols-3 gap-2">
                      <Metric label="Instructions" value={cpu.instructions} />
                      <Metric label="T-states" value={cpu.tStates} />
                      <Metric
                        label="Duration"
                        value={`${(cpu.tStates / Number(clock)).toFixed(2)} µs`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2.5 font-mono text-xs">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${running ? "animate-pulse bg-emerald-400" : cpu.halted ? "bg-amber-400" : "bg-cyan-400"}`}
                    />
                    <span className="text-slate-500">Last operation</span>
                    <span className="text-cyan-100">{lastOperation}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-violet-400/20 bg-gradient-to-r from-violet-950/30 to-slate-950">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Cpu size={17} className="text-violet-300" />
                    <CardTitle>Interrupt & trap controls</CardTitle>
                  </div>
                  <span className="text-xs text-slate-500">
                    Inject an interrupt at the current PC for debugger
                    experiments.
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="grid gap-1.5">
                      <Label
                        htmlFor="interrupt-kind"
                        className="text-[11px] uppercase tracking-wider text-slate-500"
                      >
                        Interrupt source
                      </Label>
                      <Select
                        value={interruptKind}
                        onValueChange={(value) =>
                          setInterruptKind(value as typeof interruptKind)
                        }
                      >
                        <SelectTrigger id="interrupt-kind" className="h-9 w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TRAP">TRAP · 0024H</SelectItem>
                          <SelectItem value="RST5.5">
                            RST 5.5 · 002CH
                          </SelectItem>
                          <SelectItem value="RST6.5">
                            RST 6.5 · 0034H
                          </SelectItem>
                          <SelectItem value="RST7.5">
                            RST 7.5 · 003CH
                          </SelectItem>
                          <SelectItem value="INTR">
                            INTR · simulated RST 7
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="h-9"
                      variant="outline"
                      onClick={triggerInterrupt}
                      disabled={running}
                    >
                      Trigger interrupt
                    </Button>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
                      Current PC:{" "}
                      <span className="font-mono text-cyan-200">
                        {hex(cpu.pc, 4)}H
                      </span>{" "}
                      · SP:{" "}
                      <span className="font-mono text-cyan-200">
                        {hex(cpu.sp, 4)}H
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500">
                    The debugger pushes the current PC onto the simulated stack
                    and jumps to the selected vector. INTR is represented as RST
                    7 because a real INTR acknowledge supplies an external
                    opcode.
                  </p>
                </CardContent>
              </Card>
              <div className="grid gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Register file</CardTitle>
                    <span className="text-xs text-slate-500">
                      Click a value to override it
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        ["A", cpu.a],
                        ["B", cpu.b],
                        ["C", cpu.c],
                        ["D", cpu.d],
                        ["E", cpu.e],
                        ["H", cpu.h],
                        ["L", cpu.l],
                        ["PC", cpu.pc],
                      ].map(([n, v]) => (
                        <button
                          key={n}
                          className="rounded-lg border border-slate-800 bg-slate-900/30 p-3 text-left"
                        >
                          <small className="text-slate-500">{n}</small>
                          <b className="block font-mono text-lg text-amber-300">
                            {hex(Number(v), n === "PC" ? 4 : 2)}
                          </b>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                      {Object.entries(cpu.flags).map(([k, v]) => (
                        <span
                          key={k}
                          className={`rounded-md border px-3 py-1 font-mono text-xs ${v ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : "border-slate-800 text-slate-500"}`}
                        >
                          {k.toUpperCase()} {v}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Stack & watches</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 font-mono text-xs">
                    {Array.from({ length: 6 }, (_, i) => (
                      <div
                        key={i}
                        className={`flex justify-between rounded p-2 ${i === 0 ? "bg-cyan-400/10 text-cyan-200" : "bg-slate-900/30"}`}
                      >
                        <span>
                          {hex(cpu.sp + i, 4)}H {i === 0 && "← SP"}
                        </span>
                        <b>{hex(cpu.memory[cpu.sp + i])}</b>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Program listing</CardTitle>
                  <span className="text-xs text-slate-500">
                    Current opcode highlighted
                  </span>
                </CardHeader>
                <CardContent>
                  <table className="w-full font-mono text-xs">
                    <thead className="text-left text-slate-500">
                      <tr>
                        <th>Address</th>
                        <th>Opcode</th>
                        <th>Assembly</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listing.map((l) => (
                        <tr
                          key={l.address}
                          className={
                            l.address === cpu.pc
                              ? "bg-cyan-400/10 text-cyan-100"
                              : "border-t border-slate-900"
                          }
                        >
                          <td className="py-2 text-blue-300">
                            {hex(l.address, 4)}H
                          </td>
                          <td>{l.bytes.map((b) => hex(b)).join(" ")}</td>
                          <td>{highlight(l.text)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="cycles">
            <div className="space-y-5">
              <Card className="border-cyan-400/20 bg-cyan-400/5">
                <CardContent className="p-4 text-sm text-slate-300">
                  <b className="text-cyan-200">Instruction-cycle view:</b> every
                  assembled instruction is shown with its address, machine code,
                  byte size, machine-cycle count, T-states, and timing notes.
                  DB/DW data is separated so a data block at 9000H never expands
                  the program-code view.
                </CardContent>
              </Card>
              <CycleTimingCard listing={listing} />
            </div>
          </TabsContent>
          <TabsContent value="memory">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>64 KB memory navigator</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    Edit individual cells or jump through the entire 0000H–FFFFH
                    address space.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setPage(Math.max(0, page - 1))}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <Input
                    id="memory-page"
                    value={pageAddress}
                    onChange={(e) =>
                      setPageAddress(e.target.value.toUpperCase())
                    }
                    onBlur={() => {
                      const address = parse(pageAddress);
                      if (Number.isNaN(address)) {
                        setPageAddress(hex(page * 256, 4));
                        notify(
                          "Enter a hexadecimal address between 0000H and FFFFH.",
                          "error",
                        );
                      } else setPage(Math.min(255, Math.max(0, address >> 8)));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    aria-label="Memory page address"
                    className="w-24 font-mono text-cyan-300"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setPage(Math.min(255, page + 1))}
                  >
                    <ChevronRight size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(cpu.pc >> 8)}
                    title="Jump to the page containing PC"
                  >
                    PC
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(cpu.sp >> 8)}
                    title="Jump to the page containing SP"
                  >
                    SP
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-5 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-slate-200">
                      Pre-fill memory
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Write hex bytes separated by spaces, or ASCII text in
                      quotes (e.g. 'HELLO'), starting at an address.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_auto] md:items-end">
                    <div className="grid gap-1.5">
                      <Label
                        htmlFor="fill-address"
                        className="text-[11px] uppercase tracking-wider text-slate-500"
                      >
                        Start address
                      </Label>
                      <Input
                        id="fill-address"
                        value={fillAddress}
                        onChange={(e) => setFillAddress(e.target.value)}
                        placeholder="e.g. 9000"
                        className="h-10 font-mono text-amber-200"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label
                        htmlFor="fill-data"
                        className="text-[11px] uppercase tracking-wider text-slate-500"
                      >
                        Data bytes or ASCII
                      </Label>
                      <Input
                        id="fill-data"
                        value={fillData}
                        onChange={(e) => setFillData(e.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") prefill();
                        }}
                        placeholder="14 2F 0A or 'HELLO'"
                        className="h-10 font-mono text-amber-200"
                      />
                    </div>
                    <Button className="h-10 px-5" onClick={prefill}>
                      Write bytes
                    </Button>
                  </div>
                </div>
                <div className="overflow-auto rounded-lg border border-slate-800">
                  <table className="w-full min-w-[850px] text-center font-mono text-xs">
                    <thead className="bg-slate-900/80 text-slate-500">
                      <tr>
                        <th className="p-2 text-left">Address</th>
                        {Array.from({ length: 16 }, (_, i) => (
                          <th key={i}>{i.toString(16).toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 16 }, (_, r) => (
                        <tr key={r} className="border-t border-slate-900">
                          <th className="p-2 text-left text-blue-300">
                            {hex(page * 256 + r * 16, 4)}
                          </th>
                          {mem.slice(r * 16, r * 16 + 16).map((a) => (
                            <td key={a}>
                              <Input
                                aria-label={`memory ${hex(a, 4)}`}
                                key={`${a}-${tick}`}
                                defaultValue={hex(cpu.memory[a])}
                                onBlur={(e) => setMemory(a, e.target.value)}
                                className={`h-8 w-10 border-0 p-1.5 text-center font-mono transition-colors ${recentMemory.has(a) ? "bg-fuchsia-400/25 text-fuchsia-100 ring-1 ring-fuchsia-300/70" : a === cpu.pc ? "bg-amber-400/20 text-amber-200" : "bg-transparent text-slate-200 hover:bg-slate-800"}`}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="ports">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Peripheral I/O matrix</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    8085 IN/OUT addressing supports all 256 device ports
                    (00H–FFH). Add the ports relevant to your lab setup.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPorts((x) => {
                      const after = x.length ? Math.max(...x) + 1 : 0;
                      const next =
                        after <= 255
                          ? after
                          : Array.from({ length: 256 }, (_, i) => i).find(
                              (i) => !x.includes(i),
                            );
                      return next === undefined ? x : [...x, next];
                    })
                  }
                >
                  <Plus size={14} />
                  Add monitor
                </Button>
              </CardHeader>
              <CardContent>
                {ports.length === 0 && (
                  <p className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                    No port monitors. Use "Add monitor" to watch a port.
                  </p>
                )}
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {ports.map((p) => (
                    <div
                      key={p}
                      className="rounded-xl border border-slate-800 bg-slate-900/30 p-4"
                    >
                      <div className="flex justify-between">
                        <b className="font-mono text-cyan-300">
                          PORT {hex(p)}H
                        </b>
                        <div className="flex items-center gap-1">
                          <Wifi size={15} className="text-slate-600" />
                          <button
                            type="button"
                            aria-label={`Remove port ${hex(p)}H`}
                            title="Remove monitor"
                            onClick={() =>
                              setPorts((x) => x.filter((port) => port !== p))
                            }
                            className="rounded p-1 text-slate-500 transition-colors hover:bg-rose-400/10 hover:text-rose-300"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <Label htmlFor={`port-input-${p}`} className="mt-4 block">
                        Input buffer (IN)
                      </Label>
                      <Input
                        id={`port-input-${p}`}
                        defaultValue={hex(cpu.inputs[p])}
                        onBlur={(e) => {
                          cpu.inputs[p] = parse(e.target.value) || 0;
                          rerender();
                        }}
                        className="mt-1 w-full font-mono text-amber-200"
                      />
                      <Label className="mt-3 block">Output latch (OUT)</Label>
                      <div className="mt-1 rounded bg-emerald-400/10 p-2 font-mono text-emerald-300">
                        {hex(cpu.outputs[p])}H{" "}
                        <span className="float-right text-emerald-400/60">
                          {cpu.outputs[p]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="report">
            <div className="grid gap-5 lg:grid-cols-[330px_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Report configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-1">
                    <Label htmlFor="report-title">Experiment title</Label>
                    <Input
                      id="report-title"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-400">
                      Include memory ranges
                    </p>
                    {ranges.length === 0 && (
                      <p className="mb-3 rounded-md border border-slate-800 bg-slate-900/40 p-2 text-xs text-slate-500">
                        No custom ranges selected. Only the program code and any
                        DB/DW data blocks from your source are dumped.
                      </p>
                    )}
                    {ranges.map((r, i) => (
                      <div
                        key={i}
                        className="mb-2 grid grid-cols-[1fr_1fr_auto] items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-2"
                      >
                        <Input
                          aria-label={`Report range ${i + 1} start`}
                          value={hex(r[0], 4)}
                          onChange={(event) => {
                            const value = parse(event.target.value);
                            if (!Number.isNaN(value))
                              setRanges((all) =>
                                all.map((range, index) =>
                                  index === i
                                    ? [value & 0xffff, range[1]]
                                    : range,
                                ),
                              );
                          }}
                          className="h-8 font-mono text-xs"
                        />
                        <Input
                          aria-label={`Report range ${i + 1} end`}
                          value={hex(r[1], 4)}
                          onChange={(event) => {
                            const value = parse(event.target.value);
                            if (!Number.isNaN(value))
                              setRanges((all) =>
                                all.map((range, index) =>
                                  index === i
                                    ? [range[0], value & 0xffff]
                                    : range,
                                ),
                              );
                          }}
                          className="h-8 font-mono text-xs"
                        />
                        <button
                          aria-label={`Remove report range ${i + 1}`}
                          onClick={() =>
                            setRanges((x) => x.filter((_, j) => j !== i))
                          }
                          className="rounded p-1 text-rose-300 hover:bg-rose-400/10"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      // starts with a visible, removable row
                      onClick={() => setRanges((x) => [...x, [0x9000, 0x900f]])}
                    >
                      <Plus size={14} />
                      Add range
                    </Button>
                  </div>
                  <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                    <p className="text-xs font-medium text-slate-400">
                      I/O port summary
                    </p>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="report-io"
                        checked={showIo}
                        onCheckedChange={(value) => setShowIo(value === true)}
                      />
                      <Label
                        htmlFor="report-io"
                        className="text-xs font-normal text-slate-300"
                      >
                        Include section in report
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="report-io-input"
                        checked={showIoInput}
                        disabled={!showIo}
                        onCheckedChange={(value) =>
                          setShowIoInput(value === true)
                        }
                      />
                      <Label
                        htmlFor="report-io-input"
                        className={`text-xs font-normal ${showIo ? "text-slate-300" : "cursor-not-allowed text-slate-600"}`}
                      >
                        Show input buffer column
                      </Label>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setReport(true);
                      notify("Lab report generated.");
                    }}
                  >
                    <FileText size={15} />
                    Generate polished report
                  </Button>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={copyForWord}
                  >
                    <ClipboardCopy size={15} />
                    Copy for MS Word
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={downloadReport}
                  >
                    <Download size={15} />
                    Download HTML
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={async () => {
                      const element = await reportElement();
                      if (!element)
                        return notify("Generate the report first.", "error");
                      window.print();
                    }}
                  >
                    <FileText size={15} />
                    Print / Save as PDF
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Report preview</CardTitle>
                  <span className="text-xs text-slate-500">
                    Print-ready · use “Print / Save as PDF” for a PDF copy
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="min-h-[600px] rounded-lg bg-white p-8 text-slate-900 shadow-inner">
                    {report ? (
                      reportHTML
                    ) : (
                      <div className="grid h-[500px] place-items-center text-center text-slate-400">
                        <div>
                          <BookOpen className="mx-auto mb-3" />
                          <p>
                            Configure selected memory ranges and generate the
                            report.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Toaster richColors theme="dark" position="bottom-right" closeButton />
    </div>
  );
}
function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-[104px] rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-2">
      <span className="block text-[11px] uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <b className="font-mono text-base text-cyan-300">{value}</b>
    </div>
  );
}
function DumpTable({ start, end }: { start: number; end: number }) {
  const rows = [];
  for (let address = start; address <= end; address += 16)
    rows.push(
      <tr key={address}>
        <th className="border border-slate-300 p-2 text-left">
          {hex(address, 4)}H
        </th>
        {Array.from({ length: 16 }, (_, offset) => (
          <td key={offset} className="border border-slate-300 p-2 text-center">
            {address + offset <= end ? hex(cpu.memory[address + offset]) : "—"}
          </td>
        ))}
      </tr>,
    );
  return (
    <table className="mt-2 w-full border-collapse font-mono text-[11px]">
      <thead className="bg-slate-100">
        <tr>
          <th className="border border-slate-300 p-2 text-left">Address</th>
          {Array.from({ length: 16 }, (_, i) => (
            <th key={i} className="border border-slate-300 p-2">
              +{i.toString(16).toUpperCase()}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
}
function Report({
  title,
  listing,
  ranges,
  ports,
  showIo,
  showIoInput,
}: {
  title: string;
  listing: Listing[];
  ranges: [number, number][];
  ports: number[];
  showIo: boolean;
  showIoInput: boolean;
}) {
  const instructionListing = listing.filter((line) => {
    const { op } = splitSource(line.text);
    return op && !["DB", "DW", "ORG", "END"].includes(op);
  });
  const codeRanges = instructionListing.reduce<[number, number][]>(
    (ranges, line) => {
      const start = line.address;
      const end = line.address + line.bytes.length - 1;
      const previous = ranges.at(-1);
      if (previous && previous[1] + 1 === start) previous[1] = end;
      else ranges.push([start, end]);
      return ranges;
    },
    [],
  );
  return (
    <article className="report-document font-serif">
      <div className="border-b-2 border-slate-900 pb-4">
        <p className="font-sans text-xs font-semibold tracking-[.2em] text-cyan-700">
          LABORATORY RECORD · 8085
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          {title || "8085 Microprocessor Experiment Report"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Generated {new Date().toLocaleString()}
        </p>
      </div>
      <section className="mt-7">
        <h2 className="border-l-4 border-cyan-600 pl-3 font-sans text-lg font-bold">
          1. Final processor state
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded border border-slate-200 bg-slate-50 p-3 font-mono text-xs sm:grid-cols-4">
          {[
            `A: ${hex(cpu.a)}H`,
            `B: ${hex(cpu.b)}H`,
            `C: ${hex(cpu.c)}H`,
            `D: ${hex(cpu.d)}H`,
            `E: ${hex(cpu.e)}H`,
            `H: ${hex(cpu.h)}H`,
            `L: ${hex(cpu.l)}H`,
            `PC: ${hex(cpu.pc, 4)}H`,
            `SP: ${hex(cpu.sp, 4)}H`,
            `S:${cpu.flags.s} Z:${cpu.flags.z} AC:${cpu.flags.ac} P:${cpu.flags.p} CY:${cpu.flags.cy}`,
          ].map((v) => (
            <span key={v}>{v}</span>
          ))}
        </div>
        <p className="mt-3 text-sm">
          <b>Execution metrics:</b> {cpu.instructions} instructions ·{" "}
          {cpu.machineCycles} machine cycles · {cpu.tStates} T-states
        </p>
      </section>
      <section className="mt-7">
        <h2 className="border-l-4 border-cyan-600 pl-3 font-sans text-lg font-bold">
          2. Program source & disassembly
        </h2>
        <table className="mt-3 w-full border-collapse font-mono text-[11px]">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-2 text-left">Address</th>
              <th className="p-2 text-left">Opcode</th>
              <th className="p-2 text-left">Source</th>
            </tr>
          </thead>
          <tbody>
            {listing.map((l) => (
              <tr key={l.address} className="border border-slate-200">
                <td className="p-2 text-blue-700">{hex(l.address, 4)}H</td>
                <td className="p-2">{l.bytes.map((b) => hex(b)).join(" ")}</td>
                <td className="whitespace-pre-wrap p-2 leading-5">
                  {reportHighlight(l.text)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="mt-7">
        <h2 className="border-l-4 border-cyan-600 pl-3 font-sans text-lg font-bold">
          3. Memory dumps
        </h2>
        {codeRanges.map(([s, e], index) => (
          <div key={`code-${s}-${e}`} className="mt-4">
            <h3 className="font-sans text-sm font-semibold">
              Range (Program Code{codeRanges.length > 1 ? ` ${index + 1}` : ""}
              ): {hex(s, 4)}H–{hex(e, 4)}H
            </h3>
            <DumpTable start={s} end={e} />
          </div>
        ))}
        {ranges.map(([s, e]) => (
          <div key={`${s}-${e}`} className="mt-5">
            <h3 className="font-sans text-sm font-semibold">
              Range (Data Memory): {hex(s, 4)}H–{hex(e, 4)}H
            </h3>
            <DumpTable start={s} end={e} />
          </div>
        ))}
      </section>
      {showIo && (
        <section className="mt-7">
          <h2 className="border-l-4 border-cyan-600 pl-3 font-sans text-lg font-bold">
            4. I/O port summary
          </h2>
          <table className="mt-3 w-full border-collapse font-mono text-[11px]">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 p-2 text-left">Port</th>
                {showIoInput && (
                  <th className="border border-slate-300 p-2 text-left">
                    Input Buffer
                  </th>
                )}
                <th className="border border-slate-300 p-2 text-left">
                  Output Latch
                </th>
              </tr>
            </thead>
            <tbody>
              {ports.map((p) => (
                <tr key={p}>
                  <td className="border border-slate-300 p-2">{hex(p)}H</td>
                  {showIoInput && (
                    <td className="border border-slate-300 p-2">
                      {hex(cpu.inputs[p])}H ({cpu.inputs[p]})
                    </td>
                  )}
                  <td className="border border-slate-300 p-2">
                    {hex(cpu.outputs[p])}H ({cpu.outputs[p]})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </article>
  );
}
createRoot(document.getElementById("app")!).render(<App />);

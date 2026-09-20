import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  Box,
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
  Upload,
  Wifi,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage, HighlightStyle, syntaxHighlighting, type StringStream } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { oneDark } from "@codemirror/theme-one-dark";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import "./styles.css";
import { Cpu8085 } from "./core/cpu";
import { hex, type Listing } from "./core/types";
const starter = `; Addition with result capture and an I/O notification
ORG 8000H
LXI SP, FFFFH
MVI A, 14H
MVI B, 2FH
ADD B
STA 9000H
OUT 01H
PUSH PSW
HLT`;
const cpu = new Cpu8085();
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
const asmEditorTheme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "#060a12", color: "#e2e8f0" },
  ".cm-scroller": { overflow: "auto", fontFamily: "var(--font-mono)", lineHeight: "1.6", backgroundColor: "#060a12" },
  ".cm-content": { caretColor: "#67e8f9", padding: "14px 0 96px", minHeight: "100%" },
  ".cm-gutters": { backgroundColor: "#090e18", color: "#4b6689", borderRight: "1px solid #1e293b" },
  ".cm-activeLine": { backgroundColor: "#102037" },
  ".cm-activeLineGutter": { backgroundColor: "#102037", color: "#7dd3fc" },
  ".cm-cursor": { borderLeftColor: "#67e8f9" },
  ".cm-selectionBackground": { backgroundColor: "#155e75 !important" },
  "&.cm-focused .cm-selectionBackground": { backgroundColor: "#0e7490 !important" },
}, { dark: true });
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
    if (stream.match(";")) { stream.skipToEnd(); return "comment"; }
    if (stream.match(/^[A-Za-z_.$][\w.$]*:/)) return "labelName";
    if (stream.match(/^['\"][^'\"]*['\"]/)) return "string";
    if (stream.match(/^(?:[0-9A-F]+H|0X[0-9A-F]+|\d+)/i)) return "number";
    if (stream.match(/^[A-Za-z][\w]*/)) {
      const word = stream.current().toUpperCase();
      if (labels.has(word)) return "keyword";
      if (["A", "B", "C", "D", "E", "H", "L", "M", "SP", "PSW"].includes(word)) return "atom";
      return "variableName";
    }
    stream.next();
    return null;
  },
};
const asmExtensions = [oneDark, StreamLanguage.define(asm8085), syntaxHighlighting(asmHighlight), asmEditorTheme];
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
  return <>
    {body.split(/(\s+|,)/).map((token, index) => labels.has(token.toUpperCase()) ? <span key={index} className="font-bold text-amber-700">{token}</span> : /^[A-Z.$]+:$/.test(token) ? <span key={index} className="font-bold text-emerald-700">{token}</span> : /^[0-9A-F]+H$/i.test(token) ? <span key={index} className="text-fuchsia-700">{token}</span> : /^(A|B|C|D|E|H|L|M|SP|PSW)$/i.test(token) ? <span key={index} className="font-semibold text-cyan-700">{token}</span> : token)}
    {comment && <span className="italic text-slate-500">;{comment}</span>}
  </>;
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
  const conditionalReturns = ["RNZ", "RZ", "RNC", "RC", "RPO", "RPE", "RP", "RM"];
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
        if (Number.isNaN(target)) throw Error("ORG requires a hexadecimal address");
        address = target;
        return;
      }
      if (op === "END") return;
      let bytes: number[];
      if (op === "DB")
        bytes = args.flatMap((x) =>
          /^['\"].*['\"]$/.test(x) ? [...x.slice(1, -1)].map((c) => c.charCodeAt(0)) : (() => {
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
  const mergedDataRanges = dataRanges.reduce<[number, number][]>((merged, range) => {
    const previous = merged.at(-1);
    if (previous && previous[1] + 1 === range[0]) previous[1] = range[1];
    else merged.push(range);
    return merged;
  }, []);
  return { listing, errors, dataRanges: mergedDataRanges };
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
    [reportTitle, setReportTitle] = useState("8085 Microprocessor Experiment Report"),
    [speed, setSpeed] = useState("80"),
    [clock, setClock] = useState("5"),
    [running, setRunning] = useState(false),
    [lastOperation, setLastOperation] = useState("Waiting to execute"),
    [recentMemory, setRecentMemory] = useState<Set<number>>(new Set());
  const timer = useRef<number | undefined>();
  const importInput = useRef<HTMLInputElement>(null);
  const programmed = useRef<Set<number>>(new Set());
  const flashTimers = useRef<Map<number, number>>(new Map());
  const rerender = () => setTick((x) => x + 1);
  const assembled = useMemo(() => assembleSource(code, pc), [code, pc]);
  const listing = assembled.listing;
  const breakpointAddresses = useMemo(
    () => new Set(listing.filter((line) => breakpoints.has(line.line)).map((line) => line.address)),
    [listing, breakpoints],
  );
  function notify(message: string, type: "success" | "error" = "success") {
    toast[type](message);
  }
  function flashMemory(addresses: Iterable<number>) {
    const unique = [...new Set(addresses)].map((address) => address & 0xffff);
    if (!unique.length) return;
    setRecentMemory((current) => new Set([...current, ...unique]));
    unique.forEach((address) => {
      const oldTimer = flashTimers.current.get(address);
      if (oldTimer) window.clearTimeout(oldTimer);
      flashTimers.current.set(address, window.setTimeout(() => {
        setRecentMemory((current) => {
          const next = new Set(current);
          next.delete(address);
          return next;
        });
        flashTimers.current.delete(address);
      }, 900));
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
  function assemble() {
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
    flashMemory(programmed.current);
    notify(`Assembled ${listing.length} statements at ${hex(cpu.pc, 4)}H`);
    rerender();
    return true;
  }
  function stop() {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = undefined;
    setRunning(false);
  }
  function step(ignoreBreakpoint = true) {
    if (cpu.halted) {
      notify("Processor is halted — reset to run again.", "error");
      return;
    }
    if (!ignoreBreakpoint && breakpointAddresses.has(cpu.pc)) {
      stop();
      notify(`Paused at breakpoint ${hex(cpu.pc, 4)}H.`);
      return;
    }
    try {
      const instruction = cpu.step();
      flashMemory(cpu.lastWrites);
      setLastOperation(`${hex(instruction.address, 4)}H · ${instruction.instruction}`);
      rerender();
      if (cpu.halted) {
        stop();
        notify("Program halted normally (HLT).");
      }
    } catch (e) {
      stop();
      notify((e as Error).message, "error");
    }
  }
  function run() {
    if (running) {
      stop();
      return;
    }
    if (cpu.instructions === 0 && !assemble()) return;
    setRunning(true);
    timer.current = window.setInterval(() => step(false), Number(speed));
  }
  useEffect(() => () => {
    stop();
    flashTimers.current.forEach((timerId) => window.clearTimeout(timerId));
  }, []);
  useEffect(() => setPageAddress(hex(page * 256, 4)), [page]);
  function setMemory(a: number, v: string) {
    const n = parse(v);
    if (!Number.isNaN(n)) {
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
  const reportRanges = useMemo(
    () => [...assembled.dataRanges, ...(ranges.length ? ranges : [[0x9000, 0x900f] as [number, number]])],
    [assembled.dataRanges, ranges],
  );
  const reportHTML = <Report title={reportTitle} listing={listing} ranges={reportRanges} ports={ports} />;
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-cyan-400/30">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#090e18]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 font-mono font-black text-slate-950 shadow-lg shadow-cyan-500/20">
              85
            </div>
            <div>
              <h1 className="font-semibold tracking-tight">
                8085 <span className="text-cyan-300">Lab Studio</span>
              </h1>
              <p className="text-xs text-slate-500">
                Compiler · emulator · observability · reporting
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-400">
            <span
              className={`h-2 w-2 rounded-full ${cpu.halted ? "bg-amber-400" : "bg-cyan-400 animate-pulse"}`}
            />
            {cpu.halted ? "HALTED" : "READY"}
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
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Source workspace</CardTitle>
                    <p className="mt-1 text-xs text-slate-500">
                      Full editor surface · line numbers · syntax colors · live diagnostics
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input ref={importInput} type="file" accept=".asm,.txt,text/plain" className="hidden" onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => { setCode(String(reader.result ?? "")); notify(`Imported ${file.name}`); };
                      reader.readAsText(file);
                      event.target.value = "";
                    }} />
                    <Button size="sm" variant="outline" onClick={() => importInput.current?.click()}>
                      <Upload size={14} />
                      Import
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { downloadFile("8085-program.asm", code, "text/plain"); notify("Assembly source downloaded."); }}>
                      <Download size={14} />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[min(62vh,680px)] min-h-[420px] overflow-hidden rounded-lg border border-slate-800">
                    <CodeMirror
                      value={code}
                      height="100%"
                      extensions={asmExtensions}
                      onChange={setCode}
                      basicSetup={{ lineNumbers: true, highlightActiveLine: true, foldGutter: true }}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button onClick={assemble}>
                      <Box size={15} />
                      Assemble program
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setCode(starter)}
                    >
                      Load sample
                    </Button>
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
                    <span className={`rounded-full px-2 py-1 text-xs ${assembled.errors.length ? "bg-rose-400/10 text-rose-300" : "bg-emerald-400/10 text-emerald-300"}`}>
                      {assembled.errors.length ? `${assembled.errors.length} issue${assembled.errors.length === 1 ? "" : "s"}` : "Ready"}
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
                      <div role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200">
                        <b className="block pb-1">Live assembly feedback</b>
                        {assembled.errors.slice(0, 3).map((error) => <p key={error}>{error}</p>)}
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
                        <b className="block text-violet-200">Detected data declarations</b>
                        <p className="mt-1 text-slate-400">These DB/DW ranges are included automatically in the lab report.</p>
                        <div className="mt-2 flex flex-wrap gap-1 font-mono text-violet-200">
                          {assembled.dataRanges.map(([start, end]) => <span key={`${start}-${end}`} className="rounded bg-violet-400/10 px-1.5 py-1">{hex(start, 4)}H–{hex(end, 4)}H</span>)}
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
                    <p>Example: <code className="text-violet-200">ORG 2050H<br />ARRAY: DB 05H, 03H, 09H, 01H</code></p>
                    <p>Use <kbd className="rounded bg-slate-800 px-1.5 py-1">Ctrl</kbd> + <kbd className="rounded bg-slate-800 px-1.5 py-1">F</kbd> to find source text.</p>
                  </CardContent>
                </Card>
                <Card className="border-violet-400/25 bg-gradient-to-br from-violet-400/10 to-slate-950">
                  <CardHeader>
                    <div>
                      <CardTitle>Memory recipe</CardTitle>
                      <p className="mt-1 text-xs text-violet-200/70">Lab Studio extension</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-slate-300">
                    <p>Declare test data beside your program instead of hand-entering memory. The report discovers each data block automatically.</p>
                    <pre className="overflow-auto rounded-md border border-violet-400/20 bg-slate-950/80 p-3 font-mono text-[11px] leading-5"><span className="text-amber-300">ORG</span> <span className="text-fuchsia-300">2050H</span>{"\n"}<span className="text-emerald-300">ARRAY:</span> <span className="text-amber-300">DB</span> <span className="text-fuchsia-300">05H, 03H, 09H, 01H</span>{"\n"}<span className="text-emerald-300">COUNT:</span> <span className="text-amber-300">DW</span> <span className="text-fuchsia-300">0004H</span></pre>
                    <p><b className="text-violet-200">DB</b> writes bytes; <b className="text-violet-200">DW</b> writes 16-bit values. Add a custom report range only when you want to replace the default memory dump.</p>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </TabsContent>
          <TabsContent value="debug">
            <div className="space-y-5">
              <Card className="border-cyan-950 bg-gradient-to-r from-slate-950 to-cyan-950/30">
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <Button onClick={run} variant={running ? "destructive" : "default"}>
                    {running ? <Pause size={15} /> : <Play size={15} />}
                    {running ? "Pause" : "Run"}
                  </Button>
                  <Button variant="secondary" onClick={step} disabled={running}>
                    <StepForward size={15} />
                    Step
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      stop();
                      cpu.reset(listing[0]?.address ?? pc);
                      rerender();
                      notify("Processor reset.");
                    }}
                  >
                    <RotateCcw size={15} />
                    Reset
                  </Button>
                  <div className="grid gap-1 rounded-lg border border-slate-800 bg-slate-950/70 p-2">
                    <Label htmlFor="visual-speed">Visual speed</Label>
                    <Select value={speed} onValueChange={setSpeed}>
                      <SelectTrigger id="visual-speed"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="600">Slow · 600 ms</SelectItem><SelectItem value="300">Normal · 300 ms</SelectItem><SelectItem value="80">Fast · 80 ms</SelectItem><SelectItem value="1">Maximum</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1 rounded-lg border border-slate-800 bg-slate-950/70 p-2">
                    <Label htmlFor="clock-speed">Clock frequency</Label>
                    <Select value={clock} onValueChange={setClock}>
                      <SelectTrigger id="clock-speed"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="1">1 MHz</SelectItem><SelectItem value="3.072">3.072 MHz</SelectItem><SelectItem value="5">5 MHz</SelectItem><SelectItem value="6">6 MHz</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="ml-auto grid grid-cols-3 divide-x divide-slate-800 rounded-lg border border-slate-800 bg-slate-950/70 text-xs">
                    <Metric label="Instructions" value={cpu.instructions} />
                    <Metric label="T-states" value={cpu.tStates} />
                    <Metric
                      label="Duration"
                      value={`${(cpu.tStates / Number(clock)).toFixed(2)} µs`}
                    />
                  </div>
                  <div className="w-full rounded-lg border border-cyan-400/15 bg-slate-950/70 px-3 py-2 font-mono text-xs text-cyan-100">
                    <span className="mr-2 text-slate-500">Last operation</span>
                    {lastOperation}
                  </div>
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
                    onChange={(e) => setPageAddress(e.target.value.toUpperCase())}
                    onBlur={() => {
                      const address = parse(pageAddress);
                      if (Number.isNaN(address)) {
                        setPageAddress(hex(page * 256, 4));
                        notify("Enter a hexadecimal address between 0000H and FFFFH.", "error");
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
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-5 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/30 p-4 md:grid-cols-[auto_150px_minmax(260px,1fr)_auto] md:items-end">
                  <div className="text-sm font-medium text-slate-300">
                    Pre-fill memory
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="fill-address">Start address</Label>
                    <Input
                      id="fill-address"
                      value={fillAddress}
                      onChange={(e) => setFillAddress(e.target.value)}
                      placeholder="e.g. 9000"
                      className="font-mono text-amber-200"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="fill-data">Data bytes or ASCII</Label>
                    <Input
                      id="fill-data"
                      value={fillData}
                      onChange={(e) => setFillData(e.target.value)}
                      placeholder="14 2F 0A or 'HELLO'"
                      className="font-mono text-amber-200"
                    />
                  </div>
                  <Button size="sm" onClick={prefill}>
                    Write bytes
                  </Button>
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
                    setPorts((x) => [...x, (Math.max(...x) + 1) & 255])
                  }
                >
                  <Plus size={14} />
                  Add monitor
                </Button>
              </CardHeader>
              <CardContent>
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
                        <Wifi size={15} className="text-slate-600" />
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
                    <Input id="report-title" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-400">
                      Include memory ranges
                    </p>
                    {ranges.length === 0 && <p className="mb-3 rounded-md border border-slate-800 bg-slate-900/40 p-2 text-xs text-slate-500">Default report dump: 9000H–900FH. Adding a custom range replaces this default; source DB/DW data blocks are always included.</p>}
                    {ranges.map((r, i) => (
                      <div
                        key={i}
                        className="mb-2 grid grid-cols-[1fr_1fr_auto] items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-2"
                      >
                        <Input aria-label={`Report range ${i + 1} start`} value={hex(r[0], 4)} onChange={(event) => {
                          const value = parse(event.target.value);
                          if (!Number.isNaN(value)) setRanges((all) => all.map((range, index) => index === i ? [value & 0xffff, range[1]] : range));
                        }} className="h-8 font-mono text-xs" />
                        <Input aria-label={`Report range ${i + 1} end`} value={hex(r[1], 4)} onChange={(event) => {
                          const value = parse(event.target.value);
                          if (!Number.isNaN(value)) setRanges((all) => all.map((range, index) => index === i ? [range[0], value & 0xffff] : range));
                        }} className="h-8 font-mono text-xs" />
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
                      onClick={() => setRanges((x) => [...x, [0x9100, 0x910f]])}
                    >
                      <Plus size={14} />
                      Add range
                    </Button>
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
                    onClick={() => {
                      setReport(true);
                      navigator.clipboard.writeText(
                        document.querySelector(".font-serif")?.textContent ??
                          "",
                      );
                      notify("Report copied for MS Word.");
                    }}
                  >
                    <ClipboardCopy size={15} />
                    Copy for MS Word
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setReport(true);
                      const report = document.querySelector(".report-document")?.outerHTML;
                      if (!report) return;
                      downloadFile("8085-lab-report.html", `<!doctype html><html><head><meta charset="utf-8"><title>${reportTitle}</title><style>body{max-width:1200px;margin:32px auto;font-family:Georgia,serif}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:8px}</style></head><body>${report}</body></html>`, "text/html");
                      notify("HTML report downloaded.");
                    }}
                  >
                    <Download size={15} />
                    Download HTML
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Report preview</CardTitle>
                  <span className="text-xs text-slate-500">
                    No execution trace included
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
    <div className="px-5 py-2">
      <span className="block text-slate-500">{label}</span>
      <b className="font-mono text-cyan-300">{value}</b>
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
}: {
  title: string;
  listing: Listing[];
  ranges: [number, number][];
  ports: number[];
}) {
  const codeStart = listing[0]?.address ?? 0,
    codeEnd =
      (listing.at(-1)?.address ?? 0) + (listing.at(-1)?.bytes.length ?? 1) - 1;
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
                <td className="whitespace-pre-wrap p-2 leading-5">{reportHighlight(l.text)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="mt-7">
        <h2 className="border-l-4 border-cyan-600 pl-3 font-sans text-lg font-bold">
          3. Memory dumps
        </h2>
        <h3 className="mt-4 font-sans text-sm font-semibold">
          Range (Program Code):
        </h3>
        <DumpTable start={codeStart} end={codeEnd} />
        {ranges.map(([s, e]) => (
          <div key={`${s}-${e}`} className="mt-5">
            <h3 className="font-sans text-sm font-semibold">
              Range (Data Memory): {hex(s, 4)}H–{hex(e, 4)}H
            </h3>
            <DumpTable start={s} end={e} />
          </div>
        ))}
      </section>
      <section className="mt-7">
        <h2 className="border-l-4 border-cyan-600 pl-3 font-sans text-lg font-bold">
          4. I/O port summary
        </h2>
        <table className="mt-3 w-full border-collapse font-mono text-[11px]">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-300 p-2 text-left">Port</th>
              <th className="border border-slate-300 p-2 text-left">
                Input Buffer
              </th>
              <th className="border border-slate-300 p-2 text-left">
                Output Latch
              </th>
            </tr>
          </thead>
          <tbody>
            {ports.map((p) => (
              <tr key={p}>
                <td className="border border-slate-300 p-2">{hex(p)}H</td>
                <td className="border border-slate-300 p-2">
                  {hex(cpu.inputs[p])}H ({cpu.inputs[p]})
                </td>
                <td className="border border-slate-300 p-2">
                  {hex(cpu.outputs[p])}H ({cpu.outputs[p]})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </article>
  );
}
createRoot(document.getElementById("app")!).render(<App />);

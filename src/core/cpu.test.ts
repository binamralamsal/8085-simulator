import { expect, test } from "bun:test";
import { Cpu8085 } from "./cpu";

test("executes arithmetic, a conditional branch, and HLT", () => {
  const cpu = new Cpu8085();
  cpu.memory.set([0x06, 0x03, 0x3e, 0x00, 0x80, 0x05, 0xc2, 0x04, 0x00, 0x76]);
  cpu.reset(0);
  while (!cpu.halted) cpu.step();
  expect(cpu.a).toBe(6);
  expect(cpu.instructions).toBe(12);
  expect(cpu.tStates).toBeGreaterThan(0);
});

test("writes and reads 8085 I/O ports", () => {
  const cpu = new Cpu8085();
  cpu.memory.set([0x3e, 0xab, 0xd3, 0x42, 0xdb, 0x42, 0x76]);
  cpu.inputs[0x42] = 0x55;
  cpu.reset(0);
  cpu.inputs[0x42] = 0x55;
  while (!cpu.halted) cpu.step();
  expect(cpu.outputs[0x42]).toBe(0xab);
  expect(cpu.a).toBe(0x55);
});

test("executes a CALL subroutine and returns to the caller", () => {
  const cpu = new Cpu8085();
  // LXI SP, FFFFH; MVI A, 01H; CALL 8009H; HLT; INR A; RET
  cpu.memory.set([0x31, 0xff, 0xff, 0x3e, 0x01, 0xcd, 0x09, 0x80, 0x76, 0x3c, 0xc9], 0x8000);
  cpu.reset(0x8000);
  while (!cpu.halted) cpu.step();
  expect(cpu.a).toBe(0x02);
  expect(cpu.sp).toBe(0xffff);
});

test("runs a labelled bubble-sort style subroutine to completion", () => {
  const cpu = new Cpu8085();
  // Main: LXI H,2050H; CALL SORT; HLT. SORT uses CMP, conditional branches,
  // memory MOVs, and RET — the same control-flow pattern used by the editor sample.
  cpu.memory.set(
    [
      0x21, 0x50, 0x20, 0xcd, 0x07, 0x80, 0x76, 0x0e, 0x04, 0x21, 0x50,
      0x20, 0x41, 0x7e, 0x23, 0xbe, 0xda, 0x1b, 0x80, 0xca, 0x1b, 0x80,
      0x56, 0x77, 0x2b, 0x72, 0x23, 0x05, 0xc2, 0x0d, 0x80, 0x0d, 0xc2,
      0x09, 0x80, 0xc9,
    ],
    0x8000,
  );
  cpu.memory.set([3, 1, 5, 2, 4], 0x2050);
  cpu.reset(0x8000);
  while (!cpu.halted) cpu.step();
  expect(Array.from(cpu.memory.slice(0x2050, 0x2055))).toEqual([1, 2, 3, 4, 5]);
  expect(cpu.sp).toBe(0xffff);
});

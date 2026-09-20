export type Flags = { s: number; z: number; ac: number; p: number; cy: number };
export type CpuSnapshot = { a:number;b:number;c:number;d:number;e:number;h:number;l:number;pc:number;sp:number;flags:Flags };
export type TraceEntry = { address:number; opcode:number[]; instruction:string; cycles:number; tStates:number; changes:string[] };
export type Listing = { address:number; bytes:number[]; text:string; line:number };
export const hex = (value:number, size=2) => (value & (size === 2 ? 0xff : 0xffff)).toString(16).toUpperCase().padStart(size, "0");

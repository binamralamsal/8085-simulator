import { hex, type CpuSnapshot, type Flags, type TraceEntry } from "./types";

const parity = (v:number) => Number((v & 0xff).toString(2).split("1").length % 2 === 1);
export class Cpu8085 {
  memory = new Uint8Array(0x10000); inputs = new Uint8Array(256); outputs = new Uint8Array(256);
  a=0;b=0;c=0;d=0;e=0;h=0;l=0;pc=0;sp=0xffff; halted=false; inte=false;
  flags:Flags={s:0,z:0,ac:0,p:1,cy:0}; instructions=0; machineCycles=0; tStates=0; trace:TraceEntry[]=[]; modified = new Set<number>(); lastWrites = new Set<number>();
  reset(entry=0) { this.a=this.b=this.c=this.d=this.e=this.h=this.l=0; this.pc=entry;this.sp=0xffff;this.halted=false;this.inte=false;this.flags={s:0,z:0,ac:0,p:1,cy:0};this.instructions=this.machineCycles=this.tStates=0;this.trace=[];this.modified.clear();this.lastWrites.clear(); }
  snapshot():CpuSnapshot { return {a:this.a,b:this.b,c:this.c,d:this.d,e:this.e,h:this.h,l:this.l,pc:this.pc,sp:this.sp,flags:{...this.flags}}; }
  get hl(){ return (this.h<<8)|this.l } set hl(v:number){this.h=(v>>8)&255;this.l=v&255}
  get bc(){ return (this.b<<8)|this.c } set bc(v:number){this.b=(v>>8)&255;this.c=v&255}
  get de(){ return (this.d<<8)|this.e } set de(v:number){this.d=(v>>8)&255;this.e=v&255}
  get psw(){return (this.a<<8)|this.flagByte()} set psw(v:number){this.a=v>>8;this.setFlagByte(v&255)}
  private flagByte(){return (this.flags.s<<7)|(this.flags.z<<6)|(this.flags.ac<<4)|(this.flags.p<<2)|2|this.flags.cy}
  private setFlagByte(v:number){this.flags={s:(v>>7)&1,z:(v>>6)&1,ac:(v>>4)&1,p:(v>>2)&1,cy:v&1}}
  private read16(a:number){return this.memory[a&65535]|(this.memory[(a+1)&65535]<<8)}
  private write(a:number,v:number){this.memory[a&65535]=v&255;this.modified.add(a&65535);this.lastWrites.add(a&65535)}
  private push(v:number){this.sp=(this.sp-1)&65535;this.write(this.sp,v>>8);this.sp=(this.sp-1)&65535;this.write(this.sp,v)}
  private pop(){const v=this.read16(this.sp);this.sp=(this.sp+2)&65535;return v}
  private reg(i:number){return i===0?this.b:i===1?this.c:i===2?this.d:i===3?this.e:i===4?this.h:i===5?this.l:i===6?this.memory[this.hl]:this.a}
  private setReg(i:number,v:number){v&=255;if(i===0)this.b=v;else if(i===1)this.c=v;else if(i===2)this.d=v;else if(i===3)this.e=v;else if(i===4)this.h=v;else if(i===5)this.l=v;else if(i===6)this.write(this.hl,v);else this.a=v}
  private szp(v:number){v&=255;this.flags.s=v>>7;this.flags.z=Number(v===0);this.flags.p=parity(v)}
  private add(v:number, carry=0){const x=this.a+v+carry;this.flags.cy=Number(x>255);this.flags.ac=Number(((this.a&15)+(v&15)+carry)>15);this.a=x&255;this.szp(this.a)}
  private sub(v:number, borrow=0, write=true){const x=this.a-v-borrow;this.flags.cy=Number(x<0);this.flags.ac=Number(((this.a&15)-(v&15)-borrow)<0);const r=x&255;if(write){this.a=r;this.szp(r)}else this.szp(r)}
  private condition(i:number){return [!this.flags.z,!!this.flags.z,!this.flags.cy,!!this.flags.cy,!this.flags.p,!!this.flags.p,!this.flags.s,!!this.flags.s][i]}
  step():TraceEntry { if(this.halted) throw new Error("Processor is halted"); this.lastWrites.clear(); const pc=this.pc, op=this.memory[this.pc++]; const before=this.snapshot(); let cycles=1,t=4;
    const imm=()=>this.memory[this.pc++]; const word=()=>{const x=this.read16(this.pc);this.pc=(this.pc+2)&65535;return x};
    const rr=(i:number)=>i===0?this.bc:i===1?this.de:i===2?this.hl:this.sp; const setrr=(i:number,v:number)=>{if(i===0)this.bc=v;else if(i===1)this.de=v;else if(i===2)this.hl=v;else this.sp=v&65535};
    if((op&0xc0)===0x40){ if(op===0x76)this.halted=true; else this.setReg((op>>3)&7,this.reg(op&7)); t=((op&7)===6||((op>>3)&7)===6)?7:5; }
    else if((op&0xc0)===0x80){const v=this.reg(op&7),g=(op>>3)&7;if(g===0)this.add(v);else if(g===1)this.add(v,this.flags.cy);else if(g===2)this.sub(v);else if(g===3)this.sub(v,this.flags.cy);else if(g===4){this.a&=v;this.flags.cy=0;this.flags.ac=1;this.szp(this.a)}else if(g===5){this.a^=v;this.flags.cy=this.flags.ac=0;this.szp(this.a)}else if(g===6){this.a|=v;this.flags.cy=this.flags.ac=0;this.szp(this.a)}else this.sub(v,0,false);t=(op&7)===6?7:4;}
    else if((op&0xc7)===0x06){this.setReg((op>>3)&7,imm());t=((op>>3)&7)===6?10:7}
    else if((op&0xc7)===0x04){const i=(op>>3)&7,v=this.reg(i),r=(v+1)&255;this.flags.ac=Number((v&15)===15);this.setReg(i,r);this.szp(r);t=i===6?10:5}
    else if((op&0xc7)===0x05){const i=(op>>3)&7,v=this.reg(i),r=(v-1)&255;this.flags.ac=Number((v&15)===0);this.setReg(i,r);this.szp(r);t=i===6?10:5}
    else if((op&0xcf)===0x01){setrr((op>>4)&3,word());t=10}
    else if((op&0xcf)===0x03){const i=(op>>4)&3;setrr(i,(rr(i)+1)&65535);t=6}
    else if((op&0xcf)===0x0b){const i=(op>>4)&3;setrr(i,(rr(i)-1)&65535);t=6}
    else if((op&0xcf)===0x09){const i=(op>>4)&3,x=this.hl+rr(i);this.flags.cy=Number(x>65535);this.hl=x;t=10}
    else if((op&0xcf)===0xc5){this.push((op>>4&3)===0?this.bc:(op>>4&3)===1?this.de:(op>>4&3)===2?this.hl:this.psw);t=12}
    else if((op&0xcf)===0xc1){const v=this.pop(),i=(op>>4)&3;if(i===0)this.bc=v;else if(i===1)this.de=v;else if(i===2)this.hl=v;else this.psw=v;t=10}
    else if((op&0xc7)===0xc2){const a=word();if(this.condition((op>>3)&7)){this.pc=a;t=10}else t=7}
    else if((op&0xc7)===0xc4){const a=word();if(this.condition((op>>3)&7)){this.push(this.pc);this.pc=a;t=18}else t=9}
    else if((op&0xc7)===0xc0){if(this.condition((op>>3)&7)){this.pc=this.pop();t=12}else t=6}
    else if((op&0xc7)===0xc7){this.push(this.pc);this.pc=op&0x38;t=12}
    else switch(op){
      case 0x00:break;case 0x02:this.write(this.bc,this.a);t=7;break;case 0x12:this.write(this.de,this.a);t=7;break;case 0x0a:this.a=this.memory[this.bc];t=7;break;case 0x1a:this.a=this.memory[this.de];t=7;break;
      case 0x07:{const c=this.a>>7;this.a=((this.a<<1)|c)&255;this.flags.cy=c;break} case 0x0f:{const c=this.a&1;this.a=(this.a>>1)|(c<<7);this.flags.cy=c;break} case 0x17:{const c=this.a>>7;this.a=((this.a<<1)|this.flags.cy)&255;this.flags.cy=c;break} case 0x1f:{const c=this.a&1;this.a=(this.a>>1)|(this.flags.cy<<7);this.flags.cy=c;break}
      case 0x22:{const a=word();this.write(a,this.l);this.write(a+1,this.h);t=16;break}case 0x2a:{const a=word();this.l=this.memory[a];this.h=this.memory[(a+1)&65535];t=16;break}case 0x32:{this.write(word(),this.a);t=13;break}case 0x3a:{this.a=this.memory[word()];t=13;break}
      case 0x27:{let x=this.a,add=0;if((x&15)>9||this.flags.ac)add|=6;if(x>0x99||this.flags.cy){add|=0x60;this.flags.cy=1}this.add(add);break}case 0x2f:this.a^=255;break;case 0x37:this.flags.cy=1;break;case 0x3f:this.flags.cy^=1;break;
      case 0x31:this.sp=word();t=10;break;case 0x33:this.sp=(this.sp+1)&65535;t=6;break;case 0x3b:this.sp=(this.sp-1)&65535;t=6;break;case 0x39:{const x=this.hl+this.sp;this.flags.cy=Number(x>65535);this.hl=x;t=10;break}
      case 0xc3:this.pc=word();t=10;break;case 0xcd:{const a=word();this.push(this.pc);this.pc=a;t=18;break}case 0xc9:this.pc=this.pop();t=10;break;case 0xe9:this.pc=this.hl;t=5;break;case 0xf9:this.sp=this.hl;t=5;break;
      case 0xd3:this.outputs[imm()]=this.a;t=10;break;case 0xdb:this.a=this.inputs[imm()];t=10;break;case 0xeb:{const x=this.de;this.de=this.hl;this.hl=x;t=4;break}case 0xe3:{const x=this.read16(this.sp),h=this.hl;this.write(this.sp,h&255);this.write(this.sp+1,h>>8);this.hl=x;t=18;break}
      case 0xf3:this.inte=false;break;case 0xfb:this.inte=true;break;case 0x20:case 0x30:break; // undocumented NOPs
      case 0xc6:this.add(imm());t=7;break;case 0xce:this.add(imm(),this.flags.cy);t=7;break;case 0xd6:this.sub(imm());t=7;break;case 0xde:this.sub(imm(),this.flags.cy);t=7;break;case 0xe6:this.a&=imm();this.flags.cy=0;this.flags.ac=1;this.szp(this.a);t=7;break;case 0xee:this.a^=imm();this.flags.cy=this.flags.ac=0;this.szp(this.a);t=7;break;case 0xf6:this.a|=imm();this.flags.cy=this.flags.ac=0;this.szp(this.a);t=7;break;case 0xfe:this.sub(imm(),0,false);t=7;break;
      default: break;
    }
    this.instructions++;this.machineCycles+=cycles;this.tStates+=t; const changes:string[]=[]; for(const k of ["a","b","c","d","e","h","l","pc","sp"] as const) if(before[k]!==this[k])changes.push(`${k.toUpperCase()}:${hex(before[k],k==="pc"||k==="sp"?4:2)}→${hex(this[k],k==="pc"||k==="sp"?4:2)}`); const entry={address:pc,opcode:Array.from(this.memory.slice(pc,this.pc)),instruction:disassemble(this.memory,pc),cycles,tStates:t,changes};this.trace.unshift(entry);if(this.trace.length>500)this.trace.pop();return entry;
  }
}
const r=["B","C","D","E","H","L","M","A"]; const rp=["B","D","H","SP"];
export function disassemble(m:Uint8Array,a:number){const o=m[a],b=()=>hex(m[a+1]),w=()=>hex(m[a+2])+hex(m[a+1]);if((o&0xc0)===0x40)return o===0x76?"HLT":`MOV ${r[(o>>3)&7]}, ${r[o&7]}`;if((o&0xc0)===0x80)return ["ADD","ADC","SUB","SBB","ANA","XRA","ORA","CMP"][(o>>3)&7]+` ${r[o&7]}`;if((o&0xc7)===6)return `MVI ${r[(o>>3)&7]}, ${b()}H`;if((o&0xcf)===1)return `LXI ${rp[(o>>4)&3]}, ${w()}H`;if((o&0xc7)===4)return `INR ${r[(o>>3)&7]}`;if((o&0xc7)===5)return `DCR ${r[(o>>3)&7]}`;if((o&0xcf)===3)return `INX ${rp[(o>>4)&3]}`;if((o&0xcf)===0x0b)return `DCX ${rp[(o>>4)&3]}`;if((o&0xcf)===9)return `DAD ${rp[(o>>4)&3]}`;const x:Record<number,string>={0:"NOP",0x32:`STA ${w()}H`,0x3a:`LDA ${w()}H`,0x22:`SHLD ${w()}H`,0x2a:`LHLD ${w()}H`,0xc3:`JMP ${w()}H`,0xcd:`CALL ${w()}H`,0xc9:"RET",0xd3:`OUT ${b()}H`,0xdb:`IN ${b()}H`,0xf3:"DI",0xfb:"EI",0x76:"HLT",0x3e:`MVI A, ${b()}H`};return x[o]??`DB ${hex(o)}H`;}

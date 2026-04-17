import { Buffer } from "buffer/";
import process from "process";

const g = globalThis as unknown as {
  Buffer?: unknown;
  process?: unknown;
  global?: typeof globalThis;
};

if (!g.Buffer) g.Buffer = Buffer;
if (!g.process) g.process = process;
if (!g.global) g.global = globalThis;

/* eslint-disable @typescript-eslint/no-require-imports */
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.NEXT_PUBLIC_API_URL = "http://localhost:3000";


const { TextEncoder, TextDecoder } = require("util");
const { ReadableStream } = require("stream/web");

if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === "undefined") {
  global.TextDecoder = TextDecoder;
}
if (typeof global.ReadableStream === "undefined") {
  global.ReadableStream = ReadableStream;
}

// `qrcode/lib/core/qrcode` is the library's pure encoder (no canvas, no Node I/O), which is what
// React Native can bundle; @types/qrcode only covers the package root.
declare module 'qrcode/lib/core/qrcode' {
  export function create(
    text: string,
    options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' },
  ): { modules: { size: number; data: Uint8Array } };
}

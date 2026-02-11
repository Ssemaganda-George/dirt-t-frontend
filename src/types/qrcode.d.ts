declare module 'qrcode' {
  export function toDataURL(data: string): Promise<string>
  export function toString(data: string, options?: any): Promise<string>
}

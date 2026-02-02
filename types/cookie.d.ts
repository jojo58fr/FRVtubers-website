declare module 'cookie' {
  export type SameSite = true | false | 'lax' | 'strict' | 'none'

  export interface CookieSerializeOptions {
    /**
     * Specifies the value for the `Max-Age` `Set-Cookie` attribute in seconds.
     */
    maxAge?: number | undefined
    /**
     * Specifies the `domain` for the `Set-Cookie` attribute.
     */
    domain?: string | undefined
    /**
     * Specifies the `expires` `Date` object to be sent in the `Set-Cookie` header.
     */
    expires?: Date | undefined
    /**
     * Specifies the `httpOnly` flag.
     */
    httpOnly?: boolean | undefined
    /**
     * Specifies the `path` for the `Set-Cookie` attribute.
     */
    path?: string | undefined
    /**
     * Specifies the `sameSite` flag.
     */
    sameSite?: SameSite | undefined
    /**
     * Specifies the `secure` flag.
     */
    secure?: boolean | undefined
    /**
     * Specifies a function that will be used to encode a cookie's value.
     */
    encode?(value: string): string
    /**
     * Specifies the `priority` for the `Set-Cookie` attribute.
     */
    priority?: 'low' | 'medium' | 'high' | undefined
    /**
     * Specifies the `partitioned` flag.
     */
    partitioned?: boolean | undefined
  }

  export interface CookieParseOptions {
    /**
     * Specifies a function that will be used to decode a cookie's value.
     */
    decode?(value: string): string
  }

  export interface Cookies {
    [key: string]: string
  }

  export function parse(str: string, options?: CookieParseOptions): Cookies

  export function serialize(name: string, value: string, options?: CookieSerializeOptions): string
}

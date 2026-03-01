/**
 * Ambient module declarations for stub packages that lack TypeScript types.
 *
 * The project ships lightweight stubs for cheerio, puppeteer, puppeteer-extra,
 * and puppeteer-extra-plugin-stealth (in node_modules/) to support offline builds.
 * These declarations give TypeScript enough type information to compile cleanly.
 */

// ---- cheerio ----

declare module 'cheerio' {
  /** Minimal DOM node shape shared by all cheerio node types. */
  export interface AnyNode {
    type: string;
    name?: string;
    data?: string;
    attribs?: Record<string, string>;
    children?: AnyNode[];
    parent?: AnyNode | null;
  }

  /** A cheerio selection (jQuery-like collection). T is the node type (unused in stub). */
  export interface Cheerio<T = AnyNode> {
    length: number;
    [index: number]: AnyNode;

    each(func: (index: number, element: AnyNode) => boolean | void): this;
    find(selector: string): Cheerio;
    first(): Cheerio;
    last(): Cheerio;
    eq(index: number): Cheerio;
    closest(selector: string): Cheerio;
    parent(selector?: string): Cheerio;
    children(selector?: string): Cheerio;
    next(selector?: string): Cheerio;
    prev(selector?: string): Cheerio;
    contents(): Cheerio;
    filter(selector: string | ((index: number, element: AnyNode) => boolean)): Cheerio;
    map<U>(func: (index: number, element: AnyNode) => U): Cheerio;
    not(selector: string): Cheerio;

    text(): string;
    html(): string | null;
    attr(name: string): string | undefined;
    attr(name: string, value: string): this;
    data(name: string): unknown;
    prop(name: string): unknown;
    val(): string | undefined;
    is(selector: string): boolean;
    hasClass(className: string): boolean;
    addClass(className: string): this;
    removeClass(className: string): this;
    clone(): Cheerio;
    remove(): this;
    toString(): string;
  }

  /** The main cheerio API object returned by load(). */
  export interface CheerioAPI {
    (selector: string | AnyNode | AnyNode[] | Cheerio): Cheerio;
    (selector: string, context: string | AnyNode | Cheerio): Cheerio;
    html(): string;
    root(): Cheerio;
  }

  export function load(
    content: string | Buffer,
    options?: object,
    isDocument?: boolean
  ): CheerioAPI;
}

// ---- domhandler ----
// Used by miami-new-times.ts for the Element type in cheerio callbacks.

declare module 'domhandler' {
  export interface Element {
    type: string;
    name: string;
    attribs: Record<string, string>;
    children: AnyNode[];
    parent: AnyNode | null;
    data?: string;
  }

  export interface Text {
    type: 'text';
    data: string;
    parent: Element | null;
  }

  export type AnyNode = Element | Text;
}

// ---- puppeteer ----

declare module 'puppeteer' {
  export interface HTTPRequest {
    resourceType(): string;
    abort(): Promise<void>;
    continue(): Promise<void>;
  }

  export interface Page {
    goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<unknown>;
    waitForSelector(selector: string, options?: { timeout?: number }): Promise<unknown>;
    evaluate<T>(fn: () => T): Promise<T>;
    click(selector: string): Promise<void>;
    content(): Promise<string>;
    setViewport(viewport: { width: number; height: number }): Promise<void>;
    setUserAgent(userAgent: string): Promise<void>;
    setRequestInterception(enabled: boolean): Promise<void>;
    on(event: 'request', handler: (req: HTTPRequest) => void): this;
    on(event: string, handler: (...args: unknown[]) => void): this;
  }

  export interface Browser {
    newPage(): Promise<Page>;
    close(): Promise<void>;
  }

  // Re-export as classes so `import type { Browser, Page } from 'puppeteer'` works.
  export { Browser, Page };
}

// ---- puppeteer-extra ----

declare module 'puppeteer-extra' {
  import type { Browser } from 'puppeteer';

  interface PuppeteerExtra {
    use(plugin: unknown): this;
    launch(options?: Record<string, unknown>): Promise<Browser>;
  }

  const puppeteer: PuppeteerExtra;
  export default puppeteer;
}

// ---- puppeteer-extra-plugin-stealth ----

declare module 'puppeteer-extra-plugin-stealth' {
  function StealthPlugin(): unknown;
  export default StealthPlugin;
}

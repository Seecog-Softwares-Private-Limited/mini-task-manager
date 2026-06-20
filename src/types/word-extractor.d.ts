declare module 'word-extractor' {
  interface WordDocument {
    getBody(options?: { filterUnicode?: boolean }): string;
    getHeaders(options?: { filterUnicode?: boolean }): string;
    getFooters(options?: { filterUnicode?: boolean }): string;
    getAnnotations(options?: { filterUnicode?: boolean }): string;
  }

  export default class WordExtractor {
    extract(source: string | Buffer): Promise<WordDocument>;
  }
}

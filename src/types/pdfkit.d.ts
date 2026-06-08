declare module "pdfkit" {
  interface PDFDocumentOptions {
    size?: string;
    margins?: { top: number; bottom: number; left: number; right: number };
  }

  interface TextOptions {
    align?: "left" | "center" | "right";
    width?: number;
    underline?: boolean;
    continued?: boolean;
    indent?: number;
    paragraphGap?: number;
    lineGap?: number;
    bulletIndent?: number;
    characterSpacing?: number;
    wordSpacing?: number;
    columns?: number;
    columnGap?: number;
    height?: number;
    ellipsis?: boolean;
    link?: string;
    oblique?: boolean;
    strike?: boolean;
  }

  interface FontOptions {
    family?: string;
    size?: number;
    color?: string;
  }

  type PDFFont = "Helvetica" | "Helvetica-Bold" | "Helvetica-Oblique" | "Courier" | "Times-Roman";

  class PDFDocument {
    constructor(options?: PDFDocumentOptions);
    fontSize(size: number): this;
    font(font: PDFFont | string): this;
    text(text: string, options?: TextOptions): this;
    text(text: string, x?: number, y?: number, options?: TextOptions): this;
    moveDown(lines?: number): this;
    addPage(): this;
    end(): void;
    on(event: string, callback: (...args: any[]) => void): this;
    y: number;
    x: number;
    page: { width: number; height: number; margins: { top: number; bottom: number; left: number; right: number } };
  }

  export default PDFDocument;
}

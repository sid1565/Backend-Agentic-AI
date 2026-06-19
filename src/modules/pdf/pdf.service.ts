import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import PDFDocument from "pdfkit";
import { existsSync } from "fs";
import { join } from "path";

/**
 * Returns the first candidate path that exists on disk, or null. Asset files
 * (fonts, logo) live under `assets/` and are copied to `dist/src/assets` at
 * build time. Resolving against both `__dirname` (compiled runtime) and
 * `process.cwd()/src` (source tree) makes lookup robust to a stale dev-watch
 * `dist` or a not-yet-copied asset, so the invoice never silently degrades.
 */
function firstExistingPath(candidates: string[]): string | null {
  for (const candidate of candidates) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** Data needed to render one subscription invoice. */
export interface SubscriptionInvoiceInput {
  /** Bill-To: the school the invoice is addressed to. */
  schoolName: string;
  schoolEmail: string;
  /** Subscription line-item details. */
  amount: string; // decimal string, e.g. "700.00"
  currency: string; // "KWD" | "USD"
  studentSeat: number;
  startDate: string; // ISO date "YYYY-MM-DD"
  endDate: string; // ISO date "YYYY-MM-DD"
  /** Optional human reference shown in the document (e.g. transaction id). */
  reference?: string;
}

const PAGE_MARGIN = 50;
const COLOR_TEXT = "#1a1a2e";
const COLOR_MUTED = "#6b7280";
const COLOR_RULE = "#e5e7eb";
const COLOR_TABLE_HEAD_BG = "#f3f4f6";

/**
 * Generates the subscription invoice PDF (see image.png mockup) entirely
 * in-memory with PDFKit — no headless browser, no disk writes.
 *
 * Currency symbols are localized; the KWD glyph "د.ك" is Arabic script, which
 * the built-in AFM fonts cannot render, so an embedded Noto Naskh Arabic font
 * is registered when available. If the font is missing the service falls back
 * to the Latin currency code so a PDF is always produced.
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly arabicFontPath: string | null;
  private readonly logoPath: string | null;

  constructor(private readonly config: ConfigService) {
    this.arabicFontPath = this.resolveAsset(
      this.config.get<string>("invoice.arabicFontPath"),
      ["fonts", "NotoNaskhArabic-Regular.ttf"],
    );
    if (!this.arabicFontPath) {
      this.logger.warn(
        "Arabic font not found in assets/fonts; currency glyphs fall back to Latin codes.",
      );
    }

    this.logoPath = this.resolveAsset(
      this.config.get<string>("invoice.logoPath"),
      ["images", "tir-tir.png"],
    );
    if (!this.logoPath) {
      this.logger.warn(
        "Invoice logo not found in assets/images; falling back to a text wordmark.",
      );
    }
  }

  /**
   * Resolves a bundled asset. Prefers an explicit configured path, then the
   * compiled-runtime location (next to dist), then the source tree — so the
   * asset is found whether running from `dist`, a stale dev-watch, or ts-node.
   */
  private resolveAsset(
    configured: string | undefined,
    segments: string[],
  ): string | null {
    return firstExistingPath([
      configured ?? "",
      join(__dirname, "..", "..", "assets", ...segments),
      join(process.cwd(), "dist", "src", "assets", ...segments),
      join(process.cwd(), "src", "assets", ...segments),
    ]);
  }

  /** Renders the invoice and resolves with the complete PDF as a Buffer. */
  async generateSubscriptionInvoice(
    input: SubscriptionInvoiceInput,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN });
        const chunks: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        if (this.arabicFontPath) {
          doc.registerFont("arabic", this.arabicFontPath);
        }

        this.renderHeader(doc);
        this.renderParties(doc, input);
        this.renderLineItemTable(doc, input);

        doc.end();
      } catch (err) {
        reject(err as Error);
      }
    });
  }

  private renderHeader(doc: PDFKit.PDFDocument): void {
    const top = PAGE_MARGIN;

    if (this.logoPath) {
      // Brand logo (PNG). Width fixed; height scales to preserve aspect ratio.
      doc.image(this.logoPath, PAGE_MARGIN, top, { width: 110 });
    } else {
      // Fallback wordmark when no logo asset is present.
      const brandName =
        this.config.get<string>("invoice.brandName") ?? "TirTir";
      const tagline =
        this.config.get<string>("invoice.brandTagline") ?? "world";
      doc
        .font("Helvetica-Bold")
        .fontSize(28)
        .fillColor(COLOR_TEXT)
        .text(brandName, PAGE_MARGIN, top);
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(COLOR_MUTED)
        .text(tagline, PAGE_MARGIN, top + 30);
    }

    // "INVOICE" + date, right-aligned.
    doc
      .font("Helvetica-Bold")
      .fontSize(26)
      .fillColor(COLOR_TEXT)
      .text("INVOICE", PAGE_MARGIN, top, { align: "right" });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(COLOR_MUTED)
      .text(`Date: ${this.formatDate(this.today())}`, PAGE_MARGIN, top + 34, {
        align: "right",
      });

    this.horizontalRule(doc, top + 70);
  }

  private renderParties(
    doc: PDFKit.PDFDocument,
    input: SubscriptionInvoiceInput,
  ): void {
    const companyName =
      this.config.get<string>("invoice.companyName") ?? "EdTech Mini Game";
    const companyEmail = this.config.get<string>("invoice.companyEmail") ?? "";
    const y = PAGE_MARGIN + 90;

    // From (left)
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLOR_MUTED)
      .text("From", PAGE_MARGIN, y);
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(COLOR_TEXT)
      .text(companyName, PAGE_MARGIN, y + 14);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(COLOR_MUTED)
      .text(companyEmail, PAGE_MARGIN, y + 32);

    // Bill To (right)
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLOR_MUTED)
      .text("Bill To", PAGE_MARGIN, y, {
        align: "right",
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(COLOR_TEXT)
      .text(input.schoolName, PAGE_MARGIN, y + 14, { align: "right" });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(COLOR_MUTED)
      .text(input.schoolEmail, PAGE_MARGIN, y + 32, { align: "right" });
  }

  private renderLineItemTable(
    doc: PDFKit.PDFDocument,
    input: SubscriptionInvoiceInput,
  ): void {
    const left = PAGE_MARGIN;
    const right = doc.page.width - PAGE_MARGIN;
    const width = right - left;
    // Column x-offsets: Description | Period | Students | Unit Price | Amount
    const cols = {
      description: left + 12,
      period: left + width * 0.42,
      students: left + width * 0.62,
      unitPrice: left + width * 0.72,
      amount: left + width * 0.86,
    };
    const headerY = PAGE_MARGIN + 200;
    const rowY = headerY + 40;

    // Header band
    doc.rect(left, headerY, width, 28).fill(COLOR_TABLE_HEAD_BG);
    doc.font("Helvetica").fontSize(9).fillColor(COLOR_MUTED);
    doc.text("Description", cols.description, headerY + 9);
    doc.text("Period", cols.period, headerY + 9);
    doc.text("Students", cols.students, headerY + 9);
    doc.text("Unit Price", cols.unitPrice, headerY + 9);
    doc.text("Amount", cols.amount, headerY + 9);

    // Data row
    const price = this.formatMoney(doc, input.amount, input.currency);
    doc.font("Helvetica").fontSize(10).fillColor(COLOR_TEXT);
    doc.text(this.describePlan(input.startDate), cols.description, rowY, {
      width: cols.period - cols.description - 8,
    });
    doc.text(
      `${this.formatDate(input.startDate)} - ${this.formatDate(input.endDate)}`,
      cols.period,
      rowY,
      { width: cols.students - cols.period - 8 },
    );
    doc.text(String(input.studentSeat), cols.students, rowY);
    this.drawMoney(doc, price, cols.unitPrice, rowY);
    this.drawMoney(doc, price, cols.amount, rowY);

    this.horizontalRule(doc, rowY + 28);

    // Total
    const totalY = rowY + 44;
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(COLOR_TEXT)
      .text("Total", cols.unitPrice, totalY);
    this.drawMoney(
      doc,
      this.formatMoney(doc, input.amount, input.currency),
      cols.amount,
      totalY,
      true,
    );
  }

  /** Splits a money value into the amount text and a localized currency token. */
  private formatMoney(
    _doc: PDFKit.PDFDocument,
    amount: string,
    currency: string,
  ): { amount: string; symbol: string; symbolIsArabic: boolean } {
    const code = (currency || "").toUpperCase();
    if (code === "KWD") {
      return this.arabicFontPath
        ? { amount, symbol: "د.ك", symbolIsArabic: true }
        : { amount, symbol: "KD", symbolIsArabic: false };
    }
    if (code === "USD") {
      return { amount, symbol: "$", symbolIsArabic: false };
    }
    return { amount, symbol: code, symbolIsArabic: false };
  }

  /** Draws "<amount> <symbol>" picking the Arabic font for Arabic glyphs. */
  private drawMoney(
    doc: PDFKit.PDFDocument,
    money: { amount: string; symbol: string; symbolIsArabic: boolean },
    x: number,
    y: number,
    bold = false,
  ): void {
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(bold ? 11 : 10)
      .fillColor(COLOR_TEXT)
      .text(`${money.amount} `, x, y, { continued: true });
    if (money.symbolIsArabic) {
      doc.font("arabic").text(money.symbol, { continued: false });
    } else {
      doc.text(money.symbol, { continued: false });
    }
  }

  private describePlan(startDate: string): string {
    const label =
      this.config.get<string>("invoice.planLabel") ?? "Institutional Plan";
    return `${label} - ${this.formatMonthYear(startDate)}`;
  }

  private horizontalRule(doc: PDFKit.PDFDocument, y: number): void {
    doc
      .moveTo(PAGE_MARGIN, y)
      .lineTo(doc.page.width - PAGE_MARGIN, y)
      .lineWidth(1)
      .strokeColor(COLOR_RULE)
      .stroke();
  }

  /** "2026-05-25" -> "May 25, 2026". Returns the input unchanged if unparsable. */
  private formatDate(iso: string): string {
    const d = this.parseIso(iso);
    if (!d) return iso;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  }

  /** "2026-05-25" -> "May 2026". */
  private formatMonthYear(iso: string): string {
    const d = this.parseIso(iso);
    if (!d) return iso;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      timeZone: "UTC",
    });
  }

  private parseIso(iso: string): Date | null {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
    const d = new Date(`${iso.substring(0, 10)}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private today(): string {
    return new Date().toISOString().substring(0, 10);
  }
}

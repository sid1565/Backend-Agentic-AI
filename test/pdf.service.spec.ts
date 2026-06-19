import { ConfigService } from "@nestjs/config";
import { PdfService } from "../src/modules/pdf/pdf.service";

/**
 * Unit tests for the subscription invoice generator. Asserting exact text in a
 * binary PDF is brittle, so these verify the contract that matters: a valid,
 * non-trivial PDF buffer is always produced — including for the Arabic KWD
 * currency path — and generation never throws on the supported currencies.
 */
describe("PdfService", () => {
  const defaults: Record<string, unknown> = {
    "invoice.companyName": "EdTech Mini Game",
    "invoice.companyEmail": "developer@solguruz.com",
    "invoice.brandName": "TirTir",
    "invoice.brandTagline": "world",
    "invoice.planLabel": "Institutional Plan",
    "invoice.arabicFontPath": "",
  };

  const config = {
    get: <T>(key: string): T => defaults[key] as T,
  } as unknown as ConfigService;

  const service = new PdfService(config);

  const baseInput = {
    schoolName: "Kuwait International School",
    schoolEmail: "kis@yopmail.com",
    amount: "700.00",
    studentSeat: 500,
    startDate: "2026-05-25",
    endDate: "2027-05-25",
    reference: "TXN-001",
  };

  it("AC-1.1: produces a valid PDF buffer (KWD)", async () => {
    const buf = await service.generateSubscriptionInvoice({
      ...baseInput,
      currency: "KWD",
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("AC-1.3: renders the USD invoice without throwing", async () => {
    const buf = await service.generateSubscriptionInvoice({
      ...baseInput,
      currency: "USD",
    });
    expect(buf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("AC-1.3: tolerates an unknown currency code", async () => {
    const buf = await service.generateSubscriptionInvoice({
      ...baseInput,
      currency: "EUR",
    });
    expect(buf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("AC-1.2: tolerates malformed dates without throwing", async () => {
    const buf = await service.generateSubscriptionInvoice({
      ...baseInput,
      currency: "USD",
      startDate: "not-a-date",
      endDate: "",
    });
    expect(buf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});

import { ConfigService } from "@nestjs/config";
import { MailService } from "../src/modules/mail/mail.service";

/**
 * Verifies the attachment path added for subscription invoices: when
 * sendSchoolWelcome is called with attachments, they are forwarded verbatim to
 * the underlying transporter.sendMail call.
 */
describe("MailService attachments", () => {
  const config = {
    get: <T>(key: string): T => {
      const map: Record<string, unknown> = {
        "mail.host": "localhost",
        "mail.port": 587,
        "mail.secure": false,
        "mail.user": "u",
        "mail.password": "p",
        "mail.from": "noreply@example.com",
      };
      return map[key] as T;
    },
  } as unknown as ConfigService;

  function bootService(): {
    service: MailService;
    sendMail: jest.Mock;
  } {
    const service = new MailService(config);
    service.onModuleInit(); // compiles the welcome template + builds transporter
    const sendMail = jest.fn().mockResolvedValue({ messageId: "1" });
    // Replace the real transporter with a stub.
    (
      service as unknown as { transporter: { sendMail: jest.Mock } }
    ).transporter = { sendMail };
    return { service, sendMail };
  }

  const ctx = {
    schoolName: "Kuwait International School",
    loginEmail: "kis@yopmail.com",
    password: "secret",
    amount: "700.00",
    currency: "KWD",
    transactionId: "TXN-001",
    startDate: "2026-05-25",
    endDate: "2027-05-25",
    loginUrl: "http://localhost/login",
  };

  it("AC-1.1: forwards the invoice attachment to sendMail", async () => {
    const { service, sendMail } = bootService();
    const pdf = Buffer.from("%PDF-1.3 fake");

    await service.sendSchoolWelcome("kis@yopmail.com", ctx, [
      {
        filename: "invoice-TXN-001.pdf",
        content: pdf,
        contentType: "application/pdf",
      },
    ]);

    expect(sendMail).toHaveBeenCalledTimes(1);
    const arg = sendMail.mock.calls[0][0];
    expect(arg.attachments).toHaveLength(1);
    expect(arg.attachments[0].filename).toBe("invoice-TXN-001.pdf");
    expect(arg.attachments[0].content).toBe(pdf);
    expect(arg.to).toBe("kis@yopmail.com");
  });

  it("sends without attachments when none are provided", async () => {
    const { service, sendMail } = bootService();
    await service.sendSchoolWelcome("kis@yopmail.com", ctx);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].attachments).toBeUndefined();
  });
});

import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { MeService } from "../src/modules/me/me.service";
import { School } from "../src/modules/admin/schools/entities/school.entity";
import {
  Subscription,
  SubscriptionStatus,
} from "../src/modules/subscriptions/entities/subscription.entity";
import { AuthenticatedUser } from "../src/common/decorators/current-user.decorator";

/**
 * Unit tests for MeService. The DataSource is mocked, routing getRepository
 * to per-entity fakes. Focus: the owner-only:school invariant
 * (assertSchoolPrincipal) and self-scoped reads keyed on user.id.
 */
describe("MeService", () => {
  let service: MeService;
  let schoolRepo: any;
  let subRepo: any;

  const schoolUser: AuthenticatedUser = { id: "school-1", role: "SCHOOL" };

  beforeEach(() => {
    schoolRepo = { findOne: jest.fn() };
    subRepo = { findOne: jest.fn() };
    const dataSource = {
      getRepository: jest.fn((entity: unknown) =>
        entity === School ? schoolRepo : subRepo,
      ),
    } as unknown as DataSource;
    const i18n = { t: (k: string) => k } as any;
    service = new MeService(dataSource, i18n);
  });

  describe("getOwnSchool", () => {
    it("AC-ME-1: returns the principal’s own school keyed on user.id", async () => {
      const school: Partial<School> = {
        id: "school-1",
        name: "Acme",
        email: "a@x.io",
        phoneCode: "+1",
        phoneNumber: "5551234",
        studentSeat: 100,
        createdAt: new Date(),
      };
      schoolRepo.findOne.mockResolvedValue(school);
      subRepo.findOne.mockResolvedValue(null);

      const res = await service.getOwnSchool(schoolUser);

      expect(schoolRepo.findOne).toHaveBeenCalledWith({
        where: { id: "school-1" },
      });
      expect(res.data.id).toBe("school-1");
      // placeholder subscription when none on file
      expect(res.data.subscription).toBeNull();
    });

    it("AC-ME-2: rejects a non-SCHOOL principal with 403", async () => {
      await expect(
        service.getOwnSchool({ id: "admin-1", role: "ADMIN" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(schoolRepo.findOne).not.toHaveBeenCalled();
    });

    it("AC-ME-3: returns 404 when the school row is missing", async () => {
      schoolRepo.findOne.mockResolvedValue(null);
      await expect(
        service.getOwnSchool(schoolUser),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("getOwnSubscription", () => {
    it("AC-ME-4: returns the latest subscription for the principal", async () => {
      const sub: Partial<Subscription> = {
        id: "sub-1",
        amount: "49.00",
        currency: "USD" as any,
        transactionId: "TXN1",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        status: SubscriptionStatus.ACTIVE,
      };
      subRepo.findOne.mockResolvedValue(sub);

      const res = await service.getOwnSubscription(schoolUser);

      expect(subRepo.findOne).toHaveBeenCalledWith({
        where: { schoolId: "school-1" },
        order: { createdAt: "DESC" },
      });
      expect(res.data.id).toBe("sub-1");
    });

    it("AC-ME-5: returns 404 when no subscription exists", async () => {
      subRepo.findOne.mockResolvedValue(null);
      await expect(
        service.getOwnSubscription(schoolUser),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("AC-ME-6: rejects a non-SCHOOL principal with 403", async () => {
      await expect(
        service.getOwnSubscription({ id: "admin-1", role: "ADMIN" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSchoolDto } from '../src/modules/admin/schools/dto/create-school.dto';
import { SubscriptionCurrency } from '../src/modules/subscriptions/entities/subscription.entity';

function base(): Record<string, unknown> {
  return {
    schoolName: 'Sunrise Public School',
    email: 'principal@sunrise.edu',
    phoneCode: '+91',
    phoneNumber: '9876543210',
    studentSeat: 500,
    subscriptionAmount: 49999.0,
    currency: 'USD',
    transactionId: 'TXN-2026-0001',
    subscriptionStartDate: '2026-05-01',
    subscriptionEndDate: '2027-04-30',
  };
}

async function validateDto(input: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(CreateSchoolDto, input);
  const errors = await validate(dto);
  return errors.flatMap((e) => Object.keys(e.constraints ?? {}));
}

describe('CreateSchoolDto', () => {
  it('AC-CUR-1: accepts USD', async () => {
    expect(await validateDto({ ...base(), currency: 'USD' })).toEqual([]);
  });

  it('AC-CUR-2: accepts KWD', async () => {
    expect(await validateDto({ ...base(), currency: 'KWD' })).toEqual([]);
  });

  it('AC-CUR-3: rejects unsupported currency (EUR)', async () => {
    const failures = await validateDto({ ...base(), currency: 'EUR' });
    expect(failures).toContain('isEnum');
  });

  it('AC-CUR-4: rejects missing currency', async () => {
    const input = base();
    delete input.currency;
    const failures = await validateDto(input);
    expect(failures.length).toBeGreaterThan(0);
  });

  it('AC-TXN-1: rejects missing transactionId', async () => {
    const input = base();
    delete input.transactionId;
    const failures = await validateDto(input);
    expect(failures.length).toBeGreaterThan(0);
  });

  it('AC-TXN-2: rejects transactionId with disallowed characters', async () => {
    const failures = await validateDto({
      ...base(),
      transactionId: 'bad id with spaces',
    });
    expect(failures).toContain('matches');
  });

  it('AC-TXN-3: rejects transactionId shorter than 3 chars', async () => {
    const failures = await validateDto({ ...base(), transactionId: 'ab' });
    expect(failures).toContain('minLength');
  });

  it('AC-TXN-4: accepts well-formed transactionId', async () => {
    expect(
      await validateDto({ ...base(), transactionId: 'TXN_2026.0001-A' }),
    ).toEqual([]);
  });

  it('SubscriptionCurrency enum is exactly KWD and USD', () => {
    expect(Object.values(SubscriptionCurrency).sort()).toEqual(['KWD', 'USD']);
  });
});

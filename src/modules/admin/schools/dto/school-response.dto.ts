export class SubscriptionResponseDto {
  id!: string;
  amount!: string;
  currency!: string;
  transactionId!: string;
  startDate!: string;
  endDate!: string;
  status!: string;
}

export class SchoolResponseDto {
  id!: string;
  name!: string;
  email!: string;
  phoneCode!: string;
  phoneNumber!: string;
  studentSeat!: number;
  createdAt!: Date;
  subscription?: SubscriptionResponseDto | null;
}

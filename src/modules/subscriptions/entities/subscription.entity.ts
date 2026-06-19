import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { School } from '../../admin/schools/entities/school.entity';

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
}

export enum SubscriptionCurrency {
  KWD = 'KWD',
  USD = 'USD',
}

@Entity({ name: 'subscriptions' })
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_subscriptions_school_id')
  @Column({ type: 'uuid', name: 'school_id' })
  schoolId!: string;

  @ManyToOne(() => School, (s) => s.subscriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school!: School;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({
    type: 'enum',
    enum: SubscriptionCurrency,
  })
  currency!: SubscriptionCurrency;

  @Index('uq_subscriptions_transaction_id', { unique: true })
  @Column({ type: 'varchar', length: 100, name: 'transaction_id' })
  transactionId!: string;

  @Column({ type: 'date', name: 'start_date' })
  startDate!: string;

  @Index('idx_subscriptions_end_date')
  @Column({ type: 'date', name: 'end_date' })
  endDate!: string;

  @Index('idx_subscriptions_status')
  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status!: SubscriptionStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

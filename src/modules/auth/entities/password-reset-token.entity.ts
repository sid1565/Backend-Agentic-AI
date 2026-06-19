import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SubjectType } from './subject-type.enum';

/**
 * Single-use, hashed password-reset tokens. The raw token is emailed; only its
 * SHA-256 hash is stored. Consumed by setting `usedAt`, and expired by TTL.
 */
@Entity({ name: 'password_reset_tokens' })
@Index('idx_reset_subject', ['subjectId', 'subjectType'])
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'subject_id' })
  subjectId!: string;

  @Column({ type: 'varchar', length: 16, name: 'subject_type' })
  subjectType!: SubjectType;

  @Index('uq_reset_token_hash', { unique: true })
  @Column({ type: 'varchar', length: 64, name: 'token_hash' })
  tokenHash!: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', name: 'used_at', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

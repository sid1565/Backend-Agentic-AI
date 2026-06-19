import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SubjectType } from './subject-type.enum';

/**
 * Persisted, hashed refresh tokens. The raw token is returned to the client
 * once; only its SHA-256 hash is stored, so a DB read cannot reissue access.
 * Rotation on /auth/refresh and revocation on /auth/logout are enforced here.
 */
@Entity({ name: 'refresh_tokens' })
@Index('idx_refresh_subject', ['subjectId', 'subjectType'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'subject_id' })
  subjectId!: string;

  @Column({ type: 'varchar', length: 16, name: 'subject_type' })
  subjectType!: SubjectType;

  @Index('uq_refresh_token_hash', { unique: true })
  @Column({ type: 'varchar', length: 64, name: 'token_hash' })
  tokenHash!: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

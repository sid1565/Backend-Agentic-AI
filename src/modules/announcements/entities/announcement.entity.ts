import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * School-wide announcement authored by an admin and read by authenticated
 * users. Announcements are global (no per-school scoping) per the spec.
 *
 * Soft delete: `deleted_at` is a TypeORM @DeleteDateColumn, so `softDelete`
 * stamps it and every default `find`/`findOne` automatically excludes deleted
 * rows — list/read endpoints never see a deleted announcement without an
 * explicit `withDeleted`.
 */
@Entity({ name: 'announcements' })
// List endpoint orders by created_at DESC (newest first) and is the hot read
// path; this index backs that ordering + range scans.
@Index('idx_announcements_created_at', ['createdAt'])
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  // Admin subject id from the verified JWT. Nullable + no FK, mirroring
  // admin_audit_logs.actor_id: announcements must survive admin-row changes
  // and the column is for attribution, not referential joins.
  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}

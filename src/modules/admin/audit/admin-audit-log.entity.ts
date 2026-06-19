import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

export enum AdminAuditAction {
  SCHOOL_CREATED = "SCHOOL_CREATED",
  CREDENTIALS_RESENT = "CREDENTIALS_RESENT",
  SUBSCRIPTION_EXPIRED = "SUBSCRIPTION_EXPIRED",
  ANNOUNCEMENT_CREATED = "ANNOUNCEMENT_CREATED",
  ANNOUNCEMENT_UPDATED = "ANNOUNCEMENT_UPDATED",
  ANNOUNCEMENT_DELETED = "ANNOUNCEMENT_DELETED",
}

@Entity({ name: "admin_audit_logs" })
export class AdminAuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index("idx_audit_actor_id")
  @Column({ type: "uuid", name: "actor_id", nullable: true })
  actorId!: string | null;

  @Index("idx_audit_action")
  @Column({ type: "varchar", length: 64 })
  action!: AdminAuditAction;

  @Column({ type: "uuid", name: "target_id", nullable: true })
  targetId!: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

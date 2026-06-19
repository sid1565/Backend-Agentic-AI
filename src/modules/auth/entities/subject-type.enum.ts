/**
 * Identifies which credential store a token-bearing subject belongs to.
 * ADMIN -> admin_users, SCHOOL -> schools.
 */
export enum SubjectType {
  ADMIN = 'ADMIN',
  SCHOOL = 'SCHOOL',
}

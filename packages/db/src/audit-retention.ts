export const auditLogRetentionDays = 180;
const millisecondsPerDay = 24 * 60 * 60 * 1_000;

export function getAuditLogRetentionCutoff(now = new Date()): Date {
  return new Date(now.getTime() - auditLogRetentionDays * millisecondsPerDay);
}

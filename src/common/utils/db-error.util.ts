import { QueryFailedError } from 'typeorm';

/** True when MySQL reports a missing table (e.g. migration not yet applied). */
export function isMissingDbTableError(err: unknown, table?: string): boolean {
  if (!(err instanceof QueryFailedError)) return false;
  const driverError = (
    err as QueryFailedError & {
      driverError?: { code?: string; errno?: number; sqlMessage?: string };
    }
  ).driverError;
  const missing =
    driverError?.code === 'ER_NO_SUCH_TABLE' || driverError?.errno === 1146;
  if (!missing) return false;
  if (table && driverError?.sqlMessage && !driverError.sqlMessage.includes(table)) {
    return false;
  }
  return true;
}

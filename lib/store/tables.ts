/**
 * Table names. In Kymaa mode Leadget shares a database with the dashboard, so
 * its tables carry a prefix (LEADGET_TABLE_PREFIX=lg_). Invoices are one shared
 * table, so they are never prefixed.
 */
const PREFIX = process.env.LEADGET_TABLE_PREFIX ?? "";
export const T = (name: string) => (name === "invoices" ? name : PREFIX + name);

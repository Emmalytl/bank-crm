import {
  scrypt as scryptCallback,
  randomBytes,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
export const roles = [
  "marketer",
  "team_leader",
  "branch_manager",
  "regional_manager",
  "head_of_sales",
  "executive",
  "bank_admin",
];
export const stages = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "onboarding",
  "won",
  "lost",
];
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derived.toString("hex")}`;
}
export async function verifyPassword(password, encoded) {
  const [type, salt, hex] = String(encoded).split(":");
  if (type !== "scrypt" || !salt || !/^[a-f0-9]{128}$/.test(hex || ""))
    return false;
  const derived = await scrypt(password, salt, 64);
  return timingSafeEqual(derived, Buffer.from(hex, "hex"));
}
export const tokenHash = (token) =>
  createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("hex");
export function cookieToken(header = "") {
  const entry = header
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("crm_session="));
  const token = entry?.slice("crm_session=".length);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export function safeEqual(a, b) {
  return (
    typeof a === "string" &&
    typeof b === "string" &&
    Buffer.byteLength(a) === Buffer.byteLength(b) &&
    timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
// Never accept a bank identifier from a request to define its access scope.
// Team visibility uses the reporting tree; branch managers use their own branch.
export function leadScope(user, alias = "l") {
  if (user.role === "marketer")
    return {
      sql: `${alias}.bank_id = ? AND ${alias}.owner_id = ?`,
      values: [user.bank_id, user.id],
    };
  if (user.role === "branch_manager")
    return {
      sql: `${alias}.bank_id = ? AND ${alias}.owner_id IN (SELECT id FROM users WHERE bank_id = ? AND branch_id = ?)`,
      values: [user.bank_id, user.bank_id, user.branch_id],
    };
  if (["team_leader", "regional_manager"].includes(user.role))
    return {
      sql: `${alias}.bank_id = ? AND ${alias}.owner_id IN (WITH RECURSIVE team AS (SELECT id FROM users WHERE bank_id = ? AND id = ? UNION SELECT u.id FROM users u JOIN team t ON u.manager_id = t.id WHERE u.bank_id = ?) SELECT id FROM team)`,
      values: [user.bank_id, user.bank_id, user.id, user.bank_id],
    };
  if (["head_of_sales","executive","bank_admin"].includes(user.role)) return { sql: `${alias}.bank_id = ?`, values: [user.bank_id] };
  return {sql:"FALSE",values:[]};
}
export function peopleScope(user, alias = "u") {
  const scope = leadScope(user, alias);
  return {
    sql: scope.sql.replaceAll(`${alias}.owner_id`, `${alias}.id`),
    values: scope.values,
  };
}
export function canWrite(user) {
  return roles.includes(user.role) && user.role !== "executive";
}

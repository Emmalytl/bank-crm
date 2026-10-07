import { z } from "zod";
import { roles, stages } from "./security.mjs";
const text = (max) => z.string().trim().max(max);
const id = z.coerce.number().int().positive().max(2147483647);
// Real calendar validation prevents accepting dates such as February 31.
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T00:00:00Z");
    return !Number.isNaN(+d) && d.toISOString().slice(0, 10) === v;
  }, "Use a valid date")
  .nullable()
  .optional();
export const schemas = {
  login: z
    .object({
      bankCode: text(32)
        .min(1)
        .transform((v) => v.toUpperCase()),
      email: z
        .email()
        .max(190)
        .transform((v) => v.toLowerCase()),
      password: z.string().min(1).max(256),
    })
    .strict(),
  branch: z
    .object({
      name: text(160).min(2),
      code: text(32)
        .min(1)
        .regex(/^[A-Za-z0-9_-]+$/)
        .transform((v) => v.toUpperCase()),
    })
    .strict(),
  user: z
    .object({
      name: text(120).min(2),
      email: z
        .email()
        .max(190)
        .transform((v) => v.toLowerCase()),
      password: z.string().min(12).max(256),
      role: z.enum(roles),
      branch_id: id.nullable().optional(),
      manager_id: id.nullable().optional(),
    })
    .strict(),
  lead: z
    .object({
      name: text(160).min(2),
      company: text(160).default(""),
      email: z.union([z.email().max(190), z.literal("")]).default(""),
      phone: text(40).default(""),
      source: text(80).default("Referral"),
      product: text(120).default(""),
      status: z.enum(stages).default("new"),
      notes: text(10000).default(""),
      owner_id: id.optional(),
      next_follow_up: date,
    })
    .strict(),
  activity: z
    .object({
      type: z.enum(["call", "visit", "meeting", "email", "task"]),
      summary: text(2000).min(2),
      due_date: date,
    })
    .strict(),
  id,
};
// Defaults belong only to creation; a PATCH must preserve every omitted field.
export const leadPatch = z
  .object(
    Object.fromEntries(
      Object.entries(schemas.lead.shape).map(([key, value]) => [
        key,
        (value instanceof z.ZodDefault
          ? value.removeDefault()
          : value
        ).optional(),
      ]),
    ),
  )
  .strict();

// Decimal text is sent to PostgreSQL NUMERIC without floating-point arithmetic.
const amount = z.union([z.string(), z.number().finite()]).transform(String)
 .refine(v => /^(?:0|[1-9]\d{0,13})(?:\.\d{1,2})?$/.test(v), 'Use a nonnegative amount with at most two decimal places')
 .transform(v => { const [whole,fraction=''] = v.split('.'); return whole+'.'+fraction.padEnd(2,'0'); });
export const customerSchema = z.object({name:text(160).min(2),company:text(160).default(''),email:z.union([z.email().max(190),z.literal('')]).default(''),phone:text(40).default(''),notes:text(10000).default(''),owner_id:id.optional()}).strict();
export const opportunitySchema = z.object({customer_id:id,title:text(160).min(2),product:text(120).default(''),amount:amount.default('0.00'),currency:z.string().regex(/^[A-Z]{3}$/),stage:z.enum(['new','qualified','proposal','onboarding','won','lost']).default('new'),expected_close:date,notes:text(10000).default('')}).strict();
export const opportunityPatch = z.object(Object.fromEntries(Object.entries(opportunitySchema.shape).map(([key,value])=>[key,(value instanceof z.ZodDefault?value.removeDefault():value).optional()]))).strict();
export const targetSchema = z.object({user_id:id,metric:z.enum(['leads_created','customers_created','opportunities_won']),goal:z.coerce.number().int().positive().max(2147483647),period_start:date.unwrap().unwrap(),period_end:date.unwrap().unwrap()}).strict().refine(v=>v.period_end>=v.period_start,{message:'Period end must be on or after start',path:['period_end']});
export const productSchema = z.object({name:text(120).min(2),category:text(80).default(''),description:text(2000).default('')}).strict();

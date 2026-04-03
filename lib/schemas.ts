import { z } from "zod"

// 🔐 Auth Schemas
export const loginSchema = z.object({
  identifier: z.string().min(3, "Identifier must be at least 3 characters").trim(),
  password: z.string().min(4, "Password is too short"),
})

export type LoginInput = z.infer<typeof loginSchema>

// 📦 Package Code Schemas
export const redeemCodeSchema = z.object({
  code: z.string().min(10, "Invalid code format").regex(/^COMP-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/, "Invalid code format"),
})

export type RedeemCodeInput = z.infer<typeof redeemCodeSchema>

// 👤 Teacher/Student Schemas
export const teacherInputSchema = z.object({
  name: z.string().min(2, "Name is too short").max(50),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(10, "Invalid phone number"),
  subject: z.string().optional(),
  bio: z.string().max(200).optional(),
})

export type TeacherInput = z.infer<typeof teacherInputSchema>

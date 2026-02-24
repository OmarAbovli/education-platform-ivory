import { z } from "zod"

// Base schemas for validation and type inference
export const MessageSchema = z.object({
  id: z.string(),
  conversation_id: z.string(),
  sender_id: z.string(),
  body: z.string(),
  created_at: z.coerce.date(),
  sender: z.object({
    name: z.string().nullable(),
    avatar_url: z.string().nullable(),
  }),
})

export const ConversationSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  teacher_id: z.string(),
  subject: z.string().nullable(),
  status: z.string(),
  student_has_unread: z.boolean(),
  teacher_has_unread: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  participant: z.object({
    id: z.string(),
    name: z.string().nullable(),
    avatar_url: z.string().nullable(),
  }),
  last_message: z
    .object({
      body: z.string(),
      created_at: z.coerce.date(),
    })
    .nullable(),
})

// TypeScript types inferred from schemas
export type Message = z.infer<typeof MessageSchema>
export type Conversation = z.infer<typeof ConversationSchema>

// Schema for the sendMessage server action
export const SendMessageSchema = z.object({
  conversationId: z.string().optional(),
  // To start a new conversation, provide ONE of these
  teacherId: z.string().optional(),
  studentId: z.string().optional(),
  // For teacher bulk messages: list of student ids (will create one conversation per student)
  studentIds: z.array(z.string()).optional(),
  body: z.string().min(1, "Message cannot be empty"),
})

// Schema for the closeConversation server action
export const CloseConversationSchema = z.object({
  conversationId: z.string(),
})

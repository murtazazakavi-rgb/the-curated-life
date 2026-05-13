import { z } from "zod";

export const interestOptions = [
  "Bicycling",
  "Coffee",
  "Conversations",
  "Horse riding",
  "Bowling",
  "Wellness",
  "Culture",
] as const;

export const experiencePreferenceOptions = [
  "Sunrise Bicycling",
  "Midnight Bicycling",
  "Coffee & Conversations",
  "Trail Horse Riding",
  "Bowling Evenings",
] as const;

export const requestAccessSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180).transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(7).max(32),
  referred_by: z.string().trim().max(160).optional().or(z.literal("")),
  interests: z.array(z.string().trim()).min(1).max(8),
  preferred_experiences: z.array(z.string().trim()).min(1).max(8),
  message: z.string().trim().min(12).max(1200),
});

export const referralSchema = z.object({
  referred_name: z.string().trim().min(2).max(120),
  referred_email: z.string().trim().email().max(180).transform((value) => value.toLowerCase()),
  relationship: z.string().trim().min(2).max(120),
  optional_note: z.string().trim().max(700).optional().or(z.literal("")),
});

export const reservationSchema = z.object({
  experience_id: z.string().trim().min(1),
});

export const accessDecisionSchema = z.object({
  action: z.enum(["approve", "decline", "waitlist", "resend_setup"]),
  adminNote: z.string().trim().max(1200).optional().or(z.literal("")),
});

export const experienceAdminSchema = z.object({
  title: z.string().trim().min(2).max(140),
  slug: z.string().trim().min(2).max(160),
  description: z.string().trim().min(12).max(1200),
  location: z.string().trim().min(2).max(180),
  dateTime: z.string().trim().min(8),
  imageUrl: z
    .string()
    .trim()
    .max(1200)
    .refine(
      (value) => value.startsWith("/") || z.url().safeParse(value).success,
      "Enter a valid image URL or local image path.",
    ),
  hostedByLabel: z.string().trim().min(2).max(180),
  hostName: z.string().trim().min(2).max(180),
  hostTitle: z.string().trim().max(180).optional().or(z.literal("")),
  hostBio: z.string().trim().max(900).optional().or(z.literal("")),
  seatsTotal: z.number().int().positive().max(500).optional().nullable(),
  isVisible: z.boolean(),
  isInviteOnly: z.boolean(),
  isArchived: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(180).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(256),
});

export const passwordTokenSchema = z.object({
  token: z.string().trim().min(24).max(256),
  password: z.string().min(8).max(256),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(180).transform((value) => value.toLowerCase()),
});

export const reservationDecisionSchema = z.object({
  status: z.enum(["CONFIRMED", "WAITLISTED", "CANCELLED"]),
});

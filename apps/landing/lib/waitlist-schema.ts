import { z } from "zod";

export const waitlistSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    email: z.string().email("Invalid email"),
    phone: z.string().max(50).optional(),
    resort: z.string().max(200).optional(),
    instructor_type: z.string().max(100).optional(),
    languages: z.string().max(300).optional(),
    experience: z.string().max(100).optional(),
    high_season_weeks: z.string().max(50).optional(),
    consent: z.boolean(),
  })
  .refine((d) => d.consent === true, { message: "Consent is required", path: ["consent"] });

export type WaitlistFormData = z.infer<typeof waitlistSchema>;

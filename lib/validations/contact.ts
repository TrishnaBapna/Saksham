import { z } from "zod";

export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long." })
    .max(80, { message: "Name must be under 80 characters." }),
  email: z
    .string()
    .email({ message: "Please enter a valid email address." }),
  subject: z
    .string()
    .min(3, { message: "Subject must be at least 3 characters." })
    .max(120, { message: "Subject must be under 120 characters." }),
  message: z
    .string()
    .min(10, { message: "Message must be at least 10 characters long." })
    .max(2500, { message: "Message cannot exceed 2500 characters." }),
  honeypot: z.string().optional(), // Anti-spam bot trap
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

import { describe, it, expect } from "vitest";
import { contactFormSchema } from "@/lib/validations/contact";

describe("Contact Form Zod Validation", () => {
  it("validates correct form inputs", () => {
    const validData = {
      name: "Trishna Bapna",
      email: "trishna@example.com",
      subject: "Collaboration on Saksham Assistive Tech",
      message: "Hello Trishna, I loved reading your case study on rhythmic acoustic metronomes.",
    };

    const result = contactFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("fails when email is invalid", () => {
    const invalidData = {
      name: "Trishna",
      email: "not-an-email",
      subject: "Testing",
      message: "Valid message content over ten chars.",
    };

    const result = contactFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("fails when message is too short", () => {
    const invalidData = {
      name: "Trishna",
      email: "trishna@example.com",
      subject: "Testing",
      message: "Short",
    };

    const result = contactFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

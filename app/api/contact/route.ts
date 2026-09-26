import { NextRequest, NextResponse } from "next/server";
import { contactFormSchema } from "@/lib/validations/contact";
import { prisma, isDatabaseConnected } from "@/lib/db";
import { inMemoryMessages } from "@/lib/messages-store";

// In-memory rate limiting map: IP -> last request timestamp array
const ipRequests = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local-client";
    const now = Date.now();

    // 1. Rate Limiting Check
    const timestamps = ipRequests.get(ip) || [];
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
      return NextResponse.json(
        { error: "Too many messages sent. Please wait a minute and try again." },
        { status: 429 }
      );
    }
    recent.push(now);
    ipRequests.set(ip, recent);

    // 2. Body Parsing & Honeypot Check
    const body = await req.json();
    if (body.honeypot) {
      // Bot filled honeypot input, silently discard
      return NextResponse.json({ success: true, message: "Message submitted." });
    }

    // 3. Server-side Zod Validation
    const validation = contactFormSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = validation.data;

    // 4. Save to PostgreSQL via Prisma (with fallback)
    let savedId = `msg-${Date.now()}`;
    const dbAvailable = await isDatabaseConnected();

    if (dbAvailable) {
      try {
        const saved = await prisma.contactMessage.create({
          data: {
            name,
            email,
            subject,
            message,
          },
        });
        savedId = saved.id;
      } catch (dbErr) {
        console.warn("DB save failed, appending to memory log:", dbErr);
        inMemoryMessages.push({
          id: savedId,
          name,
          email,
          subject,
          message,
          isRead: false,
          createdAt: new Date(),
        });
      }
    } else {
      inMemoryMessages.push({
        id: savedId,
        name,
        email,
        subject,
        message,
        isRead: false,
        createdAt: new Date(),
      });
    }

    // 5. Send Notification Email if RESEND_API_KEY is configured
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Portfolio <onboarding@resend.dev>",
            to: process.env.CONTACT_RECEIVER_EMAIL || "trishnabapna@example.com",
            subject: `[Portfolio Inquiry] ${subject} - from ${name}`,
            text: `From: ${name} (${email})\nSubject: ${subject}\n\nMessage:\n${message}`,
          }),
        });
      } catch (emailErr) {
        console.warn("Email delivery notification error:", emailErr);
      }
    } else {
      console.log(`[Contact Log] Message from ${name} (${email}): "${subject}"`);
    }

    return NextResponse.json({
      success: true,
      messageId: savedId,
      message: "Thank you for reaching out! Your message was received successfully.",
    });
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Admin message fetch endpoint
  const dbAvailable = await isDatabaseConnected();
  if (dbAvailable) {
    try {
      const messages = await prisma.contactMessage.findMany({
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ messages });
    } catch {
      return NextResponse.json({ messages: inMemoryMessages });
    }
  }
  return NextResponse.json({ messages: inMemoryMessages });
}

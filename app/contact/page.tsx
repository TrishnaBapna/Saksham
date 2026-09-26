"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactFormSchema, ContactFormData } from "@/lib/validations/contact";
import { siteConfig } from "@/lib/site-config";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  Github,
  Globe,
  Sparkles,
} from "lucide-react";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
      honeypot: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to submit message.");
      }

      setSubmitSuccess(true);
      reset();

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#FF5A36", "#14B8A6", "#F59E0B"],
        });
      } catch {
        // ignore confetti failure
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-[#FF5A36] mb-8 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>BACK TO HOME</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Column: Context & Verified Channels */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <span className="font-mono text-xs uppercase tracking-widest text-[#FF5A36] font-semibold">
                COMMUNICATION
              </span>
              <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
                LET&apos;S CONNECT.
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                Whether you want to discuss assistive healthcare software, collaborate on open-source experiments, or talk about modern frontend engineering, feel free to send a note.
              </p>
            </div>

            {/* Direct Channel Cards */}
            <div className="space-y-4">
              <a
                href={siteConfig.github}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 hover:border-[#FF5A36]/60 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground group-hover:text-[#FF5A36] transition-colors">
                    <Github className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">
                      GitHub Profile
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      github.com/TrishnaBapna
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#FF5A36]">Visit →</span>
              </a>

              <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-[#FF5A36]">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    Location &amp; Timezone
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    India (IST // UTC+5:30)
                  </p>
                </div>
              </div>
            </div>

            {/* Response Time Guarantee */}
            <div className="rounded-xl border border-dashed border-border p-4 text-xs font-mono text-muted-foreground">
              ⚡ Typically responds within 24 to 48 business hours. Messages are stored securely.
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-sm">
              {submitSuccess ? (
                <div className="py-12 text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-display text-2xl font-bold text-foreground">
                      Message Sent Successfully!
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Thank you for reaching out, Trishna has received your message and will review it soon.
                    </p>
                  </div>
                  <button
                    onClick={() => setSubmitSuccess(false)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#171717] px-6 py-2.5 text-xs font-semibold text-[#FAF8F5] hover:bg-[#FF5A36] transition-colors dark:bg-[#FAF8F5] dark:text-[#171717] dark:hover:bg-[#FF5A36] dark:hover:text-[#FAF8F5]"
                  >
                    <span>Send Another Message</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {errorMessage && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-600 dark:text-red-400 flex items-center gap-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Honeypot field for bot trapping (invisible to normal users) */}
                  <input
                    type="text"
                    {...register("honeypot")}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  {/* Name & Email Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label
                        htmlFor="name"
                        className="block font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold"
                      >
                        Your Name *
                      </label>
                      <input
                        id="name"
                        type="text"
                        placeholder="Ada Lovelace"
                        {...register("name")}
                        className={`w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-[#FF5A36] ${
                          errors.name ? "border-red-500" : "border-input"
                        }`}
                      />
                      {errors.name && (
                        <p className="text-xs text-red-500 font-mono">
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="email"
                        className="block font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold"
                      >
                        Email Address *
                      </label>
                      <input
                        id="email"
                        type="email"
                        placeholder="ada@example.com"
                        {...register("email")}
                        className={`w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-[#FF5A36] ${
                          errors.email ? "border-red-500" : "border-input"
                        }`}
                      />
                      {errors.email && (
                        <p className="text-xs text-red-500 font-mono">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-2">
                    <label
                      htmlFor="subject"
                      className="block font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold"
                    >
                      Subject *
                    </label>
                    <input
                      id="subject"
                      type="text"
                      placeholder="Collaborating on an Assistive Healthcare Prototype"
                      {...register("subject")}
                      className={`w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-[#FF5A36] ${
                        errors.subject ? "border-red-500" : "border-input"
                      }`}
                    />
                    {errors.subject && (
                      <p className="text-xs text-red-500 font-mono">
                        {errors.subject.message}
                      </p>
                    )}
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <label
                      htmlFor="message"
                      className="block font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold"
                    >
                      Message *
                    </label>
                    <textarea
                      id="message"
                      rows={5}
                      placeholder="Hi Trishna, I came across your Saksham project on GitHub and wanted to discuss..."
                      {...register("message")}
                      className={`w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-[#FF5A36] resize-y ${
                        errors.message ? "border-red-500" : "border-input"
                      }`}
                    />
                    {errors.message && (
                      <p className="text-xs text-red-500 font-mono">
                        {errors.message.message}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#171717] py-3.5 text-sm font-semibold text-[#FAF8F5] transition-all hover:bg-[#FF5A36] hover:shadow-lg disabled:opacity-50 active:scale-[0.99] dark:bg-[#FAF8F5] dark:text-[#171717] dark:hover:bg-[#FF5A36] dark:hover:text-[#FAF8F5]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending Message...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

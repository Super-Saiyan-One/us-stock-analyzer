"use client";

import { NextIntlClientProvider } from "next-intl";
import { useSettingsStore } from "@/stores/settings-store";
import { type ReactNode } from "react";
import type { Locale } from "./locales";

import en from "../../messages/en.json";
import zh from "../../messages/zh.json";

const allMessages: Record<Locale, Record<string, unknown>> = { en, zh };

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSettingsStore((s) => s.locale);
  return (
    <NextIntlClientProvider locale={locale} messages={allMessages[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}

function resolve(messages: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let current: unknown = messages;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return key;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : key;
}

export function useT() {
  const locale = useSettingsStore((s) => s.locale);
  const msgs = allMessages[locale];
  return (key: string) => resolve(msgs, key);
}

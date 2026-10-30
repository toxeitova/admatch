"use client";
import { useEffect } from "react";
import { initSession } from "@/lib/analytics";

export function AnalyticsInit() {
  useEffect(() => {
    initSession();
  }, []);
  return null;
}

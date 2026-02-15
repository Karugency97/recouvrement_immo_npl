"use client";

import { useEffect, useRef } from "react";
import { markMessagesAsReadAction } from "@/lib/actions";

interface MarkAsReadTriggerProps {
  dossierId: string;
}

export function MarkAsReadTrigger({ dossierId }: MarkAsReadTriggerProps) {
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    markMessagesAsReadAction(dossierId);
  }, [dossierId]);

  return null;
}

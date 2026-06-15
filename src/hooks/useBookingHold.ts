import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_ID_KEY = "booking_session_id";

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

interface UseBookingHoldOptions {
  onExpired?: () => void;
}

export function useBookingHold(options?: UseBookingHoldOptions) {
  const [holdId, setHoldId] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionId = useRef(getSessionId());

  // Countdown timer
  useEffect(() => {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    if (!holdExpiresAt) { setHoldSecondsLeft(0); return; }

    const tick = () => {
      const left = Math.max(0, Math.floor((holdExpiresAt.getTime() - Date.now()) / 1000));
      setHoldSecondsLeft(left);
      if (left <= 0) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        setHoldId(null);
        setHoldExpiresAt(null);
        options?.onExpired?.();
      }
    };
    tick();
    holdTimerRef.current = setInterval(tick, 1000);
    return () => { if (holdTimerRef.current) clearInterval(holdTimerRef.current); };
  }, [holdExpiresAt]);

  const createHold = useCallback(async (date: string, time: string, durationMinutes: number) => {
    // Release previous hold first
    if (holdId) {
      await supabase.rpc("release_booking_hold" as any, { p_hold_id: holdId, p_session_id: sessionId.current });
    }
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const { data, error } = await supabase.from("booking_holds").insert({
      appointment_date: date,
      appointment_time: time,
      duration_minutes: durationMinutes,
      session_id: sessionId.current,
      expires_at: expiresAt.toISOString(),
    } as any).select("id").single();
    if (!error && data) {
      setHoldId(data.id);
      setHoldExpiresAt(expiresAt);
    }
  }, [holdId]);

  const releaseHold = useCallback(async () => {
    if (holdId) {
      await supabase.rpc("release_booking_hold" as any, { p_hold_id: holdId, p_session_id: sessionId.current });
      setHoldId(null);
      setHoldExpiresAt(null);
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    }
  }, [holdId]);

  const updateHoldContact = useCallback(async (info: { client_name?: string; client_email?: string; client_phone?: string }) => {
    if (holdId) {
      await supabase.rpc("update_booking_hold" as any, {
        p_hold_id: holdId,
        p_session_id: sessionId.current,
        p_client_name: info.client_name ?? null,
        p_client_email: info.client_email ?? null,
        p_client_phone: info.client_phone ?? null,
        p_postcode: null,
        p_help_email_sent: null,
      });
    }
  }, [holdId]);

  const formatCountdown = useCallback(() => {
    const mins = Math.floor(holdSecondsLeft / 60);
    const secs = holdSecondsLeft % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }, [holdSecondsLeft]);

  return {
    holdId,
    holdSecondsLeft,
    holdExpiresAt,
    sessionId: sessionId.current,
    createHold,
    releaseHold,
    updateHoldContact,
    formatCountdown,
  };
}

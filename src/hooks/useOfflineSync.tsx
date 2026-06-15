import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getPendingChanges,
  removePendingChange,
  getPendingCount,
  setCachedData,
  getCachedData,
  queueChange,
  type PendingChange,
} from "@/lib/offlineStore";
import { toast } from "sonner";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const onSilentSyncCompleteRef = useRef<(() => void) | null>(null);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Refresh pending count
  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  // Queue an offline change
  const addOfflineChange = useCallback(async (change: Omit<PendingChange, "createdAt">) => {
    await queueChange(change as PendingChange);
    await refreshPendingCount();
  }, [refreshPendingCount]);

  // Upload pending changes
  const uploadChanges = useCallback(async (): Promise<number> => {
    const changes = await getPendingChanges();
    let uploaded = 0;

    for (const change of changes) {
      try {
        if (change.operation === "update" && change.matchColumn && change.matchValue) {
          const { error } = await supabase
            .from(change.table as any)
            .update(change.data as any)
            .eq(change.matchColumn, change.matchValue);
          if (error) throw error;
        } else if (change.operation === "insert") {
          const { error } = await supabase
            .from(change.table as any)
            .insert(change.data as any);
          if (error) throw error;
        } else if (change.operation === "delete" && change.matchColumn && change.matchValue) {
          const { error } = await supabase
            .from(change.table as any)
            .delete()
            .eq(change.matchColumn, change.matchValue);
          if (error) throw error;
        }
        if (change.id) await removePendingChange(change.id);
        uploaded++;
      } catch (err) {
        console.error("Failed to sync change:", change, err);
        // Leave it in queue for retry
      }
    }

    await refreshPendingCount();
    return uploaded;
  }, [refreshPendingCount]);

  // Download fresh data and cache it
  const downloadData = useCallback(async (): Promise<number> => {
    let downloaded = 0;

    // Cache appointments
    const { data: appointments } = await supabase
      .from("appointments")
      .select("*, services(name, duration_minutes)")
      .order("appointment_date", { ascending: true });
    if (appointments) {
      await setCachedData("appointments", appointments);
      downloaded++;
    }

    // Cache patients
    const { data: patients } = await supabase
      .from("patients")
      .select("*")
      .order("client_name");
    if (patients) {
      await setCachedData("patients", patients);
      downloaded++;
    }

    // Cache services
    const { data: services } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true);
    if (services) {
      await setCachedData("services", services);
      downloaded++;
    }

    // Cache consultation notes
    const { data: consultNotes } = await supabase
      .from("consultation_notes")
      .select("*");
    if (consultNotes) {
      await setCachedData("consultation_notes", consultNotes);
      downloaded++;
    }

    // Cache consent form responses
    const { data: consentResponses } = await supabase
      .from("consent_form_responses")
      .select("*");
    if (consentResponses) {
      await setCachedData("consent_form_responses", consentResponses);
      downloaded++;
    }

    // Cache consent form templates
    const { data: templates } = await supabase
      .from("consent_form_templates")
      .select("*");
    if (templates) {
      await setCachedData("consent_form_templates", templates);
      downloaded++;
    }

    // Cache business settings
    const { data: settings } = await supabase
      .from("business_settings")
      .select("*")
      .single();
    if (settings) {
      await setCachedData("business_settings", settings);
      downloaded++;
    }

    return downloaded;
  }, []);

  // Silent background sync — uploads pending changes and caches fresh data
  // Does NOT trigger toasts or page refreshes
  const silentSync = useCallback(async () => {
    if (!isOnline) return;
    try {
      await uploadChanges();
      await downloadData();
      const now = new Date().toISOString();
      setLastSyncAt(now);
      localStorage.setItem("shawscope_last_sync", now);
    } catch (err) {
      console.error("Silent sync error:", err);
    }
    await refreshPendingCount();
    // Notify listener (e.g. dashboard refresh) if registered
    onSilentSyncCompleteRef.current?.();
  }, [isOnline, uploadChanges, downloadData, refreshPendingCount]);

  // Auto-sync every 10 minutes (silent, no page refresh)
  useEffect(() => {
    const interval = setInterval(() => {
      silentSync();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [silentSync]);

  // Full sync: upload then download (manual, with toasts)
  const sync = useCallback(async () => {
    if (!isOnline) {
      toast.error("You're offline — connect to the internet to sync");
      return;
    }

    setIsSyncing(true);
    try {
      const uploaded = await uploadChanges();
      const downloaded = await downloadData();
      const now = new Date().toISOString();
      setLastSyncAt(now);
      localStorage.setItem("shawscope_last_sync", now);

      const parts: string[] = [];
      if (uploaded > 0) parts.push(`${uploaded} change${uploaded > 1 ? "s" : ""} uploaded`);
      if (downloaded > 0) parts.push(`${downloaded} data set${downloaded > 1 ? "s" : ""} downloaded`);
      
      toast.success(parts.length > 0 ? `Synced: ${parts.join(", ")}` : "Already up to date");
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("Sync failed — please try again");
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, uploadChanges, downloadData]);

  // Load last sync time from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("shawscope_last_sync");
    if (stored) setLastSyncAt(stored);
  }, []);

  const setOnSilentSyncComplete = useCallback((cb: (() => void) | null) => {
    onSilentSyncCompleteRef.current = cb;
  }, []);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncAt,
    sync,
    addOfflineChange,
    getCachedData,
    refreshPendingCount,
    setOnSilentSyncComplete,
  };
}

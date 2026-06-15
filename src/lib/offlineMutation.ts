/**
 * Offline-aware mutation helper.
 * When online → writes directly to Supabase.
 * When offline → queues to IndexedDB for later sync.
 */
import { supabase } from "@/integrations/supabase/client";
import { queueChange, getPendingCount } from "@/lib/offlineStore";
import { toast } from "sonner";

interface MutationOptions {
  /** Supabase table name */
  table: string;
  /** insert | update | delete */
  operation: "insert" | "update" | "delete";
  /** The data payload (for insert/update) */
  data?: Record<string, any>;
  /** Column to match for update/delete (e.g. "id") */
  matchColumn?: string;
  /** Value to match for update/delete */
  matchValue?: string;
  /** Success message shown as toast */
  successMessage?: string;
  /** Whether to show offline queued toast (default: true) */
  showOfflineToast?: boolean;
}

interface MutationResult {
  success: boolean;
  queued: boolean;
  error?: string;
}

export async function offlineMutation(options: MutationOptions): Promise<MutationResult> {
  const {
    table,
    operation,
    data = {},
    matchColumn,
    matchValue,
    successMessage,
    showOfflineToast = true,
  } = options;

  const isOnline = navigator.onLine;

  if (isOnline) {
    try {
      let error: any = null;

      if (operation === "insert") {
        const result = await supabase.from(table as any).insert(data as any);
        error = result.error;
      } else if (operation === "update" && matchColumn && matchValue) {
        const result = await supabase
          .from(table as any)
          .update(data as any)
          .eq(matchColumn, matchValue);
        error = result.error;
      } else if (operation === "delete" && matchColumn && matchValue) {
        const result = await supabase
          .from(table as any)
          .delete()
          .eq(matchColumn, matchValue);
        error = result.error;
      }

      if (error) {
        toast.error(`Failed: ${error.message}`);
        return { success: false, queued: false, error: error.message };
      }

      if (successMessage) toast.success(successMessage);
      return { success: true, queued: false };
    } catch (err: any) {
      // Network error while supposedly online — queue it
      console.error("Mutation failed, queuing offline:", err);
    }
  }

  // Offline or network error — queue for later
  await queueChange({
    table,
    operation,
    data,
    matchColumn,
    matchValue,
    createdAt: new Date().toISOString(),
  });

  if (showOfflineToast) {
    const count = await getPendingCount();
    toast.info(`📱 Saved offline (${count} pending) — will sync when back online`);
  }

  return { success: true, queued: true };
}

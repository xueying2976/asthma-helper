import { BridgeError } from "./nativeBridge";

/** A failed operation can still have committed; always reconcile with native. */
export async function writeAndRefresh(run: () => Promise<unknown>, refresh: () => Promise<void>) {
  try {
    await run();
  } catch (error) {
    try {
      await refresh();
    } catch {
      throw new BridgeError(error instanceof BridgeError && error.code === "medicine_saved_reminder_failed" ? "partial_refresh_failed" : "write_refresh_failed", "Read-back failed after write failure");
    }
    throw error;
  }
  try {
    await refresh();
  } catch {
    throw new BridgeError("saved_refresh_failed", "Write completed but read-back failed");
  }
}

export async function saveMedicineThenReminder(save: () => Promise<{ id: string }>, reminder: (id: string) => Promise<unknown>) {
  const result = await save();
  try {
    await reminder(result.id);
  } catch {
    throw new BridgeError("medicine_saved_reminder_failed", "Medicine saved; reminder failed");
  }
  return result;
}
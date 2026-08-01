"use server";

import { clearCacheByPrefix } from "@/lib/cache";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function clearCacheAction(prefix: string) {
  try {
    if (!prefix || prefix.trim() === '') {
      return { success: false, error: "Invalid cache prefix" };
    }
    
    const deletedCount = await clearCacheByPrefix(prefix);
    return { success: true, count: deletedCount };
  } catch (error: any) {
    console.error("Cache clear error:", error);
    return { success: false, error: error.message || "Failed to clear cache" };
  }
}

export async function reindexDatabaseAction() {
  try {
    // Perform ANALYZE to update database statistics (safe maintenance)
    await prisma.$executeRawUnsafe(`ANALYZE`);
    return { success: true, message: "Database statistics analyzed and updated." };
  } catch (error: any) {
    console.error("Reindex error:", error);
    return { success: false, error: error.message || "Failed to perform database maintenance" };
  }
}

export async function getSystemSettings() {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'global' }
    });
    
    if (!settings) {
      return await prisma.systemSettings.create({
        data: { id: 'global' }
      });
    }
    return settings;
  } catch (error) {
    console.error("Error fetching system settings:", error);
    return null;
  }
}

export async function updateSystemSettings(data: { sessionTimeoutMinutes?: number, absoluteTimeoutHours?: number }) {
  try {
    const updated = await prisma.systemSettings.upsert({
      where: { id: 'global' },
      update: data,
      create: {
        id: 'global',
        ...data
      }
    });
    
    revalidatePath("/settings");
    return { 
      success: true, 
      data: {
        id: updated.id,
        sessionTimeoutMinutes: updated.sessionTimeoutMinutes,
        absoluteTimeoutHours: updated.absoluteTimeoutHours
      }
    };
  } catch (error: any) {
    console.error("Error updating system settings:", error);
    return { success: false, error: error.message || "Failed to update settings" };
  }
}

import { getSystemSettings } from "./actions";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const initialSettings = await getSystemSettings();
  
  // Strip Date objects to avoid Turbopack serialization bugs
  const safeSettings = initialSettings ? JSON.parse(JSON.stringify(initialSettings)) : null;

  return <SettingsClient initialSettings={safeSettings} />;
}

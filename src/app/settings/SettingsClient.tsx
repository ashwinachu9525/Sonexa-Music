"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings, Shield, Bell, Key, Database, Paintbrush } from "lucide-react";
import { clearCacheAction, reindexDatabaseAction, updateSystemSettings } from "./actions";

export default function SettingsClient({ initialSettings }: { initialSettings: any }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const [sessionTimeout, setSessionTimeout] = useState(initialSettings?.sessionTimeoutMinutes?.toString() || "30");
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  
  const [cacheType, setCacheType] = useState("app:");
  const [cacheDialogOpen, setCacheDialogOpen] = useState(false);

  const handleUpdateSessionTimeout = async (value: string) => {
    setSessionTimeout(value);
    setIsUpdatingSettings(true);
    const result = await updateSystemSettings({ sessionTimeoutMinutes: parseInt(value) });
    setIsUpdatingSettings(false);
    
    if (result.success) {
      toast.success("Session timeout updated successfully.");
    } else {
      toast.error(result.error || "Failed to update session timeout.");
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    const result = await clearCacheAction(cacheType);
    setIsClearingCache(false);
    setCacheDialogOpen(false);
    
    if (result.success) {
      toast.success(`Cleared ${result.count} cache keys successfully.`);
    } else {
      toast.error(result.error || "Failed to clear cache.");
    }
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    const result = await reindexDatabaseAction();
    setIsReindexing(false);
    
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.error || "Failed to perform database maintenance.");
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground">Manage admin preferences and platform configurations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paintbrush className="h-5 w-5 text-primary" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel of the admin dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/50">
              <div>
                <div className="font-semibold text-foreground">Theme Mode</div>
                <div className="text-sm text-muted-foreground">Toggle between light and dark mode</div>
              </div>
              <Switch
                checked={mounted ? (theme === 'dark' || resolvedTheme === 'dark') : false}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                disabled={!mounted}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security & Sessions
            </CardTitle>
            <CardDescription>Manage security policies and access controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/50">
              <div>
                <div className="font-semibold text-foreground">Session Timeout</div>
                <div className="text-sm text-muted-foreground">Automatically log out idle admins</div>
              </div>
              <Select value={sessionTimeout} onValueChange={(val) => { if (val) handleUpdateSessionTimeout(val); }} disabled={isUpdatingSettings}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 mins</SelectItem>
                  <SelectItem value="30">30 mins</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-xl md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              System Maintenance
            </CardTitle>
            <CardDescription>Database optimization and cache controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 grid md:grid-cols-2 gap-4">
            
            <Dialog open={cacheDialogOpen} onOpenChange={setCacheDialogOpen}>
              <DialogTrigger 
                render={
                  <button className="w-full py-3 px-4 mt-4 rounded-lg border border-border/50 bg-muted/50 hover:bg-muted transition-colors text-left flex items-center justify-between" />
                }
              >
                <div>
                  <div className="font-semibold text-foreground">Clear API Cache</div>
                  <div className="text-xs text-muted-foreground">Selectively purge Redis cache</div>
                </div>
                <span className="text-xs font-medium bg-muted text-foreground px-2 py-1 rounded border border-border/50">Run</span>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clear Cache</DialogTitle>
                  <DialogDescription>
                    Select which cache you want to invalidate. This uses safe prefix deletion.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Select value={cacheType} onValueChange={(val) => { if (val) setCacheType(val); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cache type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="app:">Entire Application (app:*)</SelectItem>
                      <SelectItem value="users:">Users Cache (users:*)</SelectItem>
                      <SelectItem value="playlists:">Playlists Cache (playlists:*)</SelectItem>
                      <SelectItem value="albums:">Albums Cache (albums:*)</SelectItem>
                      <SelectItem value="songs:">Songs Cache (songs:*)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCacheDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleClearCache} disabled={isClearingCache}>
                    {isClearingCache ? "Clearing..." : "Clear Cache"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <button 
              onClick={handleReindex}
              disabled={isReindexing}
              className="w-full py-3 px-4 mt-4 rounded-lg border border-destructive/20 bg-destructive/10 hover:bg-destructive/20 transition-colors text-left flex items-center justify-between group"
            >
              <div>
                <div className="font-semibold text-destructive group-hover:text-red-500">Optimize Database</div>
                <div className="text-xs text-destructive/70">Analyze tables to optimize query planner</div>
              </div>
              <span className="text-xs font-medium bg-destructive/20 text-destructive px-2 py-1 rounded group-hover:bg-destructive/30 border border-destructive/10">
                {isReindexing ? "Running..." : "Maintenance"}
              </span>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

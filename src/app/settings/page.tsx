import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, Shield, Bell, Key, Database, Paintbrush } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground">Manage admin preferences and platform configurations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-black border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paintbrush className="h-5 w-5 text-primary" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel of the admin dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-white/5">
              <div>
                <div className="font-semibold text-foreground">Theme Mode</div>
                <div className="text-sm text-muted-foreground">Force dark mode for admin panel</div>
              </div>
              <div className="h-6 w-10 bg-primary rounded-full relative">
                <div className="h-4 w-4 bg-white rounded-full absolute right-1 top-1"></div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-white/5 opacity-50 cursor-not-allowed">
              <div>
                <div className="font-semibold text-foreground">Brand Color</div>
                <div className="text-sm text-muted-foreground">Change the primary accent color</div>
              </div>
              <div className="h-6 w-6 rounded-full bg-primary border-2 border-white shadow-sm"></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security
            </CardTitle>
            <CardDescription>Manage security policies and access controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-white/5">
              <div>
                <div className="font-semibold text-foreground">Two-Factor Authentication</div>
                <div className="text-sm text-muted-foreground">Require 2FA for admin accounts</div>
              </div>
              <div className="h-6 w-10 bg-muted rounded-full relative">
                <div className="h-4 w-4 bg-muted-foreground rounded-full absolute left-1 top-1"></div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-white/5">
              <div>
                <div className="font-semibold text-foreground">Session Timeout</div>
                <div className="text-sm text-muted-foreground">Automatically log out idle admins</div>
              </div>
              <div className="text-sm font-medium bg-white/10 px-2 py-1 rounded">30 mins</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              System Maintenance
            </CardTitle>
            <CardDescription>Database optimization and cache controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button className="w-full py-2.5 px-4 rounded-lg border border-border/50 bg-white/5 hover:bg-white/10 transition-colors text-left flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground">Clear API Cache</div>
                <div className="text-xs text-muted-foreground">Purge Redis cache for all endpoints</div>
              </div>
              <span className="text-xs font-medium bg-white/10 px-2 py-1 rounded">Run</span>
            </button>
            <button className="w-full py-2.5 px-4 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors text-left flex items-center justify-between group">
              <div>
                <div className="font-semibold text-destructive group-hover:text-red-400">Reindex Database</div>
                <div className="text-xs text-red-500/70">Rebuild search indexes (may cause downtime)</div>
              </div>
              <span className="text-xs font-medium bg-destructive/20 text-destructive px-2 py-1 rounded group-hover:bg-destructive/30">Danger</span>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

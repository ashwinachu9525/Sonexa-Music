import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Music, PlayCircle, HardDrive, Database, Server, Cloud } from "lucide-react";
import prisma from "@/lib/db";
import { redis } from "@/lib/redis";
import { checkR2Health } from "@/lib/storage";

async function getStats() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/admin/stats`, { 
      next: { revalidate: 60 } 
    });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  } catch (error) {
    return { totalUsers: 0, totalSongs: 0, totalStreams: "0", storageUsed: "0 MB" };
  }
}

async function getHealth() {
  let db = false;
  let cache = false;
  let r2 = false;
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch(e) {}
  
  try {
    await redis.ping();
    cache = true;
  } catch(e) {}
  
  try {
    r2 = await checkR2Health();
  } catch(e) {}
  
  return { db, cache, r2 }; 
}

export default async function Dashboard() {
  const stats = await getStats();
  const health = await getHealth();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back to MusicAdmin.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered on platform</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Songs</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSongs}</div>
            <p className="text-xs text-muted-foreground">Uploaded to R2</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Streams</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStreams}</div>
            <p className="text-xs text-muted-foreground">Estimated plays</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.storageUsed}</div>
            <p className="text-xs text-muted-foreground">Capacity: Unlimited (R2)</p>
          </CardContent>
        </Card>
      </div>
      
      {/* System Health Section */}
      <h2 className="text-xl font-bold tracking-tight mt-4">System Health Monitors</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PostgreSQL (Aiven)</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${health.db ? 'text-green-500' : 'text-red-500'}`}>
              {health.db ? 'ONLINE' : 'OFFLINE'}
            </div>
            <p className="text-xs text-muted-foreground">Database connection status</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Redis Cache (Aiven)</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${health.cache ? 'text-green-500' : 'text-red-500'}`}>
              {health.cache ? 'ONLINE' : 'OFFLINE'}
            </div>
            <p className="text-xs text-muted-foreground">Cache connection status</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cloudflare R2</CardTitle>
            <Cloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${health.r2 ? 'text-green-500' : 'text-red-500'}`}>
              {health.r2 ? 'ONLINE' : 'OFFLINE'}
            </div>
            <p className="text-xs text-muted-foreground">Storage bucket status</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User as UserIcon, Calendar, Activity, Play, Download, Settings, Heart } from "lucide-react";
import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import { format } from "date-fns";

export const revalidate = 0;

export default async function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const user = await prisma.user.findUnique({
    where: { id: resolvedParams.id },
    include: {
      _count: {
        select: { playlists: true, downloads: true, history: true, favorites: true }
      }
    }
  });

  if (!user) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Details</h1>
        <p className="text-muted-foreground">Detailed overview for {user.displayName || user.email}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-black border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
                {user.displayName?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">{user.displayName || 'No Name'}</div>
                <div className="text-muted-foreground">{user.email}</div>
              </div>
            </div>
            
            <div className="pt-4 grid grid-cols-2 gap-4 border-t border-border/50 mt-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Role</div>
                <div className="font-semibold">{user.role}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Joined
                </div>
                <div className="font-semibold">{format(new Date(user.createdAt), "MMM d, yyyy")}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Gender</div>
                <div className="font-semibold capitalize">{user.gender || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Language</div>
                <div className="font-semibold capitalize">{user.preferredLanguage || 'Not specified'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              User Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-lg border border-border/50">
                <Play className="h-6 w-6 text-muted-foreground mb-2" />
                <div className="text-2xl font-bold">{user._count.history}</div>
                <div className="text-xs text-muted-foreground mt-1">Songs Played</div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-lg border border-border/50">
                <Heart className="h-6 w-6 text-pink-500 mb-2" />
                <div className="text-2xl font-bold">{user._count.favorites}</div>
                <div className="text-xs text-muted-foreground mt-1">Favorites</div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-lg border border-border/50">
                <Settings className="h-6 w-6 text-blue-500 mb-2" />
                <div className="text-2xl font-bold">{user._count.playlists}</div>
                <div className="text-xs text-muted-foreground mt-1">Playlists</div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-lg border border-border/50">
                <Download className="h-6 w-6 text-primary mb-2" />
                <div className="text-2xl font-bold">{user._count.downloads}</div>
                <div className="text-xs text-muted-foreground mt-1">Downloads</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

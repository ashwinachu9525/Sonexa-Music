import Link from "next/link";
import { LayoutDashboard, Music, Users, Settings, Disc } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-border/50 bg-black h-screen flex flex-col p-4 shadow-2xl">
      <div className="flex items-center gap-3 px-2 py-6 mb-4">
        <div className="bg-primary/10 p-2 rounded-xl">
          <Disc className="h-7 w-7 text-primary animate-[spin_4s_linear_infinite]" />
        </div>
        <span className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
          Sonexa Music
        </span>
      </div>
      
      <nav className="flex flex-col gap-2">
        <Link href="/" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-all duration-200 text-sm font-semibold text-muted-foreground hover:text-foreground group">
          <LayoutDashboard className="h-5 w-5 group-hover:text-primary transition-colors" />
          Dashboard
        </Link>
        <Link href="/music" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-all duration-200 text-sm font-semibold text-muted-foreground hover:text-foreground group">
          <Music className="h-5 w-5 group-hover:text-primary transition-colors" />
          Music Manager
        </Link>
        <Link href="/users" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-all duration-200 text-sm font-semibold text-muted-foreground hover:text-foreground group">
          <Users className="h-5 w-5 group-hover:text-primary transition-colors" />
          Users
        </Link>
        <Link href="/settings" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-all duration-200 text-sm font-semibold text-muted-foreground hover:text-foreground group">
          <Settings className="h-5 w-5 group-hover:text-primary transition-colors" />
          Settings
        </Link>
      </nav>
    </aside>
  );
}

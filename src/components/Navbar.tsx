import { Button } from "@/components/ui/button";
import { MobileSidebar } from "@/components/MobileSidebar";

export function Navbar() {
  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <MobileSidebar />
        <h2 className="text-lg font-semibold tracking-tight hidden md:block">Admin Portal</h2>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost">Admin Profile</Button>
      </div>
    </header>
  );
}

import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Admin Portal</h2>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost">Admin Profile</Button>
      </div>
    </header>
  );
}

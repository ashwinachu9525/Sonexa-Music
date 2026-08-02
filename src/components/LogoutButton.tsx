'use client';

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/login');
    } catch (e) {
      console.error('Failed to log out');
    }
  };

  return (
    <button 
      onClick={handleLogout}
      className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-red-500/10 transition-all duration-200 text-sm font-semibold text-red-400 hover:text-red-500 group mt-auto"
    >
      <LogOut className="h-5 w-5 transition-colors" />
      Log Out
    </button>
  );
}

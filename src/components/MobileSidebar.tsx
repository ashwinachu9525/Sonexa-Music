"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Button } from "./ui/button";

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-6 w-6" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/80"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative flex w-64 bg-background">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 z-50 text-white hover:bg-white/20"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="w-full h-full" onClick={(e) => {
              // Close sidebar when clicking a link
              if ((e.target as HTMLElement).closest('a')) {
                setIsOpen(false);
              }
            }}>
              <Sidebar />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

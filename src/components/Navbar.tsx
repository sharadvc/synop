"use client";
import Link from 'next/link';
import { useTheme } from "next-themes";
import { Moon, Sun, ChevronDown, Globe } from "lucide-react";
import { useEffect, useState } from 'react';

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/90 backdrop-blur-md font-sans">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
        
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <span className="font-extrabold text-2xl tracking-tight text-foreground">Synop</span>
        </Link>

        {/* Center Links (Mondays style) */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/#services" className="text-[13px] font-semibold text-foreground/80 hover:text-foreground transition-colors flex items-center gap-1">
            Features <ChevronDown className="w-3 h-3 text-foreground/50" />
          </Link>
          <Link href="/#use-case" className="text-[13px] font-semibold text-foreground/80 hover:text-foreground transition-colors flex items-center gap-1">
            Use Cases <ChevronDown className="w-3 h-3 text-foreground/50" />
          </Link>
          <Link href="/#pricing" className="text-[13px] font-semibold text-foreground/80 hover:text-foreground transition-colors">Pricing</Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-5">
          <div className="hidden lg:flex items-center gap-4 border-r border-border pr-5">
             <button className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground/80 hover:text-foreground">
                <Globe className="w-4 h-4" /> Eng <ChevronDown className="w-3 h-3 text-foreground/50" />
             </button>
             
             {mounted && (
               <button 
                 onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
                 className="p-1.5 rounded-full hover:bg-muted text-foreground/80 hover:text-foreground transition-colors"
               >
                 {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
               </button>
             )}
          </div>
          
          <Link href="/" className="hidden lg:block text-[13px] font-semibold text-foreground/80 hover:text-foreground transition-colors">
             Contact
          </Link>

          <Link href="/dashboard">
            <span className="text-[13px] font-bold text-foreground">Dashboard</span>
          </Link>
          <Link href="/settings">
            <span className="text-[13px] font-bold text-foreground/60 hover:text-foreground transition-colors">Settings</span>
          </Link>
          <Link href="/dashboard">
            <button className="text-[13px] font-bold rounded-full px-6 h-10 bg-foreground text-background hover:opacity-90 transition-opacity">
               Login
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

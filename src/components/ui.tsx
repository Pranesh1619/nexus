import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("glass-dark rounded-xl p-6 transition-all hover:scale-[1.01]", className)}>
      {children}
    </div>
  );
}

export function Button({ 
  className, 
  variant = "primary", 
  children, 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "outline" | "ghost" }) {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-blue-600",
    secondary: "bg-secondary text-foreground hover:bg-slate-800",
    outline: "border border-border bg-transparent hover:bg-white/5",
    ghost: "bg-transparent hover:bg-white/5",
  };
  
  return (
    <button 
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({ 
  className, 
  variant = "default", 
  children 
}: { className?: string; variant?: "default" | "success" | "warning" | "error"; children: React.ReactNode }) {
  const variants = {
    default: "bg-slate-700 text-slate-100",
    success: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    warning: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    error: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
  };
  
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", variants[variant], className)}>
      {children}
    </span>
  );
}

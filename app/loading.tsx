import React from "react";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5A36] opacity-30"></span>
        <Loader2 className="h-6 w-6 animate-spin text-[#FF5A36]" />
      </div>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground animate-pulse">
        TRISHNA.OS // INITIALIZING INTERFACE...
      </p>
    </div>
  );
}

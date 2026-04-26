import { cn } from "@/lib/utils";

interface PhoneShellProps {
  children: React.ReactNode;
  className?: string;
}

/** Mobile-first frame. On small screens it fills the viewport; on desktop it shows
 *  a centered phone-shaped container so the app feels native.
 *
 *  Safe-area top padding ensures the header clears the iOS notch / Android status
 *  bar when the app is launched from the home screen in standalone (PWA) mode. */
export function PhoneShell({ children, className }: PhoneShellProps) {
  return (
    <div className="min-h-screen w-full bg-background pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-background sm:my-4 sm:min-h-[calc(100vh-2rem)] sm:rounded-[2.5rem] sm:border sm:border-border sm:shadow-2xl sm:shadow-black/40 sm:overflow-hidden">
        <div className={cn("flex flex-1 flex-col", className)}>{children}</div>
      </div>
    </div>
  );
}

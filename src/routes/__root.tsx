import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SplashScreen } from "@/components/common/SplashScreen";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CourtsideView — Your Game Day Companion" },
      { name: "description", content: "CourtsideView tracks volleyball stats in real-time for parents and coaches." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "CourtsideView — Your Game Day Companion" },
      { property: "og:description", content: "CourtsideView tracks volleyball stats in real-time for parents and coaches." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "CourtsideView — Your Game Day Companion" },
      { name: "twitter:description", content: "CourtsideView tracks volleyball stats in real-time for parents and coaches." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4313a71b-320b-49b7-92c0-c609da438d07/id-preview-35a7a4b1--c799cf4d-3540-42b9-b975-b6ce259f9a03.lovable.app-1776999967480.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4313a71b-320b-49b7-92c0-c609da438d07/id-preview-35a7a4b1--c799cf4d-3540-42b9-b975-b6ce259f9a03.lovable.app-1776999967480.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/png",
        href: "/courtsideview-logo.png",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <SplashScreen>
      <Outlet />
    </SplashScreen>
  );
}

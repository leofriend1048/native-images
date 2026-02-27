import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const nav = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/how-it-works", label: "How It Works" },
  { href: "/docs/using-the-system", label: "Using the System" },
  { href: "/docs/best-inputs", label: "Getting the Best Results" },
  { href: "/docs/creative-strategy", label: "Creative Strategy" },
  { href: "/docs/access", label: "Access & Team Management" },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-6">
          <Link
            href="/chat"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </Link>
          <span className="text-border">|</span>
          <span className="text-sm font-semibold">Documentation</span>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-12 px-6 py-10">
        {/* Sidebar */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-1">
            {nav.map(({ href, label }) => (
              <SidebarLink key={href} href={href} label={label} />
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 prose prose-neutral max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-foreground prose-a:underline-offset-4 prose-table:text-sm prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-normal">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {label}
    </Link>
  );
}

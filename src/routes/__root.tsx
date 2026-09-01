export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => <div className="p-8 text-white">404 — page not found</div>,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Manga Recap Studio</title>
        <link rel="stylesheet" href="/src/styles.css?direct" />
      </head>
      <body>{children}</body>
    </html>
  );
}

function RootComponent() {
  const loc = useLocation();
  return (
    <Shell>
      <div className="min-h-screen bg-night text-zinc-100 font-sans">
        <nav className="flex items-center gap-2 px-5 h-16 border-b border-edge/60 bg-night/80 backdrop-blur sticky top-0 z-40">
          <Link to="/" className="font-extrabold text-xl mr-6 flex items-center gap-2 tracking-tight">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center text-lg shadow-lg shadow-fuchsia-900/40">▶</span>
            <span className="bg-gradient-to-r from-fuchsia-400 to-violet-300 bg-clip-text text-transparent">Manga Recap Studio</span>
          </Link>
          {[
            { to: '/', label: 'Projects' },
            { to: '/characters', label: 'Characters' },
            { to: '/settings', label: 'Settings' },
            { to: '/docs', label: 'Docs' },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                loc.pathname === l.to
                  ? 'bg-fuchsia-600/90 text-white shadow-lg shadow-fuchsia-900/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Outlet />
      </div>
    </Shell>
  );
}

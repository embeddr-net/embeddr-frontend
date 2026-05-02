const logoSrc = "/embeddr_logo_transparent.webp";

/**
 * Full-screen branded loading screen shown during initial app load.
 * Used by the route Suspense fallback and the ZenPage pre-render gate.
 */
export function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 z-[65] flex flex-col items-center justify-center bg-background gap-6">
      <div
        className="flex flex-col items-center gap-6"
        style={{ animation: "embeddr-logo-pulse 2.4s ease-in-out infinite" }}
      >
        <img
          src={logoSrc}
          alt="embeddr"
          className="w-52 select-none pointer-events-none"
          draggable={false}
        />
        <LoadingDots />
      </div>
      <style>{`
        @keyframes embeddr-logo-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.65; transform: scale(0.97); }
        }
      `}</style>
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-primary/50"
          style={{
            animation: `embeddr-dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes embeddr-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

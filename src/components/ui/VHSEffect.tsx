import React from "react";

export const VHSEffect: React.FC = () => {
  return (
    <>
      <style>
        {`
        @keyframes vhs-noise-flicker {
          0% { opacity: 0.12; transform: translate(0,0); }
          10% { opacity: 0.15; transform: translate(-1%, 1%); }
          20% { opacity: 0.12; transform: translate(1%, -1%); }
          30% { opacity: 0.18; transform: translate(-2%, 0); }
          40% { opacity: 0.12; transform: translate(2%, 0); }
          50% { opacity: 0.15; transform: translate(0, 2%); }
          60% { opacity: 0.12; transform: translate(0, -2%); }
          70% { opacity: 0.18; transform: translate(1%, 1%); }
          80% { opacity: 0.12; transform: translate(-1%, -1%); }
          90% { opacity: 0.15; transform: translate(2%, 2%); }
          100% { opacity: 0.12; transform: translate(0,0); }
        }
        
        @keyframes vhs-scanline-roll {
          0% { top: -20%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 120%; opacity: 0; }
        }

        @keyframes vhs-twitch {
          0% { transform: translateY(0); }
          95% { transform: translateY(0); }
          96% { transform: translateY(-0.2%); }
          97% { transform: translateY(0.2%); }
          98% { transform: translateY(-0.1%); }
          99% { transform: translateY(0.1%); }
          100% { transform: translateY(0); }
        }

        .vhs-container {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
          z-index: 9999;
          overflow: hidden;
          /* Subtle overall twitching like old TV vertical hold */
          animation: vhs-twitch 10s infinite;
        }

        /* 1. Static Scanlines - The fine horizontal lines */
        .vhs-scanlines {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0),
            rgba(255, 255, 255, 0) 50%,
            rgba(0, 0, 0, 0.2) 50%,
            rgba(0, 0, 0, 0.2)
          );
          background-size: 100% 4px;
          z-index: 10;
        }

        /* 2. Rolling Bar - The refreshing band moving down */
        .vhs-rolling-bar {
            width: 100%;
            height: 15vh; /* Thicker bar */
            background: linear-gradient(to bottom, 
                rgba(255,255,255,0) 0%, 
                rgba(255,255,255,0.05) 50%, 
                rgba(255,255,255,0) 100%
            );
            position: absolute;
            left: 0;
            top: -20%;
            z-index: 13;
            animation: vhs-scanline-roll 8s linear infinite;
            pointer-events: none;
        }

        /* 3. Noise Grain - Animated static */
        .vhs-noise {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E");
          background-size: 100px 100px;
          opacity: 0.15;
          animation: vhs-noise-flicker 0.4s steps(4) infinite;
          mix-blend-mode: overlay;
          z-index: 9;
        }

        /* 4. Vignette - Darker corners */
        .vhs-vignette {
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at center, transparent 60%, rgba(10, 5, 10, 0.4) 100%);
            z-index: 14;
        }

        /* 5. Color Tint - Subtle green/purple shift */
        .vhs-tint {
            position: absolute;
            inset: 0;
            background: rgba(20, 255, 20, 0.02);
            mix-blend-mode: color-dodge;
            z-index: 12;
        }
        `}
      </style>
      <div className="vhs-container">
        <div className="vhs-scanlines" />
        <div className="vhs-rolling-bar" />
        <div className="vhs-noise" />
        <div className="vhs-tint" />
        <div className="vhs-vignette" />
      </div>
    </>
  );
};

"use client";

import { useEffect, useState } from "react";
import { Merk } from "./ui";

// Scherm terwijl de studio werkt: een balk die vol loopt over de verwachte tijd, met de stap van dat moment.
export function Bezig({ titel, stappen, seconden }: { titel: string; stappen: string[]; seconden: number }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const deel = Math.min(0.95, t / seconden);
  const nu = Math.min(stappen.length - 1, Math.floor(deel * stappen.length));
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="kaart hero w-full max-w-lg p-8 text-center">
        <div className="flex justify-center">
          <Merk size={44} gloed />
        </div>
        <h2 className="titel mt-5 text-3xl">{titel}</h2>
        <p className="mt-3 text-sm text-text">{stappen[nu]}</p>
        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-surface2">
          <div className="h-full rounded-full bg-accent transition-[width] duration-1000 ease-linear" style={{ width: `${deel * 100}%` }} />
        </div>
        <div className="lbl mt-3 flex justify-between !text-[9.5px]">
          <span>
            stap {nu + 1} van {stappen.length}
          </span>
          <span>
            {Math.floor(t / 60)}:{String(t % 60).padStart(2, "0")}
          </span>
        </div>
        <p className="mt-5 text-xs text-muted">Dit duurt ongeveer {Math.round(seconden / 60)} minuten. Je kunt dit venster open laten staan.</p>
      </div>
    </div>
  );
}

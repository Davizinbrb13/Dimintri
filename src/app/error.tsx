"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="state-page">
      <AlertTriangle aria-hidden="true" size={30} />
      <h1>Nao foi possivel carregar esta tela</h1>
      <p>Tente novamente. Se o problema continuar, verifique a conexao com o Supabase.</p>
      <button className="button button-primary" type="button" onClick={reset}>
        <RotateCcw size={17} aria-hidden="true" />
        Tentar novamente
      </button>
    </main>
  );
}

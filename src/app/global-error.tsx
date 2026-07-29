"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body>
        <main className="state-page">
          <h1>O DIMI encontrou um erro inesperado</h1>
          <button className="button button-primary" type="button" onClick={reset}>
            Recarregar aplicacao
          </button>
        </main>
      </body>
    </html>
  );
}

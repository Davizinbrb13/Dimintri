import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="state-page">
      <span className="state-code">404</span>
      <h1>Pagina nao encontrada</h1>
      <Link className="button button-primary" href="/dashboard">
        <ArrowLeft size={17} aria-hidden="true" />
        Voltar ao painel
      </Link>
    </main>
  );
}

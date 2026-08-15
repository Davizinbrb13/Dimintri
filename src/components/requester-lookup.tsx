"use client";

import Link from "next/link";
import { CheckCircle2, LoaderCircle, Search, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Requester } from "@/lib/types";

export function RequesterLookup({ error }: { error?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Requester[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Requester | null>(null);

  useEffect(() => {
    const normalized = query.trim();
    if (!normalized || selected?.registration === normalized.toUpperCase()) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/requesters?q=${encodeURIComponent(normalized)}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as { requesters: Requester[] };
        setResults(body.requesters ?? []);
      } catch (lookupError) {
        if (!(lookupError instanceof DOMException && lookupError.name === "AbortError")) {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected]);

  const exactMatch = useMemo(
    () =>
      selected?.registration === query.trim().toUpperCase()
        ? selected
        : results.find(
            (requester) => requester.registration.toUpperCase() === query.trim().toUpperCase(),
          ) ?? null,
    [query, results, selected],
  );

  return (
    <div className="field autocomplete-field">
      <label htmlFor="requesterRegistration">Matricula ou nome do solicitante</label>
      <div className="input-with-icon">
        {loading ? (
          <LoaderCircle className="spin" size={18} aria-hidden="true" />
        ) : (
          <Search size={18} aria-hidden="true" />
        )}
        <input
          id="requesterRegistration"
          name="requesterRegistration"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
            setResults([]);
          }}
          placeholder="Digite a matricula ou nome"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "requesterRegistration-error" : "requesterRegistration-help"}
          required
        />
      </div>

      {results.length > 0 && !exactMatch ? (
        <div className="autocomplete-menu" role="listbox" aria-label="Solicitantes encontrados">
          {results.map((requester) => (
            <button
              key={requester.id}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => {
                setQuery(requester.registration);
                setSelected(requester);
                setResults([]);
              }}
            >
              <span>{requester.registration}</span>
              <strong>{requester.full_name}</strong>
            </button>
          ))}
        </div>
      ) : null}

      {exactMatch ? (
        <div className="lookup-result" id="requesterRegistration-help">
          <CheckCircle2 size={17} aria-hidden="true" />
          <span>
            Solicitante: <strong>{exactMatch.full_name}</strong>
          </span>
        </div>
      ) : query.length > 0 && !loading && results.length === 0 ? (
        <div className="lookup-empty" id="requesterRegistration-help">
          <span>Solicitante ainda nao localizado.</span>
          <Link href="/cadastros">
            <UserPlus size={16} aria-hidden="true" />
            Cadastrar
          </Link>
        </div>
      ) : (
        <span className="field-help" id="requesterRegistration-help">
          Pesquise pela matricula ou nome e selecione o solicitante.
        </span>
      )}

      {error ? (
        <span className="field-error" id="requesterRegistration-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}

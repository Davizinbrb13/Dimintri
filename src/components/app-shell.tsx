"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  UsersRound,
  X,
} from "lucide-react";
import { signOutAction } from "@/app/(app)/actions";
import { BrandLogo } from "@/components/brand-logo";
import type { Profile } from "@/lib/types";
import { initials } from "@/lib/format";

const navItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/movimentacoes", label: "Movimentacoes", icon: ArrowLeftRight },
  { href: "/cadastros", label: "Cadastros", icon: ClipboardList },
];

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      {menuOpen ? (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`} aria-label="Navegacao principal">
        <div className="sidebar-brand">
          <BrandLogo className="sidebar-logo" priority />
          <button
            className="icon-button sidebar-close"
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
            title="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Operacao</span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={19} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
          {profile.role === "admin" ? (
            <Link
              href="/equipe"
              className={pathname === "/equipe" || pathname.startsWith("/equipe/") ? "active" : ""}
              aria-current={pathname === "/equipe" || pathname.startsWith("/equipe/") ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              <UsersRound size={19} aria-hidden="true" />
              Equipe
            </Link>
          ) : null}
        </nav>

        <div className="sidebar-account">
          <div className="avatar" aria-hidden="true">
            {initials(profile.full_name)}
          </div>
          <div className="account-copy">
            <strong>{profile.full_name}</strong>
            <span>{profile.role === "admin" ? "Administrador" : "Tecnico de TI"}</span>
          </div>
          <form action={signOutAction}>
            <button className="icon-button" type="submit" aria-label="Sair" title="Sair">
              <LogOut size={19} />
            </button>
          </form>
        </div>
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          <div className="app-topbar-leading">
            <button
              className="mobile-menu-button icon-button"
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              title="Abrir menu"
            >
              <Menu size={22} aria-hidden="true" />
            </button>
            <div className="app-topbar-title">
              <Settings2 size={17} aria-hidden="true" />
              <span>NexusTI | Central de demandas</span>
            </div>
          </div>
          <span className="environment-badge">Ambiente interno</span>
        </header>
        {children}
      </div>
    </div>
  );
}

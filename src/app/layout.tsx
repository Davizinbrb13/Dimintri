import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "NexusTI",
  title: {
    default: "NexusTI | Demandas de TI",
    template: "%s | NexusTI",
  },
  description: "Gestao inteligente de chamados e demandas de Tecnologia da Informacao.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#800000",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

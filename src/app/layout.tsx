import type { Metadata } from "next";
import { AppFrame } from "@/modules/shared/app-frame";
import "./globals.css";

export const metadata: Metadata = {
  title: "Condo AI",
  description: "Gestao condominial em um so lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}

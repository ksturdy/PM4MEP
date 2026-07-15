import type { Metadata } from "next";
import "./globals.css";
import { Montserrat } from "next/font/google";
import { cn } from "@/lib/utils";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "PM4MEP",
  description: "Project management and estimating for mechanical contractors",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", montserrat.variable)}>
      <body>
        <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
      </body>
    </html>
  );
}

import { Outfit, Yellowtail } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

const yellowtail = Yellowtail({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-yellowtail",
});

export const metadata = {
  title: "Cumpleaños IPETyM",
  description: "Panel de visualización de cumpleaños para la comunidad educativa de IPETyM.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${outfit.variable} ${yellowtail.variable}`}>
      <body>{children}</body>
    </html>
  );
}


import type { ReactNode } from "react";

export const metadata = {
  title: "Landing",
  description: "AI relocation agent for the first 72 hours in a new city.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

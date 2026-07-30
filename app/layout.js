import "./globals.css";

export const metadata = {
  title: "Weather Consensus",
  description: "A multi-location weather and marine app combining five forecast models",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Weather Consensus" },
};

export const viewport = { themeColor: "#071426", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }) {
  return <html lang="tr"><body>{children}</body></html>;
}

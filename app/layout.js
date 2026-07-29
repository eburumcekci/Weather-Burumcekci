import "./globals.css";

export const metadata = {
  title: "Ortak Hava Pro",
  description: "Beş hava modelini birleştiren çoklu konum hava ve deniz uygulaması",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ortak Hava",
  },
};

export const viewport = {
  themeColor: "#071426",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}

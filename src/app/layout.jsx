import "./globals.css";

export const metadata = {
  title: "AURALIS – Classroom Without Barriers",
  description:
    "An intelligent accessibility platform transforming spoken lecture words and Indian Sign Language (ISL) gestures into real-time synchronized captions for deaf and hard-of-hearing students.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="min-h-screen bg-auralis-bg text-auralis-text font-sans antialiased selection:bg-auralis-secondary selection:text-auralis-dark">
        {children}
      </body>
    </html>
  );
}

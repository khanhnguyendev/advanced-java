import { fontVariables } from './fonts';
import './globals.css';
import { themeScript } from './theme-script';

export default function GlobalNotFound() {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <title>Page not found</title>
        <script
          dangerouslySetInnerHTML={{
            __html: themeScript,
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <main id="main-content" tabIndex={-1}>
          <h1>Page not found</h1>
          <p><a href="/">Back to the shelf</a></p>
        </main>
      </body>
    </html>
  );
}

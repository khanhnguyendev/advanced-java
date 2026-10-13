import { fontVariables } from './fonts';
import './globals.css';

export default function GlobalNotFound() {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}",
          }}
        />
      </head>
      <body>
        <main>
          <h1>Page not found</h1>
          <p><a href="/">Back to the shelf</a></p>
        </main>
      </body>
    </html>
  );
}

export function AppLayout({children}) {
  const author = 'Joãozinho';
  return (
    <html>
      <head>
        <meta charset="utf8" />
        <title>Meu Blog</title>
      </head>
      <body>
        <input />

        {children}

        <footer>
          <i>Feito com ❤️ por {author}</i>
        </footer>
      </body>
    </html>
  );
}

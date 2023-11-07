// run `node index.js` in the terminal
import fs from 'node:fs/promises';
import { createServer } from 'http';
import escapeHtml from 'escape-html';

async function BlogPost({ fileName }) {
  const postContent = await fs.readFile('./posts/' + fileName + '.txt', 'utf8');
  return <article>{postContent}</article>;
}

async function BlogPostList() {
  const fileNames = await fs.readdir('./posts');
  const postNames = fileNames.map((fileName) =>
    fileName.slice(0, fileName.lastIndexOf('.'))
  );

  return (
    <main>
      <h1>Bem vind ao meu blog</h1>

      {postNames.map((postName, i) => (
        <section>
          <h2>
            <a href={`/${postName}`}>{postName}</a>
          </h2>

          <BlogPost fileName={postName} />
        </section>
      ))}
    </main>
  );
}

async function Router({ url }) {
  let page;

  if (url.pathname === '/') {
    page = <BlogPostList />;
  } else {
    const fileName = url.pathname.slice(1);
    page = <BlogPost fileName={fileName} />;
  }

  return <AppLayout>{page}</AppLayout>;
}

function AppLayout({ children }) {
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

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);

  if (url.pathname === '/client.js') {
    const js = await fs.readFile('./client.js', 'utf-8');
    res.setHeader('Content-Type', 'text/javascript');
    res.end(js);
  } else if (url.searchParams.has('jsx')) {
    renderJSX(res, <Router url={url} />);
  } else {
    renderHTML(res, <Router url={url} />);
  }
});

async function renderJSX(res, jsx) {
  res.setHeader('Content-Type', 'application/json');
  const jsxClient = await renderJSXToClientJSX(jsx);
  const jsxString = JSON.stringify(jsxClient, encodeJSX);
  res.end(jsxString);
}

function encodeJSX(name, value) {
  if (value === Symbol.for('react.element')) {
    return '$RE';
  } else if (typeof value === 'string' && value.startsWith('$')) {
    return '$' + value;
  }

  return value;
}

async function renderJSXToClientJSX(jsx) {
  // string,boolean,number,null,undefined
  // array
  // object.$$typeof (type string, function, )
  // object
  if (
    typeof jsx === 'string' ||
    typeof jsx === 'number' ||
    typeof jsx === 'boolean' ||
    jsx == null
  ) {
    return jsx;
  }

  if (Array.isArray(jsx)) {
    return Promise.all(jsx.map((child) => renderJSXToClientJSX(child)));
  }

  if (typeof jsx === 'object') {
    if (jsx.$$typeof === Symbol.for('react.element')) {
      if (typeof jsx.type === 'string') {
        // div, span
        return {
          ...jsx,
          props: await renderJSXToClientJSX(jsx.props),
        };
      }

      if (typeof jsx.type === 'function') {
        const Component = jsx.type;
        return renderJSXToClientJSX(await Component(jsx.props));
      }
    }

    const result = {};
    for (const propName in jsx) {
      if (jsx.hasOwnProperty(propName)) {
        result[propName] = await renderJSXToClientJSX(jsx[propName]);
      }
    }
    return result;
  }

  throw new Error('Type not supported');
}

async function renderHTML(res, jsx) {
  res.setHeader('Content-Type', 'text/html');

  const jsxClient = await renderJSXToClientJSX(jsx);
  const jsxClientString = JSON.stringify(jsxClient, encodeJSX);
  let html = await renderJSXToHTML(jsx);

  html += `<script>
    window.__INITIAL_TREE__ = ${JSON.stringify(jsxClientString)}
  </script>`;
  html += `<script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@canary",
        "react-dom/client": "https://esm.sh/react-dom@canary/client"
      }
    }
  </script>`;
  html += `<script type="module" src="./client.js"></script>`;
  res.end(html);
}

// {
//   $$typeof: Symbol
//   type: String Function
//   props
// }
async function renderJSXToHTML(jsx) {
  // String | number
  // Null, boolean
  // Array
  // Object
  if (typeof jsx === 'string' || typeof jsx === 'number') {
    return jsx;
  }

  if (jsx == null || typeof jsx === 'boolean') {
    return '';
  }

  if (Array.isArray(jsx)) {
    const children = await Promise.all(
      jsx.map((child) => renderJSXToHTML(child))
    );
    let html = '';
    let isTextNode = false;
    let wasTextNode = false;

    for (let i = 0; i < jsx.length; i++) {
      isTextNode = typeof jsx[i] === 'number' || typeof jsx[i] === 'string';
      if (wasTextNode && isTextNode) {
        html += '<!-- -->';
      }

      html += children[i];
      wasTextNode = isTextNode;
    }
    return html;
  }

  if (typeof jsx === 'object') {
    if (jsx.$$typeof === Symbol.for('react.element')) {
      if (typeof jsx.type === 'function') {
        const Component = jsx.type;
        return renderJSXToHTML(await Component(jsx.props));
      }
      // div, span,
      let html = `<${jsx.type}`;
      for (const prop in jsx.props) {
        if (jsx.props.hasOwnProperty(prop) && prop !== 'children') {
          html += ` ${prop}=${escapeHtml(jsx.props[prop])}`;
        }
      }

      html += `>`;
      html += await renderJSXToHTML(jsx.props.children);
      html += `</${jsx.type}>`;
      return html;
    }
  }

  throw new Error('Not supported');
}

server.listen(8080);

console.log(`Hello Node.js v${process.versions.node}!`);

// run `node index.js` in the terminal
import express from 'express';
import {renderJSXToReadableStream} from './server/rsc';
import {renderHtml} from './server/ssr';

const app = express();

app.use('/client.js', express.static('./dist/client.js'));
app.get('*', async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  render(res, url);
})


function render(res, url) {
  const jsxStream = renderJSXToReadableStream(<Router url={url} />, {});

  if (url.searchParams.has('jsx')) {
    renderJSX(res, jsxStream);
  } else {
    renderHtml(res, jsxStream);
  }
}

function renderJSX(res, jsxStream) {
  res.setHeader('Content-Type', 'application/json');

  const result = '';

  // TODO: Renderizar JSX

  res.write(result);
}


// {
//   $$typeof: Symbol
//   type: String Function
//   props
// }
//
app.listen(8080);

console.log(`Hello Node.js v${process.versions.node}!`);

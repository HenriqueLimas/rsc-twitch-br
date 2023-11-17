// run `node index.js` in the terminal
import express from 'express';
import {Router, renderJSXToReadableStream} from './server/rsc.js';
import {renderHtml} from './server/ssr.js';
import compression from 'compression';

const app = express();

app.use(compression())
app.use('/client.js', express.static('./dist/client.js'));
app.get('/favicon.ico', () => {
  res.end()
})
app.get('*', async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  render(res, url);
})


function render(res, url) {
  const jsxStream = renderJSXToReadableStream(<Router url={url} />, { /* Client manifest */});

  if (url.searchParams.has('jsx')) {
    renderJSX(res, jsxStream);
  } else {
    renderHtml(res, jsxStream);
  }
}

function renderJSX(res, jsxStream) {
  res.setHeader('Content-Type', 'application/json');

  const reader = jsxStream.getReader();

  async function read() {
    const {done, value} = await reader.read();
    const decoder = new TextDecoder();
    const rscTree = decoder.decode(value, {stream: true})

    if (done) {
      res.write(rscTree);
      res.end();
      return;
    }

    res.write(rscTree)
    read();
  }

  read()
}


// {
//   $$typeof: Symbol
//   type: String Function
//   props
// }
//
app.listen(8080);

console.log(`Hello Node.js v${process.versions.node}!`);

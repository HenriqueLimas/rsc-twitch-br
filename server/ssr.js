import {renderToPipeableStream} from 'react-dom/server'
import {createFromReadableStream} from 'react-server-dom-webpack/client.edge'
import {PassThrough} from 'node:stream'
import htmlescape from 'htmlescape'

export async function renderHtml(res, jsxStream) {
  res.setHeader('Content-Type', 'text/html')

  const bootstrapScriptContent = `
    window.__rsc__ = window.__rsc__ || [];
    window.__addInitialRSCTree__ = window.__addInitialRSCTree__ || ((rscTree) => window.__rsc__.push(rscTree));
  `
  const inlineDataStream = new PassThrough()

  const flightResponseRef = {current: null}
  const ServerRoot = () => {
    if (flightResponseRef.current) {
      return flightResponseRef.current;
    }

    const [inlineStream, renderStream] = jsxStream.tee();
    const flightResponse = createFromReadableStream(renderStream, {ssrManifest: {}})
    flightResponseRef.current = flightResponse

    const inlineReader = inlineStream.getReader();

    let bootstrapped = false;
    async function read() {
      const {done, value} = await inlineReader.read();
      const decoder = new TextDecoder();
      const rscTree = decoder.decode(value, {stream: true})

      if (!bootstrapped) {
        inlineDataStream.write(`<script>${bootstrapScriptContent}</script>`);
        bootstrapped = true;
      }

      if (done) {
        setImmediate(() => {
          flightResponseRef.current = null;
        })
        return;
      }

      inlineDataStream.write(`<script>window.__addInitialRSCTree__(${htmlescape(rscTree)})</script>`);
      read();
    }

    read()
    return flightResponse;
  }

  const {pipe} = renderToPipeableStream(<ServerRoot />, {
    bootstrapScripts: ['/client.js'],
    onShellReady() {
      inlineDataStream.pipe(res, {end: false});
      pipe(res)
    }
  })
}

import {use} from 'react'
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

    const [renderStream, inlineStream] = jsxStream.tee();
    const flightResponse = createFromReadableStream(renderStream, {ssrManifest: {}})
    flightResponseRef.current = flightResponse

    const inlineReader = inlineStream.getReader();

    let bootstrapped = false;
    async function read() {
      const {done, value} = await inlineReader.read();
      const decoder = new TextDecoder();
      const rscTree = decoder.decode(value, {stream: true})

      if (!bootstrapped) {
        console.log('Write bootstrap script')
        inlineDataStream.write(`<script>${bootstrapScriptContent}</script>`);
        bootstrapped = true;
      }

      if (done) {
        setImmediate(() => {
          flightResponseRef.current = null;
        })
        return;
      }

      console.log('write inline script')
      inlineDataStream.write(`<script>window.__addInitialRSCTree__(${htmlescape(rscTree)})</script>`);
      res.flush()
      read();
    }

    read()
    return flightResponse;
  }

  const {pipe} = renderToPipeableStream(<ServerRoot />, {
    bootstrapScripts: ['/client.js'],
    onShellReady() {
      console.log('onShellReady')
      inlineDataStream.pipe(res, {end: false});
      pipe(res)
    }
  })
}

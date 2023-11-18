import {use} from 'react'
import {renderToPipeableStream} from 'react-dom/server'
import {createFromReadableStream} from 'react-server-dom-webpack/client.edge'
import htmlescape from 'htmlescape'
import {PassThrough} from 'node:stream'

export async function renderHtml(res, jsxStream) {
  res.setHeader('Content-Type', 'text/html')
  const flightResponseRef = {current: null}

  const inlineDataStream = new PassThrough()

  const bootstrapScriptContent = `
    window.__rsc__ = window.__rsc__ || [];
    window.__addRscTree__ = window.__addRscTree__ || ((rscTree) => window.__rsc__.push(rscTree));
  `

  const ServerRoot = () => {
    if (flightResponseRef.current) {
      return flightResponseRef.current;
    }


    const [inlineStream, renderStream] = jsxStream.tee()
    const flightResponse = createFromReadableStream(renderStream, {ssrManifest: {}})
    flightResponseRef.current = flightResponse

    const reader = inlineStream.getReader();

    let bootstrap = false;
    async function read() {
      const {done, value} = await reader.read();
      const decoder = new TextDecoder()
      const rscTree = decoder.decode(value, {stream: true})

      if (!bootstrap) {
        bootstrap = true;
        inlineDataStream.write(`<script>${bootstrapScriptContent}</script>`)
      }


      if (done) {
        flightResponseRef.current = null;
        return
      }

      inlineDataStream.write(`<script>window.__addRscTree__(${htmlescape(rscTree)});</script>`)
      read();
    }

    read();


    return use(flightResponse);
  }

  const {pipe} = renderToPipeableStream(<ServerRoot />, {
    bootstrapScripts: ['/client.js'],
    onShellReady() {
      inlineDataStream.pipe(res, {end: false})
      pipe(res)
    }
  })
}

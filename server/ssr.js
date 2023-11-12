import {use} from 'react'
import {renderToPipeableStream} from 'react-dom/server'
import {createFromReadableStream} from 'react-server-dom-webpack/client.edge'

export async function renderHtml(res, jsxStream) {
  res.setHeader('Content-Type', 'text/html')
  const flightResponseRef = {current: null}

  const ServerRoot = () => {
    if (flightResponseRef.current) {
      return flightResponseRef.current;
    }

    const flightResponse = createFromReadableStream(jsxStream, {ssrManifest: {}})
    flightResponseRef.current = flightResponse

    return use(flightResponse);
  }

  const {pipe} = renderToPipeableStream(<ServerRoot />, {
    bootstrapScripts: ['/client.js'],
    onShellReady() {
      pipe(res)
    }
  })
}

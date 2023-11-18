import {use, useState, startTransition} from 'react'
import {hydrateRoot} from 'react-dom/client';
import {createFromReadableStream, createFromFetch} from 'react-server-dom-webpack/client.browser';


const initialDataStream = new ReadableStream({
  start(controller) {
    window.__rsc__ = window.__rsc__ || []
    const encoder = new TextEncoder()
    window.__rsc__.forEach(rscChunk => {
      controller.enqueue(encoder.encode(rscChunk))
    })

    window.__addRscTree__ = rscChunk => controller.enqueue(encoder.encode(rscChunk))
    window.__rscController__ = controller;
  }
})

let updateRoot;

function Init({data}) {
  const [state, setState] = useState(use(data))
  updateRoot = setState
  return state;
}

const initialData = createFromReadableStream(initialDataStream)
hydrateRoot(document, <Init data={initialData} />);

let currentPathname = window.location.pathname;

async function navigate(pathname) {
  currentPathname = pathname;
  const rscTree = await createFromFetch(fetch(pathname + '?jsx'));

  if (currentPathname === pathname) {
    startTransition(() => {
      updateRoot(rscTree);
    })
  }
}

window.addEventListener('click', (event) => {
  if (event.target.tagName !== 'A') {
    return;
  }

  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
    return;
  }

  const href = event.target.getAttribute('href');

  if (!href.startsWith('/')) {
    return;
  }
  event.preventDefault();
  history.pushState(null, null, href);
  navigate(href);
});

window.addEventListener('popstate', () => {
  navigate(window.location.pathname);
});

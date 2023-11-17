import {use, useState} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {createFromFetch, createFromReadableStream} from 'react-server-dom-webpack/client.browser';

const initialStream = new ReadableStream({
  start(controller) {
    const encoder = new TextEncoder();
    window.__rscController__ = controller;
    window.__rsc__ = window.__rsc__ || [];
    window.__rsc__.forEach(rscTree => {
      controller.enqueue(encoder.encode(rscTree))
    })

    window.__addInitialRSCTree__ = rscTree => controller.enqueue(encoder.encode(rscTree))
  }
})

let updateRoot;

function Root({data}) {
  const [root, setRoot] = useState(use(data))
  updateRoot = setRoot
  return root;
}

const initialData = createFromReadableStream(initialStream)
hydrateRoot(document, <Root data={initialData} />);

let currentPathname = window.location.pathname;

async function navigate(pathname) {
  currentPathname = pathname;
  const response = await createFromFetch(fetch(pathname + '?jsx'));

  if (currentPathname === pathname) {
    updateRoot(response);
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

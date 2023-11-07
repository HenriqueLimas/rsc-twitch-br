import { hydrateRoot } from 'react-dom/client';

function getInitialJSX() {
  return parseClientJSX(window.__INITIAL_TREE__);
}

const root = hydrateRoot(document, getInitialJSX());

let currentPathname = window.location.pathname;

function parseClientJSX(jsxString) {
  return JSON.parse(jsxString, decodeJSX);
}

function decodeJSX(name, value) {
  if (value === '$RE') {
    return Symbol.for('react.element');
  }

  if (typeof value === 'string' && value.startsWith('$$')) {
    return value.slice(1);
  }

  return value;
}

async function navigate(pathname) {
  currentPathname = pathname;
  const response = await fetch(pathname + '?jsx');
  const jsxJSON = parseClientJSX(await response.text());

  if (currentPathname === pathname) {
    root.render(jsxJSON);
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

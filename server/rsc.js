import {AppLayout} from "../pages/app-layout.js";
import {BlogPost} from "../pages/blog-post.js";
import {BlogPostList} from "../pages/blog-post-list.js";
import {renderToReadableStream} from 'react-server-dom-webpack/server.edge'

export async function Router({url}) {
  let page;

  if (url.pathname === '/') {
    page = <BlogPostList />;
  } else {
    const fileName = url.pathname.slice(1);
    page = <BlogPost fileName={fileName} />;
  }

  return <AppLayout>{page}</AppLayout>;
}

export const renderJSXToReadableStream = (jsx, clientManifest) => {
  return renderToReadableStream(jsx, clientManifest)
}

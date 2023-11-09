import fs from 'node:fs/promises';
import {BlogPost} from './blog-post.js';

export async function BlogPostList() {
  const fileNames = await fs.readdir('./posts');
  const postNames = fileNames.map((fileName) =>
    fileName.slice(0, fileName.lastIndexOf('.'))
  );

  return (
    <main>
      <h1>Bem vind ao meu blog</h1>

      {postNames.map((postName, i) => (
        <section>
          <h2>
            <a href={`/${postName}`}>{postName}</a>
          </h2>

          <BlogPost fileName={postName} />
        </section>
      ))}
    </main>
  );
}

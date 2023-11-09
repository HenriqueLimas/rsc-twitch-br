import fs from 'node:fs/promises';

export async function BlogPost({fileName}) {
  const postContent = await fs.readFile('./posts/' + fileName + '.txt', 'utf8');
  return <article>{postContent}</article>;
}

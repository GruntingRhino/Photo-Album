const { neon } = require('@neondatabase/serverless');

function getSql() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Add it in Vercel project settings or your local env.');
  }

  return neon(connectionString);
}

async function ensureSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      title VARCHAR(60) NOT NULL,
      description VARCHAR(140) DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
      title VARCHAR(60) NOT NULL,
      caption VARCHAR(180) DEFAULT '',
      image_data TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
}

async function getAlbumsWithMemories(sql) {
  const albums = await sql`
    SELECT id, title, description, created_at
    FROM albums
    ORDER BY created_at DESC;
  `;

  const memories = await sql`
    SELECT id, album_id, title, caption, image_data, created_at
    FROM memories
    ORDER BY created_at DESC;
  `;

  return albums.map((album) => ({
    id: album.id,
    title: album.title,
    description: album.description,
    createdAt: album.created_at,
    memories: memories
      .filter((memory) => memory.album_id === album.id)
      .map((memory) => ({
        id: memory.id,
        albumId: memory.album_id,
        title: memory.title,
        caption: memory.caption,
        imageData: memory.image_data,
        createdAt: memory.created_at
      }))
  }));
}

module.exports = {
  ensureSchema,
  getAlbumsWithMemories,
  getSql
};

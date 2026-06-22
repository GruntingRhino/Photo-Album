const { ensureSchema, getAlbumsWithMemories, getSql } = require('./_lib/db');
const { readJson, sendJson } = require('./_lib/http');

function makeId() {
  return crypto.randomUUID();
}

module.exports = async (req, res) => {
  try {
    const sql = getSql();
    await ensureSchema(sql);

    if (req.method === 'GET') {
      const albums = await getAlbumsWithMemories(sql);
      return sendJson(res, 200, { mode: 'remote', albums });
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const title = String(body.title || '').trim();
      const description = String(body.description || '').trim();

      if (!title) {
        return sendJson(res, 400, { error: 'Album title is required.' });
      }

      const album = {
        id: makeId(),
        title: title.slice(0, 60),
        description: description.slice(0, 140)
      };

      await sql`
        INSERT INTO albums (id, title, description)
        VALUES (${album.id}, ${album.title}, ${album.description});
      `;

      return sendJson(res, 201, {
        album: {
          ...album,
          createdAt: new Date().toISOString(),
          memories: []
        }
      });
    }

    if (req.method === 'PATCH') {
      const id = String(req.query.id || '').trim();
      const body = await readJson(req);
      const title = String(body.title || '').trim();
      const description = String(body.description || '').trim();

      if (!id || !title) {
        return sendJson(res, 400, { error: 'Album id and title are required.' });
      }

      await sql`
        UPDATE albums
        SET title = ${title.slice(0, 60)},
            description = ${description.slice(0, 140)}
        WHERE id = ${id};
      `;

      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '').trim();
      if (!id) {
        return sendJson(res, 400, { error: 'Album id is required.' });
      }

      await sql`DELETE FROM albums WHERE id = ${id};`;
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    const isEnvIssue = /DATABASE_URL/.test(error.message || '');

    if (isEnvIssue && req.method === 'GET') {
      return sendJson(res, 200, { mode: 'local', albums: [] });
    }

    return sendJson(res, 500, { error: error.message || 'Server error.' });
  }
};

const { ensureSchema, getSql } = require('./_lib/db');
const { readJson, sendJson } = require('./_lib/http');

function makeId() {
  return crypto.randomUUID();
}

module.exports = async (req, res) => {
  try {
    const sql = getSql();
    await ensureSchema(sql);

    if (req.method === 'POST') {
      const body = await readJson(req);
      const albumId = String(body.albumId || '').trim();
      const title = String(body.title || '').trim();
      const caption = String(body.caption || '').trim();
      const imageData = String(body.imageData || '').trim();

      if (!albumId || !title || !imageData) {
        return sendJson(res, 400, { error: 'Album, title, and image are required.' });
      }

      const memory = {
        id: makeId(),
        albumId,
        title: title.slice(0, 60),
        caption: caption.slice(0, 180),
        imageData
      };

      await sql`
        INSERT INTO memories (id, album_id, title, caption, image_data)
        VALUES (${memory.id}, ${memory.albumId}, ${memory.title}, ${memory.caption}, ${memory.imageData});
      `;

      return sendJson(res, 201, {
        memory: {
          ...memory,
          createdAt: new Date().toISOString()
        }
      });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '').trim();
      if (!id) {
        return sendJson(res, 400, { error: 'Memory id is required.' });
      }

      await sql`DELETE FROM memories WHERE id = ${id};`;
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Server error.' });
  }
};

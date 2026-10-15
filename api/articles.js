import pool from "../lib/db.js";
import { allowCors, authenticate } from "../lib/auth.js";

const validTasks = new Set(["tarea_1", "tarea_2", "tarea_3", "tarea_4"]);

function validateArticle(title, content, task) {
  if (!validTasks.has(task)) return "La tarea seleccionada no es válida.";
  if (!title || title.length > 150) return "El título debe tener entre 1 y 150 caracteres.";
  if (!content || content.length > 10000) return "El contenido debe tener entre 1 y 10,000 caracteres.";
  return "";
}

export default async function handler(req, res) {
  if (allowCors(req, res, "GET, POST, PATCH, DELETE")) return;

  const session = authenticate(req);
  if (!session) {
    return res.status(401).json({ error: "La sesión no es válida o ha vencido." });
  }

  try {
    if (req.method === "GET") {
      const task = req.query.task;
      if (!validTasks.has(task)) {
        return res.status(400).json({ error: "La tarea seleccionada no es válida." });
      }

      const [articles] = await pool.execute(
        `SELECT id, tarea, titulo, contenido, creado_en, actualizado_en
         FROM articulos
         WHERE usuario_id = ? AND tarea = ?
         ORDER BY actualizado_en DESC`,
        [session.userId, task]
      );
      return res.status(200).json({ articles });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (req.method === "POST") {
      const task = body?.task;
      const title = body?.title?.trim();
      const content = body?.content?.trim();
      const validationError = validateArticle(title, content, task);

      if (validationError) return res.status(400).json({ error: validationError });

      const [result] = await pool.execute(
        "INSERT INTO articulos (usuario_id, tarea, titulo, contenido) VALUES (?, ?, ?, ?)",
        [session.userId, task, title, content]
      );
      return res.status(201).json({ id: result.insertId });
    }

    const id = Number(req.query.id || body?.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ error: "El artículo no es válido." });
    }

    if (req.method === "PATCH") {
      const task = body?.task;
      const title = body?.title?.trim();
      const content = body?.content?.trim();
      const validationError = validateArticle(title, content, task);

      if (validationError) return res.status(400).json({ error: validationError });

      const [result] = await pool.execute(
        `UPDATE articulos SET titulo = ?, contenido = ?
         WHERE id = ? AND usuario_id = ? AND tarea = ?`,
        [title, content, id, session.userId, task]
      );

      if (!result.affectedRows) {
        return res.status(404).json({ error: "No se encontró el artículo." });
      }
      return res.status(200).json({ success: true });
    }

    if (req.method === "DELETE") {
      const [result] = await pool.execute(
        "DELETE FROM articulos WHERE id = ? AND usuario_id = ?",
        [id, session.userId]
      );

      if (!result.affectedRows) {
        return res.status(404).json({ error: "No se encontró el artículo." });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Método no permitido." });
  } catch (error) {
    console.error("ERROR ARTICLES:", error);
    return res.status(500).json({ error: "No se pudieron procesar los artículos." });
  }
}

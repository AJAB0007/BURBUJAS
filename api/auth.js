import bcrypt from "bcryptjs";
import pool from "../lib/db.js";
import { allowCors, authenticate, createToken } from "../lib/auth.js";

const usernamePattern = /^[\p{L}\p{N}._-]{3,90}$/u;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (allowCors(req, res, "POST")) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido." });
  }

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "La autenticación no está configurada." });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const action = body?.action;

    if (action === "verify") {
      const session = authenticate(req);
      if (!session) {
        return res.status(401).json({ error: "La sesión no es válida o ha vencido." });
      }

      const [rows] = await pool.execute(
        "SELECT id, username, email FROM usuarios WHERE id = ? LIMIT 1",
        [session.userId]
      );

      if (!rows[0]) {
        return res.status(401).json({ error: "El usuario de la sesión ya no existe." });
      }

      return res.status(200).json({ user: rows[0] });
    }

    if (action === "register") {
      const username = body.username?.trim();
      const email = body.email?.trim().toLowerCase();
      const password = body.password || "";

      if (!usernamePattern.test(username || "")) {
        return res.status(400).json({
          error: "El username debe tener de 3 a 90 caracteres y no contener espacios."
        });
      }

      if (!emailPattern.test(email || "") || email.length > 100) {
        return res.status(400).json({ error: "Ingrese un correo electrónico válido." });
      }

      const passwordBytes = Buffer.byteLength(password, "utf8");
      if (password.length < 8 || passwordBytes > 72) {
        return res.status(400).json({
          error: "La contraseña debe tener al menos 8 caracteres y no superar 72 bytes."
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const [result] = await pool.execute(
        "INSERT INTO usuarios (username, email, contrasenia) VALUES (?, ?, ?)",
        [username, email, passwordHash]
      );
      const user = { id: result.insertId, username, email };

      return res.status(201).json({ user, token: createToken(user) });
    }

    if (action === "login") {
      const identifier = body.identifier?.trim();
      const password = body.password || "";

      if (!identifier || !password) {
        return res.status(400).json({ error: "Ingrese su usuario o email y contraseña." });
      }

      const [rows] = await pool.execute(
        "SELECT id, username, email, contrasenia FROM usuarios WHERE username = ? OR email = ? LIMIT 1",
        [identifier, identifier.toLowerCase()]
      );
      const user = rows[0];

      if (!user || !(await bcrypt.compare(password, user.contrasenia))) {
        return res.status(401).json({ error: "Usuario, email o contraseña incorrectos." });
      }

      const publicUser = { id: user.id, username: user.username, email: user.email };
      return res.status(200).json({ user: publicUser, token: createToken(publicUser) });
    }

    return res.status(400).json({ error: "Acción de autenticación no válida." });
  } catch (error) {
    console.error("ERROR AUTH:", error);

    if (error instanceof SyntaxError) {
      return res.status(400).json({ error: "El cuerpo de la petición no es JSON válido." });
    }

    if (error.code === "ER_DUP_ENTRY") {
      const field = error.message.includes("email") ? "email" : "username";
      return res.status(409).json({ error: `Ese ${field} ya está registrado.` });
    }

    return res.status(500).json({ error: "No se pudo completar la autenticación." });
  }
}

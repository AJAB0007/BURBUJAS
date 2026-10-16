import express from 'express';
import authHandler from './api/auth.js';
import articlesHandler from './api/articles.js';

const app = express();
app.use(express.json());

app.all('/api/auth', async (req, res) => {
  try {
    await authHandler(req, res);
  } catch (error) {
    console.error('Error en /api/auth:', error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

app.all('/api/articles', async (req, res) => {
  try {
    await articlesHandler(req, res);
  } catch (error) {
    console.error('Error en /api/articles:', error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor API corriendo en el puerto ${PORT}`));

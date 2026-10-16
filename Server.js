import express from 'express';
import authHandler from './api/auth.js';
import articlesHandler from './api/articles.js';
import chatHandler from './api/chat.js';

const app = express();

// Permite a Express procesar datos enviados en formato JSON (como el formulario de registro)
app.use(express.json());

// Vincula las rutas /api con las funciones de tu carpeta api/
app.all('/api/auth', (req, res) => authHandler(req, res));
app.all('/api/articles', (req, res) => articlesHandler(req, res));
app.all('/api/chat', (req, res) => chatHandler(req, res));

// Define el puerto interno donde escuchará la API
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor API corriendo en el puerto ${PORT}`);
});

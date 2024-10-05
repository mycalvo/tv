
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const app = express();

// URL Xtream remota guardada en el servidor (debe ser personalizada)
const XTREAM_URL = 'http://xtream.server.com/player_api.php';

// Usuario y contraseña únicos proporcionados por tu servidor
const SERVER_USER = 'user_unico';
const SERVER_PASSWORD = 'password_unico';

// Fecha de expiración localmente gestionada
const EXPIRATION_DATE = '2024-12-31';

// Contador de usuarios conectados
let connectedUsers = 0;

// Función para autenticar a los clientes
const authenticate = (username, password) => {
  if (username === SERVER_USER && password === SERVER_PASSWORD) {
    connectedUsers += 1;
    return true;
  }
  return false;
};

// Función para registrar logs en un archivo
const logToFile = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} ${message}\n`;
  fs.appendFile('server_log.log', logMessage, (err) => {
    if (err) console.error('Error al escribir en el log:', err);
  });
};

// Ruta para reenviar la solicitud de lista M3U o JSON
app.get('/playlist', async (req, res) => {
  const { username, password, type = 'm3u' } = req.query;

  // Verificar si las credenciales del cliente son correctas
  if (!authenticate(username, password)) {
    return res.status(403).send('Credenciales inválidas');
  }

  try {
    // Hacer la petición a la URL Xtream remota
    const xtreamParams = {
      username: SERVER_USER,
      password: SERVER_PASSWORD,
      action: 'get_live_streams',
    };

    const response = await axios.get(XTREAM_URL, { params: xtreamParams });

    // Registrar en el log el resultado de la petición
    logToFile(`Petición URL remota: user=${username}, code=${response.status}, content=${response.data.substring(0, 100)}`);

    // Decidir el formato a enviar al cliente
    if (type === 'm3u') {
      res.setHeader('Content-Type', 'audio/mpegurl');
      return res.send(response.data);
    } else if (type === 'json') {
      return res.json(response.data);
    } else {
      return res.status(400).send('Formato inválido');
    }
  } catch (error) {
    logToFile(`Error en la petición remota: ${error.message}`);
    return res.status(502).send('Error al obtener la lista desde el servidor Xtream');
  }
});

// Ruta para obtener la lista VOD o series desde la URL Xtream remota
app.get('/player_api.php', async (req, res) => {
  const { username, password, action } = req.query;

  // Verificar si las credenciales del cliente son correctas
  if (!authenticate(username, password)) {
    return res.status(403).send('Credenciales inválidas');
  }

  try {
    // Hacer la petición a la URL Xtream remota
    const xtreamParams = {
      username: SERVER_USER,
      password: SERVER_PASSWORD,
      action: action,
    };

    const response = await axios.get(XTREAM_URL, { params: xtreamParams });

    // Registrar en el log el resultado de la petición
    logToFile(`Petición API remota: user=${username}, code=${response.status}, content=${response.data.substring(0, 100)}`);

    // Enviar la respuesta obtenida al cliente
    return res.json(response.data);
  } catch (error) {
    logToFile(`Error en la petición remota: ${error.message}`);
    return res.status(502).send('Error al obtener datos desde el servidor Xtream');
  }
});

// Ruta para obtener información de usuario directamente desde los datos gestionados localmente
app.get('/user_info', (req, res) => {
  const { username, password } = req.query;

  // Verificar si las credenciales del cliente son correctas
  if (!authenticate(username, password)) {
    return res.status(403).send('Credenciales inválidas');
  }

  // Proporcionar la información del usuario gestionada localmente
  const userInfo = {
    username: SERVER_USER,
    password: SERVER_PASSWORD,
    expiration_date: EXPIRATION_DATE,
    connected_users: connectedUsers, // Número de usuarios conectados
  };

  // Registrar la consulta de información de usuario
  logToFile(`Consulta de información de usuario: ${username}`);

  return res.json(userInfo);
});

// Ruta para reiniciar el contador de usuarios conectados (solo para administración)
app.get('/reset_users', (req, res) => {
  connectedUsers = 0;
  logToFile("Contador de usuarios conectados reiniciado.");
  return res.send("Contador de usuarios conectados reiniciado.");
});

// Iniciar el servidor en Vercel
module.exports = app;

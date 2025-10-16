// Server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const DATA_FILE = path.join(__dirname, 'data.json'); // si tu archivo se llama perros.json, cámbialo aquí
const app = express();
app.use(express.json());
app.use(cors());

/* ---------- Helpers ---------- */

function readDatabase() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    // si el archivo no existe, devolvemos array vacío
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function writeDatabase(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function nextId(db) {
  if (!db || db.length === 0) return 1;
  return Math.max(...db.map(d => Number(d.id) || 0)) + 1;
}

function compareValues(aVal, bVal, order = 'asc') {
  // normaliza
  if (aVal === undefined || aVal === null) return 1;
  if (bVal === undefined || bVal === null) return -1;

  // numérico?
  const aNum = Number(aVal);
  const bNum = Number(bVal);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
    return (aNum - bNum) * (order === 'desc' ? -1 : 1);
  }

  // fecha ISO?
  const aDate = Date.parse(aVal);
  const bDate = Date.parse(bVal);
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
    return (aDate - bDate) * (order === 'desc' ? -1 : 1);
  }

  // string (case-insensitive, localeCompare)
  const res = String(aVal).localeCompare(String(bVal), undefined, { sensitivity: 'base', numeric: true });
  return (order === 'desc') ? -res : res;
}

/* ---------- Endpoints ---------- */

/**
 * GET /
 * - Devuelve lista completa o filtrada por nombre (query: nombre)
 * - Soporta sorting dinámico: ?sort=<campo>&order=asc|desc
 * Ejemplos:
 *  GET /?nombre=to  -> filtra por "to" en nombre (Toby, etc.)
 *  GET /?sort=edad&order=desc
 */
app.get('/', (req, res) => {
  try {
    let db = readDatabase();

    // Filtering por nombre (parcial, case-insensitive)
    const nombreFilter = req.query.nombre;
    if (typeof nombreFilter === 'string' && nombreFilter.trim() !== '') {
      const q = nombreFilter.trim().toLowerCase();
      db = db.filter(p => (p.nombre || '').toString().toLowerCase().includes(q));
    }

    // Sorting dinámico
    const sortField = req.query.sort;
    const order = (req.query.order || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
    if (sortField) {
      db = db.slice().sort((a, b) => compareValues(a[sortField], b[sortField], order));
    }

    return res.json(db);
  } catch (err) {
    console.error('GET / error:', err);
    return res.status(500).json({ error: 'Error leyendo la base de datos' });
  }
});

/**
 * GET /:id
 * - Devuelve un perro por id
 */
app.get('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const db = readDatabase();
    const found = db.find(p => Number(p.id) === id);
    if (!found) return res.status(404).json({ error: 'Perro no encontrado' });
    return res.json(found);
  } catch (err) {
    console.error('GET /:id error:', err);
    return res.status(500).json({ error: 'Error leyendo la base de datos' });
  }
});

/**
 * POST /
 * - Crear nuevo perro
 * - Body requerido: nombre, raza, edad, peso, fecha_ingreso
 * - Retorna 201 + objeto creado
 */
app.post('/', (req, res) => {
  try {
    const { nombre, raza, edad, peso, fecha_ingreso } = req.body;
    if ([nombre, raza, edad, peso, fecha_ingreso].some(v => v === undefined)) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const db = readDatabase();
    const nuevo = {
      id: nextId(db),
      nombre,
      raza,
      edad: Number(edad),
      peso: Number(peso),
      fecha_ingreso
    };

    db.push(nuevo);
    writeDatabase(db);

    return res.status(201).json(nuevo);
  } catch (err) {
    console.error('POST / error:', err);
    return res.status(500).json({ error: 'Error guardando el nuevo perro' });
  }
});

/**
 * PATCH /:id
 * - Actualiza parcialmente los campos de un perro por id
 * - Body puede contener cualquier subconjunto de campos (nombre, raza, edad, peso, fecha_ingreso)
 */
app.patch('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const updates = req.body;
    if (!updates || typeof updates !== 'object') return res.status(400).json({ error: 'Body inválido' });

    const db = readDatabase();
    const idx = db.findIndex(p => Number(p.id) === id);
    if (idx === -1) return res.status(404).json({ error: 'Perro no encontrado' });

    // Permitir sólo campos esperados
    const allowed = ['nombre', 'raza', 'edad', 'peso', 'fecha_ingreso'];
    for (const key of Object.keys(updates)) {
      if (!allowed.includes(key)) continue;
      if (key === 'edad' || key === 'peso') {
        db[idx][key] = Number(updates[key]);
      } else {
        db[idx][key] = updates[key];
      }
    }

    writeDatabase(db);
    return res.json(db[idx]);
  } catch (err) {
    console.error('PATCH /:id error:', err);
    return res.status(500).json({ error: 'Error actualizando el perro' });
  }
});

/**
 * DELETE /:id
 * - Elimina un perro por id
 */
app.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    let db = readDatabase();
    const idx = db.findIndex(p => Number(p.id) === id);
    if (idx === -1) return res.status(404).json({ error: 'Perro no encontrado' });

    const removed = db.splice(idx, 1)[0];
    writeDatabase(db);
    return res.json({ deleted: removed });
  } catch (err) {
    console.error('DELETE /:id error:', err);
    return res.status(500).json({ error: 'Error borrando el perro' });
  }
});

/* ---------- Server start ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

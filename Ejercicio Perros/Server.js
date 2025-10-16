const express = require('express');
const perros = require('./data.json')
const fs = require('fs');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

const database = perros;

app.get("/", (req, res) => {
    return res.json(database);
});

app.post("/", (req, res) => {
    let nuevoPerro = req.body;
    console.log(nuevoPerro);
    if (nuevoPerro.nombre === undefined || nuevoPerro.raza === undefined || nuevoPerro.edad === undefined || nuevoPerro.peso === undefined || nuevoPerro.fecha_ingreso == undefined) {
        return res.sendStatus(400);
    }
    nuevoPerro.id = database[database.length - 1].id + 1;
    database.push(nuevoPerro);

    fs.writeFileSync('./data.json', JSON.stringify(database), 'utf-8');

    return res.sendStatus(200);
});

app.patch("/", (req, res) => {
    let nuevoPerro = req.body;
    console.log(nuevoPerro);
    if (nuevoPerro.id === undefined || nuevoPerro.nombre === undefined || nuevoPerro.raza === undefined || nuevoPerro.edad === undefined || nuevoPerro.peso === undefined || nuevoPerro.fecha_ingreso == undefined) {
        return res.sendStatus(400);
    }

    database.forEach(p => {
        if (p.id == nuevoPerro.id) {
            p.nombre = nuevoPerro.nombre;
            p.edad = nuevoPerro.edad;
            p.raza = nuevoPerro.raza;
            p.peso = nuevoPerro.peso;
            p.fecha_ingreso = nuevoPerro.fecha_ingreso;
        }

    });

    fs.writeFileSync('./data.json', JSON.stringify(database), 'utf-8');

    return res.sendStatus(200);
})


app.listen(3000, () => {
    console.log("Server running on port 3000");
});
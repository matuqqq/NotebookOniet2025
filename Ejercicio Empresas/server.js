const express = require('express');
const cors = require('cors');
const data = require('./data.json')

const app = express();
app.use(cors());


app.get("/data", (req, res) => {

    let result = {};
    data.forEach(registro => {
        if (!result[registro.Empresa]) {
            result[registro.Empresa] = {
                "Empresa": registro.Empresa,
                "ProduccionTotal": 0,
                "CantidaPiezasConFallas": 0,
            };
        }
        result[registro.Empresa]['ProduccionTotal'] += registro.ProduccionTotal;
        result[registro.Empresa]['CantidaPiezasConFallas'] += registro.CantidaPiezasConFallas;

        result[registro.Empresa]['CantidadPiezasOk'] = result[registro.Empresa].ProduccionTotal - result[registro.Empresa].CantidaPiezasConFallas;
        result[registro.Empresa]['PPiezasOk'] = (result[registro.Empresa]['CantidadPiezasOk'] / result[registro.Empresa].ProduccionTotal) * 100;
        result[registro.Empresa]['PPiezasError'] = (result[registro.Empresa].CantidaPiezasConFallas / result[registro.Empresa].ProduccionTotal) * 100;
    });

    return res.json(result);

});


app.listen(3001, () => {
    console.log("server running on port 3001");
})


const { Pool } = require('pg');
const config = require("config");

let db = new Pool(config.get("dbConfig"));

const SQLQueries = {
    sqlGetNode: "SELECT * FROM Nodes ORDER BY id;"
}

const Model = {
    getData: async function() {
        let result = null;
        let data = [];
        try {
            result = await db.query(SQLQueries.sqlGetNode);
        } catch (e) {
            console.log('DB Error: ', e.message);
        }

        if (result.rows.length == 0) {
            console.log("Return empty recordset");
        }

        for (let row of result.rows) {
            let rec = {};
            rec.id = row.id;
            rec.place = row.place;
            rec.name = row.name;
            rec.value = row.value;
            data.push(rec);
        }

        return data;
    },

}

module.exports = Model;

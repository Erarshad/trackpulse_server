const { initDBSetup } = require('../database/db_initialization');
const { connectToDB } = require('../database/db_driver');
const { ApiResponse } = require("../base/response");
const { plan } = require("../const/plan");
const express = require('express'); //importing express
const mySQL = require("mysql2");
const { v4: uuidv4 } = require('uuid');
const { json } = require('body-parser');
const router = express.Router();

router.post("/fetchApps", async (req, res) => {
    const connection = await connectToDB();
    let email=req.body.email??"";
    connection.execute(
        `select * from appConfig INNER JOIN user ON appConfig.userEmail=user.email where appConfig.userEmail=?;`,
        [email],
        function (err, results, fields) {
            console.log((err?.errno ?? "") + " " + (err?.sqlMessage ?? ""));
            console.log(results); // results contains rows returned by server
            console.log(fields); // fields contains extra meta data about results, if available
            return   res.json(new ApiResponse(200, ``,results));


        }
    );

   

});


module.exports = router;
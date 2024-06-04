const express = require('express')
const app = express()
const bodyParser = require('body-parser'); //importing body-parser
const cors = require('cors');
const mySQL = require("mysql2");
const {connectToDB} = require("./database/db_driver");
const {initDBSetup} = require("./database/db_initialization");
const setupRoute=require("./routes/setup.js"); //importing user routes
const renderRoute=require("./routes/render.js");

const port = 3300 || process.env.PORT
// support parsing of application/json type post data
app.use(bodyParser.json({limit: '200mb'}));
app.use(cors());
//sending all user routes to user file
app.use("/setup",setupRoute);
app.use("/render",renderRoute);

async function initState(){
 //first run function cycle

  await initDBSetup();


}
 










app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})

initState();
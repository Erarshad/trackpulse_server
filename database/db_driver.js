const mySQL = require("mysql2");

let instanceCache=[];

 async function connectToDB(){

    if(instanceCache.length>0){
        return instanceCache[0];
    }

    
    const connection =  await mySQL.createConnection({
        host: 'localhost',
        user: 'root',
        password:"Ar1sh@dQ",
        database: 'trackpulse_db'
    });

    instanceCache.push(connection);

    
    return connection;

}

module.exports = {
    connectToDB
};
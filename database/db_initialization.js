const mySQL = require("mysql2");
const { connectToDB } = require("./db_driver");
const {scheduleMarkAndSweep}=require("./sql_event_cron");

async function initDBSetup() {
    const connection = await connectToDB();
    try {
        connection.execute(
            `CREATE TABLE USER(
                email VARCHAR(500) PRIMARY KEY NOT NULL,
                Name TEXT NOT NULL,
                plan TEXT NOT NULL,
                createdAt DATETIME NOT NULL,
                Expiry DATETIME NOT NULL
            );
            `,
            [],
            function (err, results, fields) {
                console.log((err?.errno ?? "") + " " + (err?.sqlMessage ?? ""));
                console.log(results); // results contains rows returned by server
                console.log(fields); // fields contains extra meta data about results, if available
            }
        );
    } catch (e) {
        console.log(e);
    }

    try {
        connection.execute(
            `CREATE TABLE AppConfig(
                AppId VARCHAR(500) PRIMARY KEY NOT NULL,
                userEmail VARCHAR(500)  NOT NULL,
                quota INT NOT NULL,
                quotaAddedAt DATETIME NOT NULL,
                URL TEXT NOT NULL
            );
            `,
            [],
            function (err, results, fields) {
                console.log((err?.errno ?? "") + " " + (err?.sqlMessage ?? ""));
                console.log(results); // results contains rows returned by server
                console.log(fields); // fields contains extra meta data about results, if available
            }
        );
    } catch (e) {
        console.log(e);
    }

    try {
        connection.execute(
            `CREATE TABLE Event(
              userEmail VARCHAR(500) NOT NULL,
              AppId TEXT NOT NULL,
              date DATETIME NOT NULL,
              guestId TEXT NOT NULL,
              appVisitordetail TEXT NOT NULL,
              appEvents LONGTEXT,
              appErrors LONGTEXT,
              appSession LONGTEXT 
            );
          `,
          //here appevents and apperrors and appsession are not mark as not null bc we are entering value pace by pace
            [],
            function (err, results, fields) {
                console.log((err?.errno ?? "") + " " + (err?.sqlMessage ?? ""));
                console.log(results); // results contains rows returned by server
                console.log(fields); // fields contains extra meta data about results, if available
            }
            /***
             * SELECT *
                    FROM app
                    WHERE ABS(TIMESTAMPDIFF(MINUTE, app.addedAt, NOW())) <= 20;
                    difference between the current time and the DateTime column with 20 minutes.
             */
        );

    } catch (e) {
        console.log(e);
    }


   // scheduleMarkAndSweep(connection);






}



module.exports = {
    initDBSetup
};


function scheduleMarkAndSweep(connection){
    //TODO: I HAVE TO CONVERT THIS MARK AND SWEEP TO PROPER CRONJOB
    /***
     * here this event scheduler will run everyday in sql for eliminating the data of those user
     * which donot having the active plan, we will give 15 days after expiry to renew else data will be eliminated
     */
    try {
        connection.execute(
            `CREATE EVENT jobForExpiredDeletion
            ON SCHEDULE EVERY 1 DAY
            STARTS '2024-06-01 12:01:00'
            DO 
            DELETE FROM user
            WHERE DATE_ADD(Expiry, INTERVAL 15 DAY) <= CURDATE();
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

        console.log("Mark and sweep scheduled for eliminating the unnecessary data");

    } catch (e) {
        console.log(e);
    }


}

module.exports = {
    scheduleMarkAndSweep
};
const { initDBSetup } = require('../database/db_initialization');
const { connectToDB } = require('../database/db_driver');
const { ApiResponse } = require("../base/response");
const { plan } = require("../const/plan");
const express = require('express'); //importing express
const mySQL = require("mysql2");
const { v4: uuidv4 } = require('uuid');
const { json } = require('body-parser');
const router = express.Router();

router.post("/getAppEvent", async (req, res) => {
    
    const connection = await connectToDB();
    let email=req.body.userEmail;
    let appId=req.body.AppId;
    let guestId=req.body.guestId;
    /**this api will give events for standalone app for standalone gues*/

    if(email!=null && appId!=null && guestId!=null){

        connection.execute(
            `select * from event where userEmail=? && AppId=? && guestId=?`,
            [email,appId,guestId],
            function (err, results, fields) {
                console.log((err?.errno ?? "") + " " + (err?.sqlMessage ?? ""));
                console.log(results); // results contains rows returned by server
                console.log(fields); // fields contains extra meta data about results, if available
                
                
                return   res.json(new ApiResponse(200, ``,results[0]));


            }
        );


       
    }else{
        return res.json(new ApiResponse(404, `Please send proper body i.e appId and userEmail & guestId`));

    }
   

});


router.post("/getEvents", async (req, res) => {
    
    const connection = await connectToDB();
    let page=req.body.page;
    let email=req.body.email;
    let appId=req.body.appId;
    let rowsPerPage=10;
    /**
     * SELECT * FROM event LIMIT <starting_index>, <quantity of record>;
     *  ORDER BY date DESC ---means pulling record in descending order
     */
    if(page!=null && page>0 && email!=null && appId!=null){
        connection.execute(
            `SELECT *
                FROM event Where userEmail=? AND AppId=?
                ORDER BY date DESC LIMIT ${(page-1)*rowsPerPage}, ${rowsPerPage};`,
            [email,appId],
            function (err, results, fields) {
                console.log((err?.errno ?? "") + " " + (err?.sqlMessage ?? ""));
                console.log(results); // results contains rows returned by server
                console.log(fields); // fields contains extra meta data about results, if available
                
                return   res.json(new ApiResponse(200, ``,results));


            }
        );
    }else{
        return res.json(new ApiResponse(404, `Please send proper body i.e page,email,appid, page should be greater than 0`));

    }
   

});



router.post("/getCounts", async (req, res) => {
    
    const connection = await connectToDB();

    if(req.body.appId!=null && req.body.userEmail!=null){
        connection.execute(
            `SELECT 
                COUNT(*) AS total_events,
                COUNT(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE NULL END) AS events_last_7_days,
                COUNT(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE NULL END) AS events_last_30_days
            FROM event
            WHERE event.AppId=? && event.userEmail=?;`,
            [req.body.appId,req.body.userEmail],
            function (err, results, fields) {
                console.log((err?.errno ?? "") + " " + (err?.sqlMessage ?? ""));
                console.log(results); // results contains rows returned by server
                console.log(fields); // fields contains extra meta data about results, if available
                
                return   res.json(new ApiResponse(200, ``,results));


            }
        );
    }else{
        return res.json(new ApiResponse(404, `Please send proper body i.e appId and userEmail`));

    }
   

});


router.post("/fetchApps", async (req, res) => {
    const connection = await connectToDB();
    let email=req.body.email??"";
    if(email.length>0){
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
   }else{
    return  res.json(new ApiResponse(401, `Please send the proper payload`));
   }

   

});

router.post("/fetchplan", async (req, res) => {
    const connection = await connectToDB();
    let email=req.body.email??"";
    if(email.length>0){
        connection.execute(
            `select * from user where email=?;`,
            [email],
            function (err, results, fields) {
                console.log((err?.errno ?? "") + " " + (err?.sqlMessage ?? ""));
                console.log(results); // results contains rows returned by server
                console.log(fields); // fields contains extra meta data about results, if available
                if(results.length>0){
                  let userInfo=results[0];
                  let choosenPlan=plan[userInfo.plan];
                  let preparedData={...userInfo, ...choosenPlan};
                  return res.json(new ApiResponse(200, ``,preparedData));
                }else{
                    return  res.json(new ApiResponse(404, `No record found`));
                }


            }
        );
   }else{
    return  res.json(new ApiResponse(401, `Please send the proper payload`));
   }

   

});

router.post("/refreshQuotaForApp", async (req, res) => {
    const connection = await connectToDB();
    let userEmail=req.body.email??"";
    let appId=req.body.appId??"";
    let planType=req.body.plan??"";
    let choosenPlan= plan[planType];
    let session_quota=choosenPlan["sessions_perday"];
    if(userEmail.length>0 && appId.length>0 && planType.length>0){
        connection.execute(
            `UPDATE appconfig SET quota =?, quotaAddedAt=?  WHERE userEmail=? && AppId=?`,
            [session_quota, new Date().toISOString().slice(0, 19).replace('T', ' '),userEmail,appId],
            async function (err, results, fields) {
                console.log(err);
                console.log(results);
                console.log(fields);  
                res.json(new ApiResponse(200, `quota has been updated`,{
                    "quotaPerDay":session_quota
                })); 
            }
        ); 
    }else{
        return  res.json(new ApiResponse(401, `Please send the proper payload`));
        
    }


});


module.exports = router;
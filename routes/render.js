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
            [session_quota, onlyDate().toISOString().slice(0, 19).replace('T', ' '),userEmail,appId],
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
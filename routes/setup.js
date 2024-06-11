const { initDBSetup } = require('../database/db_initialization');
const { connectToDB } = require('../database/db_driver');
const { ApiResponse } = require("../base/response");
const { plan } = require("../const/plan");
const express = require('express'); //importing express
const mySQL = require("mysql2");
const { v4: uuidv4 } = require('uuid');
const { json } = require('body-parser');
const router = express.Router();


router.post("/user", async (req, res) => {
    const connection = await connectToDB();
    let email = req.body.email;
    let name = req.body.name;
    let planId = req.body.planId;
    let expiry = new Date();
    const userPlan = plan[planId];
    console.log(userPlan);
    if (userPlan.type === 'free') {
      //  expiry = new Date("January 1, 2099 01:15:00");//means lifetime
      //15 days free, plan 
        expiry = new Date(expiry.setDate(expiry.getMonth() + 15));

    } else {
        let months = userPlan.validity_in_month;
        //current date + months
        expiry = new Date(expiry.setMonth(expiry.getMonth() + months));
        console.log(expiry);
    }



    connection.execute(
        `INSERT INTO user (email,Name, plan, createdAt, Expiry)
            VALUES (?,?,?,?,?);`,
        [email, name, planId, new Date().toISOString().slice(0, 19).replace('T', ' '), expiry.toISOString().slice(0, 19).replace('T', ' ')],
        function (err, results, fields) {
            if (err?.errno ?? 0 === 1062) {
                return res.json(new ApiResponse(200, `${email} already exist in record`, ""))
            }

            if (results != null) {
                return res.json(new ApiResponse(200, "data saved", ""));
            }
            console.log((err?.errno ?? "") + " " + (err?.sqlMessage ?? ""));
            console.log(results); // results contains rows returned by server
            console.log(fields); // fields contains extra meta data about results, if available

        }
    );


});

router.post("/addApp", async (req, res) => {
    const connection = await connectToDB();
    /**
     * we will do validation from front end
     */
    let appId = uuidv4();
    let userEmail = req.body.userEmail;
    let webURL = req.body.url;
    let appName=req.body.appName;
    let perdaySession = 0;
    await connection.execute(
        `select * from user where email=?`,
        [userEmail],
        async function (err, results, fields) {
            let userDetail = results[0];
            perdaySession = plan[userDetail.plan].sessions_perday;
            connection.execute(
                "INSERT INTO appconfig(AppId,userEmail, quota, quotaAddedAt, URL,appName) VALUES (?,?,?,?,?,?);",
                [appId, userEmail, perdaySession, new Date().toISOString().slice(0, 19).replace('T', ' '), webURL, appName],
                function (err, results, fields) {
                    if (err?.errno ?? 0 === 1062) {
                        return res.json(new ApiResponse(200, `${appId} already exist in record`, ""))
                    }

                    if (results != null) {
                        return res.json(new ApiResponse(200, `${webURL} added`, {
                            "appId": appId,
                            "session_quota_perday": perdaySession
                        }));
                    }
                    console.log((err?.errno ?? "") + " " + (err?.sqlMessage ?? ""));
                    console.log(results); // results contains rows returned by server
                    console.log(fields); // fields contains extra meta data about results, if available

                }
            );


        }
    );


});


router.post("/registerEvent", async (req, res) => {

    //validate user and app exist in database or not  using joins
    //see the quota  using join
    //register the event
    //update the quota
    const connection = await connectToDB();
    let email = req.body.email;
    let appId = req.body.appId;
    let country = req.body.country;
    let device = req.body.device;
    let isReturning = req.body.isReturning;
    let currentDateTime = new Date();
    let useripAddress = req.ip.includes(':') ? req.ip.split(':').pop() : req.ip;
    let appSession = req.body.appSession;
    let appEvents = req.body.appEvents;
    let appErrors = req.body.appErrors;
    let guestId=req.body.guestId;
    //it will generate the below  new guestId only if you wonot sent appSession and appevent and apperros, so it remain easy to map data with guestid 
    //guest id nothing but the visitor id
    if((appSession!=null || appEvents!=null || appErrors!=null) && guestId==null){


        return res.json(new ApiResponse(404, "Please send the guestId", ""));

    }


    if(guestId==null && appSession==null && appEvents==null && appErrors==null){
        guestId= uuidv4();
    }



    connection.execute(
        `SELECT * FROM trackpulse_db.user INNER JOIN trackpulse_db.appconfig ON user.email = appconfig.userEmail AND appconfig.AppId = ? AND user.email=?`,
        [appId, email],
        function (err, results, fields) {
            console.log((err?.errno ?? "") + " " + (err?.sqlMessage ?? ""));
            console.log(results); // results contains rows returned by server
            console.log(fields); // fields contains extra meta data about results, if available

            if (results != null && results.length > 0) {
                //definately one result will come
                let userData = results[0];
                if (new Date() <= new Date(userData.Expiry)) {

                    if(userData.quota<=0){
                        let planType = userData.plan;
                        let choosenPlan = plan[planType];
                        let session_quota = choosenPlan["sessions_perday"];
                        let quotaWasAdded = new Date(userData.quotaAddedAt);
                        quotaWasAdded.setHours(0, 0, 0, 0);
                        let cur_date = new Date();
                        cur_date.setHours(0, 0, 0, 0);
                        /**
                         * 1. update the quota if quota is <=0 
                         */
                        if (quotaWasAdded < cur_date) {
                            //means quota was added before not today 
                            setQuota(connection, appId, email, session_quota);
                        }


                    }

                    if (userData.quota > 0) {
                        //1. register the event and update the quota 
                        /**
                         * 1. check the payload which is having event related thing or not we will store the data on same day tuple
                         * 2. insert only the first apprelated details,date,appid,userEmail
                         * 3. after that check the if appsession coming add the appsession in the same day
                         * 4. or appevents or apperrors append in the same day with appId and userId
                         */

                        recordEvent(res, connection,guestId,email, appId,userData.quota,{
                            "country": country,
                            "device": device,
                            "isReturning": isReturning,
                            "ip": useripAddress
                          }, appSession, appEvents, appErrors
                        );




                    } else {
                        return res.json(new ApiResponse(404, "App's event listening quota reach to end.", ""));
                    }




                } else {

                    return res.json(new ApiResponse(404, "user's plan has been expired, purchase plan or switch to free plan", ""));

                }


            } else {
                return res.json(new ApiResponse(404, "user or app is not registered", ""));
            }



        }
    );



















});

function recordEvent(res, connection,guestId,userEmail, appId,currentQuota,appVisitordetail, appSession, appEvents, appErrors) {

    let currentDate = new Date();
    // Get the components of the date
    let year = currentDate.getFullYear();
    let month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // Month is zero-based
    let day = currentDate.getDate().toString().padStart(2, '0');

    if (appSession == null && appEvents == null && appErrors == null) {
        connection.execute(
            "INSERT INTO event(userEmail, AppId, date,guestId,appVisitordetail) VALUES (?,?,?,?,?);",
            [userEmail, appId, new Date().toISOString().slice(0, 19).replace('T', ' '),guestId,appVisitordetail],
            function (err, results, fields) {
                if (results != null) {
                    //--
                    /***
                     * since a session created for a visitor with given guestId, so will dedcut one from quota
                     */
                    //--
                    updateQuota(connection,appId,userEmail,currentQuota); //updating quota 
                    return res.json(new ApiResponse(200, `visitor record created`,{
                        "guestId":guestId
                    }));
                }
                console.log((err?.errno ?? "") + " " + (err?.sqlMessage ?? ""));
                console.log(results); // results contains rows returned by server
                console.log(fields); // fields contains extra meta data about results, if available

            }
        );

    } else if (appSession != null && Object.keys(appSession).length>0) {
    
       if(Object.keys(appSession).length>1){
         return res.json(new ApiResponse(401, `Please send only single page session`));
       }
      

        connection.execute(
            `SELECT * FROM event WHERE Date(date) = ? && guestId=?;`,
            [`${year}-${month}-${day}`,guestId],
            async function (err, results, fields) {
                if (results.length>0) {
                    let prevdata = results[0];
                    let prevAppSession = prevdata.appSession;
                    if (prevAppSession == null) {
                        //let store the session which is coming from the client
                        storeSession(res,guestId,appSession,connection,userEmail,appId,`${year}-${month}-${day}`);
                    } else {
                        prevAppSession=JSON.parse(prevAppSession);
                        if(Object.keys(appSession)[0] in prevAppSession){
                             //1. case may be already containing page just merge it here
                            //means if page already exist there just updating the response out there
                           prevAppSession[Object.keys(appSession)[0]] = prevAppSession[Object.keys(appSession)[0]].concat(appSession[Object.keys(appSession)[0]]);
                           //update the session 
                           storeSession(res,guestId,prevAppSession,connection,userEmail,appId,`${year}-${month}-${day}`);

                        }else{

                             //2. page may donot exist append the page with session  but other pages exist
                             prevAppSession[Object.keys(appSession)[0]]=appSession[Object.keys(appSession)[0]];
                           
                             storeSession(res,guestId,prevAppSession,connection,userEmail,appId,`${year}-${month}-${day}`);


                        }

                       
                       





                    }
                }else{
                    return res.json(new ApiResponse(401, `visitor record is not created`)); 
                }



            }
        );




    }else if(appEvents!=null && Object.keys(appEvents).length>0){

        
       if(Object.keys(appEvents).length>1){
        return res.json(new ApiResponse(401, `Please send only single page appevents`));
      }

       connection.execute(
           `SELECT * FROM event WHERE Date(date) = ? && guestId=?;`,
           [`${year}-${month}-${day}`,guestId],
           async function (err, results, fields) {
               if (results.length>0) {
                   let prevdata = results[0];
                   let prevAppEvents = prevdata.appEvents;
                   if (prevAppEvents == null) {
                       //let store the appevents which is coming from the client
                       /**
                        *  "appEvents":{
                                "/thankyou":{
                                    "clicks":{
                                        "image":2,
                                        "btn":2
                                    },
                                    "scroll":["up","down","up"]
                                }
                                
                            }
                        */

                            //  storeSession(res,appSession,connection,userEmail,appId,`${year}-${month}-${day}`);

                            let currentEvents=appEvents[Object.keys(appEvents)[0]];

                            if( "scroll" in currentEvents  ||  "clicks" in currentEvents){

                                
                               storeEvents(res,guestId,appEvents,connection,userEmail,appId,`${year}-${month}-${day}`);
                   

                            }else{

                                return res.json(new ApiResponse(401, `no scroll or click event is there.`)); 
                                
                            }
                        
   
                   } else {
                      //update the appevent if exist in that page
                      //merge with another appevent

                       prevAppEvents=JSON.parse(prevAppEvents);
                       if(Object.keys(appEvents)[0] in prevAppEvents){

                         //if the page object already exist now check that the click and scroll exist or not 
                         /**
                          * "clicks":["a","b"],
                            "scroll":["up","down"]
                          */
                            let previousEvents=prevAppEvents[Object.keys(appEvents)[0]];
                            let currentEvents=appEvents[Object.keys(appEvents)[0]];
                            

                            if("clicks" in currentEvents &&  "clicks" in previousEvents){
                                //click is already there in prev appevent, append the click data if there 
                              
                                let previousClickEvents=previousEvents["clicks"];
                                let currentClickEvents=currentEvents["clicks"];
                                let combinedClickEvents = previousClickEvents.concat(currentClickEvents);
                                //now store the combinedclick event
                                previousEvents["clicks"]=combinedClickEvents;
                              
                            }else{
                                previousEvents["clicks"]=[];
                                //this is to handle the if  clicks is not there
                            }

                            if( "scroll" in currentEvents &&   "scroll" in previousEvents){
                              
                                
                                let previousScrollEvents=previousEvents["scroll"];
                                let currentScrollEvents=currentEvents["scroll"];
                                let combinedScrollEvents = previousScrollEvents.concat(currentScrollEvents);
                                //now store the combinedclick event
                                previousEvents["scroll"]=combinedScrollEvents;
                              
                            }else{
                                //this is to handle the if  scroll is not there
                                previousEvents["scroll"]=[];
                            }
                              
                             // now store the data 
                              //storing prevappevents as it have the appended data 
                              storeEvents(res,guestId,prevAppEvents,connection,userEmail,appId,`${year}-${month}-${day}`);
                



                      

                        }else{
                               
                                let currentEvents=appEvents[Object.keys(appEvents)[0]];

                                if( "scroll" in currentEvents  ||  "clicks" in currentEvents){

                                 //2. page may donot exist append the page with session  but other pages exist


                                   //store the current event now

                                 storeEvents(res,guestId,{...prevAppEvents,...appEvents},connection,userEmail,appId,`${year}-${month}-${day}`);
                                  
                             
                                 
                                }else{

                                    return res.json(new ApiResponse(401, `no scroll or click event is there.`)); 
                                    
                                }
                            

                    

                            


                        }






              

                      
                      





                   }
               }else{
                   return res.json(new ApiResponse(401, `visitor record is not created`)); 
               }



           }
       );






    }else if(appErrors!=null &&  Object.keys(appErrors).length>0){
        if(Object.keys(appErrors).length>1){
            return res.json(new ApiResponse(401, `Please send only single error at a time once`));

        }

        connection.execute(
            `SELECT * FROM event WHERE Date(date) = ? && guestId=?;`,
            [`${year}-${month}-${day}`,guestId],
            async function (err, results, fields) {
               
                if (results.length>0) {
                    let prevdata = results[0];
                    let prevAppErrors= prevdata.appErrors;
                       //previous apperror does not exist then add directly
                    //previous apperror exist on that page then append
                    //only two cases here


                    if(prevAppErrors==null){
                        //case 1. does not exist from earlier
                        storeError(res,guestId,appErrors,connection,userEmail,appId,`${year}-${month}-${day}`);

                    }else{
                        prevAppErrors=JSON.parse(prevAppErrors);

                        if(Object.keys(appErrors)[0] in prevAppErrors){
                            
                            
                            let errorForPage=prevAppErrors[Object.keys(appErrors)[0]];
                            let newError=appErrors[Object.keys(appErrors)[0]];
                            prevAppErrors[Object.keys(appErrors)[0]]=`${errorForPage} ,\n${newError}`;
                            console.log("app errors");
                            console.log(prevAppErrors);
                           
                            storeError(res,guestId,prevAppErrors,connection,userEmail,appId,`${year}-${month}-${day}`);


                        }else{

                            storeError(res,guestId,{...prevAppErrors, ...appErrors},connection,userEmail,appId,`${year}-${month}-${day}`);
                        
                        }
                          
                    }
                }else{
                    //this is for if user have put the browser sleep mode and using another day means date has been changed so in that condition user have to restart web app to establish connection
                    return res.json(new ApiResponse(401, `Please restart website.`));

                }
            
            
            
            
            
            
            
            
            });


        

       
       
        
    

        
    }





}




    
    



function setQuota(connection,appId,userEmail,quota){
     connection.execute(
        `UPDATE appconfig SET quota =?, quotaAddedAt=?  WHERE userEmail=? && AppId=?`,
        [quota, new Date().toISOString().slice(0, 19).replace('T', ' '),userEmail,appId],
        async function (err, results, fields) {
            console.log(err);
            console.log(results);
            console.log(fields);   
        }
    );



}

function updateQuota(connection,appId,userEmail,currentQuota){
     let remQuota= currentQuota-1;
     if(remQuota<0){
        remQuota=0;
     }

     connection.execute(
        `UPDATE appconfig SET quota =? WHERE userEmail=? && AppId=?`,
        [remQuota,userEmail,appId],
        async function (err, results, fields) {
            console.log(err);
            console.log(results);
            console.log(fields);   
        }
    );



}

function storeError(res,guestId,appError,connection,userEmail,appId,recordDateString){
    connection.execute(
        `UPDATE event SET appErrors =? WHERE DATE(date)=? && userEmail=? && AppId=? && guestId=?`,
        [appError,recordDateString,userEmail,appId,guestId],
        async function (err, results, fields) {
            console.log(err);
            console.log(results);
            console.log(fields);

        console.log(err);

        if(results!=null){
          
         return res.json(new ApiResponse(200, `error has been listened`));
        }else{
            return res.json(new ApiResponse(401, `Something went wrong`));

        }
        


           
        }
    );
   

}



function storeSession(res,guestId,appSession,connection,userEmail,appId,recordDateString){
    connection.execute(
        `UPDATE event SET appSession =? WHERE DATE(date)=? && userEmail=? && AppId=? && guestId=?`,
        [appSession,recordDateString,userEmail,appId,guestId],
        async function (err, results, fields) {
            console.log(err);
            console.log(results);
            console.log(fields);

        if(results!=null){
          
         return res.json(new ApiResponse(200, `Session has been listened`));
        }else{
            return res.json(new ApiResponse(401, `Something went wrong`));

        }
        


           
        }
    );
   

}


function storeEvents(res,guestId,appEvents,connection,userEmail,appId,recordDateString){
    connection.execute(
        `UPDATE event SET appEvents =? WHERE DATE(date)=? && userEmail=? && AppId=? && guestId=?`,
        [appEvents,recordDateString,userEmail,appId,guestId],
        async function (err, results, fields) {
            console.log(err);
            console.log(results);
            console.log(fields);

        if(results!=null){
          
         return res.json(new ApiResponse(200, `Event has been listened`));
        }else{
            return res.json(new ApiResponse(401, `Something went wrong`));

        }
        


           
        }
    );
   

}

module.exports = router;
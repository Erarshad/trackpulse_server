const plan={
    "1":{
        "type":"free",
        "price":0,
        "sessions_perday":200,
        "apps_limit":3,
        "validity_in_month":0
        //15 days free
    },
    "2":{
        "type":"paid",
        "price":300,
        "sessions_perday":200,
        "apps_limit":3,
        "validity_in_month":1
    },
    "3":{
        "type":"paid",
        "price":500,
        "sessions_perday":200,
        "apps_limit":5,
        "validity_in_month":1
    },
    "4":{
        "type":"paid",
        "price":700,
        "sessions_perday":300,
        "apps_limit":5,
        "validity_in_month":1
    },
};

module.exports={
    plan
}

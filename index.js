'use strict';

const express = require("express");
const app = express();
const axios = require("axios");
const redis = require("redis");
const AWS = require("aws-sdk");

AWS.config.update({region: "ap-south-1"});
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

const acceptRide = async(req) => {
    //TODO: change the approprite flag in the dynamodb table corresponding to the cab-id
}

const getCabStatus = async(req) => {
    //TODO: Get Current GPS location of the Cab which is already enroute
}

const getAvailableCabs = async(latitudeA, longitudeA, city) => {
    //set limit to cabs vicinity. Cabs beyond this many miles shouldn't show up as available
    let withinMiles = 5;

    //these two are arbitrary variables which signifies a x miles radius from variable withinMiles
    //they can be calculated, but hard-coded here for simplicity
    let latx = 0.123, longx = 0.123;

    let table = "Cabs";

    //dynamodb query which finds all records(cabs) within 5 mile radius
    let params = {
        TableName: table,
        KeyConditionExpression: 'latitude BETWEEN :latitudeA AND :latx AND longitude BETWEEN :longitudeA AND :longx AND city = :city',
        ExpressionAttributeValues: {
            ':latitudeA': {N: latitudeA},
            ':latx': {N: latx},
            ':longitudeA': {N: longitudeA},
            ':longx': {N: longx},
            ':city': {S: city}
        }
    }

    return new Promise((resolve, reject) => {
        ddb.query(params, function(err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};

const calculatePhysicalDistance = async(latitudeA, longitudeA, cabLatitude, cabLongitude) => {
    //TODO: calculate physical miles distance between point A and cab using Google Maps SDK
};

const getCurrentDemand = async(latitude, longitude) => {
    //TODO: get current percentage demand from database
    //hardcoded for simplicity and time-constraints
    return 34;
};

const getActiveRiders = async(latitude, longitude) => {
    //TODO: get active riders in the area from database
    //hardcoded for simplicity and time-constraints
    return 13;
};

const getCabPrice = async(cab, latitudeA, longitudeA) => {
    //demand percentage which is maintained and extracted from database
    let demand = await getCurrentDemand(latitudeA, longitudeA);

    //fetch active riders in the area from the database
    let activeRiders = await getActiveRiders(latitudeA, longitudeA);

    let baseprice = 5;

    //calculate price based on demand and active-riders in the area
    //some formula which gives more price when demand is high and active riders are less, and vice versa
    let price = baseprice + (demand*0.3)/activeRiders;
    return price;
};

const getBestOptions = async(availableCabs, latitudeA, longitudeA) => {
    
    //add a distance attribute to each shortlisted cabs so that they can be sorted based on distance
    //The function calculatePhysicalDistance() will use Google Maps SDK to do this
    for(let i = 0 ; i < availableCabs.length ; i++) {
        availableCabs[i].distanceFromA = await calculatePhysicalDistance(latitudeA, longitudeA, availableCabs[i].latitude, availableCabs[i].longitude);
    }

    //sort the array based on distance
    availableCabs.sort((a,b) => {
        return a.distanceFromA < b.distanceFromA ? 1:-1
    });

    //since array is sorted, when iterating the array, nearest cab will occur first
    //so we can return the cab object if it qualifies additional parameters like ratings etc., 
    //and if not, we can move on to check the next-nearest cab
    //For demonstration purpose, I have selected ratings threshold
    //So if the ratings is less than 2, then you can't assign the cab to user

    let defaultReturn = {};
    for(let i=0 ; i<availableCabs.length ; i++) {
        if(availableCabs[i].ratings > 2) {
            //suitalbe cab found
            //before returning the object, also calculate the price
            let price = await getCabPrice(availableCabs[i], latitudeA, longitudeA);
            cab.price = price;
            //return the cab object right away
            return cab;
        }
    }
    //empty object return which means no cabs qualified
    return defaultReturn;

    //additional logic like sending suitable cab for each car-type can be incorporated by
    //splitting original array into separate arrays for each car-type, but I am not including 
    //it right now because of time-constraints, but it can easily be achieved by array operations
};

const requestCab = async(userId, city, latitudeA, longitudeA) => {
    //get all available cabs in the area of point A
    let availableCabs = await getAvailableCabs(latitudeA, longitudeA, city);

    //get the best/nearest cab options from all available cabs in the area
    let cabOptions = await getBestOptions(availableCabs, latitudeA, longitudeA);  
    return cabOptions;
};

//this endpoint will be hit when user requests a cab
app.post('/cabs/request', async(req, res) => {

    //deconstruct parameters
    let { userID, city, latitudeA, latitudeB, longitudeA, longitudeB } = req.body;

    //outsource business logic to dedicated function instead of handling it in route function
    let cab = await requestCab(userId, city, latitudeA, longitudeA);
    
    //if no cab was found, send appropriate message
    if(Object.keys(cab).length === 0) {
        let msg = 'Sorry, No Cabs are available in your area currently. Please try again in sometime...';
        return res.status(404).json({msg: msg});
    }

    res.json(cab);
});

//this endpoint will hit when user accepts a ride request. 
app.post('/cabs/accept', async(req, res) => {
    let {userID, cabID}
    let respAcknowledgment = await acceptRide(req);
    res.json(respAcknowledgment);
});

//this endpoint will be hit when user application is trying to track its alloted cabs GPS
app.post('/cabs/status', async(req, res) => {
 
    //this function will get cab's current gps from the Dynamodb table
    let status = await getCabStatus(req);
    res.json(status);
});

app.listen(8080, () => console.log(`Started server at http://localhost:8080!`));

/*this is a standalone nodejs app, but when deploying, it will be converted to Node Clusters,
where the cluster listener will be reverse-proxied via the Load Balancer*/
import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import regeneratorRuntime from "regenerator-runtime";
import Config from './config.json'; 
import Web3 from 'web3'; 
import express from 'express'; 
let config = Config['localhost']; 
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws'))); 
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let BigNumber = require('bignumber.js');

let oracles = [];

let STATUS_CODES = [{
    "label": "STATUS_CODE_UNKNOWN",
    "code": 0
}, {
    "label": "STATUS_CODE_ON_TIME",
    "code": 10
}, {
    "label": "STATUS_CODE_LATE_AIRLINE",
    "code": 20
}, {
    "label": "STATUS_CODE_LATE_WEATHER",
    "code": 30
}, {
    "label": "STATUS_CODE_LATE_TECHNICAL",
    "code": 40
}, {
    "label": "STATUS_CODE_LATE_OTHER",
    "code": 50
}];


async function registerOracles() {
    const fee = await flightSuretyApp.methods.REGISTRATION_FEE().call();
    const accounts = await web3.eth.getAccounts();
    for(let index = 11; index < 41; index++) {
        await flightSuretyApp.methods.registerOracle().send({
            "from": accounts[index],
            "value": fee,
            "gas": 3000000
        });
        const result = await flightSuretyApp.methods.getMyIndexes().call({from: accounts[index]});
        oracles.push({
            address: accounts[index],
            indexes: result
        });
        console.log(`Oracle ${accounts[index]} registered: ${result}`);
    }
    
}

registerOracles();

flightSuretyApp.events.OracleRequest({ 
    fromBlock: "latest" }, async function (error, event) { 
        if (error) { 
            console.log(error); 
        } 

    let airline = event.returnValues.airline; 
    let flight = event.returnValues.flight;
    let timestamp = new BigNumber(event.returnValues.timestamp);
    let found = false;

    let selectedCode = STATUS_CODES[1];
    console.log(`Flight scheduled to: ${new Date(timestamp.toNumber())}`);
    if (new Date(timestamp.toNumber()) < Date.now()) {
        selectedCode = STATUS_CODES[2];
    }
    oracles.forEach((oracle) => {
       if (found) {
            return false;
        }
        for(let idx = 0; idx < 3; idx += 1) {
            flightSuretyApp.methods.submitOracleResponse(
                oracle.indexes[idx], airline, flight, timestamp.toNumber(), selectedCode.code
            ).send({
                from: oracle.address,
                gas: 4000000
            }).then(result => {
                found = true;
                console.log(`Oracle: ${oracle.indexes[idx]} responded from flight ${flight} with status ${selectedCode.code} - ${selectedCode.label}`);
            }).catch(err => {
                console.log(err.message);
            });
        }
    });
});

const app = express(); app.get('/api', (req, res) => { res.send({ message: 'An API for use with your Dapp!' }); });

export default app;
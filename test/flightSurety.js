var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/
    it(`Has correct initial isOperational() value`, async function () {

        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, true, "Incorrect operating status value");

    });

    it(`Can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

        // Ensure that access is denied for non-Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false, {from: config.testAddresses[2]});
        } catch (error) {
            accessDenied = true;
        }
        assert.equal(accessDenied, true, "Access does not apper to be restricted to Contract Owner");

    });

    it(`Can allow access to setOperatingStatus() for Contract Owner account`, async function () {

        // Ensure that access is allowed for Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false);
        } catch (error) {
            accessDenied = true;
        }
        assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

    });

    it(`Can block access to functions using requireIsOperational when operating status is false`, async function () {

        let reverted = false;
        try {
            await config.flightSuretyApp.registerAirline(0x0000);
        } catch (error) {
            reverted = true;
        }
        assert.equal(reverted, true, "Access not blocked for requireIsOperational");
        await config.flightSuretyData.setOperatingStatus(true);

    });

    it('Cannot register an Airline using registerAirline() if it is not funded', async () => {
        const newAirline = accounts[2];

        try {
            await config.flightSuretyApp.registerAirline(newAirline, 'American', {from: config.firstAirline});
        } catch (error) {
        }
        const result = await config.flightSuretyData.isAirline(newAirline);
        assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
    });

    it('Only existing airline may register a new airline until there are 4 registered airlines', async () => {
        const newAirline = accounts[2];
        const fundingAmount = config.weiMultiple * 10;

        try {
            await config.flightSuretyApp.registerAirline(newAirline, 'American', {from: config.firstAirline});
        } catch (error) {
        }

        let result = await config.flightSuretyData.isAirlineRegistered(newAirline);
        assert.equal(result, false, "Airline was registered but it should not.");

        await config.flightSuretyApp.fundAirlineInsurance({from: config.firstAirline, value: fundingAmount});

        try {
            await config.flightSuretyApp.registerAirline(newAirline, 'American', {from: config.firstAirline});
        } catch (error) {
            console.log(error);
        }
        result = await config.flightSuretyData.isAirlineRegistered(newAirline);
        assert.equal(result, true, "Airline was not registered but it should.");

    });

    it('Registration of greater than 4 airlines requires multi-party consensus of 50% of registered airlines', async () => {
        const airline3 = accounts[3];
        const airline4 = accounts[4];
        const airline5 = accounts[5];
        const airline6 = accounts[6];

        const fundingAmount = config.weiMultiple * 10;

        await config.flightSuretyApp.registerAirline(airline3, 'Airline3', {from: config.firstAirline});
        let result = await config.flightSuretyData.isAirlineRegistered(airline3);
        assert(result, true, 'Airline not registered');

        await config.flightSuretyApp.registerAirline(airline4, 'Airline4', {from: config.firstAirline});
        result = await config.flightSuretyData.isAirlineRegistered(airline4);
        assert(result, true, 'Airline not registered');

        //requires consensus
        await config.flightSuretyApp.registerAirline(airline5, 'Airline5', {from: config.firstAirline});
        result = await config.flightSuretyData.isAirlineRegistered(airline5);
        assert(result, true, 'Airline not registered');

        // let's fund the other airlines so we can register airline 4 which is the sixth airline
        await config.flightSuretyApp.fundAirlineInsurance({from: airline3, value: fundingAmount});
        await config.flightSuretyApp.fundAirlineInsurance({from: airline4, value: fundingAmount});
        await config.flightSuretyApp.fundAirlineInsurance({from: airline5, value: fundingAmount});

        await config.flightSuretyApp.registerAirline(airline6, 'Airline6', {from: airline3});
        await config.flightSuretyApp.registerAirline(airline6, 'Airline6', {from: airline4});

        result = await config.flightSuretyApp.isAirlineRegistered(airline6);

        assert.equal(result, true, 'Airline not registered');
    });

    it('Cannot vote twice for the same airline', async () => {
        const newAirline = accounts[7];
        try {
            await config.flightSuretyApp.registerAirline(newAirline, 'Airline7', {from: config.firstAirline});
            await config.flightSuretyApp.registerAirline(newAirline, 'Airline7', {from: config.firstAirline});
        } catch (error) {
        }
        let result = await config.flightSuretyApp.isAirlineRegistered(newAirline);
        assert.equal(result, false, "Airline was registered but it should not have.");
    });

    it('Register 2 flights', async () => {
       await config.flightSuretyApp.registerFlight('Test Flight #1', new Date().getTime(), {from: config.firstAirline});
       await config.flightSuretyApp.registerFlight('Test Flight #2', new Date().getTime(), {from: config.firstAirline});
    });

    it('Add a passenger to one of the flights added above', async () => {
        let flights = await config.flightSuretyApp.getCurrentFlights();
        //when registering a passenger, they get 5 ether balance for insurance (use test address for passenger id)
        await config.flightSuretyApp.registerPassenger(config.testAddresses[2], flights[0]);
        //this is what we test for
        result = await config.flightSuretyApp.getPassengerStatus(config.testAddresses[2]);
        assert.equal(result, true, 'passenger should be added');
     });

    it('Passenger can buy flight insurance', async () => {
        const fundingAmount = config.weiMultiple * 1;
        let flights = await config.flightSuretyApp.getCurrentFlights();
        await config.flightSuretyApp.buyFlightInsurance(config.testAddresses[2], flights[0], {value : fundingAmount });
        //does passenger have insurance for this flight?
        result = await config.flightSuretyApp.passengerHasInsurance(config.testAddresses[2], flights[0]);
        assert.equal(result, true, 'Not able to buy flight insurance');
    });

    //make the flight late and pay insurance to customer
    it('Make flight late and then it should pay insurance to customer', async () => {
        let flights = await config.flightSuretyApp.getCurrentFlights();
        let STATUS_CODE_LATE_AIRLINE = 20;
        //process a late flight for this particular flight
        //status code of 20 indicates late flight
        await config.flightSuretyApp.processFlightStatus(flights[0], STATUS_CODE_LATE_AIRLINE);
        //this is what we test for
        result = await config.flightSuretyApp.passengerWasPaidInsurance(config.testAddresses[2]);
        assert.equal(result, true, 'passenger was not paid insurance');
     });

    it('Airline can be registered, but does not participate in contract until it submits funding of 10 ether (make sure it is not 10 wei)', async () => {

        // ARRANGE
        const fundingAmt1 = config.weiMultiple * 14;
        // ACT
        try {
            await config.flightSuretyApp.fundAirlineInsurance({from: config.firstAirline, value: fundingAmt1});
        } catch (e) {
        }
        let result = await config.flightSuretyData.isAirlineFunded.call(config.firstAirline);
        // ASSERT
        assert.equal(result, true, "Airline is funded if minimum funding requirements are met");
      });



});

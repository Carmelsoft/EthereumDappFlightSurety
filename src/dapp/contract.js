import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network) {
        this.config = Config[network];
        this.owner = null;
        this.airlines = [];
        this.flights = [];
        this.passengers = [];
        this.gasLimit = 2000000;
    }

    async initWeb3 (logCallback) {
        if (window.ethereum) {
            this.web3 = new Web3(window.ethereum);
            try {
                // Request account access
                await window.ethereum.enable();
            } catch (error) {
                // User denied account access...
                console.error("User denied account access")
            }
        }
        // Legacy dapp browsers...
        else if (window.web3) {
            this.web3 = new Web3(window.web3.currentProvider);
        }
        // If no injected web3 instance is detected, fall back to Ganache
        else {
            this.web3 = new Web3(new Web3.providers.WebsocketProvider('http://localhost:7545'));
        }

        const accounts = await this.web3.eth.getAccounts();
        this.account = accounts[0];

        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, this.config.appAddress, this.config.dataAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, this.config.dataAddress);
        this.flightSuretyApp.events.allEvents({fromBlock: 'latest', toBlock: 'latest'}, logCallback);
        this.flightSuretyData.events.allEvents({fromBlock: 'latest', toBlock: 'latest'}, logCallback);
        
    }

    isOperational(callback) {
        let self = this;
        self.flightSuretyApp.methods
             .isOperational()
             .call({ from: self.owner}, callback);
     }
 
     fetchFlightStatus(flight, callback) {
         let self = this;
         let payload = {
             airline: self.airlines[0],
             flight: flight,
             timestamp: Math.floor(Date.now() / 1000)
         } 
        }

    async registerFlight( flightName, flightDateTime) {
        await this.flightSuretyApp.methods.registerFlight(flightName, flightDateTime).send({from: this.account, gas: this.gasLimit});
    }

    async registerAirline(_address) {
        let self = this;
        try {
           await self.flightSuretyApp.methods.registerAirline(_address).send({from: self.account, gas: self.gasLimit});
        } catch (error) {
            console.log(JSON.stringify(error));
        }
    }

    async getCurrentFlights() {
        return await this.flightSuretyApp.methods.getCurrentFlights().call();
    }

    async getFlightInformation(key) {
        return await this.flightSuretyApp.methods.getFlightInformation(key).call();
    }

    async fundAirline() {
        await this.flightSuretyApp.methods.fundAirline().send({from: this.account, value: 10000000000000000000});
    }

    async setOperationalStatus(enabled) {
        await this.flightSuretyData.methods.setOperatingStatus(enabled).send({from: this.account});
    }

    async authorizeContract(contractAddress) {
        await this.flightSuretyData.methods.authorizeCaller(contractAddress).send({from: this.account});
    }

    async isOperational() {
        return await this.flightSuretyApp.methods.isOperational().call();
    }

    async getNumberOfRegisteredAirlines() {
        return await this.flightSuretyApp.methods.getNumberOfRegisteredAirlines().call();
    }

    async getNumberOfFundedAirlines() {
        return await this.flightSuretyApp.methods.getNumberOfFundedAirlines().call();
    }

    async getContractBalance() {
        const contractBalance =  await this.flightSuretyApp.methods.getContractBalance().call();
        return `${this.web3.utils.fromWei(contractBalance, 'finney')} finney`;
    }

    async getInsuranceBalance() {
        const insuranceBalance =  await this.flightSuretyApp.methods.getInsuranceBalance().call();
        return `${this.web3.utils.fromWei(insuranceBalance, 'finney')} finney`;
    }

    async purchaseInsurance(flightKey) {
        await this.flightSuretyApp.methods.purchaseInsurance(flightKey).send({from: this.account, value: 1000000000000000000});
    }

    async payoutFunds() {
        await this.flightSuretyApp.methods.payoutFunds().send({from: this.account});
    }

    async getFlightStatus(flightKey) {
        await this.flightSuretyApp.methods.getFlightStatus(flightKey).send({from: this.account})
    }

}
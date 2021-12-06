# FlightSurety

FlightSurety is a sample blockchain application that allows airlines to fund flight cancellation insurance and also allows passengers to retrieve those funds if a flight is indeed late.  Below are more details:

## Tool Versions
Node: 14.17.4
Solidity: 0.4.24
Truffle: v5.4.23
Web3.js: 1.5.3 

## 1. Install
This repository contains Smart Contract code in Solidity (using Truffle), tests (also using Truffle), dApp scaffolding (using HTML, CSS and JS) and server app scaffolding.

To install, download or clone the repo, then:

```shell script
npm install
truffle compile
```

## 2. Develop Client
```shell script
truffle test ./test/flightSurety.js
truffle test ./test/oracles.js
```

To use the dapp:
```shell script
truffle migrate
npm run dapp
```

To view dapp:
```shell script
http://localhost:8000
```

## 3. Develop Server
```shell script
npm run server
```

## 6. Smart Contract Functionality
This FlightSurety smart contract performs the following tasks:

1. Add airlines 
2. Add flights
3. Add passengers
4. Airlines must contribute to the insurance pool
5. Passengers pay for insurance and receive 1.5 x if flight is late
6. After first 4 airlines are added, additional airlines must be voted upon by the first 4


pragma solidity >=0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;          // Blocks all state changes throughout the contract if false
    mapping(address => bool) private authorizedCallers;

    //airline struct with name, whether they funded, the amt of fundes, # of votes received if registered after previous 4
    struct Airline {
        bool isRegistered;
        string airlineName;
        bool isFunded;
        uint256 funds;
        uint256 numberOfVotesReceived;
        mapping (address => bool) otherAirlineVotes; 
    }

    uint256 private numberOfAirlinesRegistered = 0;
    uint256 private numberOfAirlinesFunded = 0;

    // flight struct
    struct Flight {
        address airline;
        string flightName;
        uint256 flightDateTime;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address[] insuredPassengers;
    }

    // string mapping to flight
    mapping(bytes32 => Flight) private flights;
    bytes32[] private currentFlights;
    mapping(address => Airline) private airlines;

    // passenger with multiply flights
    struct Passenger {
        mapping(bytes32 => uint256) insuranceAmountForFlight;
        mapping(bytes32 => bool) passengerOnFlight;
        uint256 balance;
    }

    mapping(address => Passenger) passengers;

    // the contract holds balance of insurance
    uint256 private contractBalance = 0 ether;

    // so we don't go in the hole
    uint256 private insuranceBalance = 0 ether;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event AuthorizedContract(address _contractId);
    event OperationalStatusChanged(bool _state);

    constructor(address airline) public payable {
        contractOwner = msg.sender;
        contractBalance = contractBalance.add(msg.value);
        //register the initial airline (United)
        _registerAirline(airline, 'United', msg.sender, true, false);
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireIsCallerAuthorized() {
        require(authorizedCallers[msg.sender] || (msg.sender == contractOwner), "Caller is not authorised");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/
    function getContractOwner() 
    public 
    view 
    returns (address) {
        return contractOwner;
    }

    function isOperational() 
    public 
    view 
    returns(bool) {
        return operational;
    }

    function isFlightRegistered(bytes32 key) 
    external 
    view 
    returns(bool) {
        return flights[key].airline != address(0);
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus ( bool mode ) 
    external 
    requireContractOwner {
        operational = mode;
        emit OperationalStatusChanged(mode);
    } 

    function authorizeCaller(address contractAddress) 
    external 
    requireContractOwner {
        require(authorizedCallers[contractAddress] == false, "Address has already be registered");
        authorizedCallers[contractAddress] = true;
        emit AuthorizedContract(contractAddress);
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/
    function hasAirlineAlreadyVoted(address _address, address _registeredAirline) 
    external
    view 
    requireIsOperational 
    requireIsCallerAuthorized 
    returns(bool) {
        return airlines[_address].otherAirlineVotes[_registeredAirline];
    }

    function isAirline( address _address) 
    external 
    view 
    returns(bool) {
        return airlines[_address].isRegistered;
    }

    //public function
    function registerAirline(address _address, string _airlineName, address _registeredAirline, bool _isRegistered, bool _isFunded) 
    external 
    requireIsOperational 
    requireIsCallerAuthorized {
        _registerAirline(_address, _airlineName, _registeredAirline, _isRegistered, _isFunded);
    }

    //private function so can be called from constructor
    function _registerAirline(address _address, string _airlineName, address _registeredAirline, bool _isRegistered, bool _isFunded)  
    private {
        airlines[_address].otherAirlineVotes[_registeredAirline] = true;
        airlines[_address].airlineName = _airlineName;
        airlines[_address].isRegistered = _isRegistered;
        if(airlines[_address].isRegistered) {
            numberOfAirlinesRegistered = numberOfAirlinesRegistered.add(1);
        }
        airlines[_address].numberOfVotesReceived = airlines[_address].numberOfVotesReceived.add(1);
    }

    function isAirlineRegistered(address _airline) 
    public 
    view 
    requireIsOperational 
    returns (bool success) {
        return airlines[_airline].isRegistered;
    }

    function getNumberOfAirlinesRegistered() 
    external 
    view 
    requireIsOperational 
    returns(uint256 _count) {
        return numberOfAirlinesRegistered;
    }

    function getNumberOfAirlineVotes(address _address) 
    external 
    view 
    requireIsOperational 
    returns(uint256) {
        return airlines[_address].numberOfVotesReceived;
    }

    function getNumberOfAirlinesFunded() 
    external 
    view 
    requireIsOperational 
    returns(uint256 _count) {
        return numberOfAirlinesFunded;
    }

    function getInsuranceBalance() 
    external 
    view 
    requireIsOperational 
    returns(uint256) {
        return insuranceBalance;
    }

    function getContractBalance() 
    external 
    view 
    requireIsOperational 
    returns(uint256) {
        return contractBalance;
    }

    function registerFlight(bytes32 _key, address _airline, uint256 _flightDateTime, string _flightName, uint8 _statusCode) 
    external 
    requireIsOperational 
    requireIsCallerAuthorized {
        flights[_key].airline = _airline;
        flights[_key].flightDateTime = _flightDateTime;
        flights[_key].flightName = _flightName;
        flights[_key].statusCode = _statusCode;
        currentFlights.push(_key);
    }

    //register a passenger for a flight
    function registerPassenger(address _passengerAddress, bytes32 _flightKey) 
    external 
    requireIsOperational 
    requireIsCallerAuthorized {
        passengers[_passengerAddress].passengerOnFlight[_flightKey] = false;
        passengers[_passengerAddress].insuranceAmountForFlight[_flightKey] = 0;
        //set balance to 5 initial. A gift.
        passengers[_passengerAddress].balance = 5;
    }

    //the passenger starts out with 5 ether, so if the passenger is created, then the balance should be > 0
    function getPassengerStatus(address _passengerAddress) 
    external 
    requireIsOperational 
    requireIsCallerAuthorized
    returns(bool) {
        if (passengers[_passengerAddress].balance > 0)
        {
            return true;
        }
        return false;
    }

    //the passenger starts out with 5 ether, so if the passenger was paid insurance, then the total balance should equal 6.5 
    function passengerWasPaidInsurance(address _passengerAddress) 
    external 
    requireIsOperational 
    requireIsCallerAuthorized
    returns(bool) {
        if (passengers[_passengerAddress].balance > 5)
        {
            return true;
        }
        return false;
    }

    function getFlightData(bytes32 _key) 
    external 
    view 
    requireIsOperational 
    requireIsCallerAuthorized 
    returns(string memory flightName, uint256 flightDateTime, address airline, uint8 status) {
        require(flights[_key].airline != address(0));
        return (flights[_key].flightName, flights[_key].flightDateTime, flights[_key].airline, flights[_key].statusCode);
    }

    //get a list of all the current flights
    function getCurrentFlights() 
    external 
    view 
    requireIsOperational
    requireIsCallerAuthorized 
    returns (bytes32[] memory ) {
        return currentFlights;
    }

    function setFlightStatus(bytes32 _key, uint8 _status) 
    external 
    requireIsOperational 
    requireIsCallerAuthorized {
        require(_status != flights[_key].statusCode, "Status code already set");
        flights[_key].statusCode = _status;
    }

    function isAirlineFunded(address _airline) 
    public 
    view 
    requireIsOperational 
    returns (bool success) {
        return airlines[_airline].isFunded;
    }

    //fund the airline insurance
    function fundAirlineInsurance(address _airlineAddress, uint256 _fundAmt, uint256 _minFunding) 
    public 
    payable 
    requireIsOperational {
        airlines[_airlineAddress].funds = airlines[_airlineAddress].funds.add(_fundAmt);
        if(!airlines[_airlineAddress].isFunded && airlines[_airlineAddress].funds >= _minFunding) {
            airlines[_airlineAddress].isFunded = true;
            numberOfAirlinesFunded = numberOfAirlinesFunded.add(1);
        }
        contractBalance = contractBalance.add(_fundAmt);
    }

    //passenger buys flight insurance
    function buyFlightInsurance(address _passenger, uint256 _insuranceAmount, bytes32 _flightKey) 
    external 
    payable 
    requireIsOperational
     {
        require(!passengers[_passenger].passengerOnFlight[_flightKey], "Passenger already insured");
        passengers[_passenger].passengerOnFlight[_flightKey] = true;
        flights[_flightKey].insuredPassengers.push(_passenger);
        passengers[_passenger].insuranceAmountForFlight[_flightKey] = _insuranceAmount.div(2) + _insuranceAmount;
        insuranceBalance = insuranceBalance.add(passengers[_passenger].insuranceAmountForFlight[_flightKey]);
        contractBalance = contractBalance.sub(_insuranceAmount.div(2));
    }

    //does the passenger have insurance
    function passengerHasInsurance(address _passenger, bytes32 _flightKey) 
    external 
    view 
    requireIsOperational
    returns(bool) {
        return (passengers[_passenger].passengerOnFlight[_flightKey]);
    }

    function processPayment(uint256 value) external payable requireIsOperational requireIsCallerAuthorized {
        contractBalance = contractBalance.add(value);
    }

    function() external payable {
        contractBalance = contractBalance.add(msg.value);
    }

    function processFlightStatus(bytes32 _flightKey, bool _wasLateAirline)
    external 
    requireIsOperational 
    requireIsCallerAuthorized {
        uint256 passenger;
        uint256 payableAmount;
        //if airline was late, then pay insurance to all passengers on the flight
        if(_wasLateAirline) {
            for(passenger = 0; passenger < flights[_flightKey].insuredPassengers.length; passenger++) {

                if(passengers[flights[_flightKey].insuredPassengers[passenger]].passengerOnFlight[_flightKey]) {
                    payableAmount = 
                        passengers[flights[_flightKey].insuredPassengers[passenger]].insuranceAmountForFlight[_flightKey];
                    passengers[flights[_flightKey].insuredPassengers[passenger]].insuranceAmountForFlight[_flightKey] = 0;
                    passengers[flights[_flightKey].insuredPassengers[passenger]].balance = 
                        passengers[flights[_flightKey].insuredPassengers[passenger]].balance.add(payableAmount);
                        
                    insuranceBalance = insuranceBalance.sub(payableAmount);

                }
            }
            flights[_flightKey].insuredPassengers.length = 0;
        } else {
            for(passenger = 0; passenger < flights[_flightKey].insuredPassengers.length; passenger++) {
                if(passengers[flights[_flightKey].insuredPassengers[passenger]].passengerOnFlight[_flightKey]) {
                    payableAmount = 
                        passengers[flights[_flightKey].insuredPassengers[passenger]].insuranceAmountForFlight[_flightKey];
                    passengers[flights[_flightKey].insuredPassengers[passenger]].insuranceAmountForFlight[_flightKey] = 0;

                    contractBalance = contractBalance.add(payableAmount);

                    insuranceBalance = insuranceBalance.sub(payableAmount);
                }
            }
            flights[_flightKey].insuredPassengers.length = 0;
        }
    }

    function payoutFunds(address _payee) 
    external 
    payable 
    requireIsOperational 
    requireIsCallerAuthorized {
        require(passengers[_payee].balance > 0, "Balance must be greater than 0.");
        uint256 balanceOwed = passengers[_payee].balance;
        passengers[_payee].balance = 0;
        _payee.transfer(balanceOwed);
    }
}


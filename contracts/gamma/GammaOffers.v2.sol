// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";

interface IGammaCardsContract {
  function hasCard(address user, uint8 cardNumber) external returns (bool has);
  function removeCardByOffer(address user, uint8 cardNumber) external;
  function restoreCardByOffer(address user, uint8 cardNumber) external;
  function exchangeCardsOffer(address from, uint8 cardNumberFrom, address to, uint8 cardNumberTo) external;
}

contract NofGammaOffersV2 is Ownable {
    using Counters for Counters.Counter;

    IGammaCardsContract public gammaCardsContract;
    mapping(address => bool) public owners;

    uint256 maxOffersAllowed = uint256(5000);
    uint256 maxOffersByUserAllowed = uint256(5);
    uint256 maxCardNumbersAllowed = uint256(120);

    mapping(address user => mapping(uint8 cardNumber => uint8[] wantedCardNumbers)) offersByUser;
    mapping(uint8 cardNumber => mapping(address user => uint8[])) offersByCardNumber;
    mapping(address => Counters.Counter) public offersByUserCounter;
    mapping(uint8 => Counters.Counter) public offersByCardNumberCounter;
    Counters.Counter private offersTotalCounter;

    event NewGammaCardsContract(address newGammaCardsContract);
    event NewOfferCreated (address user, uint8 cardNumber, uint8[] wantedCardNumbers);
    event OfferRemoved (address user, uint8 cardNumber);
    event NewOwnerAdded (address owner);
    event OwnerRemoved (address owner);

    constructor(address _cardsContract) {
        gammaCardsContract = IGammaCardsContract(_cardsContract);
        owners[msg.sender] = true;
    }

    modifier onlyCardsContract {
        require(msg.sender == address(gammaCardsContract), "Only gamma cards contract can call this function.");
        _;
    }

    modifier onlyOwners() {
        require(owners[msg.sender], "Only owners can call this function.");
        _;
    }

    function addOwner(address _newOwner) external onlyOwners {
        require(_newOwner != address(0), "Invalid address.");
        require(!owners[_newOwner], "Address is already an owner.");
        owners[_newOwner] = true;
        emit NewOwnerAdded (_newOwner);
    }

    function removeOwner(address _ownerToRemove) external onlyOwners {
        require(_ownerToRemove != address(0), "Invalid address.");
        require(_ownerToRemove != msg.sender, "You cannot remove yourself as an owner.");
        require(owners[_ownerToRemove], "Address is not an owner.");
        owners[_ownerToRemove] = false;
        emit OwnerRemoved (_ownerToRemove);
    }

    function setGammaCardsContract (address _gammaCardsContract) public onlyOwners {
        require(_gammaCardsContract != address(0), "Invalid address.");
        gammaCardsContract = IGammaCardsContract(_gammaCardsContract);
        emit NewGammaCardsContract(_gammaCardsContract);
    }


    function setMaxOffersAllowed(uint256 _maxOffersAllowed) external onlyOwners {
        maxOffersAllowed = _maxOffersAllowed;
    }

    function setMaxOffersByUserAllowed(uint256 _maxOffersByUserAllowed) external onlyOwners {
        maxOffersByUserAllowed = _maxOffersByUserAllowed;
    }

    function setMaxCardNumbersAllowed(uint256 _maxCardNumbersAllowed) external onlyOwners {
        maxCardNumbersAllowed = _maxCardNumbersAllowed;
    }

    function createOffer(uint8 cardNumber, uint8[] memory wantedCardNumbers) public {
        require(address(gammaCardsContract) != address(0), "GammaCardsContract not set."); 
        require(offersByUserCounter[msg.sender].current() < maxOffersByUserAllowed, "User has reached the maximum allowed offers.");
        require(offersTotalCounter.current() < maxOffersAllowed, "Total offers have reached the maximum allowed.");

        bool userHasCard = gammaCardsContract.hasCard(msg.sender, cardNumber);
        require(userHasCard, "You does not have that card.");

        for (uint8 i = 0; i < wantedCardNumbers.length; i++) {
            require(wantedCardNumbers[i] != cardNumber, "The cardNumber cannot be in wantedCardNumbers.");
        }

        offersByUser[msg.sender][cardNumber] = wantedCardNumbers;
        offersByCardNumber[cardNumber][msg.sender] = wantedCardNumbers;

        offersByUserCounter[msg.sender].increment();
        offersByCardNumberCounter[cardNumber].increment();
        offersTotalCounter.increment();

        console.log('offersByUserCounter',  offersByUserCounter[msg.sender].current());
        console.log('offersByCardNumberCounter',  offersByCardNumberCounter[cardNumber].current());
        console.log('offersTotalCounter',  offersTotalCounter.current());

        gammaCardsContract.removeCardByOffer(msg.sender, cardNumber);

        emit NewOfferCreated (msg.sender, cardNumber, wantedCardNumbers);
    }

    function getOffersByUserCounter(address user) external view returns (uint256) {
        require(user != address(0), "Invalid address.");
        return offersByUserCounter[user].current();
    }

    function getOffersByCardNumberCounter(uint8 cardNumber) external view returns (uint256) {
        return offersByCardNumberCounter[cardNumber].current();
    }

    function getOffersCounter() external view returns (uint256) {
        return offersTotalCounter.current();
    }
    
    function getOffersWantedCardNumbers(address user, uint8 cardNumber) public view returns (uint8[] memory) {
        require(user != address(0), "Invalid address.");
        return offersByUser[user][cardNumber];
    }

    function getOffersByUser(address user) external view         
        returns (uint8[] memory cardNumbers, uint8[][] memory wantedCardNumbers) {
        require(user != address(0), "Invalid address.");

        uint256 userOffersCounter = offersByUserCounter[user].current();
        if (userOffersCounter == 0) {
            return (new uint8[](0), new uint8[][](0));
        }

        uint8[] memory cardNumbersResult = new uint8[](userOffersCounter);
        uint8[][] memory wantedCardNumbersList = new uint8[][](userOffersCounter);

        uint256 index = 0;
        for (uint8 i = 0; i < maxCardNumbersAllowed; i++) { // current max: 120
            if (offersByUser[user][i].length > 0) {
                cardNumbersResult[index] = i; // asign #CardNumber
                wantedCardNumbersList[index] = offersByUser[user][i];
                index++;
            }
            if (index >= userOffersCounter) {
                break;
            }
        }
        return (cardNumbersResult, wantedCardNumbersList);
    }

    function getOffersByCardNumber(uint8 cardNumber) external view         
        returns (address[] memory users, uint8[][] memory wantedCardNumbers) {

        uint256 cardNumberOffersCounter = offersByCardNumberCounter[cardNumber].current();
        if (cardNumberOffersCounter == 0) {
            return (new address[](0), new uint8[][](0));
        }

        address[] memory usersResult = new address[](cardNumberOffersCounter);
        uint8[][] memory wantedCardNumbersList = new uint8[][](cardNumberOffersCounter);

        /*
        uint256 index = 0;
        for (uint8 i = 0; i < cardNumberOffersCounter; i++) { 
            address[] storage usersInOffer = offersByCardNumber[cardNumber][i];

            if (usersInOffer.length > 0) {
                address user = usersInOffer[i];
                usersResult[index] = user;
                wantedCardNumbersList[index] = offersByCardNumber[cardNumber][user];
                index++;
            }
            if (index >= cardNumberOffersCounter) {
                break;
            }
        }
        */

        return (usersResult, wantedCardNumbersList);
    }

    
/*    




    function getOffers() external view returns (Offer[] memory) {
        return offers;
    }

    function getOffersByUser(address user) external view returns (Offer[] memory) {
        return offersByUser[user];
    }

    function getOffersByCardNumber(uint8 cardNumber) external view returns (Offer[] memory) {
        return offersByCardNumber[cardNumber];
    }

    function getOffersByUserAndCardNumber(address user, uint8 cardNumber) external view returns (Offer[] memory) {
        // return offersByUser[user][cardNumber];
    }

    function removeOfferByUserAndCardNumber(uint8 cardNumber) external {
        require(address(gammaCardsContract) != address(0), "GammaCardsContract not set."); 

        Offer[] storage userOffers = offersByUser[msg.sender];

        for (uint i = 0; i < userOffers.length; i++) {
            if (userOffers[i].cardNumber == cardNumber) {
                uint offerId = userOffers[i].offerId;
                delete userOffers[i];
                userOffers[i] = userOffers[userOffers.length - 1];
                userOffers.pop();

                _removeOfferFromCard(cardNumber, offerId);
                _removeOfferFromAll(offerId);

                gammaCardsContract.restoreCardByOffer(msg.sender, cardNumber);
                emit OfferRemoved (msg.sender, cardNumber);
                return;
            }
        }

        revert("Offer not found for this user and card number.");
    }
     
    function _removeOfferFromCard(uint8 cardNumber, uint offerId) private {
        uint256 size = offersByCardNumber[cardNumber].length;
        for (uint i = 0; i < size; i++) {
            if (offersByCardNumber[cardNumber][i].offerId == offerId) {
                delete offersByCardNumber[cardNumber][i];
                offersByCardNumber[cardNumber][i] = offersByCardNumber[cardNumber][size - 1];
                offersByCardNumber[cardNumber].pop();
                return;
            }
        }
    }

    function _removeOfferFromAll(uint offerId) private {
        for (uint i = 0; i < offers.length; i++) {
            if (offers[i].offerId == offerId) {
                delete offers[i];
                offers[i] = offers[offers.length - 1];
                offers.pop();
                return;
            }
        }
    }
*/

////////////////////////////////////////////////////////////////////
    /*

    function removeAllOffers() public onlyOwners {
        for (uint8 i = 0; i < offers.length; i++) {
            // restore card to user
            cardsByUser[offers[i].owner][offers[i].cardNumber]++;
            delete offersByUser[offers[i].owner];
            delete offersByCardNumber[offers[i].cardNumber];
        }
        offers = new Offer[](0); // Reinicializar el array allOffers con un array vacío
    }
    
    */

    /*
    function removeOfferById(uint256 offerId) external {
        bool found = false;
        uint index;
        uint8 cardNUmber = 0;

        for (uint256 i = 0; i < offers.length; i++) {
            if (offers[i].offerId == offerId && 
                offersByUser[msg.sender][i].offerId == offerId) {
                index = i;
                cardNUmber = offers[i].cardNumber;
                found = true;
                break;
            }
        }

        require(found, "Offer not found");
        delete offers[index];
        offers[index] = offers[offers.length - 1];
        offers.pop();

        _removeOfferFromUser(offerId);
        _removeOfferFromCard(offerId);

        // restore card to user
        // cardsByUser[msg.sender][cardNUmber]++;
    }

    function _removeOfferFromUser(uint offerId) private {
        // Offer[] storage userOffers = offersByUser[msg.sender];

        for (uint i = 0; i < offersByUser[msg.sender].length; i++) {
            if (offersByUser[msg.sender][i].offerId == offerId) {
                delete offersByUser[msg.sender][i];
                offersByUser[msg.sender][i] = offersByUser[msg.sender][offersByUser[msg.sender].length - 1];
                offersByUser[msg.sender].pop();
                break;
            }
        }
    }

    function _removeOfferFromCard(uint offerId) private {
        for (uint8 i = 0; i < 256; i++) {
            Offer[] storage cardOffers = offersByCardNumber[i];

            for (uint j = 0; j < cardOffers.length; j++) {
                if (cardOffers[j].offerId == offerId) {

                    delete cardOffers[j];
                    cardOffers[j] = cardOffers[cardOffers.length - 1];
                    cardOffers.pop();
                    return;
                }
            }
        }
    }
    */

    /*
    function removeOfferByIndex(uint index) external onlyOwners {
        require(index < offers.length, "Index out of bounds");

        Offer memory offerToRemove = offers[index];
        delete offers[index];

        uint8 cardNumber = offerToRemove.cardNumber;
        _removeOfferFromList(offersByUser[msg.sender], offerToRemove);
        _removeOfferFromList(offersByCardNumber[cardNumber], offerToRemove);

        // restore card to user
        // cardsByUser[msg.sender][cardNumber]++;
    }

    function _removeOfferFromList(Offer[] storage offerList, Offer memory offerToRemove) private {
        for (uint i = 0; i < offerList.length; i++) {
            if (offerList[i].cardNumber == offerToRemove.cardNumber &&
                keccak256(abi.encodePacked(offerList[i].wantedCardNumbers)) == 
                    keccak256(abi.encodePacked(offerToRemove.wantedCardNumbers))) {
                delete offerList[i];
                offerList[i] = offerList[offerList.length - 1];
                offerList.pop();
                break;
            }
        }
    }
    */

    function toString(uint256 value) internal pure returns (string memory) {
        // Inspired by OraclizeAPI's implementation - MIT licence
        // https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Strings.sol#L15-L35

        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

}

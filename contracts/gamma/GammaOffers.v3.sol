// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
// import "hardhat/console.sol";

interface IGammaCardsContract {
  function hasCardByOffer(address user, uint8 cardNumber) external returns (bool has);
  function removeCardByOffer(address user, uint8 cardNumber) external;
  function restoreCardByOffer(address user, uint8 cardNumber) external;
  function exchangeCardsOffer(address from, uint8 cardNumberFrom, address to, uint8 cardNumberTo) external;
}

contract NofGammaOffersV3 is Ownable {
    using Counters for Counters.Counter;

    IGammaCardsContract public gammaCardsContract;
    mapping(address => bool) public owners;

    uint256 maxOffersAllowed = uint256(5000);
    uint256 maxOffersByUserAllowed = uint256(5);
    uint256 maxCardNumbersAllowed = uint256(120);
    
    struct Offer {
        uint256 offerId;
        uint8 cardNumber;
        uint8[] wantedCardNumbers;
        address owner;
    }

    Offer[] public offers;
    mapping(address user => Offer[]) offersByUser;
    mapping(uint8 cardNumber => Offer[]) offersByCardNumber;
    mapping(address => Counters.Counter) public offersByUserCounter;
    mapping(uint8 => Counters.Counter) public offersByCardNumberCounter;
    Counters.Counter private offersTotalCounter;

    event NewGammaCardsContract(address newGammaCardsContract);
    event NewOfferCreated (address user, uint8 cardNumber, uint8[] wantedCardNumbers);
    event OfferRemoved (address user, uint8 cardNumber);
    event NewOwnerAdded (address owner);
    event OwnerRemoved (address owner);
    event RemovedAllOffers ();

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

        bool userHasCard = gammaCardsContract.hasCardByOffer(msg.sender, cardNumber);
        require(userHasCard, "You does not have that card.");

        for (uint8 i = 0; i < wantedCardNumbers.length; i++) {
            require(wantedCardNumbers[i] != cardNumber, "The cardNumber cannot be in wantedCardNumbers.");
        }

        Offer memory existingOffer = getOfferByUserAndCardNumber(msg.sender, cardNumber);
        require(existingOffer.offerId == 0, "An offer for this user and cardNumber already exists.");

        offersByUserCounter[msg.sender].increment();
        offersByCardNumberCounter[cardNumber].increment();
        offersTotalCounter.increment();

        uint256 offerId = offersTotalCounter.current();
        
        offers.push(Offer(offerId, cardNumber, wantedCardNumbers, msg.sender));
        offersByUser[msg.sender].push(offers[offers.length - 1]);
        offersByCardNumber[cardNumber].push(offers[offers.length - 1]);

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
    
    function getOffers() external view returns (Offer[] memory) {
        return offers;
    }

    function getOfferByIndex(uint256 index) public view returns (Offer memory) {
        require(index < offers.length, "Offer Id does not exist");
        return offers[index];
    }

    function getOfferByOfferId(uint256 offerId) external view returns (Offer memory) {
        for (uint256 i = 0; i < offersTotalCounter.current(); i++) {
            if (offers[i].offerId == offerId) {
                return (offers[i]);
            }
        }
        return Offer(0, 0, new uint8[](0), address(0));
    }

    function getOffersByUser(address user) external view returns (Offer[] memory) {
        require(user != address(0), "Invalid address.");
        return offersByUser[user];
    }

    function getOffersByCardNumber(uint8 cardNumber) external view returns (Offer[] memory) {
        return offersByCardNumber[cardNumber];
    }

    function getOfferByUserAndCardNumber(address user, uint8 cardNumber) public view returns (Offer memory) {
        require(user != address(0), "Invalid address.");
        for (uint256 i = 0; i < offersByUserCounter[user].current(); i++) {
            if (offersByUser[user][i].cardNumber == cardNumber) {
                return offersByUser[user][i];
            }
        }
        return Offer(0, 0, new uint8[](0), address(0));
    }

    function removeOfferByCardNumber(uint8 cardNumber) external returns (bool) {
        return removeOfferByUserAndCardNumber (msg.sender, cardNumber);
    }

    function removeOfferByUserAndCardNumber(address user, uint8 cardNumber) public onlyOwners returns (bool) {
        require(user != address(0), "Invalid address.");

        Offer[] memory userOffers = offersByUser[user];
        uint256 currentUserOffersCounter = offersByUserCounter[user].current();
        uint256 currentTotalOffersCounter = offersTotalCounter.current();

        bool found = false;
        for (uint256 i = 0; i < currentUserOffersCounter; i++) {
            
            if (userOffers[i].cardNumber == cardNumber) {
                uint256 offerId = userOffers[i].offerId;

                delete offersByUser[user][i];
                delete offersByCardNumber[cardNumber][i];

                for (uint256 j = 0; j < currentTotalOffersCounter; j++) {
                    if (offers[j].offerId == offerId) {
                        delete offers[j];
                        offers[j] = offers[offers.length - 1];
                        offers.pop();
                        break;
                    }
                }

                offersByUserCounter[user].decrement();
                offersByCardNumberCounter[cardNumber].decrement();
                offersTotalCounter.decrement();

                found = true;
                gammaCardsContract.restoreCardByOffer(user, cardNumber);

                emit OfferRemoved(user, cardNumber);
                break;
            }
        }
        return found;
    }

    function deleteAllOffers() external onlyOwners {
        for (uint256 i = 0; i < offers.length; i++) {
            delete offersByUser[offers[i].owner];
            offersByUserCounter[offers[i].owner].reset();

            delete offersByCardNumber[offers[i].cardNumber];
            offersByCardNumberCounter[offers[i].cardNumber].reset();
        }
        offersTotalCounter.reset();
        delete offers;

        emit RemovedAllOffers();
    }
}

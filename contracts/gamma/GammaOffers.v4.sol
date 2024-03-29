// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./libs/LibControlMgmt.sol";
import "hardhat/console.sol";

interface IGammaCardsContract {
  function hasCardByOffer(address user, uint8 cardNumber) external returns (bool has);
  function removeCardByOffer(address user, uint8 cardNumber) external;
  function restoreCardByOffer(address user, uint8 cardNumber) external;
  function exchangeCardsOffer(address from, uint8 cardNumberFrom, address to, uint8 cardNumberTo) external;
}

contract NofGammaOffersV4 is Ownable {
    using LibControlMgmt for LibControlMgmt.Data;

    IGammaCardsContract public gammaCardsContract;
    LibControlMgmt.Data private ownersData;

    uint256 maxOffersAllowed = uint256(5000);
    uint256 maxOffersByUserAllowed = uint256(5);
    uint256 maxCardNumbersAllowed = uint256(120);
    bool removeCardInInventoryWhenOffer = false;

    struct Offer {
        string offerId;
        uint8 cardNumber;
        uint8[] wantedCardNumbers;
        address owner;
        uint256 timestamp;
    }

    Offer[] public offers;
    mapping(address user => Offer[]) offersByUser;
    mapping(uint8 cardNumber => Offer[]) offersByCardNumber;
    mapping(address => uint256) public offersByUserCounter;
    mapping(uint8 => uint256) public offersByCardNumberCounter;
    uint256 public offersTotalCounter;

    event NewGammaCardsContract(address newGammaCardsContract);
    event OfferCreated(address user, uint8 cardNumber, uint8[] wantedCardNumbers);
    event OfferRemoved(address user, uint8 cardNumber);
    event UserOffersRemoved(address user);
    event AllOffersRemoved();

    modifier onlyCardsContract {
        require(msg.sender == address(gammaCardsContract), "Only gamma cards contract can call this function.");
        _;
    }

    modifier onlyOwners() {
        require(ownersData.owners[msg.sender], "Only owners.");
        _;
    }

    function init (address _cardsContract) external onlyOwner {
        require(_cardsContract != address(0), "Invalid address.");
        gammaCardsContract = IGammaCardsContract(_cardsContract);
        ownersData.owners[msg.sender] = true;
    }

    function addOwner(address _newOwner) external onlyOwners {
        ownersData.addOwner(_newOwner);
    }

    function removeOwner(address _ownerToRemove) external onlyOwners {
        ownersData.removeOwner(_ownerToRemove);
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

    function changeRemoveCardinInventoryWhenOffer(bool _value) external onlyOwners {
        removeCardInInventoryWhenOffer = _value;
    }

    function createOffer(string memory offerId, uint8 cardNumber, uint8[] memory wantedCardNumbers) public {
        _createOfferWithUser (offerId, msg.sender, cardNumber, wantedCardNumbers);
    }

    function createOfferWithoUser(string memory offerId, address user, uint8 cardNumber, uint8[] memory wantedCardNumbers) public onlyOwners{
        _createOfferWithUser (offerId, user, cardNumber, wantedCardNumbers);
    }

    function _createOfferWithUser(string memory offerId, address user, uint8 cardNumber, uint8[] memory wantedCardNumbers) private {
        require(address(gammaCardsContract) != address(0), "GammaCardsContract not set."); 
        require(offersByUserCounter[user] < maxOffersByUserAllowed, "User has reached the maximum allowed offers.");
        require(offersTotalCounter < maxOffersAllowed, "Total offers have reached the maximum allowed.");
    
        bool userHasCard = gammaCardsContract.hasCardByOffer(user, cardNumber);
        require(userHasCard, "You does not have that card.");

        for (uint8 i = 0; i < wantedCardNumbers.length; i++) {
            require(wantedCardNumbers[i] != cardNumber, "The cardNumber cannot be in wantedCardNumbers.");
        }

        Offer memory existingOffer = getOfferByUserAndCardNumber(user, cardNumber);
        require(existingOffer.owner == address(0), "An offer for this user and cardNumber already exists.");

        offersByUserCounter[user] += 1;
        offersByCardNumberCounter[cardNumber] += 1;
        offersTotalCounter += 1;

        offers.push(Offer(offerId, cardNumber, wantedCardNumbers, user, block.timestamp));
        offersByUser[user].push(offers[offers.length - 1]);
        offersByCardNumber[cardNumber].push(offers[offers.length - 1]);

        if (removeCardInInventoryWhenOffer) {
            gammaCardsContract.removeCardByOffer(user, cardNumber);
        }

        emit OfferCreated(user, cardNumber, wantedCardNumbers);
    }

    function isOwner(address user) external view returns (bool) {
        return ownersData.owners[user];
    }

    function getOffersByUserCounter(address user) external view returns (uint256) {
        require(user != address(0), "Invalid address.");
        return offersByUserCounter[user];
    }

    function getOffersByCardNumberCounter(uint8 cardNumber) external view returns (uint256) {
        return offersByCardNumberCounter[cardNumber];
    }

    function getOffersCounter() external view returns (uint256) {
        return offersTotalCounter;
    }

    function getMaxOffersAllowed() external view returns (uint256) {
        return maxOffersAllowed;
    }

    function getMaxOffersByUserAllowed() external view returns (uint256) {
        return maxOffersByUserAllowed;
    }

    function getOffers() external view returns (Offer[] memory) {
        return offers;
    }

    function getOfferByIndex(uint256 index) public view returns (Offer memory) {
        require(index < offers.length, "Offer Id does not exist");
        return offers[index];
    }

    function getOfferByOfferId(string memory offerId) external view returns (Offer memory) {
        for (uint256 i = 0; i < offers.length; i++) {
            if (keccak256(abi.encodePacked(offers[i].offerId)) == keccak256(abi.encodePacked(offerId))) {
                return (offers[i]);
            }
        }
        return _emptyOffer();
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

        Offer[] storage userOffers = offersByUser[user];
        uint256 currentUserOffersCounter = offersByUserCounter[user];
        for (uint256 i = 0; i < currentUserOffersCounter; i++) {
            if (userOffers[i].cardNumber == cardNumber) {
                return userOffers[i];
            }
        }
        return _emptyOffer();
    }

    function canUserPublishOffer(address user) public view returns (bool) {
        return maxOffersByUserAllowed > offersByUserCounter[user];
    }

    function canAnyUserPublishOffer() public view returns (bool) {
        return maxOffersAllowed > offersTotalCounter;
    }

    function hasOffer(address user, uint8 cardNumber) public view returns (bool) {
        require(user != address(0), "Invalid address.");
        for (uint256 i = 0; i < offersByUserCounter[user]; i++) {
            if (offersByUser[user][i].cardNumber == cardNumber) {
                return true;
            }
        }
        return false;
    }

    function confirmOfferExchange(address from, uint8 cardNumberWanted, address offerWallet, uint8 offerCardNumber) external {
        Offer memory offer = getOfferByUserAndCardNumber(offerWallet, offerCardNumber);
        require(offer.owner == offerWallet, "An offer for this user and cardNumber don't exists.");
        
        uint8[] memory wantedCardNumbers = offer.wantedCardNumbers;
        if(wantedCardNumbers.length == 0){
            //buscamos que el usuario no tenga la carta
            require(!gammaCardsContract.hasCardByOffer(offerWallet, cardNumberWanted), "The user already has that card.");
        } else {
            //validamos contra las cartas que acepta el usuario
            bool foundCardWanted = false;
            for (uint8 j = 0; j < wantedCardNumbers.length; j++) {
                if(wantedCardNumbers[j] == cardNumberWanted){
                    foundCardWanted = true;
                    break;
                }
            }
            require(foundCardWanted, "The card is not in wantedCardNumbers.");
        }
        
        bool offerDeleted = _removeOfferByUserAndCardNumber(offerWallet, offerCardNumber, offer.offerId, true);
        require (offerDeleted, "Error deleting offer after transfer cards");
	
        gammaCardsContract.exchangeCardsOffer(from, cardNumberWanted, offerWallet, offerCardNumber);
        require(gammaCardsContract.hasCardByOffer(from, offerCardNumber), "Exchange error with wallet from");
        require(gammaCardsContract.hasCardByOffer(offerWallet, cardNumberWanted), "Exchange error with wallet to");
    }

    function deleteAllOffers() external onlyOwners {
        for (uint256 i = 0; i < offers.length; i++) {
            delete offersByUser[offers[i].owner];
            offersByUserCounter[offers[i].owner] = 0;

            delete offersByCardNumber[offers[i].cardNumber];
            offersByCardNumberCounter[offers[i].cardNumber] = 0;
        }
        offersTotalCounter = 0;
        delete offers;

        emit AllOffersRemoved();
    }

    function removeOfferByCardNumber(uint8 cardNumber) external returns (bool) {
        Offer memory offer = getOfferByUserAndCardNumber(msg.sender, cardNumber);
        if(offer.owner != msg.sender){
            return false;
        }
        bool result = _removeOfferByUserAndCardNumber(msg.sender, cardNumber, offer.offerId, false);
        return result;
    }

    function removeOfferByUserAndCardNumber(address user, uint8 cardNumber) public onlyOwners returns (bool) {
        Offer memory offer = getOfferByUserAndCardNumber(user, cardNumber);
        if(offer.owner != user){
            return false;
        }
        bool result = _removeOfferByUserAndCardNumber(user, cardNumber, offer.offerId, false);
        return result;
    }

    function removeOffersByUser(address user) external onlyCardsContract returns (bool) {
        require(user != address(0), "Invalid address.");
        
        Offer[] storage userOffers = offersByUser[user];
        uint256 currentUserOffersCounter = offersByUserCounter[user];

        for (uint256 i = 0; i < currentUserOffersCounter; i++) {
             string memory offerId = userOffers[i].offerId;
             uint8 cardNumber = userOffers[i].cardNumber;
            _removeOfferFromCardNumberMapping(user, cardNumber, offerId);
            _removeOfferByOfferId(offerId);
            offersByCardNumberCounter[cardNumber] -= 1;
            offersTotalCounter -= 1;
        }

        delete offersByUser[user];
        offersByUserCounter[user] = 0;
        
        emit UserOffersRemoved(user);
        return true;
    }

    function _removeOfferByUserAndCardNumber(address user, uint8 cardNumber, string memory offerId, bool fromConfirmOfferExchange) private returns (bool) {
        require(user != address(0), "Invalid address.");

        _removeOfferFromUserMapping(user, cardNumber, offerId);
        _removeOfferFromCardNumberMapping(user, cardNumber, offerId);
        _removeOfferByOfferId(offerId);
        offersByUserCounter[user] -= 1;
        offersByCardNumberCounter[cardNumber] -= 1;
        offersTotalCounter -= 1;

        if (removeCardInInventoryWhenOffer && !fromConfirmOfferExchange) {
            gammaCardsContract.restoreCardByOffer(user, cardNumber);
        }

        emit OfferRemoved(user, cardNumber);
        return true;
    }

    function _removeOfferFromUserMapping(address user, uint8 cardNumber, string memory offerId) private {
        Offer[] storage userOffers = offersByUser[user];
        for (uint256 i = 0; i < userOffers.length; i++) {
            if (_sameOfferId(userOffers[i].offerId, offerId)) {
                require(userOffers[i].owner == user, "_removeOfferFromUserMapping: owner does not match.");
                require(userOffers[i].cardNumber == cardNumber, "_removeOfferFromUserMapping: cardNumber does not match.");

                if (i < (userOffers.length - 1)) {
                    userOffers[i] = userOffers[userOffers.length - 1];
                }
                userOffers.pop();
                break;
            }
        }
    }

    function _removeOfferFromCardNumberMapping(address user, uint8 cardNumber, string memory offerId) private {
        Offer[] storage cardOffers = offersByCardNumber[cardNumber];

        for (uint256 i = 0; i < cardOffers.length; i++) {
            if (_sameOfferId(cardOffers[i].offerId, offerId)) {

                require(cardOffers[i].owner == user, "_removeOfferFromCardNumberMapping: owner does not match.");
                require(cardOffers[i].cardNumber == cardNumber, "_removeOfferFromCardNumberMapping: cardNumber does not match.");

                if (i < cardOffers.length - 1) {
                    cardOffers[i] = cardOffers[cardOffers.length - 1];
                }
                cardOffers.pop();
                break;
            }
        }
    }

    function _removeOfferByOfferId(string memory offerId) private returns (bool) {
        bool deleted = false;
        for (uint256 j = 0; j < offers.length; j++) {
            if (j < offers.length && _sameOfferId(offers[j].offerId, offerId)) {
                delete offers[j];
                offers[j] = offers[offers.length - 1];
                offers.pop();
                deleted = true;
                break;
            }
        }
        return deleted;
    }

     function _emptyOffer() internal pure returns (Offer memory) {
        return Offer("", 0, new uint8[](0), address(0), 0);
     }

     function _sameOfferId(string memory offerId1, string memory offerId2) internal pure returns (bool) {
        return keccak256(abi.encodePacked(offerId1)) == keccak256(abi.encodePacked(offerId2));
     }
}

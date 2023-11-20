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

contract NofGammaOffersV1 is Ownable {
    using Counters for Counters.Counter;

    IGammaCardsContract public gammaCardsContract;
    mapping(address => bool) public owners;

    struct Offer {
        uint256 offerId;
        uint8 cardNumber;
        uint8[] wantedCardNumbers;
        address owner;
    }

    Offer[] offers;
    mapping(address user => Offer[]) offersByUser;
    mapping(uint8 cardNumber => Offer[]) offersByCardNumber;
    Counters.Counter private _offerIdCounter;

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
        gammaCardsContract = IGammaCardsContract(_gammaCardsContract);
        emit NewGammaCardsContract(_gammaCardsContract);
    }

    function createOffer(uint8 cardNumber, uint8[] memory wantedCardNumbers) public {
        require(address(gammaCardsContract) != address(0), "GammaCardsContract not set."); 
        
        bool userHasCard = gammaCardsContract.hasCard(msg.sender, cardNumber);
        require(userHasCard, "You does not have that card.");

        for (uint8 i = 0; i < wantedCardNumbers.length; i++) {
            require(wantedCardNumbers[i] != cardNumber, "The cardNumber cannot be in wantedCardNumbers.");
        }

        _offerIdCounter.increment();
        uint256 offerId = _offerIdCounter.current();
        
        offers.push(Offer(offerId, cardNumber, wantedCardNumbers, msg.sender));
        offersByUser[msg.sender].push(offers[offers.length - 1]);
        offersByCardNumber[cardNumber].push(offers[offers.length - 1]);
        
        gammaCardsContract.removeCardByOffer(msg.sender, cardNumber);

        emit NewOfferCreated (msg.sender, cardNumber, wantedCardNumbers);
    }

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

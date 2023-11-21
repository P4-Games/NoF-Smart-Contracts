// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";

interface IgammaPacksContract {
    function getPackOwner(uint256 tokenId) external view returns (address);
    function openPack(uint256 tokenId, address owner) external;
}

interface IgammaOffersContract {
    function hasOffer(address user, uint8 cardNumber) external view returns (bool);
    function getOfferByUserAndCardNumber(address user, uint8 cardNumber) external view 
        returns ( uint256, uint8, uint8[] memory , address );
}

contract NofGammaCardsV3 is ERC721, ERC721URIStorage, ERC721Burnable, Ownable {
    using Counters for Counters.Counter;
    using ECDSA for bytes32;

    IgammaPacksContract public gammaPacksContract;
    IgammaOffersContract public gammaOffersContract;

    Counters.Counter private _tokenIdCounter;
    address public DAI_TOKEN;
    uint256 public packPrice = 12e17;
    uint256 public prizesBalance;
    string public baseUri;
    uint256 public mainAlbumPrize = 15e18; // 15 DAI por album principal completado
    uint256 public secondaryAlbumPrize = 1e18; // 1 DAI por album secundario completado
    string public mainUri;
    string public secondaryUri;
    bool public requireOpenPackSignerValidation;
    bool public requireOfferValidationInMint;
    bool public requireOfferValidationInTransfer;

    mapping(address => bool) public owners;
    mapping(address => bool) public signers;

    struct Card {
        uint256 tokenId;
        uint256 number;
        bool pasted;
        uint8 class; // 1 para cartas, 2 para album de 120, 3 para album de 60
        uint256 completion; // solo se modifica en el caso de los albums
    }

    mapping (uint256 tokenId => Card) public cards;
    mapping (uint256 cardNumber => uint256 amount) public cardsInventory; // maximos: 119 => 4999
    mapping(address user => uint256 amount) public burnedCards;
    mapping(address user => mapping(uint8 cardNumber => uint8 amount)) public cardsByUser;
    
    struct Offer {
        uint256 offerId;
        uint8 cardNumber;
        uint8[] wantedCardNumbers;
        address owner;
    }

    event PackOpened(address player, uint8[] packData, uint256 packNumber);
    event AlbumCompleted(address player, uint8 albumClass);
    event CardPasted(address player, uint256 cardTokenId, uint256 albumTokenId);
    event EmergencyWithdrawal(address receiver, uint256 amount);
    event NewSigner(address newSigner);
    event NewUris(string newMainUri, string newSecondaryUri);
    event NewGammaOffersContract(address newGammaOffersContract);

    constructor(address _daiTokenAddress, address _gammaPacksContract, string memory _baseUri, address _signer) 
        ERC721("GammaCards", "NOF_GC") {
        gammaPacksContract = IgammaPacksContract(_gammaPacksContract);
        DAI_TOKEN = _daiTokenAddress;
        baseUri = _baseUri;
        mainUri = string(abi.encodePacked(bytes(baseUri), bytes("/"), bytes("120"), bytes("F.json")));
        secondaryUri = string(abi.encodePacked(bytes(baseUri), bytes("/"), bytes("121"), bytes("F.json")));
        signers[_signer] = true;
        requireOpenPackSignerValidation = false;
        requireOfferValidationInMint = true;
        requireOfferValidationInTransfer = true;

        for(uint256 i;i<122;i++){
            cardsInventory[i] = 1;
        }
        owners[msg.sender] = true;
    }

    modifier onlyGammaPacksContract {
        require(msg.sender == address(gammaPacksContract), "Only gamma packs contract can call this function.");
        _;
    }

    modifier onlyGammaOffersContract {
        require(msg.sender == address(gammaOffersContract), "Only gamma offers contract can call this function.");
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
    }

    function removeOwner(address _ownerToRemove) external onlyOwners {
        require(_ownerToRemove != address(0), "Invalid address.");
        require(_ownerToRemove != msg.sender, "You cannot remove yourself as an owner.");
        require(owners[_ownerToRemove], "Address is not an owner.");
        owners[_ownerToRemove] = false;
    }

    function addSigner(address _newSigner) external onlyOwners {
        require(_newSigner != address(0), "Invalid address.");
        require(!signers[_newSigner], "Address is already an owner.");
        signers[_newSigner] = true;
    }

    function removeSigner(address _signerToRemove) external onlyOwners {
        require(_signerToRemove != address(0), "Invalid address.");
        require(_signerToRemove != msg.sender, "You cannot remove yourself as a signer.");
        require(signers[_signerToRemove], "Address is not an signer.");
        signers[_signerToRemove] = false;
    }

    function setGammaOffersContract(address _gammaOffersContract) public onlyOwners {
        require(_gammaOffersContract != address(0), "Invalid address.");
        gammaOffersContract = IgammaOffersContract(_gammaOffersContract);
        emit NewGammaOffersContract(_gammaOffersContract);
    }

    function changeRequireOpenPackSignerValidation(bool required) external onlyOwners {
        requireOpenPackSignerValidation = required;
    }

    function changeRequireOfferValidationInMint(bool required) external onlyOwners {
        requireOfferValidationInMint = required;
    }

    function changeRequireOfferValidationInTransfer(bool required) external onlyOwners {
        requireOfferValidationInTransfer = required;
    }

    function hasCardByOffer(address user, uint8 cardNumber) external view onlyGammaOffersContract returns (bool has) {
        return cardsByUser[user][cardNumber] > 0;
    }

    function removeCardByOffer (address user, uint8 cardNumber) external onlyGammaOffersContract {
        cardsByUser[user][cardNumber]--;
    }

    function restoreCardByOffer (address user, uint8 cardNumber) external onlyGammaOffersContract {
        cardsByUser[user][cardNumber]++;
    }

    function verifyPackSigner(uint256 packNumber, uint8[] memory packData, bytes calldata signature) public view 
        returns (address signer) {
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, packNumber, 
            packData, '0xf1dD71895e49b1563693969de50898197cDF3481')).toEthSignedMessageHash();
        address recoveredSigner = messageHash.recover(signature);
        console.log('open pack signer recovered', recoveredSigner);
        return recoveredSigner;
    }

    function openPack(uint256 packNumber, uint8[] memory packData, bytes calldata signature) external {
        require(gammaPacksContract.getPackOwner(packNumber) == msg.sender, "This card is not yours.");
        // TO_REVIEW: chech this length
        require(packData.length < 15, "Card limit exceeded"); 
        
        if (requireOpenPackSignerValidation) {
            // Recreates the message present in the `signature`
            bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, packNumber, 
                packData, '0xf1dD71895e49b1563693969de50898197cDF3481')).toEthSignedMessageHash();

            address recoveredSigner = messageHash.recover(signature);
            console.log('open pack signer recovered', recoveredSigner);
            require(signers[recoveredSigner], "Invalid signature.");
        }

        gammaPacksContract.openPack(packNumber, msg.sender);
        prizesBalance += packPrice - packPrice / 6;
        uint256 length = packData.length;
        for(uint8 i;i<length;i++){
            require(packData[i] == 120 ? cardsInventory[120] < 3001 : cardsInventory[packData[i]] < 5001, 
                'invalid cardInventory position');
            cardsInventory[packData[i]]++; // 280k gas aprox.
            cardsByUser[msg.sender][packData[i]]++; // 310k gas aprox.
        }

        emit PackOpened(msg.sender, packData, packNumber);
    }

    function testOpenPack(uint256 packNumber, uint8[] memory packData) external onlyOwners {
        gammaPacksContract.openPack(packNumber, msg.sender);
        prizesBalance += packPrice - packPrice / 6;
        uint256 length = packData.length;

        for(uint8 i;i<length;i++){
            require(packData[i] == 120 ? cardsInventory[120] < 3001 : cardsInventory[packData[i]] < 5001, 
                'invalid cardInventory position');
            cardsInventory[packData[i]]++; // 280k gas aprox.
            cardsByUser[msg.sender][packData[i]]++; // 310k gas aprox.
        }
    }

    function exchangeCardsOffer(
        address from, uint8 cardNumberFrom,
        address to, uint8 cardNumberTo) external onlyGammaOffersContract {
        require(from != address(0), "Invalid address.");
        require(to != address(0), "Invalid address.");
        cardsByUser[from][cardNumberFrom]--;
        cardsByUser[to][cardNumberFrom]++;
        cardsByUser[to][cardNumberTo]--;
        cardsByUser[from][cardNumberTo]++;
    }

    function transferCard(address to, uint8 cardNumber) external {
        require(cardsByUser[msg.sender][cardNumber] > 0, "You does not have this card.");
        require(to != msg.sender, "Own transfer not allowed.");
        require(to != address(0), "Invalid address.");
                
        if (requireOfferValidationInTransfer) {
            bool hasOffer = gammaOffersContract.hasOffer(msg.sender, cardNumber);
            require (!hasOffer, "This card has an offer, it cannot be transfered.");
        }
        
        cardsByUser[msg.sender][cardNumber]--;
        cardsByUser[to][cardNumber]++;
    }

    function transferCards(address to, uint8[] calldata cardNumbers) public {
        require(to != msg.sender, "You cannot send cards to yourself.");
        require(to != address(0), "Invalid address.");

        for(uint8 i; i<cardNumbers.length;i++){
            require(cardsByUser[msg.sender][cardNumbers[i]] > 0, "You does not have this card.");
            cardsByUser[msg.sender][cardNumbers[i]]--;
            cardsByUser[to][cardNumbers[i]]++;
        }
    }

    // user must call this function when they have at least 1 
    // card of each number (120 total) + a 120 album card
    function finishAlbum() public {
        // requires the user to have at least one 120 album
        require(cardsByUser[msg.sender][120] > 0, "You does not have any album.");
        require(prizesBalance >= mainAlbumPrize, "Insufficient funds.");

        // check that you have at least one card of each number
        // TO-REVIEW: check if this part is necessary because the subtraction of cards 
        // would cause underflow if it is at 0
        bool unfinished;
        for(uint8 i;i<121;i++){
            if(cardsByUser[msg.sender][i] == 0) {
                unfinished = true;
                break;
            }
            cardsByUser[msg.sender][i]--;
        }
        
        require(!unfinished, "Must complete the album.");
        
        // mint the completed album.
        safeMint(msg.sender, mainUri, 120, 2);

        // transfer prize in DAI.
        prizesBalance -= mainAlbumPrize;
        IERC20(DAI_TOKEN).transfer(msg.sender, mainAlbumPrize);
        emit AlbumCompleted(msg.sender, 1);
    }

    function testAddCards() public onlyOwners {
        for(uint8 i;i<121;i++){
            cardsByUser[msg.sender][i]++;
        }
    }

    // user should call this function if they want to 'paste' selected cards in 
    // the 60 cards album to 'burn' them.
    function burnCards(uint8[] calldata cardNumbers) public {
        require(cardsByUser[msg.sender][121] > 0, "No tienes album de quema");
        cardsByUser[msg.sender][121]--;
        burnedCards[msg.sender] += cardNumbers.length;
        for(uint8 i;i<cardNumbers.length;i++){
            cardsByUser[msg.sender][cardNumbers[i]]--;
        }
        if(burnedCards[msg.sender] % 60 == 0){
            // string memory uri = string(abi.encodePacked(bytes(baseUri), 
            // bytes("/"), bytes("121"), bytes("F.json"))); // global variable
            // mintea album de 60
            safeMint(msg.sender, secondaryUri, 121, 2);
            
            prizesBalance -= mainAlbumPrize;
            // Transfer prize in DAI.
            IERC20(DAI_TOKEN).transfer(msg.sender, secondaryAlbumPrize);
            emit AlbumCompleted(msg.sender, 2);
        }
    }

    function mintCard(uint8 cardNum) public {
        require(cardsByUser[msg.sender][cardNum] > 0, "You does not have this card.");
        
        if (requireOfferValidationInMint) {
            bool hasOffer = gammaOffersContract.hasOffer(msg.sender, cardNum);
            require (!hasOffer, "This card has an offer, it cannot be minted.");
        }
        
        cardsByUser[msg.sender][cardNum]--;
        
        string memory uri = 
            string(abi.encodePacked(bytes(baseUri), bytes("/"), 
            bytes(toString(cardNum)), bytes(".json"))); 
        safeMint(msg.sender, uri, cardNum, 1);
    }
     
    function safeMint(address _to, string memory _uri, uint256 _number, uint8 _class) internal {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        cards[tokenId].tokenId = tokenId;
        cards[tokenId].number = _number;
        cards[tokenId].class = _class;
        _safeMint(_to, tokenId);
        _setTokenURI(tokenId, _uri);
    }

    function receivePrizesBalance(uint256 amount) external onlyGammaPacksContract {
        prizesBalance += amount;
    }

    // do not call unless really necessary
    function emergencyWithdraw(uint256 amount) public onlyOwners {
        require(balanceOf(address(this)) >= amount);
        prizesBalance -= amount;
        IERC20(DAI_TOKEN).transfer(msg.sender, amount);
        emit EmergencyWithdrawal(msg.sender, amount);
    }

    function changePackPrice(uint256 newPackPrice) external onlyGammaPacksContract {
        packPrice = newPackPrice;
    }

    function setUris(string memory newMainUri, string memory newSecondaryUri) public onlyOwners {
        mainUri = newMainUri;
        secondaryUri = newSecondaryUri;
        emit NewUris(newMainUri, newSecondaryUri);
    }

    function hasCard(uint8 cardNum) public view returns (bool has) {
        return cardsByUser[msg.sender][cardNum] > 0;
    }
     
    function getCardsByUser(address user) public view returns (uint8[] memory, uint8[] memory, bool[] memory) {
        uint8[] memory cardNumbers = new uint8[](121);
        uint8[] memory quantities = new uint8[](121);
        bool[] memory offers = new bool[](121);
        uint8 index = 0;
        
        for (uint8 i = 0; i <= 119; i++) {
            if (cardsByUser[user][i] > 0) {
                cardNumbers[index] = i;
                quantities[index] = cardsByUser[user][i];
                offers[index] = gammaOffersContract.hasOffer(user, i);
                index++;
            }
        }
        
        uint8[] memory userCardNumbers = new uint8[](index);
        uint8[] memory userCardsQtty = new uint8[](index);
        bool[] memory userCardsOffers = new bool[](index);
        
        for (uint8 j = 0; j < index; j++) {
            userCardNumbers[j] = cardNumbers[j];
            userCardsQtty[j] = quantities[j];
            userCardsOffers[j] = offers[j];
        }
        
        return (userCardNumbers, userCardsQtty, userCardsOffers);
    }

    // The following functions are overrides required by Solidity.
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

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

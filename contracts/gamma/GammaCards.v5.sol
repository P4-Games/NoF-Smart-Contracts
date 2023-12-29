// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libs/LibStringUtils.sol";
import "./libs/LibPackVerifier.sol";
import "./libs/LibControlMgmt.sol";

interface IgammaPacksContract {
    function getPackOwner(uint256 tokenId) external view returns (address);
    function openPack(uint256 tokenId, address owner) external;
    function openPacks(uint256[] memory tokenIds, address owner) external;
}

interface IgammaOffersContract {
    function hasOffer(address user, uint8 cardNumber) external view returns (bool);
    function removeOffersByUser(address user) external returns (bool);
    function getOffersByUserCounter(address user) external view returns (uint256);
    function getOfferByUserAndCardNumber(address user, uint8 cardNumber) external view 
        returns (uint256, uint8, uint8[] memory , address);
}

interface IgammaTicketsContract {
    function generateTicket(address user) external;
}

contract NofGammaCardsV5 is ERC721, ERC721URIStorage, ERC721Burnable, Ownable {
    using LibStringUtils for uint8; 
    using LibControlMgmt for LibControlMgmt.Data;

    IgammaPacksContract public gammaPacksContract;
    IgammaOffersContract public gammaOffersContract;
    IgammaTicketsContract public gammaTicketsContract;
 
    LibControlMgmt.Data private ownersData;
    LibControlMgmt.Data private signersData;

    uint8 public maxPacksToOpenAtOnce = 10;
    uint256 public _tokenIdCounter;
    address public DAI_TOKEN;
    uint256 public packPrice = 12e17; // 1.2 DAI
    uint256 public prizesBalance = 0;
    string public baseUri;
    uint256 public mainAlbumPrize = 15e18; // 15 DAI por album principal completado
    uint256 public secondaryAlbumPrize = 1e18; // 1 DAI por album secundario completado
    uint8 public lotteryPrizePercentage = 50;
    string public mainUri;
    string public secondaryUri;
    bool public requireOpenPackSignerValidation = false;
    bool public requireOfferValidationInMint = true;
    bool public requireOfferValidationInTransfer = true;

    struct Card {
        uint256 tokenId;
        uint256 number;
        bool pasted;
        uint8 class; // 1 para cartas, 2 para album de 120, 3 para album de 60
        uint256 completion; // solo se modifica en el caso de los albums
    }

    mapping(uint256 tokenId => Card) public cards;
    mapping(uint256 cardNumber => uint256 amount) public cardsInventory; // maximos: 120 => 5000
    mapping(address user => uint256 amount) public burnedCards;
    mapping(address user => mapping(uint8 cardNumber => uint8 amount)) public cardsByUser;

    event NewGammaOffersContract(address newGammaOffersContract);
    event NewGammaPacksContract(address newGammaPacksContract);
    event NewGammaTicketsContract(address newGammaTicketContract);
    event PackOpened(address player, uint8[] packData, uint256 packNumber);
    event AlbumCompleted(address player, uint8 albumClass);
    event CardPasted(address player, uint256 cardTokenId, uint256 albumTokenId);
    event EmergencyWithdrawal(address receiver, uint256 amount);
    event NewSigner(address newSigner);
    event NewUris(string newMainUri, string newSecondaryUri);
    event OfferCardsExchanged(address from, address to, uint8 cardNumberFrom, uint8 cardNumberTo);
    event CardTransfered(address from, address to, uint8 cardNumber);
    event CardsTransfered(address from, address to, uint8[] cardNumber);
    event CardsBurned(address user, uint8[] cardsNumber);

    constructor() ERC721("GammaCards", "NOF_GC") {}

    modifier onlyGammaPacksContract {
        require(msg.sender == address(gammaPacksContract), "Only packs contract.");
        _;
    }

    modifier onlyGammaOffersContract {
        require(msg.sender == address(gammaOffersContract), "Only offers contract.");
        _;
    }

    modifier onlyOwners() {
        require(ownersData.owners[msg.sender], "Only owners.");
        _;
    }

    function init (address _daiTokenAddress, address _gammaPacksContract, 
        address _gammaOffersContract, address _gammaTicketsContract, 
        string memory _baseUri, address _signer) external onlyOwner {
        ownersData.owners[msg.sender] = true;

        DAI_TOKEN = _daiTokenAddress;
        gammaPacksContract = IgammaPacksContract(_gammaPacksContract);
        gammaTicketsContract = IgammaTicketsContract(_gammaTicketsContract);
        gammaOffersContract = IgammaOffersContract(_gammaOffersContract);

        baseUri = _baseUri;
        mainUri = string(abi.encodePacked(bytes(baseUri), bytes("/"), bytes("120"), bytes("F.json")));
        secondaryUri = string(abi.encodePacked(bytes(baseUri), bytes("/"), bytes("121"), bytes("F.json")));
        signersData.signers[_signer] = true;

        for(uint256 i; i<122; i++){
            cardsInventory[i] = 1;
        }
    }

    function addOwner(address _newOwner) external onlyOwners {
        ownersData.addOwner(_newOwner);
    }

    function removeOwner(address _ownerToRemove) external onlyOwners {
        ownersData.removeOwner(_ownerToRemove);
    }

    function addSigner(address _newSigner) external onlyOwners {
        signersData.addSigner(_newSigner);
    }

    function removeSigner(address _signerToRemove) external onlyOwners {
        signersData.removeSigner(_signerToRemove);
    }

    function setGammaOffersContract(address _gammaOffersContract) public onlyOwners {
        require(_gammaOffersContract != address(0), "Invalid address.");
        gammaOffersContract = IgammaOffersContract(_gammaOffersContract);
        emit NewGammaOffersContract(_gammaOffersContract);
    }

    function setGammaPacksContract(address _gammaPacksContract) public onlyOwners {
        require(_gammaPacksContract != address(0), "Invalid address.");
        gammaPacksContract = IgammaPacksContract(_gammaPacksContract);
        emit NewGammaPacksContract(_gammaPacksContract);
    }

    function setGammaTicketsContract(address _gammaTicketsContract) public onlyOwners {
        require(_gammaTicketsContract != address(0), "Invalid address.");
        gammaTicketsContract = IgammaTicketsContract(_gammaTicketsContract);
        emit NewGammaTicketsContract(_gammaTicketsContract);
    }

    function setPrizesBalance(uint256 amount) external onlyGammaPacksContract {
        prizesBalance += amount;
    }

    function setMainAlbumPrize(uint256 amount) external onlyOwners {
        require(amount > 0, "The prize for completing the album must be greater than 0.");
        mainAlbumPrize = amount;
    }

    function setSecondaryAlbumPrize(uint256 amount) external onlyOwners {
        require(amount > 0, "The prize for completing the burning album must be greater than 0.");
        secondaryAlbumPrize = amount;
    }

    function setLotteryPrizePercentage(uint8 amount) external onlyOwners {
        require(amount <= 100, "The percentage must be between 0 and 100.");
        lotteryPrizePercentage = amount;
    }

    function setUris(string memory newMainUri, string memory newSecondaryUri) external onlyOwners {
        mainUri = newMainUri;
        secondaryUri = newSecondaryUri;
        emit NewUris(newMainUri, newSecondaryUri);
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

    function changePackPrice(uint256 newPackPrice) external onlyGammaPacksContract {
        packPrice = newPackPrice;
    }

    function changeMaxPacksToOpenAtOnce(uint8 _maxPacksToOpenAtOnce) external onlyOwners {
        maxPacksToOpenAtOnce = _maxPacksToOpenAtOnce;
    }

    function removeCardByOffer(address user, uint8 cardNumber) external onlyGammaOffersContract {
        cardsByUser[user][cardNumber]--;
    }

    function restoreCardByOffer(address user, uint8 cardNumber) external onlyGammaOffersContract {
        cardsByUser[user][cardNumber]++;
    }

    function hasCardByOffer(address user, uint8 cardNumber) external view onlyGammaOffersContract returns (bool has) {
        return cardsByUser[user][cardNumber] > 0;
    }

    function hasCard(address user, uint8 cardNum) public view returns (bool has) {
        require(user != address(0), "Invalid address.");
        return cardsByUser[user][cardNum] > 0;
    }

    function isOwner(address user) external view returns (bool) {
        return ownersData.owners[user];
    }

    function isSigner(address user) external view returns (bool) {
        return signersData.signers[user];
    }

    function getLotteryPrize() public view returns (uint256) {
        return (lotteryPrizePercentage * prizesBalance) / 100;
    }

    function getCardQuantityByUser(address user, uint8 cardNum) public view returns (uint8) {
        require(user != address(0), "Invalid address.");
        return cardsByUser[user][cardNum];
    }
    
    function getBurnedCardQttyByUser(address user) public view returns (uint256) {
        require(user != address(0), "Invalid address.");
        return burnedCards[user];
    }

    function getCardsByUser(address user) public view returns (uint8[] memory, uint8[] memory, bool[] memory) {
        uint8[] memory cardNumbers = new uint8[](122);
        uint8[] memory quantities = new uint8[](122);
        bool[] memory offers = new bool[](122);
        uint8 index = 0;
        
        for (uint8 i = 0; i <= 121; i++) {
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

    function verifyPackSigner(uint256 packNumber, uint8[] memory packData, bytes calldata signature) public view 
        returns (address signer) {
            return LibPackVerifier.verifyPackSigner(msg.sender, packNumber, packData, signature);
    }

    function openPack(uint256 packNumber, uint8[] memory packData, bytes calldata signature) external {
        _openPack(msg.sender, packNumber, packData, signature);
    }

    function openPacks(uint8 packsQuantity, uint256[] memory packsNumber, 
        uint8[][] memory packsData, bytes[] calldata signatures) external {
        
        require (packsQuantity > 0, "packs quantity must be greater than 0.");
        require (packsQuantity <= maxPacksToOpenAtOnce, "packs quantity must be less than max quantity allowed.");

        for (uint8 i = 0; i < packsQuantity; i++) {
            _openPack(msg.sender, packsNumber[i], packsData[i], signatures[i]);
        }
    }

    function _openPack(address user, uint256 packNumber, uint8[] memory packData, bytes calldata signature) private {
        require(gammaPacksContract.getPackOwner(packNumber) == user, "This pack is not yours.");
        require(packData.length < 15, "Card limit exceeded"); 
        
        if (requireOpenPackSignerValidation) {
            // Recreates the message present in the `signature`
            address signer = LibPackVerifier.verifyPackSigner(msg.sender, packNumber, packData, signature);
            require(signersData.signers[signer], "Invalid signature.");
        }

        gammaPacksContract.openPack(packNumber, user);
        prizesBalance += packPrice - packPrice / 6;

        for(uint8 i; i<packData.length; i++){
            require(packData[i] == 120 ? cardsInventory[120] < 3001 : cardsInventory[packData[i]] < 5001, 
                'invalid cardInventory position');
            cardsInventory[packData[i]]++; // 280k gas aprox.
            cardsByUser[user][packData[i]]++; // 310k gas aprox.
        }

        emit PackOpened(user, packData, packNumber);
    }
   
    function exchangeCardsOffer(
        address from, uint8 cardNumberFrom,
        address to, uint8 cardNumberTo) external onlyGammaOffersContract {
        require(from != address(0), "Invalid address.");
        require(to != address(0), "Invalid address.");
        require(cardsByUser[from][cardNumberFrom] > 0, "User (from) does not have card (from).");
        require(cardsByUser[to][cardNumberTo] > 0, "User (to) does not have card (to).");

        cardsByUser[from][cardNumberFrom]--;
        cardsByUser[to][cardNumberFrom]++;
        cardsByUser[to][cardNumberTo]--;
        cardsByUser[from][cardNumberTo]++;

        emit OfferCardsExchanged(from, to, cardNumberFrom, cardNumberTo);
    }

    function transferCard(address to, uint8 cardNumber) external {
        require(cardsByUser[msg.sender][cardNumber] > 0, "You does not have this card.");
        require(to != msg.sender, "Own transfer not allowed.");
        require(to != address(0), "Invalid address.");
                
        if (requireOfferValidationInTransfer) {
            bool hasOffer = gammaOffersContract.hasOffer(msg.sender, cardNumber);
            bool hasMoreThanOne = cardsByUser[msg.sender][cardNumber] > 1;
            /* 
            The user can only make an offer for one letter and in that case he cannot mint or transfer it.
            If you have more than one copy (quantity > 1) of that card, you must be able to mint 
            or transfer the rest.
            */
            require (!hasOffer || hasMoreThanOne, "This card has an offer, it cannot be transfered.");
        }
        
        cardsByUser[msg.sender][cardNumber]--;
        cardsByUser[to][cardNumber]++;
        emit CardTransfered(msg.sender, to, cardNumber);
    }

    function transferCards(address to, uint8[] calldata cardNumbers) public {
        require(to != msg.sender, "You cannot send cards to yourself.");
        require(to != address(0), "Invalid address.");

        for(uint8 i; i<cardNumbers.length;i++){
            require(cardsByUser[msg.sender][cardNumbers[i]] > 0, "You does not have this card.");
            cardsByUser[msg.sender][cardNumbers[i]]--;
            cardsByUser[to][cardNumbers[i]]++;
                                
            if (requireOfferValidationInTransfer) {
                bool hasOffer = gammaOffersContract.hasOffer(msg.sender, cardNumbers[i]);
                bool hasMoreThanOne = cardsByUser[msg.sender][cardNumbers[i]] > 1;
                /* 
                The user can only make an offer for one letter and in that case he cannot mint or transfer it.
                If you have more than one copy (quantity > 1) of that card, you must be able to mint 
                or transfer the rest.
                */
                require (!hasOffer || hasMoreThanOne, "This card has an offer, it cannot be transfered.");
            }
        }
        emit CardsTransfered(msg.sender, to, cardNumbers);
    }

    // user must call this function when they have at least 1 
    // card of each number (120 total) + a 120 album card
    function finishAlbum() public returns (bool) {
        // requires the user to have at least one 120 album
        require(cardsByUser[msg.sender][120] > 0, "You does not have any album.");
        require(prizesBalance >= mainAlbumPrize, "Insufficient funds (open-packs balance).");
        
        uint256 contractBalance = IERC20(DAI_TOKEN).balanceOf(address(this));
        require(contractBalance >= mainAlbumPrize, "Insufficient funds (contract).");

        // check that you have at least one card of each number
        bool unfinished;
        for(uint8 i; i<=120; i++){
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
        IERC20(DAI_TOKEN).transfer(msg.sender, mainAlbumPrize);
        prizesBalance -= mainAlbumPrize;

        bool userOffersRemoved = gammaOffersContract.removeOffersByUser(msg.sender);
        require (userOffersRemoved, "Cannot remove user offers");

        emit AlbumCompleted(msg.sender, 1);
        return true;
    }

    // user should call this function if they want to 'paste' selected cards in 
    // the 60 cards album to 'burn' them.
    function burnCards(uint8[] calldata cardNumbers) public {
        require(cardsByUser[msg.sender][121] > 0, "You does not have any burning album.");
        uint256 totalUserBurnedCards = burnedCards[msg.sender] + cardNumbers.length;
        bool mustPayPrize = false;

        if (totalUserBurnedCards >= 60) {
            require(prizesBalance >= secondaryAlbumPrize, "Insufficient funds (burnCards balance).");
            uint256 contractBalance = IERC20(DAI_TOKEN).balanceOf(address(this));
            require(contractBalance >= secondaryAlbumPrize, "Insufficient funds (contract).");
            mustPayPrize = true;
        }

        bool userHasOffers = (gammaOffersContract.getOffersByUserCounter(msg.sender) > 0);
        for(uint8 i; i<cardNumbers.length; i++){
            require(cardsByUser[msg.sender][cardNumbers[i]] > 0, "You does not have this card.");
            if (userHasOffers) {

                if (gammaOffersContract.hasOffer(msg.sender, cardNumbers[i])) {
                    require(cardsByUser[msg.sender][cardNumbers[i]] >= 2, 
                        "You cannot burn any more copies of this card.");
                }
            }
            cardsByUser[msg.sender][cardNumbers[i]]--;
        }

        burnedCards[msg.sender] += cardNumbers.length;        
        emit CardsBurned(msg.sender, cardNumbers);

        if(mustPayPrize){
            cardsByUser[msg.sender][121]--;
            safeMint(msg.sender, secondaryUri, 121, 2); // mint album of 60 cards.

            prizesBalance -= secondaryAlbumPrize;
            IERC20(DAI_TOKEN).transfer(msg.sender, secondaryAlbumPrize);

            gammaTicketsContract.generateTicket(msg.sender);
            emit AlbumCompleted(msg.sender, 2);
        }
    }

    function mintCard(uint8 cardNum) public {
        require(cardsByUser[msg.sender][cardNum] > 0, "You does not have this card.");
        
        if (requireOfferValidationInMint) {
            bool hasOffer = gammaOffersContract.hasOffer(msg.sender, cardNum);
            bool hasMoreThanOne = cardsByUser[msg.sender][cardNum] > 1;
            /* 
            The user can only make an offer for one letter and in that case he cannot mint or transfer it.
            If you have more than one copy (quantity > 1) of that card, you must be able to mint 
            or transfer the rest.
            */
            require (!hasOffer || hasMoreThanOne, "This card has an offer, it cannot be minted.");
        }
        
        cardsByUser[msg.sender][cardNum]--;
        
        string memory uri = 
            string(abi.encodePacked(bytes(baseUri), bytes("/"), 
            bytes(cardNum.toString()), bytes(".json"))); 

        safeMint(msg.sender, uri, cardNum, 1);
    }
     
    function safeMint(address _to, string memory _uri, uint256 _number, uint8 _class) internal {
        uint256 tokenId = _tokenIdCounter;
        cards[tokenId].tokenId = tokenId;
        cards[tokenId].number = _number;
        cards[tokenId].class = _class;
        _safeMint(_to, tokenId);
        _setTokenURI(tokenId, _uri);
	    _tokenIdCounter += 1;
    }

    function testAddCards(address user) public onlyOwners {
        for(uint8 i; i<=121; i++){ // 0-119: cards, 120: album-120, 121: album-60
            cardsByUser[user][i]++;
        }
    }

    function testOpenPack(address user, uint256 packNumber, uint8[] memory packData) external onlyOwners {
        gammaPacksContract.openPack(packNumber, user);
        prizesBalance += packPrice - packPrice / 6;

        for(uint8 i; i<packData.length; i++){
            require(packData[i] == 120 ? cardsInventory[120] < 3001 : cardsInventory[packData[i]] < 5001, 
                'invalid cardInventory position');
            cardsInventory[packData[i]]++; // 280k gas aprox.
            cardsByUser[user][packData[i]]++; // 310k gas aprox.
        }
    }

    // The following functions are overrides required by Solidity.
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // do not call unless really necessary
    function emergencyWithdraw(uint256 amount) public onlyOwners {
        require(balanceOf(address(this)) >= amount);
        prizesBalance -= amount;
        IERC20(DAI_TOKEN).transfer(msg.sender, amount);
        emit EmergencyWithdrawal(msg.sender, amount);
    }
}

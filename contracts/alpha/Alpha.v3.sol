// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ContextMixin.v2.sol";
import "../libs/LibStringUtils.sol";

contract NofAlphaV3 is ERC721, ERC721URIStorage, Ownable, ContextMixinV2 {
    
    using LibStringUtils for uint256;
    
    uint256 private _tokenIdCounter;
    string public baseUri;

    struct Season {
        uint    price;
        uint[]  cards;
        uint[]  albums;
        mapping(address => bool) owners;
        string folder;
    }

    struct Card {
        uint tokenId;
        uint  class;
        uint  collection;
        string  season;
        uint    completion;
        uint    number;
    }

    address public balanceReceiver;
    mapping (string => Season) public seasons;
    mapping (uint => Card) public cards;// this uint is the tokenId
    mapping (string => address[]) private winners;
    mapping (address => mapping(string => Card[])) public cardsByUserBySeason;
    uint8[7] private prizes = [20, 14, 12, 10, 8, 6, 5];
    string[] public seasonNames;
    uint256[] public seasonPrices;
    uint256 public prizesBalance;

    address public DAI_TOKEN;

    event BuyPack(address buyer, string seasonName);
    event Winner(address winner, string season, uint256 position);

    constructor() 
        ERC721("NOF Alpha", "NOFA") {}

    function init (string memory __baseUri, address _daiTokenAddress, address _balanceReceiver) external onlyOwner {
        baseUri = __baseUri;
        DAI_TOKEN = _daiTokenAddress;
        balanceReceiver = _balanceReceiver;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseUri;
    }

    function mint(address _to, string memory _uri, uint _class, uint _collection, 
                  string memory _season, uint carNumber) internal {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter += 1;
        cards[tokenId].tokenId = tokenId;
        cards[tokenId].class = _class;
        cards[tokenId].collection = _collection;
        cards[tokenId].season = _season;
        cards[tokenId].number = carNumber;
        cardsByUserBySeason[_to][_season].push(cards[tokenId]);
        _mint(_to, tokenId);
        _setTokenURI(tokenId, _uri);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

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

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function isApprovedForAll(address _owner, address _operator) public override(ERC721, IERC721) view returns (bool isOperator) {
      // if OpenSea's ERC721 Proxy Address is detected, auto-return true
      // for Polygon's Mumbai testnet, use 0xff7Ca10aF37178BdD056628eF42fD7F799fAc77c
        if (_operator == address(0x58807baD0B376efc12F5AD86aAc70E78ed67deaE)) {
            return true;
        }        
        // otherwise, use the default ERC721.isApprovedForAll()
        return ERC721.isApprovedForAll(_owner, _operator);
    }

     /**
     * This is used instead of msg.sender as transactions won't be sent by the original token owner, but by OpenSea.
     */
    function _msgSender() internal override view returns (address sender)
    {
        return ContextMixinV2.msgSender();
    }

    function buyPack(uint256 _amount, string memory _name) public {
        require(!seasons[_name].owners[msg.sender], "Ya tenes un pack wachin");
        seasons[_name].owners[msg.sender] = true;
        require(seasons[_name].price == _amount, "Send exact price for Pack");
        uint256 prizesAmount = _amount * 75 / 100;
        prizesBalance += prizesAmount;
        IERC20(DAI_TOKEN).transferFrom(msg.sender, address(this), prizesAmount);
        IERC20(DAI_TOKEN).transferFrom(msg.sender, balanceReceiver, _amount - prizesAmount);

        {
            uint index = uint(keccak256(abi.encodePacked(block.timestamp)))%seasons[_name].albums.length;
            uint cardNum = seasons[_name].albums[index];
            seasons[_name].albums[index] = seasons[_name].albums[seasons[_name].albums.length - 1];
            seasons[_name].albums.pop();
            mint(msg.sender, string(abi.encodePacked(bytes(seasons[_name].folder), bytes("/"), 
                 bytes(cardNum.toString()), bytes(".json"))), 0, cardNum/6-1, _name, cardNum);
        }

        for(uint i ; i < 5; i++) {
            uint index = uint(keccak256(abi.encodePacked(block.timestamp)))%seasons[_name].cards.length;
            uint cardNum = seasons[_name].cards[index];
            seasons[_name].cards[index] = seasons[_name].cards[seasons[_name].cards.length - 1];
            seasons[_name].cards.pop();
            mint(msg.sender,  string(abi.encodePacked(bytes(seasons[_name].folder), bytes("/"), 
                 bytes(cardNum.toString()), bytes(".json"))), 1, cardNum/6, _name, cardNum);
        }

        emit BuyPack(msg.sender, _name);
    }

    function newSeason(string memory _name, uint _price, uint _amount, string memory _folder) public onlyOwner {
        require(_price >= 100000000000000, "pack value must be at least 0.0001 DAI");
        require(_amount % 6 == 0, "Amount must be multiple of 6");
        seasons[_name].price = _price;
        seasons[_name].folder = _folder;
        seasonNames.push(_name);
        seasonPrices.push(_price);
        
        for(uint i = 1; i <= _amount; i++) {
            if(i % 6 == 0) {
                seasons[_name].albums.push(i);
            } else {
                seasons[_name].cards.push(i);
            }
        }
    }

    function getSeasonData() public view returns(string[] memory, uint256[] memory) {
        return (seasonNames, seasonPrices);
    }

    // Devuelve un array con las cartas disponibles
    function getSeasonCards(string memory name) public view returns(uint[] memory) {
        return seasons[name].cards;
    }

    // Devuelve un arrary con los albums disponibles
    function getSeasonAlbums(string memory name) public view returns(uint[] memory) {
        return seasons[name].albums;
    }

    function getWinners(string calldata _seasonName) public view returns(address[] memory) {
        return winners[_seasonName];
    }

    function getCardsByUserBySeason(address _user, string calldata _seasonName) public view returns(Card[] memory) {
        return cardsByUserBySeason[_user][_seasonName];
    }

    function transferCardOwnership(address from, address to, uint256 tokenId) internal {
        string memory seasonName = cards[tokenId].season;
        for(uint8 i=0;i<cardsByUserBySeason[from][seasonName].length;i++){
            if(cardsByUserBySeason[from][seasonName][i].number == cards[tokenId].number){
                cardsByUserBySeason[from][seasonName][i] = 
                    cardsByUserBySeason[from][seasonName][cardsByUserBySeason[from][seasonName].length - 1];
                cardsByUserBySeason[from][seasonName].pop();
            }
        }
        cardsByUserBySeason[to][seasonName].push(cards[tokenId]);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public virtual override(ERC721, IERC721)  {
        string memory seasonName = cards[tokenId].season;
        require(getSeasonAlbums(seasonName).length == 0, "There are albums available in this season");
        super.safeTransferFrom(from, to, tokenId, data);
        if(cards[tokenId].class == 1){
            require(seasons[seasonName].owners[to], "Receiver is not playing this season");
        } else {
            require(cards[tokenId].completion == 5, "Only completed albums can be transferred");
        }
        transferCardOwnership(from, to, tokenId);
    }

    function transferFrom(address from, address to, uint256 tokenId) public virtual override(ERC721, IERC721)  {
        safeTransferFrom(from, to, tokenId);
    }

    function pasteCards(uint card, uint album) public {
        require(ownerOf(card) == msg.sender, "This is not your card");
        require(ownerOf(album) == msg.sender, "This is not your album");
        require(cards[album].class == 0, "card is not an album");

        string memory seasonName = cards[card].season;
        for(uint8 i=0;i<cardsByUserBySeason[msg.sender][seasonName].length;i++){
            if(cardsByUserBySeason[msg.sender][seasonName][i].number == cards[card].number){
                cardsByUserBySeason[msg.sender][seasonName][i] = 
                    cardsByUserBySeason[msg.sender][seasonName][cardsByUserBySeason[msg.sender][seasonName].length - 1];
                cardsByUserBySeason[msg.sender][seasonName].pop();
            }
        }

        _burn(card);
        cards[album].completion++;
        cardsByUserBySeason[msg.sender][cards[card].season][0].completion++;

        if(cards[album].completion == 5){
            string memory albumSeason = cards[album].season;
            if(winners[albumSeason].length < 7){
                winners[albumSeason].push(msg.sender);
                uint256 prize = seasons[albumSeason].price * prizes[winners[albumSeason].length - 1] / 10;
                require(prize <= prizesBalance, "Prize must be lower or equal than prizes balance");
                prizesBalance -= prize;
                IERC20(DAI_TOKEN).transfer(msg.sender, prize);
            }
            _setTokenURI(album, string(abi.encodePacked(bytes(seasons[albumSeason].folder), 
                         bytes("/"), bytes((cards[album].number).toString()), bytes("F.json"))));
            emit Winner(msg.sender, albumSeason, winners[albumSeason].length);
        }  
    }

    function setBalanceReceiver(address _newBalanceReceiver) public onlyOwner {
        balanceReceiver = _newBalanceReceiver;
    }

    function setBaseURI (string memory __baseURI) public onlyOwner {
        baseUri = __baseURI;
    }

}
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./ContextMixin.sol";

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract NOF_Alpha is ERC721, ERC721URIStorage, Ownable, ContextMixin {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    // NOF Alpha Custom Code --> 
    string public baseUri;

    struct Season {
        uint    price;
        uint[]  cards;
        uint[]  albums;
        mapping(address => bool) owners;
        string folder;
    }

    struct Card {
        uint  class;
        uint  collection;
        string  season;
        uint    completion;
        uint    number;
    }


    mapping (string => Season) public seasons;
    mapping (uint => Card) public cards;
    mapping (string => address[]) private winners;
    uint8[7] private prizes = [20, 14, 12, 10, 8, 6, 5];

    address public DAI_TOKEN; 

    // <-- NOF Alpha Custom Code

    event Winner(address winner, string season, uint256 position);

    constructor(string memory __baseUri, address _daiTokenAddress) ERC721("NOF Alpha V2", "NOFA") {
        baseUri = __baseUri;
        DAI_TOKEN = _daiTokenAddress;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseUri;
    }

    function mint(address to, string memory uri, uint _class, uint _collection, string memory _season, uint carNumber) internal {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        cards[tokenId].class = _class;
        cards[tokenId].collection = _collection;
        cards[tokenId].season = _season;
        cards[tokenId].number = carNumber;
        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        override(ERC721)
    {
        super._beforeTokenTransfer(from, to, tokenId);
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
        override(ERC721)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

        function isApprovedForAll(
        address _owner,
        address _operator
    ) public override(ERC721) view returns (bool isOperator) {
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
    function _msgSender()
        internal
        override
        view
        returns (address sender)
    {
        return ContextMixin.msgSender();
    }

    // NOF Alpha Custom Code --> 
    function buyPack(uint256 amount, string memory name) public {
        require(!seasons[name].owners[msg.sender], "Ya tenes un pack wachin");
        seasons[name].owners[msg.sender] = true;
        require(seasons[name].price == amount, "Send exact price for Pack");
        IERC20(DAI_TOKEN).transferFrom(msg.sender, address(this), amount);
        //transfer album
        {
            uint index = uint(keccak256(abi.encodePacked(block.timestamp)))%seasons[name].albums.length;
            uint cardNum = seasons[name].albums[index];
            seasons[name].albums[index] = seasons[name].albums[seasons[name].albums.length - 1];
            seasons[name].albums.pop();
            mint(msg.sender, string.concat(seasons[name].folder, "/", toString(cardNum)), 0, cardNum/6-1, name, cardNum);
        }
        //transfer figus
        for(uint i ; i < 5; i++) {
            uint index = uint(keccak256(abi.encodePacked(block.timestamp)))%seasons[name].cards.length;
            uint cardNum = seasons[name].cards[index];
            seasons[name].cards[index] = seasons[name].cards[seasons[name].cards.length - 1];
            seasons[name].cards.pop();
            mint(msg.sender,  string.concat(seasons[name].folder, "/", toString(cardNum)), 1, cardNum/6, name, cardNum);
        }
    }

    //Genera una nueva temporada con el nombre, precio de cartas y cantidad de cartas (debe ser multiplo de 6)
    function newSeason(string memory name, uint price, uint amount, string memory folder) public onlyOwner {
        require(price >= 100000000000000, "pack value must be at least 0.0001 DAI");
        seasons[name].price = price;
        seasons[name].folder = folder;
        
        for(uint i = 1; i <= amount; i++) {
            if(i % 6 == 0) {
                seasons[name].albums.push(i);
            } else {
                seasons[name].cards.push(i);
            }
        }
    }

    //Devuelve un array con las cartas disponibles
    function getSeasonCards(string memory name) public view returns(uint[] memory) {
        return seasons[name].cards;
    }

    //Devuelve un arrary con los albums disponibles
    function getSeasonAlbums(string memory name) public view returns(uint[] memory) {
        return seasons[name].albums;
    }

    function getWinners(string calldata _seasonName) public view returns(address[] memory) {
        return winners[_seasonName];
    }

    function pasteCards(uint card, uint album) public {
        require(ownerOf(card) == msg.sender, "This is not your card");
        require(ownerOf(album) == msg.sender, "This is not your album");
        require(cards[album].class == 0, "card is not an album");
        require(cards[card].collection == cards[album].collection, "cards is not from the same collection");

        _burn(card);
        cards[album].completion++;

        if(cards[album].completion == 5){
            if(winners[cards[album].season].length < 7){
                winners[cards[album].season].push(msg.sender);
                IERC20(DAI_TOKEN).transferFrom(address(this), msg.sender, seasons[cards[album].season].price * prizes[winners[cards[album].season].length - 1] / 10);
            }
            _setTokenURI(album, string.concat(seasons[cards[album].season].folder, "/", toString(cards[album].number), "F"));
            emit Winner(msg.sender, cards[album].season, winners[cards[album].season].length);
        }  
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

    function withdrawDAI(uint amount) public onlyOwner {
        IERC20(DAI_TOKEN).transferFrom(address(this), msg.sender, amount);
    }

    function setBaseURI (string memory __baseURI) public onlyOwner {
        baseUri = __baseURI;
    }
    // <-- NOF Alpha Custom Code
}
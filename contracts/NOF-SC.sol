import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./ContextMixin.sol";

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract NOF_Alpha is ERC721, ERC721URIStorage, Ownable, ContextMixin {

    // NOF Alpha Custom Code --> 
    string public baseUri = "https://gateway.pinata.cloud/ipfs/QmZuSMk8d8Xru6J1PKMz5Gt6Qq8qVQ1Ak8p661zdGmGbGx/";

    struct Season {
        uint    price;
        uint[]  cards;
        uint[]  albumns;
    }

    struct Card {
        uint  class;
        uint  collection;
        string  season;
        uint    completion;
    }

    uint public totalCardsCounter;

    mapping (string => Season) public seasons;
    mapping (uint => Card) public cards;

    address public constant DAI_TOKEN = address(0xd9145CCE52D386f254917e481eB44e9943F39138); 

    uint nextCard;
    // <-- NOF Alpha Custom Code

    constructor() ERC721("NOF Alpha", "NOFA") {}

    function mint(address to, string memory uri, uint _class, uint _collection, string memory _season, uint carNumber) internal {
        cards[carNumber].class = _class;
        cards[carNumber].collection = _collection;
        cards[carNumber].season = _season;
        _mint(to, carNumber);
        _setTokenURI(carNumber, uri);
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

        require(seasons[name].price == amount, "Send exact price for Pack");
        IERC20(DAI_TOKEN).transferFrom(msg.sender, address(this), amount);

        //transfer albumn
        {
            uint index = uint(keccak256(abi.encodePacked(block.timestamp)))%seasons[name].albumns.length;
            uint cardNum = seasons[name].albumns[index];
            seasons[name].albumns[index] = seasons[name].albumns[seasons[name].albumns.length - 1];
            seasons[name].albumns.pop();
            mint(msg.sender, string.concat(baseUri, toString(cardNum)), 0, cardNum/6-1, name, cardNum);
        }
        //transfer figus
        for(uint i ; i < 5; i++) {
            uint index = uint(keccak256(abi.encodePacked(block.timestamp)))%seasons[name].cards.length;
            uint cardNum = seasons[name].cards[index];
            seasons[name].cards[index] = seasons[name].cards[seasons[name].cards.length - 1];
            seasons[name].cards.pop();
            mint(msg.sender,  string.concat(baseUri, toString(cardNum)), 1, cardNum/6, name, cardNum);
        }
    }

    //Genera una nueva temporada con el nombre, precio de cartas y cantidad de cartas (debe ser multiplo de 6)
    function newSeason(string memory name, uint price, uint amount) public onlyOwner {
        seasons[name].price = price;
        
        for(uint i = 1; i <= amount; i++) {
            if(i % 6 == 0) {
                seasons[name].albumns.push(i+totalCardsCounter);
            } else {
                seasons[name].cards.push(i+totalCardsCounter);
            }
            
        }

        totalCardsCounter = totalCardsCounter + amount;
    }

    //Devuelve un array con las cartas disponibles
    function getSeasonCards(string memory name) public view returns(uint[] memory) {
        return seasons[name].cards;
    }

    //Devuelve un arrary con los albumns disponibles
    function getSeasonAlbums(string memory name) public view returns(uint[] memory) {
        return seasons[name].albumns;
    }

    function pasteCards(uint card, uint albumn) public {
        require(ownerOf(card) == msg.sender, "This is not your card");
        require(ownerOf(albumn) == msg.sender, "This is not your albumn");
        require(cards[card].collection == cards[albumn].collection, "cards is not from the same collection");

        _burn(card);
        cards[albumn].completion++;

        if( cards[albumn].completion == 5){
            _setTokenURI(albumn, string.concat(baseUri, toString(albumn), "F"));
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
    // <-- NOF Alpha Custom Code
}

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./ContextMixin.sol";

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract NOF_Alpha is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, ContextMixin {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    // NOF Alpha Custom Code --> 
    string public baseUri = "https://gateway.pinata.cloud/ipfs/QmZuSMk8d8Xru6J1PKMz5Gt6Qq8qVQ1Ak8p661zdGmGbGx/";

    struct Season {
        uint    price;
        uint[]  cards;
        uint[]  albumns;
    }

    struct Card {
        string  class;
        string  collection;
        string  season;
        uint    completion;
    }

    mapping (string => Season) public seasons;
    mapping (uint => Card) public cards;

    address public constant DAI_TOKEN = address(0xd9145CCE52D386f254917e481eB44e9943F39138); 

    uint nextCard;
    // <-- NOF Alpha Custom Code

    constructor() ERC721("NOF Alpha", "NOFA") {
        _tokenIdCounter.increment();
    }

    function mint(address to, string memory uri) internal {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        override(ERC721, ERC721Enumerable)
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
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

        function isApprovedForAll(
        address _owner,
        address _operator
    ) public override(ERC721, IERC721) view returns (bool isOperator) {
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
            mint(msg.sender, string.concat(baseUri, toString(cardNum)));
        }
        //transfer figus
        for(uint i ; i < 5; i++) {
            uint index = uint(keccak256(abi.encodePacked(block.timestamp)))%seasons[name].cards.length;
            uint cardNum = seasons[name].cards[index];
            seasons[name].cards[index] = seasons[name].cards[seasons[name].cards.length - 1];
            seasons[name].cards.pop();
            mint(msg.sender,  string.concat(baseUri, toString(cardNum)));
        }
    }

    //Genera una nueva temporada con el nombre, precio de cartas y cantidad de cartas (debe ser multiplo de 6)
    function newSeason(string memory name, uint price, uint amount) public onlyOwner {
        seasons[name].price = price;
        for(uint i = 1; i <= amount; i++) {
            if(i % 6 == 0) {
                seasons[name].albumns.push(i);
            } else {
                seasons[name].cards.push(i);
            }
            
        }
    }

    //Devuelve un array con las cartas disponibles
    function getSeasonCards(string memory name) public view returns(uint[] memory) {
        return seasons[name].cards;
    }

    //Devuelve un arrary con los albumns disponibles
    function getSeasonAlbums(string memory name) public view returns(uint[] memory) {
        return seasons[name].albumns;
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
    // <-- NOF Alpha Custom Code
}

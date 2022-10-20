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
    struct Season {
        uint    price;
        uint    beginning;
        uint    duration;
    }

    struct Card {
        string  class;
        string  collection;
        string  season;
        uint    number;
    }

    mapping (string => Season) public seasons;
    mapping (uint => Card) public cards;

    address public constant DAI_TOKEN = address(0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063); 
    // <-- NOF Alpha Custom Code

    constructor() ERC721("NOF Alpha", "NOFA") {}

    function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
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
        require(seasons[name].beginning + seasons[name].duration < block.timestamp, "Season has not started yet");
        require(seasons[name].price == amount, "Send exact price for Pack");
        IERC20(DAI_TOKEN).transferFrom(msg.sender, address(this), amount);
    }

    function newSeason(string memory name, uint beginning, uint duration, uint price) public onlyOwner {
        seasons[name].price = price;
        seasons[name].duration = duration;
        seasons[name].beginning = beginning;
    }
    // <-- NOF Alpha Custom Code
}

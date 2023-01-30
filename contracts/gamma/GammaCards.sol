// SPDX-License-Identifier: MIT

// - 5000 copias de cada carta (120 personajes únicos) = 600.000 cartas de personajes
// - se venden de a sobres a ciegas, trae 12 cartas y puede o no traer un album extra aleatoriamente
// - los albumes de 120 figuritas son de toda la colección (los 120 personajes)
// - los albumes de 60 figuritas son albumes de quema y no importa la figurita que pongan
// - la carta al pegarse en el album se quema
// - en total van a haber 3000 albumes de 120 figuritas, 5000 albumes de 60 figuritas, 6000 figuritas, 600000 cartas en total, 50000 sobres.
// - el album completo de 120 paga 15 dolares
// - el album completo de 60 paga 1 dolar
// - el sobre sale 1,20 dolares
// - pago total por albumes completos 49000
// - total profit bruto si se venden todos los sobres 60000
// - el ticket del album de un dolar da entrada para un jackpot que reparte 1000 dolares al final de la temporada
// - total profit neto si se venden todos los sobres y se completan todos los albumes 10000 menos gastos de gas
// - importante de la implementación que los albumes estén uniformemente repartidos en los sobres a lo largo del tiempo
// - fee de transacción del 2.5%

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract GammaCards is ERC721, ERC721URIStorage, ERC721Burnable, Ownable {
    using Counters for Counters.Counter;
    using ECDSA for bytes32;

    Counters.Counter private _tokenIdCounter;
    address public DAI_TOKEN;
    address public balanceReceiver;
    address public immutable signer;
    string public baseUri;
    mapping (uint256 => bool) public usedNonces;

    constructor(address _daiTokenAddress, string memory _baseUri, address _balanceReceiver, address _signer) ERC721("GammaCards", "NOF_GC") {
        DAI_TOKEN = _daiTokenAddress;
        balanceReceiver = _balanceReceiver;
        signer = _signer;
    }

    function retrieveCards(uint16[] memory classId, uint256[] memory cardNumbers, uint256 nonce, bytes calldata signature) external {
        require(!usedNonces[nonce], "Signature already used");
        usedNonces[nonce] = true;

        // Recreates the message present in the `signature`

        bytes32 message = keccak256(abi.encodePacked(msg.sender, classId, cardNumbers, nonce, address(this))).toEthSignedMessageHash();
        require(message.recover(signature) == signer, "Invalid signature");


        for(uint8 i=0;i<cardNumbers.length;i++){
            string memory uri = string(abi.encodePacked(bytes(baseUri), bytes("/"), bytes(toString(cardNumbers[i]))));
            safeMint(msg.sender, classId[i], uri);
        }
    }

    
    function safeMint(address to, uint16 classId, string memory uri) internal {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
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

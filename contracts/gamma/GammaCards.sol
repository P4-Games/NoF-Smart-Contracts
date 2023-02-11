// SPDX-License-Identifier: MIT

// - 5000 copias de cada carta (120 personajes únicos) = 600.000 cartas de personajes
// - se venden de a sobres a ciegas, trae 12 cartas y puede o no traer un album extra aleatoriamente
// - los albumes de 120 figuritas son de toda la colección (los 120 personajes) (#120)
// - los albumes de 60 figuritas son albumes de quema y no importa la figurita que pongan (#121)
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

// open pack: con firma se mintean las cartas y album/s
// paste cards en album de 120: burn
// paste cards en album de 60: burn
// entrega de premios con album lleno
// transfer cards

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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
    address public packsContract;
    address public balanceReceiver;
    address public immutable signer;
    string public baseUri;
    uint256 public mainAlbumPrize = 15000000000000000000; // 15 DAI por album principal completado
    uint256 public secondaryAlbumPrize = 1000000000000000000; // 1 DAI por album secundario completado
    mapping (uint256 nonce => bool used) public usedNonces;
    mapping (uint256 cardNumber => uint256 amount) public cardsInventory; // maximos: 119 => 4999
    mapping (uint256 albumNumber => uint256 amount) public albumsInventory; // definir maximos segun clase
    mapping (uint256 tokenId => Card) public cards;
    mapping (uint256 tokenId => Album) public albums;

    struct Card {
        uint256 tokenId;
        uint256 number;
        bool pasted;
        uint256 completion;
    }

    struct Album {
        uint256 tokenId;
        uint256 number;
        uint8 class; // 0 para 120 cartas, 1 para 60 cartas
        uint256 completion;
    }

    event PackOpened(address player, uint8[] packData, uint256 packNumber);
    event AlbumCompleted(address player, uint8 class);

    constructor(address _daiTokenAddress, address _packsContract, string memory _baseUri, address _balanceReceiver, address _signer) ERC721("GammaCards", "NOF_GC") {
        DAI_TOKEN = _daiTokenAddress;
        packsContract = _packsContract;
        baseUri = _baseUri;
        balanceReceiver = _balanceReceiver;
        signer = _signer;
    }

    function openPack(uint256 nonce, uint8[] memory packData, uint256 packNumber, bytes calldata signature) external {
        // require que el sobre no haya sido abierto
        require(!usedNonces[nonce], "Signature already used");
        usedNonces[nonce] = true;

        // Recreates the message present in the `signature`

        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, packData, packNumber, nonce, address(this))).toEthSignedMessageHash();
        require(messageHash.recover(signature) == signer, "Invalid signature");


        for(uint8 i=0;i<packData.length;i++){
            string memory uri = string(abi.encodePacked(bytes(baseUri), bytes("/"), bytes(toString(packData[i])))); // chequear la terminacion: .json o solo numero
            if(packData[i] < 120){
                require(cardsInventory[packData[i]] < 4999, "Cantidad de copias de la carta excedida");
                safeMint(msg.sender, uri, packData[i], false);
                cardsInventory[packData[i]]++;
            } else {
                safeMint(msg.sender, uri, packData[i], true);
                // albums inventory? para chequear que que no se pase de la cantidad de sobres: 3000 de 120, 5000 de 60
            }
        }

        emit PackOpened(msg.sender, packData, packNumber);
    }
    
    function safeMint(address _to, string memory _uri, uint256 _number, bool _isAlbum) internal {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        if(!_isAlbum){
            cards[tokenId].tokenId = tokenId;
            cards[tokenId].number = _number;
        } else {
            albums[tokenId].tokenId = tokenId;
            albums[tokenId].number = _number;
            if(_number == 120){
                albums[tokenId].class = 0;
            } else {
                albums[tokenId].class = 1;
            }
        }
        _safeMint(_to, tokenId);
        _setTokenURI(tokenId, _uri);
    }

    function pasteCard(uint256 cardTokenId, uint256 albumTokenId) public {
        require(ownerOf(cardTokenId) == msg.sender && ownerOf(albumTokenId) == msg.sender, "La carta o el album no te pertenecen");
        require(albums[albumTokenId].tokenId == albumTokenId, "Este ID no es un album"); // chequear que pasa si el tokenId es 0
        require(cards[cardTokenId].tokenId == cardTokenId, "Este ID no es una carta");
        albums[albumTokenId].completion++;
        if(albums[albumTokenId].class == 0){
            if(albums[albumTokenId].completion == 120){
                IERC20(DAI_TOKEN).transferFrom(packsContract, msg.sender, mainAlbumPrize);
                emit AlbumCompleted(msg.sender, albums[albumTokenId].class);
            }
        } else if(albums[albumTokenId].class == 1){
            if(albums[albumTokenId].completion == 60){
                IERC20(DAI_TOKEN).transferFrom(packsContract, msg.sender, secondaryAlbumPrize);
                emit AlbumCompleted(msg.sender, albums[albumTokenId].class);
            }
        }

        _burn(cardTokenId);
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

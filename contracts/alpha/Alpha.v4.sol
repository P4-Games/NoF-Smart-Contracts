// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC721, IERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ContextMixinV2} from "./ContextMixin.v2.sol";
import {LibStringUtils} from "../libs/LibStringUtils.sol";

error Alpha_AlreadyHaveAPack();
error Alpha_NotCorrectPriceForPack();
error Alpha_PriceTooLow();
error Alpha_AmountMustBeMultipleOf6();
error Alpha_StillAlbumsAvailable();
error Alpha_NotPlayingThisSeason();
error Alpha_AlbumNotCompleted();
error Alpha_NotYourCard();
error Alpha_NotYourAlbum();
error Alpha_CardIsNotAnAlbum();
error Alpha_NotEnoughPrizeBalance();
error Alpha_NotAuthorized();
error Alpha_AuthorizedStatusAlreadySet();
error Alpha_SeasonAlreadyExists();

contract NofAlphaV4 is ERC721, ERC721URIStorage, Ownable, ContextMixinV2 {
  using LibStringUtils for uint256;

  struct Season {
    uint price;
    uint[] cards;
    uint[] albums;
    mapping(address => bool) owners;
    address[] players;
    string folder;
  }

  struct Card {
    uint tokenId;
    uint class;
    uint collection;
    string season;
    uint completion;
    uint number;
  }

  address public balanceReceiver;
  address public DAI_TOKEN;
  mapping(string => Season) public seasons;
  mapping(uint => Card) public cards; // this uint is the tokenId
  mapping(string => address[]) private winners;
  mapping(address => mapping(string => Card[])) public cardsByUserBySeason;
  mapping(address => bool) public authorized;
  string public baseUri;
  string[] public seasonNames;
  uint256 public prizesBalance;
  uint256 private _tokenIdCounter;
  uint256[] public seasonPrices;
  uint8[7] private prizes = [20, 14, 12, 10, 8, 6, 5];

  event BuyPack(address indexed buyer, string indexed seasonName);
  event Winner(address indexed winner, string indexed season, uint256 indexed position);
  event Authorized(address indexed authorized, bool status);

  constructor() ERC721("NOF Alpha", "NOFA") {}

  function init(
    string memory __baseUri,
    address _daiTokenAddress,
    address _balanceReceiver
  ) external onlyOwner {
    baseUri = __baseUri;
    DAI_TOKEN = _daiTokenAddress;
    balanceReceiver = _balanceReceiver;
    authorized[msg.sender] = true;
  }

  function buyPack(uint256 _amount, string memory _name) public {
    if (seasons[_name].owners[msg.sender]) revert Alpha_AlreadyHaveAPack();
    if (_amount != seasons[_name].price) revert Alpha_NotCorrectPriceForPack();

    seasons[_name].owners[msg.sender] = true;
    seasons[_name].players.push(msg.sender);

    uint256 prizesAmount = (_amount * 75) / 100;
    prizesBalance += prizesAmount;
    IERC20(DAI_TOKEN).transferFrom(msg.sender, address(this), prizesAmount);
    IERC20(DAI_TOKEN).transferFrom(msg.sender, balanceReceiver, _amount - prizesAmount);

    {
      uint index = uint(keccak256(abi.encodePacked(block.timestamp))) %
        seasons[_name].albums.length;
      uint cardNum = seasons[_name].albums[index];
      seasons[_name].albums[index] = seasons[_name].albums[seasons[_name].albums.length - 1];
      seasons[_name].albums.pop();
      mint(
        msg.sender,
        string(
          abi.encodePacked(
            bytes(seasons[_name].folder),
            bytes("/"),
            bytes(cardNum.toString()),
            bytes(".json")
          )
        ),
        0,
        cardNum / 6 - 1,
        _name,
        cardNum
      );
    }

    for (uint i; i < 5; i++) {
      uint index = uint(keccak256(abi.encodePacked(block.timestamp))) % seasons[_name].cards.length;
      uint cardNum = seasons[_name].cards[index];
      seasons[_name].cards[index] = seasons[_name].cards[seasons[_name].cards.length - 1];
      seasons[_name].cards.pop();
      mint(
        msg.sender,
        string(
          abi.encodePacked(
            bytes(seasons[_name].folder),
            bytes("/"),
            bytes(cardNum.toString()),
            bytes(".json")
          )
        ),
        1,
        cardNum / 6,
        _name,
        cardNum
      );
    }

    emit BuyPack(msg.sender, _name);
  }

  function newSeason(string memory _name, uint _price, uint _amount, string memory _folder) public {
    if (seasons[_name].price != 0) revert Alpha_SeasonAlreadyExists();
    if (!authorized[msg.sender]) revert Alpha_NotAuthorized();
    if (_price < 10e13) revert Alpha_PriceTooLow();
    if (_amount % 6 != 0) revert Alpha_AmountMustBeMultipleOf6();

    seasons[_name].price = _price;
    seasons[_name].folder = _folder;
    seasonNames.push(_name);
    seasonPrices.push(_price);

    for (uint i = 1; i <= _amount; i++) {
      if (i % 6 == 0) {
        seasons[_name].albums.push(i);
      } else {
        seasons[_name].cards.push(i);
      }
    }
  }

  function safeTransferFrom(
    address _from,
    address _to,
    uint256 _tokenId,
    bytes memory _data
  ) public virtual override(ERC721, IERC721) {
    string memory seasonName = cards[_tokenId].season;
    if (getSeasonAlbums(seasonName).length != 0) revert Alpha_StillAlbumsAvailable();

    if (cards[_tokenId].class == 1) {
      if (!seasons[seasonName].owners[_to]) revert Alpha_NotPlayingThisSeason();
    } else {
      if (cards[_tokenId].completion != 5) revert Alpha_AlbumNotCompleted();
    }
    transferCardOwnership(_from, _to, _tokenId);
    super.safeTransferFrom(_from, _to, _tokenId, _data);
  }

  function transferFrom(
    address from,
    address to,
    uint256 tokenId
  ) public virtual override(ERC721, IERC721) {
    safeTransferFrom(from, to, tokenId);
  }

  function pasteCards(uint card, uint album) public {
    if (ownerOf(card) != msg.sender) revert Alpha_NotYourCard();
    if (ownerOf(album) != msg.sender) revert Alpha_NotYourAlbum();
    if (cards[album].class != 0) revert Alpha_CardIsNotAnAlbum();

    string memory seasonName = cards[card].season;
    for (uint8 i = 0; i < cardsByUserBySeason[msg.sender][seasonName].length; i++) {
      if (cardsByUserBySeason[msg.sender][seasonName][i].number == cards[card].number) {
        cardsByUserBySeason[msg.sender][seasonName][i] = cardsByUserBySeason[msg.sender][
          seasonName
        ][cardsByUserBySeason[msg.sender][seasonName].length - 1];
        cardsByUserBySeason[msg.sender][seasonName].pop();
      }
    }

    _burn(card);
    cards[album].completion++;
    cardsByUserBySeason[msg.sender][cards[card].season][0].completion++;

    if (cards[album].completion == 5) {
      string memory albumSeason = cards[album].season;
      if (winners[albumSeason].length < 7) {
        winners[albumSeason].push(msg.sender);
        uint256 prize = (seasons[albumSeason].price * prizes[winners[albumSeason].length - 1]) / 10;
        if (prize > prizesBalance) revert Alpha_NotEnoughPrizeBalance();
        prizesBalance -= prize;
        IERC20(DAI_TOKEN).transfer(msg.sender, prize);
      }
      _setTokenURI(
        album,
        string(
          abi.encodePacked(
            bytes(seasons[albumSeason].folder),
            bytes("/"),
            bytes((cards[album].number).toString()),
            bytes("F.json")
          )
        )
      );
      emit Winner(msg.sender, albumSeason, winners[albumSeason].length);
    }
  }

  function setAuthorized(address _authorizedAddress, bool _status) public onlyOwner {
    if (authorized[_authorizedAddress] == _status) revert Alpha_AuthorizedStatusAlreadySet();
    authorized[_authorizedAddress] = _status;
    emit Authorized(_authorizedAddress, _status);
  }

  function setBalanceReceiver(address _newBalanceReceiver) public onlyOwner {
    balanceReceiver = _newBalanceReceiver;
  }

  function setBaseURI(string memory __baseURI) public onlyOwner {
    baseUri = __baseURI;
  }

  /*************************/
  /** INTERNAL functions ***/
  /*************************/

  function mint(
    address _to,
    string memory _uri,
    uint _class,
    uint _collection,
    string memory _season,
    uint carNumber
  ) internal {
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

  function transferCardOwnership(address _from, address _to, uint256 _tokenId) internal {
    string memory seasonName = cards[_tokenId].season;
    for (uint8 i = 0; i < cardsByUserBySeason[_from][seasonName].length; i++) {
      if (cardsByUserBySeason[_from][seasonName][i].number == cards[_tokenId].number) {
        cardsByUserBySeason[_from][seasonName][i] = cardsByUserBySeason[_from][seasonName][
          cardsByUserBySeason[_from][seasonName].length - 1
        ];
        cardsByUserBySeason[_from][seasonName].pop();
      }
    }
    cardsByUserBySeason[_to][seasonName].push(cards[_tokenId]);
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId,
    uint256 batchSize
  ) internal override(ERC721) {
    super._beforeTokenTransfer(from, to, tokenId, batchSize);
  }

  function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
    super._burn(tokenId);
  }

  /*************************/
  /* VIEW & PURE functions */
  /*************************/

  function getSeasonData() public view returns (string[] memory, uint256[] memory) {
    return (seasonNames, seasonPrices);
  }

  function getSeasonCards(string memory _name) public view returns (uint[] memory) {
    return seasons[_name].cards;
  }

  function getSeasonAlbums(string memory _name) public view returns (uint[] memory) {
    return seasons[_name].albums;
  }

  function getSeasonPlayers(string memory _name) public view returns (address[] memory) {
    return seasons[_name].players;
  }

  function getWinners(string calldata _seasonName) public view returns (address[] memory) {
    return winners[_seasonName];
  }

  function getCardsByUserBySeason(
    address _user,
    string calldata _seasonName
  ) public view returns (Card[] memory) {
    return cardsByUserBySeason[_user][_seasonName];
  }

  function getAuthorized(address _authorizedAddress) public view returns (bool) {
    return authorized[_authorizedAddress];
  }

  function _baseURI() internal view override returns (string memory) {
    return baseUri;
  }

  function tokenURI(
    uint256 tokenId
  ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
    return super.tokenURI(tokenId);
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view override(ERC721, ERC721URIStorage) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  function isApprovedForAll(
    address _owner,
    address _operator
  ) public view override(ERC721, IERC721) returns (bool isOperator) {
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
  function _msgSender() internal view override returns (address sender) {
    return ContextMixinV2.msgSender();
  }
}

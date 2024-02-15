// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {LibControlMgmt} from "./libs/LibControlMgmt.sol";
import {console} from "hardhat/console.sol";

interface IGammaCardsContract {
  function setPrizesBalance(uint256 amount) external;

  function changePackPrice(uint256 amount) external;
}

interface IgammaTicketsContract {
  function getLotteryWinner()
    external
    returns (uint256 timestamp, bytes32 ticketId, uint256 ticketCounter, address user);

  function deleteAllTickets() external;
}

contract NofGammaPacksV3 is Ownable {
  using LibControlMgmt for LibControlMgmt.Data;

  error NotGammaCardsContract();
  error OwnlyOwners();
  error InvalidAddress();
  error NumberOfPacksAreZero();
  error InsufficientPacksAvailable();
  error TransferPrizeError();
  error InsufficientAllowance();
  error InsufficientBalance();
  error NotYourPack();
  error ContractAddressNotSet();

  IGammaCardsContract public gammaCardsContract;
  IgammaTicketsContract public gammaTicketsContract;

  LibControlMgmt.Data private ownersData;

  address public DAI_TOKEN;
  uint256 public constant totalSupply = 50000;
  uint256 public packPrice = 12e17; // 1.2 DAI
  address public balanceReceiver;
  uint256 private packsCounter = 0;
  bool transferDai = true;

  mapping(uint256 tokenId => address owner) public packs;
  mapping(address owner => uint256[] tokenIds) public packsByUser;

  event NewGammaCardsContract(address newCardsContract);
  event NewGammaTicketsContract(address newGammaTicketContract);
  event NewBalanceReceiver(address balanceReceiver);
  event PackPurchased(address buyer, uint256 tokenId);
  event PacksPurchased(address buyer, uint256[] tokenIds);
  event PackTransfered(address from, address to, uint256 tokenId);
  event PacksTransfered(address from, address to, uint256[] tokenId);
  event PackOpened(address user, uint256 tokenId);
  event NewPrice(uint256 newPrice);

  modifier onlyGammaCardsContract() {
    if (msg.sender != address(gammaCardsContract)) revert NotGammaCardsContract();
    _;
  }

  modifier onlyOwners() {
    if (!ownersData.owners[msg.sender]) revert OwnlyOwners();
    _;
  }

  function init(
    address _daiTokenAddress,
    address _balanceReceiver,
    address _gammaCardsContract,
    address _gammaTicketsContract
  ) external onlyOwner {
    if (
      _balanceReceiver == address(0) ||
      _gammaCardsContract == address(0) ||
      _gammaTicketsContract == address(0)
    ) revert InvalidAddress();

    DAI_TOKEN = _daiTokenAddress;
    balanceReceiver = _balanceReceiver;
    gammaCardsContract = IGammaCardsContract(_gammaCardsContract);
    gammaTicketsContract = IgammaTicketsContract(_gammaTicketsContract);

    ownersData.owners[msg.sender] = true;
  }

  function addOwner(address _newOwner) external onlyOwners {
    ownersData.addOwner(_newOwner);
  }

  function removeOwner(address _ownerToRemove) external onlyOwners {
    ownersData.removeOwner(_ownerToRemove);
  }

  function changeBalanceReceiver(address _newBalanceReceiver) external onlyOwners {
    if (_newBalanceReceiver == address(0)) revert InvalidAddress();
    balanceReceiver = _newBalanceReceiver;
    emit NewBalanceReceiver(_newBalanceReceiver);
  }

  function changePrice(uint256 _newPrice) public onlyOwners {
    packPrice = _newPrice;
    gammaCardsContract.changePackPrice(_newPrice);
    emit NewPrice(_newPrice);
  }

  function changeTransferDaiFlag(bool _transferDai) public onlyOwners {
    transferDai = _transferDai;
  }

  function setGammaCardsContract(address _gammaCardsContract) public onlyOwners {
    if (_gammaCardsContract == address(0)) revert InvalidAddress();
    gammaCardsContract = IGammaCardsContract(_gammaCardsContract);
    emit NewGammaCardsContract(_gammaCardsContract);
  }

  function setGammaTicketsContract(address _gammaTicketsContract) public onlyOwners {
    if (_gammaTicketsContract == address(0)) revert InvalidAddress();
    gammaTicketsContract = IgammaTicketsContract(_gammaTicketsContract);
    emit NewGammaTicketsContract(_gammaTicketsContract);
  }

  function isOwner(address user) external view returns (bool) {
    return ownersData.owners[user];
  }

  function getPrizeAmountToBuyPacks(uint256 numberOfPacks) public view returns (uint256) {
    return (packPrice - (packPrice / 6)) * numberOfPacks;
  }

  function getPrizeNoFAccountAmountToBuyPacks(uint256 numberOfPacks) public view returns (uint256) {
    uint256 prizesAmount = getPrizeAmountToBuyPacks(numberOfPacks);
    return (packPrice * numberOfPacks) - prizesAmount;
  }

  function getAmountRequiredToBuyPacks(uint256 numberOfPacks) public view returns (uint256) {
    uint256 prizesAmount = getPrizeAmountToBuyPacks(numberOfPacks);
    uint256 NoFAccountAmount = getPrizeNoFAccountAmountToBuyPacks(numberOfPacks);
    return prizesAmount + NoFAccountAmount;
  }

  function getPacksByUser(address owner) public view returns (uint256[] memory) {
    return packsByUser[owner];
  }

  function getPackOwner(uint256 tokenId) public view returns (address) {
    return packs[tokenId];
  }

  function meetQuantityConditionsToBuy(uint256 numberOfPacks) public view returns (bool) {
    if (numberOfPacks == 0) revert NumberOfPacksAreZero();
    return (packsCounter + numberOfPacks) < totalSupply;
  }

  function buyPack() public returns (uint256) {
    return _buyPack(msg.sender);
  }

  function buyPacks(uint256 numberOfPacks) public returns (uint256[] memory) {
    return _buyPacks(msg.sender, numberOfPacks);
  }

  function buyPackByUser(address user) public onlyOwners returns (uint256) {
    return _buyPack(user);
  }

  function buyPacksByUser(
    address user,
    uint256 numberOfPacks
  ) public onlyOwners returns (uint256[] memory) {
    return _buyPacks(user, numberOfPacks);
  }

  function _buyPack(address user) private returns (uint256) {
    uint256[] memory tokenIds = _buyPacks(user, 1);
    return tokenIds[0];
  }

  function _buyPacks(address user, uint256 numberOfPacks) private returns (uint256[] memory) {
    if (user == address(0)) revert InvalidAddress();
    if (numberOfPacks == 0) revert NumberOfPacksAreZero();
    if ((packsCounter + numberOfPacks) >= totalSupply) revert InsufficientPacksAvailable();

    uint256[] memory tokenIds = new uint256[](numberOfPacks);

    for (uint256 i; i < numberOfPacks; i++) {
      uint256 tokenId = packsCounter;
      if (tokenId >= totalSupply) revert InsufficientPacksAvailable();
      packsCounter += 1;
      packs[tokenId] = user;
      packsByUser[user].push(tokenId);
      tokenIds[i] = tokenId;
    }

    bool transferPrizeResult = _transferPrizesAmounts(user, numberOfPacks);
    if (!transferPrizeResult) revert TransferPrizeError();

    if (numberOfPacks == 1) {
      emit PackPurchased(user, tokenIds[0]);
    } else {
      emit PacksPurchased(user, tokenIds);
    }

    return tokenIds;
  }

  function _transferPrizesAmounts(address user, uint256 numberOfPacks) private returns (bool) {
    uint256 prizesAmount = getPrizeAmountToBuyPacks(numberOfPacks);
    uint256 prizeNoFAccount = getPrizeNoFAccountAmountToBuyPacks(numberOfPacks);
    gammaCardsContract.setPrizesBalance(prizesAmount);

    if (transferDai) {
      IERC20 erc20Token = IERC20(DAI_TOKEN);
      uint256 userAllowance = erc20Token.allowance(user, address(this));

      if (userAllowance < (prizesAmount + prizeNoFAccount)) revert InsufficientAllowance();
      if (erc20Token.balanceOf(user) < prizesAmount || erc20Token.balanceOf(user) < prizeNoFAccount)
        revert InsufficientBalance();

      // send prize amount to the card contract
      bool successTx1 = erc20Token.transferFrom(user, address(gammaCardsContract), prizesAmount);
      if(!successTx1) revert TransferPrizeError();

      // send profit amount to NoF account
      bool successTx2 = erc20Token.transferFrom(user, balanceReceiver, prizeNoFAccount);
      if(!successTx2) revert TransferPrizeError();
    }
    return true;
  }

  function deleteTokenId(uint256 tokenId, address owner) internal {
    uint256 packsByUserLength = packsByUser[owner].length;
    for (uint256 i; i < packsByUserLength; i++) {
      if (packsByUser[owner][i] == tokenId) {
        packsByUser[owner][i] = packsByUser[owner][packsByUser[owner].length - 1];
        packsByUser[owner].pop();
        break;
      }
    }
  }

  function transferPack(address to, uint256 tokenId) public {
    _transferPack(to, tokenId);
  }

  function transferPacks(address to, uint256[] memory tokenIds) public {
    for (uint256 i = 0; i < tokenIds.length; i++) {
      uint256 tokenId = tokenIds[i];
      _transferPack(to, tokenId);
    }
    emit PacksTransfered(msg.sender, to, tokenIds);
  }

  function _transferPack(address to, uint256 tokenId) private {
    if(to == address(0)) revert InvalidAddress();
    if(packs[tokenId] != msg.sender) revert NotYourPack();
    packs[tokenId] = to;
    deleteTokenId(tokenId, msg.sender);
    packsByUser[to].push(tokenId);
    emit PackTransfered(msg.sender, to, tokenId);
  }

  function openPack(uint256 tokenId, address owner) public onlyGammaCardsContract {
    _openPack(tokenId, owner);
  }

  function openPacks(uint256[] memory tokenIds, address owner) public onlyGammaCardsContract {
    for (uint256 i = 0; i < tokenIds.length; i++) {
      uint256 tokenId = tokenIds[i];
      _openPack(tokenId, owner);
    }
  }

  function testOpenPack(uint256 tokenId, address owner) public onlyOwners {
    _openPack(tokenId, owner);
  }

  function testOpenPacks(uint256[] memory tokenIds, address owner) public onlyOwners {
    for (uint256 i = 0; i < tokenIds.length; i++) {
      uint256 tokenId = tokenIds[i];
      _openPack(tokenId, owner);
    }
  }

  function _openPack(uint256 tokenId, address owner) private {
    deleteTokenId(tokenId, owner);
    delete packs[tokenId];
    emit PackOpened(owner, tokenId);
  }

  function _lottery() private {
    if(address(gammaTicketsContract) == address(0)) revert ContractAddressNotSet();
    // (uint256 timestamp, bytes32 ticketId, uint256 ticketCounter, address user) = gammaTicketsContract.getLotteryWinner();

    // TODO: get %price from gamma cards contract

    // TODO: transfer price
    if (transferDai) {
      // IERC20 erc20Token = IERC20(DAI_TOKEN);
    }

    // TODO: burn tickets en gamma tickets contract
    gammaTicketsContract.deleteAllTickets();
  }
}

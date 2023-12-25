// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

interface IGammaCardsContract {
    function setPrizesBalance(uint256 amount) external;
    function changePackPrice(uint256 amount) external;
}

contract NofGammaPacksV3 is Ownable {
    IGammaCardsContract public gammaCardsContract;
    address public DAI_TOKEN;
    uint256 public constant totalSupply = 50000;
    uint256 public packPrice = 12e17; // 1.2 DAI
    address public balanceReceiver;
    uint256 private _tokenIdCounter;
    bool transferDai = true;

    mapping(uint256 tokenId => address owner) public packs;
    mapping(address owner => uint256[] tokenIds) public packsByUser;
    mapping(address => bool) public owners;
    
    event NewOwnerAdded(address owner);
    event OwnerRemoved(address owner);
    event NewBalanceReceiver(address balanceReceiver);
    event PackPurchased(address buyer, uint256 tokenId);
    event PacksPurchased(address buyer, uint256[] tokenIds);
    event PackTransfered(address from, address to, uint256 tokenId);
    event PacksTransfered(address from, address to, uint256[] tokenId);
    event PackOpened(address user, uint256 tokenId);
    event NewPrice(uint256 newPrice);
    event NewGammaCardsContract(address newCardsContract);
    
    constructor(address _daiTokenAddress, address _balanceReceiver) {
        DAI_TOKEN = _daiTokenAddress;
        balanceReceiver = _balanceReceiver;
        owners[msg.sender] = true;
        transferDai = true;
    }

    modifier onlyGammaCardsContract {
        require(msg.sender == address(gammaCardsContract), "Only gamma cards contract can call this function.");
        _;
    }

    modifier onlyOwners() {
        require(owners[msg.sender], "Only owners can call this function.");
        _;
    }

    function addOwner(address _newOwner) external onlyOwners {
        require(_newOwner != address(0), "Invalid address.");
        require(!owners[_newOwner], "Address is already an owner.");
        owners[_newOwner] = true;
        emit NewOwnerAdded(_newOwner);
    }

    function removeOwner(address _ownerToRemove) external onlyOwners {
        require(_ownerToRemove != address(0), "Invalid address.");
        require(_ownerToRemove != msg.sender, "You cannot remove yourself as an owner.");
        require(owners[_ownerToRemove], "Address is not an owner.");
        owners[_ownerToRemove] = false;
        emit OwnerRemoved(_ownerToRemove);
    }

    function changeBalanceReceiver(address _newBalanceReceiver) external onlyOwners {
        require(_newBalanceReceiver != address(0), "Invalid address.");
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
        require(_gammaCardsContract != address(0), "Invalid address.");
        gammaCardsContract = IGammaCardsContract(_gammaCardsContract);
        emit NewGammaCardsContract(_gammaCardsContract);
    }

    function getPrizeAmountToBuyPacks(uint256 numberOfPacks) public view returns(uint256) {
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

    function getPacksByUser(address owner) public view returns(uint256[] memory) {
        return packsByUser[owner];
    }

    function getPackOwner(uint256 tokenId) public view returns(address) {
        return packs[tokenId];
    }

    function meetQuantityConditionsToBuy(uint256 numberOfPacks) public view returns(bool) {
        require(numberOfPacks > 0, "Number of packs should be greater than zero.");
        return (packsCounter + numberOfPacks) < totalSupply;
    }

    function buyPack() public returns (uint256){
        return _buyPack(msg.sender);
    }

    function buyPacks(uint256 numberOfPacks) public returns(uint256[] memory){
        return _buyPacks(msg.sender, numberOfPacks);
    }

    function buyPackByUser(address user) public onlyOwners returns (uint256) {
        return _buyPack(user);
    }

    function buyPacksByUser(address user, uint256 numberOfPacks) public onlyOwners returns(uint256[] memory){
        return _buyPacks(user, numberOfPacks);
    }

    function _buyPack(address user) private returns (uint256) {
        uint256[] memory tokenIds = _buyPacks(user, 1);
        return tokenIds[0];
    }

    function _buyPacks(address user, uint256 numberOfPacks) private returns(uint256[] memory){
        require(address(gammaCardsContract) != address(0), "GammaCardsContract not set."); 
        require(numberOfPacks > 0, "Number of packs should be greater than zero.");
        require((packsCounter + numberOfPacks) < totalSupply, "The number of packs you want to buy exceeds those available.");

        uint256[] memory tokenIds = new uint256[](numberOfPacks);

        for(uint256 i; i < numberOfPacks; i++){
            uint256 tokenId = packsCounter;
            require(tokenId < totalSupply, "There are no more packs.");
            packsCounter += 1;
            packs[tokenId] = user;
            packsByUser[user].push(tokenId);
            tokenIds[i] = tokenId;
        }

        bool tranferPrizeResult = _tranferPrizesAmounts(user, numberOfPacks);
        require(tranferPrizeResult, "The transfers related to the purchase of packs could not be completed.");

        if (numberOfPacks == 1) {
            emit PackPurchased(msg.sender, tokenIds[0]);
        } else {
            emit PacksPurchased(msg.sender, tokenIds);
        }

        return tokenIds;
    }

    function _tranferPrizesAmounts(address user, uint256 numberOfPacks) private returns(bool) {
        uint256 prizesAmount = getPrizeAmountToBuyPacks(numberOfPacks);
        uint256 prizeNoFAccount = getPrizeNoFAccountAmountToBuyPacks(numberOfPacks);
        gammaCardsContract.setPrizesBalance(prizesAmount);

        if (transferDai) {
            IERC20 erc20Token = IERC20(DAI_TOKEN);
            uint256 userAllowance = erc20Token.allowance(user, address(this));

            require(userAllowance >= (prizesAmount + prizeNoFAccount), 
                "Insufficient allowance to transfer prizes amount and NOF Account amount.");
            require(erc20Token.balanceOf(user) >= prizesAmount, "Insufficient balance to transfer prizes amount.");
            require(erc20Token.balanceOf(user) >= prizeNoFAccount, "Insufficient balance to transfer profit amount.");

            // send prize amount to the card contract
            bool successTx1 = erc20Token.transferFrom(user, address(gammaCardsContract), prizesAmount);
            require(successTx1, "Error sending prize amount to gammaCardsContract.");
        
            // send profit amount to NoF account
            bool successTx2 = erc20Token.transferFrom(user, balanceReceiver, prizeNoFAccount);
            require(successTx2, "Error sending profit amount to NoF account.");
        }
        return true;
    }

    function deleteTokenId(uint256 tokenId, address owner) internal {
        uint256 packsByUserLength = packsByUser[owner].length;
        for(uint256 i; i<packsByUserLength; i++){
            if(packsByUser[owner][i] == tokenId) {
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
        require(to != address(0), "Invalid address.");
        require(packs[tokenId] == msg.sender, "THis pack is not yours.");
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
}
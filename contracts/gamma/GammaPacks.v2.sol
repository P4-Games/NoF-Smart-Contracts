// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

interface IGammaCardsContract {
    function receivePrizesBalance(uint256 amount) external;
    function changePackPrice(uint256 amount) external;
}

contract NofGammaPacksV2 is Ownable {
    using Counters for Counters.Counter;

    IGammaCardsContract public gammaCardsContract;
    address public DAI_TOKEN;
    uint256 public constant totalSupply = 50000;
    uint256 public packPrice = 12e17; // 1.2 DAI
    address public balanceReceiver;
    Counters.Counter private _tokenIdCounter;

    mapping(uint256 tokenId => address owner) public packs;
    mapping(address owner => uint256[] tokenIds) public packsByUser;
    mapping(address => bool) public owners;
    
    event PackPurchase(address buyer, uint256 tokenId);
    event PacksPurchase(address buyer, uint256[] tokenIds);
    event NewPrice(uint256 newPrice);
    event PackTransfer(address from, address to, uint256 tokenId);
    event NewGammaCardsContract(address newCardsContract);
    
    constructor(address _daiTokenAddress, address _balanceReceiver) {
        DAI_TOKEN = _daiTokenAddress;
        balanceReceiver = _balanceReceiver;
        owners[msg.sender] = true;
    }

    modifier onlyOwners() {
        require(owners[msg.sender], "Only owners can call this function.");
        _;
    }

    function addOwner(address _newOwner) external onlyOwners {
        require(_newOwner != address(0), "Invalid address.");
        require(!owners[_newOwner], "Address is already an owner.");
        owners[_newOwner] = true;
    }

    function removeOwner(address _ownerToRemove) external onlyOwners {
        require(_ownerToRemove != address(0), "Invalid address.");
        require(_ownerToRemove != msg.sender, "You cannot remove yourself as an owner.");
        require(owners[_ownerToRemove], "Address is not an owner.");
        owners[_ownerToRemove] = false;
    }

    function changeBalanceReceiver(address _newBalanceReceiver) external onlyOwners {
        require(_newBalanceReceiver != address(0), "Invalid address.");
        balanceReceiver = _newBalanceReceiver;
    }

    function buyPack() public returns (uint256){
        return _buyPack (msg.sender);
    }

    function _buyPack(address user) public onlyOwners returns (uint256) {
        require(address(gammaCardsContract) != address(0), "GammaCardsContract not set."); 
    
        uint256 tokenId = _tokenIdCounter.current();

        require(tokenId < totalSupply, "There are no more packs.");
        _tokenIdCounter.increment();
        
        packs[tokenId] = user;
        packsByUser[user].push(tokenId);
        
        uint256 prizesAmount = packPrice - packPrice / 6;
        gammaCardsContract.receivePrizesBalance(prizesAmount);

        // send prize amount to the card contract
        IERC20(DAI_TOKEN).transferFrom(user, address(gammaCardsContract), prizesAmount); 
        
        // send profit amount to NoF account
        IERC20(DAI_TOKEN).transferFrom(user, balanceReceiver, packPrice - prizesAmount); 

        emit PackPurchase(user, tokenId);
        return tokenId;
    }

    function buyPacks(uint256 numberOfPacks) public returns(uint256[] memory){
        require(address(gammaCardsContract) != address(0), "GammaCardsContract not set."); 
        uint256 prizesAmount = (packPrice - packPrice / 6) * numberOfPacks;
        uint256[] memory tokenIds = new uint256[](numberOfPacks);

        for(uint256 i;i < numberOfPacks;i++){
            uint256 tokenId = _tokenIdCounter.current();
            require(tokenId < totalSupply, "There are no more packs.");
            _tokenIdCounter.increment();
            
            packs[tokenId] = msg.sender;
            packsByUser[msg.sender].push(tokenId);
            tokenIds[i] = tokenId;
        }

        gammaCardsContract.receivePrizesBalance(prizesAmount);
        // send prize amount to the card contract
        IERC20(DAI_TOKEN).transferFrom(msg.sender, address(gammaCardsContract), prizesAmount); 
        
        // send profit amount to NoF account
        IERC20(DAI_TOKEN).transferFrom(msg.sender, balanceReceiver, packPrice * numberOfPacks - prizesAmount); 

        emit PacksPurchase(msg.sender, tokenIds);
        return tokenIds;
    }

    function deleteTokenId(uint256 tokenId, address owner) internal {
        uint256 packsByUserLength = packsByUser[owner].length;
        for(uint256 i;i<packsByUserLength;i++){
            if(packsByUser[owner][i] == tokenId) {
                packsByUser[owner][i] = packsByUser[owner][packsByUser[owner].length - 1];
                packsByUser[owner].pop();
                break;
            }
        }
    }

    function transferPack(address to, uint256 tokenId) public {
        require(packs[tokenId] == msg.sender, "THis pack is not yours.");
        require(to != address(0), "Invalid address.");
        packs[tokenId] = to;
        deleteTokenId(tokenId, msg.sender);
        packsByUser[to].push(tokenId);

        emit PackTransfer(msg.sender, to, tokenId);
    }

    function openPack(uint256 tokenId, address owner) public {
        require(msg.sender == address(gammaCardsContract), "It is not a card contract.");
        deleteTokenId(tokenId, owner);
        delete packs[tokenId];
    }

    function testOpenPack(uint256 tokenId, address owner) public onlyOwners {
        deleteTokenId(tokenId, owner);
        delete packs[tokenId];
    }

    function changePrice(uint256 _newPrice) public onlyOwners {
        packPrice = _newPrice;
        gammaCardsContract.changePackPrice(_newPrice);
        emit NewPrice(_newPrice);
    }

    function setGammaCardsContract(address _gammaCardsContract) public onlyOwners {
        require(_gammaCardsContract != address(0), "Invalid address.");
        gammaCardsContract = IGammaCardsContract(_gammaCardsContract);
        emit NewGammaCardsContract(_gammaCardsContract);
    }

    function getPacksByUser(address owner) public view returns(uint256[] memory) {
        return packsByUser[owner];
    }

    function getPackOwner(uint256 tokenId) public view returns(address) {
        return packs[tokenId];
    }
}
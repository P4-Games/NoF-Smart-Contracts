// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

contract GammaPacksTest {
    function openPack(uint256 packNumber, uint8[] memory packData, bytes calldata signature) external {
        _openPack(msg.sender, packNumber, packData, signature);
    }

    function _openPack(address user, uint256 packNumber, uint8[] memory packData, bytes calldata signature) private {
        require(gammaPacksContract.getPackOwner(packNumber) == user, "This pack is not yours.");
        require(packData.length < 15, "Card limit exceeded"); 
        
        if (requireOpenPackSignerValidation) {
            // Recreates the message present in the `signature`
            address signer = LibPackVerifier.verifyPackSigner(msg.sender, packNumber, packData, signature);
            require(signersData.signers[signer], "Invalid signature.");
        }

        gammaPacksContract.openPack(packNumber, user);
        prizesBalance += packPrice - packPrice / 6;

        for(uint8 i; i<packData.length; i++){
            require(packData[i] == 120 ? cardsInventory[120] < 3001 : cardsInventory[packData[i]] < 5001, 
                'invalid cardInventory position');
            cardsInventory[packData[i]]++; // 280k gas aprox.
            cardsByUser[user][packData[i]]++; // 310k gas aprox.
        }

        emit PackOpened(user, packData, packNumber);
    }

    function testOpenPack(address user, uint256 packNumber, uint8[] memory packData) external onlyOwners {
        gammaPacksContract.openPack(packNumber, user);
        prizesBalance += packPrice - packPrice / 6;

        for(uint8 i; i<packData.length; i++){
            require(packData[i] == 120 ? cardsInventory[120] < 3001 : cardsInventory[packData[i]] < 5001, 
                'invalid cardInventory position');
            cardsInventory[packData[i]]++; // 280k gas aprox.
            cardsByUser[user][packData[i]]++; // 310k gas aprox.
        }
    }

}
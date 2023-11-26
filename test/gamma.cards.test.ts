import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { deployNofFixture, getCardsByUserType } from './common'
import { v4 as uuidv4 } from 'uuid'

describe('NoF - Gamma Cards Tests', function () {

  async function getOnePackData(gammaPacks: any, gammaCards: any, address0: any): Promise<getCardsByUserType> {
    const tokenId = await gammaPacks.buyPack({ from: address0.address })
    const pack0Data = [25,62,94,71,41,77,100,90,3,58,113,28] // valid only with pack 0
    await gammaCards.changeRequireOpenPackSignerValidation(false)
    await gammaCards.testOpenPack(address0.address, tokenId.value, pack0Data)

    const cardData: getCardsByUserType = await gammaCards.getCardsByUser(address0.address)
    return cardData
  }

  it('Add Owner should revert when the address is invalid', async () => {
    const { gammaCards } = await loadFixture(deployNofFixture)
    await expect(gammaCards.addOwner(ethers.constants.AddressZero)).to.be.revertedWith("Invalid address.")
  });

  it('Add Owner should revert when adding an existing owner', async () => {
    const { gammaCards, address1 } = await loadFixture(deployNofFixture)
    await gammaCards.addOwner(address1.address)
    await expect(gammaCards.addOwner(address1.address)).to.be.revertedWith("Address is already an owner.")
  });

  it('Remove Owner should revert when the address is invalid', async () => {
    const { gammaCards } = await loadFixture(deployNofFixture)
    await expect(gammaCards.removeOwner(ethers.constants.AddressZero)).to.be.revertedWith("Invalid address.")
  });

  it('Remove Owner should revert when removing self as an owner', async () => {
    const { gammaCards, address0 } = await loadFixture(deployNofFixture)
    await expect(gammaCards.removeOwner(address0.address)).to.be.revertedWith("You cannot remove yourself as an owner.")
  });

  it('Remove Owner should revert when removing a non-existing owner', async () => {
    const { gammaCards } = await loadFixture(deployNofFixture)
    const nonExistingOwner = ethers.Wallet.createRandom().address
    await expect(gammaCards.removeOwner(nonExistingOwner)).to.be.revertedWith("Address is not an owner.")
  });

  it('Pack could opened by its owner (card-contract)', async () => {
    const { gammaPacks, gammaCards, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    expect(getCardsByUserResult.length).not.equal(0)
  })

  it('Add signer should revert when the address is invalid', async () => {
    const { gammaCards } = await loadFixture(deployNofFixture)
    await expect(gammaCards.addSigner(ethers.constants.AddressZero)).to.be.revertedWith("Invalid address.")
  });

  it('Add signer should revert when adding an existing signer', async () => {
    const { gammaCards, address0 } = await loadFixture(deployNofFixture)
    await expect(gammaCards.addSigner(address0.address)).to.be.revertedWith("Address is already an owner.")
  });

  it('Remove signer should revert when the address is invalid', async () => {
    const { gammaCards } = await loadFixture(deployNofFixture)
    await expect(gammaCards.removeSigner(ethers.constants.AddressZero)).to.be.revertedWith("Invalid address.")
  });

  it('Remove signer should revert when removing self as a signer', async () => {
    const { gammaCards, address0 } = await loadFixture(deployNofFixture)
    await expect(gammaCards.removeSigner(address0.address)).to.be.revertedWith("You cannot remove yourself as a signer.")
  });

  it('Remove signer should revert when removing a non-existing signer', async () => {
    const { gammaCards } = await loadFixture(deployNofFixture)
    const nonExistingSigner = ethers.Wallet.createRandom().address
    await expect(gammaCards.removeSigner(nonExistingSigner)).to.be.revertedWith("Address is not an signer.")
  });

  it('Should not allow to mint a card when has an offer and flag requireOfferValidationInMint is true', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    
    await gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][0], [1,2,24,4,5,6,7,8])
    
    let offers = await gammaOffers.getOffers();
    await expect(offers.length).to.not.be.equal(0);

    await gammaCards.changeRequireOfferValidationInMint(true);
    await expect (
      gammaCards.mintCard(getCardsByUserResult[0][0])
    ).to.be.revertedWith('This card has an offer, it cannot be minted.')
  });

  it('Should allow minting a card when has an offer and flag requireOfferValidationInMint is false', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    
    await gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][0], [1,2,24,4,5,6,7,8])
    
    let offers = await gammaOffers.getOffers();
    await expect(offers.length).to.not.be.equal(0);

    await gammaCards.changeRequireOfferValidationInMint(false);
    await gammaCards.mintCard(getCardsByUserResult[0][0]);
  });

  it('Should allow to mint a card when has an offer, quantity > 1 and flag requireOfferValidationInMint is true', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult1: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    // another pack with the same cards.
    await getOnePackData(gammaPacks, gammaCards, address0)

    const cardNumber = getCardsByUserResult1[0][0];
    let quantity = await gammaCards.getCardQuantityByUser(address0.address, cardNumber);
    await expect(quantity).to.be.equal(2);

    await gammaOffers.createOffer(uuidv4(), cardNumber, [1,2,24,4,5,6,7,8])
    let offers = await gammaOffers.getOffers();
    await expect(offers.length).to.not.be.equal(0);

    await gammaCards.changeRequireOfferValidationInMint(true);
    await gammaCards.mintCard(cardNumber);
    quantity = await gammaCards.getCardQuantityByUser(address0.address, cardNumber);
    await expect(quantity).to.be.equal(1);
  });

  it('Should not allow the transfer a card when has an offer and flag requireOfferValidationInTransfer is true', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0, address1 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    
    await gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][0], [1,2,24,4,5,6,7,8])
    
    let offers = await gammaOffers.getOffers();
    await expect(offers.length).to.not.be.equal(0);

    await gammaCards.changeRequireOfferValidationInTransfer(true);
    await expect (
      gammaCards.transferCard(address1.address, getCardsByUserResult[0][0])
    ).to.be.revertedWith('This card has an offer, it cannot be transfered.')
  });

  it('Should allow the transfer a card when has an offer and flag requireOfferValidationInTransfer is false', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0, address1 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    
    await gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][0], [1,2,24,4,5,6,7,8])
    let offers = await gammaOffers.getOffers();
    await expect(offers.length).to.not.be.equal(0);

    await gammaCards.changeRequireOfferValidationInTransfer(false);
    await gammaCards.transferCard(address1.address, getCardsByUserResult[0][0]);
  });

  it('Should allow the transfer a card when has an offer, quantity > 1 and flag requireOfferValidationInTransfer is true', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0, address1 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult1: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    // another pack with the same cards.
    await getOnePackData(gammaPacks, gammaCards, address0)

    const cardNumber = getCardsByUserResult1[0][0];
    let quantity = await gammaCards.getCardQuantityByUser(address0.address, cardNumber);
    await expect(quantity).to.be.equal(2);

    await gammaOffers.createOffer(uuidv4(), cardNumber, [1,2,24,4,5,6,7,8])
    let offers = await gammaOffers.getOffers();
    await expect(offers.length).to.not.be.equal(0);

    await gammaCards.changeRequireOfferValidationInTransfer(true);
    await gammaCards.transferCard(address1.address, cardNumber);
    quantity = await gammaCards.getCardQuantityByUser(address0.address, cardNumber);
    await expect(quantity).to.be.equal(1);
  });

  it('Should allow to transfer several cards', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0, address1 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult1: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
  
    const cardNumber1 = getCardsByUserResult1[0][0];
    const cardNumber2 = getCardsByUserResult1[0][1];
    const cardNumber3 = getCardsByUserResult1[0][2];
    const cards = [cardNumber1, cardNumber2, cardNumber3];

    await gammaCards.transferCards(address1.address, cards);
    const quantity1 = await gammaCards.getCardQuantityByUser(address0.address, cardNumber1);
    const quantity2 = await gammaCards.getCardQuantityByUser(address0.address, cardNumber2);
    const quantity3 = await gammaCards.getCardQuantityByUser(address0.address, cardNumber3);
    await expect(quantity1).to.be.equal(0);
    await expect(quantity2).to.be.equal(0);
    await expect(quantity3).to.be.equal(0);
  });

})

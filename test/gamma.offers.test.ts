import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { deployNofFixture, getOnePackData, getCardsByUserType } from './common'

describe('NoF - Gamma Offers Tests', function () {

  it('addOwner should revert when address is invalid', async () => {
    const { gammaOffers } = await loadFixture(deployNofFixture)
    await expect(gammaOffers.addOwner(ethers.constants.AddressZero)).to.be.revertedWith("Invalid address.")
  });

  it('addOwner should revert when adding an existing owner', async () => {
    const { gammaOffers, address1 } = await loadFixture(deployNofFixture)
    await gammaOffers.addOwner(address1.address)
    await expect(gammaOffers.addOwner(address1.address)).to.be.revertedWith("Address is already an owner.")
  });

  it('removeOwner should revert when address is invalid', async () => {
    const { gammaOffers } = await loadFixture(deployNofFixture)
    await expect(gammaOffers.removeOwner(ethers.constants.AddressZero)).to.be.revertedWith("Invalid address.")
  });

  it('removeOwner should revert when removing self as an owner', async () => {
    const { gammaOffers, address0 } = await loadFixture(deployNofFixture)
    await expect(gammaOffers.removeOwner(address0.address)).to.be.revertedWith("You cannot remove yourself as an owner.")
  });

  it('removeOwner should revert when removing a non-existing owner', async () => {
    const { gammaOffers } = await loadFixture(deployNofFixture)
    const nonExistingOwner = ethers.Wallet.createRandom().address
    await expect(gammaOffers.removeOwner(nonExistingOwner)).to.be.revertedWith("Address is not an owner.")
  });

  it('createOffer should revert when gammaCardsContract is not set', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)   
    await expect(
      gammaOffers.setGammaCardsContract(ethers.constants.AddressZero)
    ).to.be.revertedWith('Invalid address.')
  })
  
  it('createOffer should revert when cardNumber in wantedCardNumbers', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await expect(
      gammaOffers.createOffer(getCardsByUserResult[0][0], [getCardsByUserResult[0][0],2,24,4,5,6,7,8])
    ).to.be.revertedWith('The cardNumber cannot be in wantedCardNumbers.')
  })
  
  it('createOffer should revert when user does not have cardNumber', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await expect(
      gammaOffers.createOffer(140, [getCardsByUserResult[0][0],2,24,4,5,6,7,8])
    ).to.be.revertedWith('You does not have that card.')
  })

  it('createOffer should revert when user repeats the cardNumber', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)

    await gammaOffers.createOffer(getCardsByUserResult[0][0], [1,2,24,4,5,6,7,8])
    const offers = await gammaOffers.getOffers()
    await expect(offers.length).not.equal(0)
    await expect(offers[offers.length-1].owner).to.be.equal(address0.address)

    await expect(
      gammaOffers.createOffer(getCardsByUserResult[0][0], [1,2,24,4,5,6,7,8])
    ).to.be.revertedWith('An offer for this user and cardNumber already exists.')
  })
  
  it('User could create offer by its cardNumber', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    
    await gammaOffers.createOffer(getCardsByUserResult[0][0], [1,2,24,4,5,6,7,8])
    const offers = await gammaOffers.getOffers()
    await expect(offers.length).not.equal(0)
    await expect(offers[offers.length-1].owner).to.be.equal(address0.address)

    const cardsByUser = await gammaCards.getCardsByUser(address0.address)
    
    await expect(cardsByUser[2][0]).to.be.equals(true)

  })

  it('should retrieve an offer using getOfferByIndex', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await gammaOffers.createOffer(getCardsByUserResult[0][0], [1,2,24,4,5,6,7,8])
    const offers = await gammaOffers.getOfferByIndex(0)
    await expect(offers.length).not.equal(0)
    await expect(offers[0].offerId).not.equal(0)
  })

  it('should retrieve an offer using getOfferByOfferId', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await gammaOffers.createOffer(getCardsByUserResult[0][0], [1,2,24,4,5,6,7,8])
    const offers = await gammaOffers.getOfferByOfferId(1)
    await expect(offers.length).not.equal(0)
    await expect(offers[0].offerId).not.equal(0)
  })

  it('should retrieve an offer using getOffersByUser', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await gammaOffers.createOffer(getCardsByUserResult[0][0], [1,2,24,4,5,6,7,8])
    const offers = await gammaOffers.getOffersByUser(address0.address)
    await expect(offers.length).not.equal(0)
    await expect(offers[0].offerId).not.equal(0)
  })

  it('should retrieve an offer using getOffersByCardNumber', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await gammaOffers.createOffer(getCardsByUserResult[0][0], [1,2,24,4,5,6,7,8])
    const offers = await gammaOffers.getOffersByCardNumber(getCardsByUserResult[0][0])
    await expect(offers.length).not.equal(0)
    await expect(offers[0].offerId).not.equal(0)
    await expect(offers[0].cardNumber).to.be.equal(getCardsByUserResult[0][0])
  })

  it('should retrieve an offer using getOfferByUserAndCardNumber', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    const cardNumber = getCardsByUserResult[0][0]
    await gammaOffers.createOffer(cardNumber, [1,2,24,4,5,6,7,8])
    const offers = await gammaOffers.getOfferByUserAndCardNumber(address0.address, cardNumber)
    await expect(offers.offerId).not.equal(0)
    await expect(offers.cardNumber).to.be.equal(cardNumber)
    await expect(offers.owner).to.be.equal(address0.address)
  })

  it('should allow to delete an offer by user and cardNumber', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    const card1 = getCardsByUserResult[0][0];
    const card2 = getCardsByUserResult[0][1];
    const card3 = getCardsByUserResult[0][2];

    await expect(await gammaCards.hasCard(card1)).to.be.true;
    await expect(await gammaCards.hasCard(card2)).to.be.true;
    await expect(await gammaCards.hasCard(card3)).to.be.true;

    await gammaOffers.changeRemoveCardinInventoryWhenOffer(true);
    await gammaOffers.createOffer(getCardsByUserResult[0][0], [1,2,24,4,5,6,7,8])
    await gammaOffers.createOffer(getCardsByUserResult[0][1], [1,2,24,4,5,6,7,8])

    await expect(await gammaCards.hasCard(card1)).to.be.false;
    await expect(await gammaCards.hasCard(card2)).to.be.false;
    await expect(await gammaCards.hasCard(card3)).to.be.true;

    const initialOfferCount = await gammaOffers.getOffersCounter();
    const offers = await gammaOffers.getOffers();

    await expect(initialOfferCount).to.not.be.equal(0);
    await expect(offers.length).to.not.be.equal(0);

    await gammaOffers.removeOfferByUserAndCardNumber(address0.address, card1);

    await expect(await gammaCards.hasCard(card1)).to.be.true;
    await expect(await gammaCards.hasCard(card2)).to.be.false;
    await expect(await gammaCards.hasCard(card3)).to.be.true;

    const offersCounter = await gammaOffers.getOffersCounter();
    const offersByUserCounter = await gammaOffers.getOffersByUserCounter(address0.address);
    const offersByCardNumberCounter1 = await gammaOffers.getOffersByCardNumberCounter(card1);
    const offersByCardNumberCounter2 = await gammaOffers.getOffersByCardNumberCounter(card2);

    const offer = await gammaOffers.getOfferByUserAndCardNumber(address0.address, card1);

    await expect(offer.offerId).to.be.equal(0, 'offer should be deleted');
    await expect(offersCounter).to.be.equal(1, 'offers counter should be 0');
    await expect(offersByUserCounter).to.be.equal(1, 'offers by user counter should be 0');
    await expect(offersByCardNumberCounter1).to.be.equal(0, 'offers by card number 1 counter should be 0');
    await expect(offersByCardNumberCounter2).to.be.equal(1, 'offers by card number 2 counter should be 1');

  });

  it('should delete all offers', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    
    await gammaOffers.createOffer(getCardsByUserResult[0][0], [1,2,24,4,5,6,7,8])
    await gammaOffers.createOffer(getCardsByUserResult[0][1], [1,2,24,4,5,6,7,8])
    
    const initialOfferCount = await gammaOffers.getOffersCounter();
    let offers = await gammaOffers.getOffers();

    await expect(initialOfferCount).to.not.be.equal(0);
    await expect(offers.length).to.not.be.equal(0);

    await gammaOffers.deleteAllOffers();

    offers = await gammaOffers.getOffers();
    const offersCounter = await gammaOffers.getOffersCounter();
    const offersByUserCounter = await gammaOffers.getOffersByUserCounter(address0.address);
    const offersByCardNumberCounter1 = await gammaOffers.getOffersByCardNumberCounter(getCardsByUserResult[0][0]);
    const offersByCardNumberCounter2 = await gammaOffers.getOffersByCardNumberCounter(getCardsByUserResult[0][1]);
    await expect(offers.length).to.be.equal(0, 'All offers should be deleted');
    await expect(offersCounter).to.be.equal(0, 'offers counter should be 0');
    await expect(offersByUserCounter).to.be.equal(0, 'offers by user counter should be 0');
    await expect(offersByCardNumberCounter1).to.be.equal(0, 'offers by card number counter should be 0');
    await expect(offersByCardNumberCounter2).to.be.equal(0, 'offers by card number counter should be 0');
  });


})

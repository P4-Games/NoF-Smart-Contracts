import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { deployNofFixture, getOnePackData, getCardsByUserType } from './common'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'

function printOffers(offers: any[]) {
  offers.forEach((offer: any[]) => {
    console.log(`offer: ${offer[0]}, offerCard: ${offer[1]}, offerWallet: ${offer[3]}, wantedCards: ${offer[2].join (',')}`)
  })
}

function printCardsByUser(wallet: string, cards: any[]) {
  if (!cards || cards.length === 0) {
    console.log('no cards for wallet', wallet)
    return
  } 
  cards[0].forEach((card: number, index: number) => {
    console.log(`wallet: ${wallet}, card: ${card}, quantity: ${cards[1][index]}, offered: ${cards[2][index]}`)
  })
}

async function gammaDaiBySigner(signer: SignerWithAddress, testDAI: Contract, gammaPacks: Contract, gammaCards: Contract) {
  const packPrice = 10000000000000000000
  const TenPacksPrice = ethers.BigNumber.from((packPrice * 10).toString()) 

  // console.log('approving in testDai...')
  await testDAI.connect(signer).approve(gammaPacks.address, TenPacksPrice);

  // console.log('Verifing testDai balance...')
  const balance = await testDAI.balanceOf(signer.address)
  // console.log(`${signer.address} balance: `, balance)

  // console.log('Verifing testDai allowance...')
  const allowance = await testDAI.connect(signer).allowance(signer.address, gammaPacks.address)
  // console.log(`${signer.address} allowance to use with $ gamaPackAddress (${gammaPacks.address}): `, allowance)
}

async function gammaOfferBuyPack(signer: SignerWithAddress, gammaPacks: Contract, gammaCards: Contract, packData: number[]) {
  const packId1 = await gammaPacks.buyPackByUser(signer.address)
  await gammaCards.testOpenPack(signer.address, packId1.value, packData)
}

async function gammaCircuitPack(signer: SignerWithAddress, testDAI: Contract, gammaPacks: Contract, gammaCards: Contract) {

  const packPrice = 10000000000000000000
  const TenPacksPrice = ethers.BigNumber.from((packPrice * 10).toString()) 

  // console.log('buying Pack...')
  const tokenId = await gammaPacks.buyPackByUser(signer.address);
  await tokenId.wait()
  // console.log('Buyed Pack token Id', tokenId.value)

  // console.log('Verifing testDai balance...')
  const balance2 = await testDAI.balanceOf(signer.address)
  // console.log(`${signer.address} balance: `, balance2)

  // console.log('Verifing testDai allowance...')
  const allowance2 = await testDAI.allowance(signer.address, gammaPacks.address)
  // console.log(`${signer.address} allowance to use with $ gamaPackAddress (${gammaPacks.address}): `, allowance2)

  // console.log('Verifing pack owner...')
  const packOwner = await gammaPacks.connect(signer).getPackOwner(tokenId.value)
  // console.log(`Owner of TokenId ${tokenId.value}: ${packOwner}`)

  // console.log('buying 2 Packs...')
  const trxBuypacks = await gammaPacks.buyPacksByUser(signer.address, 2);
  await trxBuypacks.wait()
  // console.log('Buyed 2 Pack tokens Ids', trxBuypacks.value)

  /*
  console.log('Verifing user\'s packs...')
  const packs:[any] = await gammaPacks.getPacksByUser(signer.address)
  for (let i = 0; i < packs.length-1; i++) {
    console.log(`\tPack ${i+1} Id: ${packs[i]}`)
  }
  */
}

describe('NoF - Gamma Offers Tests', function () {

  it('Add owner should revert when the address is invalid', async () => {
    const { gammaOffers } = await loadFixture(deployNofFixture)
    await expect(gammaOffers.addOwner(ethers.constants.AddressZero)).to.be.revertedWith("Invalid address.")
  });

  it('Add owner should revert when adding an existing owner', async () => {
    const { gammaOffers, address1 } = await loadFixture(deployNofFixture)
    await gammaOffers.addOwner(address1.address)
    await expect(gammaOffers.addOwner(address1.address)).to.be.revertedWith("Address is already an owner.")
  });

  it('Remove owner should revert when address is invalid', async () => {
    const { gammaOffers } = await loadFixture(deployNofFixture)
    await expect(gammaOffers.removeOwner(ethers.constants.AddressZero)).to.be.revertedWith("Invalid address.")
  });

  it('Remove owner should revert when removing self as an owner', async () => {
    const { gammaOffers, address0 } = await loadFixture(deployNofFixture)
    await expect(gammaOffers.removeOwner(address0.address)).to.be.revertedWith("You cannot remove yourself as an owner.")
  });

  it('Remove owner should revert when removing a non-existing owner', async () => {
    const { gammaOffers } = await loadFixture(deployNofFixture)
    const nonExistingOwner = ethers.Wallet.createRandom().address
    await expect(gammaOffers.removeOwner(nonExistingOwner)).to.be.revertedWith("Address is not an owner.")
  });

  it('Create Offer should revert when gammaCardsContract is not set', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)   
    await expect(
      gammaOffers.setGammaCardsContract(ethers.constants.AddressZero)
    ).to.be.revertedWith('Invalid address.')
  })
  
  it('Create Offer should revert when cardNumber in wantedCardNumbers', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await expect(
      gammaOffers.createOffer(getCardsByUserResult[0][0], [getCardsByUserResult[0][0],2,24,4,5,6,7,8])
    ).to.be.revertedWith('The cardNumber cannot be in wantedCardNumbers.')
  })
  
  it('Create Offer should revert when user does not have cardNumber', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await expect(
      gammaOffers.createOffer(140, [getCardsByUserResult[0][0],2,24,4,5,6,7,8])
    ).to.be.revertedWith('You does not have that card.')
  })

  it('Create Offer should revert when user repeats the cardNumber', async () => {
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
  
  it('Should retrieve an offer using getOfferByIndex', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await gammaOffers.createOffer(getCardsByUserResult[0][0], [1,2,24,4,5,6,7,8])
    const offers = await gammaOffers.getOfferByIndex(0)
    await expect(offers.length).not.equal(0)
    await expect(offers[0].offerId).not.equal(0)
  })

  it('Should retrieve an offer using getOfferByOfferId', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await gammaOffers.createOffer(getCardsByUserResult[0][0], [1,2,24,4,5,6,7,8])
    const offers = await gammaOffers.getOfferByOfferId(1)
    await expect(offers.length).not.equal(0)
    await expect(offers[0].offerId).not.equal(0)
  })

  it('Should retrieve an offer using getOffersByUser', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await gammaOffers.createOffer(getCardsByUserResult[0][0], [1,2,24,4,5,6,7,8])
    const offers = await gammaOffers.getOffersByUser(address0.address)
    await expect(offers.length).not.equal(0)
    await expect(offers[0].offerId).not.equal(0)
  })

  it('Should retrieve an offer using getOffersByCardNumber', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await gammaOffers.createOffer(getCardsByUserResult[0][0], [1,2,24,4,5,6,7,8])
    const offers = await gammaOffers.getOffersByCardNumber(getCardsByUserResult[0][0])
    await expect(offers.length).not.equal(0)
    await expect(offers[0].offerId).not.equal(0)
    await expect(offers[0].cardNumber).to.be.equal(getCardsByUserResult[0][0])
  })

  it('Should retrieve an offer using getOfferByUserAndCardNumber', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    const cardNumber = getCardsByUserResult[0][0]
    await gammaOffers.createOffer(cardNumber, [1,2,24,4,5,6,7,8])
    const offers = await gammaOffers.getOfferByUserAndCardNumber(address0.address, cardNumber)
    await expect(offers.offerId).not.equal(0)
    await expect(offers.cardNumber).to.be.equal(cardNumber)
    await expect(offers.owner).to.be.equal(address0.address)
  })

    it('User could create offer by its cardNumber', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    
    await gammaOffers.createOffer(3, [1,2,24,4,5,6,7,8])
    const offers = await gammaOffers.getOffers()
    await expect(offers.length).not.equal(0)
    await expect(offers[offers.length-1].owner).to.be.equal(address0.address)

    const cardsByUser = await gammaCards.getCardsByUser(address0.address)
    await expect(cardsByUser[2][0]).to.be.equals(true)

    // console.log(printOffers(offers), printCardsByUser(address0.address, cardsByUser))
  })

  it('Should allow to delete an offer by user and cardNumber', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    const card1 = 3;
    const card2 = 25;
    const card3 = 28;

    await expect(await gammaCards.hasCard(address0.address, card1)).to.be.true;
    await expect(await gammaCards.hasCard(address0.address, card2)).to.be.true;
    await expect(await gammaCards.hasCard(address0.address, card3)).to.be.true;

    await gammaOffers.changeRemoveCardinInventoryWhenOffer(true);
    await gammaOffers.createOffer(card1, [1,2,24,4,5,6,7,8])
    await gammaOffers.createOffer(card2, [1,2,24,4,5,6,7,8])

    await expect (await gammaOffers.hasOffer(address0.address, card1)).to.be.equal(true);
    await expect (await gammaOffers.hasOffer(address0.address, card2)).to.be.equal(true);

    await expect(await gammaCards.hasCard(address0.address, card1)).to.be.false;
    await expect(await gammaCards.hasCard(address0.address, card2)).to.be.false;
    await expect(await gammaCards.hasCard(address0.address, card3)).to.be.true;

    const initialOfferCount = await gammaOffers.getOffersCounter();
    const offers = await gammaOffers.getOffers();

    await expect(initialOfferCount).to.not.be.equal(0);
    await expect(offers.length).to.not.be.equal(0);
    
    await gammaOffers.removeOfferByUserAndCardNumber(address0.address, card1);

    await expect(await gammaCards.hasCard(address0.address, card1)).to.be.true;
    await expect(await gammaCards.hasCard(address0.address, card2)).to.be.false;
    await expect(await gammaCards.hasCard(address0.address, card3)).to.be.true;

    await expect (await gammaOffers.hasOffer(address0.address, card1)).to.be.equal(false);

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

    // const finalOffers = await gammaOffers.getOffers()
    // const finalCardsByUser = await gammaCards.getCardsByUser(address0.address)
    // console.log(printOffers(finalOffers), printCardsByUser(address0.address, finalCardsByUser))

  });

  it('Should delete all multiple offers', async () => {
    const { 
      testDAI, gammaPacks, gammaCards, gammaOffers, 
      address0, address1, address2, address3 } = await loadFixture(deployNofFixture)

      await gammaDaiBySigner(address0, testDAI, gammaPacks, gammaCards)
      await gammaDaiBySigner(address1, testDAI, gammaPacks, gammaCards)
      
      await gammaCards.changeRequireOpenPackSignerValidation(false)

      await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [25,62,94,71,41,77,100,90,3,58,113,28])
      await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [0,1,2,4,5,6,7,8,9,10,11,12])

      await gammaOffers.connect(address0).createOffer(3, [24,4,5,6,7,8])
      await gammaOffers.connect(address0).createOffer(25, [24,4,0,119,7,1])
      await gammaOffers.connect(address0).createOffer(28, [110,32,2])
      await gammaOffers.connect(address0).createOffer(1, [117,118,119])

      await gammaOfferBuyPack(address1, gammaPacks, gammaCards, [90,91,92,93,94,95,96,97,98,99,100,101])
      await gammaOfferBuyPack(address1, gammaPacks, gammaCards, [102,103,104,105,106,107,108,109,110,111,112])

      await gammaOffers.connect(address1).createOffer(90, [0,1,2])
      await gammaOffers.connect(address1).createOffer(102, [32,2,4,5,6,7])

      // printOffers(await gammaOffers.getOffers())
      // printCardsByUser(address0.address, await gammaCards.getCardsByUser(address0.address))
      // printCardsByUser(address1.address, await gammaCards.getCardsByUser(address1.address))

      let offers = await gammaOffers.getOffers()
      let offersCount = offers.length
      let offersCountContract = await gammaOffers.getOffersCounter()

      await expect(offersCountContract).to.be.equal(offersCount)
      await expect(offers.length).to.not.be.equal(0);
  
      await gammaOffers.deleteAllOffers();
  
      offers = await gammaOffers.getOffers()
      offersCount = offers.length
      offersCountContract = await gammaOffers.getOffersCounter()
      await expect(offersCountContract).to.be.equal(offersCount)
      await expect(offers.length).to.be.equal(0);

      const offersUser0 = await gammaOffers.getOffersByUser(address0.address)
      const offersUser1 = await gammaOffers.getOffersByUser(address1.address)
      const offersUser0Card3 = await gammaOffers.getOfferByUserAndCardNumber(address0.address, 3)
      
      await expect(offersUser0).length.empty;
      await expect(offersUser1).length.empty;

      const offersUser0Card25 = await gammaOffers.getOfferByUserAndCardNumber(address0.address, 25)
      const offersUser0Card28 = await gammaOffers.getOfferByUserAndCardNumber(address0.address, 28)
      const offersUser0Card21 = await gammaOffers.getOfferByUserAndCardNumber(address0.address, 1)

      const offersUser1Card90 = await gammaOffers.getOfferByUserAndCardNumber(address1.address, 90)
      const offersUser1Card102 = await gammaOffers.getOfferByUserAndCardNumber(address1.address, 102)

      await expect(offersUser0Card3[0].value === undefined).to.be.true;
      await expect(offersUser0Card25[0].value === undefined).to.be.true;
      await expect(offersUser0Card28[0].value === undefined).to.be.true;
      await expect(offersUser0Card21[0].value === undefined).to.be.true;
      await expect(offersUser1Card90[0].value === undefined).to.be.true;
      await expect(offersUser1Card102[0].value === undefined).to.be.true;
  });

  it('Should transfer offered cards between users', async () => {
    const { 
      testDAI, gammaPacks, gammaCards, gammaOffers, 
      address0, address1, address2, address3 } = await loadFixture(deployNofFixture)

      await gammaDaiBySigner(address0, testDAI, gammaPacks, gammaCards)
      await gammaDaiBySigner(address1, testDAI, gammaPacks, gammaCards)
      
      await gammaCards.changeRequireOpenPackSignerValidation(false)

      await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [25,62,94,71,41,77,100,90,3,58,113,28])
      await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [0,1,2,4,5,6,7,8,9,10,11,12])

      await gammaOffers.connect(address0).createOffer(3, [24,4,5,6,7,8])

      await gammaOfferBuyPack(address1, gammaPacks, gammaCards, [90,91,92,93,94,95,96,97,98,99,100,101])
      await gammaOfferBuyPack(address1, gammaPacks, gammaCards, [102,103,104,105,106,107,108,109,110,111,112])

      let offers = await gammaOffers.getOffers()
      let offersCount = offers.length
      let offersCountContract = await gammaOffers.getOffersCounter()

      await expect(offersCountContract).to.be.equal(offersCount)
      await expect(offers.length).to.not.be.equal(0);
  
      await expect (await gammaCards.hasCard(address0.address, 3)).to.be.equal(true);
      await expect (await gammaOffers.hasOffer(address0.address, 3)).to.be.equal(true);
      await expect (await gammaCards.hasCard(address1.address, 90)).to.be.equal(true);

      await gammaOffers.confirmOfferExchange(address1.address, 90, address0.address, 3, 1);

      offers = await gammaOffers.getOffers()
      offersCount = offers.length
      const initialOfferCount = offersCountContract
      offersCountContract = await gammaOffers.getOffersCounter()

      await expect(offersCountContract).to.be.equal(offersCount)
      await expect(offersCount).to.be.lessThan(initialOfferCount)
  
      await expect (await gammaCards.hasCard(address0.address, 3)).to.be.equal(false, 'should not have card 3');
      await expect (await gammaCards.hasCard(address0.address, 90)).to.be.equal(true, 'shoud have card 90');
      await expect (await gammaOffers.hasOffer(address0.address, 3)).to.be.equal(false, 'should not have offers');
      await expect (await gammaCards.hasCard(address1.address, 90)).to.be.equal(false, 'should not have card 90');
      await expect (await gammaCards.hasCard(address1.address, 3)).to.be.equal(true, 'should have card 3');
  });

})

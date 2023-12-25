import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { deployNofGammaFixture, getOnePackData, getCardsByUserType, log, printOffers } from './common'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { v4 as uuidv4 } from 'uuid'

function printCardsByUser(wallet: string, cards: any[]) {
  if (!cards || cards.length === 0) {
    log('no cards for wallet', wallet)
    return
  }
  cards[0].forEach((card: number, index: number) => {
    log(`wallet: ${wallet}, card: ${card}, quantity: ${cards[1][index]}, offered: ${cards[2][index]}`)
  })
}

async function gammaDaiBySigner(
  signer: SignerWithAddress,
  testDAI: Contract,
  gammaPacks: Contract,
  gammaCards: Contract
) {
  const packPrice = 10000000000000000000
  const TenPacksPrice = ethers.BigNumber.from((packPrice * 10).toString())

  // log('approving in testDai...')
  await testDAI.connect(signer).approve(gammaPacks.address, TenPacksPrice)

  // log('Verifing testDai balance...')
  const balance = await testDAI.balanceOf(signer.address)
  // log(`${signer.address} balance: `, balance)

  // log('Verifing testDai allowance...')
  const allowance = await testDAI.connect(signer).allowance(signer.address, gammaPacks.address)
  // log(`${signer.address} allowance to use with $ gamaPackAddress (${gammaPacks.address}): `, allowance)
}

async function verifyOfferAfterCreate(gammaOffers: Contract, gammaCards: Contract, wallet: any, cardNumber: number) {
  const offers = await gammaOffers.getOffers()
  const offersCount = offers.length
  const offersCountContract = await gammaOffers.getOffersCounter()
  const offersByUserCounter = await gammaOffers.getOffersByUserCounter(wallet.address)
  const offersByCardNumberCounter = await gammaOffers.getOffersByCardNumberCounter(cardNumber)
  const offersByUser = await gammaOffers.getOffersByUser(wallet.address)
  const offersByCardNumber = await gammaOffers.getOffersByCardNumber(cardNumber)
  const offerByUserAndCardNumber = await gammaOffers.getOfferByUserAndCardNumber(wallet.address, cardNumber)

  await expect(offers.length).to.not.be.equal(0)
  await expect(isEmptyOfferArray([offerByUserAndCardNumber])).to.be.equal(false)
  await expect(offersCountContract).to.be.equal(offersCount)
  await expect(offersByUser.length).to.be.equal(offersByUserCounter)
  await expect(offersByCardNumber.length).to.be.equal(offersByCardNumberCounter)

  log('\nverifyOfferAfterCreate')
  printOffers(offers, 'getOffers')
  printOffers(offersByUser, 'getOffersByUser')
  printOffers(offersByCardNumber, 'getOffersByCardNumber')
  printOffers([offerByUserAndCardNumber], 'getOfferByUserAndCardNumber')
}

function isEmptyOfferArray(offers: any) {
  return offers.length === 0 || offers[0].offerId === ''
}

async function verifyOffersAfterRemove(
  gammaOffers: Contract,
  gammaCards: Contract,
  walletOffer: any,
  cardNumberOffer: number
) {
  const offers = await gammaOffers.getOffers()
  const offersCount = offers.length
  const offersCountContract = await gammaOffers.getOffersCounter()
  const offersByUserCounter = await gammaOffers.getOffersByUserCounter(walletOffer.address)
  const offersByCardNumberCounter = await gammaOffers.getOffersByCardNumberCounter(cardNumberOffer)
  const offersByUser = await gammaOffers.getOffersByUser(walletOffer.address)
  const offersByCardNumber = await gammaOffers.getOffersByCardNumber(cardNumberOffer)
  const offerByUserAndCardNumber = await gammaOffers.getOfferByUserAndCardNumber(walletOffer.address, cardNumberOffer)

  log('\nverifyOffersAfterRemove')
  printOffers(offers, 'getOffers')
  printOffers(offersByUser, 'getOffersByUser')
  printOffers(offersByCardNumber, 'getOffersByCardNumber')
  printOffers([offerByUserAndCardNumber], 'getOfferByUserAndCardNumber')

  expect(isEmptyOfferArray([offerByUserAndCardNumber])).to.be.equal(true)
  expect(offersCountContract).to.be.equal(offersCount)
  expect(offersByUser.length).to.be.equal(offersByUserCounter)
  expect(offersByCardNumber.length).to.be.equal(offersByCardNumberCounter)

  await expect(await gammaOffers.hasOffer(walletOffer.address, cardNumberOffer)).to.be.equal(false)
  await expect(await gammaCards.hasCard(walletOffer.address, cardNumberOffer)).to.be.equal(true)
}

async function verifyOffersAfterExchange(
  gammaOffers: Contract,
  gammaCards: Contract,
  walletFrom: any,
  cardNumberWanted: number,
  walletOffer: any,
  cardNumberOffer: number
) {
  const offers = await gammaOffers.getOffers()
  const offersCount = offers.length
  const offersCountContract = await gammaOffers.getOffersCounter()
  const offersByUserCounter = await gammaOffers.getOffersByUserCounter(walletOffer.address)
  const offersByCardNumberCounter = await gammaOffers.getOffersByCardNumberCounter(cardNumberOffer)
  const offersByUser = await gammaOffers.getOffersByUser(walletOffer.address)
  const offersByCardNumber = await gammaOffers.getOffersByCardNumber(cardNumberOffer)
  const offerByUserAndCardNumber = await gammaOffers.getOfferByUserAndCardNumber(walletOffer.address, cardNumberOffer)

  log('\nverifyOffersAfterExchange')
  printOffers(offers, 'getOffers')
  printOffers(offersByUser, 'getOffersByUser')
  printOffers(offersByCardNumber, 'getOffersByCardNumber')
  printOffers([offerByUserAndCardNumber], 'getOfferByUserAndCardNumber')

  expect(isEmptyOfferArray([offerByUserAndCardNumber])).to.be.equal(true)
  expect(offersCountContract).to.be.equal(offersCount)
  expect(offersByUser.length).to.be.equal(offersByUserCounter)
  expect(offersByCardNumber.length).to.be.equal(offersByCardNumberCounter)

  await expect(await gammaCards.hasCard(walletFrom.address, cardNumberOffer)).to.be.equal(true)
  await expect(await gammaCards.hasCard(walletFrom.address, cardNumberWanted)).to.be.equal(false)
  await expect(await gammaOffers.hasOffer(walletOffer.address, cardNumberOffer)).to.be.equal(false)
  await expect(await gammaCards.hasCard(walletOffer.address, cardNumberWanted)).to.be.equal(true)
  await expect(await gammaOffers.hasOffer(walletOffer.address, cardNumberOffer)).to.be.equal(false)
}

async function gammaOfferBuyPack(
  signer: SignerWithAddress,
  gammaPacks: Contract,
  gammaCards: Contract,
  packData: number[]
) {
  const packId1 = await gammaPacks.buyPackByUser(signer.address)
  await gammaCards.testOpenPack(signer.address, packId1.value, packData)
}

describe('NoF - Gamma Offers Tests', function () {
  it('Add owner should revert when the address is invalid', async () => {
    const { gammaOffers } = await loadFixture(deployNofGammaFixture)
    await expect(gammaOffers.addOwner(ethers.constants.AddressZero)).to.be.revertedWith('Invalid address.')
  })

  it('Add owner should revert when adding an existing owner', async () => {
    const { gammaOffers, address1 } = await loadFixture(deployNofGammaFixture)
    await gammaOffers.addOwner(address1.address)
    await expect(gammaOffers.addOwner(address1.address)).to.be.revertedWith('Address is already an owner.')
  })

  it('Remove owner should revert when address is invalid', async () => {
    const { gammaOffers } = await loadFixture(deployNofGammaFixture)
    await expect(gammaOffers.removeOwner(ethers.constants.AddressZero)).to.be.revertedWith('Invalid address.')
  })

  it('Remove owner should revert when removing self as an owner', async () => {
    const { gammaOffers, address0 } = await loadFixture(deployNofGammaFixture)
    await expect(gammaOffers.removeOwner(address0.address)).to.be.revertedWith(
      'You cannot remove yourself as an owner.'
    )
  })

  it('Remove owner should revert when removing a non-existing owner', async () => {
    const { gammaOffers } = await loadFixture(deployNofGammaFixture)
    const nonExistingOwner = ethers.Wallet.createRandom().address
    await expect(gammaOffers.removeOwner(nonExistingOwner)).to.be.revertedWith('Address is not an owner.')
  })

  it('Create Offer should revert when gammaCardsContract is not set', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await expect(gammaOffers.setGammaCardsContract(ethers.constants.AddressZero)).to.be.revertedWith('Invalid address.')
  })

  it('Create Offer should revert when cardNumber in wantedCardNumbers', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await expect(
      gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][0], [getCardsByUserResult[0][0], 2, 24, 4, 5, 6, 7, 8])
    ).to.be.revertedWith('The cardNumber cannot be in wantedCardNumbers.')
  })

  it('Create Offer should revert when user does not have cardNumber', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await expect(
      gammaOffers.createOffer(uuidv4(), 140, [getCardsByUserResult[0][0], 2, 24, 4, 5, 6, 7, 8])
    ).to.be.revertedWith('You does not have that card.')
  })

  it('Create Offer should revert when user repeats the cardNumber', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)

    await gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][0], [1, 2, 24, 4, 5, 6, 7, 8])
    const offers = await gammaOffers.getOffers()
    await expect(offers.length).not.equal(0)
    await expect(offers[offers.length - 1].owner).to.be.equal(address0.address)

    await expect(
      gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][0], [1, 2, 24, 4, 5, 6, 7, 8])
    ).to.be.revertedWith('An offer for this user and cardNumber already exists.')
  })

  it('Should retrieve an offer using getOfferByIndex', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][0], [1, 2, 24, 4, 5, 6, 7, 8])
    const offers = await gammaOffers.getOfferByIndex(0)
    await expect(offers.length).not.equal(0)
    await expect(offers[0].offerId).not.equal(0)
  })

  it('Should retrieve an offer using getOfferByOfferId', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][0], [1, 2, 24, 4, 5, 6, 7, 8])
    const offers = await gammaOffers.getOfferByOfferId(1)
    await expect(offers.length).not.equal(0)
    await expect(offers[0].offerId).not.equal(0)
  })

  it('Should retrieve an offer using getOffersByUser', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][0], [1, 2, 24, 4, 5, 6, 7, 8])
    const offers = await gammaOffers.getOffersByUser(address0.address)
    await expect(offers.length).not.equal(0)
    await expect(offers[0].offerId).not.equal(0)
  })

  it('Should retrieve an offer using getOffersByCardNumber', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][0], [1, 2, 24, 4, 5, 6, 7, 8])
    const offers = await gammaOffers.getOffersByCardNumber(getCardsByUserResult[0][0])
    await expect(offers.length).not.equal(0)
    await expect(offers[0].offerId).not.equal(0)
    await expect(offers[0].cardNumber).to.be.equal(getCardsByUserResult[0][0])
  })

  it('Should retrieve an offer using getOfferByUserAndCardNumber', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    const cardNumber = getCardsByUserResult[0][0]
    await gammaOffers.createOffer(uuidv4(), cardNumber, [1, 2, 24, 4, 5, 6, 7, 8])
    const offers = await gammaOffers.getOfferByUserAndCardNumber(address0.address, cardNumber)
    await expect(offers.offerId).not.equal(0)
    await expect(offers.cardNumber).to.be.equal(cardNumber)
    await expect(offers.owner).to.be.equal(address0.address)
  })

  it('User could create offer by its cardNumber', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)

    await gammaOffers.createOffer(uuidv4(), 3, [1, 2, 24, 4, 5, 6, 7, 8])
    const offers = await gammaOffers.getOffers()
    await expect(offers.length).not.equal(0)
    await expect(offers[offers.length - 1].owner).to.be.equal(address0.address)

    const cardsByUser = await gammaCards.getCardsByUser(address0.address)
    await expect(cardsByUser[2][0]).to.be.equals(true)
  })

  it('Should allow to delete an offer by user and cardNumber', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    const card1 = 3
    const card2 = 25
    const card3 = 28

    await expect(await gammaCards.hasCard(address0.address, card1)).to.be.true
    await expect(await gammaCards.hasCard(address0.address, card2)).to.be.true
    await expect(await gammaCards.hasCard(address0.address, card3)).to.be.true

    await gammaOffers.changeRemoveCardinInventoryWhenOffer(true)
    await gammaOffers.createOffer(uuidv4(), card1, [1, 2, 24, 4, 5, 6, 7, 8])
    await gammaOffers.createOffer(uuidv4(), card2, [1, 2, 24, 4, 5, 6, 7, 8])

    await expect(await gammaOffers.hasOffer(address0.address, card1)).to.be.equal(true)
    await expect(await gammaOffers.hasOffer(address0.address, card2)).to.be.equal(true)

    await expect(await gammaCards.hasCard(address0.address, card1)).to.be.false
    await expect(await gammaCards.hasCard(address0.address, card2)).to.be.false
    await expect(await gammaCards.hasCard(address0.address, card3)).to.be.true

    const initialOfferCount = await gammaOffers.getOffersCounter()
    const offers = await gammaOffers.getOffers()

    await expect(initialOfferCount).to.not.be.equal(0)
    await expect(offers.length).to.not.be.equal(0)

    await gammaOffers.removeOfferByUserAndCardNumber(address0.address, card1)

    await expect(await gammaCards.hasCard(address0.address, card1)).to.be.true
    await expect(await gammaCards.hasCard(address0.address, card2)).to.be.false
    await expect(await gammaCards.hasCard(address0.address, card3)).to.be.true

    await expect(await gammaOffers.hasOffer(address0.address, card1)).to.be.equal(false)

    const offersCounter = await gammaOffers.getOffersCounter()
    const offersByUserCounter = await gammaOffers.getOffersByUserCounter(address0.address)
    const offersByCardNumberCounter1 = await gammaOffers.getOffersByCardNumberCounter(card1)
    const offersByCardNumberCounter2 = await gammaOffers.getOffersByCardNumberCounter(card2)

    const offer = await gammaOffers.getOfferByUserAndCardNumber(address0.address, card1)

    await expect(offer.offerId).to.be.equal('', 'offer should be deleted')
    await expect(offersCounter).to.be.equal(1, 'offers counter should be 0')
    await expect(offersByUserCounter).to.be.equal(1, 'offers by user counter should be 0')
    await expect(offersByCardNumberCounter1).to.be.equal(0, 'offers by card number 1 counter should be 0')
    await expect(offersByCardNumberCounter2).to.be.equal(1, 'offers by card number 2 counter should be 1')

    const finalOffers = await gammaOffers.getOffers()
    const finalCardsByUser = await gammaCards.getCardsByUser(address0.address)
    log(printOffers(finalOffers, 'getOffers'), printCardsByUser(address0.address, finalCardsByUser))
  })

  it('Should delete multiple offers', async () => {
    const { testDAI, gammaPacks, gammaCards, gammaOffers, address0, address1 } =
      await loadFixture(deployNofGammaFixture)

    await gammaDaiBySigner(address0, testDAI, gammaPacks, gammaCards)
    await gammaDaiBySigner(address1, testDAI, gammaPacks, gammaCards)

    await gammaCards.changeRequireOpenPackSignerValidation(false)

    await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [25, 62, 94, 71, 41, 77, 100, 90, 3, 58, 113, 28])
    await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12])

    await gammaOffers.connect(address0).createOffer(uuidv4(), 3, [24, 4, 5, 6, 7, 8])
    await gammaOffers.connect(address0).createOffer(uuidv4(), 25, [24, 4, 0, 119, 7, 1])
    await gammaOffers.connect(address0).createOffer(uuidv4(), 28, [110, 32, 2])
    await gammaOffers.connect(address0).createOffer(uuidv4(), 1, [117, 118, 119])

    await gammaOfferBuyPack(address1, gammaPacks, gammaCards, [90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101])
    await gammaOfferBuyPack(address1, gammaPacks, gammaCards, [102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112])

    await gammaOffers.connect(address1).createOffer(uuidv4(), 90, [0, 1, 2])
    await gammaOffers.connect(address1).createOffer(uuidv4(), 102, [32, 2, 4, 5, 6, 7])

    printOffers(await gammaOffers.getOffers(), 'getOffers')
    printCardsByUser(address0.address, await gammaCards.getCardsByUser(address0.address))
    printCardsByUser(address1.address, await gammaCards.getCardsByUser(address1.address))

    let offers = await gammaOffers.getOffers()
    let offersCount = offers.length
    let offersCountContract = await gammaOffers.getOffersCounter()

    await expect(offersCountContract).to.be.equal(offersCount)
    await expect(offers.length).to.not.be.equal(0)

    await gammaOffers.deleteAllOffers()

    offers = await gammaOffers.getOffers()
    offersCount = offers.length
    offersCountContract = await gammaOffers.getOffersCounter()
    await expect(offersCountContract).to.be.equal(offersCount)
    await expect(offers.length).to.be.equal(0)

    const offersUser0 = await gammaOffers.getOffersByUser(address0.address)
    const offersUser1 = await gammaOffers.getOffersByUser(address1.address)
    const offersUser0Card3 = await gammaOffers.getOfferByUserAndCardNumber(address0.address, 3)

    await expect(offersUser0).length.empty
    await expect(offersUser1).length.empty

    const offersUser0Card25 = await gammaOffers.getOfferByUserAndCardNumber(address0.address, 25)
    const offersUser0Card28 = await gammaOffers.getOfferByUserAndCardNumber(address0.address, 28)
    const offersUser0Card21 = await gammaOffers.getOfferByUserAndCardNumber(address0.address, 1)

    const offersUser1Card90 = await gammaOffers.getOfferByUserAndCardNumber(address1.address, 90)
    const offersUser1Card102 = await gammaOffers.getOfferByUserAndCardNumber(address1.address, 102)

    await expect(offersUser0Card3[0].value === undefined).to.be.true
    await expect(offersUser0Card25[0].value === undefined).to.be.true
    await expect(offersUser0Card28[0].value === undefined).to.be.true
    await expect(offersUser0Card21[0].value === undefined).to.be.true
    await expect(offersUser1Card90[0].value === undefined).to.be.true
    await expect(offersUser1Card102[0].value === undefined).to.be.true
  })

  it('Should transfer offered cards between users with specific wanted card', async () => {
    const { testDAI, gammaPacks, gammaCards, gammaOffers, address0, address1, address2, address3 } =
      await loadFixture(deployNofGammaFixture)

    await gammaDaiBySigner(address0, testDAI, gammaPacks, gammaCards)
    await gammaDaiBySigner(address1, testDAI, gammaPacks, gammaCards)

    await gammaCards.changeRequireOpenPackSignerValidation(false)

    await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [25, 62, 94, 71, 41, 77, 100, 90, 3, 58, 113, 28])
    await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12])

    await gammaOffers.connect(address0).createOffer(uuidv4(), 3, [24, 4, 5, 6, 7, 90])

    await gammaOfferBuyPack(address1, gammaPacks, gammaCards, [90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101])
    await gammaOfferBuyPack(address1, gammaPacks, gammaCards, [102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112])

    let offers = await gammaOffers.getOffers()
    let offersCount = offers.length
    let offersCountContract = await gammaOffers.getOffersCounter()

    await expect(offersCountContract).to.be.equal(offersCount)
    await expect(offers.length).to.not.be.equal(0)

    await expect(await gammaCards.hasCard(address0.address, 3)).to.be.equal(true)
    await expect(await gammaOffers.hasOffer(address0.address, 3)).to.be.equal(true)
    await expect(await gammaCards.hasCard(address1.address, 90)).to.be.equal(true)

    await gammaOffers.confirmOfferExchange(address1.address, 90, address0.address, 3)

    offers = await gammaOffers.getOffers()
    offersCount = offers.length
    const initialOfferCount = offersCountContract
    offersCountContract = await gammaOffers.getOffersCounter()

    await expect(offersCountContract).to.be.equal(offersCount)
    await expect(offersCount).to.be.lessThan(initialOfferCount)

    await expect(await gammaCards.hasCard(address0.address, 3)).to.be.equal(false, 'should not have card 3')
    await expect(await gammaCards.hasCard(address0.address, 90)).to.be.equal(true, 'shoud have card 90')
    await expect(await gammaOffers.hasOffer(address0.address, 3)).to.be.equal(false, 'should not have offers')
    await expect(await gammaCards.hasCard(address1.address, 90)).to.be.equal(false, 'should not have card 90')
    await expect(await gammaCards.hasCard(address1.address, 3)).to.be.equal(true, 'should have card 3')
  })

  it('Should revert transfer offered cards between users with invalid specific wanted card', async () => {
    const { testDAI, gammaPacks, gammaCards, gammaOffers, address0, address1, address2, address3 } =
      await loadFixture(deployNofGammaFixture)

    await gammaDaiBySigner(address0, testDAI, gammaPacks, gammaCards)
    await gammaDaiBySigner(address1, testDAI, gammaPacks, gammaCards)

    await gammaCards.changeRequireOpenPackSignerValidation(false)

    await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [25, 62, 94, 71, 41, 77, 100, 90, 3, 58, 113, 28])
    await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12])

    await gammaOffers.connect(address0).createOffer(uuidv4(), 3, [24, 4, 5, 6, 7, 9])

    await gammaOfferBuyPack(address1, gammaPacks, gammaCards, [90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101])
    await gammaOfferBuyPack(address1, gammaPacks, gammaCards, [102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112])

    let offers = await gammaOffers.getOffers()
    let offersCount = offers.length
    let offersCountContract = await gammaOffers.getOffersCounter()

    await expect(offersCountContract).to.be.equal(offersCount)
    await expect(offers.length).to.not.be.equal(0)

    await expect(await gammaCards.hasCard(address0.address, 3)).to.be.equal(true)
    await expect(await gammaOffers.hasOffer(address0.address, 3)).to.be.equal(true)
    await expect(await gammaCards.hasCard(address1.address, 90)).to.be.equal(true)

    await expect(gammaOffers.confirmOfferExchange(address1.address, 90, address0.address, 3)).to.be.revertedWith(
      'The card is not in wantedCardNumbers.'
    )
  })

  it('Should transfer offered cards between users accepting any card the user not have', async () => {
    const { testDAI, gammaPacks, gammaCards, gammaOffers, address0, address1, address2, address3 } =
      await loadFixture(deployNofGammaFixture)

    await gammaDaiBySigner(address0, testDAI, gammaPacks, gammaCards)
    await gammaDaiBySigner(address1, testDAI, gammaPacks, gammaCards)

    await gammaCards.changeRequireOpenPackSignerValidation(false)

    await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [25, 62, 94, 71, 41, 77, 100, 90, 3, 58, 113, 28])
    await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    await gammaOffers.connect(address0).createOffer(uuidv4(), 3, [])

    await gammaOfferBuyPack(address1, gammaPacks, gammaCards, [90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101])
    await gammaOfferBuyPack(address1, gammaPacks, gammaCards, [102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112])

    let offers = await gammaOffers.getOffers()
    let offersCount = offers.length
    let offersCountContract = await gammaOffers.getOffersCounter()

    await expect(offersCountContract).to.be.equal(offersCount)
    await expect(offers.length).to.not.be.equal(0)

    await expect(await gammaCards.hasCard(address0.address, 3)).to.be.equal(true)
    await expect(await gammaCards.hasCard(address1.address, 101)).to.be.equal(true)
    await expect(await gammaOffers.hasOffer(address0.address, 3)).to.be.equal(true)
    await expect(await gammaCards.hasCard(address0.address, 101)).to.be.equal(false)
    await expect(await gammaCards.hasCard(address1.address, 3)).to.be.equal(false)

    await gammaOffers.confirmOfferExchange(address1.address, 101, address0.address, 3)

    offers = await gammaOffers.getOffers()
    offersCount = offers.length
    const initialOfferCount = offersCountContract
    offersCountContract = await gammaOffers.getOffersCounter()

    await expect(offersCountContract).to.be.equal(offersCount)
    await expect(offersCount).to.be.lessThan(initialOfferCount)

    await expect(await gammaCards.hasCard(address0.address, 3)).to.be.equal(false, 'should not have card 3')
    await expect(await gammaCards.hasCard(address0.address, 101)).to.be.equal(true, 'shoud have card 101')
    await expect(await gammaOffers.hasOffer(address0.address, 3)).to.be.equal(false, 'should not have offers')
    await expect(await gammaCards.hasCard(address1.address, 101)).to.be.equal(false, 'should not have card 101')
    await expect(await gammaCards.hasCard(address1.address, 3)).to.be.equal(true, 'should have card 3')
  })

  it('Should revert transfer offered cards between users accepting any card the user have', async () => {
    const { testDAI, gammaPacks, gammaCards, gammaOffers, address0, address1, address2, address3 } =
      await loadFixture(deployNofGammaFixture)

    await gammaDaiBySigner(address0, testDAI, gammaPacks, gammaCards)
    await gammaDaiBySigner(address1, testDAI, gammaPacks, gammaCards)

    await gammaCards.changeRequireOpenPackSignerValidation(false)

    await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [25, 62, 94, 71, 41, 77, 100, 90, 3, 58, 113, 28, 101])
    await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    await gammaOffers.connect(address0).createOffer(uuidv4(), 3, [])

    await gammaOfferBuyPack(address1, gammaPacks, gammaCards, [90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101])
    await gammaOfferBuyPack(address1, gammaPacks, gammaCards, [102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112])

    let offers = await gammaOffers.getOffers()
    let offersCount = offers.length
    let offersCountContract = await gammaOffers.getOffersCounter()

    await expect(offersCountContract).to.be.equal(offersCount)
    await expect(offers.length).to.not.be.equal(0)

    await expect(await gammaCards.hasCard(address0.address, 3)).to.be.equal(true)
    await expect(await gammaCards.hasCard(address1.address, 101)).to.be.equal(true)
    await expect(await gammaOffers.hasOffer(address0.address, 3)).to.be.equal(true)
    await expect(await gammaCards.hasCard(address0.address, 101)).to.be.equal(true)
    await expect(await gammaCards.hasCard(address1.address, 3)).to.be.equal(false)

    await expect(gammaOffers.confirmOfferExchange(address1.address, 101, address0.address, 3)).to.be.revertedWith(
      'The user already has that card.'
    )
  })

  it('Should allow to create a second offer for the same cardNumber and User if first one was unpublished', async () => {
    const { testDAI, gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofGammaFixture)

    await gammaCards.changeRequireOpenPackSignerValidation(false)

    await gammaDaiBySigner(address0, testDAI, gammaPacks, gammaCards)
    await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])

    await gammaOffers.connect(address0).createOffer(uuidv4(), 3, [90, 91, 92, 93])
    await verifyOfferAfterCreate(gammaOffers, gammaCards, address0, 3)

    await gammaOffers.removeOfferByCardNumber(3)
    await verifyOffersAfterRemove(gammaOffers, gammaCards, address0, 3)

    await gammaOffers.connect(address0).createOffer(uuidv4(), 3, [90, 91, 92, 93])
    await verifyOfferAfterCreate(gammaOffers, gammaCards, address0, 3)
  })

  it('Should allow to create a second offer for the same cardNumber (qtty=2) and User if first one was exchanged', async () => {
    const { testDAI, gammaPacks, gammaCards, gammaOffers, address0, address1 } =
      await loadFixture(deployNofGammaFixture)

    await gammaCards.changeRequireOpenPackSignerValidation(false)

    await gammaDaiBySigner(address0, testDAI, gammaPacks, gammaCards)
    await gammaDaiBySigner(address1, testDAI, gammaPacks, gammaCards)
    await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [0, 1, 2, 3, 20, 30, 40, 41, 42, 43, 44])
    await gammaOfferBuyPack(address1, gammaPacks, gammaCards, [90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101])

    await gammaOffers.connect(address0).createOffer(uuidv4(), 3, [90, 91, 92, 93])
    await verifyOfferAfterCreate(gammaOffers, gammaCards, address0, 3)

    await gammaOffers.confirmOfferExchange(address1.address, 90, address0.address, 3)
    await verifyOffersAfterExchange(gammaOffers, gammaCards, address1, 90, address0, 3)

    await gammaOffers.connect(address0).createOffer(uuidv4(), 3, [90, 91, 92, 93])
    await verifyOfferAfterCreate(gammaOffers, gammaCards, address0, 3)
  })

  it('Should allow to create a second offer for the same cardNumber and different User', async () => {
    const { testDAI, gammaPacks, gammaCards, gammaOffers, address0, address1 } =
      await loadFixture(deployNofGammaFixture)

    await gammaCards.changeRequireOpenPackSignerValidation(false)

    await gammaDaiBySigner(address0, testDAI, gammaPacks, gammaCards)
    await gammaDaiBySigner(address1, testDAI, gammaPacks, gammaCards)
    await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    await gammaOfferBuyPack(address1, gammaPacks, gammaCards, [3, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35])

    await gammaOffers.connect(address0).createOffer(uuidv4(), 3, [90, 91, 92, 93])
    await gammaOffers.connect(address1).createOffer(uuidv4(), 3, [0, 2, 6, 4])
    await verifyOfferAfterCreate(gammaOffers, gammaCards, address0, 3)
    await verifyOfferAfterCreate(gammaOffers, gammaCards, address1, 3)
  })

  it('Should keep offers count by total, user and cardNumber after Exchange', async () => {
    const { testDAI, gammaPacks, gammaCards, gammaOffers, address0, address1, address2 } =
      await loadFixture(deployNofGammaFixture)

    await gammaCards.changeRequireOpenPackSignerValidation(false)

    await gammaDaiBySigner(address0, testDAI, gammaPacks, gammaCards)
    await gammaDaiBySigner(address1, testDAI, gammaPacks, gammaCards)
    await gammaDaiBySigner(address2, testDAI, gammaPacks, gammaCards)
    await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    await gammaOfferBuyPack(address0, gammaPacks, gammaCards, [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35])
    await gammaOfferBuyPack(address1, gammaPacks, gammaCards, [90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101])
    await gammaOfferBuyPack(address1, gammaPacks, gammaCards, [102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112])
    await gammaOfferBuyPack(address2, gammaPacks, gammaCards, [65, 66, 67, 68, 69, 70, 71, 72, 73, 74])
    await gammaOfferBuyPack(address2, gammaPacks, gammaCards, [75, 76, 77, 78, 79, 80, 81, 82, 83, 84])

    await gammaOffers.connect(address0).createOffer(uuidv4(), 3, [90, 91, 92, 93])
    await gammaOffers.connect(address1).createOffer(uuidv4(), 90, [25, 26, 27, 28, 30, 31, 32, 33, 34])
    await gammaOffers.connect(address2).createOffer(uuidv4(), 75, [102, 103, 90, 0, 1, 2])

    await verifyOfferAfterCreate(gammaOffers, gammaCards, address0, 3)
    await verifyOfferAfterCreate(gammaOffers, gammaCards, address1, 90)
    await verifyOfferAfterCreate(gammaOffers, gammaCards, address2, 75)

    await gammaOffers.confirmOfferExchange(address1.address, 90, address0.address, 3)

    await verifyOffersAfterExchange(gammaOffers, gammaCards, address1, 90, address0, 3)
  })
})

import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { deployNofGammaFixture, getCardsByUserType, allowedToFinishAlbum } from './common'
import { v4 as uuidv4 } from 'uuid'

// address0 = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
// address1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8

describe('NoF - Gamma Cards Tests', function () {
  async function getOnePackData(gammaPacks: any, gammaCards: any, address0: any): Promise<getCardsByUserType> {
    const tokenId = await gammaPacks.buyPack({ from: address0.address })
    const pack0Data = [25, 62, 94, 71, 41, 77, 100, 90, 3, 58, 113, 28] // valid only with pack 0
    const pack0Signature = "0xe617c82fccee2ce7cea8398f16c5bb5690bea8c55b0e02fbe6844fbd0f981d9607391754b11173a49f52e3f89897a92779744cd9a9e40087019643bb544d851d1b" // valid only for address 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 and pack 0
    await gammaCards.changeRequireOpenPackSignerValidation(false)
    await gammaCards.openPack(tokenId.value, pack0Data, pack0Signature)

    const cardData: getCardsByUserType = await gammaCards.getCardsByUser(address0.address)
    return cardData
  }

  it('Add Owner should revert when the address is invalid', async () => {
    const { gammaCards } = await loadFixture(deployNofGammaFixture)
    await expect(gammaCards.addOwner(ethers.constants.AddressZero)).to.be.revertedWith('Invalid address.')
  })

  it('Add Owner should revert when adding an existing owner', async () => {
    const { gammaCards, address1 } = await loadFixture(deployNofGammaFixture)
    await gammaCards.addOwner(address1.address)
    await expect(gammaCards.addOwner(address1.address)).to.be.revertedWith('Address is already an owner.')
  })

  it('Remove Owner should revert when the address is invalid', async () => {
    const { gammaCards } = await loadFixture(deployNofGammaFixture)
    await expect(gammaCards.removeOwner(ethers.constants.AddressZero)).to.be.revertedWith('Invalid address.')
  })

  it('Remove Owner should revert when removing self as an owner', async () => {
    const { gammaCards, address0 } = await loadFixture(deployNofGammaFixture)
    await expect(gammaCards.removeOwner(address0.address)).to.be.revertedWith('You cannot remove yourself as an owner.')
  })

  it('Remove Owner should revert when removing a non-existing owner', async () => {
    const { gammaCards } = await loadFixture(deployNofGammaFixture)
    const nonExistingOwner = ethers.Wallet.createRandom().address
    await expect(gammaCards.removeOwner(nonExistingOwner)).to.be.revertedWith('Address is not an owner.')
  })

  it('Pack could opened by its owner (card-contract)', async () => {
    const { gammaPacks, gammaCards, address0 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    expect(getCardsByUserResult.length).not.equal(0)
  })

  it('Add signer should revert when the address is invalid', async () => {
    const { gammaCards } = await loadFixture(deployNofGammaFixture)
    await expect(gammaCards.addSigner(ethers.constants.AddressZero)).to.be.revertedWith('Invalid address.')
  })

  it('Add signer should revert when adding an existing signer', async () => {
    const { gammaCards, address0 } = await loadFixture(deployNofGammaFixture)
    await expect(gammaCards.addSigner(address0.address)).to.be.revertedWith('Address is already a signer.')
  })

  it('Remove signer should revert when the address is invalid', async () => {
    const { gammaCards } = await loadFixture(deployNofGammaFixture)
    await expect(gammaCards.removeSigner(ethers.constants.AddressZero)).to.be.revertedWith('Invalid address.')
  })

  it('Remove signer should revert when removing self as a signer', async () => {
    const { gammaCards, address0 } = await loadFixture(deployNofGammaFixture)
    await expect(gammaCards.removeSigner(address0.address)).to.be.revertedWith(
      'You cannot remove yourself as a signer.'
    )
  })

  it('Remove signer should revert when removing a non-existing signer', async () => {
    const { gammaCards } = await loadFixture(deployNofGammaFixture)
    const nonExistingSigner = ethers.Wallet.createRandom().address
    await expect(gammaCards.removeSigner(nonExistingSigner)).to.be.revertedWith('Address is not a signer.')
  })

  it('Should not allow to mint a card when has an offer and flag requireOfferValidationInMint is true', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)

    await gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][0], [1, 2, 24, 4, 5, 6, 7, 8])

    let offers = await gammaOffers.getOffers()
    await expect(offers.length).to.not.be.equal(0)

    await gammaCards.changeRequireOfferValidationInMint(true)
    await expect(gammaCards.mintCard(getCardsByUserResult[0][0])).to.be.revertedWith('This card has an offer.')
  })

  it('Should allow minting a card when has an offer and flag requireOfferValidationInMint is false', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)

    await gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][0], [1, 2, 24, 4, 5, 6, 7, 8])

    let offers = await gammaOffers.getOffers()
    await expect(offers.length).to.not.be.equal(0)

    await gammaCards.changeRequireOfferValidationInMint(false)
    await gammaCards.mintCard(getCardsByUserResult[0][0])
  })

  it('Should allow to mint a card when has an offer, quantity > 1 and flag requireOfferValidationInMint is true', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult1: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    // another pack with the same cards.
    await getOnePackData(gammaPacks, gammaCards, address0)

    const cardNumber = getCardsByUserResult1[0][0]
    let quantity = await gammaCards.getCardQuantityByUser(address0.address, cardNumber)
    await expect(quantity).to.be.equal(2)

    await gammaOffers.createOffer(uuidv4(), cardNumber, [1, 2, 24, 4, 5, 6, 7, 8])
    let offers = await gammaOffers.getOffers()
    expect(offers.length).to.not.be.equal(0)

    await gammaCards.changeRequireOfferValidationInMint(true)
    await gammaCards.mintCard(cardNumber)
    quantity = await gammaCards.getCardQuantityByUser(address0.address, cardNumber)
    expect(quantity).to.be.equal(1)
  })

  it('Should not allow the transfer a card when has an offer and flag requireOfferValidationInTransfer is true', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0, address1 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)

    await gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][0], [1, 2, 24, 4, 5, 6, 7, 8])

    let offers = await gammaOffers.getOffers()
    expect(offers.length).to.not.be.equal(0)

    await gammaCards.changeRequireOfferValidationInTransfer(true)
    await expect(gammaCards.transferCard(address1.address, getCardsByUserResult[0][0])).to.be.revertedWith(
      'This card has an offer.'
    )
  })

  it('Should allow the transfer a card when has an offer and flag requireOfferValidationInTransfer is false', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0, address1 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)

    await gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][0], [1, 2, 24, 4, 5, 6, 7, 8])
    let offers = await gammaOffers.getOffers()
    expect(offers.length).to.not.be.equal(0)

    await gammaCards.changeRequireOfferValidationInTransfer(false)
    await gammaCards.transferCard(address1.address, getCardsByUserResult[0][0])
  })

  it('Should allow the transfer a card when has an offer, quantity > 1 and flag requireOfferValidationInTransfer is true', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0, address1 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult1: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    // another pack with the same cards.
    await getOnePackData(gammaPacks, gammaCards, address0)

    const cardNumber = getCardsByUserResult1[0][0]
    let quantity = await gammaCards.getCardQuantityByUser(address0.address, cardNumber)
    expect(quantity).to.be.equal(2)

    await gammaOffers.createOffer(uuidv4(), cardNumber, [1, 2, 24, 4, 5, 6, 7, 8])
    let offers = await gammaOffers.getOffers()
    expect(offers.length).to.not.be.equal(0)

    await gammaCards.changeRequireOfferValidationInTransfer(true)
    await gammaCards.transferCard(address1.address, cardNumber)
    quantity = await gammaCards.getCardQuantityByUser(address0.address, cardNumber)
    expect(quantity).to.be.equal(1)
  })

  it('Should allow to transfer several cards', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0, address1 } = await loadFixture(deployNofGammaFixture)
    const getCardsByUserResult1: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)

    const cardNumber1 = getCardsByUserResult1[0][0]
    const cardNumber2 = getCardsByUserResult1[0][1]
    const cardNumber3 = getCardsByUserResult1[0][2]
    const cards = [cardNumber1, cardNumber2, cardNumber3]

    await gammaCards.transferCards(address1.address, cards)
    const quantity1 = await gammaCards.getCardQuantityByUser(address0.address, cardNumber1)
    const quantity2 = await gammaCards.getCardQuantityByUser(address0.address, cardNumber2)
    const quantity3 = await gammaCards.getCardQuantityByUser(address0.address, cardNumber3)
    expect(quantity1).to.be.equal(0)
    expect(quantity2).to.be.equal(0)
    expect(quantity3).to.be.equal(0)
  })

  it('Should allow to finish album', async () => {
    const { gammaPacks, gammaCards, address0, testDAI } = await loadFixture(deployNofGammaFixture)

    // some settings
    await gammaPacks.changeTransferDaiFlag(true)
    await gammaCards.changeRequireOpenPackSignerValidation(false)

    // Add all cards to user
    await gammaCards.testAddCards(address0.address)
    const getCardsByUserResult1: getCardsByUserType = await gammaCards.getCardsByUser(address0.address)
    expect(getCardsByUserResult1.length).not.equal(0)

    // Buy and open packs to increase prizesBalance
    const packsToBuy = 40
    const amountRequiredToBuyPacks = await gammaPacks.getAmountRequiredToBuyPacks(packsToBuy)
    const userBalanceToken = await testDAI.balanceOf(address0.address)

    expect(userBalanceToken >= amountRequiredToBuyPacks).to.be.true
    await testDAI.approve(gammaPacks.address, amountRequiredToBuyPacks)

    await gammaPacks.buyPacks(packsToBuy)
    const pack0Data = [25, 62, 94, 71, 41, 77, 100, 90, 3, 58, 113, 28]

    for (let index = 0; index < packsToBuy; index++) {
      await gammaCards.testOpenPack(address0.address, index, pack0Data)
    }

    const allowedToFinish: boolean = await allowedToFinishAlbum(gammaCards, testDAI, address0.address)
    expect(allowedToFinish).to.be.equal(true)

    const finishResult = await gammaCards.finishAlbum()
    await finishResult.wait()
  })

  it('Should allow to finish album and delete user offers', async () => {
    const { gammaPacks, gammaCards, gammaOffers, address0, testDAI } = await loadFixture(deployNofGammaFixture)

    // some settings
    await gammaPacks.changeTransferDaiFlag(true)
    await gammaCards.changeRequireOpenPackSignerValidation(false)

    // Add all cards to user
    await gammaCards.testAddCards(address0.address)
    const getCardsByUserResult1: getCardsByUserType = await gammaCards.getCardsByUser(address0.address)
    expect(getCardsByUserResult1.length).not.equal(0)

    // create offers
    const getCardsByUserResult: getCardsByUserType = await getOnePackData(gammaPacks, gammaCards, address0)
    await gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][0], [1, 2, 24, 4, 5, 6, 7, 8])
    await gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][1], [20, 21])
    await gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][2], [30])
    await gammaOffers.createOffer(uuidv4(), getCardsByUserResult[0][3], [118, 115])

    let offers = await gammaOffers.getOffers()
    await expect(offers.length).to.not.be.equal(0)

    // Buy and open packs to increase prizesBalance
    const packsToBuy = 40
    const amountRequiredToBuyPacks = await gammaPacks.getAmountRequiredToBuyPacks(packsToBuy)
    const userBalanceToken = await testDAI.balanceOf(address0.address)

    expect(userBalanceToken >= amountRequiredToBuyPacks).to.be.true
    await testDAI.approve(gammaPacks.address, amountRequiredToBuyPacks)

    await gammaPacks.buyPacks(packsToBuy)
    const pack0Data = [25, 62, 94, 71, 41, 77, 100, 90, 3, 58, 113, 28]

    for (let index = 0; index < packsToBuy; index++) {
      await gammaCards.testOpenPack(address0.address, index, pack0Data)
    }

    const allowedToFinish: boolean = await allowedToFinishAlbum(gammaCards, testDAI, address0.address)
    expect(allowedToFinish).to.be.equal(true)

    const finishResult = await gammaCards.finishAlbum()
    await finishResult.wait()
  })

  it('Should allow to burn 1 card', async () => {
    const { gammaCards, address0 } = await loadFixture(deployNofGammaFixture)

    await gammaCards.testAddCards(address0.address)
    const cardsToBurn = [1]
    await gammaCards.burnCards(cardsToBurn)
    expect(await gammaCards.hasCard(address0.address, 1)).to.be.false
  })

  it('Should allow to burn 50 card', async () => {
    const { gammaCards, address0 } = await loadFixture(deployNofGammaFixture)

    await gammaCards.testAddCards(address0.address)

    const cardsToBurn = new Set()
    while (cardsToBurn.size < 50) {
      cardsToBurn.add(Math.floor(Math.random() * 120))
    }

    await gammaCards.burnCards(Array.from(cardsToBurn))

    cardsToBurn.forEach(async card => {
      expect(await gammaCards.hasCard(address0.address, card)).to.be.false
    })
  })

  it('Should pay secondary prize when burn 60 cards', async () => {
    const { testDAI, gammaPacks, gammaCards, gammaTickets, address0 } = await loadFixture(deployNofGammaFixture)

    const amount = ethers.BigNumber.from('120000000000000000000') // 120 DAIs
    await testDAI.approve(gammaPacks.address, amount)
    await testDAI.approve(gammaCards.address, amount)

    await gammaPacks.buyPacks(10) // buy packs to increase prizesBalance in gamma cards;

    await gammaCards.testAddCards(address0.address)
    const userInitialTokenBalance = await testDAI.balanceOf(address0.address)

    const cardsToBurn = new Set()
    while (cardsToBurn.size < 60) {
      cardsToBurn.add(Math.floor(Math.random() * 120))
    }

    await gammaCards.burnCards(Array.from(cardsToBurn))
    const userFinalTokenBalance = await testDAI.balanceOf(address0.address)
    const userTickets = await gammaTickets.getTicketsByUser(address0.address)

    cardsToBurn.forEach(async card => {
      expect(await gammaCards.hasCard(address0.address, card)).to.be.false
    })
    expect(userFinalTokenBalance > userInitialTokenBalance).to.be.true
    expect(userTickets.length).greaterThan(0)
  })

  it('Should allow to burn card with offer and more than 2 copies', async () => {
    const { testDAI, gammaPacks, gammaCards, gammaOffers, gammaTickets, address0 } =
      await loadFixture(deployNofGammaFixture)

    const amount = ethers.BigNumber.from('120000000000000000000') // 120 DAIs
    await testDAI.approve(gammaPacks.address, amount)
    await testDAI.approve(gammaCards.address, amount)

    await gammaPacks.buyPacks(10) // buy packs to increase prizesBalance in gamma cards;

    await gammaCards.testAddCards(address0.address) // 1 copy of each card
    await gammaCards.testAddCards(address0.address) // 2 copies of each card
    await gammaCards.testAddCards(address0.address) // 3 copies of each card

    const userCopiesCard1 = await gammaCards.getCardQuantityByUser(address0.address, 1)
    expect(userCopiesCard1).to.be.equal(3)

    const userInitialTokenBalance = await testDAI.balanceOf(address0.address)

    const cardsToBurn = []
    for (let i = 1; i <= 60; i++) {
      cardsToBurn.push(i)
    }

    await gammaOffers.createOffer(uuidv4(), 1, [2, 24])
    let offers = await gammaOffers.getOffers()
    expect(offers.length).to.not.be.equal(0)

    await gammaCards.burnCards(cardsToBurn)
    const userFinalTokenBalance = await testDAI.balanceOf(address0.address)
    const userTickets = await gammaTickets.getTicketsByUser(address0.address)

    expect(await gammaCards.hasCard(address0.address, 1)).to.be.true
    expect(userFinalTokenBalance > userInitialTokenBalance).to.be.true
    expect(userTickets.length).greaterThan(0)
  })

  it('Should revert when try to burn 2 copies of one card with offer and only 3 copies', async () => {
    const { testDAI, gammaPacks, gammaCards, gammaOffers, address0 } = await loadFixture(deployNofGammaFixture)

    const amount = ethers.BigNumber.from('120000000000000000000') // 120 DAIs
    await testDAI.approve(gammaPacks.address, amount)
    await testDAI.approve(gammaCards.address, amount)

    await gammaPacks.buyPacks(10) // buy packs to increase prizesBalance in gamma cards;

    await gammaCards.testAddCards(address0.address) // 1 copy of each card
    await gammaCards.testAddCards(address0.address) // 2 copies of each card
    await gammaCards.testAddCards(address0.address) // 3 copies of each card

    const userCopiesCard1 = await gammaCards.getCardQuantityByUser(address0.address, 1)
    expect(userCopiesCard1).to.be.equal(3)

    const cardsToBurn = [1, 1] // 2 copies of card 1
    for (let i = 3; i <= 60; i++) {
      cardsToBurn.push(i)
    }

    await gammaOffers.createOffer(uuidv4(), 1, [2, 24])
    let offers = await gammaOffers.getOffers()
    expect(offers.length).to.not.be.equal(0)

    expect(await gammaCards.burnCards(cardsToBurn)).to.be.revertedWith('You cannot burn any more copies of this card.')
  })
})

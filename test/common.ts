import dotenv from 'dotenv'
import { ethers } from 'hardhat'

dotenv.config()

type PackDataType = any[][]

const nofDaiContractName = process.env.NOF_DAI_CONTRACT_NAME || 'NofTestDAIV2'
const nofAlphaContractName = process.env.NOF_ALPHA_CONTRACT_NAME || 'NofAlphaV2'
const nofGammaPacksContractName = process.env.NOF_GAMMA_PACKS_CONTRACT_NAME || 'NofGammaPacksV2'
const nofGammaCardsContractName = process.env.NOF_GAMMA_CARDS_CONTRACT_NAME || 'NofGammaCardsV3'
const nofGammaOffersContractName = process.env.NOF_GAMMA_OFFERS_CONTRACT_NAME || 'NofGammaOffersV3'

async function deployNofFixture() {
 
  const [
    address0, address1, address2, address3, address4, address5, 
    address6, address7, address8, address9] =
    await ethers.getSigners()

  const TestDAI = await ethers.getContractFactory(nofDaiContractName)
  const testDAI = await TestDAI.deploy()
  await testDAI.deployed()

  const GammaPacks = await ethers.getContractFactory(nofGammaPacksContractName)
  const gammaPacks = await GammaPacks.deploy(testDAI.address, address0.address)
  await gammaPacks.deployed()

  const GammaCards = await ethers.getContractFactory(nofGammaCardsContractName)
  const gammaCards = await GammaCards.deploy(
    testDAI.address,
    gammaPacks.address,
    'https://www.example.com',
    address0.address
  )

  const GammaOffers = await ethers.getContractFactory(nofGammaOffersContractName)
  const gammaOffers = await GammaOffers.deploy(gammaCards.address)
  await gammaOffers.deployed()
  await gammaCards.setGammaOffersContract(gammaOffers.address)
  await gammaPacks.setGammaCardsContract(gammaCards.address)

  const TenPacksPrice = ethers.BigNumber.from('10000000000000000000'.toString())
  await testDAI._mint(address0.address, TenPacksPrice)
  await testDAI.approve(gammaPacks.address, TenPacksPrice)

  return {
    testDAI,
    gammaCards,
    gammaPacks,
    gammaOffers,
    address0,
    address1,
    address2,
    address3,
    address4,
    address5,
    address6,
    address7,
    address8,
    address9
  }
}

async function getOnePackData (gammaPacks: any, gammaCards: any, address0: any): Promise<PackDataType> {
 
  const tokenId = await gammaPacks.buyPack({ from: address0.address })
  const pack0Data = [25,62,94,71,41,77,100,90,3,58,113,28] // valid only with pack 0
  await gammaCards.changeRequireOpenPackSignerValidation(false)
  await gammaCards.testOpenPack(tokenId.value, pack0Data)
  const packData: PackDataType = await gammaCards.getCardsByUser(address0.address)

  /*
  console.log(cardData)
  for (let i = 0; i < packData[0].length; i++) {
    const cardId = packData[0][i]
    const quantity = packData[1][i]
    console.log(`\tname: ${cardId.toString()}, stamped: ${quantity > 0}, quantity: ${quantity}`)
  }
  */

  return packData
}

export {
  nofDaiContractName, nofAlphaContractName, 
  nofGammaPacksContractName, nofGammaCardsContractName,
  nofGammaOffersContractName, deployNofFixture,
  getOnePackData, PackDataType
}

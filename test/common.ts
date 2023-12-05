import dotenv from 'dotenv'
import { ethers } from 'hardhat'

dotenv.config()

type getCardsByUserType = any[][]

const nofDaiContractName = process.env.NOF_DAI_CONTRACT_NAME || 'NofTestDAIV2'
const nofAlphaContractName = process.env.NOF_ALPHA_CONTRACT_NAME || 'NofAlphaV2'
const nofGammaPacksContractName = process.env.NOF_GAMMA_PACKS_CONTRACT_NAME || 'NofGammaPacksV2'
const nofGammaCardsContractName = process.env.NOF_GAMMA_CARDS_CONTRACT_NAME || 'NofGammaCardsV4'
const nofGammaOffersContractName = process.env.NOF_GAMMA_OFFERS_CONTRACT_NAME || 'NofGammaOffersV3'
const pringLogs = process.env.PRINT_LOGS_IN_TESTS || '0'

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

  // console.log(`\nMinting some DAIs for these wallet address:\n ${addressString}`)
  const signers = await ethers.getSigners()
  for (const wallet of signers) {
    await testDAI._mint(wallet.address, ethers.BigNumber.from('900000000000000000000'));
  }

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

async function getOnePackData (gammaPacks: any, gammaCards: any, address0: any): Promise<getCardsByUserType> {
 
  const tokenId = await gammaPacks.buyPack({ from: address0.address })
  const pack0Data = [25,62,94,71,41,77,100,90,3,58,113,28] // valid only with pack 0
  await gammaCards.changeRequireOpenPackSignerValidation(false)
  await gammaCards.openPackByUser(address0.address, tokenId.value, pack0Data, [])
  const result: getCardsByUserType = await gammaCards.getCardsByUser(address0.address)

  return result
}

function log (...args: any[]) {
  if (parseInt(pringLogs) === 0) return
  for (let index = 0; index < args.length; index++) {
    console.log(args[index])
  }
}

function printOffers(offers: any[], called: string) {
  
  if (offers.length === 0 || offers[0].offerId === "") {
    log(`No offers, called: ${called}`)
  } else {
    offers.forEach((offer: any[]) => {
      let wantedCards = []
      try {
        wantedCards = offer[2] ? offer[2].join (',') : []
      } catch {}
      
      log(`offer: ${offer[0]}, offerCard: ${offer[1]}, offerWallet: ${offer[3]}, wantedCards: ${wantedCards}, called: ${called}`)
    })
  }
}

async function allowedToFinishAlbum (gammaCards: any, daiContract: any, address: any) {
  // Hay 4 condicione sen el contrato para poder completarlo:
  // 1. Que el usuario tengan un álbum: require(cardsByUser[msg.sender][120] > 0, "No tienes ningun album");
  // 2. Que haya un balance mayor a lo que se paga de premio: require(prizesBalance >= mainAlbumPrize, "Fondos insuficientes");
  // 3. Que el usuario tenga todas las cartas.
  // 4. Que el contrato tenga un balance superior al precio del premio (mainAlbumPrize)
  // Las 4 se validan en el contrato y aquí (para evitar la llamada al contrato)

  // require(cardsByUser[msg.sender][120] > 0, "No tienes ningun album");
  const userHasAlbum = await gammaCards.cardsByUser(address, 120)
  const prizesBalance = await gammaCards.prizesBalance()
  const mainAlbumPrize = await gammaCards.mainAlbumPrize()
  const gammaContractBalance = await daiContract.balanceOf(gammaCards.address)
  const prizeBalanceFormatted = ethers.utils.formatUnits(prizesBalance, 18)
  const albumPrizeFormatted = ethers.utils.formatUnits(mainAlbumPrize, 18)
  const gammaContractBalanceFormatted = ethers.utils.formatUnits(gammaContractBalance, 18)

  // require(prizesBalance >= mainAlbumPrize, "Fondos insuficientes");
  const prizesBalanzGTAlbumPrice = parseInt(prizeBalanceFormatted) >= parseInt(albumPrizeFormatted)

  // require gammaCardContractBalance >= mainAlbumPrize
  const contractBalanzGTAlbumPrice =
    parseInt(gammaContractBalanceFormatted) >= parseInt(albumPrizeFormatted)

  const result = userHasAlbum && prizesBalanzGTAlbumPrice && contractBalanzGTAlbumPrice

  log('prizesBalanzGTAlbumPrice', {
    userHasAlbum,
    prizeBalanceFormatted,
    albumPrizeFormatted,
    gammaContractBalanceFormatted,
    prizesBalanzGTAlbumPrice,
    contractBalanzGTAlbumPrice,
    result
  })
  
  return result
}

export {
  nofDaiContractName, nofAlphaContractName, 
  nofGammaPacksContractName, nofGammaCardsContractName,
  nofGammaOffersContractName, deployNofFixture,
  getOnePackData, getCardsByUserType, log, printOffers,
  allowedToFinishAlbum
}

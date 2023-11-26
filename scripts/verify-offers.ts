import "@nomiclabs/hardhat-ethers"
import '@nomiclabs/hardhat-ethers'
import { ethers } from 'hardhat'
import dotenv from 'dotenv'

function printOffers(offers: any[], called: string) {
  
  if (offers.length === 0 || offers[0].offerId === "") {
    console.log(`No offers, called: ${called}`)
  } else {
    offers.forEach((offer: any[]) => {
      let wantedCards = []
      try {
        wantedCards = offer[2] ? offer[2].join (',') : []
      } catch {}
      
      console.log(`offer: ${offer[0]}, offerCard: ${offer[1]}, offerWallet: ${offer[3]}, wantedCards: ${wantedCards}, called: ${called}`)
    })
  }
}

async function main() {
  dotenv.config()

  try {
    const [deployer] = await ethers.getSigners()
    const balance = (await deployer.getBalance()).toString()
    const acc = await deployer.getAddress()
    console.log(`Working with the account ${acc}, current acc balance: ${ethers.utils.formatEther(balance)}\n`)

    const nofGammaOffersContractName = process.env.NOF_GAMMA_OFFERS_CONTRACT_NAME ||  'NofGammaOffersV3'
    const nofGamaOffersContractCurrentAddress = process.env.NOF_GAMMA_OFFERS_CONTRACT_CURRENT_ADDRESS || ''

    if (nofGamaOffersContractCurrentAddress === '') {
      console.error('Env variable NOF_GAMMA_OFFERS_CONTRACT_CURRENT_ADDRESS not setted')
      process.exit(1)
    }

    const gammaOffers = await ethers.getContractAt(nofGammaOffersContractName, nofGamaOffersContractCurrentAddress)
    const offers = await gammaOffers.getOffers()
    printOffers(offers, 'getOffers')

    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

main()

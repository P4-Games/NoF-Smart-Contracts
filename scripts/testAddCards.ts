import "@nomiclabs/hardhat-ethers"
import '@nomiclabs/hardhat-ethers'
import { ethers } from 'hardhat'
import dotenv from 'dotenv'

async function main() {
  dotenv.config()

  try {
    const [deployer] = await ethers.getSigners()
    const balance = (await deployer.getBalance()).toString()
    const acc = await deployer.getAddress()
    console.log(`Working with the account ${acc}, current acc balance: ${ethers.utils.formatEther(balance)}\n`)

    const gammaOffers = await ethers.getContractAt('NofGammaCardsV5', '0xCD1c83a7d2EbAF06052c1d8A14397834303e8368')
    await gammaOffers.testAddCards('0x117b706DEF40310eF5926aB57868dAcf46605b8d')

    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

main()

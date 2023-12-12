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

    const wallet = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
    const cardsContract = await ethers.getContractAt('NofGammaCardsV5', '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9')
    await cardsContract.testAddCards(wallet)

    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

main()

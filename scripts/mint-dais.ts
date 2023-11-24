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

    const nofDaiContractName = process.env.NOF_DAI_CONTRACT_NAME ||  'NofTestDAIV2'
    const nofDaiContractCurrentAddress = process.env.NOF_DAI_CONTRACT_CURRENT_ADDRESS || ''

    if (nofDaiContractCurrentAddress === '') {
      console.error('Env variable NOF_DAI_CONTRACT_CURRENT_ADDRESS not setted')
      process.exit(1)
    }

    const mintDaiAddresses = process.env.NOF_DAI_MINT_EXTRA_WALLET_ADDRESSES  || ''
    if (mintDaiAddresses === '') {
      console.log('No exra addressses to mint DAIs (env variable: NOF_DAI_MINT_EXTRA_WALLET_ADDRESSES)')
      process.exit(0)
    }
    
    let addressesString = mintDaiAddresses.split(',')
    if (addressesString.length === 0) {
      console.log('No exra addressses to mint DAIs (env variable: NOF_DAI_MINT_EXTRA_WALLET_ADDRESSES)')
      process.exit(0)
    }
    if ( !(addressesString instanceof Array)) {
      addressesString = [addressesString]
    }

    const testDAI = await ethers.getContractAt(nofDaiContractName, nofDaiContractCurrentAddress)
    
    for (let index = 0; index < addressesString.length; index++) {
      const address = addressesString[index];
      if (address != '') {
        console.log(`Minting some DAIs for this wallet address: ${address}`)
        const trx = await testDAI._mint(address, ethers.BigNumber.from('900000000000000000000'))
        await trx.wait()
        const balance = await testDAI.balanceOf(address)
        console.log(`${address} balance: `, ethers.utils.formatEther(balance))
      }
    }

    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

main()

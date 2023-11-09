import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { nofDaiContractName, nofGammaPacksContractName, nofGammaCardsContractName } from './common'

describe('NoF - Gamma Tests', function () {
  async function deployNofFixture() {
    console.log('\tRunning deployNofFixture...')

    const [address0, address1, address2, address3, address4, address5, address6, address7, address8, address9] =
      await ethers.getSigners()

    /*
    const addresses = [address0,
      address1,
      address2,
      address3,
      address4,
      address5,
      address6,
      address7,
      address8,
      address9
    ]
    */

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
    await gammaCards.deployed()
    await gammaPacks.setCardsContract(gammaCards.address)

    // minting packPrice in DAI per address, value is in wad (18 decimals)
    console.log('\tapproving...')
    const packPrice = ethers.BigNumber.from('10000000000000000000')
    await testDAI.approve(gammaPacks.address, packPrice)

    console.log('\tEnd deployNofFixture')
    return {
      testDAI,
      gammaCards,
      gammaPacks,
      packPrice,
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

  it('dummy gamma test', async function () {
    // const { gammaCards } = await loadFixture(deployNofFixture);
    expect(1).to.equal(1)
  })
})

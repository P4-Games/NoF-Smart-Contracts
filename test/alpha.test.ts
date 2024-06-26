import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { nofDaiContractName, nofAlphaContractName } from './common'

describe('NoF - Alpha Tests', function () {
  async function deployNofAlphaFixture() {
    console.log('\tRunning deployNofFixture (alpha)...')

    const [address0, address1, address2, address3, address4, address5, address6, address7, address8, address9] =
      await ethers.getSigners()

    const addresses = [
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
    ]

    const LibStringUtils = await ethers.getContractFactory("LibStringUtils");
    const libStringUtils = await LibStringUtils.deploy();
    await libStringUtils.deployed();

    const TestDAI = await ethers.getContractFactory(nofDaiContractName)
    const testDAI = await TestDAI.deploy()
    await testDAI.deployed()

    const NofAlpha = await ethers.getContractFactory(nofAlphaContractName, {
      libraries: {
        LibStringUtils: libStringUtils.address,
      },
    })
    const nofAlpha = await NofAlpha.deploy()
    await nofAlpha.deployed()
    await nofAlpha.init('https://www.example.com', testDAI.address, address0.address)

    // example season with 60 cards (50 cards & 10 albums) and 10 dai price per pack
    const packPrice = ethers.BigNumber.from('10000000000000000000')

    console.log('\tCreating new Season...')
    await nofAlpha.newSeason('T1', packPrice, 60, 'T1')

    // minting packPrice in DAI per address, value is in wad (18 decimals)
    console.log('\tapproving...')
    await testDAI.approve(nofAlpha.address, packPrice)
    console.log('\tminting...')
    await testDAI._mint(address0.address, packPrice)

    for (let i = 1; i < 10; i++) {
      await testDAI.connect(addresses[i]).approve(nofAlpha.address, packPrice)
      await testDAI.connect(addresses[i])._mint(addresses[i].address, packPrice)
    }

    console.log('\tbuying pack...')
    await nofAlpha.buyPack(packPrice, 'T1')
    for (let i = 1; i < 10; i++) {
      await nofAlpha.connect(addresses[i]).buyPack(packPrice, 'T1')
    }

    // for tests to pass, collections must be always "1", changed in mint() function
    // cards[tokenId].collection = 1;
    // so that cards can be pasted without exchanging them
    await nofAlpha.pasteCards(1, 0)
    await nofAlpha.pasteCards(2, 0)
    await nofAlpha.pasteCards(3, 0)
    await nofAlpha.pasteCards(4, 0)
    await nofAlpha.pasteCards(5, 0)

    await nofAlpha.connect(address1).pasteCards(7, 6)
    await nofAlpha.connect(address1).pasteCards(8, 6)
    await nofAlpha.connect(address1).pasteCards(9, 6)
    await nofAlpha.connect(address1).pasteCards(10, 6)
    await nofAlpha.connect(address1).pasteCards(11, 6)

    await nofAlpha.connect(address2).pasteCards(13, 12)
    await nofAlpha.connect(address2).pasteCards(14, 12)
    await nofAlpha.connect(address2).pasteCards(15, 12)
    await nofAlpha.connect(address2).pasteCards(16, 12)
    await nofAlpha.connect(address2).pasteCards(17, 12)

    await nofAlpha.connect(address3).pasteCards(19, 18)
    await nofAlpha.connect(address3).pasteCards(20, 18)
    await nofAlpha.connect(address3).pasteCards(21, 18)
    await nofAlpha.connect(address3).pasteCards(22, 18)
    await nofAlpha.connect(address3).pasteCards(23, 18)

    await nofAlpha.connect(address4).pasteCards(25, 24)
    await nofAlpha.connect(address4).pasteCards(26, 24)
    await nofAlpha.connect(address4).pasteCards(27, 24)
    await nofAlpha.connect(address4).pasteCards(28, 24)
    await nofAlpha.connect(address4).pasteCards(29, 24)

    await nofAlpha.connect(address5).pasteCards(31, 30)
    await nofAlpha.connect(address5).pasteCards(32, 30)
    await nofAlpha.connect(address5).pasteCards(33, 30)
    await nofAlpha.connect(address5).pasteCards(34, 30)
    await nofAlpha.connect(address5).pasteCards(35, 30)

    await nofAlpha.connect(address6).pasteCards(37, 36)
    await nofAlpha.connect(address6).pasteCards(38, 36)
    await nofAlpha.connect(address6).pasteCards(39, 36)
    await nofAlpha.connect(address6).pasteCards(40, 36)
    await nofAlpha.connect(address6).pasteCards(41, 36)

    await nofAlpha.connect(address7).pasteCards(43, 42)
    await nofAlpha.connect(address7).pasteCards(44, 42)
    await nofAlpha.connect(address7).pasteCards(45, 42)
    await nofAlpha.connect(address7).pasteCards(46, 42)
    await nofAlpha.connect(address7).pasteCards(47, 42)

    await nofAlpha.connect(address8).pasteCards(49, 48)
    await nofAlpha.connect(address8).pasteCards(50, 48)
    await nofAlpha.connect(address8).pasteCards(51, 48)
    await nofAlpha.connect(address8).pasteCards(52, 48)
    await nofAlpha.connect(address8).pasteCards(53, 48)

    await nofAlpha.connect(address9).pasteCards(55, 54)
    await nofAlpha.connect(address9).pasteCards(56, 54)
    await nofAlpha.connect(address9).pasteCards(57, 54)
    await nofAlpha.connect(address9).pasteCards(58, 54)
    await nofAlpha.connect(address9).pasteCards(59, 54)

    console.log('\tEnd deployNofFixture (alpha)')
    return {
      testDAI,
      nofAlpha,
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

  it('Winners should be seven', async function () {
    const { nofAlpha } = await loadFixture(deployNofAlphaFixture)
    const winners = await nofAlpha.getWinners('T1')
    expect(winners).to.have.lengthOf(7)
  })

  it('First place should receive 2x pack price', async function () {
    const { testDAI, address0 } = await loadFixture(deployNofAlphaFixture)

    const balance = await testDAI.balanceOf(address0.address)

    expect(balance).to.equal(ethers.BigNumber.from('45000000000000000000'))
  })

  it('Second place should receive 1.4x pack price', async function () {
    const { testDAI, address1 } = await loadFixture(deployNofAlphaFixture)

    const balance = await testDAI.balanceOf(address1.address)

    // expect(balance).to.equal(Number.isSafeInteger(packPrice) * 14 / 10);
    expect(balance).to.equal(ethers.BigNumber.from('14000000000000000000'))
  })

  it('Third place should receive 1.2x pack price', async function () {
    const { testDAI, address2 } = await loadFixture(deployNofAlphaFixture)

    const balance = await testDAI.balanceOf(address2.address)

    // expect(balance).to.equal(Number.isSafeInteger(packPrice) * 12 / 10);
    expect(balance).to.equal(ethers.BigNumber.from('12000000000000000000'))
  })

  it('Fourth place should receive 1x pack price', async function () {
    const { testDAI, address3 } = await loadFixture(deployNofAlphaFixture)

    const balance = await testDAI.balanceOf(address3.address)

    // expect(balance).to.equal(Number.isSafeInteger(packPrice) * 10 / 10);
    expect(balance).to.equal(ethers.BigNumber.from('10000000000000000000'))
  })

  it('Fifth place should receive 0.8x pack price', async function () {
    const { testDAI, address4 } = await loadFixture(deployNofAlphaFixture)

    const balance = await testDAI.balanceOf(address4.address)

    // expect(balance).to.equal(Number.isSafeInteger(packPrice) * 8 / 10);
    expect(balance).to.equal(ethers.BigNumber.from('8000000000000000000'))
  })

  it('Sixth place should receive 0.6x pack price', async function () {
    const { testDAI, address5 } = await loadFixture(deployNofAlphaFixture)

    const balance = await testDAI.balanceOf(address5.address)

    // expect(balance).to.equal(Number.isSafeInteger(packPrice) * 6 / 10);
    expect(balance).to.equal(ethers.BigNumber.from('6000000000000000000'))
  })

  it('Seventh place should receive 0.5x pack price', async function () {
    const { testDAI, address6 } = await loadFixture(deployNofAlphaFixture)

    const balance = await testDAI.balanceOf(address6.address)

    // expect(balance).to.equal(Number.isSafeInteger(packPrice) * 5 / 10);
    expect(balance).to.equal(ethers.BigNumber.from('5000000000000000000'))
  })

  it('Eighth place should receive nothing', async function () {
    const { testDAI, address7 } = await loadFixture(deployNofAlphaFixture)

    const balance = await testDAI.balanceOf(address7.address)

    expect(balance).to.equal(0)
  })

  it('Ninth place should receive nothing', async function () {
    const { testDAI, address8 } = await loadFixture(deployNofAlphaFixture)

    const balance = await testDAI.balanceOf(address8.address)

    expect(balance).to.equal(0)
  })

  it('Tenth place should receive nothing', async function () {
    const { testDAI, address9 } = await loadFixture(deployNofAlphaFixture)

    const balance = await testDAI.balanceOf(address9.address)

    expect(balance).to.equal(0)
  })
})

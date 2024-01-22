import dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import '@openzeppelin/hardhat-upgrades';

dotenv.config()

const INFURA_API_KEY = process.env.INFURA_API_KEY || 'INFURA_API_KEY'
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || 'ALCHEMY_API_KEY'
const PRIVATE_KEY = process.env.PRIVATE_KEY
const MNEMONIC = process.env.MNEMONIC
const solidityVersions = ["0.6.0", "0.6.2", "0.6.6", "0.8.18", "0.8.20"]
const compilers = solidityVersions.map((version) => ({
  version,
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
}))

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      chainId: 1337,
      allowUnlimitedContractSize: true 
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
      ...(PRIVATE_KEY ? { accounts: [`${PRIVATE_KEY}`] } : {})
    },
    mumbai: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      ...(PRIVATE_KEY ? { accounts: [`${PRIVATE_KEY}`] } : {})
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      ...(PRIVATE_KEY ? { accounts: [`${PRIVATE_KEY}`] } : {})
    },
    bsc: {
      url: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: {mnemonic: `${MNEMONIC}`}
    }
  },
  solidity: {
    compilers
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts'
  }
}

export default config

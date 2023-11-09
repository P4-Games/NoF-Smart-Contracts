import dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-web3";

dotenv.config()

const INFURA_API_KEY = process.env.INFURA_API_KEY || 'INFURA_API_KEY'
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || 'ALCHEMY_API_KEY'
const PRIVATE_KEY = process.env.PRIVATE_KEY

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
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts'
  }
}

export default config

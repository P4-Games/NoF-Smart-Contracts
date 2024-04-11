# Development Guide


## Verify source code of deployed Contracts

1. Create an account in polygonscan.com
2. Create un API Key in your Polygon's account
3. Copy your API Key from Polygonscan
4. Create a .env file with the API Key

```sh
POLYGON_MUMBAI_RPC_PROVIDER = 'RPC Node URL'
PRIVATE_KEY = 'your wallet private key'
POLYGONSCAN_API_KEY = 'your polygonscan api key'
```

5. Install hardhat-etherscan dependency


```sh
npm install --save-dev @nomiclabs/hardhat-etherscan
or 
yarn add --dev @nomiclabs/hardhat-etherscan
```

6. Update your hardhat.config.js with etherscan


```sh
module.exports = {
        solidity: ...
        defaultNetwork: ...
        networks: { ...}
        etherscan: {
           apiKey: POLYGONSCAN_API_KEY
        }
}
```

7. Verify the deployed contract address

```sh
npx hardhat verify CONTRACT_ADDR --network polygon
```

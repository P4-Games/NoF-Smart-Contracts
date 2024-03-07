![](https://img.shields.io/badge/Solidity-informational?style=flat&logo=solidity&logoColor=white&color=6aa6f8)
![](https://img.shields.io/badge/Hardhat-informational?style=flat&logo=hardhat&logoColor=white&color=6aa6f8)
![](https://img.shields.io/badge/JavaScript-informational?style=flat&logo=javascript&logoColor=white&color=6aa6f8)
![](https://img.shields.io/badge/Typescript-informational?style=flat&logo=typescript&logoColor=white&color=6aa6f8)


# NoF Smart Contracts

## Requirements

The App requires:

- [Node.js](https://nodejs.org/) v16+ to run (^16.14.2).
- [Yarn.js](https://classic.yarnpkg.com/en/docs/install) v1+ to run (^1.22.19).
- [hardhat](https://hardhat.org/)

- You could check the version of packages (node, yarn) with these commands:

```sh
node -v
yarn -v
```

## Install the dependencies

```sh
- yarn install # with yarn
- npm i OR npm i --legacy-peer-deps # with NPM
```

If you have some trouble with dependencies, try this:

```sh
set http_proxy=
set https_proxy=
npm config rm https-proxy
npm config rm proxy
npm config set registry "https://registry.npmjs.org"
yarn cache clean
yarn config delete proxy
yarn --network-timeout 100000
```

Create a .env file running the command in terminal

```sh
touch .env
```

## Environment variables

The environment variables below needs to be set in the .env file when the project is running locally.

```sh
INFURA_ID={your infura project id}
ALCHEMY_ID={your infura api key}
PUBLIC_ADDRESS={your wallet address}
PRIVATE_KEY={your private key to deploy SCs}
MNEMONIC={your mnemoic words}
NOF_DAI_CONTRACT_NAME='NofTestDAIV2'
NOF_ALPHA_CONTRACT_NAME='NofAlphaV2'
NOF_GAMMA_PACKS_CONTRACT_NAME='NofGammaPacksV2'
NOF_GAMMA_CARDS_CONTRACT_NAME='NofGammaCardsV3'
NOF_GAMMA_OFFERS_CONTRACT_NAME='NofGammaOffersV1'

# Two methods were left in the code to create a data signature.
# Method 1 is a custom one used locally.
# Method 2 is used by the app in environments, deployed in a backend micro-service.
SIGNATURE_METHOD='1'

# This variable contains a list (separator: ",") of wallet addresses
# that have signed packs.
# The backend micro-service generates a signature. In the smart contract calling the landing,
# that signature is validated.
# Last wallet set in the micro-service: 0x20517cf8c140f7f393f92cea6158f57385a75733
# Multiple wallets are set due to different wallets that have signed packs.
MICRO_SERVICE_SIGNATURE_WALLETS_ADDRESSES=''

# Address of the wallet of the balance receiver that will be configured in the gamma-packs contract
BALANCE_RECEIVER_WALLET_ADDRESS=''

# List of additional owner addresses (to the deployer) to add to the contracts
# (separate values by ",")
ADDITIONAL_OWNERS_WALLETS_ADDRESSES=''

# Addresses of existing contracts, to avoid re-deployment when executing the deploy.hs script
# (it will use the ones defined in these variables)
NOF_DAI_CONTRACT_CURRENT_ADDRESS=''
NOF_ALPHA_CONTRACT_CURRENT_ADDRESS=''
NOF_GAMMA_CARDS_CONTRACT_CURRENT_ADDRESS=''
NOF_GAMMA_PACKS_CONTRACT_CURRENT_ADDRESS=''
NOF_GAMMA_OFFERS_CONTRACT_CURRENT_ADDRESS=''
NOF_GAMMA_LIB_PACK_VERIFIER_CONTRACT_NAME=''
NOF_GAMMA_LIB_STRING_UTILS_CONTRACT_NAME=''
NOF_GAMMA_LIB_OWNERS_MGMT_CONTRACT_NAME=''

# Addresses to mint DAIs using a script (scripts/support-mint-dais.ts)
NOF_DAI_MINT_EXTRA_WALLET_ADDRESSES=''

# Just a flag to enable ('1') print to console or not ('0' - default -)
PRINT_LOG='0'
```

> Note: You can find more info about the other required `.env` variables inside the `example_env` file.


## Commands

```shell
# Run testnet
yarn hardhat node

# Compile
npx hardhat compile

# Test
npx hardhat test

# Deploy to local
npx hardhat run scripts/deploy.ts

# Deploy to Mumbai 
npx hardhat run scripts/deploy.ts --network mumbai

# Deploy Mock Data (local)
npx hardhat run scripts/deploy-mock-data.ts


# Solidity Security and Style guides validations with solhint [https://protofire.github.io/solhint/]
npm install -g solhint
solhint 'contracts/**/*.sol'

# Solidity Static Analysis [https://github.com/crytic/slither]
# To install slither =>  https://github.com/crytic/slither#how-to-install
slither .
```


## Gamma Logic Detaills

See detaills about gamma Smart Contracts in this [file](./.doc/contracts-info.md)

## Deployed Contracts last Addresses

### Mumbai 
* DAI: 0xEa4c35c858E15Cef77821278A88435dE57bc8707
* Alpha: 0xf9e8570b88798CcC3bde56C6Eb7dF60C6DAA84Fe
* Gamma Cards: 0x560c7d01011fbBF0438C804365cfea4B61E8985c
* Gamma Cards NFT: 0xed892E7C282E0A2ae35A0aE204644750086A5dAD
* Gamma Packs: 0x8b22aacc17b81610449FC978B0df558dA447A7A6
* Gamma Offers: 0xd1f5FBBDACe8bE489246099603eeF5866EA1544e
* Gamma Tickets: 0x34D6e75f13dA814dDEde5ce20afC245103A54edf

### Bsc Tesnet
* DAI: 0xF292D1ea9f5AAFFc24bC8831EF772cc4ab10cAEe
* Alpha: 0x5FADd1178f6962c4cB7369CBE30f45212aBC3e12
* Gamma Cards: 0x449392C509B218043b2d23262F06c834F2C3f5D9
* Gamma Cards NFT: 0x51A6Cf412915D82CCEC0063d498Af2D2f9fbCc52
* Gamma Packs: 0x9085a89Fe556f3180f328942832E44bDD4aeF54A
* Gamma Offers: 0xE513DC5C4c789Da7B308E4a76786Ed97eE44d4BE
* Gamma Tickets: 0xE8c40aaB664D9353753a80c3a68F011985E8D039

### OpBNB Testnet
* DAI: 0x8d2a7988FbF205724fcF40387A7A3b9eE89B97a1
* Alpha: 0x2BEBce69E67B9b4a29eb0BA363245f9B82004503
* Gamma Cards: 0xCcCC970eb4A307E75d6fe0C1D42f0Fd0C6cA6BeA
* Gamma Cards NFT: 0xab692D5a048849b0760586220848CB1129ef774E
* Gamma Packs: 0x87502b899F3f6eA979C9e7DD5abDA95ce4Fbc247
* Gamma Offers: 0x03388a96d37Aea7E302DB897aDacc9De433799c5
* Gamma Tickets: 0x5d8fF80112c1a9C6Ed1593405f9Fb145F72f38a9

### Mainet

(not yet)


## Contribution

### commit changes

The application uses a linter for commit messages, requiring them to be specified in the following format:

```
- [type] message
- [type] :icono: message
```

Example:

```
- commit -m [chore] add commitlinter
- commit -m [chore] :sparkles: add commitlinter (to commit with an icon, you can use [gitmoji](https://gitmoji.dev/))
```

The allowed standard types are:

```
- feat: A new feature for the user.
- fix: Fixes a bug that affects the user.
- perf: Changes that improve site performance.
- build: Changes in the build system, deployment tasks, or installation.
- ci: Changes in continuous integration.
- docs: Changes in documentation.
- refactor: Code refactoring such as variable or function name changes.
- style: Changes in formatting, tabs, spaces, or semicolons, etc.; do not affect the user.
- test: Adds tests or refactors an existing one.
- chore: Other changes that don't modify src or test files.
- revert: Reverts a previous commit.
```

Failing to comply with these standards will cause the pre-commit to fail. To remove the last commit (without losing changes), run:


```sh
git reset --soft HEAD~1
```

For more information, refer to: [commitlint](https://commitlint.js.org/#/).


## Links

* Mumbai Faucet: https://mumbaifaucet.com/

* BNB faucet: https://www.bnbchain.org/en/testnet-faucet

* Bridge (BNB-opBNB) Testnet: https://opbnb-testnet-bridge.bnbchain.org/deposit


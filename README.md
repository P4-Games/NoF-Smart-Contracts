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

# Deploy to Mumnbai 
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
* Alpha: 0x7C201e88e43b5FBEEfB77F966c2a5D2E09178B49
* Gamma Cards: 0x34658c07F05638E12793d0961595cBc72fA69452
* Gamma Cards NFT: 0x1b3aeb1652bf9a9ab269fa987feec34a65ef7b69
* Gamma Packs: 0xDc06FbD70b2159863d079aE282d69AEe8a88A18E
* Gamma Offers: 0x3Da346C40A0D90cf5642944613586439A3456d45
* Gamma Tickets: 0x7593aad3e13fBd27F113aad8688E8817Ac4f9A33

### Bsc Tesnet
* DAI: 0x83330b5803838604d85B7Cba393C930084F45A7d
* Alpha: 0x4eE8C9cc2cF081f11F56A264EF52e3FeaDe1b35e
* Gamma Cards: 0x25f85D878972f9506b4De49cEff480f627935521
* Gamma Cards NFT: 0x05863097c97d93F264A7713295DE11517164ACCc
* Gamma Packs: 0x71aA05fD8532a1395DffaB6FdA8be191fC8168FE
* Gamma Offers: 0x71aA05fD8532a1395DffaB6FdA8be191fC8168FE
* Gamma Tickets: 0xA5c3Cd20AB6FF1e299D93ee268370BCC19a32E71

### OpBNB Testnet
* DAI: 0x46480E0d10966Ea274831D9693a56f9c09D7339d
* Alpha: 0x36f19A5397DbE26b548b15C158f7a8e00979B408
* Gamma Cards: 0x2842c8FD88F801018E53dDDeBbC944aE377D0F72
* Gamma Cards NFT: 0x8df52bd59823F0080958AEB1DfdaBf230ef7EdEd
* Gamma Packs: 0x1116218412559628B67aa15F3c527D68F0A71b91
* Gamma Offers: 0xe810524F7C7C62A2201FdF1bCA20649Bd7D70844
* Gamma Tickets: 0xd9988C491805AE2573FA156b27CDE1a6f7B3E073


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


import "@nomiclabs/hardhat-ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getInitData, deployContracts } from "./common";


async function main() {
  try {
    const addresses: SignerWithAddress[] = await getInitData()
    await deployContracts(addresses)
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
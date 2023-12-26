// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat')
const ethers = require('ethers')

async function main() {
  const currentTimestampInSeconds = Math.round(Date.now() / 1000)
  const unlockTime = currentTimestampInSeconds + 60

  const lockedAmount = hre.ethers.parseEther('0.001')
  const ethers2 = require('ethers')
  const lock = await hre.ethers2.deployContract('Redeem')

  await lock.waitForDeployment()

  console.log(`deployed`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error)
  process.exitCode = 1
})

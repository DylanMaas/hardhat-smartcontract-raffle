const { ethers } = require("hardhat")

async function enterRaffle() {
    const accounts = await ethers.getSigners()
    signer = accounts[0]

    const raffleDeployment = await deployments.get("Raffle")
    raffle = await ethers.getContractAt(raffleDeployment.abi, raffleDeployment.address, signer)

    const entranceFee = await raffle.getEntranceFee()
    const tx = await raffle.enterRaffle({ value: entranceFee })
    await tx.wait(1)
    console.log("Entered!")
}

enterRaffle()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

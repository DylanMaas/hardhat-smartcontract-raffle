const { deployments, ethers, getNamedAccounts, network } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config") // depends on level in test script?

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Tests", function () {
          let raffle, signer, raffleEntranceFee

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              signer = accounts[0]

              const raffleDeployment = await deployments.get("Raffle")
              raffle = await ethers.getContractAt(
                  raffleDeployment.abi,
                  raffleDeployment.address,
                  signer,
              )
              raffleEntranceFee = await raffle.getEntranceFee()
          })

          describe("fulfillRandomWords", function () {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async () => {
                  // enter the raffle
                  console.log("Setting up test...")
                  const startingTimestamp = await raffle.getLatestTimestamp()
                  const accounts = await ethers.getSigners()
                  const signer = accounts[0]

                  console.log("Setting up listener...")
                  await new Promise(async (resolve, reject) => {
                      // setup listener before we enter the raffle (just in case the Blockchain moves really fast!)
                      raffle.once("winnerPicked", async () => {
                          console.log("winnerPicked event fired!")
                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerEndingBalance =
                                  await ethers.provider.getBalance(recentWinner)
                              const endingTimestamp = await raffle.getLatestTimestamp()

                              await expect(raffle.getPlayers(0)).to.be.reverted
                              assert.equal(recentWinner, signer.address)
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerEndingBalance,
                                  winnerStartingBalance + raffleEntranceFee,
                              )
                              assert(endingTimestamp > startingTimestamp)
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(e)
                          }
                      })
                      // then entering the raffle
                      console.log("Entering Raffle...")
                      const enterRaffleResponse = await raffle.enterRaffle({
                          value: raffleEntranceFee,
                      })
                      await enterRaffleResponse.wait(1)
                      console.log("Entered Raffle!")

                      const winnerStartingBalance = await ethers.provider.getBalance(signer.address)

                      // and this code won't complete until our listener has finished listening
                  })
              })
          })
      })

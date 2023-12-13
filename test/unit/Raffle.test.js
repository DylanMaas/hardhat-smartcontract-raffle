const { deployments, ethers, getNamedAccounts, network } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config") // depends on level in test script?

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, signer, vrfCoordinatorV2Mock, raffleEntranceFee, interval
          const chainId = network.config.chainId

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              signer = accounts[0]
              await deployments.fixture(["all"])

              const raffleDeployment = await deployments.get("Raffle")
              raffle = await ethers.getContractAt(
                  raffleDeployment.abi,
                  raffleDeployment.address,
                  signer,
              )

              const vrfCoordinatorV2MockDeployment = await deployments.get("VRFCoordinatorV2Mock")
              vrfCoordinatorV2Mock = await ethers.getContractAt(
                  vrfCoordinatorV2MockDeployment.abi,
                  vrfCoordinatorV2MockDeployment.address,
                  signer,
              )
              raffleEntranceFee = await raffle.getEntranceFee()
              interval = await raffle.getInterval()
          })

          // The xx.getxx functions refer to the viewing functions created in the contract

          describe("constructor", function () {
              it("Initializes the raffle correctly", async () => {
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])
              })
          })

          describe("enterRaffle", function () {
              it("Reverts when you don't pay enough", async () => {
                  await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__NotEnoughETHEntered",
                  )
              })
              it("Records players when they enter", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const playerFromContract = await raffle.getPlayers(0)
                  assert.equal(playerFromContract, signer.address)
              })
              it("Emits event on enter", async () => {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "raffleEnter",
                  )
              })
              //   it("Doesn't allow entrance when raffle is calculating", async () => {
              //       await raffle.enterRaffle({ value: raffleEntranceFee })
              //       await network.provider.send("evm_increaseTime", [Number(interval) + 1])
              //       await network.provider.request({ method: "evm_mine", params: [] })
              //       // We pretend to be a Chainlink keeper
              //       await raffle.performUpkeep("0x")
              //       await expect(
              //           raffle.enterRaffle({ value: raffleEntranceFee }),
              //       ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen")
              //   })
          })

          describe("checkUpkeep", function () {
              it("returns false if people haven't sent any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert(!upkeepNeeded)
              })
              //   it("returns false if raffle isn't open", async () => {
              //       await raffle.enterRaffle({ value: raffleEntranceFee })
              //       await network.provider.send("evm_increaseTime", [Number(interval) + 1])
              //       await network.provider.send("evm_mine", [])
              //       await raffle.performUpkeep("0x")
              //       const raffleState = await raffle.getRaffleState()
              //       const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
              //       assert.equal(raffleState.toString(), "1")
              //       assert.equal(upkeepNeeded, false)
              //   })

              it("returns false if enough time hasn't passed", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + -1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert(!upkeepNeeded)
              })
              it("returns true if enough time has passed, has players, has eth, and is open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert(upkeepNeeded)
              })
          })

          //   describe("performUpkeep", function () {
          //         it("can only run if checkupkeep is true", async () => {
          //             await raffle.enterRaffle({ value: raffleEntranceFee })
          //             await network.provider.send("evm_increaseTime", [Number(interval) + 1])
          //             await network.provider.send("evm_mine", [])
          //             const tx = await raffle.performUpkeep("0x")
          //             assert(tx)
          //         })
          //         it("revert when checkUpkeep is false", async () => {
          //             await expect(raffle.performUpkeep("0x")).to.be.revertedWithCustomError(
          //                 raffle,
          //                 "Raffle__UpkeepNotNeeded",
          //             )
          //         })
          //       it("updates the raffle state, emits an event, and calls the VRF coordinator", async () => {
          //           await raffle.enterRaffle({ value: raffleEntranceFee })
          //           await network.provider.send("evm_increaseTime", [Number(interval) + 1])
          //           await network.provider.send("evm_mine", [])
          //           const txResponse = await raffle.performUpkeep("0x")
          //           const txReceipt = await txResponse.wait(1)
          //           const requestId = txReceipt.logs[1].args.requestId
          //           const raffleState = await raffle.getRaffleState()
          //           assert(Number(requestId) > 0)
          //           assert(raffleState.toString() == "1")
          //       })
          //   })

          //   describe("fullfillRandomwords", function () {
          //       beforeEach(async () => {
          //           await raffle.enterRaffle({ value: raffleEntranceFee })
          //           await network.provider.send("evm_increaseTime", [Number(interval) + 1])
          //           await network.provider.send("evm_mine", [])
          //       })
          //       it("can only be called after performUpkeep", async () => {
          //           await expect(
          //               vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.target),
          //           ).to.be.revertedWith("nonexistent request")
          //           await expect(
          //               vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.target),
          //           ).to.be.revertedWith("nonexistent request")
          //       })
          //       // wayyyyy to big
          //       it("picks a winner, resets the lottery, and sends money", async () => {
          //           const additionalEntrants = 3
          //           const startingAccountIndex = 1 // since, deployer = 0
          //           const accounts = await ethers.getSigners()
          //           for (
          //               let i = startingAccountIndex;
          //               i < startingAccountIndex + additionalEntrants;
          //               i++
          //           ) {
          //               const accountConnectedRaffle = raffle.connect(accounts[i])
          //               await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
          //           }
          //           const startingTimestamp = await raffle.getLatestTimestamp()

          //           // performUpkeep (mock being Chainlink Keepers
          //           // fulfillRandomWords (mock being the Chainlink VRF)
          //           // we will have to wait for the fulfillRandomWords to be called
          //           await new Promise(async (resolve, reject) => {
          //               raffle.once("winnerPicked", async () => {
          //                   console.log("Found the event!")
          //                   try {
          //                       const recentWinner = await raffle.getRecentWinnter()
          //                       console.log(recentWinner)
          //                       console.log(accounts[0].target)
          //                       console.log(accounts[1].target)
          //                       console.log(accounts[2].target)
          //                       console.log(accounts[3].target)
          //                       const raffleState = await raffle.getRaffleState()
          //                       const endingTimestamp = await raffle.getLatestTimestamp()
          //                       const numPlayers = await raffle.getNumberOfPlayers()
          //                       assert.equal(numPlayers.toString(), "0")
          //                       assert.equal(raffleState.toString(), "0")
          //                       assert(endingTimestamp > startingTimestamp)
          //                   } catch (e) {
          //                       reject(e)
          //                   }
          //                   resolve()
          //               })
          //               // Setting up the listener

          //               // below, we will fire the event, and the listener will pick it up, and resolve
          //               const tx = await raffle.performUpkeep("0x")
          //               const txReceipt = await tx.wait(1)
          //               await vrfCoordinatorV2Mock.fulfillRandomWords(
          //                   txReceipt.events[1].args.requestId,
          //                   raffle.target,
          //               )
          //           })
          //       })
          //   })
      })

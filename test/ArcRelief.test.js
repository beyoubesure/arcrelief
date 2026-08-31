const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("ArcRelief", function () {
  const USDC = "0x3600000000000000000000000000000000000000";
  const u = (value) => ethers.parseUnits(String(value), 6);

  let organizer, funder, recipientA, recipientB;
  let relief, usdc;

  beforeEach(async function () {
    // Arc's USDC interface lives at a fixed address. Reset Hardhat before
    // injecting MockUSDC code so storage cannot leak between test cases.
    await network.provider.send("hardhat_reset");

    [organizer, funder, recipientA, recipientB] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mock = await MockUSDC.deploy();
    await mock.waitForDeployment();

    const runtimeCode = await ethers.provider.getCode(await mock.getAddress());
    await network.provider.send("hardhat_setCode", [USDC, runtimeCode]);

    usdc = await ethers.getContractAt("MockUSDC", USDC);
    await usdc.mint(organizer.address, u(1000));
    await usdc.mint(funder.address, u(1000));

    const ArcRelief = await ethers.getContractFactory("ArcRelief");
    relief = await ArcRelief.deploy();
    await relief.waitForDeployment();
  });

  async function createBasicCampaign(target = u(100)) {
    await relief.connect(organizer).createCampaign(
      "Emergency distribution",
      target,
      "test metadata"
    );
  }

  async function fund(caller, campaignId, amount) {
    await usdc.connect(caller).approve(await relief.getAddress(), amount);
    await relief.connect(caller).fundCampaign(campaignId, amount);
  }

  it("creates a campaign with correct initial state", async function () {
    await createBasicCampaign();
    const c = await relief.getCampaign(0);
    expect(c.organizer).to.equal(organizer.address);
    expect(c.targetAmount).to.equal(u(100));
    expect(c.fundedAmount).to.equal(0);
    expect(c.distributedAmount).to.equal(0);
    expect(c.status).to.equal(0);
  });

  it("rejects zero targets and empty titles", async function () {
    await expect(
      relief.connect(organizer).createCampaign("", u(1), "")
    ).to.be.revertedWith("EMPTY_TITLE");

    await expect(
      relief.connect(organizer).createCampaign("X", 0, "")
    ).to.be.revertedWith("INVALID_TARGET");
  });

  it("rejects zero recipient addresses and zero allocations", async function () {
    await createBasicCampaign();

    await expect(
      relief.connect(organizer).addRecipient(0, ethers.ZeroAddress, u(1), "A")
    ).to.be.revertedWith("ZERO_RECIPIENT");

    await expect(
      relief.connect(organizer).addRecipient(0, recipientA.address, 0, "A")
    ).to.be.revertedWith("INVALID_ALLOCATION");
  });

  it("tracks third-party contributions independently", async function () {
    await createBasicCampaign();
    await fund(organizer, 0, u(10));
    await fund(funder, 0, u(15));

    expect(await relief.contributions(0, organizer.address)).to.equal(u(10));
    expect(await relief.contributions(0, funder.address)).to.equal(u(15));

    const c = await relief.getCampaign(0);
    expect(c.fundedAmount).to.equal(u(25));
  });

  it("does not let one campaign spend another campaign's accounting balance", async function () {
    await createBasicCampaign();
    await relief.connect(organizer).createCampaign("Second", u(100), "");

    await relief.connect(organizer).addRecipient(0, recipientA.address, u(2), "A");
    await fund(organizer, 0, u(1));
    await fund(organizer, 1, u(10));

    // The contract physically holds 11 USDC, but campaign 0 only owns 1 USDC
    // in accounting terms and therefore cannot pay a 2 USDC allocation.
    await expect(
      relief.connect(organizer).payoutRecipient(0, 0)
    ).to.be.revertedWith("INSUFFICIENT_CAMPAIGN_FUNDS");

    expect(await relief.getCampaignAvailableBalance(0)).to.equal(u(1));
    expect(await relief.getCampaignAvailableBalance(1)).to.equal(u(10));
  });

  it("only organizer can add recipients or pay them", async function () {
    await createBasicCampaign();

    await expect(
      relief.connect(funder).addRecipient(0, recipientA.address, u(1), "A")
    ).to.be.revertedWith("NOT_ORGANIZER");

    await relief.connect(organizer).addRecipient(0, recipientA.address, u(1), "A");
    await fund(organizer, 0, u(1));

    await expect(
      relief.connect(funder).payoutRecipient(0, 0)
    ).to.be.revertedWith("NOT_ORGANIZER");
  });

  it("only organizer can close or cancel a campaign", async function () {
    await createBasicCampaign();

    await expect(
      relief.connect(funder).closeCampaign(0)
    ).to.be.revertedWith("NOT_ORGANIZER");

    await expect(
      relief.connect(funder).cancelCampaign(0)
    ).to.be.revertedWith("NOT_ORGANIZER");
  });

  it("pays a recipient exactly once", async function () {
    await createBasicCampaign();
    await relief.connect(organizer).addRecipient(0, recipientA.address, u(7), "A");
    await fund(funder, 0, u(7));

    const before = await usdc.balanceOf(recipientA.address);
    await relief.connect(organizer).payoutRecipient(0, 0);
    const after = await usdc.balanceOf(recipientA.address);

    expect(after - before).to.equal(u(7));

    const r = await relief.getRecipient(0, 0);
    expect(r.paidAmount).to.equal(u(7));

    await expect(
      relief.connect(organizer).payoutRecipient(0, 0)
    ).to.be.revertedWith("ALREADY_PAID");
  });

  it("reverts an underfunded payout", async function () {
    await createBasicCampaign();
    await relief.connect(organizer).addRecipient(0, recipientA.address, u(10), "A");
    await fund(organizer, 0, u(5));

    await expect(
      relief.connect(organizer).payoutRecipient(0, 0)
    ).to.be.revertedWith("INSUFFICIENT_CAMPAIGN_FUNDS");
  });

  it("batch payout is atomic and pays all selected recipients", async function () {
    await createBasicCampaign();
    await relief.connect(organizer).addRecipients(
      0,
      [recipientA.address, recipientB.address],
      [u(3), u(4)],
      ["A", "B"]
    );
    await fund(organizer, 0, u(7));

    const beforeA = await usdc.balanceOf(recipientA.address);
    const beforeB = await usdc.balanceOf(recipientB.address);

    await relief.connect(organizer).payoutBatch(0, [0, 1]);

    const afterA = await usdc.balanceOf(recipientA.address);
    const afterB = await usdc.balanceOf(recipientB.address);

    expect(afterA - beforeA).to.equal(u(3));
    expect(afterB - beforeB).to.equal(u(4));

    const c = await relief.getCampaign(0);
    expect(c.distributedAmount).to.equal(u(7));
  });

  it("reverts a duplicate batch index atomically", async function () {
    await createBasicCampaign();
    await relief.connect(organizer).addRecipient(0, recipientA.address, u(3), "A");
    await fund(organizer, 0, u(3));

    const before = await usdc.balanceOf(recipientA.address);

    await expect(
      relief.connect(organizer).payoutBatch(0, [0, 0])
    ).to.be.revertedWith("ALREADY_PAID");

    const after = await usdc.balanceOf(recipientA.address);
    expect(after - before).to.equal(0);

    const c = await relief.getCampaign(0);
    expect(c.distributedAmount).to.equal(0);
  });

  it("rejects malformed recipient batches", async function () {
    await createBasicCampaign();

    await expect(
      relief.connect(organizer).addRecipients(
        0,
        [recipientA.address],
        [u(1), u(2)],
        ["A"]
      )
    ).to.be.revertedWith("LENGTH_MISMATCH");
  });

  it("enforces recipient and payout batch size limits", async function () {
    await createBasicCampaign();

    const accounts = Array(51).fill(recipientA.address);
    const allocations = Array(51).fill(u(1));
    const labels = Array(51).fill("R");

    await expect(
      relief.connect(organizer).addRecipients(0, accounts, allocations, labels)
    ).to.be.revertedWith("INVALID_BATCH");

    await expect(
      relief.connect(organizer).payoutBatch(0, Array(51).fill(0))
    ).to.be.revertedWith("INVALID_BATCH");
  });

  it("cannot cancel after any payout", async function () {
    await createBasicCampaign();
    await relief.connect(organizer).addRecipient(0, recipientA.address, u(1), "A");
    await fund(organizer, 0, u(1));
    await relief.connect(organizer).payoutRecipient(0, 0);

    await expect(
      relief.connect(organizer).cancelCampaign(0)
    ).to.be.revertedWith("PAYOUT_ALREADY_STARTED");
  });

  it("returns cancelled contributions to their original funders", async function () {
    await createBasicCampaign();
    await fund(organizer, 0, u(10));
    await fund(funder, 0, u(15));

    await relief.connect(organizer).cancelCampaign(0);

    const organizerBefore = await usdc.balanceOf(organizer.address);
    const funderBefore = await usdc.balanceOf(funder.address);

    await relief.connect(organizer).claimCancelledRefund(0);
    await relief.connect(funder).claimCancelledRefund(0);

    expect((await usdc.balanceOf(organizer.address)) - organizerBefore).to.equal(u(10));
    expect((await usdc.balanceOf(funder.address)) - funderBefore).to.equal(u(15));
    expect(await relief.contributions(0, organizer.address)).to.equal(0);
    expect(await relief.contributions(0, funder.address)).to.equal(0);

    const c = await relief.getCampaign(0);
    expect(c.fundedAmount).to.equal(0);
  });

  it("does not let a wallet claim another contributor's cancelled deposit", async function () {
    await createBasicCampaign();
    await fund(funder, 0, u(5));
    await relief.connect(organizer).cancelCampaign(0);

    await expect(
      relief.connect(recipientA).claimCancelledRefund(0)
    ).to.be.revertedWith("NO_REFUND");

    expect(await relief.contributions(0, funder.address)).to.equal(u(5));
  });

  it("does not allow a contributor to claim a cancelled refund twice", async function () {
    await createBasicCampaign();
    await fund(funder, 0, u(5));
    await relief.connect(organizer).cancelCampaign(0);
    await relief.connect(funder).claimCancelledRefund(0);

    await expect(
      relief.connect(funder).claimCancelledRefund(0)
    ).to.be.revertedWith("NO_REFUND");
  });

  it("cannot close a campaign with undistributed funds", async function () {
    await createBasicCampaign();
    await fund(organizer, 0, u(1));

    await expect(
      relief.connect(organizer).closeCampaign(0)
    ).to.be.revertedWith("UNDISTRIBUTED_FUNDS");
  });

  it("treats targetAmount as informational for settlement", async function () {
    await createBasicCampaign(u(100));
    await relief.connect(organizer).addRecipient(0, recipientA.address, u(1), "A");
    await fund(organizer, 0, u(1));
    await relief.connect(organizer).payoutRecipient(0, 0);
    await relief.connect(organizer).closeCampaign(0);

    const c = await relief.getCampaign(0);
    expect(c.targetAmount).to.equal(u(100));
    expect(c.fundedAmount).to.equal(u(1));
    expect(c.distributedAmount).to.equal(u(1));
    expect(c.status).to.equal(1);
  });

  it("can close a fully settled campaign", async function () {
    await createBasicCampaign();
    await relief.connect(organizer).addRecipient(0, recipientA.address, u(1), "A");
    await fund(organizer, 0, u(1));
    await relief.connect(organizer).payoutRecipient(0, 0);
    await relief.connect(organizer).closeCampaign(0);

    const c = await relief.getCampaign(0);
    expect(c.status).to.equal(1);
  });

  it("blocks state-changing campaign operations after closure", async function () {
    await createBasicCampaign();
    await relief.connect(organizer).closeCampaign(0);

    await usdc.connect(organizer).approve(await relief.getAddress(), u(1));

    await expect(
      relief.connect(organizer).fundCampaign(0, u(1))
    ).to.be.revertedWith("CAMPAIGN_NOT_ACTIVE");

    await expect(
      relief.connect(organizer).addRecipient(0, recipientA.address, u(1), "A")
    ).to.be.revertedWith("CAMPAIGN_NOT_ACTIVE");

    await expect(
      relief.connect(organizer).cancelCampaign(0)
    ).to.be.revertedWith("CAMPAIGN_NOT_ACTIVE");
  });
});

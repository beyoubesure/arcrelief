const ARC = {
  chainIdHex: "0x4CEF52", // 5042002
  chainId: 5042002,
  rpcUrl: "https://rpc.testnet.arc.io",
  explorer: "https://testnet.arcscan.app",
  usdc: "0x3600000000000000000000000000000000000000"
};

let provider;
let signer;
let userAddress;
let relief;
let usdc;

const el = (id) => document.getElementById(id);
const activity = [];

function contractConfigured() {
  return ethers.isAddress(window.ARCRELIEF_ADDRESS || "") &&
    window.ARCRELIEF_ADDRESS !== ethers.ZeroAddress;
}

function formatUSDC(value) {
  return Number(ethers.formatUnits(value, 6)).toLocaleString(undefined, {
    maximumFractionDigits: 2
  });
}

function parseUSDC(value) {
  return ethers.parseUnits(String(value), 6);
}

function shortAddress(address) {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function addActivity(message, txHash) {
  activity.unshift({
    message,
    txHash,
    time: new Date()
  });
  activity.splice(8);
  renderActivity();
}

function renderActivity() {
  if (!activity.length) {
    el("activity").innerHTML =
      '<div class="activity-item">Transactions from this browser session will appear here.</div>';
    return;
  }

  el("activity").innerHTML = activity.map(item => `
    <div class="activity-item">
      ${item.message}
      ${item.txHash ? `<a target="_blank" href="${ARC.explorer}/tx/${item.txHash}">View on Arcscan ↗</a>` : ""}
      <small>${item.time.toLocaleTimeString()}</small>
    </div>
  `).join("");
}

async function switchToArc() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC.chainIdHex }]
    });
  } catch (err) {
    if (err.code !== 4902) throw err;

    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: ARC.chainIdHex,
        chainName: "Arc Testnet",
        nativeCurrency: {
          name: "USDC",
          symbol: "USDC",
          decimals: 18
        },
        rpcUrls: [ARC.rpcUrl],
        blockExplorerUrls: [ARC.explorer]
      }]
    });
  }
}

async function connect() {
  if (!window.ethereum) {
    alert("Install MetaMask or another EVM wallet first.");
    return;
  }

  await switchToArc();

  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  userAddress = await signer.getAddress();

  usdc = new ethers.Contract(ARC.usdc, window.USDC_ABI, signer);

  if (contractConfigured()) {
    relief = new ethers.Contract(
      window.ARCRELIEF_ADDRESS,
      window.ARCRELIEF_ABI,
      signer
    );
  }

  el("connectBtn").textContent = shortAddress(userAddress);
  el("networkPill").textContent = "Arc Testnet · connected";

  await refreshWalletBalance();
  await refreshCampaigns();
}

async function refreshWalletBalance() {
  if (!userAddress || !usdc) return;
  const balance = await usdc.balanceOf(userAddress);
  el("walletBalance").textContent = `${formatUSDC(balance)} USDC`;
}

function requireContract() {
  if (!relief) {
    alert("ArcRelief contract is not configured or wallet is not connected.");
    throw new Error("CONTRACT_NOT_READY");
  }
}

async function submitTx(label, fn) {
  try {
    const tx = await fn();
    addActivity(`${label} submitted · `, tx.hash);
    const receipt = await tx.wait();
    addActivity(`${label} confirmed in block ${receipt.blockNumber} · `, tx.hash);
    await refreshWalletBalance();
    await refreshCampaigns();
    return receipt;
  } catch (err) {
    console.error(err);
    const message =
      err?.shortMessage ||
      err?.reason ||
      err?.message ||
      "Transaction failed";
    alert(message);
    throw err;
  }
}

el("connectBtn").addEventListener("click", connect);

el("createForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  requireContract();

  const title = el("campaignTitle").value.trim();
  const target = parseUSDC(el("campaignTarget").value);
  const metadata = el("metadataURI").value.trim();

  await submitTx("Create campaign", () =>
    relief.createCampaign(title, target, metadata)
  );

  event.target.reset();
});

el("fundForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  requireContract();

  const campaignId = BigInt(el("fundCampaignId").value);
  const amount = parseUSDC(el("fundAmount").value);

  const allowance = await usdc.allowance(
    userAddress,
    window.ARCRELIEF_ADDRESS
  );

  if (allowance < amount) {
    await submitTx("Approve USDC", () =>
      usdc.approve(window.ARCRELIEF_ADDRESS, amount)
    );
  }

  await submitTx("Fund campaign", () =>
    relief.fundCampaign(campaignId, amount)
  );

  event.target.reset();
});

el("recipientForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  requireContract();

  const campaignId = BigInt(el("recipientCampaignId").value);
  const account = el("recipientAddress").value.trim();
  const amount = parseUSDC(el("recipientAmount").value);
  const label = el("recipientLabel").value.trim();

  if (!ethers.isAddress(account)) {
    alert("Enter a valid recipient address.");
    return;
  }

  await submitTx("Add recipient", () =>
    relief.addRecipient(campaignId, account, amount, label)
  );

  event.target.reset();
});

el("payoutForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  requireContract();

  const campaignId = BigInt(el("payoutCampaignId").value);
  const index = BigInt(el("recipientIndex").value);

  await submitTx("Recipient payout", () =>
    relief.payoutRecipient(campaignId, index)
  );

  event.target.reset();
});


el("batchPayoutForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  requireContract();

  const campaignId = BigInt(el("batchCampaignId").value);
  const raw = el("batchIndices").value
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);

  if (!raw.length) {
    alert("Enter at least one recipient index.");
    return;
  }

  let indices;
  try {
    indices = raw.map(v => BigInt(v));
  } catch {
    alert("Recipient indices must be whole numbers separated by commas.");
    return;
  }

  const unique = new Set(indices.map(String));
  if (unique.size !== indices.length) {
    alert("Remove duplicate recipient indices before submitting.");
    return;
  }

  if (indices.length > 50) {
    alert("Batch size cannot exceed 50 recipients.");
    return;
  }

  await submitTx("Batch payout", () =>
    relief.payoutBatch(campaignId, indices)
  );

  event.target.reset();
});

el("closeCampaignBtn").addEventListener("click", async () => {
  requireContract();
  const campaignId = BigInt(el("lifecycleCampaignId").value);
  await submitTx("Close campaign", () =>
    relief.closeCampaign(campaignId)
  );
});

el("cancelCampaignBtn").addEventListener("click", async () => {
  requireContract();
  const campaignId = BigInt(el("lifecycleCampaignId").value);

  const confirmed = confirm(
    "Cancel this campaign? Cancellation is only available before any payout. Contributors must reclaim their own deposits."
  );
  if (!confirmed) return;

  await submitTx("Cancel campaign", () =>
    relief.cancelCampaign(campaignId)
  );
});

el("claimRefundBtn").addEventListener("click", async () => {
  requireContract();
  const campaignId = BigInt(el("lifecycleCampaignId").value);

  const amount = await relief.contributions(campaignId, userAddress);
  if (amount === 0n) {
    alert("This wallet has no recorded contribution to reclaim.");
    return;
  }

  await submitTx("Claim cancelled refund", () =>
    relief.claimCancelledRefund(campaignId)
  );
});


el("refreshBtn").addEventListener("click", refreshCampaigns);

async function refreshCampaigns() {
  if (!contractConfigured()) {
    el("setupWarning").classList.remove("hidden");
    el("campaignMetric").textContent = "—";
    el("campaigns").innerHTML =
      '<div class="activity-item">Deploy the contract and configure its address to load live campaigns.</div>';
    return;
  }

  el("setupWarning").classList.add("hidden");

  if (!relief) {
    const readProvider = new ethers.JsonRpcProvider(ARC.rpcUrl);
    relief = new ethers.Contract(
      window.ARCRELIEF_ADDRESS,
      window.ARCRELIEF_ABI,
      readProvider
    );
  }

  try {
    const count = Number(await relief.campaignCount());
    el("campaignMetric").textContent = count;

    if (!count) {
      el("campaigns").innerHTML =
        '<div class="activity-item">No campaigns created yet.</div>';
      return;
    }

    const campaigns = [];

    for (let id = count - 1; id >= Math.max(0, count - 10); id--) {
      const c = await relief.getCampaign(id);
      const recipientCount = Number(await relief.getRecipientCount(id));

      const recipients = [];
      for (let i = 0; i < recipientCount; i++) {
        recipients.push(await relief.getRecipient(id, i));
      }

      campaigns.push({ id, c, recipients });
    }

    el("campaigns").innerHTML = campaigns.map(({ id, c, recipients }) => {
      const target = Number(ethers.formatUnits(c.targetAmount, 6));
      const funded = Number(ethers.formatUnits(c.fundedAmount, 6));
      const distributed = Number(ethers.formatUnits(c.distributedAmount, 6));
      const pct = target > 0 ? Math.min(100, funded / target * 100) : 0;
      const statuses = ["Active", "Closed", "Cancelled"];

      return `
        <article class="campaign">
          <div class="campaign-top">
            <div>
              <h4>#${id} · ${escapeHtml(c.title)}</h4>
              <div class="campaign-meta">
                Organizer ${shortAddress(c.organizer)} ·
                ${statuses[Number(c.status)]}
              </div>
            </div>
            <a target="_blank" href="${ARC.explorer}/address/${window.ARCRELIEF_ADDRESS}">
              Contract ↗
            </a>
          </div>

          <div class="progress"><div style="width:${pct}%"></div></div>

          <div class="numbers">
            <div>Target<strong>${target.toLocaleString()} USDC</strong></div>
            <div>Funded<strong>${funded.toLocaleString()} USDC</strong></div>
            <div>Distributed<strong>${distributed.toLocaleString()} USDC</strong></div>
          </div>

          <div class="recipients">
            ${recipients.length ? recipients.map((r, index) => `
              <div class="recipient-row">
                <span>#${index} ${escapeHtml(r.label || "Recipient")} · ${shortAddress(r.account)}</span>
                <span>${formatUSDC(r.paidAmount)} / ${formatUSDC(r.allocation)} USDC</span>
                <span>${r.paidAmount === r.allocation ? "Paid" : "Pending"}</span>
              </div>
            `).join("") : '<div class="campaign-meta">No recipients added yet.</div>'}
          </div>
        </article>
      `;
    }).join("");
  } catch (err) {
    console.error(err);
    el("campaigns").innerHTML =
      '<div class="activity-item">Could not load campaigns. Check the configured contract address and Arc Testnet status.</div>';
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

renderActivity();
refreshCampaigns();

if (window.ethereum) {
  window.ethereum.on?.("accountsChanged", () => location.reload());
  window.ethereum.on?.("chainChanged", () => location.reload());
}

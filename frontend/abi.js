window.ARCRELIEF_ABI = [
  "function campaignCount() view returns (uint256)",
  "function createCampaign(string title,uint256 targetAmount,string metadataURI) returns (uint256)",
  "function addRecipient(uint256 campaignId,address account,uint256 allocation,string label)",
  "function addRecipients(uint256 campaignId,address[] accounts,uint256[] allocations,string[] labels)",
  "function fundCampaign(uint256 campaignId,uint256 amount)",
  "function payoutRecipient(uint256 campaignId,uint256 recipientIndex)",
  "function payoutBatch(uint256 campaignId,uint256[] recipientIndices)",
  "function closeCampaign(uint256 campaignId)",
  "function cancelCampaign(uint256 campaignId)",
  "function claimCancelledRefund(uint256 campaignId)",
  "function contributions(uint256 campaignId,address contributor) view returns (uint256)",
  "function getCampaign(uint256 campaignId) view returns (tuple(address organizer,string title,string metadataURI,uint256 targetAmount,uint256 fundedAmount,uint256 distributedAmount,uint64 createdAt,uint8 status))",
  "function getRecipientCount(uint256 campaignId) view returns (uint256)",
  "function getRecipient(uint256 campaignId,uint256 recipientIndex) view returns (tuple(address account,uint256 allocation,uint256 paidAmount,string label))",
  "function getCampaignAvailableBalance(uint256 campaignId) view returns (uint256)",
  "event CampaignCreated(uint256 indexed campaignId,address indexed organizer,string title,uint256 targetAmount,string metadataURI)",
  "event CampaignFunded(uint256 indexed campaignId,address indexed funder,uint256 amount)",
  "event RecipientAdded(uint256 indexed campaignId,uint256 indexed recipientIndex,address indexed account,uint256 allocation,string label)",
  "event RecipientPaid(uint256 indexed campaignId,uint256 indexed recipientIndex,address indexed recipient,uint256 amount)",
  "event CampaignClosed(uint256 indexed campaignId)",
  "event CampaignCancelled(uint256 indexed campaignId)",
  "event CancelledContributionClaimed(uint256 indexed campaignId,address indexed contributor,uint256 amount)"
];

window.USDC_ABI = [
  "function approve(address spender,uint256 value) returns (bool)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

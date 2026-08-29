// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ArcRelief
/// @notice Experimental Arc Testnet treasury for transparent, multi-recipient USDC disbursements.
/// @dev Educational/testnet prototype. Not audited for production use.
contract ArcRelief {
    IERC20 public constant USDC =
        IERC20(0x3600000000000000000000000000000000000000);

    enum CampaignStatus {
        Active,
        Closed,
        Cancelled
    }

    struct Campaign {
        address organizer;
        string title;
        string metadataURI;
        uint256 targetAmount;
        uint256 fundedAmount;
        uint256 distributedAmount;
        uint64 createdAt;
        CampaignStatus status;
    }

    struct Recipient {
        address account;
        uint256 allocation;
        uint256 paidAmount;
        string label;
    }

    uint256 public campaignCount;

    mapping(uint256 => Campaign) private _campaigns;
    mapping(uint256 => Recipient[]) private _recipients;
    mapping(uint256 => mapping(address => uint256)) public contributions;

    bool private _entered;

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed organizer,
        string title,
        uint256 targetAmount,
        string metadataURI
    );

    event CampaignFunded(
        uint256 indexed campaignId,
        address indexed funder,
        uint256 amount
    );

    event RecipientAdded(
        uint256 indexed campaignId,
        uint256 indexed recipientIndex,
        address indexed account,
        uint256 allocation,
        string label
    );

    event RecipientPaid(
        uint256 indexed campaignId,
        uint256 indexed recipientIndex,
        address indexed recipient,
        uint256 amount
    );

    event CampaignClosed(uint256 indexed campaignId);
    event CampaignCancelled(uint256 indexed campaignId);
    event CancelledContributionClaimed(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    modifier nonReentrant() {
        require(!_entered, "REENTRANCY");
        _entered = true;
        _;
        _entered = false;
    }

    modifier onlyOrganizer(uint256 campaignId) {
        require(
            _campaigns[campaignId].organizer == msg.sender,
            "NOT_ORGANIZER"
        );
        _;
    }

    modifier campaignExists(uint256 campaignId) {
        require(campaignId < campaignCount, "CAMPAIGN_NOT_FOUND");
        _;
    }

    function createCampaign(
        string calldata title,
        uint256 targetAmount,
        string calldata metadataURI
    ) external returns (uint256 campaignId) {
        require(bytes(title).length > 0, "EMPTY_TITLE");
        require(targetAmount > 0, "INVALID_TARGET");

        campaignId = campaignCount++;

        _campaigns[campaignId] = Campaign({
            organizer: msg.sender,
            title: title,
            metadataURI: metadataURI,
            targetAmount: targetAmount,
            fundedAmount: 0,
            distributedAmount: 0,
            createdAt: uint64(block.timestamp),
            status: CampaignStatus.Active
        });

        emit CampaignCreated(
            campaignId,
            msg.sender,
            title,
            targetAmount,
            metadataURI
        );
    }

    function addRecipient(
        uint256 campaignId,
        address account,
        uint256 allocation,
        string calldata label
    )
        external
        campaignExists(campaignId)
        onlyOrganizer(campaignId)
    {
        _addRecipient(campaignId, account, allocation, label);
    }

    function addRecipients(
        uint256 campaignId,
        address[] calldata accounts,
        uint256[] calldata allocations,
        string[] calldata labels
    )
        external
        campaignExists(campaignId)
        onlyOrganizer(campaignId)
    {
        require(
            accounts.length == allocations.length &&
                accounts.length == labels.length,
            "LENGTH_MISMATCH"
        );
        require(accounts.length > 0 && accounts.length <= 50, "INVALID_BATCH");

        for (uint256 i = 0; i < accounts.length; i++) {
            _addRecipient(
                campaignId,
                accounts[i],
                allocations[i],
                labels[i]
            );
        }
    }

    function _addRecipient(
        uint256 campaignId,
        address account,
        uint256 allocation,
        string memory label
    ) internal {
        Campaign storage campaign = _campaigns[campaignId];

        require(campaign.status == CampaignStatus.Active, "CAMPAIGN_NOT_ACTIVE");
        require(account != address(0), "ZERO_RECIPIENT");
        require(allocation > 0, "INVALID_ALLOCATION");

        uint256 recipientIndex = _recipients[campaignId].length;
        _recipients[campaignId].push(
            Recipient({
                account: account,
                allocation: allocation,
                paidAmount: 0,
                label: label
            })
        );

        emit RecipientAdded(
            campaignId,
            recipientIndex,
            account,
            allocation,
            label
        );
    }

    /// @notice Fund a campaign through Arc native USDC's ERC-20 interface.
    /// @dev Funder must approve this contract first. Arc USDC ERC-20 interface uses 6 decimals.
    function fundCampaign(
        uint256 campaignId,
        uint256 amount
    )
        external
        campaignExists(campaignId)
        nonReentrant
    {
        Campaign storage campaign = _campaigns[campaignId];

        require(campaign.status == CampaignStatus.Active, "CAMPAIGN_NOT_ACTIVE");
        require(amount > 0, "INVALID_AMOUNT");

        bool ok = USDC.transferFrom(msg.sender, address(this), amount);
        require(ok, "USDC_TRANSFER_FAILED");

        campaign.fundedAmount += amount;
        contributions[campaignId][msg.sender] += amount;

        emit CampaignFunded(campaignId, msg.sender, amount);
    }

    function payoutRecipient(
        uint256 campaignId,
        uint256 recipientIndex
    )
        external
        campaignExists(campaignId)
        onlyOrganizer(campaignId)
        nonReentrant
    {
        _payout(campaignId, recipientIndex);
    }

    /// @notice Pays multiple recipients in a single organizer transaction.
    function payoutBatch(
        uint256 campaignId,
        uint256[] calldata recipientIndices
    )
        external
        campaignExists(campaignId)
        onlyOrganizer(campaignId)
        nonReentrant
    {
        require(
            recipientIndices.length > 0 && recipientIndices.length <= 50,
            "INVALID_BATCH"
        );

        for (uint256 i = 0; i < recipientIndices.length; i++) {
            _payout(campaignId, recipientIndices[i]);
        }
    }

    function _payout(
        uint256 campaignId,
        uint256 recipientIndex
    ) internal {
        Campaign storage campaign = _campaigns[campaignId];

        require(campaign.status == CampaignStatus.Active, "CAMPAIGN_NOT_ACTIVE");
        require(
            recipientIndex < _recipients[campaignId].length,
            "RECIPIENT_NOT_FOUND"
        );

        Recipient storage recipient = _recipients[campaignId][recipientIndex];

        uint256 amount = recipient.allocation - recipient.paidAmount;
        require(amount > 0, "ALREADY_PAID");

        uint256 remaining =
            campaign.fundedAmount - campaign.distributedAmount;
        require(remaining >= amount, "INSUFFICIENT_CAMPAIGN_FUNDS");

        recipient.paidAmount += amount;
        campaign.distributedAmount += amount;

        bool ok = USDC.transfer(recipient.account, amount);
        require(ok, "USDC_TRANSFER_FAILED");

        emit RecipientPaid(
            campaignId,
            recipientIndex,
            recipient.account,
            amount
        );
    }

    /// @notice Closes a fully settled campaign.
    /// @dev Prevents funds from becoming stranded in a closed campaign.
    function closeCampaign(
        uint256 campaignId
    )
        external
        campaignExists(campaignId)
        onlyOrganizer(campaignId)
    {
        Campaign storage campaign = _campaigns[campaignId];
        require(campaign.status == CampaignStatus.Active, "CAMPAIGN_NOT_ACTIVE");
        require(
            campaign.fundedAmount == campaign.distributedAmount,
            "UNDISTRIBUTED_FUNDS"
        );

        campaign.status = CampaignStatus.Closed;
        emit CampaignClosed(campaignId);
    }

    /// @notice Cancels a campaign before any payouts have occurred.
    /// @dev Contributors reclaim their own deposits individually using claimCancelledRefund().
    function cancelCampaign(
        uint256 campaignId
    )
        external
        campaignExists(campaignId)
        onlyOrganizer(campaignId)
    {
        Campaign storage campaign = _campaigns[campaignId];
        require(campaign.status == CampaignStatus.Active, "CAMPAIGN_NOT_ACTIVE");
        require(campaign.distributedAmount == 0, "PAYOUT_ALREADY_STARTED");

        campaign.status = CampaignStatus.Cancelled;

        emit CampaignCancelled(campaignId);
    }

    /// @notice Returns a contributor's full deposit after a pre-payout cancellation.
    function claimCancelledRefund(
        uint256 campaignId
    )
        external
        campaignExists(campaignId)
        nonReentrant
    {
        Campaign storage campaign = _campaigns[campaignId];
        require(campaign.status == CampaignStatus.Cancelled, "NOT_CANCELLED");

        uint256 amount = contributions[campaignId][msg.sender];
        require(amount > 0, "NO_REFUND");

        contributions[campaignId][msg.sender] = 0;
        campaign.fundedAmount -= amount;

        bool ok = USDC.transfer(msg.sender, amount);
        require(ok, "USDC_REFUND_FAILED");

        emit CancelledContributionClaimed(
            campaignId,
            msg.sender,
            amount
        );
    }

    function getCampaign(
        uint256 campaignId
    )
        external
        view
        campaignExists(campaignId)
        returns (Campaign memory)
    {
        return _campaigns[campaignId];
    }

    function getRecipientCount(
        uint256 campaignId
    )
        external
        view
        campaignExists(campaignId)
        returns (uint256)
    {
        return _recipients[campaignId].length;
    }

    function getRecipient(
        uint256 campaignId,
        uint256 recipientIndex
    )
        external
        view
        campaignExists(campaignId)
        returns (Recipient memory)
    {
        require(
            recipientIndex < _recipients[campaignId].length,
            "RECIPIENT_NOT_FOUND"
        );
        return _recipients[campaignId][recipientIndex];
    }

    function getCampaignAvailableBalance(
        uint256 campaignId
    )
        external
        view
        campaignExists(campaignId)
        returns (uint256)
    {
        Campaign storage campaign = _campaigns[campaignId];
        return campaign.fundedAmount - campaign.distributedAmount;
    }
}

interface IERC20 {
    function approve(address spender, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}


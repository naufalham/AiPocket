// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./interfaces/IAgentIdentity.sol";

/// @title AgentIdentity - ERC-8004 Identity Registry for AgentBet
/// @notice Each AI agent gets an ERC-721 NFT identity with on-chain metadata
/// @dev Implements ERC-8004 Identity Registry on top of ERC-721
contract AgentIdentity is IAgentIdentity, ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    uint256 public constant MIN_STAKE = 0.001 ether;

    uint256 private _nextAgentId;

    // ERC-8004: agentId -> active wallet address
    mapping(uint256 => address) private _agentWallets;

    // Reverse lookup: wallet -> agentId
    mapping(address => uint256) private _walletToAgent;
    mapping(address => bool) private _hasAgent;

    // ERC-8004: agentId -> key -> value
    mapping(uint256 => mapping(string => bytes)) private _metadata;

    // Staking
    mapping(uint256 => uint256) private _stakes;

    // ============ Constructor ============

    constructor() ERC721("AgentBet Agents", "AGENT") Ownable(msg.sender) {}

    // ============ Registration (ERC-8004) ============

    /// @inheritdoc IAgentIdentity
    function register(
        string calldata agentURI,
        MetadataEntry[] calldata metadata
    ) external payable returns (uint256 agentId) {
        require(!_hasAgent[msg.sender], "Already registered");
        require(msg.value >= MIN_STAKE, "Insufficient stake");

        agentId = _nextAgentId++;

        // Mint ERC-721 identity NFT
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);

        // Map wallet
        _agentWallets[agentId] = msg.sender;
        _walletToAgent[msg.sender] = agentId;
        _hasAgent[msg.sender] = true;

        // Store stake
        _stakes[agentId] = msg.value;

        // Store metadata
        for (uint256 i = 0; i < metadata.length; i++) {
            _metadata[agentId][metadata[i].key] = metadata[i].value;
            emit MetadataSet(agentId, metadata[i].key);
        }

        emit AgentRegistered(agentId, msg.sender, agentURI);
    }

    // ============ Identity Management (ERC-8004) ============

    /// @inheritdoc IAgentIdentity
    function setAgentURI(uint256 agentId, string calldata newURI) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        _setTokenURI(agentId, newURI);
        emit URIUpdated(agentId, newURI);
    }

    /// @inheritdoc IAgentIdentity
    function setAgentWallet(
        uint256 agentId,
        address newWallet,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        require(block.timestamp <= deadline, "Signature expired");
        require(!_hasAgent[newWallet], "Wallet already registered");
        require(newWallet != address(0), "Zero address");

        // Verify the new wallet consents via ECDSA signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(agentId, newWallet, deadline, address(this), block.chainid)
        );
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);
        require(signer == newWallet, "Invalid signature");

        // Clear old wallet mapping
        address oldWallet = _agentWallets[agentId];
        if (oldWallet != address(0)) {
            _hasAgent[oldWallet] = false;
            delete _walletToAgent[oldWallet];
        }

        // Set new wallet mapping
        _agentWallets[agentId] = newWallet;
        _walletToAgent[newWallet] = agentId;
        _hasAgent[newWallet] = true;

        emit WalletUpdated(agentId, newWallet);
    }

    /// @inheritdoc IAgentIdentity
    function getAgentWallet(uint256 agentId) external view returns (address) {
        return _agentWallets[agentId];
    }

    /// @inheritdoc IAgentIdentity
    function unsetAgentWallet(uint256 agentId) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        address oldWallet = _agentWallets[agentId];
        if (oldWallet != address(0)) {
            _hasAgent[oldWallet] = false;
            delete _walletToAgent[oldWallet];
        }
        delete _agentWallets[agentId];
    }

    // ============ Metadata (ERC-8004) ============

    /// @inheritdoc IAgentIdentity
    function getMetadata(uint256 agentId, string calldata key) external view returns (bytes memory) {
        return _metadata[agentId][key];
    }

    /// @inheritdoc IAgentIdentity
    function setMetadata(uint256 agentId, string calldata key, bytes calldata value) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        _metadata[agentId][key] = value;
        emit MetadataSet(agentId, key);
    }

    // ============ Staking ============

    /// @inheritdoc IAgentIdentity
    function addStake(uint256 agentId) external payable {
        require(_ownerOf(agentId) != address(0), "Agent does not exist");
        require(msg.value > 0, "Zero value");
        _stakes[agentId] += msg.value;
    }

    /// @inheritdoc IAgentIdentity
    function getStake(uint256 agentId) external view returns (uint256) {
        return _stakes[agentId];
    }

    // ============ Reverse Lookups ============

    /// @inheritdoc IAgentIdentity
    function isRegisteredAgent(address wallet) external view returns (bool) {
        return _hasAgent[wallet];
    }

    /// @inheritdoc IAgentIdentity
    function getAgentIdByWallet(address wallet) external view returns (uint256) {
        require(_hasAgent[wallet], "Not registered");
        return _walletToAgent[wallet];
    }

    /// @inheritdoc IAgentIdentity
    function totalAgents() external view returns (uint256) {
        return totalSupply();
    }

    // ============ ERC-721 Overrides ============

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }
}

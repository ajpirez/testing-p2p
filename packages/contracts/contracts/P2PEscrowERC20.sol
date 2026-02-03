// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * P2P Escrow for ERC-20 tokens (e.g. USDT, USDC).
 * Seller must approve this contract for the token before calling fund().
 * Same event layout as P2PEscrow for subgraph compatibility.
 */
contract P2PEscrowERC20 is ReentrancyGuard {
  using SafeERC20 for IERC20;

  enum Status {
    NONE,
    FUNDED,
    RELEASED,
    REFUNDED
  }

  struct Escrow {
    address seller;
    address buyer;
    uint256 amount;
    Status status;
  }

  IERC20 public immutable token;
  mapping(bytes32 => Escrow) public escrows;

  event Funded(bytes32 indexed orderId, address indexed seller, address indexed buyer, uint256 amount);
  event Released(bytes32 indexed orderId);
  event Refunded(bytes32 indexed orderId);

  constructor(address _token) {
    require(_token != address(0), "token zero");
    token = IERC20(_token);
  }

  function fund(bytes32 orderId, address buyer, uint256 amount) external nonReentrant {
    require(amount > 0, "amount=0");
    Escrow storage e = escrows[orderId];
    require(e.status == Status.NONE, "already exists");

    e.seller = msg.sender;
    e.buyer = buyer;
    e.amount = amount;
    e.status = Status.FUNDED;

    token.safeTransferFrom(msg.sender, address(this), amount);

    emit Funded(orderId, msg.sender, buyer, amount);
  }

  function release(bytes32 orderId) external nonReentrant {
    Escrow storage e = escrows[orderId];
    require(e.status == Status.FUNDED, "not funded");
    require(msg.sender == e.seller, "only seller");

    e.status = Status.RELEASED;

    token.safeTransfer(e.buyer, e.amount);

    emit Released(orderId);
  }

  function refund(bytes32 orderId) external nonReentrant {
    Escrow storage e = escrows[orderId];
    require(e.status == Status.FUNDED, "not funded");
    require(msg.sender == e.seller, "only seller");

    e.status = Status.REFUNDED;

    token.safeTransfer(e.seller, e.amount);

    emit Refunded(orderId);
  }
}

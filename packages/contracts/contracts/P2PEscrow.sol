// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * P2P Escrow (MVP)
 *
 * NOTA: este contrato es intencionalmente simple para entorno local.
 * - Hold: el seller deposita (ETH nativo) para una orden (orderId)
 * - Release: el seller libera al buyer
 * - Refund: el seller recupera si se cancela/expira off-chain
 *
 * Extensión futura:
 * - Disputas con árbitro/DAO
 * - Tokens ERC20
 * - Timeouts on-chain
 */
contract P2PEscrow is ReentrancyGuard {
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

  mapping(bytes32 => Escrow) public escrows;

  event Funded(bytes32 indexed orderId, address indexed seller, address indexed buyer, uint256 amount);
  event Released(bytes32 indexed orderId);
  event Refunded(bytes32 indexed orderId);

  function fund(bytes32 orderId, address buyer) external payable nonReentrant {
    require(msg.value > 0, "amount=0");
    Escrow storage e = escrows[orderId];
    require(e.status == Status.NONE, "already exists");

    e.seller = msg.sender;
    e.buyer = buyer;
    e.amount = msg.value;
    e.status = Status.FUNDED;

    emit Funded(orderId, msg.sender, buyer, msg.value);
  }

  function release(bytes32 orderId) external nonReentrant {
    Escrow storage e = escrows[orderId];
    require(e.status == Status.FUNDED, "not funded");
    require(msg.sender == e.seller, "only seller");

    e.status = Status.RELEASED;

    (bool ok, ) = e.buyer.call{value: e.amount}("");
    require(ok, "transfer failed");

    emit Released(orderId);
  }

  function refund(bytes32 orderId) external nonReentrant {
    Escrow storage e = escrows[orderId];
    require(e.status == Status.FUNDED, "not funded");
    require(msg.sender == e.seller, "only seller");

    e.status = Status.REFUNDED;

    (bool ok, ) = e.seller.call{value: e.amount}("");
    require(ok, "transfer failed");

    emit Refunded(orderId);
  }
}


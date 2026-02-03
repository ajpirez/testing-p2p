/**
 * Mappings del subgraph P2PEscrow (nativo) y P2PEscrowERC20 (USDT/USDC).
 * The Graph ejecuta estos handlers cuando los contratos emiten Funded, Released o Refunded.
 * Persisten una entidad Escrow por orderId consultable por GraphQL.
 */
import { Funded, Released, Refunded } from "../generated/P2PEscrow/P2PEscrow";
import {
  Funded as FundedERC20,
  Released as ReleasedERC20,
  Refunded as RefundedERC20,
} from "../generated/P2PEscrowERC20/P2PEscrowERC20";
import { Escrow } from "../generated/schema";
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";

function applyFunded(
  orderId: Bytes,
  seller: Address,
  buyer: Address,
  amount: BigInt,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  txHash: Bytes
): void {
  let escrow = Escrow.load(orderId);
  if (escrow == null) {
    escrow = new Escrow(orderId);
  }
  escrow.seller = seller;
  escrow.buyer = buyer;
  escrow.amount = amount;
  escrow.status = "FUNDED";
  escrow.fundedAtBlock = blockNumber;
  escrow.fundedAtTimestamp = blockTimestamp;
  escrow.fundTxHash = txHash;
  escrow.save();
}

function applyReleased(
  orderId: Bytes,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  txHash: Bytes
): void {
  const escrow = Escrow.load(orderId);
  if (escrow == null) return;
  escrow.status = "RELEASED";
  escrow.closedAtBlock = blockNumber;
  escrow.closedAtTimestamp = blockTimestamp;
  escrow.closedTxHash = txHash;
  escrow.save();
}

function applyRefunded(
  orderId: Bytes,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  txHash: Bytes
): void {
  const escrow = Escrow.load(orderId);
  if (escrow == null) return;
  escrow.status = "REFUNDED";
  escrow.closedAtBlock = blockNumber;
  escrow.closedAtTimestamp = blockTimestamp;
  escrow.closedTxHash = txHash;
  escrow.save();
}

export function handleFunded(event: Funded): void {
  applyFunded(
    event.params.orderId,
    event.params.seller,
    event.params.buyer,
    event.params.amount,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash
  );
}

export function handleReleased(event: Released): void {
  applyReleased(
    event.params.orderId,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash
  );
}

export function handleRefunded(event: Refunded): void {
  applyRefunded(
    event.params.orderId,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash
  );
}

export function handleFundedERC20(event: FundedERC20): void {
  applyFunded(
    event.params.orderId,
    event.params.seller,
    event.params.buyer,
    event.params.amount,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash
  );
}

export function handleReleasedERC20(event: ReleasedERC20): void {
  applyReleased(
    event.params.orderId,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash
  );
}

export function handleRefundedERC20(event: RefundedERC20): void {
  applyRefunded(
    event.params.orderId,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash
  );
}

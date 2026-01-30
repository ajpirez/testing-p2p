/**
 * Mappings del subgraph P2PEscrow.
 * The Graph ejecuta estos handlers cuando el contrato emite Funded, Released o Refunded.
 * Persisten una entidad Escrow por orderId consultable por GraphQL.
 */
import { Funded, Released, Refunded } from "../generated/P2PEscrow/P2PEscrow";
import { Escrow } from "../generated/schema";

export function handleFunded(event: Funded): void {
  const id = event.params.orderId;
  let escrow = Escrow.load(id);
  if (escrow == null) {
    escrow = new Escrow(id);
  }
  escrow.seller = event.params.seller;
  escrow.buyer = event.params.buyer;
  escrow.amount = event.params.amount;
  escrow.status = "FUNDED";
  escrow.fundedAtBlock = event.block.number;
  escrow.fundedAtTimestamp = event.block.timestamp;
  escrow.save();
}

export function handleReleased(event: Released): void {
  const escrow = Escrow.load(event.params.orderId);
  if (escrow == null) return;
  escrow.status = "RELEASED";
  escrow.closedAtBlock = event.block.number;
  escrow.closedAtTimestamp = event.block.timestamp;
  escrow.save();
}

export function handleRefunded(event: Refunded): void {
  const escrow = Escrow.load(event.params.orderId);
  if (escrow == null) return;
  escrow.status = "REFUNDED";
  escrow.closedAtBlock = event.block.number;
  escrow.closedAtTimestamp = event.block.timestamp;
  escrow.save();
}

// Modified for standalone community distribution; see NOTICE.
import {
  type DetailSlotConfig,
  DETAIL_SLOT_CONFIGS,
} from "@/src/components/canvas/chat-panel/canvas-detail-config";
import type { PickedObjectAttachment } from "@/src/components/canvas/chat-panel/canvas-chat-session";

export function getDetailSlotTargetIndexes(
  slotIndex: number,
  slotConfigs: DetailSlotConfig[] = DETAIL_SLOT_CONFIGS
): number[] {
  if (slotIndex < 0 || slotIndex >= slotConfigs.length) return [];
  const slotRole = slotConfigs[slotIndex]?.role;
  const sameRoleIndexes = slotConfigs
    .map((slot, index) => (slot.role === slotRole ? index : -1))
    .filter((index) => index >= 0);
  const startOffset = sameRoleIndexes.indexOf(slotIndex);
  return startOffset >= 0 ? sameRoleIndexes.slice(startOffset) : sameRoleIndexes;
}

export function applyDetailSlotAttachment(
  current: Array<PickedObjectAttachment | null>,
  slotIndex: number,
  attachment: PickedObjectAttachment | null
): Array<PickedObjectAttachment | null> {
  const next = [...current];
  if (slotIndex < 0) return next;
  next[slotIndex] = attachment;
  return next;
}

export function fillDetailSlotAttachments(
  current: Array<PickedObjectAttachment | null>,
  targetIndexes: number[],
  attachments: PickedObjectAttachment[]
): {
  slots: Array<PickedObjectAttachment | null>;
  filledCount: number;
} {
  const next = [...current];
  let filledCount = 0;
  for (let i = 0; i < targetIndexes.length && i < attachments.length; i += 1) {
    const index = targetIndexes[i]!;
    if (index < 0) continue;
    next[index] = attachments[i]!;
    filledCount += 1;
  }
  return { slots: next, filledCount };
}

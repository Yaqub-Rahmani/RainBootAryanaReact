import { OWNER_CREATE_CONFIG } from "./ownerCreateRegistry";

export async function createOwner(ownerType, payload, ownerId) {
  const cfg = OWNER_CREATE_CONFIG[ownerType];
  if (!cfg) throw new Error("Desteklenmeyen ownerType");

  const dto = cfg.dto(payload, ownerId);
  cfg.required?.(dto);

  await cfg.add(dto);
  return dto.id || ownerId;
}

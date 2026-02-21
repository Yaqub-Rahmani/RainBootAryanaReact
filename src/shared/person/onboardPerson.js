import { addressService } from "../../features/address/services/addressService";
import { biometricService } from "../../features/fingerprint/services/biometricService";
import { imageService } from "../../features/images/services/imageService";
import { mediaAssetService } from "../../features/mediaAsset/services/mediaAssetService";
import { phoneService } from "../../features/phones/services/phoneService";
import { createOwner } from "./createOwner";
import { guid, isDataUrl, isPlaceholderAsset, MediaKind, nowIso, OwnerType } from "./onboardConstants";

const ownerBaseFolder = (ownerType, ownerId) => {
  const base =
    ownerType === OwnerType.FranchiseOwner ? "franchise-owners" :
    ownerType === OwnerType.Tenant         ? "tenants" :
    ownerType === OwnerType.FamilyMember   ? "family-members" :
    ownerType === OwnerType.Employee       ? "employees" :
    "owners";
  return `/storage/${base}/${ownerId}`;
};

const subfolders = {
  avatar: "avatars",
  idFront: "id-cards/front",
  idBack: "id-cards/back",
  finger: "fingers",
};

export async function onboardPerson(payload, ownerType = OwnerType.FranchiseOwner) {
  const ownerId = payload.id || guid();
  const createdAt = payload.createdAt || nowIso();
  const baseFolder = ownerBaseFolder(ownerType, ownerId);

  // 1) IMAGES — her görseli kendi alt klasörüne yaz
  async function uploadIfDataUrl(dataUrl, sub) {
    if (!isDataUrl(dataUrl)) return null;
    const body = {
      photoFolderUrl: `${baseFolder}/${sub}`, // <- ayrı klasör
      baseFile: dataUrl,                      // API data URL bekliyor
    };
    const res = await imageService.saveIfDataUrl(body);
    const r = res?.data ?? res;
    return r?.storageUrl || r?.url || r?.path || null;
  }

  const avatarUrl = await uploadIfDataUrl(payload.avatarProfile, subfolders.avatar);
  const idFrontUrl = await uploadIfDataUrl(
    !isPlaceholderAsset(payload.idCardFront) ? payload.idCardFront : null,
    subfolders.idFront
  );
  const idBackUrl = await uploadIfDataUrl(
    !isPlaceholderAsset(payload.idCardBack) ? payload.idCardBack : null,
    subfolders.idBack
  );
  const fingerBmpUrl = await uploadIfDataUrl(payload.fingerprintBitmapPngBase64, subfolders.finger);

  // 2) OWNER
  await createOwner(ownerType, payload, ownerId);

const phoneNow = nowIso();

const PhoneLabel = { Primary: 1, Secondary: 2, Mobile: 3, Office: 4 };

const normalizePhone = (v) =>
  String(v || "")
    .replace(/[\s()-]/g, "")
    .trim();

const addPhoneIf = async (num, isPrimary) => {
  const n = normalizePhone(num);
  if (!n) return;

  const dto = {
    id: guid(),
    ownerType,          // int (MediaOwnerType)
    ownerId,            // guid
    number: n,          // BE: string
    label: isPrimary ? PhoneLabel.Primary : PhoneLabel.Secondary, // ⬅️ NUMERIC ENUM
    isVerified: false,  // başlangıçta doğrulanmamış
    isPrimary: !!isPrimary,
    createdAt: phoneNow,
  };

  await phoneService.add(dto);
};

await addPhoneIf(payload.phone, true);
await addPhoneIf(payload.phone2, false);

  const mediaIds = {};
  async function addMedia(kind, storageUrl, isPrimary = false) {
    if (!storageUrl) return null;
    const dto = {
      id: guid(),
      ownerType,
      ownerId,
      kind,
      storageUrl,
      hashChecksum: "",
      isPrimary,
      createdAt,
    };
    await mediaAssetService.add(dto);
    mediaIds[kind] = dto.id;
    return dto.id;
  }

  await addMedia(MediaKind.Avatar,     avatarUrl, true);
  await addMedia(MediaKind.IdFront,    idFrontUrl);
  await addMedia(MediaKind.IdBack,     idBackUrl);
  const fingerBmpId = await addMedia(MediaKind.FingerBitmap, fingerBmpUrl);

  // 5) ADDRESS
  if (payload.provinceId && payload.districtId) {
    const addrDto = {
      id: guid(),
      ownerType,
      ownerId,
      provinceId: Number(payload.provinceId),
      districtId: Number(payload.districtId),
      neighborhood: null,
      street: null,
      buildingNo: null,
      unitNo: null,
      postalCode: null,
      notes: null,
      line1: payload.address || "",
      isPrimary: true,
    };
    await addressService.add(addrDto);
  }

  // 6) BIOMETRIC
  if (payload.fingerprintTemplateBase64) {
    const bioDto = {
      id: guid(),
      ownerType,
      ownerId,
      type: 1, // Fingerprint
      template: payload.fingerprintTemplateBase64,
      relatedMediaAssetId: fingerBmpId || null,
      isActive: true,
      createdAt,
    };
    await biometricService.add(bioDto);
  }

  return {
    ownerId,
    ownerType,
    folders: {
      base: baseFolder,
      avatar: `${baseFolder}/${subfolders.avatar}`,
      idFront: `${baseFolder}/${subfolders.idFront}`,
      idBack: `${baseFolder}/${subfolders.idBack}`,
      finger: `${baseFolder}/${subfolders.finger}`,
    },
    media: {
      avatarUrl, idFrontUrl, idBackUrl, fingerBmpUrl, ids: mediaIds,
    },
  };
}
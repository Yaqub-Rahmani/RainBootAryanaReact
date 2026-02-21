import { isDataUrl, nowIso, OwnerType, MediaKind } from "./outflowConstants";

// projendeki gerçek servis yollarını kullan
import { imageService } from "././features/images/services/imageService";
import { mediaAssetService } from "././features/mediaAsset/services/mediaAssetService";
import { biometricService } from "././features/fingerprint/services/biometricService";
import { guid } from "../person/onboardConstants";

const paymentBaseFolder = (paymentId) => `/storage/payments/${paymentId}`;
const subfolders = { finger: "fingers" };

async function uploadIfDataUrl(baseFolder, dataUrl, sub) {
  if (!isDataUrl(dataUrl)) return null;
  const body = { photoFolderUrl: `${baseFolder}/${sub}`, baseFile: dataUrl };
  const res = await imageService.saveIfDataUrl(body);
  const r = res?.data ?? res;
  return r?.storageUrl || r?.url || r?.path || null;
}

export async function savePaymentFingerprintIfAny({ paymentId, fingerprintBitmapPngBase64, fingerprintTemplateBase64 }) {
  const createdAt = nowIso();
  const baseFolder = paymentBaseFolder(paymentId);

  const hasBmp = !!fingerprintBitmapPngBase64;
  const hasTpl = !!fingerprintTemplateBase64;

  // “Parmak izi varsa kaydı mutlaka yapılmalı”:
  // - bmp varsa upload + mediaAsset dene
  // - template varsa biometric dene
  // Template var ama bmp yoksa yine biometric yazılabilir (onboarding’de de relatedMediaAssetId null olabilir). :contentReference[oaicite:16]{index=16}
  if (!hasBmp && !hasTpl) {
    return { fingerBmpUrl: null, fingerMediaId: null, biometricId: null, folder: `${baseFolder}/${subfolders.finger}` };
  }

  let fingerBmpUrl = null;
  let fingerMediaId = null;

  if (hasBmp) {
    fingerBmpUrl = await uploadIfDataUrl(baseFolder, fingerprintBitmapPngBase64, subfolders.finger);

    // bmp gönderilmişse ama upload URL dönmemişse, operasyonu kırmak daha profesyonel (aksi halde “var” denilen kanıt yok olur)
    if (!fingerBmpUrl) throw new Error("Parmak izi görseli upload edilemedi.");

    const mediaDto = {
      id: guid(),
      ownerType: OwnerType.Payment,
      ownerId: paymentId,
      kind: MediaKind.FingerBitmap,
      storageUrl: fingerBmpUrl,
      hashChecksum: "",
      isPrimary: false,
      createdAt,
    };
    await mediaAssetService.add(mediaDto);
    fingerMediaId = mediaDto.id;
  }

  let biometricId = null;
  if (hasTpl) {
    const bioDto = {
      id: guid(),
      ownerType: OwnerType.Payment,
      ownerId: paymentId,
      type: 1, // Fingerprint (onboarding’de böyle) :contentReference[oaicite:17]{index=17}
      template: fingerprintTemplateBase64,
      relatedMediaAssetId: fingerMediaId || null,
      isActive: true,
      createdAt,
    };
    await biometricService.add(bioDto);
    biometricId = bioDto.id;
  } else if (hasBmp) {
    // bmp var template yok: business kararına göre kırabilirsin.
    // Şu an “parmak izi varsa mutlaka kaydı yapılmalı” dediğin için template yoksa bunu hata yapıyorum.
    throw new Error("Parmak izi template zorunlu (bitmap gönderildi ama template yok).");
  }

  return {
    folder: `${baseFolder}/${subfolders.finger}`,
    fingerBmpUrl,
    fingerMediaId,
    biometricId,
  };
}

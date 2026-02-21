import React, { useState } from "react";
import { AvatarUploader } from "../../../shared/imageCrop/AvatarUploader.jsx";
import { ImageCropModal } from "../../../shared/imageCrop/ImageCropModal.jsx";
import avata from "../../../assets/avatars/avatar.svg";
import idcardavatar from "../../../assets/avatars/idcard.svg";

export default function RegisterScreen() {
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });

  // Kırpma akışı için geçici durumlar
  const [open, setOpen] = useState(false);
  const [rawImage, setRawImage] = useState(""); // modal'a gidecek ham görsel
  const [activeTarget, setActiveTarget] = useState(null); // "profile" | "cardFront" | "cardBack"

  // Nihai (kırpılmış) görseller
  const [avatarProfile, setAvatarProfile] = useState(avata);
  const [avatarCardFront, setAvatarCardFront] = useState("");
  const [avatarCardBack, setAvatarCardBack] = useState("");

  // AvatarUploader bileşenlerinden biri görsel seçtiğinde çağrılır
  const handlePick = (target) => (base64) => {
    setActiveTarget(target);
    setRawImage(base64);
    setOpen(true);
  };

  // Modal kırpımı tamamlandığında, aktif hedefe göre ilgili görseli set et
  const handleCropped = (img) => {
    if (activeTarget === "profile") setAvatarProfile(img);
    else if (activeTarget === "cardFront") setAvatarCardFront(img);
    else if (activeTarget === "cardBack") setAvatarCardBack(img);
    setOpen(false);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      avatarProfile,
      avatarCardFront,
      avatarCardBack,
    };
    console.log("REGISTER PAYLOAD:", payload);
    alert("Form gönderildi! (konsolu kontrol et)");
    // TODO: backend'e POST et (gerekirse base64 -> dosya)
  };

  return (
    <div className="container py-5">
      <div className="row g-4 align-items-start">
        {/* Sol Kolon: Görsel alanları */}
        <div className="col-12 col-md-5">
          <div className="d-flex flex-column align-items-center gap-4">

            {/* 1) Profil (yuvarlak) */}
            <div className="w-100 text-center">
              <AvatarUploader
                value={avatarProfile}
                onPick={handlePick("profile")}
                variant="profile"
                size={144}
                label="Profil görseli seç"
                caption="kullanacak görseli seçiniz."
              />
            </div>

            {/* 2) Kart ön (dikdörtgen) */}
            <div className="w-100 text-center">
              <AvatarUploader
                value={idcardavatar}
                onPick={handlePick("cardFront")}
                variant="card"
                size={150}             // yükseklik (card için genişlik otomatik hesaplanır)
                label="Kartın ön tarafını seçiniz"
                caption="kartın ön tarafını seçiniz"
              />
            </div>

            {/* 3) Kart arka (kare) */}
            {/* 2) Kart ön (dikdörtgen) */}
            <div className="w-100 text-center">
              <AvatarUploader
                value={idcardavatar}
                onPick={handlePick("cardFront")}
                variant="card"
                size={150}             // yükseklik (card için genişlik otomatik hesaplanır)
                label="Kartın ön tarafını seçiniz"
                caption="kartın ön tarafını seçiniz"
              />
            </div>

          </div>
        </div>

        {/* Sağ Kolon: Form */}
        <div className="col-12 col-md-7">
          <div className="mb-2 d-flex align-items-center gap-2">
            <h3 className="fw-bold m-0">Kullanıcı Kaydı</h3>
            <span className="badge text-bg-light">Yeni</span>
          </div>
          <p className="text-muted mb-3">Bilgilerini doldur ve görselleri ekle.</p>

          <form onSubmit={onSubmit} className="needs-validation" noValidate>
            <div className="mb-3">
              <label className="form-label">Ad Soyad</label>
              <input
                type="text"
                className="form-control"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Örn. Ali Veli"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">E-posta</label>
              <input
                type="email"
                className="form-control"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ornek@eposta.com"
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Şifre</label>
              <input
                type="password"
                className="form-control"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg">
              Kaydı Tamamla
            </button>
          </form>
        </div>
      </div>

      {/* Kırpma Modalı */}
      <ImageCropModal
        open={open}
        src={rawImage}
        onClose={() => setOpen(false)}
        onCropped={handleCropped}
      />
    </div>
  );
}

import { useState, useCallback } from "react";
import { useSelector } from "react-redux";
import Button from "../../../shared/components/Button";
import TenantList from "../components/TenantList";
import AddUserModal from "../../../shared/components/user/AddUserModal";
import { onboardPerson } from "../../../shared/person/onboardPerson";
import { OwnerType } from "../../../shared/person/onboardConstants";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import Input from "../../../shared/components/Input";
import { Search, UserPlus, X } from "lucide-react";

export default function TenantsPage() {
  const { filters } = useSelector((s) => s.tenant || { filters: { onlyActive: undefined } });
  const [qName, setQName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const { show, hide } = useGlobalLoading();

  // Hem event hem string kabul eden güvenli handler
  const handleSearchChange = useCallback((valOrEvent) => {
    if (valOrEvent && typeof valOrEvent === "object" && "target" in valOrEvent) {
      setQName(valOrEvent.target.value ?? "");
    } else {
      setQName((valOrEvent ?? "").toString());
    }
  }, []);

  const handleAddUserSave = async (payload) => {
    try {
      show();
      await onboardPerson(payload, OwnerType.Tenant); // نوع = Tenant
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Kayıt başarısız.");
    } finally {
      hide();
    }
  };

  return (
    // Tüm sayfa yüksekliği + dış scroll kilidi
    <div dir="rtl" className="min-h-screen flex flex-col overflow-visible">
      {/* Header - scroll olmayan alan */}
      <div className="p-4 border-b bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3 justify-between">
          <h1 className="text-2xl font-bold">مستأجران</h1>

          {/* Sağ blok: Arama + Yeni Kayıt */}
          <div className="flex items-center gap-2 w-full max-w-lg">
            <Input
              value={qName}
              onChange={handleSearchChange}
              placeholder="جستجو..."
              label={null}
              iconRight={qName ? X : null}
              onIconRightClick={() => setQName("")}
              className="flex-1"
              inputClassName="w-full"
              id="tenant-search"
              name="tenant-search"
              autoComplete="off"
              icon={Search}
            />
            <Button icon={UserPlus} onClick={() => setModalOpen(true)}>مستأجر جدید</Button>
          </div>
        </div>
      </div>

      {/* Sadece bu bölüm scroll alır */}
      <div className="flex-1 p-4 overflow-visible">
        <TenantList qName={qName} activeOnly={filters?.onlyActive} />
      </div>

      <AddUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleAddUserSave}
        title="ثبت مستأجر"
      />
    </div>
  );
}

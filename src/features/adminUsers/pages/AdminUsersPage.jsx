import { useCallback, useMemo, useState } from "react";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import { Search, UserPlus, X } from "lucide-react";

import AdminUserList from "../components/AdminUserList";
import AdminUserModal from "../components/AdminUserModal";
import { adminUserService } from "../services/adminUserService";

export default function AdminUsersPage() {
  const { show, hide } = useGlobalLoading();

  const [qName, setQName] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  const [model, setModel] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const bumpRefresh = () => setRefreshKey((x) => x + 1);

  const handleSearchChange = useCallback((valOrEvent) => {
    if (valOrEvent && typeof valOrEvent === "object" && "target" in valOrEvent) {
      setQName(valOrEvent.target.value ?? "");
    } else {
      setQName((valOrEvent ?? "").toString());
    }
  }, []);

   const [modal, setModal] = useState({ open: false, mode: "create", id: null });
  const [editValue, setEditValue] = useState(null); // ✅ modal value buradan gidecek

  const openCreate = () => {
    setEditValue(null); // create: value boş
    setModal({ open: true, mode: "create", id: null });
  };

  const openEdit = (row) => {
    setEditValue(row); // ✅ row’u modal’e value olarak ver
    setModal({ open: true, mode: "edit", id: row?.id ?? row?.Id });
  };


  const handleDisable = async (row) => {
    const id = row?.id ?? row?.Id;
    if (!id) return;

    const ok = confirm("این کاربر غیرفعال شود؟");
    if (!ok) return;

    try {
      show();
      await adminUserService.remove(id);
      bumpRefresh();
    } catch (e) {
      console.error(e);
      alert(e?.message || "عملیات ناموفق بود.");
    } finally {
      hide();
    }
  };

  const modalTitle = useMemo(
    () => (modal.mode === "edit" ? "ویرایش ادمین" : "ثبت ادمین"),
    [modal.mode]
  );

  const submitLabel = useMemo(
    () => (modal.mode === "edit" ? "ذخیره" : "ثبت"),
    [modal.mode]
  );

  const handleSubmit = async (payload) => {
    try {
      show();
      if (modal.mode === "edit" && modal.id != null) {
        await adminUserService.update(modal.id, payload);
      } else {
        await adminUserService.add(payload);
      }
      setModal({ open: false, mode: "create", id: null });
      setModel(null);
      bumpRefresh();
    } catch (e) {
      console.error(e);
      alert(e?.message || "کامیاب نشد.");
    } finally {
      hide();
    }
  };

 

  return (
    <div dir="rtl" className="min-h-screen flex flex-col overflow-visible">
      {/* Header */}
      <div className="p-4 border-b bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3 justify-between">
          <h1 className="text-2xl font-bold">ادمین ها</h1>

          <div className="flex items-center gap-2 w-full max-w-xl">
            <Input
              value={qName}
              onChange={handleSearchChange}
              placeholder="جستجو..."
              label={null}
              iconRight={qName ? X : null}
              onIconRightClick={() => setQName("")}
              className="flex-1"
              inputClassName="w-full"
              id="admin-search"
              name="admin-search"
              autoComplete="off"
              icon={Search}
            />

            <Button icon={UserPlus} onClick={openCreate}>
              ادمین جدید
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-visible">
        <AdminUserList
          qName={qName}
          activeOnly={activeOnly}
          refreshKey={refreshKey}
          onEdit={openEdit}
          onDisable={handleDisable}
        />
      </div>

<AdminUserModal
  open={modal.open}
  mode={modal.mode}
  title={modal.mode === "edit" ? "ویرایش ادمین" : "ثبت ادمین"}
  submitLabel={modal.mode === "edit" ? "ذخیره" : "ثبت"}
  value={editValue}              // ✅ selectedRow yerine bu
  onClose={() => {
    setModal({ open: false, mode: "create", id: null });
    setEditValue(null);
  }}
  onSubmit={async (payload) => {
    try {
      show();
      if (modal.mode === "edit" && modal.id != null) {
        await adminUserService.update(modal.id, payload);
      } else {
        await adminUserService.add(payload);
      }
      setModal({ open: false, mode: "create", id: null });
      setEditValue(null);
      bumpRefresh();
    } finally {
      hide();
    }
  }}
/>

    </div>
  );
}

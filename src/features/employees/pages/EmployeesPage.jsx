import { useCallback, useState } from "react";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import AddUserModal from "../../../shared/components/user/AddUserModal";
import { onboardPerson } from "../../../shared/person/onboardPerson";
import { OwnerType } from "../../../shared/person/onboardConstants";
import { Search, UserPlus, X } from "lucide-react";

import EmployeeList from "../components/EmployeeList";

export default function EmployeesPage() {
  const [qName, setQName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const { show, hide } = useGlobalLoading();

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
      await onboardPerson(payload, OwnerType.Employee);
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Kayıt başarısız.");
    } finally {
      hide();
    }
  };

  return (
    <div dir="rtl" className="min-h-screen flex flex-col overflow-visible">
      {/* Header */}
      <div className="p-4 border-b bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3 justify-between">
          <h1 className="text-2xl font-bold">کارمندان</h1>

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
              id="employee-search"
              name="employee-search"
              autoComplete="off"
              icon={Search}
            />

            {/* Basit aktif filtre - kart görünümünde yeterli */}
            {/* <Button
              onClick={() => setActiveOnly((v) => !v)}
              primaryColor={activeOnly ? "var(--role-primary-bg)" : "var(--role-neutral-soft-bg)"}
              activeColor={activeOnly ? "var(--role-secondary-bg)" : "var(--role-neutral-soft-bg)"}
            >
              {activeOnly ? "فعال" : "همه"}
            </Button> */}

            <Button icon={UserPlus} onClick={() => setModalOpen(true)}>
              کارمند جدید
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-visible">
        <EmployeeList qName={qName} activeOnly={activeOnly} />
      </div>

      <AddUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleAddUserSave}
        title="ثبت کارمند"
      />
    </div>
  );
}

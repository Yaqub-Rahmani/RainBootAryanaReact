// src/features/familyMembers/pages/familyMenbersScreen.js
import React, { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../../shared/components/Button";
import AddUserModal from "../../../shared/components/user/AddUserModal";
import { onboardPerson } from "../../../shared/person/onboardPerson";
import { OwnerType } from "../../../shared/person/onboardConstants";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import Input from "../../../shared/components/Input";
import { Search, UserPlus, X } from "lucide-react";
import FamilyMemberList from "../components/FamilyMemberList";
import { fetchFamilyView } from "../slices/familyMemberSlice";

export default function FamilyMenbersScreen() {
  const dispatch = useDispatch();
  const { filters } = useSelector((s) => s.franchiseOwner);
  const [qName, setQName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const { show, hide } = useGlobalLoading();
  

  // Hem event hem string kabul eden handler
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
      await onboardPerson(payload, OwnerType.FamilyMember);
      setModalOpen(false);
      // İstersen burada listeyi yeniden yüklemek için:
      dispatch(fetchFamilyView(filters?.active ?? null));
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
          <h1 className="text-2xl font-bold">اعضای خانواده</h1>

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
              id="owner-search"
              name="owner-search"
              autoComplete="off"
              icon={Search}
            />
            <Button icon={UserPlus} onClick={() => setModalOpen(true)}>
              عضو حانواده جدید
            </Button>
          </div>
        </div>
      </div>

      {/* Liste alanı */}
      <div className="flex-1 p-4 overflow-visible">
        <FamilyMemberList
          qName={qName}
          activeOnly={filters?.active ?? null}
        />
      </div>

      <AddUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleAddUserSave}
        title="ثبت عضو حانواده"
        isShowParent={true}
      />
    </div>
  );
}

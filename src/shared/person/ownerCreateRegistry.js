import { employeeService } from "../../features/employees/services/employeeService";
import { familyMemberService } from "../../features/Family/service/familyMemberService";
import { franchiseOwnerService } from "../../features/franchiseOwners/services/franchiseOwnerService";
import { tenantService } from "../../features/tenant/services/tenantService";
import { OwnerType, s, toGenderEnum } from "./onboardConstants";


export const OWNER_CREATE_CONFIG = {
  [OwnerType.FranchiseOwner]: {
    add: (dto) => franchiseOwnerService.add(dto),
    dto: (p, id) => ({
      id,
      displayName: s(p.displayName).trim(),
      fatherName: s(p.fatherName).trim(),
      email: s(p.email).trim() || "",
      nationalId: s(p.nationalId).trim(),
      gender: toGenderEnum(p.gender),
      notes: p.note || null,
      isActive: true,
    }),
    required: (dto) => {
      if (!dto.displayName) throw new Error("displayName zorunlu");
      if (!dto.fatherName)  throw new Error("fatherName zorunlu");
      if (!dto.nationalId)  throw new Error("nationalId zorunlu");
    },
  },

  [OwnerType.Tenant]: {
    add: (dto) => tenantService.add(dto),
    dto: (p, id) => ({
      id,
      displayName: s(p.displayName).trim(),
      fatherName: s(p.fatherName).trim(),
      gender: toGenderEnum(p.gender),
      email: s(p.email).trim() || "",
      nationalId: s(p.nationalId).trim(),
      taxOrIdNumber: s(p.nationalId).trim(),
      isActive: true,
    }),
    required: (dto) => {
      if (!dto.displayName) throw new Error("displayName zorunlu");
      if (!dto.fatherName)  throw new Error("fatherName zorunlu");
      if (!dto.nationalId)  throw new Error("nationalId zorunlu");
    },
  },

  [OwnerType.FamilyMember]: {
    add: (dto) => familyMemberService.add(dto),
    dto: (p, id) => ({
      id,
      displayName: s(p.displayName).trim(),
      fatherName: s(p.fatherName).trim(),
      gender: toGenderEnum(p.gender),
      nationalId: s(p.nationalId).trim(),
      relationTag: s(p.relationTag || p.relation).trim(),     
      isParent: !!p.isParent,


    }),
    required: (dto) => {
      if (!dto.displayName) throw new Error("displayName zorunlu");
      if (!dto.fatherName)  throw new Error("fatherName zorunlu");
    },
  },
    [OwnerType.Employee]: {
    add: (dto) => employeeService.add(dto),
    dto: (p, id) => ({
      id,
      displayName: s(p.displayName).trim(),
      fatherName: s(p.fatherName).trim(),
      gender: toGenderEnum(p.gender),
      nationalId: s(p.nationalId).trim(),
      isActive: true,
    }),
    required: (dto) => {
      if (!dto.displayName) throw new Error("displayName zorunlu");
      if (!dto.fatherName) throw new Error("fatherName zorunlu");
    },
  },
};

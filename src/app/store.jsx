import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/slices/authSlice';
import provinceReducer from '../features/province/slices/provinceSlice';
import districtReducer from '../features/district/slices/districtSlice';
import marketReducer from "../features/market/slices/marketSlice";
import floorReducer from "../features/floor/slices/floorSlice";
import shopReducer from "../features/shops/slices/shopSlice";
import franchiseReducer from "../features/franchiseOwners/slices/franchiseOwnerSlice";
import fingerprintReducer from "../features/fingerprint/slices/fingerprintSlice";
import imageReducer from "../features/images/slices/imagesSlice";
import mediaAssetReducer from "../features/mediaAsset/slices/mediaAssetSlice";
import addressReducer from "../features/address/slices/addressSlice";
import biometricReducer from "../features/fingerprint/slices/biometricSlice";
import phoneReducer from "../features/phones/slices/phoneSlice";
import tenantReducer from "../features/tenant/slices/tenantSlice";
import filesReducer from "../features/files/slices/filesSlice";
import shopFranchiseSharesReducer from '../features/franchiseOwners/slices/shopFranchiseSharesSlice';
import contractReducer from "../features/contract/slices/contractSlice";
import collectionReducer from "../features/collection/slices/collectionSlice";
import allocationReducer from "../features/collection/slices/allocationSlice";
import accrualReducer from "../features/accrual/slices/accrualSlice";
import accrualSettlementReducer from "../features/accrual/slices/accrualSettlementSlice";
import meterReadingReducer from "../features/meterReading/slices/meterReadingSlice";
import singleRatePolicyReducer from '../features/settings/slices/singleRatePolicySlice';
import familySharePolicyReducer from '../features/settings/slices/familySharePolicySlice';
import ownerDistributionPolicyReducer from '../features/settings/slices/ownerDistributionPolicySlice';
import familyMemberReducer from '../features/Family/slices/familyMemberSlice';
import franchiseBalanceEntryReducer from '../features/franchiseOwners/slices/franchiseBalanceEntrySlice';
import familyBalanceEntryReducer from "../features/Family/slices/familyBalanceEntrySlice";

import tenantProfileReducer from "../features/tenant/slices/tenantProfileSlice";


export const store = configureStore({
  reducer: {
    auth: authReducer,
    province: provinceReducer,
    district: districtReducer,    
    market: marketReducer,
    floor: floorReducer,
    shop: shopReducer,
    franchiseOwner: franchiseReducer,
    fingerprint: fingerprintReducer,
    image: imageReducer,
    mediaAsset: mediaAssetReducer,
    address: addressReducer,
    biometric: biometricReducer,
    phone: phoneReducer,
    tenant: tenantReducer,
    files: filesReducer,
    shopFranchiseShares: shopFranchiseSharesReducer,
    contract: contractReducer,
    collection: collectionReducer,
    allocation: allocationReducer,
    accrual: accrualReducer,
    accrualSettlement: accrualSettlementReducer,
    meterReading: meterReadingReducer,
    singleRatePolicy: singleRatePolicyReducer,
    familySharePolicy: familySharePolicyReducer,
    ownerDistributionPolicy: ownerDistributionPolicyReducer,
    familyMember: familyMemberReducer,
    franchiseBalanceEntry: franchiseBalanceEntryReducer,    
    familyBalanceEntry: familyBalanceEntryReducer,    
    tenantProfile: tenantProfileReducer,
  },
  // middleware & devTools varsayılanlar çoğu senaryo için ideal
});

export const RootState = () => store.getState();
export const AppDispatch = () => store.dispatch;

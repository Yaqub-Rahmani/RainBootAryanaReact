export const selectSfsState = (state) => state.shopFranchiseShares;

export const selectSfsStatus   = (state) => selectSfsState(state).status;
export const selectSfsError    = (state) => selectSfsState(state).error;

export const selectSfsAllIds   = (state) => selectSfsState(state).entities.allIds;
export const selectSfsById     = (state, id) => selectSfsState(state).entities.byId[id];

export const selectSfsAll      = (state) => {
  const s = selectSfsState(state);
  return s.entities.allIds.map((id) => s.entities.byId[id]).filter(Boolean);
};

export const selectSfsCurrent  = (state) => selectSfsState(state).current;

export const selectSfsDetails  = (state) => selectSfsState(state).details;
export const selectSfsSummary  = (state) => selectSfsState(state).summary;
export const selectSfsActiveOn = (state) => selectSfsState(state).activeOn;

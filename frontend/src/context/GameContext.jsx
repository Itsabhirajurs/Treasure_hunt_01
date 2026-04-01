import { createContext, useContext, useMemo, useReducer } from "react";

const GameContext = createContext(null);

const initialState = {
  team: null,
  score: 0,
  round: 1,
  badges: [],
};

const hydrated = (() => {
  const raw = localStorage.getItem("ojas_team_state");
  if (!raw) return initialState;
  try {
    return { ...initialState, ...JSON.parse(raw) };
  } catch {
    return initialState;
  }
})();

function reducer(state, action) {
  switch (action.type) {
    case "SET_TEAM": {
      const next = {
        ...state,
        team: action.payload,
        score: action.payload?.total_score ?? state.score,
        round: action.payload?.current_round ?? state.round,
        badges: action.payload?.badges ?? state.badges,
      };
      localStorage.setItem("ojas_team_state", JSON.stringify(next));
      return next;
    }
    case "UPDATE_SCORE": {
      const next = { ...state, score: action.payload };
      localStorage.setItem("ojas_team_state", JSON.stringify(next));
      return next;
    }
    case "UPDATE_ROUND": {
      const next = { ...state, round: action.payload };
      localStorage.setItem("ojas_team_state", JSON.stringify(next));
      return next;
    }
    case "ADD_BADGE": {
      if (!action.payload || state.badges.includes(action.payload)) return state;
      const next = { ...state, badges: [...state.badges, action.payload] };
      localStorage.setItem("ojas_team_state", JSON.stringify(next));
      return next;
    }
    case "LOGOUT": {
      localStorage.removeItem("ojas_team_state");
      return initialState;
    }
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, hydrated);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside GameProvider");
  return ctx;
}

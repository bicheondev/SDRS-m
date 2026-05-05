const TAB_ORDER = ['db', 'manage', 'menu'];

export const initialAppState = {
  activeTab: 'db',
  tabTransition: 'none',
  zoomSession: null,
};

export function getTabTransition(currentTab, nextTab) {
  const currentIndex = TAB_ORDER.indexOf(currentTab);
  const nextIndex = TAB_ORDER.indexOf(nextTab);

  if (currentIndex === -1 || nextIndex === -1 || currentIndex === nextIndex) {
    return 'none';
  }

  return nextIndex > currentIndex ? 'tabForward' : 'tabBackward';
}

export function appReducer(state, action) {
  switch (action.type) {
    case 'navigate-tab': {
      if (state.activeTab === action.nextTab) {
        return state;
      }

      return {
        ...state,
        activeTab: action.nextTab,
        tabTransition: getTabTransition(state.activeTab, action.nextTab),
      };
    }
    case 'reset-shell':
      return {
        ...state,
        activeTab: 'db',
        tabTransition: 'none',
        zoomSession: null,
      };
    case 'logout':
      return {
        ...state,
        activeTab: 'db',
        tabTransition: 'none',
        zoomSession: null,
      };
    case 'open-zoom':
      return {
        ...state,
        zoomSession: action.session,
      };
    case 'close-zoom':
      return {
        ...state,
        zoomSession: null,
      };
    default:
      return state;
  }
}

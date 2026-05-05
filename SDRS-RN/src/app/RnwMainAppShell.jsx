import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDatabaseFilters } from '../features/database/useDatabaseFilters.js';
import { useShipEditor } from '../features/manage/useShipEditor.js';
import { useColorMode } from '../hooks/useColorMode.js';
import { useStackNavigation } from '../hooks/useStackNavigation.js';
import { motionDurationsMs } from '../motion.js';
import {
  getElementRectSnapshot,
  isHostElement,
  scheduleIdleTask,
  setDocumentTheme,
  setElementDataAttribute,
} from '../platform/index';
import { getThemeCssVariables } from '../theme.js';
import { appReducer, initialAppState } from './appReducer.js';
import { DatabasePage } from '../features/database/DatabasePage.jsx';
import AnimatedScreen from '../components/layout/AnimatedScreen.jsx';
import BottomTab from '../components/layout/BottomTab.jsx';
import { useRnwAppBootstrap } from './useRnwAppBootstrap.js';

let manageHomePageModulePromise = null;
let manageShipEditPageModulePromise = null;
let menuPageModulePromise = null;
let menuModePageModulePromise = null;
let menuInfoPageModulePromise = null;
let imageZoomModalModulePromise = null;

function loadManageHomePageModule() {
  if (!manageHomePageModulePromise) {
    manageHomePageModulePromise = import('../features/manage/ManageHomePage.jsx');
  }

  return manageHomePageModulePromise;
}

function loadManageShipEditPageModule() {
  if (!manageShipEditPageModulePromise) {
    manageShipEditPageModulePromise = import('../features/manage/ManageShipEditPage.jsx');
  }

  return manageShipEditPageModulePromise;
}

function loadMenuPageModule() {
  if (!menuPageModulePromise) {
    menuPageModulePromise = import('../features/menu/MenuPage.jsx');
  }

  return menuPageModulePromise;
}

function loadMenuModePageModule() {
  if (!menuModePageModulePromise) {
    menuModePageModulePromise = import('../features/menu/MenuModePage.jsx');
  }

  return menuModePageModulePromise;
}

function loadMenuInfoPageModule() {
  if (!menuInfoPageModulePromise) {
    menuInfoPageModulePromise = import('../features/menu/MenuInfoPage.jsx');
  }

  return menuInfoPageModulePromise;
}

function loadImageZoomModalModule() {
  if (!imageZoomModalModulePromise) {
    imageZoomModalModulePromise = import('../components/ImageZoomModal.jsx');
  }

  return imageZoomModalModulePromise;
}

const ManageHomePage = lazy(() =>
  loadManageHomePageModule().then((module) => ({
    default: module.ManageHomePage,
  })),
);
const ManageShipEditPage = lazy(() =>
  loadManageShipEditPageModule().then((module) => ({
    default: module.ManageShipEditPage,
  })),
);
const MenuPage = lazy(() =>
  loadMenuPageModule().then((module) => ({
    default: module.MenuPage,
  })),
);
const MenuModePage = lazy(() =>
  loadMenuModePageModule().then((module) => ({
    default: module.MenuModePage,
  })),
);
const MenuInfoPage = lazy(() =>
  loadMenuInfoPageModule().then((module) => ({
    default: module.MenuInfoPage,
  })),
);
const ImageZoomModal = lazy(() => loadImageZoomModalModule());

export default function RnwMainAppShell({ isActive, onLogout, reducedMotion }) {
  const [appState, dispatch] = useReducer(appReducer, initialAppState);
  const [hasVisitedManage, setHasVisitedManage] = useState(false);
  const [hasVisitedMenu, setHasVisitedMenu] = useState(false);
  const manageNavigation = useStackNavigation('manageHome');
  const menuNavigation = useStackNavigation('menu');
  const { colorMode, resolvedColorMode, setColorMode } = useColorMode('system');
  const { databaseState, setDatabaseState } = useRnwAppBootstrap();
  const shipEditContentRef = useRef(null);
  const pendingTabNavigationRef = useRef(0);
  const databasePage = useDatabaseFilters({
    activeTab: appState.activeTab,
    isAppVisible: isActive,
    shipRecords: databaseState.shipRecords,
  });
  const shipEditor = useShipEditor({
    databaseState,
    enabled: hasVisitedManage || appState.activeTab === 'manage',
    onShipsChanged: () => databasePage.setHarborFilter('전체 항포구'),
    setDatabaseState,
  });

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const warmSecondaryModules = () => {
      loadManageHomePageModule();
      loadMenuPageModule();
    };

    return scheduleIdleTask(warmSecondaryModules, {
      fallbackDelay: 900,
      timeout: 1800,
    });
  }, [isActive]);

  useEffect(() => {
    if (appState.activeTab === 'manage') {
      setHasVisitedManage(true);
    }

    if (appState.activeTab === 'menu') {
      setHasVisitedMenu(true);
    }
  }, [appState.activeTab]);

  useEffect(() => {
    setDocumentTheme(resolvedColorMode);
  }, [resolvedColorMode]);

  const commitTabNavigation = useCallback((nextTab) => {
    dispatch({ type: 'navigate-tab', nextTab });
  }, []);

  const navigateTab = useCallback(
    (nextTab) => {
      pendingTabNavigationRef.current += 1;
      commitTabNavigation(nextTab);
    },
    [commitTabNavigation],
  );

  const navigateTabAfterPreload = useCallback(
    (nextTab, preloadPromise) => {
      const requestId = pendingTabNavigationRef.current + 1;
      pendingTabNavigationRef.current = requestId;

      preloadPromise.then(
        () => {
          if (pendingTabNavigationRef.current === requestId) {
            commitTabNavigation(nextTab);
          }
        },
        () => {
          if (pendingTabNavigationRef.current === requestId) {
            commitTabNavigation(nextTab);
          }
        },
      );
    },
    [commitTabNavigation],
  );

  const showDatabaseHome = useCallback(() => {
    databasePage.resetDatabasePage();
    navigateTab('db');
  }, [databasePage, navigateTab]);

  const openManage = useCallback(() => {
    databasePage.resetDatabasePage();
    shipEditor.resetSession();
    manageNavigation.reset('manageHome');
    setHasVisitedManage(true);
    loadManageShipEditPageModule();
    navigateTabAfterPreload('manage', loadManageHomePageModule());
  }, [databasePage, manageNavigation, navigateTabAfterPreload, shipEditor]);

  const openMenu = useCallback(() => {
    databasePage.resetDatabasePage();
    menuNavigation.reset('menu');
    setHasVisitedMenu(true);
    loadMenuModePageModule();
    loadMenuInfoPageModule();
    navigateTabAfterPreload('menu', loadMenuPageModule());
  }, [databasePage, menuNavigation, navigateTabAfterPreload]);

  const openImageZoom = useCallback((vessel, collection = [vessel], sourceThumbnail = null) => {
    const vessels =
      Array.isArray(collection) && collection.length > 0 ? collection.slice() : [vessel];
    const startIndex = Math.max(
      0,
      vessels.findIndex((entry) => entry.id === vessel.id),
    );
    const isSourceElement = isHostElement(sourceThumbnail);
    const sourceThumbToken = isSourceElement
      ? `zoom-thumb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      : null;
    const measuredSourceRect = isSourceElement
      ? getElementRectSnapshot(sourceThumbnail)
      : sourceThumbnail;
    const sourceRect =
      measuredSourceRect &&
      typeof measuredSourceRect === 'object' &&
      typeof measuredSourceRect.top === 'number' &&
      typeof measuredSourceRect.left === 'number' &&
      typeof measuredSourceRect.width === 'number' &&
      typeof measuredSourceRect.height === 'number'
        ? measuredSourceRect
        : null;

    if (isSourceElement && sourceThumbToken) {
      setElementDataAttribute(sourceThumbnail, 'zoomThumbSource', sourceThumbToken);
    }

    dispatch({
      type: 'open-zoom',
      session: {
        vessels,
        startIndex,
        openedAt: Date.now(),
        sourceThumbToken,
        sourceRect: sourceRect
          ? {
              top: sourceRect.top,
              left: sourceRect.left,
              width: sourceRect.width,
              height: sourceRect.height,
            }
          : null,
      },
    });
  }, []);

  const handleLogout = useCallback(() => {
    onLogout();
    setTimeout(() => {
      dispatch({ type: 'logout' });
      databasePage.resetDatabasePage();
      shipEditor.resetSession();
      manageNavigation.reset('manageHome');
      menuNavigation.reset('menu');
    }, motionDurationsMs.normal + 40);
  }, [databasePage, manageNavigation, menuNavigation, onLogout, shipEditor]);

  const handleBottomTabDbClick = useCallback(() => {
    if (appState.activeTab === 'manage' && manageNavigation.currentScreen === 'manageHome') {
      shipEditor.setPendingShipImport(null);
    }

    if (appState.activeTab === 'db' && databasePage.databaseView === 'search') {
      databasePage.closeSearch();
      return;
    }

    showDatabaseHome();
  }, [
    appState.activeTab,
    databasePage,
    manageNavigation.currentScreen,
    shipEditor,
    showDatabaseHome,
  ]);

  const handleBottomTabManageClick = appState.activeTab === 'manage' ? undefined : openManage;

  const handleBottomTabMenuClick = useCallback(() => {
    if (appState.activeTab === 'manage' && manageNavigation.currentScreen === 'manageHome') {
      shipEditor.setPendingShipImport(null);
    }

    if (appState.activeTab === 'menu') {
      return;
    }

    openMenu();
  }, [appState.activeTab, manageNavigation.currentScreen, openMenu, shipEditor]);

  const showBottomTab =
    appState.activeTab === 'db' ||
    (appState.activeTab === 'manage' && manageNavigation.currentScreen === 'manageHome') ||
    (appState.activeTab === 'menu' && menuNavigation.currentScreen === 'menu');
  const bottomTabCompact = appState.activeTab === 'manage' ? false : databasePage.compact;

  return (
    <View style={[styles.shell, getThemeCssVariables(resolvedColorMode)]}>
      <View style={styles.tabStack}>
        <AnimatedScreen
          fillMode="absolute"
          screenKey="db"
          currentScreen={appState.activeTab}
          navDir={appState.tabTransition}
          reducedMotion={reducedMotion}
        >
          <DatabasePage
            compact={databasePage.compact}
            databaseView={databasePage.databaseView}
            displayVessels={databasePage.displayVessels}
            filterSheet={databasePage.filterSheet}
            filteredDisplayVessels={databasePage.filteredDisplayVessels}
            harborFilter={databasePage.harborFilter}
            harborOptions={databasePage.harborOptions}
            mainContentRef={databasePage.mainContentRef}
            onFilterClose={databasePage.closeFilter}
            onFilterHarborSelect={databasePage.setHarborFilter}
            onFilterOpen={databasePage.openFilter}
            onFilterSearchOpen={databasePage.handleFilterSearchOpen}
            onFilterVesselTypeSelect={databasePage.setVesselTypeFilter}
            onImageClick={openImageZoom}
            onMainScroll={databasePage.handleMainScroll}
            onManageOpen={openManage}
            onMenuOpen={openMenu}
            onSearchClear={databasePage.clearSearchQuery}
            onSearchClose={databasePage.closeSearch}
            onSearchOpen={databasePage.openSearch}
            onSearchQueryChange={databasePage.setSearchQuery}
            onToggleCompact={databasePage.handleCompactChange}
            searchedDisplayVessels={databasePage.searchedDisplayVessels}
            searchQuery={databasePage.searchQuery}
            topBarHidden={databasePage.topBarHidden}
            vesselTypeFilter={databasePage.vesselTypeFilter}
          />
        </AnimatedScreen>

        <AnimatedScreen
          fillMode="absolute"
          screenKey="manage"
          currentScreen={appState.activeTab}
          navDir={appState.tabTransition}
          reducedMotion={reducedMotion}
        >
          {hasVisitedManage ? (
            <View style={styles.tabStack}>
              <AnimatedScreen
                fillMode="absolute"
                screenKey="manageHome"
                currentScreen={manageNavigation.currentScreen}
                navDir={manageNavigation.transition}
                reducedMotion={reducedMotion}
              >
                <Suspense fallback={null}>
                  <ManageHomePage
                    importAlert={shipEditor.manageImportAlert}
                    pendingShipImport={shipEditor.pendingShipImport}
                    onExport={shipEditor.handleExportDatabase}
                    onImportAlertDismiss={() => shipEditor.setManageImportAlert(null)}
                    onImagesImport={shipEditor.handleImagesImport}
                    onPendingShipImportDismiss={() => shipEditor.setPendingShipImport(null)}
                    onPendingShipImportKeepExisting={() =>
                      shipEditor.applyPendingShipImport({ keepExisting: true })
                    }
                    onPendingShipImportReplaceAll={() =>
                      shipEditor.applyPendingShipImport({ keepExisting: false })
                    }
                    onPendingShipImportReplaceSameRegistrationChange={(checked) =>
                      shipEditor.setPendingShipImport((current) =>
                        current ? { ...current, replaceSameRegistration: checked } : current,
                      )
                    }
                    onShipEditOpen={() => manageNavigation.push('manageShipEdit')}
                    onShipImport={shipEditor.handleShipImport}
                    rows={shipEditor.manageHomePrimaryRows}
                  />
                </Suspense>
              </AnimatedScreen>

              <AnimatedScreen
                fillMode="absolute"
                screenKey="manageShipEdit"
                currentScreen={manageNavigation.currentScreen}
                navDir={manageNavigation.transition}
                reducedMotion={reducedMotion}
              >
                <Suspense fallback={null}>
                  <ManageShipEditPage
                    cards={shipEditor.manageShipCardsState}
                    contentRef={shipEditContentRef}
                    dirty={shipEditor.manageShipDirty}
                    onAdd={shipEditor.handleManageShipAdd}
                    onBack={() => {
                      if (shipEditor.manageShipDirty) {
                        shipEditor.setManageDiscardTarget('ship');
                        return;
                      }

                      manageNavigation.pop();
                    }}
                    onConfirmDiscard={() => {
                      shipEditor.setManageDiscardTarget(null);
                      shipEditor.restoreManageShipSaved();
                      manageNavigation.pop();
                    }}
                    onDelete={shipEditor.handleManageShipDelete}
                    onDismissDiscard={() => shipEditor.setManageDiscardTarget(null)}
                    onDismissToast={shipEditor.hideManageSaveToast}
                    onFieldChange={shipEditor.handleManageShipFieldChange}
                    onImageChange={shipEditor.handleManageShipImageChange}
                    onReorder={shipEditor.handleManageShipReorder}
                    onSave={shipEditor.handleManageShipSave}
                    onSearchChange={shipEditor.setManageShipSearch}
                    onSearchClear={() => shipEditor.setManageShipSearch('')}
                    originalCards={shipEditor.manageShipSavedState}
                    searchQuery={shipEditor.manageShipSearch}
                    showDiscardModal={shipEditor.manageDiscardTarget === 'ship'}
                    toast={shipEditor.manageSaveToast}
                  />
                </Suspense>
              </AnimatedScreen>
            </View>
          ) : null}
        </AnimatedScreen>

        <AnimatedScreen
          fillMode="absolute"
          screenKey="menu"
          currentScreen={appState.activeTab}
          navDir={appState.tabTransition}
          reducedMotion={reducedMotion}
        >
          {hasVisitedMenu ? (
            <View style={styles.tabStack}>
              <AnimatedScreen
                fillMode="absolute"
                screenKey="menu"
                currentScreen={menuNavigation.currentScreen}
                navDir={menuNavigation.transition}
                reducedMotion={reducedMotion}
              >
                <Suspense fallback={null}>
                  <MenuPage
                    colorMode={colorMode}
                    onColorModeOpen={() => menuNavigation.push('menuMode')}
                    onInfoOpen={() => menuNavigation.push('menuInfo')}
                    onLogout={handleLogout}
                  />
                </Suspense>
              </AnimatedScreen>

              <AnimatedScreen
                fillMode="absolute"
                screenKey="menuMode"
                currentScreen={menuNavigation.currentScreen}
                navDir={menuNavigation.transition}
                reducedMotion={reducedMotion}
              >
                <Suspense fallback={null}>
                  <MenuModePage
                    colorMode={colorMode}
                    onBack={() => menuNavigation.pop()}
                    onSelectMode={setColorMode}
                  />
                </Suspense>
              </AnimatedScreen>

              <AnimatedScreen
                fillMode="absolute"
                screenKey="menuInfo"
                currentScreen={menuNavigation.currentScreen}
                navDir={menuNavigation.transition}
                reducedMotion={reducedMotion}
              >
                <Suspense fallback={null}>
                  <MenuInfoPage onBack={() => menuNavigation.pop()} />
                </Suspense>
              </AnimatedScreen>
            </View>
          ) : null}
        </AnimatedScreen>
      </View>

      {showBottomTab ? (
        <BottomTab
          activeTab={appState.activeTab}
          compact={bottomTabCompact}
          onDbClick={handleBottomTabDbClick}
          onManageClick={handleBottomTabManageClick}
          onMenuClick={handleBottomTabMenuClick}
        />
      ) : null}

      {appState.zoomSession ? (
        <Suspense fallback={null}>
          <ImageZoomModal
            session={appState.zoomSession}
            onClose={() => dispatch({ type: 'close-zoom' })}
          />
        </Suspense>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: '100vh',
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'var(--color-bg-app)',
  },
  tabStack: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
});

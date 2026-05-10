import { Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import ImageZoomModal from '../components/ImageZoomModal.jsx';
import { useDatabaseFilters } from '../features/database/useDatabaseFilters.js';
import { ManageHomePage } from '../features/manage/ManageHomePage.jsx';
import { ManageShipEditPage } from '../features/manage/ManageShipEditPage.jsx';
import { useShipEditor } from '../features/manage/useShipEditor.js';
import { MenuInfoPage } from '../features/menu/MenuInfoPage.jsx';
import { MenuModePage } from '../features/menu/MenuModePage.jsx';
import { MenuPage } from '../features/menu/MenuPage.jsx';
import { useAndroidBackHandler } from '../hooks/useAndroidBackHandler.js';
import { useColorMode } from '../hooks/useColorMode.js';
import { useStackNavigation } from '../hooks/useStackNavigation.js';
import { motionDurationsMs } from '../motion.js';
import {
  setDocumentTheme,
} from '../platform/index';
import { getThemeCssVariables } from '../theme.js';
import { appReducer, initialAppState } from './appReducer.js';
import { DatabasePage } from '../features/database/DatabasePage.jsx';
import { SearchTopBar, TopBar } from '../features/database/DatabaseTopBars.jsx';
import AnimatedScreen from '../components/layout/AnimatedScreen.jsx';
import BottomTab from '../components/layout/BottomTab.jsx';
import { useRnwAppBootstrap } from './useRnwAppBootstrap.js';

export default function RnwMainAppShell({
  isActive,
  onLogout,
  reducedMotion,
  suppressShadows = false,
}) {
  const [appState, dispatch] = useReducer(appReducer, initialAppState);
  const [hasVisitedManage, setHasVisitedManage] = useState(false);
  const [hasVisitedMenu, setHasVisitedMenu] = useState(false);
  const [zoomThumbnailReleased, setZoomThumbnailReleased] = useState(false);
  const manageNavigation = useStackNavigation('manageHome');
  const menuNavigation = useStackNavigation('menu');
  const { colorMode, resolvedColorMode, setColorMode } = useColorMode('system');
  const { databaseState, setDatabaseState } = useRnwAppBootstrap();
  const shipEditContentRef = useRef(null);
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
      commitTabNavigation(nextTab);
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
    navigateTab('manage');
  }, [databasePage, manageNavigation, navigateTab, shipEditor]);

  const openMenu = useCallback(() => {
    databasePage.resetDatabasePage();
    menuNavigation.reset('menu');
    setHasVisitedMenu(true);
    navigateTab('menu');
  }, [databasePage, menuNavigation, navigateTab]);

  const openImageZoom = useCallback((vessel, collection = [vessel], sourceThumbnail = null) => {
    const vessels =
      Array.isArray(collection) && collection.length > 0 ? collection.slice() : [vessel];
    const startIndex = Math.max(
      0,
      vessels.findIndex((entry) => entry.id === vessel.id),
    );
    const measuredSourceRect = sourceThumbnail;
    const sourceRect =
      measuredSourceRect &&
      typeof measuredSourceRect === 'object' &&
      typeof measuredSourceRect.top === 'number' &&
      typeof measuredSourceRect.left === 'number' &&
      typeof measuredSourceRect.width === 'number' &&
      typeof measuredSourceRect.height === 'number'
        ? measuredSourceRect
        : null;

    setZoomThumbnailReleased(false);
    dispatch({
      type: 'open-zoom',
      session: {
        vessels,
        startIndex,
        openedAt: Date.now(),
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

  const handleZoomThumbnailReveal = useCallback(() => {
    setZoomThumbnailReleased(true);
  }, []);

  const handleZoomClose = useCallback(() => {
    setZoomThumbnailReleased(false);
    dispatch({ type: 'close-zoom' });
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

  // Android hardware/back-gesture: walk the active stack so the OS only exits
  // when there's nothing left to dismiss.
  useAndroidBackHandler(
    useCallback(() => {
      if (appState.zoomSession) {
        handleZoomClose();
        return true;
      }
      if (appState.activeTab === 'db' && databasePage.databaseView === 'search') {
        databasePage.closeSearch();
        return true;
      }
      if (appState.activeTab === 'db' && databasePage.filterSheet) {
        databasePage.closeFilter();
        return true;
      }
      if (appState.activeTab === 'manage' && manageNavigation.currentScreen !== 'manageHome') {
        manageNavigation.pop();
        return true;
      }
      if (appState.activeTab === 'menu' && menuNavigation.currentScreen !== 'menu') {
        menuNavigation.pop();
        return true;
      }
      if (appState.activeTab !== 'db') {
        showDatabaseHome();
        return true;
      }
      return false;
    }, [
      appState.activeTab,
      appState.zoomSession,
      databasePage,
      handleZoomClose,
      manageNavigation,
      menuNavigation,
      showDatabaseHome,
    ]),
  );

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
    (appState.activeTab === 'db' && !databasePage.filterSheet) ||
    (appState.activeTab === 'manage' && manageNavigation.currentScreen === 'manageHome') ||
    (appState.activeTab === 'menu' && menuNavigation.currentScreen === 'menu');
  const bottomTabCompact = appState.activeTab === 'manage' ? false : databasePage.compact;
  const zoomHiddenThumbnailIndex = Math.max(
    0,
    Math.min(
      appState.zoomSession?.startIndex ?? 0,
      Math.max((appState.zoomSession?.vessels?.length ?? 1) - 1, 0),
    ),
  );
  const zoomHiddenThumbnailId = zoomThumbnailReleased
    ? null
    : appState.zoomSession?.vessels?.[zoomHiddenThumbnailIndex]?.id ?? null;
  const renderZoomChromeOverlay = useCallback(() => {
    if (appState.activeTab !== 'db') {
      return null;
    }

    return (
      <>
        {databasePage.databaseView === 'search' ? (
          <SearchTopBar
            blurTargetRef={null}
            compact={databasePage.compact}
            harborFilter={databasePage.harborFilter}
            query={databasePage.searchQuery}
            vesselTypeFilter={databasePage.vesselTypeFilter}
            onBack={databasePage.closeSearch}
            onClear={databasePage.clearSearchQuery}
            onHarborFilterOpen={() => databasePage.openFilter('harbor')}
            onQueryChange={databasePage.setSearchQuery}
            onToggleCompact={databasePage.handleCompactChange}
            onVesselTypeFilterOpen={() => databasePage.openFilter('vesselType')}
          />
        ) : (
          <TopBar
            blurTargetRef={null}
            compact={databasePage.compact}
            harborFilter={databasePage.harborFilter}
            hidden={databasePage.topBarHidden}
            vesselTypeFilter={databasePage.vesselTypeFilter}
            onHarborFilterOpen={() => databasePage.openFilter('harbor')}
            onSearchOpen={databasePage.openSearch}
            onToggleCompact={databasePage.handleCompactChange}
            onVesselTypeFilterOpen={() => databasePage.openFilter('vesselType')}
          />
        )}
        {showBottomTab ? (
          <BottomTab
            activeTab={appState.activeTab}
            compact={bottomTabCompact}
            onDbClick={handleBottomTabDbClick}
            onManageClick={handleBottomTabManageClick}
            onMenuClick={handleBottomTabMenuClick}
            style={styles.zoomChromeBottomTab}
          />
        ) : null}
      </>
    );
  }, [
    appState.activeTab,
    bottomTabCompact,
    databasePage,
    handleBottomTabDbClick,
    handleBottomTabManageClick,
    handleBottomTabMenuClick,
    showBottomTab,
  ]);

  return (
    <View style={[styles.shell, getThemeCssVariables(resolvedColorMode)]}>
      <View style={styles.tabStack}>
        <AnimatedScreen
          fillMode="absolute"
          screenKey="db"
          currentScreen={appState.activeTab}
          navDir={appState.tabTransition}
          reducedMotion={reducedMotion}
          suppressElevation={suppressShadows}
        >
          <DatabasePage
            compact={databasePage.compact}
            databaseView={databasePage.databaseView}
            displayVessels={databasePage.displayVessels}
            filterSheet={databasePage.filterSheet}
            filteredDisplayVessels={databasePage.filteredDisplayVessels}
            harborFilter={databasePage.harborFilter}
            harborOptions={databasePage.harborOptions}
            hiddenThumbnailId={zoomHiddenThumbnailId}
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
          suppressElevation={suppressShadows}
        >
          {hasVisitedManage ? (
            <View style={styles.tabStack}>
              <AnimatedScreen
                fillMode="absolute"
                screenKey="manageHome"
                currentScreen={manageNavigation.currentScreen}
                navDir={manageNavigation.transition}
                reducedMotion={reducedMotion}
                suppressElevation={suppressShadows}
                transitionFrom={manageNavigation.transitionFrom}
                transitionTo={manageNavigation.transitionTo}
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
                suppressElevation={suppressShadows}
                transitionFrom={manageNavigation.transitionFrom}
                transitionTo={manageNavigation.transitionTo}
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
          suppressElevation={suppressShadows}
        >
          {hasVisitedMenu ? (
            <View style={styles.tabStack}>
              <AnimatedScreen
                fillMode="absolute"
                screenKey="menu"
                currentScreen={menuNavigation.currentScreen}
                navDir={menuNavigation.transition}
                reducedMotion={reducedMotion}
                suppressElevation={suppressShadows}
                transitionFrom={menuNavigation.transitionFrom}
                transitionTo={menuNavigation.transitionTo}
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
                suppressElevation={suppressShadows}
                transitionFrom={menuNavigation.transitionFrom}
                transitionTo={menuNavigation.transitionTo}
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
                suppressElevation={suppressShadows}
                transitionFrom={menuNavigation.transitionFrom}
                transitionTo={menuNavigation.transitionTo}
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
            renderChromeOverlay={renderZoomChromeOverlay}
            session={appState.zoomSession}
            onClose={handleZoomClose}
            onThumbnailReveal={handleZoomThumbnailReveal}
          />
        </Suspense>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: '100%',
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
    backgroundColor: 'var(--color-bg-screen)',
    overflow: 'hidden',
  },
  zoomChromeBottomTab: {
    pointerEvents: 'none',
  },
});

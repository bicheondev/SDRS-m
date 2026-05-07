import { memo, useCallback, useRef, useState } from 'react';
import { BlurTargetView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../ThemeContext.js';
import { vesselTypeOptions } from '../../assets/assets.js';
import { AppScreenShell, screenLayoutStyles } from '../../components/layout/ScreenLayout.jsx';
import { FilterScreen } from './FilterSheet.jsx';
import { SearchTopBar, TopBar } from './DatabaseTopBars.jsx';
import { VesselResults } from './VesselResults.jsx';

export const DatabasePage = memo(function DatabasePage({
  compact,
  databaseView,
  displayVessels,
  filterSheet,
  filteredDisplayVessels,
  harborFilter,
  harborOptions,
  hiddenThumbnailId = null,
  mainContentRef,
  onFilterClose,
  onFilterHarborSelect,
  onFilterOpen,
  onFilterSearchOpen,
  onFilterVesselTypeSelect,
  onImageClick,
  onMainScroll,
  onManageOpen,
  onMenuOpen,
  onSearchClear,
  onSearchClose,
  onSearchOpen,
  onSearchQueryChange,
  onToggleCompact,
  searchedDisplayVessels,
  searchQuery,
  topBarHidden,
  vesselTypeFilter,
}) {
  useTheme();
  const insets = useSafeAreaInsets();
  const resultsBlurTargetRef = useRef(null);
  const [resultsBlurTargetReady, setResultsBlurTargetReady] = useState(false);
  const topContentPadding = 88 + Math.max(insets.top, 0);
  const filterScrollResetKey = `${harborFilter}:${vesselTypeFilter}`;
  const chromeBlurTargetRef = resultsBlurTargetReady ? resultsBlurTargetRef : null;
  const setResultsBlurTargetNode = useCallback((node) => {
    resultsBlurTargetRef.current = node;
    if (!node) {
      setResultsBlurTargetReady(false);
    }
  }, []);
  const handleResultsBlurTargetLayout = useCallback(() => {
    if (resultsBlurTargetRef.current) {
      setResultsBlurTargetReady(true);
    }
  }, []);

  return (
    <>
      <AppScreenShell screenStyle={screenLayoutStyles.screenColumn}>
        {databaseView === 'search' ? (
          <SearchTopBar
            compact={compact}
            harborFilter={harborFilter}
            query={searchQuery}
            scrollbarGutter
            vesselTypeFilter={vesselTypeFilter}
            onBack={onSearchClose}
            blurTargetRef={chromeBlurTargetRef}
            onClear={onSearchClear}
            onHarborFilterOpen={() => onFilterOpen('harbor')}
            onQueryChange={onSearchQueryChange}
            onToggleCompact={onToggleCompact}
            onVesselTypeFilterOpen={() => onFilterOpen('vesselType')}
          />
        ) : (
          <TopBar
            compact={compact}
            harborFilter={harborFilter}
            hidden={topBarHidden}
            blurTargetRef={chromeBlurTargetRef}
            onHarborFilterOpen={() => onFilterOpen('harbor')}
            onSearchOpen={onSearchOpen}
            onToggleCompact={onToggleCompact}
            onVesselTypeFilterOpen={() => onFilterOpen('vesselType')}
            scrollbarGutter
            vesselTypeFilter={vesselTypeFilter}
          />
        )}

        <BlurTargetView
          ref={setResultsBlurTargetNode}
          onLayout={handleResultsBlurTargetLayout}
          style={styles.resultsBlurTarget}
        >
          <VesselResults
            ref={databaseView === 'browse' ? mainContentRef : undefined}
            compact={compact}
            contentTopPadding={topContentPadding}
            hiddenThumbnailId={hiddenThumbnailId}
            onImageClick={onImageClick}
            onScroll={databaseView === 'browse' ? onMainScroll : undefined}
            chromeScrollbar
            scrollResetKey={filterScrollResetKey}
            vessels={databaseView === 'search' ? searchedDisplayVessels : filteredDisplayVessels}
          />
        </BlurTargetView>
      </AppScreenShell>

      {filterSheet ? (
        <FilterScreen
          compact={compact}
          filterMode={filterSheet.mode}
          harborFilter={harborFilter}
          harborOptions={harborOptions}
          phase={filterSheet.phase}
          query={filterSheet.sourceView === 'search' ? searchQuery : ''}
          vessels={displayVessels}
          onClose={onFilterClose}
          onHarborSelect={onFilterHarborSelect}
          onImageClick={onImageClick}
          onManageOpen={onManageOpen}
          onMenuOpen={onMenuOpen}
          onSearchOpen={onFilterSearchOpen}
          onToggleCompact={onToggleCompact}
          onVesselTypeSelect={onFilterVesselTypeSelect}
          vesselTypeFilter={vesselTypeFilter}
          vesselTypeOptions={vesselTypeOptions}
        />
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  resultsBlurTarget: {
    flex: 1,
    minHeight: 0,
  },
});

import { memo } from 'react';

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
  const filterScrollResetKey = `${harborFilter}:${vesselTypeFilter}`;

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
            onHarborFilterOpen={() => onFilterOpen('harbor')}
            onSearchOpen={onSearchOpen}
            onToggleCompact={onToggleCompact}
            onVesselTypeFilterOpen={() => onFilterOpen('vesselType')}
            scrollbarGutter
            vesselTypeFilter={vesselTypeFilter}
          />
        )}

        <VesselResults
          ref={databaseView === 'browse' ? mainContentRef : undefined}
          compact={compact}
          hiddenThumbnailId={hiddenThumbnailId}
          onImageClick={onImageClick}
          onScroll={databaseView === 'browse' ? onMainScroll : undefined}
          chromeScrollbar
          scrollResetKey={filterScrollResetKey}
          vessels={databaseView === 'search' ? searchedDisplayVessels : filteredDisplayVessels}
        />
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

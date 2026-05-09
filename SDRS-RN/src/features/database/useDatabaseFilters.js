import {
  useCallback,
  useDeferredValue,
  startTransition,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Keyboard } from 'react-native';

import { buildDisplayVessels, buildHarborOptions } from '../../domain/databaseState.js';
import { filterVessels } from '../../domain/ships.js';
import { motionDurationsMs } from '../../motion.js';
import { applySearchQuery } from './useVesselSearch.js';

function getScrollableNode(node) {
  if (!node) {
    return null;
  }

  return node.getScrollableNode?.() ?? node.getScrollableRef?.() ?? node;
}

function readScrollY(node, fallback = 0) {
  const scrollableNode = getScrollableNode(node);
  const candidates = [
    fallback,
    node?.scrollTop,
    scrollableNode?.scrollTop,
    node?.contentOffset?.y,
    scrollableNode?.contentOffset?.y,
  ].filter((candidate) => (
    typeof candidate === 'number'
    && Number.isFinite(candidate)
    && candidate >= 0
  ));

  return candidates.length > 0 ? Math.max(...candidates) : fallback;
}

export function useDatabaseFilters({ activeTab, isAppVisible, shipRecords }) {
  const [compact, setCompact] = useState(false);
  const [topBarHidden, setTopBarHidden] = useState(false);
  const [databaseView, setDatabaseView] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [harborFilter, setHarborFilterState] = useState('전체 항포구');
  const [vesselTypeFilter, setVesselTypeFilterState] = useState('전체 선박');
  const [filterSheet, setFilterSheet] = useState(null);
  const mainContentRef = useRef(null);
  const lastScrollTopRef = useRef(0);
  const mainScrollPositionRef = useRef(0);
  const scrollHideDistanceRef = useRef(0);
  const scrollShowDistanceRef = useRef(0);
  const topBarHiddenRef = useRef(false);
  const revealLockScrollTopRef = useRef(0);
  const filterCloseTimeoutRef = useRef(null);
  const scrollRestoreFrameRef = useRef(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const displayVessels = useMemo(() => buildDisplayVessels(shipRecords), [shipRecords]);
  const harborOptions = useMemo(() => buildHarborOptions(shipRecords), [shipRecords]);
  const filteredDisplayVessels = useMemo(
    () => filterVessels(displayVessels, harborFilter, vesselTypeFilter),
    [displayVessels, harborFilter, vesselTypeFilter],
  );
  const searchedDisplayVessels = useMemo(
    () => applySearchQuery(filteredDisplayVessels, deferredSearchQuery),
    [deferredSearchQuery, filteredDisplayVessels],
  );

  useEffect(() => {
    if (harborOptions.includes(harborFilter)) {
      return;
    }

    setHarborFilterState('전체 항포구');
  }, [harborFilter, harborOptions]);

  useEffect(() => {
    topBarHiddenRef.current = topBarHidden;
  }, [topBarHidden]);

  useLayoutEffect(() => {
    if (
      !isAppVisible ||
      activeTab !== 'db' ||
      databaseView !== 'browse' ||
      !mainContentRef.current
    ) {
      return;
    }

    if (scrollRestoreFrameRef.current !== null) {
      cancelAnimationFrame(scrollRestoreFrameRef.current);
      scrollRestoreFrameRef.current = null;
    }

    const scrollNode = mainContentRef.current;
    scrollRestoreFrameRef.current = requestAnimationFrame(() => {
      scrollRestoreFrameRef.current = null;

      if (
        !isAppVisible ||
        activeTab !== 'db' ||
        databaseView !== 'browse' ||
        mainContentRef.current !== scrollNode
      ) {
        return;
      }

      if (typeof scrollNode.scrollTo === 'function') {
        scrollNode.scrollTo({
          y: mainScrollPositionRef.current,
          animated: false,
        });
        return;
      }

      scrollNode.scrollTop = mainScrollPositionRef.current;
    });

    return () => {
      if (scrollRestoreFrameRef.current !== null) {
        cancelAnimationFrame(scrollRestoreFrameRef.current);
        scrollRestoreFrameRef.current = null;
      }
    };
  }, [activeTab, databaseView, isAppVisible]);

  const scrollMainContentTo = useCallback((y) => {
    if (scrollRestoreFrameRef.current !== null) {
      cancelAnimationFrame(scrollRestoreFrameRef.current);
      scrollRestoreFrameRef.current = null;
    }

    const scrollNode = mainContentRef.current;

    if (!scrollNode) {
      return;
    }

    scrollRestoreFrameRef.current = requestAnimationFrame(() => {
      scrollRestoreFrameRef.current = null;

      if (mainContentRef.current !== scrollNode) {
        return;
      }

      if (typeof scrollNode.scrollTo === 'function') {
        scrollNode.scrollTo({
          y,
          animated: false,
        });
        return;
      }

      scrollNode.scrollTop = y;
    });
  }, []);

  useEffect(
    () => () => {
      if (filterCloseTimeoutRef.current) {
        clearTimeout(filterCloseTimeoutRef.current);
      }
      if (scrollRestoreFrameRef.current !== null) {
        cancelAnimationFrame(scrollRestoreFrameRef.current);
        scrollRestoreFrameRef.current = null;
      }
    },
    [],
  );

  const resetTransientUi = useCallback(() => {
    topBarHiddenRef.current = false;
    revealLockScrollTopRef.current = 0;
    setTopBarHidden(false);

    if (filterCloseTimeoutRef.current) {
      clearTimeout(filterCloseTimeoutRef.current);
      filterCloseTimeoutRef.current = null;
    }

    setFilterSheet(null);
  }, []);

  const handleCompactChange = useCallback(
    (nextCompact) => {
      if (compact === nextCompact) {
        return;
      }

      startTransition(() => {
        setCompact(nextCompact);
      });
    },
    [compact],
  );

  const handleMainScroll = useCallback(
    (event) => {
      if (activeTab !== 'db' || databaseView !== 'browse') {
        return;
      }

      const currentScrollTop =
        event?.nativeEvent?.contentOffset?.y ?? event?.currentTarget?.scrollTop ?? 0;
      const lastScrollTop = lastScrollTopRef.current;

      mainScrollPositionRef.current = currentScrollTop;

      if (currentScrollTop <= 0) {
        topBarHiddenRef.current = false;
        setTopBarHidden(false);
        lastScrollTopRef.current = 0;
        scrollHideDistanceRef.current = 0;
        scrollShowDistanceRef.current = 0;
        revealLockScrollTopRef.current = 0;
        return;
      }

      const delta = currentScrollTop - lastScrollTop;
      const scrollingDown = delta > 0;
      const scrollingUp = delta < 0;

      if (scrollingDown) {
        scrollHideDistanceRef.current += delta;
        scrollShowDistanceRef.current = 0;
      } else if (scrollingUp) {
        scrollShowDistanceRef.current += Math.abs(delta);
        scrollHideDistanceRef.current = 0;
      }

      if (currentScrollTop <= 72) {
        if (topBarHiddenRef.current) {
          topBarHiddenRef.current = false;
          setTopBarHidden(false);
        }
        scrollHideDistanceRef.current = 0;
        scrollShowDistanceRef.current = 0;
        revealLockScrollTopRef.current = currentScrollTop + 40;
        lastScrollTopRef.current = currentScrollTop;
        return;
      }

      if (
        !topBarHiddenRef.current &&
        currentScrollTop > Math.max(24, revealLockScrollTopRef.current) &&
        scrollHideDistanceRef.current > 24
      ) {
        topBarHiddenRef.current = true;
        setTopBarHidden(true);
        scrollHideDistanceRef.current = 0;
        revealLockScrollTopRef.current = 0;
      } else if (topBarHiddenRef.current && scrollShowDistanceRef.current > 18) {
        topBarHiddenRef.current = false;
        setTopBarHidden(false);
        scrollShowDistanceRef.current = 0;
        revealLockScrollTopRef.current = currentScrollTop + 40;
      }

      lastScrollTopRef.current = currentScrollTop;
    },
    [activeTab, databaseView],
  );

  const resetMainScrollPosition = useCallback(() => {
    mainScrollPositionRef.current = 0;
    lastScrollTopRef.current = 0;
    scrollHideDistanceRef.current = 0;
    scrollShowDistanceRef.current = 0;
    topBarHiddenRef.current = false;
    revealLockScrollTopRef.current = 0;
    setTopBarHidden(false);

    scrollMainContentTo(0);
  }, [scrollMainContentTo]);

  const setHarborFilter = useCallback(
    (nextHarborFilter) => {
      if (harborFilter === nextHarborFilter) {
        return;
      }

      resetMainScrollPosition();
      setHarborFilterState(nextHarborFilter);
    },
    [harborFilter, resetMainScrollPosition],
  );

  const setVesselTypeFilter = useCallback(
    (nextVesselTypeFilter) => {
      if (vesselTypeFilter === nextVesselTypeFilter) {
        return;
      }

      resetMainScrollPosition();
      setVesselTypeFilterState(nextVesselTypeFilter);
    },
    [resetMainScrollPosition, vesselTypeFilter],
  );

  const resetDatabasePage = useCallback(() => {
    resetTransientUi();
    setDatabaseView('browse');
  }, [resetTransientUi]);

  const openSearch = useCallback(() => {
    resetTransientUi();
    setDatabaseView('search');
  }, [resetTransientUi]);

  const closeSearch = useCallback(() => {
    Keyboard.dismiss();
    resetTransientUi();
    setDatabaseView('browse');
  }, [resetTransientUi]);

  const openFilter = useCallback(
    (mode) => {
      const scrollY = databaseView === 'browse'
        ? readScrollY(mainContentRef.current, mainScrollPositionRef.current)
        : 0;
      mainScrollPositionRef.current = scrollY;

      Keyboard.dismiss();
      resetTransientUi();
      setFilterSheet({
        mode,
        phase: 'open',
        scrollY,
        sourceView: databaseView,
      });
    },
    [databaseView, resetTransientUi],
  );

  const closeFilter = useCallback(() => {
    setFilterSheet((current) => {
      if (!current || current.phase === 'closing') {
        return current;
      }

      return {
        ...current,
        phase: 'closing',
      };
    });

    if (filterCloseTimeoutRef.current) {
      clearTimeout(filterCloseTimeoutRef.current);
    }

    filterCloseTimeoutRef.current = setTimeout(() => {
      filterCloseTimeoutRef.current = null;
      setFilterSheet((current) => (current?.phase === 'closing' ? null : current));
    }, motionDurationsMs.normal + 40);
  }, []);

  const handleFilterSearchOpen = useCallback(() => {
    if (filterSheet?.sourceView === 'search') {
      closeFilter();
      return;
    }

    openSearch();
  }, [closeFilter, filterSheet?.sourceView, openSearch]);
  const clearSearchQuery = useCallback(() => {
    setSearchQuery('');
  }, []);

  return {
    closeFilter,
    closeSearch,
    compact,
    clearSearchQuery,
    databaseView,
    displayVessels,
    filterSheet,
    filteredDisplayVessels,
    handleCompactChange,
    handleFilterSearchOpen,
    handleMainScroll,
    harborFilter,
    harborOptions,
    mainContentRef,
    openFilter,
    openSearch,
    resetDatabasePage,
    searchQuery,
    searchedDisplayVessels,
    setHarborFilter,
    setSearchQuery,
    setVesselTypeFilter,
    topBarHidden,
    vesselTypeFilter,
  };
}

import { useEffect, useState } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'

const DASHBOARD_FIELDS = [
    'id',
    'dashboardItems[id,type,visualization[id],chart[id],reportTable[id],eventChart[id],eventReport[id]]',
].join(',')

const VIZ_FIELDS = [
    'id',
    'columns[dimension,items[id]]',
    'rows[dimension,items[id]]',
    'filters[dimension,items[id]]',
].join(',')

const INDICATOR_FIELDS = [
    'id',
    'displayName',
    'displayDescription',
    'indicatorType[displayName]',
    'numeratorDescription',
    'denominatorDescription',
].join(',')

// Older visualization-typed dashboard items may still be split across
// chart / reportTable / eventChart / eventReport depending on DHIS2 version.
function extractVisualizationId(item) {
    return (
        item.visualization?.id ??
        item.chart?.id ??
        item.reportTable?.id ??
        item.eventChart?.id ??
        item.eventReport?.id ??
        null
    )
}

function extractIndicatorIds(viz) {
    const allDims = [...(viz.columns || []), ...(viz.rows || []), ...(viz.filters || [])]
    const dxDim = allDims.find(d => d.dimension === 'dx')
    if (!dxDim) return []
    // dx items can mix indicators, data elements, and program indicators.
    // We can't tell which is which from the viz config alone -- resolved
    // by querying the indicators resource and keeping only matches.
    return dxDim.items.map(item => item.id)
}

// Dashboard plugins only receive `dashboardItemId`, not the parent dashboard's
// id -- find the dashboard by looking up which one contains this item.
async function findContainingDashboard(engine, dashboardItemId) {
    const { dashboards } = await engine.query({
        dashboards: {
            resource: 'dashboards',
            params: {
                filter: `dashboardItems.id:eq:${dashboardItemId}`,
                fields: DASHBOARD_FIELDS,
                paging: false,
            },
        },
    })
    return dashboards.dashboards?.[0] ?? null
}

async function fetchDashboardById(engine, dashboardId) {
    try {
        const { dashboard } = await engine.query({
            dashboard: {
                resource: `dashboards/${dashboardId}`,
                params: { fields: DASHBOARD_FIELDS },
            },
        })
        return dashboard
    } catch (err) {
        const is404 = err?.details?.httpStatusCode === 404 || err?.message?.includes('404')
        if (is404) return null
        throw err
    }
}

// The plugin runs inside an iframe -- the dashboard id lives in the parent
// (host) window's URL hash, `#/<dashboardId>` or `#/<dashboardId>/edit`,
// even when a newly added, not-yet-saved item has no dashboardItemId yet.
// Same-origin (same DHIS2 instance), so reading window.parent is safe.
function getDashboardIdFromUrl() {
    try {
        const match = window.parent.location.hash.match(/#\/([A-Za-z0-9]{11})(?:\/edit)?/)
        return match ? match[1] : null
    } catch {
        return null
    }
}

// In dev mode (`dashboardItemId == null`) there is no real plugin item to
// resolve from, so `devDashboardId` is treated as an actual dashboard id
// instead of an item id.
export function useIndicatorDefinitions(dashboardItemId, devDashboardId) {
    const engine = useDataEngine()
    const [state, setState] = useState({ indicators: [], loading: true, error: null })

    useEffect(() => {
        if (!dashboardItemId && !devDashboardId) {
            setState({ indicators: [], loading: false, error: null })
            return
        }

        let cancelled = false
        setState(s => ({ ...s, loading: true, error: null }))

        async function run() {
            try {
                let dashboard = dashboardItemId
                    ? await findContainingDashboard(engine, dashboardItemId)
                    : await fetchDashboardById(engine, devDashboardId)

                // A newly added, unsaved dashboard item (first load in edit
                // mode) has no persisted dashboardItemId yet to resolve from
                // -- fall back to the dashboard id visible in the URL.
                if (!dashboard && dashboardItemId) {
                    const urlDashboardId = getDashboardIdFromUrl()
                    if (urlDashboardId) {
                        dashboard = await fetchDashboardById(engine, urlDashboardId)
                    }
                }

                if (!dashboard) {
                    if (!cancelled) {
                        setState({
                            indicators: [],
                            loading: false,
                            error: new Error('Could not find the dashboard containing this plugin.'),
                        })
                    }
                    return
                }

                const vizIds = (dashboard.dashboardItems || [])
                    .map(extractVisualizationId)
                    .filter(Boolean)

                if (vizIds.length === 0) {
                    if (!cancelled) setState({ indicators: [], loading: false, error: null })
                    return
                }

                const vizQuery = {}
                vizIds.forEach((id, i) => {
                    vizQuery[`v${i}`] = {
                        resource: `visualizations/${id}`,
                        params: { fields: VIZ_FIELDS },
                    }
                })
                const vizResults = await engine.query(vizQuery)

                const dxIdSet = new Set()
                Object.values(vizResults).forEach(viz => {
                    extractIndicatorIds(viz).forEach(id => dxIdSet.add(id))
                })

                if (dxIdSet.size === 0) {
                    if (!cancelled) setState({ indicators: [], loading: false, error: null })
                    return
                }

                // Resolve against the indicators resource -- any id not an
                // indicator (data element, program indicator) is dropped.
                const { indicators } = await engine.query({
                    indicators: {
                        resource: 'indicators',
                        params: {
                            filter: `id:in:[${[...dxIdSet].join(',')}]`,
                            fields: INDICATOR_FIELDS,
                            paging: false,
                        },
                    },
                })

                if (cancelled) return
                setState({
                    indicators: indicators.indicators.sort((a, b) =>
                        a.displayName.localeCompare(b.displayName)
                    ),
                    loading: false,
                    error: null,
                })
            } catch (err) {
                if (!cancelled) setState({ indicators: [], loading: false, error: err })
            }
        }

        run()
        return () => {
            cancelled = true
        }
    }, [dashboardItemId, devDashboardId]) // eslint-disable-line react-hooks/exhaustive-deps

    return state
}

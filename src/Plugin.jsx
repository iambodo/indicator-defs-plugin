import React from 'react'
import PropTypes from 'prop-types'
import { useConfig } from '@dhis2/app-runtime'
import { CircularLoader, NoticeBox } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { IndicatorTable } from './components/IndicatorTable.jsx'
import { useIndicatorDefinitions } from './hooks/useIndicatorDefinitions.js'

// Dev-mode default so the plugin renders standalone via `yarn start`.
// http://localhost:8081/apps/dashboard#/Evbmz331wpP (login admin / district)
const DEV_DASHBOARD_ID = 'Evbmz331wpP'

function Plugin({ dashboardItemId, dashboardMode }) {
    const noContext = dashboardMode == null

    const { baseUrl } = useConfig()
    const { indicators, loading, error } = useIndicatorDefinitions(
        dashboardItemId,
        noContext ? DEV_DASHBOARD_ID : null
    )

    if (loading) {
        return <CircularLoader small />
    }

    if (error) {
        return (
            <NoticeBox error title={i18n.t('Could not load indicator definitions')}>
                {error.message}
            </NoticeBox>
        )
    }

    if (indicators.length === 0) {
        return (
            <NoticeBox title={i18n.t('No indicators found')}>
                {i18n.t('This dashboard has no visualizations using indicators.')}
            </NoticeBox>
        )
    }

    return <IndicatorTable indicators={indicators} baseUrl={baseUrl} />
}

Plugin.propTypes = {
    dashboardItemId: PropTypes.string,
    dashboardMode: PropTypes.string,
}

export default Plugin

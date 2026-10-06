import React from 'react'
import PropTypes from 'prop-types'
import { DataTable, DataTableRow, DataTableColumnHeader, DataTableCell } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { indicatorMaintenanceUrl } from '../utils/maintenanceUrl.js'

export function IndicatorTable({ indicators, baseUrl }) {
    return (
        <DataTable>
            <DataTableRow>
                <DataTableColumnHeader>{i18n.t('Name')}</DataTableColumnHeader>
                <DataTableColumnHeader>{i18n.t('Description')}</DataTableColumnHeader>
                <DataTableColumnHeader>{i18n.t('Indicator type')}</DataTableColumnHeader>
                <DataTableColumnHeader>{i18n.t('Numerator')}</DataTableColumnHeader>
                <DataTableColumnHeader>{i18n.t('Denominator')}</DataTableColumnHeader>
            </DataTableRow>
            {indicators.map(indicator => (
                <DataTableRow key={indicator.id}>
                    <DataTableCell>
                        <a
                            href={indicatorMaintenanceUrl(baseUrl, indicator.id)}
                            target="_top"
                            rel="noopener noreferrer"
                        >
                            {indicator.displayName}
                        </a>
                    </DataTableCell>
                    <DataTableCell>{indicator.displayDescription || '—'}</DataTableCell>
                    <DataTableCell>{indicator.indicatorType?.displayName || '—'}</DataTableCell>
                    <DataTableCell>{indicator.numeratorDescription || '—'}</DataTableCell>
                    <DataTableCell>{indicator.denominatorDescription || '—'}</DataTableCell>
                </DataTableRow>
            ))}
        </DataTable>
    )
}

IndicatorTable.propTypes = {
    baseUrl: PropTypes.string.isRequired,
    indicators: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            displayName: PropTypes.string.isRequired,
            displayDescription: PropTypes.string,
            indicatorType: PropTypes.shape({
                displayName: PropTypes.string,
            }),
            numeratorDescription: PropTypes.string,
            denominatorDescription: PropTypes.string,
        })
    ).isRequired,
}

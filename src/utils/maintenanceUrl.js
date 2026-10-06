// Deep link to an indicator's edit screen in the Maintenance app.
export function indicatorMaintenanceUrl(baseUrl, indicatorId) {
    return `${baseUrl}/dhis-web-maintenance/index.html#/edit/indicatorSection/indicator/${indicatorId}`
}

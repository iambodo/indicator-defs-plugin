import React from 'react'
import { DataProvider } from '@dhis2/app-runtime'
import Plugin from './Plugin.jsx'

const App = () => (
    <DataProvider>
        <Plugin />
    </DataProvider>
)

export default App

import React from 'react';
import { createRoot } from 'react-dom/client'
import { App } from './src/app';

const IS_DEVELOPMENT = true;
const APP_NAME = 'fibre';

function init() {
    // Add a div to the body for React to render into
    const entry_point = document.createElement('div');
    entry_point.id = `${APP_NAME}__entry_point`;
    document.body.appendChild(entry_point);

    // Reload the page when any JS or CSS file changes
    if (IS_DEVELOPMENT) {
        new EventSource('/esbuild').addEventListener('change', () => location.reload())
    }

    // Render the app
    const root = createRoot(document.getElementById(`${APP_NAME}__entry_point`) as HTMLElement);
    root.render(<App />)
}

init();
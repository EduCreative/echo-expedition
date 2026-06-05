/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {createRoot} from 'react-dom/client';
// Corrected the path to the main CSS file.
import './src/main.css';
import App from './src/components/App';

createRoot(document.getElementById('root')).render(<App />);
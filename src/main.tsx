import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ThemeProvider } from './components/common/ThemeProvider';
import { store } from './store';
import { addLog } from './store/logSlice';
import App from './App';

// Log version
store.dispatch(addLog({
  level: 'info',
  message: `App Version: ${__COMMIT_HASH__}`
}));


import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);

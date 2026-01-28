import { MantineProvider, createTheme } from '@mantine/core';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { ReactNode } from 'react';

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const themeMode = useSelector((state: RootState) => state.settings.app.theme);

    const theme = createTheme({
        primaryColor: 'blue',
    });

    const effectiveTheme = themeMode === 'auto' ? undefined : themeMode;

    return (
        <MantineProvider theme={theme} forceColorScheme={effectiveTheme}>
            {children}
        </MantineProvider>
    );
}

import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import type { WeatherForecast } from '../../types';

interface AppShellProps {
  weather?: WeatherForecast | null;
}

export function AppShell({ weather }: AppShellProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header weather={weather} />
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

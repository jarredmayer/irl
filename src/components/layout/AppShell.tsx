import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import type { WeatherForecast } from '../../types';

interface AppShellProps {
  weatherNote?: string | null;
  weather?: WeatherForecast | null;
}

export function AppShell({ weatherNote, weather }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header weatherNote={weatherNote} weather={weather} />
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

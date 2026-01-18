/**
 * Professional Sports Events Scraper
 * Only generates events during actual seasons with realistic scheduling
 * Note: For production, integrate with real schedule APIs
 */

import { addDays, format, getDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface TeamInfo {
  name: string;
  venue: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  url: string;
  sport: string;
  // More accurate season dates
  seasonStart: string; // YYYY-MM-DD
  seasonEnd: string;   // YYYY-MM-DD
  gameDays: number[];
  homeGamesRemaining: number; // Approximate home games left in season
  price: number;
  opponents: string[];
}

export class ProfessionalSportsScraper extends BaseScraper {
  private teams: TeamInfo[] = [
    {
      name: 'Miami Heat',
      venue: 'Kaseya Center',
      address: '601 Biscayne Blvd, Miami, FL 33132',
      neighborhood: 'Downtown Miami',
      lat: 25.7814,
      lng: -80.188,
      url: 'https://www.nba.com/heat',
      sport: 'NBA',
      seasonStart: '2025-10-22',
      seasonEnd: '2026-04-13', // Regular season ends mid-April
      gameDays: [2, 3, 5, 6, 0],
      homeGamesRemaining: 20,
      price: 45,
      opponents: ['Boston Celtics', 'New York Knicks', 'Milwaukee Bucks', 'Philadelphia 76ers', 'Cleveland Cavaliers', 'Orlando Magic'],
    },
    {
      name: 'Florida Panthers',
      venue: 'Amerant Bank Arena',
      address: '1 Panther Pkwy, Sunrise, FL 33323',
      neighborhood: 'Sunrise',
      lat: 26.1584,
      lng: -80.3256,
      url: 'https://www.floridapanthers.com',
      sport: 'NHL',
      seasonStart: '2025-10-08',
      seasonEnd: '2026-04-17', // Regular season ends mid-April
      gameDays: [2, 4, 6, 0],
      homeGamesRemaining: 18,
      price: 40,
      opponents: ['Tampa Bay Lightning', 'Boston Bruins', 'Toronto Maple Leafs', 'New York Rangers', 'Carolina Hurricanes'],
    },
  ];

  // Teams NOT in season right now (January)
  private offSeasonTeams = [
    { name: 'Miami Dolphins', note: 'NFL season ended, playoffs through Super Bowl Feb 9' },
    { name: 'Inter Miami CF', note: 'MLS season starts late February' },
    { name: 'Miami Marlins', note: 'MLB season starts late March' },
  ];

  constructor() {
    super('Professional Sports', { weight: 1.5, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();

    this.log('Generating sports events for in-season teams...');

    // Log off-season teams
    for (const team of this.offSeasonTeams) {
      this.log(`${team.name}: ${team.note}`);
    }

    for (const team of this.teams) {
      const seasonStart = new Date(team.seasonStart);
      const seasonEnd = new Date(team.seasonEnd);

      if (today < seasonStart || today > seasonEnd) {
        this.log(`${team.name} is not in season`);
        continue;
      }

      const teamEvents = this.generateTeamEvents(team, seasonEnd);
      events.push(...teamEvents);
    }

    this.log(`Generated ${events.length} sports events`);
    return events;
  }

  private generateTeamEvents(team: TeamInfo, seasonEnd: Date): RawEvent[] {
    const events: RawEvent[] = [];
    const today = new Date();

    let gamesGenerated = 0;
    let currentDate = addDays(today, 1); // Start tomorrow
    let opponentIndex = 0;

    // Generate games spread across remaining season
    const daysUntilSeasonEnd = Math.floor((seasonEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const avgDaysBetweenGames = Math.floor(daysUntilSeasonEnd / team.homeGamesRemaining);

    while (gamesGenerated < team.homeGamesRemaining && currentDate <= seasonEnd) {
      const dayOfWeek = getDay(currentDate);

      if (team.gameDays.includes(dayOfWeek)) {
        const opponent = team.opponents[opponentIndex % team.opponents.length];
        const dateStr = format(currentDate, 'yyyy-MM-dd');

        const gameTime = team.sport === 'NHL' ? '19:00' : '19:30';
        const startAt = `${dateStr}T${gameTime}:00`;

        events.push({
          title: `${team.name} vs ${opponent}`,
          startAt,
          venueName: team.venue,
          address: team.address,
          neighborhood: team.neighborhood,
          lat: team.lat,
          lng: team.lng,
          city: team.neighborhood === 'Sunrise' ? 'Fort Lauderdale' : 'Miami',
          tags: ['local-favorite'],
          category: 'Sports',
          priceLabel: team.price > 50 ? '$$' : '$',
          priceAmount: team.price,
          isOutdoor: false,
          description: `${team.sport} game: ${team.name} take on the ${opponent} at ${team.venue}.`,
          sourceUrl: team.url,
          sourceName: this.name,
        });

        gamesGenerated++;
        opponentIndex++;
        currentDate = addDays(currentDate, Math.max(avgDaysBetweenGames, 3));
      } else {
        currentDate = addDays(currentDate, 1);
      }
    }

    return events;
  }
}

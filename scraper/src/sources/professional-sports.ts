/**
 * Professional Sports Events Scraper
 * Generates events for Miami's pro sports teams
 */

import { addDays, format, getDay, addMonths } from 'date-fns';
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
  season: [number, number]; // Start month, end month (1-12)
  gameDays: number[]; // Days of week games typically happen
  gamesPerMonth: number;
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
      season: [10, 4], // October to April
      gameDays: [2, 3, 5, 6, 0], // Tue, Wed, Fri, Sat, Sun
      gamesPerMonth: 8,
      price: 45,
      opponents: ['Boston Celtics', 'Los Angeles Lakers', 'Golden State Warriors', 'Milwaukee Bucks', 'Philadelphia 76ers', 'New York Knicks'],
    },
    {
      name: 'Miami Dolphins',
      venue: 'Hard Rock Stadium',
      address: '347 Don Shula Dr, Miami Gardens, FL 33056',
      neighborhood: 'Miami Gardens',
      lat: 25.958,
      lng: -80.2389,
      url: 'https://www.miamidolphins.com',
      sport: 'NFL',
      season: [9, 1], // September to January
      gameDays: [0, 1, 4], // Sun, Mon (Monday Night), Thu (Thursday Night)
      gamesPerMonth: 2,
      price: 85,
      opponents: ['Buffalo Bills', 'New England Patriots', 'New York Jets', 'Kansas City Chiefs', 'San Francisco 49ers', 'Dallas Cowboys'],
    },
    {
      name: 'Inter Miami CF',
      venue: 'Chase Stadium',
      address: '1350 NW 55th St, Fort Lauderdale, FL 33309',
      neighborhood: 'Fort Lauderdale',
      lat: 26.193,
      lng: -80.1629,
      url: 'https://www.intermiamicf.com',
      sport: 'MLS',
      season: [3, 10], // March to October
      gameDays: [3, 6, 0], // Wed, Sat, Sun
      gamesPerMonth: 4,
      price: 45,
      opponents: ['Atlanta United', 'Orlando City SC', 'New York City FC', 'LA Galaxy', 'LAFC', 'Nashville SC'],
    },
    {
      name: 'Miami Marlins',
      venue: 'loanDepot park',
      address: '501 Marlins Way, Miami, FL 33125',
      neighborhood: 'Little Havana',
      lat: 25.778,
      lng: -80.2196,
      url: 'https://www.mlb.com/marlins',
      sport: 'MLB',
      season: [4, 9], // April to September
      gameDays: [2, 3, 4, 5, 6, 0], // Tue-Sun
      gamesPerMonth: 12,
      price: 25,
      opponents: ['New York Yankees', 'Boston Red Sox', 'Atlanta Braves', 'Philadelphia Phillies', 'New York Mets', 'Tampa Bay Rays'],
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
      season: [10, 4], // October to April
      gameDays: [2, 4, 6, 0], // Tue, Thu, Sat, Sun
      gamesPerMonth: 6,
      price: 40,
      opponents: ['Tampa Bay Lightning', 'Boston Bruins', 'Toronto Maple Leafs', 'New York Rangers', 'Carolina Hurricanes', 'Washington Capitals'],
    },
  ];

  constructor() {
    super('Professional Sports', { weight: 1.5, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const monthsAhead = 3;

    this.log(`Generating sports events for next ${monthsAhead} months...`);

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12

    for (const team of this.teams) {
      // Check if team is in season
      if (!this.isInSeason(currentMonth, team.season)) {
        this.log(`${team.name} is not in season, skipping`);
        continue;
      }

      const teamEvents = this.generateTeamEvents(team, monthsAhead);
      events.push(...teamEvents);
    }

    this.log(`Generated ${events.length} sports events`);
    return events;
  }

  private isInSeason(currentMonth: number, season: [number, number]): boolean {
    const [start, end] = season;
    if (start <= end) {
      return currentMonth >= start && currentMonth <= end;
    } else {
      // Season wraps around year end (e.g., Oct-Apr)
      return currentMonth >= start || currentMonth <= end;
    }
  }

  private generateTeamEvents(team: TeamInfo, monthsAhead: number): RawEvent[] {
    const events: RawEvent[] = [];
    const today = new Date();
    const endDate = addMonths(today, monthsAhead);

    let gamesGenerated = 0;
    let currentDate = today;
    let opponentIndex = 0;

    while (currentDate < endDate && gamesGenerated < team.gamesPerMonth * monthsAhead) {
      const dayOfWeek = getDay(currentDate);

      if (team.gameDays.includes(dayOfWeek)) {
        const opponent = team.opponents[opponentIndex % team.opponents.length];
        const dateStr = format(currentDate, 'yyyy-MM-dd');

        // Determine game time based on sport and day
        let gameTime = '19:00';
        if (team.sport === 'NFL') {
          gameTime = dayOfWeek === 0 ? '13:00' : '20:15'; // Sunday 1pm, weeknight 8:15pm
        } else if (team.sport === 'MLB') {
          gameTime = dayOfWeek === 0 ? '13:10' : '19:10';
        }

        const startAt = `${dateStr}T${gameTime}:00`;

        events.push({
          title: `${team.name} vs ${opponent}`,
          startAt,
          venueName: team.venue,
          address: team.address,
          neighborhood: team.neighborhood,
          lat: team.lat,
          lng: team.lng,
          city: team.neighborhood === 'Fort Lauderdale' || team.neighborhood === 'Sunrise' ? 'Fort Lauderdale' : 'Miami',
          tags: ['local-favorite'],
          category: 'Sports',
          priceLabel: team.price > 50 ? '$$' : '$',
          priceAmount: team.price,
          isOutdoor: team.sport === 'NFL' || team.sport === 'MLS' || team.sport === 'MLB',
          description: `${team.sport} game: ${team.name} vs ${opponent} at ${team.venue}`,
          sourceUrl: team.url,
          sourceName: this.name,
        });

        gamesGenerated++;
        opponentIndex++;

        // Skip some days to spread out games
        currentDate = addDays(currentDate, team.sport === 'MLB' ? 2 : 4);
      } else {
        currentDate = addDays(currentDate, 1);
      }
    }

    return events;
  }
}

import { STORAGE_KEYS, DEFAULT_USER_STATE } from '../constants';
import type { UserState, UserPreferences, UserLocation, FollowItem, UserProfile, FollowType } from '../types';

export function loadUserState(): UserState {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_STATE);
    if (!stored) return DEFAULT_USER_STATE;
    const parsed = JSON.parse(stored);
    return {
      ...DEFAULT_USER_STATE,
      ...parsed,
      following: parsed.following || [],
      profile: parsed.profile || DEFAULT_USER_STATE.profile,
    };
  } catch {
    return DEFAULT_USER_STATE;
  }
}

export function saveUserState(state: UserState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_STATE, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save user state:', e);
  }
}

// Event saves
export function saveEventId(eventId: string): void {
  const state = loadUserState();
  if (!state.savedEventIds.includes(eventId)) {
    state.savedEventIds.push(eventId);
    saveUserState(state);
  }
}

export function unsaveEventId(eventId: string): void {
  const state = loadUserState();
  state.savedEventIds = state.savedEventIds.filter((id) => id !== eventId);
  saveUserState(state);
}

export function getSavedEventIds(): string[] {
  return loadUserState().savedEventIds;
}

// Following
export function addFollow(item: FollowItem): void {
  const state = loadUserState();
  if (!state.following.some((f) => f.id === item.id && f.type === item.type)) {
    state.following.push(item);
    saveUserState(state);
  }
}

export function removeFollow(id: string, type: FollowType): void {
  const state = loadUserState();
  state.following = state.following.filter((f) => !(f.id === id && f.type === type));
  saveUserState(state);
}

export function getFollowing(): FollowItem[] {
  return loadUserState().following;
}

export function isFollowing(id: string, type: FollowType): boolean {
  return loadUserState().following.some((f) => f.id === id && f.type === type);
}

// Preferences
export function savePreferences(preferences: UserPreferences): void {
  const state = loadUserState();
  state.preferences = preferences;
  saveUserState(state);
}

export function getPreferences(): UserPreferences {
  return loadUserState().preferences;
}

// Profile
export function saveProfile(profile: UserProfile): void {
  const state = loadUserState();
  state.profile = profile;
  saveUserState(state);
}

export function getProfile(): UserProfile {
  return loadUserState().profile;
}

// Location
export function saveLocation(location: UserLocation): void {
  const state = loadUserState();
  state.lastKnownLocation = location;
  saveUserState(state);
}

export function getLastKnownLocation(): UserLocation | undefined {
  return loadUserState().lastKnownLocation;
}

export function clearLocation(): void {
  const state = loadUserState();
  state.lastKnownLocation = undefined;
  saveUserState(state);
}

// User-submitted events
export interface UserSubmittedEvent {
  id: string;
  title: string;
  startAt: string;
  venueName?: string;
  address?: string;
  neighborhood: string;
  city: 'Miami' | 'Fort Lauderdale';
  category: string;
  description: string;
  sourceUrl?: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export function saveUserSubmittedEvent(event: UserSubmittedEvent): void {
  try {
    const events = getUserSubmittedEvents();
    events.push(event);
    localStorage.setItem(STORAGE_KEYS.USER_SUBMITTED_EVENTS, JSON.stringify(events));
  } catch (e) {
    console.error('Failed to save user-submitted event:', e);
  }
}

export function getUserSubmittedEvents(): UserSubmittedEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_SUBMITTED_EVENTS);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function deleteUserSubmittedEvent(eventId: string): void {
  try {
    const events = getUserSubmittedEvents();
    const filtered = events.filter((e) => e.id !== eventId);
    localStorage.setItem(STORAGE_KEYS.USER_SUBMITTED_EVENTS, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to delete user-submitted event:', e);
  }
}

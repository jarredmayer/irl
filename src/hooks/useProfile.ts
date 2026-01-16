import { useState, useEffect, useCallback } from 'react';
import { getProfile, saveProfile } from '../services/storage';
import type { UserProfile } from '../types';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setProfile(getProfile());
    setIsLoaded(true);
  }, []);

  const updateProfile = useCallback((newProfile: UserProfile) => {
    saveProfile(newProfile);
    setProfile(newProfile);
  }, []);

  return {
    profile,
    updateProfile,
    isLoaded,
  };
}

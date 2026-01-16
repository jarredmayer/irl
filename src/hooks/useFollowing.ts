import { useState, useEffect, useCallback } from 'react';
import { getFollowing, addFollow, removeFollow } from '../services/storage';
import type { FollowItem, FollowType } from '../types';

export function useFollowing() {
  const [following, setFollowing] = useState<FollowItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setFollowing(getFollowing());
    setIsLoaded(true);
  }, []);

  const follow = useCallback((id: string, type: FollowType, name: string) => {
    const item: FollowItem = { id, type, name, followedAt: Date.now() };
    addFollow(item);
    setFollowing((prev) => [...prev, item]);
  }, []);

  const unfollow = useCallback((id: string, type: FollowType) => {
    removeFollow(id, type);
    setFollowing((prev) => prev.filter((f) => !(f.id === id && f.type === type)));
  }, []);

  const toggleFollow = useCallback((id: string, type: FollowType, name: string) => {
    if (following.some((f) => f.id === id && f.type === type)) {
      unfollow(id, type);
    } else {
      follow(id, type, name);
    }
  }, [following, follow, unfollow]);

  const checkIsFollowing = useCallback((id: string, type: FollowType) => {
    return following.some((f) => f.id === id && f.type === type);
  }, [following]);

  const getFollowingByType = useCallback((type: FollowType) => {
    return following.filter((f) => f.type === type);
  }, [following]);

  return {
    following,
    isLoaded,
    follow,
    unfollow,
    toggleFollow,
    isFollowing: checkIsFollowing,
    getFollowingByType,
    venueIds: following.filter((f) => f.type === 'venue').map((f) => f.id),
    seriesIds: following.filter((f) => f.type === 'series').map((f) => f.id),
    neighborhoodIds: following.filter((f) => f.type === 'neighborhood').map((f) => f.id),
  };
}

/**
 * P0-2: Type-safe localStorage utilities for menu state
 * Provides runtime validation for stored menu items
 */

export interface MenuStorageConfig<T extends string> {
  storageKey: string;
  validMenuItems: Set<T>;
  defaultMenuItem: T;
}

/**
 * Create a type-safe menu storage handler
 */
export function createMenuStorage<T extends string>(
  config: MenuStorageConfig<T>
) {
  const { storageKey, validMenuItems, defaultMenuItem } = config;

  /**
   * Get menu item from localStorage with runtime validation
   */
  const getMenuItem = (): T => {
    try {
      const stored = localStorage.getItem(storageKey);

      // Validate stored value is a valid menu item
      if (stored && validMenuItems.has(stored as T)) {
        return stored as T;
      }

      // Invalid or missing value, return default
      return defaultMenuItem;
    } catch (error) {
      // localStorage not available (e.g., private browsing)
      console.warn(`Failed to read from localStorage (${storageKey}):`, error);
      return defaultMenuItem;
    }
  };

  /**
   * Save menu item to localStorage
   */
  const setMenuItem = (item: T): void => {
    try {
      // Only save if it's a valid menu item
      if (!validMenuItems.has(item)) {
        console.error(`Invalid menu item: ${item}. Not saving to localStorage.`);
        return;
      }

      localStorage.setItem(storageKey, item);
    } catch (error) {
      console.error(`Failed to save menu item to localStorage (${storageKey}):`, error);
    }
  };

  /**
   * Clear menu item from localStorage
   */
  const clearMenuItem = (): void => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error(`Failed to clear menu item from localStorage (${storageKey}):`, error);
    }
  };

  return {
    getMenuItem,
    setMenuItem,
    clearMenuItem,
  };
}

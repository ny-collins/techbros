import { store } from '../public/js/store.js';

describe('Store', () => {
  beforeEach(() => {
    store.state = {
      version: '2.0.0',
      resources: [],
      settings: {
        theme: 'dark',
        layout: 'grid',
        lastSeen: Date.now()
      },
      user: {
        peerId: null,
        pin: null
      }
    };
    localStorage.getItem.mockClear();
    localStorage.setItem.mockClear();
  });

  describe('getVersion', () => {
    test('returns the correct version', () => {
      expect(store.getVersion()).toBe('2.0.0');
    });
  });

  describe('search', () => {
    beforeEach(() => {
      store.state.resources = [
        { title: 'Calculus', type: 'pdf', url: '/resources/calc.pdf' },
        { title: 'Physics Video', type: 'video', url: '/resources/physics.mp4' },
        { title: 'Music Track', type: 'audio', url: '/resources/music.mp3' }
      ];
    });

    test('returns all resources when query is empty', async () => {
      const results = await store.search('');
      expect(results).toHaveLength(3);
    });

    test('filters resources by substring match', async () => {
      const results = await store.search('calc');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Calculus');
    });

    test('filters resources by fuzzy match', async () => {
      const results = await store.search('calculs');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Calculus');
    });

    test('is case insensitive', async () => {
      const results = await store.search('CALCULUS');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Calculus');
    });
  });

  describe('updateSetting', () => {
    test('updates a setting and saves to localStorage', () => {
      store.updateSetting('theme', 'light');
      expect(store.getSettings().theme).toBe('light');
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'techbros_settings',
        JSON.stringify({ ...store.state.settings, theme: 'light' })
      );
    });

    test('does not update invalid settings', () => {
      store.updateSetting('invalid', 'value');
      expect(store.getSettings().invalid).toBeUndefined();
    });
  });

  describe('_levenshtein', () => {
    test('calculates edit distance correctly', () => {
      expect(store._levenshtein('kitten', 'sitting')).toBe(3);
      expect(store._levenshtein('book', 'back')).toBe(2);
      expect(store._levenshtein('test', 'test')).toBe(0);
    });
  });
});
import { useState } from 'react';
import { useGameActions } from '../hooks/useGameActions';
import type { PlayerColor } from '@/shared/types';

const COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow'];
const COLOR_HEX: Record<PlayerColor, string> = {
  red: '#E74C3C',
  blue: '#3498DB',
  green: '#2ECC71',
  yellow: '#F1C40F',
};

const DEFAULT_PLAYER_COUNT = 2;

export function GameLobby() {
  const [playerCount, setPlayerCount] = useState(DEFAULT_PLAYER_COUNT);
  const [names, setNames] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { createGame } = useGameActions();

  function updateName(i: number, value: string) {
    setNames((prev) => prev.map((n, idx) => (idx === i ? value : n)));
  }

  async function handleStart() {
    setError(null);
    const activePlayers = names.slice(0, playerCount).map((n, i) => ({
      name: n.trim(),
      color: COLORS[i],
    }));
    const invalid = activePlayers.find((p) => p.name.length === 0 || p.name.length > 20);
    if (invalid) {
      setError('Each player needs a name (1–20 characters).');
      return;
    }
    setLoading(true);
    try {
      await createGame({ players: activePlayers });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start game');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Can't Stop</h1>
      <p style={styles.subtitle}>Push-your-luck dice game for 2–4 players</p>

      <div style={styles.card}>
        <label style={styles.label}>Number of players</label>
        <div style={styles.countRow}>
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              style={{ ...styles.countBtn, ...(playerCount === n ? styles.countBtnActive : {}) }}
              onClick={() => setPlayerCount(n)}
            >
              {n}
            </button>
          ))}
        </div>

        <div style={styles.playerList}>
          {Array.from({ length: playerCount }).map((_, i) => (
            <div key={i} style={styles.playerRow}>
              <span style={{ ...styles.colorDot, background: COLOR_HEX[COLORS[i]] }} />
              <input
                style={styles.input}
                type="text"
                placeholder={`Player ${i + 1} name`}
                value={names[i]}
                maxLength={20}
                onChange={(e) => updateName(i, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                aria-label={`Player ${i + 1} name`}
              />
            </div>
          ))}
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={styles.startBtn}
          onClick={handleStart}
          disabled={loading}
          aria-label="Start game"
        >
          {loading ? 'Starting…' : 'Start Game'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '2rem',
  },
  title: { fontSize: '3rem', fontWeight: 900, color: '#fff', marginBottom: '0.25rem' },
  subtitle: { color: '#aaa', marginBottom: '2rem' },
  card: {
    background: '#16213e',
    borderRadius: '1rem',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  label: { color: '#ccc', fontWeight: 600 },
  countRow: { display: 'flex', gap: '0.5rem' },
  countBtn: {
    flex: 1,
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: '2px solid #334',
    background: 'transparent',
    color: '#ccc',
    fontSize: '1.1rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  countBtnActive: { border: '2px solid #4a9eff', color: '#fff', background: '#1a3a6e' },
  playerList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  playerRow: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  colorDot: { width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0 },
  input: {
    flex: 1,
    padding: '0.5rem 0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #334',
    background: '#0f1b35',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
  },
  error: { color: '#E74C3C', fontSize: '0.9rem' },
  startBtn: {
    padding: '0.75rem',
    borderRadius: '0.75rem',
    border: 'none',
    background: '#4a9eff',
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
};

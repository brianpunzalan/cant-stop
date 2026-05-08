import { useGameState } from '../hooks/useGameState';
import { useGameActions } from '../hooks/useGameActions';

const COLOR_HEX: Record<string, string> = {
  red: '#E74C3C', blue: '#3498DB', green: '#2ECC71', yellow: '#F1C40F',
};

export function WinnerScreen() {
  const game = useGameState((s) => s.game);
  const { clearFinishedGames } = useGameActions();

  if (!game || game.status !== 'finished') return null;

  const winner = game.players.find((p) => p.id === game.winnerId);
  if (!winner) return null;

  async function handleNewGame() {
    await clearFinishedGames();
    // Reset store to null — GameLobby will be shown
    window.location.reload();
  }

  return (
    <div style={styles.overlay} role="dialog" aria-label="Winner screen">
      <div style={styles.card}>
        <div
          style={{ ...styles.trophy, color: COLOR_HEX[winner.color] }}
          aria-hidden="true"
        >
          🏆
        </div>
        <h2 style={styles.heading}>{winner.name} wins!</h2>
        <p style={styles.sub}>
          {winner.name} claimed columns{' '}
          {winner.claimedColumns.sort((a, b) => a - b).join(', ')}
        </p>
        <button style={styles.btn} onClick={handleNewGame} aria-label="Start a new game">
          New Game
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  card: {
    background: '#16213e',
    borderRadius: '1.25rem',
    padding: '2.5rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxWidth: '360px',
    width: '90%',
  },
  trophy: { fontSize: '4rem' },
  heading: { color: '#fff', fontSize: '2rem', fontWeight: 900 },
  sub: { color: '#aaa', fontSize: '1rem' },
  btn: {
    marginTop: '0.5rem',
    padding: '0.75rem 2rem',
    borderRadius: '0.75rem',
    border: 'none',
    background: '#4a9eff',
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
};

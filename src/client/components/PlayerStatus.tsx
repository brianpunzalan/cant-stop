import { useGameState } from '../hooks/useGameState';

const COLOR_HEX: Record<string, string> = {
  red: '#E74C3C', blue: '#3498DB', green: '#2ECC71', yellow: '#F1C40F',
};

export function PlayerStatus() {
  const game = useGameState((s) => s.game);
  if (!game) return null;

  return (
    <div style={styles.container}>
      {game.players.map((player, i) => {
        const isActive = i === game.currentPlayerIndex && game.status === 'playing';
        return (
          <div
            key={player.id}
            style={{
              ...styles.playerCard,
              ...(isActive ? styles.activeCard : {}),
            }}
            aria-label={`${player.name} status`}
          >
            <div style={styles.header}>
              <span style={{ ...styles.dot, background: COLOR_HEX[player.color] }} />
              <span style={styles.name}>{player.name}</span>
              {isActive && <span style={styles.activeBadge}>Playing</span>}
            </div>
            <div style={styles.claimed}>
              <span style={styles.claimedLabel}>Claimed columns: </span>
              {player.claimedColumns.length === 0 ? (
                <span style={styles.none}>—</span>
              ) : (
                player.claimedColumns.map((c) => (
                  <span key={c} style={{ ...styles.col, background: COLOR_HEX[player.color] }}>
                    {c}
                  </span>
                ))
              )}
            </div>
            <div style={styles.score}>
              <span style={styles.scoreLabel}>{player.claimedColumns.length} / 3</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  playerCard: {
    padding: '0.75rem',
    borderRadius: '0.5rem',
    background: '#16213e',
    border: '1px solid #334',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  activeCard: { border: '1px solid #4a9eff' },
  header: { display: 'flex', alignItems: 'center', gap: '0.4rem' },
  dot: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
  name: { fontWeight: 700, color: '#fff', fontSize: '0.95rem', flex: 1 },
  activeBadge: {
    fontSize: '0.7rem',
    background: '#4a9eff',
    color: '#fff',
    padding: '0.1rem 0.4rem',
    borderRadius: '1rem',
  },
  claimed: { display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' },
  claimedLabel: { color: '#888', fontSize: '0.8rem' },
  none: { color: '#555', fontSize: '0.85rem' },
  col: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  score: {},
  scoreLabel: { color: '#aaa', fontSize: '0.8rem' },
};

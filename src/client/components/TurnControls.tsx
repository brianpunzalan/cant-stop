import { useState } from 'react';
import { useGameState } from '../hooks/useGameState';
import { useGameActions } from '../hooks/useGameActions';
import { SplitSelector } from './SplitSelector';

interface Props {
  onBust?: () => void;
}

export function TurnControls({ onBust }: Props) {
  const game = useGameState((s) => s.game);
  const currentRoll = useGameState((s) => s.currentRoll);
  const [rolling, setRolling] = useState(false);
  const [bustMessage, setBustMessage] = useState<string | null>(null);
  const { rollDice, stop } = useGameActions();

  if (!game || game.status !== 'playing') return null;

  const currentPlayer = game.players[game.currentPlayerIndex];
  const canStop = game.turn.hasRolled && !currentRoll;
  const canRoll = !currentRoll && !rolling;

  async function handleRoll() {
    setBustMessage(null);
    setRolling(true);
    // FR-022: animate for ~1 second before resolving
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const roll = await rollDice();
      if (roll.allUnusable) {
        setBustMessage(`${currentPlayer.name} busted! Next player's turn.`);
        onBust?.();
      }
    } finally {
      setRolling(false);
    }
  }

  async function handleStop() {
    await stop();
  }

  return (
    <div style={styles.container}>
      <div style={styles.playerInfo}>
        <span style={{ ...styles.colorDot, background: playerColor(currentPlayer.color) }} />
        <span style={styles.playerName}>{currentPlayer.name}'s turn</span>
      </div>

      {bustMessage && <div style={styles.bust}>{bustMessage}</div>}

      {rolling && <div style={styles.rolling}>Rolling dice…</div>}

      {currentRoll && !rolling && (
        <SplitSelector roll={currentRoll} />
      )}

      <div style={styles.buttons}>
        <button
          style={{ ...styles.btn, ...styles.rollBtn }}
          onClick={handleRoll}
          disabled={!canRoll || !!currentRoll}
          aria-label="Roll dice"
          aria-disabled={!canRoll || !!currentRoll}
        >
          Roll
        </button>
        <button
          style={{ ...styles.btn, ...styles.stopBtn, ...(!canStop ? styles.disabled : {}) }}
          onClick={handleStop}
          disabled={!canStop}
          aria-label="Stop and commit progress"
          aria-disabled={!canStop}
        >
          Stop
        </button>
      </div>
    </div>
  );
}

function playerColor(color: string): string {
  const map: Record<string, string> = {
    red: '#E74C3C', blue: '#3498DB', green: '#2ECC71', yellow: '#F1C40F',
  };
  return map[color] ?? '#fff';
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    padding: '1rem',
    background: '#16213e',
    borderRadius: '0.75rem',
    minWidth: '220px',
  },
  playerInfo: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  colorDot: { width: '14px', height: '14px', borderRadius: '50%' },
  playerName: { fontWeight: 700, color: '#fff', fontSize: '1rem' },
  bust: {
    background: '#E74C3C22',
    border: '1px solid #E74C3C',
    borderRadius: '0.5rem',
    padding: '0.5rem',
    color: '#E74C3C',
    fontSize: '0.9rem',
  },
  rolling: { color: '#aaa', fontStyle: 'italic', fontSize: '0.9rem' },
  buttons: { display: 'flex', gap: '0.5rem' },
  btn: {
    flex: 1,
    padding: '0.6rem',
    borderRadius: '0.5rem',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  rollBtn: { background: '#4a9eff', color: '#fff' },
  stopBtn: { background: '#2ECC71', color: '#fff' },
  disabled: { opacity: 0.4, cursor: 'not-allowed' },
};

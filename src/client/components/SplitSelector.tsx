import { useGameActions } from '../hooks/useGameActions';
import type { Roll, Split } from '@/shared/types';

interface Props {
  roll: Roll;
}

export function SplitSelector({ roll }: Props) {
  const { selectSplit } = useGameActions();

  async function handleSelect(split: Split) {
    if (split.usability === 'unusable') return;
    await selectSplit(split.index as 0 | 1 | 2);
  }

  return (
    <div style={styles.container}>
      <div style={styles.diceRow} aria-label="Dice results">
        {roll.dice.map((d, i) => (
          <span key={i} style={styles.die} aria-label={`Die ${i + 1}: ${d}`}>
            {d}
          </span>
        ))}
      </div>

      <p style={styles.label}>Choose a pairing:</p>

      <div style={styles.splits} role="group" aria-label="Split options">
        {roll.splits.map((split) => {
          const disabled = split.usability === 'unusable';
          return (
            <button
              key={split.index}
              style={{
                ...styles.splitBtn,
                ...(disabled ? styles.splitDisabled : styles.splitEnabled),
              }}
              disabled={disabled}
              aria-disabled={disabled}
              aria-label={splitLabel(split)}
              onClick={() => handleSelect(split)}
            >
              <span style={styles.sums}>
                {split.sumA} + {split.sumB}
              </span>
              <span style={styles.badge}>
                {usabilityLabel(split.usability)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function splitLabel(split: Split): string {
  return `Split ${split.index + 1}: columns ${split.sumA} and ${split.sumB} — ${split.usability}`;
}

function usabilityLabel(u: string): string {
  if (u === 'fully-usable') return 'Both';
  if (u === 'partially-usable') return 'Partial';
  return 'Blocked';
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  diceRow: { display: 'flex', gap: '0.4rem', justifyContent: 'center' },
  die: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
    color: '#111',
    borderRadius: '6px',
    fontWeight: 900,
    fontSize: '1.2rem',
  },
  label: { color: '#aaa', fontSize: '0.85rem', textAlign: 'center' },
  splits: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  splitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid transparent',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: 600,
    transition: 'opacity 0.1s',
    width: '100%',
  },
  splitEnabled: {
    background: '#1a3a6e',
    border: '1px solid #4a9eff',
    color: '#fff',
  },
  splitDisabled: {
    background: '#222',
    border: '1px solid #444',
    color: '#666',
    cursor: 'not-allowed',
  },
  sums: { fontSize: '1.1rem' },
  badge: { fontSize: '0.75rem', opacity: 0.8 },
};

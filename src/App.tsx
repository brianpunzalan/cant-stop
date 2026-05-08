import { useEffect } from 'react';
import { useGameState } from './client/hooks/useGameState';
import { useGameActions } from './client/hooks/useGameActions';
import { GameLobby } from './client/components/GameLobby';
import { GameBoard } from './client/pixi/GameBoard';
import { TurnControls } from './client/components/TurnControls';
import { PlayerStatus } from './client/components/PlayerStatus';
import { WinnerScreen } from './client/components/WinnerScreen';

export function App() {
  const game = useGameState((s) => s.game);
  const { restoreGame } = useGameActions();

  // FR-020: restore in-progress game on page load
  useEffect(() => {
    restoreGame().catch(() => {/* no saved game */});
  }, [restoreGame]);

  if (!game || game.status === 'setup') {
    return <GameLobby />;
  }

  return (
    <div style={styles.layout}>
      {game.status === 'finished' && <WinnerScreen />}

      <div style={styles.board}>
        <GameBoard />
      </div>

      <div style={styles.sidebar}>
        <PlayerStatus />
        <TurnControls />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5rem',
    padding: '1.5rem',
    minHeight: '100vh',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  board: { flex: '0 0 auto' },
  sidebar: {
    flex: '0 0 240px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
};

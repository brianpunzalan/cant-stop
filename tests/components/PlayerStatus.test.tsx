import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerStatus } from '@/client/components/PlayerStatus';
import { gameStore } from '@/store/gameStore';
import { createBoard } from '@/server/engine/board';
import { createFreshTurn } from '@/server/engine/rules';
import type { Game } from '@/shared/types';

function makeGame(overrides: Partial<Game> = {}): Game {
  const players = [
    { id: 'p1', name: 'Alice', color: 'red' as const, claimedColumns: [7, 9] },
    { id: 'p2', name: 'Bob', color: 'blue' as const, claimedColumns: [] },
  ];
  return {
    id: 'g1',
    players,
    board: createBoard(),
    currentPlayerIndex: 0,
    turn: createFreshTurn('p1'),
    currentRoll: null,
    status: 'playing',
    winnerId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('PlayerStatus — renders player info', () => {
  it('renders all player names', () => {
    gameStore.setState({ game: makeGame(), currentRoll: null });
    render(<PlayerStatus />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows claimed columns for Alice', () => {
    gameStore.setState({ game: makeGame(), currentRoll: null });
    render(<PlayerStatus />);
    // Alice has columns 7 and 9
    const aliceStatus = screen.getByLabelText('Alice status');
    expect(aliceStatus).toHaveTextContent('7');
    expect(aliceStatus).toHaveTextContent('9');
  });

  it('shows "Playing" badge for active player', () => {
    gameStore.setState({ game: makeGame(), currentRoll: null });
    render(<PlayerStatus />);
    expect(screen.getByText('Playing')).toBeInTheDocument();
  });

  it('shows score as X/3', () => {
    gameStore.setState({ game: makeGame(), currentRoll: null });
    render(<PlayerStatus />);
    expect(screen.getByText('2 / 3')).toBeInTheDocument(); // Alice has 2
    expect(screen.getByText('0 / 3')).toBeInTheDocument(); // Bob has 0
  });

  it('renders nothing when no game', () => {
    gameStore.setState({ game: null, currentRoll: null });
    const { container } = render(<PlayerStatus />);
    expect(container).toBeEmptyDOMElement();
  });
});

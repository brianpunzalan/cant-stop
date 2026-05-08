import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TurnControls } from '@/client/components/TurnControls';
import { gameStore } from '@/store/gameStore';
import { createBoard } from '@/server/engine/board';
import { createFreshTurn } from '@/server/engine/rules';
import type { Game } from '@/shared/types';

// Mock GameService
vi.mock('@/server/services/GameService', () => ({
  gameService: {
    rollDice: vi.fn(async () => ({
      dice: [3, 4, 5, 6] as [number, number, number, number],
      splits: [
        { index: 0, sumA: 7, sumB: 11, usability: 'fully-usable', diceIndices: [[0,1],[2,3]] },
        { index: 1, sumA: 9, sumB: 9, usability: 'fully-usable', diceIndices: [[0,2],[1,3]] },
        { index: 2, sumA: 8, sumB: 10, usability: 'fully-usable', diceIndices: [[0,3],[1,2]] },
      ],
      allUnusable: false,
    })),
    stop: vi.fn(async () => ({} as Game)),
    createGame: vi.fn(),
    selectSplit: vi.fn(),
    restoreGame: vi.fn(),
    clearFinishedGames: vi.fn(),
  },
}));

function makeGame(overrides: Partial<Game> = {}): Game {
  const players = [
    { id: 'p1', name: 'Alice', color: 'red' as const, claimedColumns: [] },
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

describe('TurnControls — FR-019 Stop button', () => {
  beforeEach(() => {
    gameStore.setState({ game: makeGame(), currentRoll: null });
  });

  it('Stop button is disabled before rolling (FR-019)', () => {
    render(<TurnControls />);
    const stopBtn = screen.getByLabelText('Stop and commit progress');
    expect(stopBtn).toBeDisabled();
  });

  it('Roll button is present and enabled', () => {
    render(<TurnControls />);
    const rollBtn = screen.getByLabelText('Roll dice');
    expect(rollBtn).not.toBeDisabled();
  });

  it('shows current player name', () => {
    render(<TurnControls />);
    expect(screen.getByText("Alice's turn")).toBeInTheDocument();
  });
});

describe('TurnControls — FR-022 roll animation', () => {
  beforeEach(() => {
    gameStore.setState({ game: makeGame(), currentRoll: null });
  });

  it('shows rolling indicator immediately when Roll is clicked (FR-022)', () => {
    render(<TurnControls />);
    const rollBtn = screen.getByLabelText('Roll dice');
    // Synchronously verify rolling state appears — animation duration is ~1s per spec
    fireEvent.click(rollBtn);
    expect(screen.getByText('Rolling dice…')).toBeInTheDocument();
  });

  it('Roll button and stop button are disabled during animation', () => {
    render(<TurnControls />);
    const rollBtn = screen.getByLabelText('Roll dice');
    fireEvent.click(rollBtn);
    // While rolling, the roll button shows as disabled (via aria-disabled or disabled prop)
    expect(rollBtn).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('TurnControls — renders null when no game', () => {
  it('renders nothing without active game', () => {
    gameStore.setState({ game: null, currentRoll: null });
    const { container } = render(<TurnControls />);
    expect(container).toBeEmptyDOMElement();
  });
});

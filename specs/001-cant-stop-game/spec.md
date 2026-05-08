# Feature Specification: Can't Stop — Digital Board Game

**Feature Branch**: `001-cant-stop-game`  
**Created**: 2026-05-07  
**Status**: Draft  
**Input**: User description: "Can't Stop — a turn-based, push-your-luck dice game for 2–4 players"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Play a Complete Game (Priority: P1)

Two to four players sit down to play a full game of Can't Stop from setup through to a declared winner. Each player takes turns rolling dice, choosing how to pair their results, advancing provisional markers up numbered columns, and deciding whether to stop and commit their progress or push their luck with another roll. The game ends the moment any player claims their third column.

**Why this priority**: This is the entire product — every other user story is a sub-step of this flow. Without a playable end-to-end game, nothing else has value.

**Independent Test**: A complete 2-player game can be started, played through to a winner, and declared complete with no manual intervention beyond player decisions.

**Acceptance Scenarios**:

1. **Given** a new game is started with 2 players, **When** players alternate turns rolling and stopping until one player claims 3 columns, **Then** that player is declared the winner and the game ends immediately.
2. **Given** a game is in progress, **When** a player claims their third column on a STOP action, **Then** all climber progress is committed, all three columns are marked as claimed, and no further play is possible.
3. **Given** a 4-player game, **When** player order is established, **Then** turns rotate in the correct sequence and each player can only act on their own turn.

---

### User Story 2 - Roll Dice and Choose a Pairing (Priority: P1)

On their turn, a player rolls four dice and is presented with all non-unusable ways to pair the dice into two sums. The player may freely select any non-unusable pairing — including a partially usable one even when a fully usable option is also available. If all pairings are unusable, the player busts automatically.

**Why this priority**: Dice rolling and split selection is the core mechanic every turn depends on. It must be correct for the game to function.

**Independent Test**: A single turn can be simulated in isolation — roll dice, display valid pairings, select one, and observe climber advances — without needing a full game session.

**Acceptance Scenarios**:

1. **Given** a player is in their turn, **When** they roll four dice, **Then** all three possible pair-splits are computed and each is classified as fully usable, partially usable, or unusable.
2. **Given** at least one split is fully usable and the player selects a fully usable split, **When** it is applied, **Then** both sums are applied as advances and the player is offered the choice to stop or roll again.
3. **Given** at least one split is usable or partially usable and the player selects a partially usable split, **When** it is applied, **Then** only the usable sum is applied as an advance and the player is offered the choice to stop or roll again.
4. **Given** all splits are unusable, **When** the roll resolves, **Then** the player busts automatically — no split selection is presented and the turn ends.
5. **Given** a chosen split has two equal sums (doubles), **When** it is applied, **Then** the matching column is advanced twice in sequence.

---

### User Story 3 - Manage Provisional Climbers (Priority: P2)

During a turn, a player can have up to three active climbers on the board — one per column. Each advance either places a new climber on a column (starting above the player's committed position) or moves an existing climber up. The player cannot open a fourth column while three are already active. Climbers at the summit of a column are provisionally claimed but not finalized.

**Why this priority**: Climber management is the spatial heart of the game and must correctly reflect the "at most 3 active columns" constraint to prevent illegal game states.

**Independent Test**: A turn scenario where climbers are placed, advanced, and capped at the summit can be fully tested without a complete game by inspecting the turn's provisional state after each roll.

**Acceptance Scenarios**:

1. **Given** a player has zero active climbers, **When** a sum is applied to a column, **Then** a climber is placed one step above the player's committed position on that column.
2. **Given** a player has three active climbers and a sum targets a column with no climber, **When** the advance is evaluated, **Then** that sum is treated as unusable (capacity exceeded).
3. **Given** a climber reaches the top space of a column, **When** the player stops, **Then** that column is claimed by the player.
4. **Given** a climber is at the summit and the player busts, **When** the bust resolves, **Then** the column remains unclaimed and the climber is discarded.

---

### User Story 4 - Stop and Commit Turn Progress (Priority: P2)

After any roll that does not bust, the player may choose to stop. Stopping commits all provisional climber positions to permanent board positions. Any column where a climber sits at the summit is claimed for that player. The turn then passes to the next player.

**Why this priority**: The stop decision is where push-your-luck tension resolves and progress becomes permanent. Correct commit behavior is essential to game integrity.

**Independent Test**: A turn ending in STOP can be tested by verifying that all climber positions are written to permanent state, claimed columns are locked, and the next player's turn begins.

**Acceptance Scenarios**:

1. **Given** a player has active climbers and chooses to stop, **When** STOP is executed, **Then** each climber's position becomes the player's new committed position on that column.
2. **Given** a column has a climber at its summit when the player stops, **When** the commit resolves, **Then** that column is permanently claimed by the player, all opponent markers on it are removed, and the column is closed to further play.
3. **Given** a player claims their third column on a STOP, **When** the commit resolves, **Then** the game ends immediately with that player as winner.
4. **Given** a turn ends (stop or bust), **When** the next turn begins, **Then** the climbers are reset and the active columns are empty.

---

### User Story 5 - Bust and Lose Turn Progress (Priority: P2)

If a roll produces no legally usable pairing, the player busts. All provisional climber positions from the current turn are discarded. Previously committed board positions are unaffected. The turn passes to the next player.

**Why this priority**: The bust mechanic is the primary risk element of the game. It must correctly discard only transient progress without touching committed state.

**Independent Test**: A bust scenario can be verified by rolling a state that produces no valid splits, confirming climbers are discarded, confirming committed board positions are unchanged, and confirming the turn advances.

**Acceptance Scenarios**:

1. **Given** a player has active climbers and their roll produces no usable splits, **When** the bust resolves, **Then** all climber positions are discarded and the board's committed state is unchanged.
2. **Given** a player busts, **When** the next player's turn starts, **Then** the busted player's committed markers remain exactly as they were before their turn began.

---

### Edge Cases

- A column is claimed by an opponent mid-game: the column closes, all player markers on it are removed (including any committed progress by other players), and no further advances on that column are possible.
- A player's climber is on a column that gets claimed by an opponent on the same turn: the climber is discarded at bust or overridden by the opponent's claim; the player loses that progress.
- Three climbers are all at their respective summits at the same time: the player may stop and claim all three columns in a single commit, which may be game-winning.
- A roll produces a split where both sums target already-claimed columns: that split is fully unusable.
- A roll produces only splits where one sum targets a closed column and the other would open a fourth active column: all splits are unusable and the player busts.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support 2 to 4 players per game session.
- **FR-002**: The system MUST maintain a board of 11 columns numbered 2 through 12, each with the correct height (3, 5, 7, 9, 11, 13, 11, 9, 7, 5, 3 spaces respectively).
- **FR-003**: The system MUST track committed player progress (0 to column height) and climber progress separately for each column and each player.
- **FR-004**: The system MUST track which columns have been claimed and prevent any movement on claimed columns.
- **FR-005**: The system MUST enforce a maximum of 3 active climber columns per turn.
- **FR-006**: The system MUST simulate rolling 4 six-sided dice on each roll action.
- **FR-007**: The system MUST compute all three possible pair-splits from a 4-dice roll and classify each split as fully usable, partially usable, or unusable based on current game state.
- **FR-008**: The system MUST allow the active player to freely select any non-unusable split, including a partially usable split even when a fully usable split is also available.
- **FR-009**: The system MUST apply only the usable sum when the player selects a partially usable split, and apply both sums when the player selects a fully usable split.
- **FR-010**: The system MUST automatically trigger a bust when all splits are unusable.
- **FR-011**: The system MUST advance a column's climber by the correct amount when a sum is applied, placing a new climber one step above the player's committed position if no climber exists, or advancing the existing climber otherwise.
- **FR-012**: The system MUST cap climber advancement at the column's summit (height) and not advance beyond it.
- **FR-013**: The system MUST handle doubles (both sums in a chosen split equal) by advancing the same column twice in sequence.
- **FR-014**: On a STOP action, the system MUST commit all active climber positions to permanent board state.
- **FR-015**: On a STOP action where a climber is at the summit, the system MUST claim that column for the current player, remove all opponent markers from it, and permanently close it.
- **FR-016**: On a BUST, the system MUST discard all climber positions without modifying any player's committed board state.
- **FR-017**: The system MUST pass the turn to the next player after every STOP or BUST.
- **FR-018**: The system MUST end the game immediately when a player's claimed column count reaches 3, declaring that player the winner.
- **FR-019**: The system MUST prevent a player from stopping before making their first roll of a turn.
- **FR-020**: The system MUST auto-save the complete game state to IndexedDB after every state-mutating action (roll, split selection, stop, bust). On page load, if a saved in-progress game exists, it MUST be automatically restored without user intervention.

### Key Entities

- **Game**: The overall session — tracks players, whose turn it is, and whether the game has ended.
- **Board**: The 11-column grid tracking each player's committed position and which columns are claimed.
- **Column**: A single numbered track (2–12) with a fixed height, a claimed status, and per-player committed positions.
- **Turn**: Transient per-turn state — the set of active columns and climber positions, reset after every STOP or BUST.
- **Roll**: A single dice-roll event — the 4 dice values, the 3 computed splits, and their usability classifications.
- **Player**: An individual participant — their identifier, claimed column count, and committed positions per column.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 20 functional requirements are satisfied and pass automated verification.
- **SC-002**: A complete 2-player game can be started, played to completion, and produce a winner in a single uninterrupted session with no invalid state transitions.
- **SC-003**: Every edge case identified in the specification (§ Edge Cases) produces the correct outcome under automated testing with 100% pass rate.
- **SC-004**: The bust mechanic correctly discards climber progress and preserves committed state across all possible 4-dice roll combinations (all 6^4 = 1296 outcomes representable).
- **SC-005**: The split-pairing classification (fully usable / partial / unusable) is correct for every possible combination of dice values and game state.
- **SC-006**: The game correctly detects a win condition at the moment of the third column claim and terminates without allowing further play.
- **SC-007**: Turn order is maintained correctly across a full game of 4 players with no skipped or duplicated turns.

---

## Assumptions

- The game is implemented as a single software application (platform unspecified); networking, real-time multiplayer over a network, and persistent cloud saves are out of scope.
- All players share the same device/interface (hot-seat multiplayer); no player authentication or identity management is required.
- The random dice roll is assumed to be sufficiently random for gameplay purposes; cryptographic randomness is not required.
- Player colors/identities are assigned at game start and do not change during a session.
- The game does not implement any AI/computer-controlled players; all players are human.
- There are no time limits per turn; the game is fully asynchronous from a timing perspective.
- House rules, solo variants, cooperative variants, and tournament rules are explicitly out of scope.
- The game auto-saves state to browser-local storage (IndexedDB) on every state change. An in-progress game is automatically restored if the page is refreshed. No explicit save/load UI is required; persistence is transparent to the player.

---

## Clarifications

### Session 2026-05-08

- Q: What is the intended persistence scope for game sessions? → A: Auto-save to IndexedDB on every state change; in-progress game survives page refresh automatically (no explicit save/load UI).

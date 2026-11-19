import { useMemo, useState } from 'react';
import './styles.css';

type StoneColor = 'black' | 'white';
type Cell = {
  color: StoneColor | null;
  word: string;
  number: number | null;
  revealed: boolean;
};
type TeamNames = Record<StoneColor, string>;
type SelectedMove = { row: number; col: number; word: string; number: number };
type GameSnapshot = {
  board: Cell[][];
  turn: StoneColor;
  moveNumber: number;
  notice: string;
};

const SIZE = 6;
const defaultTeamNames: TeamNames = { black: '黒チーム', white: '白チーム' };
const directions = [-1, 0, 1]
  .flatMap((row) => [-1, 0, 1].map((col) => [row, col] as const))
  .filter(([row, col]) => row !== 0 || col !== 0);

const words = [
  '河原町', 'キリン', 'インターネット', '滋賀', '京都', '宇治',
  '料理', '本', '馬', '母', 'うさぎ', '大阪',
  'パソコン', '雨', '花', 'オリンピック',
  '誕生日', '白', '犬', '日本',
  'サッカー', '時計', 'ねこ', 'うどん', '桃', '駅',
  '祇園', '医者', 'コンビニ', '飛行機', '船', '出町柳',
];

function makeBoard(): Cell[][] {
  let wordIndex = 0;
  return Array.from({ length: SIZE }, (_, row) =>
    Array.from({ length: SIZE }, (_, col) => {
      const center = row >= 2 && row <= 3 && col >= 2 && col <= 3;
      if (center) {
        return { color: row === col ? 'white' : 'black', word: '', number: null, revealed: false };
      }
      const number = wordIndex + 1;
      return { color: null, word: words[wordIndex++], number, revealed: false };
    }),
  );
}

function opponent(color: StoneColor): StoneColor {
  return color === 'black' ? 'white' : 'black';
}

function flipsFor(board: Cell[][], row: number, col: number, turn: StoneColor) {
  if (board[row][col].color) return [];
  const flips: Array<[number, number]> = [];

  directions.forEach(([rowStep, colStep]) => {
    const line: Array<[number, number]> = [];
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (
      nextRow >= 0 && nextRow < SIZE && nextCol >= 0 && nextCol < SIZE &&
      board[nextRow][nextCol].color === opponent(turn)
    ) {
      line.push([nextRow, nextCol]);
      nextRow += rowStep;
      nextCol += colStep;
    }

    if (
      line.length > 0 && nextRow >= 0 && nextRow < SIZE &&
      nextCol >= 0 && nextCol < SIZE && board[nextRow][nextCol].color === turn
    ) {
      flips.push(...line);
    }
  });

  return flips;
}

function legalMoves(board: Cell[][], turn: StoneColor) {
  const moves = new Set<string>();
  board.forEach((row, rowIndex) => row.forEach((_, colIndex) => {
    if (flipsFor(board, rowIndex, colIndex, turn).length > 0) moves.add(`${rowIndex}-${colIndex}`);
  }));
  return moves;
}

export default function Home() {
  const [board, setBoard] = useState<Cell[][]>(() => makeBoard());
  const [turn, setTurn] = useState<StoneColor>('black');
  const [moveNumber, setMoveNumber] = useState(1);
  const [flipping, setFlipping] = useState<Set<string>>(new Set());
  const [teamNames, setTeamNames] = useState<TeamNames>(defaultTeamNames);
  const [draftNames, setDraftNames] = useState<TeamNames>(defaultTeamNames);
  const [gameStarted, setGameStarted] = useState(false);
  const [notice, setNotice] = useState('先攻・黒チームの番です。表現する番号を選びましょう！');
  const [selectedMove, setSelectedMove] = useState<SelectedMove | null>(null);
  const [previousState, setPreviousState] = useState<GameSnapshot | null>(null);

  const legal = useMemo(() => legalMoves(board, turn), [board, turn]);
  const otherLegal = useMemo(() => legalMoves(board, opponent(turn)), [board, turn]);
  const counts = board.flat().reduce(
    (sum, cell) => {
      if (cell.color) sum[cell.color] += 1;
      else sum.open += 1;
      return sum;
    },
    { black: 0, white: 0, open: 0 },
  );
  const gameOver = counts.open === 0 || (legal.size === 0 && otherLegal.size === 0);

  function rememberState() {
    setPreviousState({
      board: board.map((line) => line.map((cell) => ({ ...cell }))),
      turn,
      moveNumber,
      notice,
    });
  }

  function finishTurn(nextBoard: Cell[][], message: string) {
    const next = opponent(turn);
    const nextMoves = legalMoves(nextBoard, next);
    const currentMoves = legalMoves(nextBoard, turn);

    if (nextMoves.size === 0 && currentMoves.size > 0) {
      setMoveNumber((value) => value + 2);
      setNotice(`${message} ${teamNames[next]}は置ける場所がないため、自動でパスしました。${teamNames[turn]}の番です。`);
      return;
    }

    setTurn(next);
    setMoveNumber((value) => value + 1);
    setNotice(`${message} 次は${teamNames[next]}の番です。`);
  }

  function selectMove(row: number, col: number) {
    const key = `${row}-${col}`;
    if (!gameStarted || !legal.has(key) || gameOver) return;
    const cell = board[row][col];
    if (cell.number === null) return;
    setSelectedMove({ row, col, word: cell.word, number: cell.number });
  }

  function confirmPlacement() {
    if (!selectedMove) return;
    const { row, col } = selectedMove;
    const key = `${row}-${col}`;
    if (!legal.has(key) || gameOver) {
      setSelectedMove(null);
      return;
    }

    rememberState();

    const flips = flipsFor(board, row, col, turn);
    const changed = new Set([key, ...flips.map(([r, c]) => `${r}-${c}`)]);
    const nextBoard = board.map((line, rowIndex) =>
      line.map((cell, colIndex) =>
        changed.has(`${rowIndex}-${colIndex}`) ? { ...cell, color: turn, word: '', revealed: false } : cell,
      ),
    );

    setBoard(nextBoard);
    setFlipping(changed);
    window.setTimeout(() => setFlipping(new Set()), 620);
    setSelectedMove(null);
    finishTurn(nextBoard, `正解！ ${flips.length}枚ひっくり返しました。`);
  }

  function confirmIncorrect() {
    if (!selectedMove || gameOver) return;
    rememberState();
    const nextBoard = board.map((line, rowIndex) =>
      line.map((cell, colIndex) =>
        rowIndex === selectedMove.row && colIndex === selectedMove.col
          ? { ...cell, revealed: true }
          : cell,
      ),
    );
    setBoard(nextBoard);
    setSelectedMove(null);
    finishTurn(nextBoard, `不正解。${teamNames[turn]}はパスしました。`);
  }

  function passTurn() {
    if (!gameStarted || gameOver) return;
    rememberState();
    finishTurn(board, `${teamNames[turn]}がパスしました。`);
  }

  function undoLastAction() {
    if (!previousState) return;
    setBoard(previousState.board.map((line) => line.map((cell) => ({ ...cell }))));
    setTurn(previousState.turn);
    setMoveNumber(previousState.moveNumber);
    setNotice(previousState.notice);
    setFlipping(new Set());
    setSelectedMove(null);
    setPreviousState(null);
  }

  function resetGame() {
    setBoard(makeBoard());
    setTurn('black');
    setMoveNumber(1);
    setFlipping(new Set());
    setSelectedMove(null);
    setPreviousState(null);
    setNotice(`新しいゲームを始めました。${teamNames.black}の番です！`);
  }

  function startGame() {
    const names = {
      black: draftNames.black.trim() || defaultTeamNames.black,
      white: draftNames.white.trim() || defaultTeamNames.white,
    };
    setTeamNames(names);
    setDraftNames(names);
    setBoard(makeBoard());
    setTurn('black');
    setMoveNumber(1);
    setFlipping(new Set());
    setSelectedMove(null);
    setPreviousState(null);
    setNotice(`${names.black}の番です。表現する番号を選びましょう！`);
    setGameStarted(true);
  }

  function editTeamNames() {
    setDraftNames(teamNames);
    setSelectedMove(null);
    setGameStarted(false);
  }

  const winnerColor: StoneColor | null = counts.black === counts.white ? null : (counts.black > counts.white ? 'black' : 'white');
  const result = winnerColor ? `${teamNames[winnerColor]}の勝ち！` : '引き分けです！';

  return (
    <main>
      {!gameStarted && (
        <div className="setup-overlay">
          <section className="setup-dialog" role="dialog" aria-modal="true" aria-labelledby="setup-title">
            <p className="setup-label">GAME SETUP</p>
            <h2 id="setup-title">チーム名を決めよう</h2>
            <p className="setup-description">先攻は黒、後攻は白です。それぞれのチーム名を入力してください。</p>
            <div className="setup-fields">
              <label>
                <span><i className="mini-stone black" />先攻・黒</span>
                <input
                  type="text"
                  value={draftNames.black}
                  maxLength={16}
                  onChange={(event) => setDraftNames((names) => ({ ...names, black: event.target.value }))}
                  placeholder="先攻チーム名"
                />
              </label>
              <label>
                <span><i className="mini-stone white" />後攻・白</span>
                <input
                  type="text"
                  value={draftNames.white}
                  maxLength={16}
                  onChange={(event) => setDraftNames((names) => ({ ...names, white: event.target.value }))}
                  placeholder="後攻チーム名"
                />
              </label>
            </div>
            <button className="start-button" type="button" onClick={startGame}>このチームで始める <b>→</b></button>
          </section>
        </div>
      )}

      {selectedMove && (
        <div className="judge-overlay">
          <section
            className="judge-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedMove.number}番、${selectedMove.word}の正誤判定`}
          >
            <div className="judge-disc">
              <span className={selectedMove.word.length >= 6 ? 'long-word' : ''}>{selectedMove.word}</span>
            </div>
            <div className="judge-actions">
              <button className="judge-correct" type="button" onClick={confirmPlacement}>正解</button>
              <button className="judge-incorrect" type="button" onClick={confirmIncorrect}>不正解</button>
            </div>
          </section>
        </div>
      )}

      {gameStarted && gameOver && !selectedMove && (
        <div className="result-overlay">
          <section className="result-dialog" role="dialog" aria-modal="true" aria-labelledby="result-title">
            <div className="result-board-area">
              <p className="result-kicker">最終盤面</p>
              <div className="result-board" role="grid" aria-label="対戦終了時の盤面">
                {board.map((row, rowIndex) => row.map((cell, colIndex) => {
                  const key = `${rowIndex}-${colIndex}`;
                  const cellLabel = cell.color
                    ? `${cell.color === 'black' ? '黒' : '白'}のコマ`
                    : `${cell.number}番${cell.revealed ? `、${cell.word}` : ''}`;
                  return (
                    <div className="result-square" role="gridcell" aria-label={cellLabel} key={key}>
                      <span className={`result-disc ${cell.color ?? 'neutral'}`}>
                        {!cell.color && (cell.revealed ? (
                          <span className="revealed-label">
                            <strong>{cell.number}</strong>
                            <span className={cell.word.length >= 6 ? 'long-word' : ''}>{cell.word}</span>
                          </span>
                        ) : (
                          <span className="disc-number">{cell.number}</span>
                        ))}
                      </span>
                    </div>
                  );
                }))}
              </div>
            </div>

            <div className="result-summary">
              <p className="result-kicker">対戦結果</p>
              <h2 id="result-title">{result}</h2>
              <div className="final-scores">
                <div className={winnerColor === 'black' ? 'winner' : ''}>
                  <span className="mini-stone black" aria-hidden="true" />
                  <p><small>先攻・黒</small>{teamNames.black}</p>
                  <strong>{counts.black}</strong>
                </div>
                <div className={winnerColor === 'white' ? 'winner' : ''}>
                  <span className="mini-stone white" aria-hidden="true" />
                  <p><small>後攻・白</small>{teamNames.white}</p>
                  <strong>{counts.white}</strong>
                </div>
              </div>
              <button className="play-again-button" type="button" onClick={resetGame}>もう一度最初から</button>
            </div>
          </section>
        </div>
      )}

      <header className="topbar">
        <a className="brand" href="#game" aria-label="しゅわオセロ ホーム">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>しゅわ<span>オセロ</span></span>
        </a>
        <div className="howto"><span>1</span> 番号を選ぶ <b>→</b> <span>2</span> 手話で表現 <b>→</b> <span>3</span> 司会者が判定</div>
      </header>

      <section className="hero" id="game">
        <div className="intro">
          <p className="eyebrow"><span /> 手話でつながる、ことばのゲーム</p>
          <h1>手で伝えて、<br /><em>盤面をうごかそう。</em></h1>
          <p>光っている番号を選ぶと単語を公開。手話で表現し、司会者が正誤を判定します。</p>
        </div>

        <div className="game-layout">
          <section className="board-panel" aria-label="オセロ盤">
            <div className="turn-banner">
              <div className={`turn-stone ${turn}`} />
              <div>
                <span>TURN {String(moveNumber).padStart(2, '0')}</span>
                <strong>{gameOver ? 'ゲーム終了' : `${teamNames[turn]}のターン`}</strong>
              </div>
              {!gameOver && <p>{legal.size > 0 ? `置ける場所は ${legal.size}か所` : '置ける場所がありません'}</p>}
            </div>

            <div className="board" role="grid" aria-label="6×6のオセロ盤">
              {board.map((row, rowIndex) => row.map((cell, colIndex) => {
                const key = `${rowIndex}-${colIndex}`;
                const canPlace = gameStarted && legal.has(key) && !gameOver;
                const cellState = cell.color
                  ? `${cell.color === 'black' ? '黒' : '白'}のコマ`
                  : `${cell.number}番。${cell.revealed ? `${cell.word}。` : ''}${canPlace ? '選択すると単語を公開して判定します' : 'ここには置けません'}`;
                return (
                  <button
                    className={`square ${canPlace ? 'legal' : ''}`}
                    key={key}
                    type="button"
                    disabled={!canPlace}
                    onClick={() => selectMove(rowIndex, colIndex)}
                    aria-label={cellState}
                  >
                    <span className={`disc ${cell.color ?? 'neutral'} ${flipping.has(key) ? 'flipping' : ''}`}>
                      {!cell.color && (cell.revealed ? (
                        <span className="revealed-label">
                          <strong>{cell.number}</strong>
                          <span className={cell.word.length >= 6 ? 'long-word' : ''}>{cell.word}</span>
                        </span>
                      ) : (
                        <span className="disc-number">{cell.number}</span>
                      ))}
                    </span>
                  </button>
                );
              }))}
            </div>
            <div className="legend"><span><i className="legal-dot" />光っている番号を選べます</span><span><i className="neutral-dot" />単語は選ぶまで非公開</span></div>
          </section>

          <aside className="side-panel">
            <section className="score-card">
              <p className="card-label">SCORE</p>
              <div className={`player black-player ${turn === 'black' && !gameOver ? 'active' : ''}`}>
                <div className="mini-stone black" />
                <div className="player-info"><small>先攻・黒</small><span>{teamNames.black}</span></div>
                <strong>{counts.black}</strong>
              </div>
              <div className={`player white-player ${turn === 'white' && !gameOver ? 'active' : ''}`}>
                <div className="mini-stone white" />
                <div className="player-info"><small>後攻・白</small><span>{teamNames.white}</span></div>
                <strong>{counts.white}</strong>
              </div>
              <div className="score-rule" />
              <div className="remaining"><span>残りのコマ</span><strong>{counts.open}</strong></div>
            </section>

            <section className="action-card">
              <div className="message" role="status" aria-live="polite"><span aria-hidden="true">✓</span><p>{gameOver ? result : notice}</p></div>
              <button className="pass-button" type="button" onClick={passTurn} disabled={gameOver || Boolean(selectedMove)}>
                ターンをパス <b>→</b>
              </button>
              <button className="undo-button" type="button" onClick={undoLastAction} disabled={!previousState || Boolean(selectedMove)}>
                ↶ 直前の判定を取り消す
              </button>
              <button className="reset-button" type="button" onClick={resetGame}>↻ はじめから</button>
              <button className="teams-button" type="button" onClick={editTeamNames}>チーム名を変更</button>
            </section>
          </aside>
        </div>
      </section>

      <footer><span>SHUWA OTHELLO</span><p>ことばを、手から手へ。</p></footer>
    </main>
  );
}

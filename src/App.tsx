import { useMemo, useState } from 'react';
import './styles.css';

type StoneColor = 'black' | 'white';
type Cell = { color: StoneColor | null; word: string };
type TeamNames = Record<StoneColor, string>;

const SIZE = 6;
const defaultTeamNames: TeamNames = { black: '黒チーム', white: '白チーム' };
const directions = [-1, 0, 1]
  .flatMap((row) => [-1, 0, 1].map((col) => [row, col] as const))
  .filter(([row, col]) => row !== 0 || col !== 0);

const words = [
  'おはよう', 'ありがとう', '家族', '友だち', '学校', '先生',
  '勉強', '本', '水', '食べる', '楽しい', '悲しい',
  '好き', '大丈夫', '名前', '仕事', '電車', '病院',
  '今日', '明日', '昨日', '時間', '天気', '雨',
  '暑い', '寒い', '春', '夏', '秋', '冬', '旅行', 'またね',
];

function makeBoard(): Cell[][] {
  let wordIndex = 0;
  return Array.from({ length: SIZE }, (_, row) =>
    Array.from({ length: SIZE }, (_, col) => {
      const center = row >= 2 && row <= 3 && col >= 2 && col <= 3;
      if (center) {
        return { color: row === col ? 'white' : 'black', word: '' };
      }
      return { color: null, word: words[wordIndex++] };
    }),
  );
}

function opponent(color: StoneColor): StoneColor {
  return color === 'black' ? 'white' : 'black';
}

function isCorner(row: number, col: number) {
  return (row === 0 || row === SIZE - 1) && (col === 0 || col === SIZE - 1);
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
  const [revealedCorners, setRevealedCorners] = useState<Set<string>>(new Set());
  const [teamNames, setTeamNames] = useState<TeamNames>(defaultTeamNames);
  const [draftNames, setDraftNames] = useState<TeamNames>(defaultTeamNames);
  const [gameStarted, setGameStarted] = useState(false);
  const [notice, setNotice] = useState('先攻・黒チームの番です。表現する単語を選びましょう！');

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

  function place(row: number, col: number) {
    const key = `${row}-${col}`;
    if (!gameStarted || !legal.has(key) || gameOver) return;

    if (isCorner(row, col) && !revealedCorners.has(key)) {
      setRevealedCorners((corners) => new Set(corners).add(key));
      setNotice('四隅の単語を公開しました。手話で表現し、正解ならもう一度クリックしてください。');
      return;
    }

    const flips = flipsFor(board, row, col, turn);
    const changed = new Set([key, ...flips.map(([r, c]) => `${r}-${c}`)]);
    const nextBoard = board.map((line, rowIndex) =>
      line.map((cell, colIndex) =>
        changed.has(`${rowIndex}-${colIndex}`) ? { color: turn, word: '' } : cell,
      ),
    );

    setBoard(nextBoard);
    setFlipping(changed);
    window.setTimeout(() => setFlipping(new Set()), 620);
    finishTurn(nextBoard, `正解！ ${flips.length}枚ひっくり返しました。`);
  }

  function passTurn() {
    if (!gameStarted || gameOver) return;
    finishTurn(board, `${teamNames[turn]}がパスしました。`);
  }

  function resetGame() {
    setBoard(makeBoard());
    setTurn('black');
    setMoveNumber(1);
    setFlipping(new Set());
    setRevealedCorners(new Set());
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
    setRevealedCorners(new Set());
    setNotice(`${names.black}の番です。表現する単語を選びましょう！`);
    setGameStarted(true);
  }

  function editTeamNames() {
    setDraftNames(teamNames);
    setGameStarted(false);
  }

  const result = counts.black === counts.white ? '引き分けです！' : `${counts.black > counts.white ? teamNames.black : teamNames.white}の勝ち！`;

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

      <header className="topbar">
        <a className="brand" href="#game" aria-label="しゅわオセロ ホーム">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>しゅわ<span>オセロ</span></span>
        </a>
        <div className="howto"><span>1</span> 単語を選ぶ <b>→</b> <span>2</span> 手話で表現 <b>→</b> <span>3</span> 正解なら置く</div>
      </header>

      <section className="hero" id="game">
        <div className="intro">
          <p className="eyebrow"><span /> 手話でつながる、ことばのゲーム</p>
          <h1>手で伝えて、<br /><em>盤面をうごかそう。</em></h1>
          <p>置けるコマの単語を手話で表現。正解ならクリックして、相手のコマをひっくり返そう！</p>
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
                const cornerWordHidden = isCorner(rowIndex, colIndex) && !cell.color && !revealedCorners.has(key);
                return (
                  <button
                    className={`square ${canPlace ? 'legal' : ''} ${cornerWordHidden ? 'corner-hidden' : ''}`}
                    key={key}
                    type="button"
                    disabled={!canPlace}
                    onClick={() => place(rowIndex, colIndex)}
                    aria-label={cornerWordHidden
                      ? (canPlace ? '四隅の単語を表示します' : '四隅の非公開コマ')
                      : (canPlace ? `${cell.word}。ここに置けます` : `${cell.word}。ここには置けません`)}
                  >
                    <span className={`disc ${cell.color ?? 'neutral'} ${flipping.has(key) ? 'flipping' : ''}`}><span>{cornerWordHidden ? '？' : cell.word}</span></span>
                  </button>
                );
              }))}
            </div>
            <div className="legend"><span><i className="legal-dot" />光っているコマに置けます</span><span><i className="neutral-dot" />まだ誰のものでもないコマ</span><span><i className="corner-dot">?</i>四隅は1回目で単語を表示</span></div>
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
              <button className="pass-button" type="button" onClick={passTurn} disabled={gameOver}>
                ターンをパス <b>→</b>
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

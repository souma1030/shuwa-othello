import { useMemo, useState } from 'react';
import './styles.css';

type StoneColor = 'black' | 'white';
type Cell = { color: StoneColor | null; word: string };

const SIZE = 6;
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
  const [notice, setNotice] = useState('黒の番です。表現する単語を選びましょう！');

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

  function changeTurn(message?: string) {
    const next = opponent(turn);
    setTurn(next);
    setMoveNumber((value) => value + 1);
    setNotice(message ?? `${next === 'black' ? '黒' : '白'}の番です。表現する単語を選びましょう！`);
  }

  function place(row: number, col: number) {
    const key = `${row}-${col}`;
    if (!legal.has(key) || gameOver) return;

    const flips = flipsFor(board, row, col, turn);
    const changed = new Set([key, ...flips.map(([r, c]) => `${r}-${c}`)]);
    const nextBoard = board.map((line, rowIndex) =>
      line.map((cell, colIndex) =>
        changed.has(`${rowIndex}-${colIndex}`) ? { ...cell, color: turn } : cell,
      ),
    );

    setBoard(nextBoard);
    setFlipping(changed);
    window.setTimeout(() => setFlipping(new Set()), 620);
    changeTurn(`正解！ ${flips.length}枚ひっくり返しました。次は${opponent(turn) === 'black' ? '黒' : '白'}の番です。`);
  }

  function passTurn() {
    if (gameOver) return;
    changeTurn(`パスしました。${opponent(turn) === 'black' ? '黒' : '白'}の番です。`);
  }

  function resetGame() {
    setBoard(makeBoard());
    setTurn('black');
    setMoveNumber(1);
    setFlipping(new Set());
    setNotice('新しいゲームを始めました。黒の番です！');
  }

  const result = counts.black === counts.white ? '引き分けです！' : `${counts.black > counts.white ? '黒' : '白'}の勝ち！`;

  return (
    <main>
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
                <strong>{gameOver ? 'ゲーム終了' : `${turn === 'black' ? '黒' : '白'}のターン`}</strong>
              </div>
              {!gameOver && <p>{legal.size > 0 ? `置ける場所は ${legal.size}か所` : '置ける場所がありません'}</p>}
            </div>

            <div className="board" role="grid" aria-label="6×6のオセロ盤">
              {board.map((row, rowIndex) => row.map((cell, colIndex) => {
                const key = `${rowIndex}-${colIndex}`;
                const canPlace = legal.has(key) && !gameOver;
                return (
                  <button
                    className={`square ${canPlace ? 'legal' : ''}`}
                    key={key}
                    type="button"
                    disabled={!canPlace}
                    onClick={() => place(rowIndex, colIndex)}
                    aria-label={canPlace ? `${cell.word}。ここに置けます` : `${cell.word}。ここには置けません`}
                  >
                    <span className={`disc ${cell.color ?? 'neutral'} ${flipping.has(key) ? 'flipping' : ''}`}><span>{cell.word}</span></span>
                  </button>
                );
              }))}
            </div>
            <div className="legend"><span><i className="legal-dot" />光っているコマに置けます</span><span><i className="neutral-dot" />まだ誰のものでもないコマ</span></div>
          </section>

          <aside className="side-panel">
            <section className="score-card">
              <p className="card-label">SCORE</p>
              <div className={`player black-player ${turn === 'black' && !gameOver ? 'active' : ''}`}>
                <div className="mini-stone black" /><span>くろ</span><strong>{counts.black}</strong>
              </div>
              <div className={`player white-player ${turn === 'white' && !gameOver ? 'active' : ''}`}>
                <div className="mini-stone white" /><span>しろ</span><strong>{counts.white}</strong>
              </div>
              <div className="score-rule" />
              <div className="remaining"><span>残りのコマ</span><strong>{counts.open}</strong></div>
            </section>

            <section className="action-card">
              <div className="message" role="status" aria-live="polite"><span aria-hidden="true">✓</span><p>{gameOver ? result : notice}</p></div>
              <button className="pass-button" type="button" onClick={passTurn} disabled={gameOver}>
                <span>答えがちがったとき</span>ターンをパス <b>→</b>
              </button>
              <p className="pass-note">コマを置かずに相手の番へ移ります</p>
              <button className="reset-button" type="button" onClick={resetGame}>↻ はじめから</button>
            </section>

            <section className="tip-card"><span>POINT</span><p>表情や口の形も、手話を伝える大切な要素です。</p></section>
          </aside>
        </div>
      </section>

      <footer><span>SHUWA OTHELLO</span><p>ことばを、手から手へ。</p></footer>
    </main>
  );
}

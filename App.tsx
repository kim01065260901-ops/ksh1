
import React, { useState, useEffect, useRef } from 'react';
import { supabase, GameRecord } from './supabase';

// --- 설정값 ---
const MIN_NUMBER = 1;
const MAX_NUMBER = 100;

// --- 하위 컴포넌트 ---

/**
 * 게임 제목 및 헤더
 */
const Header: React.FC = () => (
  <header className="py-8 text-center">
    <div className="inline-block p-3 bg-indigo-100 rounded-2xl mb-4 animate-bounce-subtle">
      <i className="fa-solid fa-ranking-star text-3xl text-indigo-600"></i>
    </div>
    <h1 className="text-4xl font-black text-slate-800 tracking-tight">
      숫자 맞추기 <span className="text-indigo-600">랭킹전</span>
    </h1>
    <p className="text-slate-500 mt-2 font-medium">1부터 100 사이의 숫자를 가장 빠르게 맞춰보세요!</p>
  </header>
);

/**
 * 상위 10위 리더보드
 */
const Leaderboard: React.FC<{ records: GameRecord[]; loading: boolean }> = ({ records, loading }) => {
  if (loading) return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6 animate-pulse">
      <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 bg-slate-100 rounded mb-2 w-full"></div>
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
        <h2 className="font-bold text-slate-700 flex items-center gap-2">
          <i className="fa-solid fa-crown text-yellow-500"></i>
          명예의 전당 (Top 10)
        </h2>
      </div>
      <div className="p-2">
        {records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-left border-b border-slate-50">
                  <th className="px-4 py-3 font-semibold">순위</th>
                  <th className="px-4 py-3 font-semibold">이름</th>
                  <th className="px-4 py-3 font-semibold text-center">시도</th>
                  <th className="px-4 py-3 font-semibold text-right">시간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {records.map((record, index) => (
                  <tr key={record.id} className={`transition-colors ${index === 0 ? 'bg-yellow-50/50' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-4 font-bold">
                      {index === 0 ? <i className="fa-solid fa-medal text-yellow-400 text-lg"></i> :
                       index === 1 ? <i className="fa-solid fa-medal text-slate-300 text-lg"></i> :
                       index === 2 ? <i className="fa-solid fa-medal text-amber-600 text-lg"></i> :
                       <span className="text-slate-400">{index + 1}</span>}
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-700">{record.name}</td>
                    <td className="px-4 py-4 text-indigo-600 font-bold text-center">{record.attempts}회</td>
                    <td className="px-4 py-4 text-slate-500 font-mono text-right">{record.seconds}초</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 italic">
            아직 기록이 없습니다. 첫 번째 주인공이 되어보세요!
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 이번 게임 입력 히스토리
 */
const GuessHistory: React.FC<{ history: { num: number; result: string }[] }> = ({ history }) => {
  if (history.length === 0) return null;
  return (
    <div className="mt-8">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">내 입력 기록</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
        {history.map((item, index) => (
          <div 
            key={index} 
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              index === 0 ? 'bg-indigo-50 border-indigo-200 shadow-sm scale-[1.02]' : 'bg-white border-slate-100 opacity-60'
            }`}
          >
            <span className="font-bold text-lg text-slate-700">{item.num}</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              item.result === '정답!' ? 'bg-green-100 text-green-700' : 
              item.result === 'UP' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
            }`}>
              {item.result}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 메인 앱 ---

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [targetNumber, setTargetNumber] = useState(0);
  const [currentGuess, setCurrentGuess] = useState('');
  const [history, setHistory] = useState<{ num: number; result: string }[]>([]);
  const [leaderboard, setLeaderboard] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  // 컴포넌트 마운트 시 리더보드 불러오기
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('records')
        .select('*')
        .order('attempts', { ascending: true })
        .order('seconds', { ascending: true })
        .limit(10);

      if (!error && data) {
        setLeaderboard(data);
      }
    } catch (err) {
      console.error("데이터를 가져오는 중 오류 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const startGame = () => {
    if (!playerName.trim()) {
      alert('이름을 입력해주세요!');
      return;
    }
    const target = Math.floor(Math.random() * MAX_NUMBER) + MIN_NUMBER;
    setTargetNumber(target);
    setGameStarted(true);
    setGameOver(false);
    setIsNewRecord(false);
    setHistory([]);
    setSeconds(0);
    setCurrentGuess('');
    
    // 타이머 시작
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
  };

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameOver) return;

    const num = parseInt(currentGuess);
    if (isNaN(num) || num < MIN_NUMBER || num > MAX_NUMBER) {
      alert(`${MIN_NUMBER}~${MAX_NUMBER} 사이의 숫자를 입력해주세요.`);
      return;
    }

    let result = '';
    if (num < targetNumber) result = 'UP';
    else if (num > targetNumber) result = 'DOWN';
    else result = '정답!';

    const newHistory = [{ num, result }, ...history];
    setHistory(newHistory);
    setCurrentGuess('');

    if (result === '정답!') {
      handleWin(newHistory.length, seconds);
    }
  };

  const handleWin = async (attempts: number, finalSeconds: number) => {
    setGameOver(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 현재 상위 1등 기록과 비교
    const bestRecord = leaderboard.length > 0 ? leaderboard[0] : null;
    const isNewTopRecord = !bestRecord || 
      (attempts < bestRecord.attempts) || 
      (attempts === bestRecord.attempts && finalSeconds < bestRecord.seconds);

    setSaving(true);
    if (isNewTopRecord) setIsNewRecord(true);

    try {
      const { error } = await supabase
        .from('records')
        .insert([{ 
          name: playerName.trim(), 
          attempts: attempts, 
          seconds: finalSeconds 
        }]);
      
      if (!error) {
        // 성공 시 리더보드 즉시 갱신
        await fetchLeaderboard();
      }
    } catch (err) {
      console.error("기록 저장 중 예외 발생:", err);
    } finally {
      setSaving(false);
    }
  };

  const resetToMain = () => {
    setGameStarted(false);
    setGameOver(false);
    setIsNewRecord(false);
    setPlayerName('');
    setHistory([]);
    setSeconds(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 pb-12 min-h-screen flex flex-col">
      <Header />

      {!gameStarted ? (
        <div className="flex-grow flex flex-col">
          <Leaderboard records={leaderboard} loading={loading} />
          
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-500 mb-2">도전자 성함</label>
              <input 
                type="text" 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="이름을 입력하세요"
                maxLength={10}
                className="w-full px-4 py-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-lg font-bold text-slate-700"
                onKeyDown={(e) => e.key === 'Enter' && startGame()}
              />
            </div>
            <button 
              onClick={startGame}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 text-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch animate-spin"></i>
                  로딩 중...
                </>
              ) : '게임 시작하기'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex flex-col">
          {/* 게임 플레이 영역 */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
            
            {/* 게임 승리 화면 오버레이 */}
            {gameOver && (
              <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                {isNewRecord && (
                   <div className="absolute top-8 bg-yellow-400 text-yellow-900 text-xs font-black px-6 py-2 rounded-full shadow-lg animate-bounce uppercase tracking-widest">
                     🎉 NEW BEST RECORD!
                   </div>
                )}
                
                <div className="text-7xl mb-6 text-yellow-400 animate-bounce-subtle">
                  <i className="fa-solid fa-trophy"></i>
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">정답입니다!</h2>
                <p className="text-slate-500 mb-8">당신이 맞춘 숫자는 <span className="text-indigo-600 font-bold">{targetNumber}</span>이었습니다.</p>
                
                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">총 시도</p>
                    <p className="text-3xl font-black text-indigo-600">{history.length}<span className="text-sm">회</span></p>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">소요 시간</p>
                    <p className="text-3xl font-black text-indigo-600">{seconds}<span className="text-sm">초</span></p>
                  </div>
                </div>

                {saving ? (
                  <div className="flex items-center gap-3 text-indigo-600 font-bold mb-6">
                    <i className="fa-solid fa-circle-notch animate-spin"></i>
                    기록 서버 전송 중...
                  </div>
                ) : (
                  <div className="text-green-600 font-bold mb-6 flex items-center gap-2">
                    <i className="fa-solid fa-check-circle"></i>
                    기록이 안전하게 저장되었습니다!
                  </div>
                )}

                <button 
                  onClick={resetToMain}
                  disabled={saving}
                  className="w-full bg-indigo-600 text-white font-bold py-5 rounded-2xl hover:bg-indigo-700 transition-all mb-3 shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                  순위표 확인하기
                </button>
              </div>
            )}

            {/* 현재 게임 정보 바 */}
            <div className="flex justify-between items-end mb-10">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CHALLENGER</span>
                <span className="text-xl font-black text-slate-800">{playerName}</span>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TIMER</span>
                <span className="text-2xl font-black text-indigo-600 font-mono">
                  {seconds}<span className="text-xs ml-0.5">s</span>
                </span>
              </div>
            </div>

            {/* 숫자 입력 폼 */}
            <form onSubmit={handleGuess} className="mb-8">
              <div className="relative group">
                <input 
                  type="number"
                  value={currentGuess}
                  onChange={(e) => setCurrentGuess(e.target.value)}
                  placeholder="?"
                  className="w-full text-center text-7xl font-black py-10 rounded-3xl border-4 border-slate-50 focus:border-indigo-100 focus:bg-indigo-50/30 focus:outline-none transition-all placeholder-slate-200"
                  autoFocus
                  disabled={gameOver}
                />
                <button 
                  type="submit"
                  disabled={gameOver || !currentGuess}
                  className="absolute bottom-4 right-4 bg-indigo-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-indigo-700 shadow-xl shadow-indigo-200 active:scale-90 transition-all disabled:opacity-30"
                >
                  <i className="fa-solid fa-arrow-up-long text-xl"></i>
                </button>
              </div>
            </form>

            <GuessHistory history={history} />
          </div>

          {!gameOver && (
            <button 
              onClick={() => {
                if (confirm('진행 중인 게임을 포기하시겠습니까?')) resetToMain();
              }}
              className="mt-8 text-slate-300 hover:text-red-400 font-bold text-xs transition-colors flex items-center justify-center gap-2 uppercase tracking-widest"
            >
              <i className="fa-solid fa-flag"></i>
              GIVE UP
            </button>
          )}
        </div>
      )}
    </div>
  );
}

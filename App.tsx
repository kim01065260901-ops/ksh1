
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, GameRecord } from './supabase';

// --- Constants ---
const MIN_NUMBER = 1;
const MAX_NUMBER = 100;

// --- Helper Components ---

const Header: React.FC = () => (
  <header className="py-8 text-center">
    <h1 className="text-4xl font-extrabold text-indigo-600 tracking-tight flex items-center justify-center gap-2">
      <i className="fa-solid fa-bullseye"></i>
      숫자 맞추기 게임
    </h1>
    <p className="text-slate-500 mt-2">1부터 100 사이의 숫자를 맞춰보세요!</p>
  </header>
);

const RecordCard: React.FC<{ record: GameRecord | null; loading: boolean }> = ({ record, loading }) => {
  if (loading) return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8 animate-pulse">
      <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
      <div className="h-4 bg-slate-100 rounded w-full"></div>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white mb-8 relative overflow-hidden">
      <div className="relative z-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider opacity-80 mb-2">현재 최고 기록</h2>
        {record ? (
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold">{record.name}님</p>
              <p className="text-sm opacity-90 mt-1">
                시도: <span className="font-bold">{record.attempts}회</span> | 
                시간: <span className="font-bold">{record.seconds}초</span>
              </p>
            </div>
            <div className="text-5xl opacity-30">
              <i className="fa-solid fa-crown"></i>
            </div>
          </div>
        ) : (
          <p className="text-xl font-medium italic opacity-70">첫 번째 도전자가 되어보세요!</p>
        )}
      </div>
      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-5 rounded-full"></div>
    </div>
  );
};

const GuessHistory: React.FC<{ history: { num: number; result: string }[] }> = ({ history }) => {
  if (history.length === 0) return null;
  return (
    <div className="mt-8">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">최근 입력 기록</h3>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
        {history.map((item, index) => (
          <div 
            key={index} 
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              index === 0 ? 'bg-indigo-50 border-indigo-200 shadow-sm scale-[1.02]' : 'bg-white border-slate-100'
            }`}
          >
            <span className="font-bold text-lg text-slate-700">{item.num}</span>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
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

// --- Main App ---

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [targetNumber, setTargetNumber] = useState(0);
  const [currentGuess, setCurrentGuess] = useState('');
  const [history, setHistory] = useState<{ num: number; result: string }[]>([]);
  const [bestRecord, setBestRecord] = useState<GameRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Fetch best record on mount
  useEffect(() => {
    fetchBestRecord();
  }, []);

  const fetchBestRecord = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('records')
        .select('*')
        .order('attempts', { ascending: true })
        .order('seconds', { ascending: true })
        .limit(1);

      if (!error && data && data.length > 0) {
        setBestRecord(data[0]);
      } else {
        setBestRecord(null);
      }
    } catch (err) {
      console.error("Error fetching record:", err);
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
    
    // Start timer
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

    // Comparison Logic: Fewer attempts OR (same attempts and faster time)
    const isBetter = !bestRecord || 
      (attempts < bestRecord.attempts) || 
      (attempts === bestRecord.attempts && finalSeconds < bestRecord.seconds);

    if (isBetter) {
      setSaving(true);
      setIsNewRecord(true);
      try {
        const { error } = await supabase
          .from('records')
          .insert([{ name: playerName.trim(), attempts, seconds: finalSeconds }]);
        
        if (!error) {
          // Refresh best record after saving
          await fetchBestRecord();
        } else {
          console.error("Supabase Save Error:", error.message);
        }
      } catch (err) {
        console.error("Unexpected error saving record:", err);
      } finally {
        setSaving(false);
      }
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
          <RecordCard record={bestRecord} loading={loading} />
          
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex-grow">
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-500 mb-2">도전자 이름</label>
              <input 
                type="text" 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full px-4 py-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-lg font-semibold"
                onKeyDown={(e) => e.key === 'Enter' && startGame()}
              />
            </div>
            <button 
              onClick={startGame}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 text-lg disabled:opacity-50"
            >
              {loading ? '기록 불러오는 중...' : '게임 시작하기'}
            </button>
            <div className="mt-8 text-center text-slate-400 text-xs">
              <p>최고의 기록에 도전하세요!</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex flex-col">
          {/* Game UI */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
            
            {gameOver && (
              <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                {isNewRecord && (
                   <div className="absolute top-4 bg-yellow-400 text-yellow-900 text-xs font-black px-4 py-1 rounded-full shadow-sm animate-bounce">
                     NEW RECORD!
                   </div>
                )}
                
                <div className="text-6xl mb-4 text-yellow-400 animate-bounce-subtle">
                  <i className="fa-solid fa-trophy"></i>
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">축하합니다!</h2>
                <p className="text-slate-500 mb-6">정답은 <span className="text-indigo-600 font-bold">{targetNumber}</span>이었습니다.</p>
                
                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase">시도 횟수</p>
                    <p className="text-2xl font-black text-slate-700">{history.length}회</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase">소요 시간</p>
                    <p className="text-2xl font-black text-slate-700">{seconds}초</p>
                  </div>
                </div>

                {saving ? (
                  <div className="flex items-center gap-3 text-indigo-600 font-bold mb-4">
                    <i className="fa-solid fa-circle-notch animate-spin"></i>
                    기록 저장 중...
                  </div>
                ) : isNewRecord ? (
                  <div className="text-green-600 font-bold mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-check-circle"></i>
                    새로운 최고 기록이 저장되었습니다!
                  </div>
                ) : (
                  <div className="text-slate-400 text-sm mb-4">
                    최고 기록 경신에는 실패했지만 훌륭합니다!
                  </div>
                )}

                <button 
                  onClick={resetToMain}
                  disabled={saving}
                  className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all mb-3 shadow-md disabled:opacity-50"
                >
                  메인으로 가기
                </button>
              </div>
            )}

            <div className="flex justify-between items-center mb-8">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase">도전자</span>
                <span className="text-lg font-bold text-slate-800">{playerName}</span>
              </div>
              <div className="text-right flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase">경과 시간</span>
                <span className="text-lg font-mono font-bold text-indigo-600">
                  {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            <form onSubmit={handleGuess} className="mb-6">
              <div className="relative">
                <input 
                  type="number"
                  value={currentGuess}
                  onChange={(e) => setCurrentGuess(e.target.value)}
                  placeholder="?"
                  className="w-full text-center text-6xl font-black py-8 rounded-2xl border-4 border-slate-50 focus:border-indigo-100 focus:outline-none transition-all"
                  autoFocus
                  disabled={gameOver}
                  min={MIN_NUMBER}
                  max={MAX_NUMBER}
                />
                <button 
                  type="submit"
                  disabled={gameOver}
                  className="absolute bottom-2 right-2 bg-indigo-600 text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-indigo-700 shadow-lg active:scale-90 transition-all disabled:opacity-50"
                >
                  <i className="fa-solid fa-paper-plane"></i>
                </button>
              </div>
              <p className="text-center text-slate-400 mt-4 text-sm font-medium">
                1부터 100 사이의 숫자를 입력하고 전송하세요
              </p>
            </form>

            <GuessHistory history={history} />
          </div>

          {!gameOver && (
            <button 
              onClick={() => {
                if (confirm('게임을 포기하시겠습니까?')) resetToMain();
              }}
              className="mt-6 text-slate-400 hover:text-red-500 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-rotate-left"></i>
              포기하고 메인으로
            </button>
          )}
        </div>
      )}
    </div>
  );
}

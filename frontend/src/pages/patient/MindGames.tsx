import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CognitiveGame, RoomRecord } from '../../types/index.js';
import {
  Gamepad2,
  Brain,
  Camera,
  Search,
  CheckCircle,
  Clock,
  ArrowLeft,
  AlertCircle,
  Eye,
  History,
  RotateCcw,
} from 'lucide-react';

export const MindGames: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'games' | 'roomMemory'>('roomMemory');

  // Room Memory State
  const [room] = useState<RoomRecord>({
    id: 'room-bedroom-01',
    roomName: 'Master Bedroom',
    photoUrl: 'https://images.unsplash.com/photo-1540518614846-7ede433c4550?auto=format&fit=crop&w=800&q=80',
    capturedDate: 'Captured on Nov 4, 2026 at 10:15 AM',
    lastCheckedTime: 'Today at 09:30 AM',
    detectedObjects: [
      {
        name: 'Reading Glasses (Black Rimmed)',
        locationHint: 'Resting on the wooden bedside table next to the reading lamp',
        verifiedTime: 'Nov 4, 10:15 AM',
      },
      {
        name: 'Home Keys (Brass Ring)',
        locationHint: 'Hanging on the small wall hook right beside the bedroom door',
        verifiedTime: 'Nov 4, 10:15 AM',
      },
      {
        name: 'Blue Water Flask',
        locationHint: 'On the chest of drawers next to the window',
        verifiedTime: 'Nov 4, 10:15 AM',
      },
    ],
  });

  const [searchObjectQuery, setSearchObjectQuery] = useState('');
  const [isRoomChecked, setIsRoomChecked] = useState(false);
  const [checkHistory, setCheckHistory] = useState<string[]>([
    'Checked today at 09:30 AM by Sunita',
    'Checked yesterday at 04:00 PM by Ananya (Caregiver)',
  ]);

  // Cognitive activities catalogue
  const gamesList: CognitiveGame[] = [
    {
      id: 'game-matching',
      title: 'Gentle Card Matching',
      category: 'Memory Matching',
      difficulty: 'Gentle',
      description: 'Find matching pairs of flowers, family birds, and calm nature cards.',
      iconName: 'Sparkles',
    },
    {
      id: 'game-sequence',
      title: 'Melody Sequence Recall',
      category: 'Auditory Memory',
      difficulty: 'Gentle',
      description: 'Listen to a soothing 3-note melody and repeat the sequence.',
      iconName: 'Brain',
    },
    {
      id: 'game-room',
      title: 'Room Memory Game',
      category: 'Spatial Orientation',
      difficulty: 'Moderate',
      description: 'Explore photographs of your home to remember where daily items are kept.',
      iconName: 'Camera',
    },
    {
      id: 'game-words',
      title: 'Word Association Garden',
      category: 'Word Recall',
      difficulty: 'Gentle',
      description: 'Connect related words like "Morning" and "Sunrise".',
      iconName: 'Sparkles',
    },
  ];

  const handleMarkRoomChecked = () => {
    const timestamp = `Checked just now (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) by Sunita`;
    setIsRoomChecked(true);
    setCheckHistory((prev) => [timestamp, ...prev]);
  };

  const handleResetCheck = () => {
    setIsRoomChecked(false);
  };

  const filteredObjects = room.detectedObjects.filter((o) =>
    o.name.toLowerCase().includes(searchObjectQuery.toLowerCase()) ||
    o.locationHint.toLowerCase().includes(searchObjectQuery.toLowerCase())
  );

  return (
    <div className="pb-24 pt-4 px-4 max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate('/patient')}
          className="p-2 rounded-2xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition shadow-xs"
          aria-label="Back to Home"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-saksham-darkText">Mind Games & Memory</h1>
          <p className="text-xs text-gray-500 font-medium">Cognitive stimulation, spatial recall and room memory</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-lavender-100/70 p-1 rounded-2xl border border-purple-200">
        <button
          onClick={() => setActiveTab('roomMemory')}
          className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'roomMemory'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-purple-800 hover:text-purple-900'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Room Memory Game</span>
        </button>

        <button
          onClick={() => setActiveTab('games')}
          className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'games'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-purple-800 hover:text-purple-900'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>All Mind Games</span>
        </button>
      </div>

      {/* Tab 1: Room Memory Game */}
      {activeTab === 'roomMemory' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Room Card with Photograph */}
          <div className="bg-white rounded-3xl overflow-hidden border border-purple-200 shadow-soft-purple">
            <div className="relative h-56 w-full">
              <img
                src={room.photoUrl}
                alt={room.roomName}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-saksham-darkText shadow-sm">
                📍 {room.roomName}
              </div>
              <div className="absolute bottom-3 left-3 right-3 bg-saksham-darkText/75 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] text-white flex items-center justify-between">
                <span>{room.capturedDate}</span>
                <span className="text-lavender-200">3 Saved Items</span>
              </div>
            </div>

            {/* Crucial Clinical Observation Notice */}
            <div className="p-4 bg-amber-50/70 border-b border-amber-200/50 flex items-start space-x-2 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Care Note:</strong> This photo reflects where objects were saved on {room.capturedDate}. Please verify in person if an item has moved.
              </span>
            </div>

            {/* Interactive Object Finder */}
            <div className="p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-saksham-darkText mb-1">
                  "Where did I keep my glasses or keys?"
                </h3>
                <p className="text-xs text-gray-500 mb-2">Search items saved in this room's memory record:</p>

                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchObjectQuery}
                    onChange={(e) => setSearchObjectQuery(e.target.value)}
                    placeholder="Search objects (e.g., glasses, keys, flask)..."
                    className="w-full pl-9 pr-3 py-2.5 bg-lavender-50/50 border border-purple-200 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>

              {/* Object Cues */}
              <div className="space-y-2.5">
                {filteredObjects.map((obj, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 flex items-start space-x-3"
                  >
                    <div className="p-2 bg-white text-purple-700 rounded-xl shadow-xs mt-0.5">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-saksham-darkText">{obj.name}</h4>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed font-medium">
                        📍 {obj.locationHint}
                      </p>
                      <span className="text-[10px] text-purple-600 mt-1 inline-block">
                        Recorded at {obj.verifiedTime}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Check Room Action & History */}
              <div className="pt-2 border-t border-purple-100 flex flex-col gap-2">
                {!isRoomChecked ? (
                  <button
                    onClick={handleMarkRoomChecked}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs md:text-sm rounded-2xl transition shadow-md flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>I have checked this room</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 py-2.5 px-3 bg-emerald-100 text-emerald-800 rounded-2xl text-xs font-bold flex items-center space-x-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Room checked today!</span>
                    </div>
                    <button
                      onClick={handleResetCheck}
                      className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-semibold flex items-center space-x-1"
                      title="Check room again"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Check again</span>
                    </button>
                  </div>
                )}

                {/* History dropdown */}
                <div className="mt-2 bg-gray-50 rounded-2xl p-3 border border-gray-200/70 text-xs text-gray-600">
                  <div className="flex items-center space-x-1 font-bold text-gray-700 mb-1.5">
                    <History className="w-3.5 h-3.5 text-purple-600" />
                    <span>Recent Checking History</span>
                  </div>
                  <ul className="space-y-1 text-[11px]">
                    {checkHistory.map((item, i) => (
                      <li key={i} className="flex items-center space-x-1.5">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Cognitive Games Catalogue */}
      {activeTab === 'games' && (
        <div className="space-y-3 animate-in fade-in">
          {gamesList.map((game) => (
            <div
              key={game.id}
              className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple hover:shadow-elevated transition flex items-start justify-between gap-3"
            >
              <div className="flex items-start space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Gamepad2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-0.5">
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                      {game.category}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">{game.difficulty}</span>
                  </div>
                  <h3 className="font-bold text-base text-saksham-darkText">{game.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{game.description}</p>
                </div>
              </div>

              <button
                onClick={() => alert(`Starting ${game.title} (Cognitive Exercise). In Phase 3, this opens the full interactive canvas!`)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex-shrink-0 mt-2"
              >
                Play
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

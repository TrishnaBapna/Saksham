/**
 * SAKSHAM NEURO-CARE — CAREGIVER PERSONAL MEMORY GRAPH EDITOR
 * Interactive visual curation tool for building verified relational memory connections:
 * Person -> Relationship -> Photograph -> Shared Event -> Familiar Voice/Song -> Favorite Activity
 * 100% Spark Free Plan compliant.
 */

import React, { useState, useEffect } from 'react';
import {
  Share2,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Music,
  Calendar,
  Coffee,
  Image as ImageIcon,
  User,
  ArrowRight,
  ShieldCheck,
  X,
  MapPin,
  Search,
  AlertTriangle,
  Volume2,
} from 'lucide-react';
import {
  MemoryNode,
  PersonalMemoryGraph,
  MemoryNodeType,
  MemoryEdgeType,
  MemoryEmotionalValence,
} from '../types/memoryGraph.types.js';
import { MemoryGraphService } from '../services/memoryGraphService.js';
import { useAccessibility } from '../../../context/AccessibilityContext.js';
import { SpeechService } from '../../../services/speechService.js';

interface PersonalMemoryGraphEditorProps {
  patientId?: string;
  isCaregiver?: boolean;
  className?: string;
}

export const PersonalMemoryGraphEditor: React.FC<PersonalMemoryGraphEditorProps> = ({
  patientId = 'default-patient',
  isCaregiver = true,
  className = '',
}) => {
  const { highContrast } = useAccessibility();

  const [graph, setGraph] = useState<PersonalMemoryGraph>(() =>
    MemoryGraphService.getGraph(patientId)
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddNodeModal, setShowAddNodeModal] = useState<boolean>(false);
  const [showAddEdgeModal, setShowAddEdgeModal] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isNarrating, setIsNarrating] = useState<boolean>(false);

  // Form states for new node
  const [newNodeType, setNewNodeType] = useState<MemoryNodeType>('shared_event');
  const [newNodeLabel, setNewNodeLabel] = useState<string>('');
  const [newNodeDesc, setNewNodeDesc] = useState<string>('');
  const [newNodeValence, setNewNodeValence] = useState<MemoryEmotionalValence>('calming');
  const [newNodeCues, setNewNodeCues] = useState<string>('');

  // Form states for new edge
  const [edgeSourceId, setEdgeSourceId] = useState<string>('');
  const [edgeTargetId, setEdgeTargetId] = useState<string>('');
  const [edgeType, setEdgeType] = useState<MemoryEdgeType>('shared_moment');
  const [edgeDesc, setEdgeDesc] = useState<string>('');

  useEffect(() => {
    setGraph(MemoryGraphService.getGraph(patientId));
  }, [patientId]);

  useEffect(() => {
    return () => {
      SpeechService.stop();
    };
  }, []);

  useEffect(() => {
    SpeechService.stop();
    setIsNarrating(false);
  }, [selectedNodeId]);

  const refreshGraph = () => {
    setGraph(MemoryGraphService.getGraph(patientId));
  };

  const handleCreateNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeLabel.trim()) return;

    const cueList = newNodeCues
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const newNode: MemoryNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      patientId,
      type: newNodeType,
      label: newNodeLabel.trim(),
      description: newNodeDesc.trim() || newNodeLabel.trim(),
      emotionalValence: newNodeValence,
      familiarPrompt: `This is your memory: ${newNodeLabel.trim()}.`,
      cues: cueList.length > 0 ? cueList : [newNodeLabel.trim()],
      caregiverApproved: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    MemoryGraphService.upsertNode(patientId, newNode);
    refreshGraph();
    setShowAddNodeModal(false);
    setNewNodeLabel('');
    setNewNodeDesc('');
    setNewNodeCues('');
  };

  const handleCreateEdge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!edgeSourceId || !edgeTargetId || edgeSourceId === edgeTargetId) return;

    MemoryGraphService.addEdge(patientId, {
      patientId,
      sourceNodeId: edgeSourceId,
      targetNodeId: edgeTargetId,
      relationshipType: edgeType,
      description: edgeDesc.trim() || 'connected to',
      strength: 4,
      caregiverApproved: true,
    });

    refreshGraph();
    setShowAddEdgeModal(false);
    setEdgeDesc('');
  };

  const handleDeleteNode = (nodeId: string) => {
    MemoryGraphService.deleteNode(patientId, nodeId);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    refreshGraph();
  };

  const getNodeIcon = (type: MemoryNodeType) => {
    switch (type) {
      case 'person':
        return <User className="w-4 h-4 text-rose-600" />;
      case 'shared_event':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      case 'favorite_activity':
        return <Coffee className="w-4 h-4 text-amber-600" />;
      case 'voice_or_song':
        return <Music className="w-4 h-4 text-emerald-600" />;
      case 'photo':
        return <ImageIcon className="w-4 h-4 text-indigo-600" />;
      case 'place':
        return <MapPin className="w-4 h-4 text-blue-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-600" />;
    }
  };

  const selectedNode = graph.nodes.find((n) => n.id === selectedNodeId);
  const connectedEdges = graph.edges.filter(
    (e) => e.sourceNodeId === selectedNodeId || e.targetNodeId === selectedNodeId
  );

  const categories = [
    { id: 'all', label: 'All Anchors' },
    { id: 'person', label: 'People' },
    { id: 'place', label: 'Places' },
    { id: 'shared_event', label: 'Events' },
    { id: 'favorite_activity', label: 'Activities' },
    { id: 'voice_or_song', label: 'Songs' },
    { id: 'photo', label: 'Photos' },
  ];

  const filteredNodes = graph.nodes.filter((node) => {
    const matchesCategory = selectedCategory === 'all' || node.type === selectedCategory;
    if (!matchesCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      node.label.toLowerCase().includes(q) ||
      node.description.toLowerCase().includes(q) ||
      node.cues.some((c) => c.toLowerCase().includes(q))
    );
  });

  const duplicateNode =
    newNodeLabel.trim().length > 1
      ? graph.nodes.find(
          (n) => n.label.trim().toLowerCase() === newNodeLabel.trim().toLowerCase()
        )
      : null;

  return (
    <div
      className={`rounded-3xl border p-5 md:p-7 shadow-soft-purple transition ${
        highContrast
          ? 'bg-neutral-950 border-amber-400 text-white'
          : 'bg-white border-purple-100 text-slate-800'
      } ${className}`}
      data-testid="personal-memory-graph-editor"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-purple-100 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 shadow-2xs">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span>Personal Memory Graph</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Zero Hallucination</span>
              </span>
            </h3>
            <p className="text-xs text-purple-700">
              Caregiver-verified relational anchors connecting people, places, events, and songs
            </p>
          </div>
        </div>

        {isCaregiver && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setShowAddNodeModal(true)}
              className="px-3.5 py-2 min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Memory Node</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddEdgeModal(true)}
              className="px-3.5 py-2 min-h-[44px] rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Link Memories</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Graph Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
        {/* Left Column: All Memory Nodes (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-gray-600">
              {filteredNodes.length} of {graph.nodes.length} Verified Anchors
            </span>
            <span className="text-xs text-gray-500">
              {graph.edges.length} Relational Links
            </span>
          </div>

          {/* Search & Category Filter Chips */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anchors by name, description, or cue..."
                aria-label="Search memory anchors"
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-purple-200 text-xs font-medium focus:ring-2 focus:ring-purple-300 focus:outline-hidden bg-white/90"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Category filters">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100'
                  }`}
                  role="tab"
                  aria-selected={selectedCategory === cat.id}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {filteredNodes.length === 0 ? (
            <div className="p-8 text-center bg-purple-50/50 rounded-2xl border border-purple-100 text-xs text-gray-500">
              No memory anchors match your filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto p-1">
              {filteredNodes.map((node) => {
                const isSelected = node.id === selectedNodeId;
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedNodeId(node.id)}
                    className={`p-3.5 rounded-2xl border transition text-left cursor-pointer shadow-2xs flex flex-col justify-between ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/80 ring-2 ring-purple-200'
                        : highContrast
                        ? 'border-neutral-800 bg-neutral-900 hover:border-amber-400'
                        : 'border-purple-100 bg-white hover:border-purple-300'
                    }`}
                    data-testid={`memory-node-${node.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-white shadow-2xs border border-gray-100">
                          {getNodeIcon(node.type)}
                        </div>
                        <span className="text-xs font-bold text-gray-900 line-clamp-1">
                          {node.label}
                        </span>
                      </div>
                      {isCaregiver && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNode(node.id);
                          }}
                          className="text-gray-400 hover:text-rose-600 p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition cursor-pointer"
                          title="Delete node"
                          aria-label={`Delete ${node.label}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2 mt-2 leading-relaxed">
                      {node.description}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100/80 text-[10px]">
                      <span className="capitalize text-purple-700 font-semibold">
                        {node.type.replace('_', ' ')}
                      </span>
                      <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Approved
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Connection Inspector (4 cols) */}
        <div className="lg:col-span-4 bg-purple-50/60 rounded-2xl p-4 border border-purple-100 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider mb-2">
              Memory Connection Inspector
            </h4>

            {selectedNode ? (
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-2 mb-1">
                    {getNodeIcon(selectedNode.type)}
                    <p className="text-xs font-extrabold text-gray-900">{selectedNode.label}</p>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{selectedNode.description}</p>
                  {selectedNode.cues.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedNode.cues.map((cue, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium"
                        >
                          {cue}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-t border-purple-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (isNarrating) {
                          SpeechService.stop();
                          setIsNarrating(false);
                        } else {
                          const promptToSpeak = selectedNode.familiarPrompt || selectedNode.description;
                          SpeechService.speak(
                            promptToSpeak,
                            () => setIsNarrating(true),
                            () => setIsNarrating(false),
                            'en-IN'
                          );
                        }
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs ${
                        isNarrating
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-200'
                      }`}
                      aria-label={isNarrating ? 'Stop Asha narration' : 'Listen to Asha narrate memory'}
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isNarrating ? 'animate-pulse text-amber-700' : 'text-purple-700'}`} />
                      <span>{isNarrating ? 'Stop Asha Narration' : 'Listen to Asha Narrate'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-700">
                    Connected Relationships ({connectedEdges.length})
                  </span>
                  {connectedEdges.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No relational links yet.</p>
                  ) : (
                    connectedEdges.map((edge) => {
                      const otherNodeId =
                        edge.sourceNodeId === selectedNode.id ? edge.targetNodeId : edge.sourceNodeId;
                      const otherNode = graph.nodes.find((n) => n.id === otherNodeId);
                      return (
                        <div
                          key={edge.id}
                          className="bg-white p-2.5 rounded-xl border border-gray-100 text-xs shadow-2xs space-y-1"
                        >
                          <div className="flex items-center gap-1.5 text-purple-800 font-bold">
                            <ArrowRight className="w-3 h-3 text-purple-600" />
                            <span>{otherNode?.label || 'Linked Memory'}</span>
                          </div>
                          <p className="text-[11px] text-gray-600">{edge.description}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic pt-6 text-center">
                Select any memory node to view its verified connections and conversational prompts.
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-purple-100 text-[11px] text-purple-800 font-medium">
            🛡️ Asha uses strictly caregiver-approved memories for reassurance.
          </div>
        </div>
      </div>

      {/* Modal: Add Memory Node */}
      {showAddNodeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-purple-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-purple-100">
              <h4 className="font-extrabold text-base text-gray-900">Add Memory Anchor</h4>
              <button
                type="button"
                onClick={() => setShowAddNodeModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNode} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700">Memory Type</label>
                <select
                  value={newNodeType}
                  onChange={(e) => setNewNodeType(e.target.value as MemoryNodeType)}
                  className="w-full mt-1 p-2.5 rounded-xl border border-purple-200 text-xs font-medium focus:ring-2 focus:ring-purple-300"
                >
                  <option value="shared_event">Shared Event / Milestone</option>
                  <option value="favorite_activity">Favorite Activity</option>
                  <option value="voice_or_song">Familiar Song or Prayer</option>
                  <option value="photo">Photograph Memory</option>
                  <option value="place">Meaningful Place</option>
                  <option value="person">Person / Family</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">Title / Name</label>
                <input
                  type="text"
                  required
                  value={newNodeLabel}
                  onChange={(e) => setNewNodeLabel(e.target.value)}
                  placeholder="e.g. Cardamom Tea on the Veranda"
                  className="w-full mt-1 p-2.5 rounded-xl border border-purple-200 text-xs font-medium focus:ring-2 focus:ring-purple-300"
                />
              </div>

              {duplicateNode && (
                <div
                  className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-col gap-1.5"
                  role="alert"
                  data-testid="duplicate-memory-warning"
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Memory anchor already exists!</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    "{duplicateNode.label}" is already registered. In relational memory care, linking to existing anchors is preferred over duplicates.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEdgeSourceId(duplicateNode.id);
                      setShowAddNodeModal(false);
                      setShowAddEdgeModal(true);
                    }}
                    className="self-start text-[11px] font-bold text-purple-700 underline hover:text-purple-900 cursor-pointer"
                  >
                    Link to existing anchor instead →
                  </button>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-700">Calm Description</label>
                <textarea
                  rows={2}
                  required
                  value={newNodeDesc}
                  onChange={(e) => setNewNodeDesc(e.target.value)}
                  placeholder="Explain this memory calmly as Asha would speak it."
                  className="w-full mt-1 p-2.5 rounded-xl border border-purple-200 text-xs font-medium focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">Emotional Valence</label>
                <select
                  value={newNodeValence}
                  onChange={(e) => setNewNodeValence(e.target.value as MemoryEmotionalValence)}
                  className="w-full mt-1 p-2.5 rounded-xl border border-purple-200 text-xs font-medium focus:ring-2 focus:ring-purple-300"
                >
                  <option value="calming">Calming (gentle, soothing)</option>
                  <option value="joyful">Joyful (celebration, happiness)</option>
                  <option value="grounding">Grounding (reassurance, safety)</option>
                  <option value="neutral">Neutral (factual memory)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">Recognition Cues (comma-separated)</label>
                <input
                  type="text"
                  value={newNodeCues}
                  onChange={(e) => setNewNodeCues(e.target.value)}
                  placeholder="e.g. Elaichi, Chai, Veranda, Garden"
                  className="w-full mt-1 p-2.5 rounded-xl border border-purple-200 text-xs font-medium focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddNodeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save & Approve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Relational Edge */}
      {showAddEdgeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-purple-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-purple-100">
              <h4 className="font-extrabold text-base text-gray-900">Link Two Memories</h4>
              <button
                type="button"
                onClick={() => setShowAddEdgeModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEdge} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700">Source Memory</label>
                <select
                  required
                  value={edgeSourceId}
                  onChange={(e) => setEdgeSourceId(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl border border-purple-200 text-xs font-medium focus:ring-2 focus:ring-purple-300"
                >
                  <option value="">Select source memory...</option>
                  {graph.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label} ({n.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">Target Memory</label>
                <select
                  required
                  value={edgeTargetId}
                  onChange={(e) => setEdgeTargetId(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl border border-purple-200 text-xs font-medium focus:ring-2 focus:ring-purple-300"
                >
                  <option value="">Select target memory...</option>
                  {graph.nodes
                    .filter((n) => n.id !== edgeSourceId)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label} ({n.type})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">Relationship Type</label>
                <select
                  value={edgeType}
                  onChange={(e) => setEdgeType(e.target.value as MemoryEdgeType)}
                  className="w-full mt-1 p-2.5 rounded-xl border border-purple-200 text-xs font-medium focus:ring-2 focus:ring-purple-300"
                >
                  <option value="shared_moment">Shared Moment / Memory</option>
                  <option value="loves_listening_to">Loves Listening To</option>
                  <option value="enjoyed_together">Enjoyed Together</option>
                  <option value="photographed_with">Photographed With</option>
                  <option value="resided_at">Resided At / Visited</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">Relationship Phrase</label>
                <input
                  type="text"
                  required
                  value={edgeDesc}
                  onChange={(e) => setEdgeDesc(e.target.value)}
                  placeholder="e.g. Priya always prepares cardamom tea with you."
                  className="w-full mt-1 p-2.5 rounded-xl border border-purple-200 text-xs font-medium focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEdgeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Create Connection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

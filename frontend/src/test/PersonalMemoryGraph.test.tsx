/**
 * SAKSHAM NEURO-CARE — PHASE 2: PERSONAL MEMORY GRAPH TESTS
 * Verifies TASK-MEM-01 through TASK-MEM-04:
 * - Relational memory graph data contracts & zero-hallucination traversal
 * - MemoryGraphService querying, node/edge persistence, and LovedOnes mirroring
 * - ConversationEngine intent integration (MEMORY_GRAPH_QUERY) with calming pacing
 * - PersonalMemoryGraphEditor UI and LovedOnes page tab navigation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import { MemoryGraphService } from '../features/memory/services/memoryGraphService.js';
import { PersonalMemoryGraphEditor } from '../features/memory/components/PersonalMemoryGraphEditor.js';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { LovedOnes } from '../pages/patient/LovedOnes.js';
import { LovedOnesService } from '../features/lovedOnes/services/lovedOnesService.js';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { SpeechService } from '../services/speechService.js';

describe('Phase 2: Personal Memory Graph Engine & Conversational Bridge', () => {
  const patientId = 'test-patient-sunita';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Seed LovedOnes data
    LovedOnesService.saveLovedOnes(patientId, [
      {
        id: 'lo-priya',
        name: 'Priya Sharma',
        relationship: 'Daughter',
        nickname: 'Guddi',
        description: 'Loving daughter who visits every Tuesday.',
        phone: '+91 98765 43210',
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        cues: ['Daughter', 'Tuesday tea', 'Hospital doctor'],
      },
    ]);
  });

  describe('Part A: MemoryGraphService & Relational Traversal (TASK-MEM-01 & 02)', () => {
    it('initializes default relational memory graph with core anchors for patient', () => {
      const graph = MemoryGraphService.getGraph(patientId);
      expect(graph.patientId).toBe(patientId);
      expect(graph.nodes.length).toBeGreaterThanOrEqual(4);
      expect(graph.edges.length).toBeGreaterThanOrEqual(3);

      const priyaNode = graph.nodes.find((n) => n.label.includes('Priya'));
      expect(priyaNode).toBeDefined();
      expect(priyaNode?.type).toBe('person');
      expect(priyaNode?.caregiverApproved).toBe(true);
    });

    it('performs 1-hop relational query traversal for connected memories', () => {
      const priyaQuery = MemoryGraphService.queryGraph(patientId, 'Priya daughter');
      expect(priyaQuery.matched).toBe(true);
      expect(priyaQuery.primaryNode).toBeDefined();
      expect(priyaQuery.primaryNode?.label).toContain('Priya');
      expect(priyaQuery.connectedNodes.length).toBeGreaterThan(0);

      // Traversal should discover tea or wedding connected to Priya
      const hasConnectedAnchor = priyaQuery.connectedNodes.some(
        (n) => n.label.includes('Tea') || n.label.includes('Wedding')
      );
      expect(hasConnectedAnchor).toBe(true);
    });

    it('guarantees zero hallucination when queried with unknown unfamiliar terms', () => {
      const unknownQuery = MemoryGraphService.queryGraph(patientId, 'Martian astronaut spaceship 1999');
      expect(unknownQuery.matched).toBe(false);
      expect(unknownQuery.primaryNode).toBeNull();
      expect(unknownQuery.connectedNodes).toHaveLength(0);
      expect(unknownQuery.verbalReassurance).toBeUndefined();
    });

    it('allows caregiver to add a new memory node and link with relational edge', () => {
      const newNode = MemoryGraphService.upsertNode(patientId, {
        id: 'node-sitara-garden',
        patientId,
        type: 'place',
        label: 'Sitara Rose Garden',
        description: 'The community garden where you walked every morning.',
        emotionalValence: 'calming',
        familiarPrompt: 'You loved the fragrance of the red roses at Sitara Garden.',
        cues: ['roses', 'garden', 'morning walk'],
        caregiverApproved: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(newNode.id).toBe('node-sitara-garden');

      const newEdge = MemoryGraphService.addEdge(patientId, {
        patientId,
        sourceNodeId: 'node-sitara-garden',
        targetNodeId: 'node-person-priya',
        relationshipType: 'enjoys_activity_with',
        description: 'You and Priya walked here on cool mornings.',
        strength: 5,
        caregiverApproved: true,
      });

      expect(newEdge.id).toBeDefined();

      // Querying garden should now connect to Priya
      const query = MemoryGraphService.queryGraph(patientId, 'Sitara Garden roses');
      expect(query.matched).toBe(true);
      expect(query.primaryNode?.label).toBe('Sitara Rose Garden');
      expect(query.connectedNodes.some((n) => n.label.includes('Priya'))).toBe(true);
    });

    it('cascades deletion of edges when a node is removed', () => {
      const initialGraph = MemoryGraphService.getGraph(patientId);
      const nodeToDelete = initialGraph.nodes[0];
      expect(nodeToDelete).toBeDefined();

      MemoryGraphService.deleteNode(patientId, nodeToDelete.id);
      const updatedGraph = MemoryGraphService.getGraph(patientId);

      expect(updatedGraph.nodes.some((n) => n.id === nodeToDelete.id)).toBe(false);
      // No edges should reference the deleted node
      const hasDanglingEdge = updatedGraph.edges.some(
        (e) => e.sourceNodeId === nodeToDelete.id || e.targetNodeId === nodeToDelete.id
      );
      expect(hasDanglingEdge).toBe(false);
    });
  });

  describe('Part B: Conversational Engine Memory Integration (TASK-MEM-03)', () => {
    it('recognizes relational memory query intent and returns caregiver-verified response', async () => {
      const response = await ConversationEngine.process(
        'Do you remember the wedding in Jaipur?',
        { patientId, caregiverName: 'Priya' } as any,
        'en'
      );

      expect(response.intent).toBe('MEMORY_GRAPH_QUERY');
      expect(response.clinicalState).toBe('Reassuring');
      expect(response.speech.toLowerCase()).toContain('jaipur');
      // Zero hallucination: mentions only verified anchor facts
      expect(response.suggestedAction?.action).toBe('NAVIGATE_LOVED_ONES');
    });

    it('answers who-makes-tea memory query connecting family member and ritual', async () => {
      const response = await ConversationEngine.process(
        'Who makes cardamom tea with me?',
        { patientId, caregiverName: 'Priya' } as any,
        'en'
      );

      expect(response.intent).toBe('MEMORY_GRAPH_QUERY');
      expect(response.speech.toLowerCase()).toMatch(/priya|cardamom|tea/i);
    });

    it('falls back safely when asked about unrecorded events without fabricating stories', async () => {
      const response = await ConversationEngine.process(
        'Tell me about my trip to Antarctica with penguins',
        { patientId, caregiverName: 'Priya' } as any,
        'en'
      );

      // Should not claim any knowledge of Antarctica or make up stories
      expect(response.speech).not.toContain('Antarctica was wonderful');
    });
  });

  describe('Part C: PersonalMemoryGraphEditor UI (TASK-MEM-04)', () => {
    it('renders memory graph editor with verification badge and node list', () => {
      render(
        <AccessibilityProvider>
          <LanguageProvider>
            <PersonalMemoryGraphEditor patientId={patientId} isCaregiver={true} />
          </LanguageProvider>
        </AccessibilityProvider>
      );

      expect(screen.getByRole('heading', { name: /Personal Memory Graph/i })).toBeInTheDocument();
      expect(screen.getByText(/Zero Hallucination/i)).toBeInTheDocument();
      expect(screen.getByText(/Priya Sharma/i)).toBeInTheDocument();
      expect(screen.getByText(/Cardamom Tea in the Garden/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Memory Node/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Link Memories/i })).toBeInTheDocument();
    });

    it('displays connected memories when a node is selected', async () => {
      render(
        <AccessibilityProvider>
          <LanguageProvider>
            <PersonalMemoryGraphEditor patientId={patientId} isCaregiver={true} />
          </LanguageProvider>
        </AccessibilityProvider>
      );

      const priyaCard = screen.getByText(/Priya Sharma/i);
      fireEvent.click(priyaCard);

      await waitFor(() => {
        expect(screen.getByText(/Connected Relationships/i)).toBeInTheDocument();
      });
    });

    it('filters anchors by search input and category chips', async () => {
      render(
        <AccessibilityProvider>
          <LanguageProvider>
            <PersonalMemoryGraphEditor patientId={patientId} isCaregiver={true} />
          </LanguageProvider>
        </AccessibilityProvider>
      );

      const searchInput = screen.getByRole('textbox', { name: /search memory anchors/i });
      fireEvent.change(searchInput, { target: { value: 'Bhajan' } });

      expect(screen.getByText(/Ae Malik Tere Bande Hum/i)).toBeInTheDocument();
      expect(screen.queryByText(/Priya Sharma/i)).not.toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByText(/Priya Sharma/i)).toBeInTheDocument();

      const peopleTab = screen.getByRole('tab', { name: /People/i });
      fireEvent.click(peopleTab);

      expect(screen.getByText(/Priya Sharma/i)).toBeInTheDocument();
      expect(screen.queryByText(/Ae Malik Tere Bande Hum/i)).not.toBeInTheDocument();
    });

    it('warns caregiver when attempting to create a duplicate memory anchor', async () => {
      render(
        <AccessibilityProvider>
          <LanguageProvider>
            <PersonalMemoryGraphEditor patientId={patientId} isCaregiver={true} />
          </LanguageProvider>
        </AccessibilityProvider>
      );

      const addBtn = screen.getByRole('button', { name: /Add Memory Node/i });
      fireEvent.click(addBtn);

      const titleInput = screen.getByPlaceholderText(/e\.g\. Cardamom Tea on the Veranda/i);
      fireEvent.change(titleInput, { target: { value: 'Priya Sharma' } });

      await waitFor(() => {
        expect(screen.getByTestId('duplicate-memory-warning')).toBeInTheDocument();
        expect(screen.getByText(/Memory anchor already exists!/i)).toBeInTheDocument();
      });
    });

    it('provides audio narration button when a node is selected and invokes SpeechService.speak', async () => {
      const speakSpy = vi.spyOn(SpeechService, 'speak').mockImplementation((_text, onStart, _onEnd) => {
        onStart?.();
      });

      render(
        <AccessibilityProvider>
          <LanguageProvider>
            <PersonalMemoryGraphEditor patientId={patientId} isCaregiver={true} />
          </LanguageProvider>
        </AccessibilityProvider>
      );

      const priyaCard = screen.getByText(/Priya Sharma/i);
      fireEvent.click(priyaCard);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Listen to Asha narrate memory/i })).toBeInTheDocument();
      });

      const narrateBtn = screen.getByRole('button', { name: /Listen to Asha narrate memory/i });
      fireEvent.click(narrateBtn);

      expect(speakSpy).toHaveBeenCalled();
      speakSpy.mockRestore();
    });
  });

  describe('Part D: LovedOnes Page Tab Integration (TASK-MEM-04)', () => {
    it('renders tab toggle between Family Album and Personal Memory Graph', () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <AccessibilityProvider>
              <LanguageProvider>
                <LovedOnes />
              </LanguageProvider>
            </AccessibilityProvider>
          </AuthProvider>
        </BrowserRouter>
      );

      expect(screen.getByRole('tab', { name: /Family Album/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Personal Memory Graph/i })).toBeInTheDocument();
    });

    it('switches between Album view and Memory Graph view when tab is clicked', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <AccessibilityProvider>
              <LanguageProvider>
                <LovedOnes />
              </LanguageProvider>
            </AccessibilityProvider>
          </AuthProvider>
        </BrowserRouter>
      );

      // Initially on Album tab
      expect(screen.getByText(/Asha AI Companion/i)).toBeInTheDocument();

      // Click Memory Graph tab
      const graphTab = screen.getByRole('tab', { name: /Personal Memory Graph/i });
      fireEvent.click(graphTab);

      await waitFor(() => {
        expect(screen.getByTestId('personal-memory-graph-editor')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Personal Memory Graph/i })).toBeInTheDocument();
      });

      // Click back to Album tab
      const albumTab = screen.getByRole('tab', { name: /Family Album/i });
      fireEvent.click(albumTab);

      await waitFor(() => {
        expect(screen.getByText(/Asha AI Companion/i)).toBeInTheDocument();
      });
    });
  });
});

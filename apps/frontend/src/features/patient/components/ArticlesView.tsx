import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { VoiceReadButton } from '@/components/voice/VoiceReadButton';
import type { CareCondition } from '@/types/firestore';

interface ArticleItem {
  id: string;
  title: string;
  category: string;
  icon: string;
  readTime: string;
  summary: string;
  content: string;
  condition: 'parkinsons' | 'alzheimers' | 'both';
}

const ARTICLES_COLLECTION: ArticleItem[] = [
  {
    id: 'gait-freezing',
    title: 'Safe Movement & Freezing-of-Gait Strategies',
    category: 'Motor & Gait Safety',
    icon: '🚶',
    readTime: '3 min read',
    condition: 'parkinsons',
    summary: 'Auditory cueing and rhythmic stepping techniques to overcome hesitation when transitioning through doorways.',
    content: 'Freezing of gait (FOG) occurs when neurological signals to initiate or sustain walking momentarily falter. Auditory cueing—such as counting aloud "one, two, one, two" or using a 100 BPM metronome—bypasses the impaired basal ganglia pathway by utilizing the auditory cortex.',
  },
  {
    id: 'speech-clarity',
    title: 'Preserving Speech Clarity & Vocal Projection',
    category: 'Speech Therapy',
    icon: '🗣️',
    readTime: '4 min read',
    condition: 'parkinsons',
    summary: 'Daily high-effort vocal exercises to combat hypophonia and maintain conversational presence.',
    content: 'Hypophonia makes patients speak quietly without realizing it. Performing sustained /ah/ vocal drills at 65–75 dB for 5 minutes daily recalibrates vocal cord adduction and breath support.',
  },
  {
    id: 'levodopa-timing',
    title: 'Nutritional Timing: Protein & Levodopa Absorption',
    category: 'Dietary Guidance',
    icon: '💊',
    readTime: '3 min read',
    condition: 'parkinsons',
    summary: 'Why spacing dietary proteins 1 hour apart from dopaminergic medications supports smoother absorption.',
    content: 'Levodopa utilizes large neutral amino acid transporters in the small intestine. Consuming heavy proteins at the exact same moment can compete for these transporters, causing delayed medication onset.',
  },
  {
    id: 'memory-anchoring',
    title: 'Visual Routine Anchoring & Personal Stations',
    category: 'Memory Care',
    icon: '🧠',
    readTime: '3 min read',
    condition: 'alzheimers',
    summary: 'Reducing cognitive fatigue by establishing predictable daily visual stations and labeled personal spaces.',
    content: 'Creating predictable visual anchors—such as a dedicated table with glasses, daily routine checklist, and familiar photographs—minimizes anxiety and provides gentle orientation.',
  },
  {
    id: 'sundowning-care',
    title: 'Evening Peace & Sundowning Transition',
    category: 'Circadian Wellbeing',
    icon: '🌅',
    readTime: '4 min read',
    condition: 'alzheimers',
    summary: 'Soft ambient lighting and calming audio routines to ease evening restlessness.',
    content: 'Sundowning causes late-afternoon disorientation due to circadian fatigue and dimming natural light. Turning on warm ambient lights before sunset and playing familiar voices significantly reduces agitation.',
  },
];

interface ArticlesViewProps {
  condition?: CareCondition | string;
}

export const ArticlesView: React.FC<ArticlesViewProps> = ({ condition = 'both' }) => {
  const [selectedArticle, setSelectedArticle] = useState<ArticleItem | null>(null);

  const filteredArticles = ARTICLES_COLLECTION.filter((a) => {
    if (condition === 'both' || condition === 'dementia') return true;
    if (condition === 'parkinsons') return a.condition === 'parkinsons';
    if (condition === 'alzheimers') return a.condition === 'alzheimers';
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center text-2xl shrink-0">
            📰
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 font-heading">
                Condition-Tailored Educational Articles
              </h2>
              <VoiceReadButton
                textToRead="Condition-Tailored Educational Articles. Evidence-based care strategies and daily guides."
                ariaLabel="Read Articles description"
              />
            </div>
            <p className="text-xs text-gray-500">
              Validated clinical guidance tailored for {condition === 'both' ? "Parkinson's & Alzheimer's dual care" : condition} support.
            </p>
          </div>
        </div>
      </div>

      {/* Selected Article Reading View */}
      {selectedArticle ? (
        <Card className="p-6 bg-white border border-gray-100 flex flex-col gap-4 animate-fade-in">
          <button
            type="button"
            onClick={() => setSelectedArticle(null)}
            className="text-xs font-bold text-teal-700 hover:underline self-start flex items-center gap-1"
          >
            ← Back to All Articles
          </button>

          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 uppercase">
                {selectedArticle.category}
              </span>
              <h3 className="text-lg font-bold text-gray-900 mt-1 font-heading">
                {selectedArticle.title}
              </h3>
            </div>
            <VoiceReadButton
              textToRead={`${selectedArticle.title}. ${selectedArticle.content}`}
              ariaLabel="Read article aloud"
            />
          </div>

          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {selectedArticle.content}
          </p>
        </Card>
      ) : (
        /* Grid of Articles */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredArticles.map((article) => (
            <Card
              key={article.id}
              hoverable
              onClick={() => setSelectedArticle(article)}
              className="p-5 bg-white border border-gray-100 flex flex-col justify-between gap-3 cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {article.category}
                  </span>
                  <span>{article.readTime}</span>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0 p-2 rounded-xl bg-gray-50">{article.icon}</span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 font-heading">
                      {article.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {article.summary}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-xs font-bold text-teal-700">
                <span>Read Full Guide →</span>
                <VoiceReadButton
                  textToRead={`${article.title}. ${article.summary}`}
                  ariaLabel={`Read summary of ${article.title}`}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

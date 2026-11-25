/**
 * SAKSHAM — MILESTONE 7.3: DETERMINISTIC ENTITY EXTRACTOR
 * Extracts dates, times, names, relationships, activities and queries from patient utterances.
 * 100% Spark Free Plan compliant — deterministic local parsing.
 */

import { ExtractedEntities } from '../types/conversation.types.js';
import { PatientContext } from '../../../services/patientContextService.js';

export class EntityExtractor {
  /**
   * Extracts entities from user query against patient context.
   */
  public static extract(query: string, context?: PatientContext): ExtractedEntities {
    const raw = query.trim();
    const lower = raw.toLowerCase();

    const entities: ExtractedEntities = {
      rawQuery: raw,
    };

    // 1. Time Extraction
    entities.time = this.extractTime(lower);

    // 2. Date Extraction
    entities.date = this.extractDate(lower);

    // 3. Person & Relationship Extraction
    const personInfo = this.extractPersonOrRelationship(lower, context);
    if (personInfo.personName) entities.personName = personInfo.personName;
    if (personInfo.relationship) entities.relationship = personInfo.relationship;

    // 4. Game Name Extraction
    entities.gameName = this.extractGameName(lower);

    // 5. Note Search Query Extraction
    entities.noteQuery = this.extractNoteQuery(lower);

    // 6. Routine Activity Extraction
    entities.routineTitle = this.extractRoutineTitle(lower);

    return entities;
  }

  /**
   * Extracts time strings (e.g., '5 PM', '09:30 AM', '17:00', 'morning')
   */
  private static extractTime(query: string): string | undefined {
    // 12-hour format with AM/PM (e.g. 5 PM, 5:30 pm, 11am)
    const ampmMatch = query.match(/\b(\d{1,2}(?::\d{2})?)\s*(am|pm|a\.m\.|p\.m\.)\b/i);
    if (ampmMatch) {
      const numPart = ampmMatch[1];
      const period = ampmMatch[2].toUpperCase().replace(/\./g, '');
      const [hourStr, minStr] = numPart.split(':');
      const hour = parseInt(hourStr, 10);
      const minutes = minStr ? minStr.padStart(2, '0') : '00';
      return `${hour.toString().padStart(2, '0')}:${minutes} ${period}`;
    }

    // 24-hour format (e.g. 17:00, 08:30)
    const militaryMatch = query.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (militaryMatch) {
      const h = parseInt(militaryMatch[1], 10);
      const m = militaryMatch[2];
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12.toString().padStart(2, '0')}:${m} ${period}`;
    }

    // Contextual Periods (Hindi / English)
    if (query.includes('morning') || query.includes('सुबह')) return '09:00 AM';
    if (query.includes('afternoon') || query.includes('दोपहर')) return '02:00 PM';
    if (query.includes('evening') || query.includes('शाम')) return '06:00 PM';
    if (query.includes('night') || query.includes('रात')) return '08:30 PM';

    return undefined;
  }

  /**
   * Extracts date references (today, tomorrow, week)
   */
  private static extractDate(query: string): 'today' | 'tomorrow' | 'week' | undefined {
    if (query.includes('tomorrow') || query.includes('कल')) return 'tomorrow';
    if (query.includes('this week') || query.includes('week') || query.includes('हफ्ते') || query.includes('सप्ताह')) return 'week';
    if (query.includes('today') || query.includes('आज')) return 'today';
    return undefined;
  }

  /**
   * Matches names and relationships against patient's actual Loved Ones
   */
  private static extractPersonOrRelationship(
    query: string,
    context?: PatientContext
  ): { personName?: string; relationship?: string } {
    const lovedOnes = context?.lovedOnes?.lovedOnes || [];

    // Check direct name match in actual loved ones
    for (const member of lovedOnes) {
      const name = member.name.toLowerCase();
      const nick = (member.nickname || '').toLowerCase();
      if (query.includes(name) || (nick && query.includes(nick))) {
        return { personName: member.name, relationship: member.relationship };
      }
      // Check first name match
      const firstName = name.split(' ')[0];
      if (firstName.length > 2 && query.includes(firstName)) {
        return { personName: member.name, relationship: member.relationship };
      }
    }

    // Check relationship keywords
    const relKeywords = [
      { key: 'daughter', hi: 'बेटी', rel: 'Daughter' },
      { key: 'son', hi: 'बेटा', rel: 'Son' },
      { key: 'grandson', hi: 'पोता', rel: 'Grandson' },
      { key: 'granddaughter', hi: 'पोती', rel: 'Granddaughter' },
      { key: 'wife', hi: 'पत्नी', rel: 'Wife' },
      { key: 'husband', hi: 'पति', rel: 'Husband' },
      { key: 'sister', hi: 'बहन', rel: 'Sister' },
      { key: 'brother', hi: 'भाई', rel: 'Brother' },
      { key: 'friend', hi: 'दोस्त', rel: 'Friend' },
      { key: 'mother', hi: 'माँ', rel: 'Mother' },
      { key: 'father', hi: 'पिताजी', rel: 'Father' },
    ];

    for (const r of relKeywords) {
      if (query.includes(r.key) || query.includes(r.hi)) {
        // Look up member with this relationship
        const matched = lovedOnes.find(
          (m) => m.relationship.toLowerCase().includes(r.key) || m.relationship.toLowerCase().includes(r.rel.toLowerCase())
        );
        return {
          personName: matched?.name,
          relationship: r.rel,
        };
      }
    }

    return {};
  }

  /**
   * Matches known Mind Games
   */
  private static extractGameName(query: string): string | undefined {
    if (query.includes('pattern match') || query.includes('पैटर्न')) return 'Pattern Match';
    if (query.includes('card match') || query.includes('कार्ड') || query.includes('matching')) return 'Card Match';
    if (query.includes('sequence') || query.includes('daily sequence') || query.includes('क्रम')) return 'Daily Sequence';
    if (query.includes('memory') || query.includes('याद')) return 'Memory Match';
    return undefined;
  }

  /**
   * Extracts search term for Notes
   */
  private static extractNoteQuery(query: string): string | undefined {
    const patterns = [
      /(?:find|show|read|open|search)\s+(?:my\s+)?(?:note\s+about\s+|note\s+on\s+|note\s+titled\s+|note\s+)(.+)/i,
      /(?:note\s+about|note\s+for)\s+(.+)/i,
      /(?:shopping|grocery|appointment|medicine|खरीदारी|दवा)\s+note/i,
    ];

    for (const pat of patterns) {
      const match = query.match(pat);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    if (query.includes('shopping') || query.includes('खरीदारी')) return 'shopping';
    if (query.includes('doctor') || query.includes('appointment') || query.includes('डॉक्टर')) return 'appointment';
    if (query.includes('medicine') || query.includes('दवा')) return 'medicine';

    return undefined;
  }

  /**
   * Extracts structured title and content for Class 3 note creation proposals.
   */
  public static extractNoteDetails(rawQuery: string): {
    title: string;
    content: string;
    hasExplicitContent: boolean;
  } {
    const raw = rawQuery.trim();
    const match = raw.match(
      /^(?:please\s+)?(?:i\s+want\s+to\s+|can\s+you\s+|could\s+you\s+)?(?:write|take|create|add|save|make|record|jot\s+down|note\s+down)?\s*(?:a\s+|an\s+|new\s+)?(?:new\s+)?note(?:\s+(?:saying\s+(?:that\s+)?|that\s+|about\s+|for\s+|titled\s+|called\s+)|\s*[:\-–—]\s*|\s+)(.+)$/i
    );

    const extracted = match?.[1]?.replace(/^["'“”]+|["'“”]+$/g, '').trim() || '';
    if (extracted.length > 0 && !/^(please|for me|now)$/i.test(extracted)) {
      const capitalized = extracted.charAt(0).toUpperCase() + extracted.slice(1);
      const shortTitle =
        capitalized.length > 48 ? `${capitalized.slice(0, 45).trimEnd()}...` : capitalized;
      return {
        title: shortTitle,
        content: extracted,
        hasExplicitContent: true,
      };
    }

    return {
      title: 'Personal Reflection',
      content: '',
      hasExplicitContent: false,
    };
  }

  /**
   * Extracts proposed Routine / Reminder title
   */
  private static extractRoutineTitle(query: string): string | undefined {
    const stripped = query
      .replace(
        /^(?:(?:please\s+)?(?:set|add|create)\s+(?:a\s+|an\s+)?reminder(?:\s+(?:to|for|about|at))?|remind\s+me(?:\s+(?:to|about|at))?|add\s+routine|add\s+task|create\s+task|मुझे याद दिलाएं|रिमाइंडर जोड़ें|काम जोड़ो)\s+/i,
        ''
      )
      .replace(/\s+(at|on|for|around)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b.*$/i, '')
      .trim();

    if (stripped.length > 2) {
      return stripped.charAt(0).toUpperCase() + stripped.slice(1);
    }
    return undefined;
  }
}

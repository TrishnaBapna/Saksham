/**
 * SAKSHAM — MILESTONE 7.3.2: RELIABLE ASYNCHRONOUS CONVERSATION ACTION REGISTRY
 * Coordinates Class 1, 2, 3 and 4 actions.
 * Enforces explicit confirmations with 2-minute execution-time TTL.
 * Completely asynchronous commit pipeline awaiting underlying persistence promises.
 * Local-first truthful status tracking: saved_locally | synced_cloud | failed | expired | duplicate_ignored.
 * 100% Spark Free Plan compliant.
 */

import { ActionExecutionResult, PendingConfirmation } from '../types/conversation.types.js';
import { RoutineService } from '../../routines/services/routineService.js';
import { NotesService } from '../../notes/services/notesService.js';
import { CalendarService } from '../../calendar/services/calendarService.js';
import { isGuestPatient } from '../../auth/services/identityService.js';

export class ConversationActionRegistry {
  private static pendingMap: Map<string, PendingConfirmation> = new Map();
  private static executingSet: Set<string> = new Set();

  /**
   * Registers a pending consequential action requiring explicit patient confirmation.
   * Auto-expires after 2 minutes (120,000ms).
   */
  public static createPendingConfirmation(
    patientId: string,
    actionType: PendingConfirmation['actionType'],
    title: string,
    details: Record<string, any>,
    proposalText: string
  ): PendingConfirmation {
    const id = `confirm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const pending: PendingConfirmation = {
      id,
      patientId,
      actionType,
      title,
      details,
      proposalText,
      createdAt: Date.now(),
      expiresAt: Date.now() + 120_000, // 2 minutes
    };

    this.pendingMap.set(patientId, pending);
    return pending;
  }

  /**
   * Retrieves active pending confirmation for patient, filtering out expired ones.
   */
  public static getActivePendingConfirmation(patientId: string): PendingConfirmation | null {
    const pending = this.pendingMap.get(patientId);
    if (!pending) return null;

    if (Date.now() > pending.expiresAt) {
      this.pendingMap.delete(patientId);
      return null;
    }

    return pending;
  }

  /**
   * Cancels any pending confirmation for the patient without making changes.
   */
  public static cancelPendingConfirmation(patientId: string): boolean {
    if (this.pendingMap.has(patientId)) {
      this.pendingMap.delete(patientId);
      return true;
    }
    return false;
  }

  /**
   * Clears all pending confirmations and execution locks (for testing and teardown).
   */
  public static clearAll(): void {
    this.pendingMap.clear();
    this.executingSet.clear();
  }

  /**
   * Commits the pending consequential change to actual data services.
   * Truly asynchronous: awaits underlying service promises, catches rejections,
   * prevents double-execution races, enforces execution-time TTL, and validates UID ownership.
   */
  public static async executePendingConfirmation(
    patientId: string,
    pendingId?: string,
    authUid?: string
  ): Promise<ActionExecutionResult> {
    // Re-entrancy & race-condition lock for in-flight executions
    if (pendingId && this.executingSet.has(pendingId)) {
      return {
        success: false,
        status: 'duplicate_ignored',
        message: 'Action is already currently being committed.',
        speechHi: 'यह क्रिया पहले से सहेजी जा रही है।',
        speechEn: 'This action is already being processed. Please hold on a moment.',
        speechByLang: {
          en: 'This action is already being processed. Please hold on a moment.',
          hi: 'यह क्रिया पहले से सहेजी जा रही है।',
          mr: 'ही कृती आधीच जतन केली जात आहे. कृपया एक क्षण थांबा.',
          bn: 'এই কাজটি ইতিমধ্যেই সংরক্ষণ করা হচ্ছে। অনুগ্রহ করে একটু অপেক্ষা করুন।',
          ta: 'இந்தச் செயல் ஏற்கனவே சேமிக்கப்படுகிறது. சிறிது நேரம் பொறுத்திருக்கவும்.',
          te: 'ఈ చర్య ఇప్పటికే సేవ్ చేయబడుతోంది. దయచేసి కొద్దిసేపు ఆగండి.',
          kn: 'ಈ ಕ್ರಿಯೆಯನ್ನು ಈಗಾಗಲೇ ಉಳಿಸಲಾಗುತ್ತಿದೆ. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಸಮಯ ಕಾಯಿರಿ.',
        },
      };
    }

    const pending = this.pendingMap.get(patientId);

    if (!pending || (pendingId && pending.id !== pendingId)) {
      return {
        success: false,
        status: 'expired',
        message: 'No active confirmation found or action expired.',
        speechHi: 'पुष्टि करने के लिए कोई सक्रिय अनुरोध नहीं मिला या समय समाप्त हो गया।',
        speechEn: 'I could not find an active pending action to confirm, or the confirmation has expired.',
        speechByLang: {
          en: 'I could not find an active pending action to confirm, or the confirmation has expired.',
          hi: 'पुष्टि करने के लिए कोई सक्रिय अनुरोध नहीं मिला या समय समाप्त हो गया।',
          mr: 'पुष्टी करण्यासाठी कोणतीही प्रलंबित विनंती सापडली नाही किंवा वेळ संपली आहे.',
          bn: 'নিশ্চিত করার জন্য কোনো সক্রিয় অনুরোধ পাওয়া যায়নি বা সময় শেষ হয়ে গেছে।',
          ta: 'உறுதிப்படுத்த எந்த நிலுவைச் செயலும் இல்லை அல்லது நேரம் முடிந்துவிட்டது.',
          te: 'నిర్ధారించడానికి చురుకైన అభ్యర్థన ఏదీ కనుగొనబడలేదు లేదా గడువు ముగిసింది.',
          kn: 'ಖಚಿತಪಡಿಸಲು ಯಾವುದೇ ಬಾಕಿ ವಿನಂತಿ ಕಂಡುಬಂದಿಲ್ಲ ಅಥವಾ ಸಮಯ ಮೀರಿದೆ.',
        },
      };
    }

    // UID Ownership re-verification
    if (authUid && pending.patientId && authUid !== pending.patientId && !isGuestPatient(pending.patientId)) {
      this.pendingMap.delete(patientId);
      return {
        success: false,
        status: 'permission_denied',
        message: 'Authenticated account mismatch.',
        speechHi: 'खाता सुरक्षा कारणों से यह क्रिया अस्वीकृत कर दी गई।',
        speechEn: 'For your security, this action cannot be confirmed across different accounts.',
        speechByLang: {
          en: 'For your security, this action cannot be confirmed across different accounts.',
          hi: 'खाता सुरक्षा कारणों से यह क्रिया अस्वीकृत कर दी गई।',
          mr: 'खात्याच्या सुरक्षिततेसाठी ही कृती वेगळ्या खात्यातून पुष्टी करता येत नाही.',
          bn: 'অ্যাকাউন্টের নিরাপত্তার জন্য ভিন্ন অ্যাকাউন্ট থেকে এই কাজটি নিশ্চিত করা যাবে না।',
          ta: 'உங்கள் பாதுகாப்பிற்காக வெவ்வேறு கணக்குகளிலிருந்து இந்தச் செயலை உறுதிப்படுத்த முடியாது.',
          te: 'మీ భద్రత కోసం, వేర్వేరు ఖాతాల నుండి ఈ చర్యను నిర్ధారించలేము.',
          kn: 'ನಿಮ್ಮ ಸುರಕ್ಷತೆಗಾಗಿ, ಬೇರೆ ಖಾತೆಗಳಿಂದ ಈ ಕ್ರಿಯೆಯನ್ನು ದೃಢೀಕರಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.',
        },
      };
    }

    // Execution-time TTL check (2 minutes)
    if (Date.now() > pending.expiresAt) {
      this.pendingMap.delete(patientId);
      return {
        success: false,
        status: 'expired',
        message: 'Confirmation expired.',
        speechHi: 'कार्रवाई की समय सीमा समाप्त हो गई है। कृपया दोबारा बताएं।',
        speechEn: 'That confirmation has expired for your safety. Please let me know what you would like to do again.',
        speechByLang: {
          en: 'That confirmation has expired for your safety. Please let me know what you would like to do again.',
          hi: 'कार्रवाई की समय सीमा समाप्त हो गई है। कृपया दोबारा बताएं।',
          mr: 'तुमच्या सुरक्षिततेसाठी या पुष्टीची वेळ संपली आहे. कृपया पुन्हा सांगा.',
          bn: 'আপনার নিরাপত্তার জন্য নিশ্চিতকরণের সময় শেষ হয়ে গেছে। অনুগ্রহ করে আবার বলুন।',
          ta: 'உங்கள் பாதுகாப்பிற்காக உறுதிப்படுத்தல் நேரம் முடிந்துவிட்டது. தயவுசெய்து மீண்டும் கூறவும்.',
          te: 'మీ భద్రత కోసం ఆ నిర్ధారణ గడువు ముగిసింది. దయచేసి మళ్లీ చెప్పండి.',
          kn: 'ನಿಮ್ಮ ಸುರಕ್ಷತೆಗಾಗಿ ದೃಢೀಕರಣದ ಸಮಯ ಮೀರಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ತಿಳಿಸಿ.',
        },
      };
    }

    // Re-entrancy & race-condition lock
    if (this.executingSet.has(pending.id)) {
      return {
        success: false,
        status: 'duplicate_ignored',
        message: 'Action is already currently being committed.',
        speechHi: 'यह क्रिया पहले से सहेजी जा रही है।',
        speechEn: 'This action is already being processed. Please hold on a moment.',
        speechByLang: {
          en: 'This action is already being processed. Please hold on a moment.',
          hi: 'यह क्रिया पहले से सहेजी जा रही है।',
          mr: 'ही कृती आधीच जतन केली जात आहे. कृपया एक क्षण थांबा.',
          bn: 'এই কাজটি ইতিমধ্যেই সংরক্ষণ করা হচ্ছে। অনুগ্রহ করে একটু অপেক্ষা করুন।',
          ta: 'இந்தச் செயல் ஏற்கனவே சேமிக்கப்படுகிறது. சிறிது நேரம் பொறுத்திருக்கவும்.',
          te: 'ఈ చర్య ఇప్పటికే సేవ్ చేయబడుతోంది. దయచేసి కొద్దిసేపు ఆగండి.',
          kn: 'ಈ ಕ್ರಿಯೆಯನ್ನು ಈಗಾಗಲೇ ಉಳಿಸಲಾಗುತ್ತಿದೆ. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಸಮಯ ಕಾಯಿರಿ.',
        },
      };
    }

    // Immediately remove from pendingMap and acquire lock before awaiting
    this.pendingMap.delete(patientId);
    this.executingSet.add(pending.id);

    try {
      switch (pending.actionType) {
        case 'CREATE_REMINDER':
        case 'CREATE_ROUTINE': {
          const title = pending.title || 'Gentle Care Reminder';
          const time = pending.details.time || '03:00 PM';
          const period = time.toLowerCase().includes('pm') ? 'afternoon' : 'morning';

          RoutineService.addRoutine(patientId, {
            id: `routine-${Date.now()}`,
            title,
            scheduledTime: time,
            category: (pending.details.category as any) || 'wellness',
            period: period as any,
            isCompleted: false,
            enableAssistedRecall: true,
            streakCount: 0,
          });

          return {
            success: true,
            status: 'saved_locally',
            message: `Created reminder for ${title} at ${time}`,
            speechHi: `मैंने ${time} के लिए आपकी दिनचर्या में '${title}' इस डिवाइस पर सहेज दिया है। यह आपके डैशबोर्ड पर तैयार है!`,
            speechEn: `I have saved your reminder for '${title}' at ${time} on this device. It is ready on your care dashboard!`,
            speechByLang: {
              en: `I have saved your reminder for '${title}' at ${time} on this device. It is ready on your care dashboard!`,
              hi: `मैंने ${time} के लिए आपकी दिनचर्या में '${title}' इस डिवाइस पर सहेज दिया है। यह आपके डैशबोर्ड पर तैयार है!`,
              mr: `${time} साठी '${title}' हा स्मरणसंदेश या डिव्हाइसवर जतन केला आहे. तो तुमच्या डॅशबोर्डवर तयार आहे!`,
              bn: `${time}-এর জন্য '${title}' রিমাইন্ডারটি এই ডিভাইসে সংরক্ষণ করা হয়েছে। এটি আপনার ড্যাশবোর্ডে প্রস্তুত রয়েছে!`,
              ta: `${time} மணிக்கு '${title}' நினைவூட்டல் இந்தச் சாதனத்தில் சேமிக்கப்பட்டது!`,
              te: `${time} కి '${title}' రిమైండర్ ఈ పరికరంలో సేవ్ చేయబడింది!`,
              kn: `${time} ಗಾಗಿ '${title}' ಜ್ಞಾಪನೆಯನ್ನು ಈ ಸಾಧನದಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ!`,
            },
          };
        }

        case 'CREATE_NOTE': {
          const title = pending.title || 'Personal Reflection';
          const content = pending.details.content || pending.title;
          const category = pending.details.category || 'general';

          const note = await NotesService.createNote(patientId, {
            title,
            content,
            category,
            isPinned: pending.details.isPinned || false,
          });

          const isCloudSynced = note.syncStatus === 'synced';
          return {
            success: true,
            status: isCloudSynced ? 'synced_cloud' : 'saved_locally',
            message: `Created note: ${title}`,
            speechHi: isCloudSynced
              ? `आपका नया नोट '${title}' क्लाउड में सहेज लिया गया है!`
              : `आपका नया नोट '${title}' इस डिवाइस पर सुरक्षित रूप से सहेज लिया गया है।`,
            speechEn: isCloudSynced
              ? `Your new note '${title}' has been safely synced to the cloud.`
              : `Your note '${title}' has been safely preserved on this device and is waiting to sync.`,
            speechByLang: {
              en: isCloudSynced
                ? `Your new note '${title}' has been safely synced to the cloud.`
                : `Your note '${title}' has been safely preserved on this device and is waiting to sync.`,
              hi: isCloudSynced
                ? `आपका नया नोट '${title}' क्लाउड में सहेज लिया गया है!`
                : `आपका नया नोट '${title}' इस डिवाइस पर सुरक्षित रूप से सहेज लिया गया है।`,
              mr: `तुमची नवीन नोंद '${title}' सुरक्षितपणे जतन केली आहे.`,
              bn: `আপনার নতুন নোট '${title}' নিরাপদে সংরক্ষণ করা হয়েছে।`,
              ta: `உங்கள் புதிய குறிப்பு '${title}' பாதுகாப்பாகச் சேமிக்கப்பட்டது.`,
              te: `మీ కొత్త గమనిక '${title}' సురక్షితంగా సేవ్ చేయబడింది.`,
              kn: `ನಿಮ್ಮ ಹೊಸ ಟಿಪ್ಪಣಿ '${title}' ಸುರಕ್ಷಿತವಾಗಿ ಉಳಿಸಲಾಗಿದೆ.`,
            },
          };
        }

        case 'CREATE_CALENDAR_EVENT': {
          const title = pending.title || 'Family Moment';
          const date = pending.details.date || new Date().toISOString().split('T')[0];
          const startTime = pending.details.time || '10:00';
          const startAt = new Date(`${date}T${startTime.length === 5 ? startTime : '10:00'}:00`).toISOString();

          const event = await CalendarService.createEvent(patientId, {
            title,
            startAt,
            category: (pending.details.category as any) || 'personal',
            isAllDay: false,
            isPrivate: false,
          });

          const isCloudSynced = event.syncStatus === 'synced';
          return {
            success: true,
            status: isCloudSynced ? 'synced_cloud' : 'saved_locally',
            message: `Created event: ${title}`,
            speechHi: isCloudSynced
              ? `आपका कार्यक्रम '${title}' क्लाउड कैलेंडर में जोड़ दिया गया है!`
              : `आपका कार्यक्रम '${title}' इस डिवाइस पर कैलेंडर में जोड़ दिया गया है।`,
            speechEn: isCloudSynced
              ? `I have scheduled '${title}' in your cloud calendar for ${date} at ${startTime}.`
              : `I have scheduled '${title}' in your calendar for ${date} at ${startTime} on this device.`,
            speechByLang: {
              en: isCloudSynced
                ? `I have scheduled '${title}' in your cloud calendar for ${date} at ${startTime}.`
                : `I have scheduled '${title}' in your calendar for ${date} at ${startTime} on this device.`,
              hi: isCloudSynced
                ? `आपका कार्यक्रम '${title}' क्लाउड कैलेंडर में जोड़ दिया गया है!`
                : `आपका कार्यक्रम '${title}' इस डिवाइस पर कैलेंडर में जोड़ दिया गया है।`,
              mr: `'${title}' हा कार्यक्रम ${date} रोजी ${startTime} वाजता कॅलेंडरमध्ये जतन केला आहे.`,
              bn: `'${title}' অনুষ্ঠানটি ${date} তারিখে ${startTime}-এ ক্যালেন্ডারে যুক্ত করা হয়েছে।`,
              ta: `'${title}' நிகழ்வு ${date} அன்று ${startTime} மணிக்கு நாட்காட்டியில் சேமிக்கப்பட்டது.`,
              te: `'${title}' కార్యక్రమం ${date} నాడు ${startTime} కు క్యాలెండర్‌లో చేర్చబడింది.`,
              kn: `'${title}' ಕಾರ್ಯಕ್ರಮವನ್ನು ${date} ರಂದು ${startTime} ಕ್ಕೆ ಕ್ಯಾಲೆಂಡರ್‌ನಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ.`,
            },
          };
        }

        default:
          return {
            success: false,
            status: 'failed',
            message: 'Unsupported action type',
            speechHi: 'यह क्रिया अभी समर्थित नहीं है।',
            speechEn: 'This action is not currently supported.',
            speechByLang: {
              en: 'This action is not currently supported.',
              hi: 'यह क्रिया अभी समर्थित नहीं है।',
              mr: 'ही कृती सध्या उपलब्ध नाही.',
              bn: 'এই কাজটি বর্তমানে সমর্থিত নয়।',
              ta: 'இந்தச் செயல் தற்போது ஆதரிக்கப்படவில்லை.',
              te: 'ఈ చర్య ప్రస్తుతం అందుబాటులో లేదు.',
              kn: 'ಈ ಕ್ರಿಯೆಗೆ ಪ್ರಸ್ತುತ ಬೆಂಬಲವಿಲ್ಲ.',
            },
          };
      }
    } catch (err: any) {
      return {
        success: false,
        status: 'failed',
        message: err?.message || 'Error executing action',
        speechHi: 'सहेजते समय एक समस्या आई। आप दोबारा प्रयास कर सकते हैं।',
        speechEn: 'I encountered an issue while saving. You can safely try again.',
        speechByLang: {
          en: 'I encountered an issue while saving. You can safely try again.',
          hi: 'सहेजते समय एक समस्या आई। आप दोबारा प्रयास कर सकते हैं।',
          mr: 'जतन करताना एक अडचण आली. तुम्ही पुन्हा प्रयत्न करू शकता.',
          bn: 'সংরক্ষণ করার সময় একটি সমস্যা হয়েছে। আপনি আবার চেষ্টা করতে পারেন।',
          ta: 'சேமிக்கும்போது சிக்கல் ஏற்பட்டது. நீங்கள் மீண்டும் முயற்சிக்கலாம்.',
          te: 'సేవ్ చేయడంలో సమస్య ఎదురైంది. మీరు మళ్లీ ప్రయత్నించవచ్చు.',
          kn: 'ಉಳಿಸುವಾಗ ಸಮಸ್ಯೆ ಎದುರಾಯಿತು. ನೀವು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಬಹುದು.',
        },
        retryAvailable: true,
        pendingAction: pending,
      };
    } finally {
      this.executingSet.delete(pending.id);
    }
  }
}

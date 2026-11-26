export type GovernanceLangCode = 'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'te' | 'kn';

const normLang = (language?: string): GovernanceLangCode => {
  const short = (language || 'en').toLowerCase().split('-')[0];
  if (
    short === 'hi' ||
    short === 'mr' ||
    short === 'bn' ||
    short === 'ta' ||
    short === 'te' ||
    short === 'kn'
  ) {
    return short;
  }
  return 'en';
};

export interface GovernanceUi {
  // Doctor registration extra fields & Admin bootstrap
  regDoctorPhoneLabel: string;
  regQualificationLabel: string;
  regAuthorityLabel: string;
  regCredentialDocLabel: string;
  regCredentialDocHint: string;
  adminBootstrapTitle: string;
  adminBootstrapIntro: string;
  adminBootstrapFirestoreTitle: string;
  adminBootstrapSecurityNote: string;
  // Doctor verification gate screens
  statusBadgePrefix: string;
  statusPendingLabel: string;
  statusApprovedLabel: string;
  statusRejectedLabel: string;
  statusInfoRequiredLabel: string;
  statusSuspendedLabel: string;
  docRejectedTitle: string;
  docRejectedBody: string;
  docInfoReqTitle: string;
  docInfoReqBody: string;
  docReviewNoteLabel: string;
  docSubmittedCredsTitle: string;
  docClarificationLabel: string;
  docClarificationPlaceholder: string;
  docSubmitClarificationBtn: string;
  docClarificationSent: string;
  docClarificationErr: string;
  docSignOutReturn: string;
  // Admin dashboard governance tabs & stats
  tabDoctors: string;
  tabUsers: string;
  tabAudit: string;
  tabSystem: string;
  tabDiagnostics: string;
  statPendingDoctors: string;
  statApprovedDoctors: string;
  statPatients: string;
  statCaregivers: string;
  statRestricted: string;
  filterAll: string;
  filterPending: string;
  filterInfoReq: string;
  filterApproved: string;
  filterRejected: string;
  filterSuspended: string;
  docAppsTitle: string;
  docAppsEmpty: string;
  fieldPhone: string;
  fieldQualification: string;
  fieldLicense: string;
  fieldAuthority: string;
  fieldSpecialty: string;
  fieldInstitution: string;
  fieldDocument: string;
  fieldSubmittedAt: string;
  fieldReviewedAt: string;
  fieldApplicantResponse: string;
  reviewNoteInputLabel: string;
  reviewNotePlaceholder: string;
  btnApproveDoctor: string;
  btnRequestInfo: string;
  btnRejectDoctor: string;
  btnSuspendAccount: string;
  btnReactivateAccount: string;
  btnAssignPatient: string;
  btnRevokeAssignment: string;
  selectPatientPlaceholder: string;
  assignedPatientsLabel: string;
  noPatientsToAssign: string;
  docReviewRequiredErr: string;
  userSearchPlaceholder: string;
  roleAll: string;
  btnDeleteProfile: string;
  btnSoftDeactivate: string;
  deleteModalTitle: string;
  deleteModalHonestNote: string;
  deleteConfirmBtn: string;
  cancelBtn: string;
  refreshRegistryBtn: string;
  adminBootstrapRefTitle: string;
  adminBootstrapRefSub: string;
  verificationHistoryTitle: string;
  docStatusRuleBlockedNotice: string;
}

const GOV_UI: Record<GovernanceLangCode, GovernanceUi> = {
  en: {
    regDoctorPhoneLabel: 'Contact Phone Number',
    regQualificationLabel: 'Medical Qualification',
    regAuthorityLabel: 'Registration Council / Authority',
    regCredentialDocLabel: 'Credential Document (Optional, PDF/JPG/PNG)',
    regCredentialDocHint: 'Attach license or degree certificate (max 5 MB)',
    adminBootstrapTitle: 'Administrator Provisioning & Bootstrap Guide',
    adminBootstrapIntro:
      'Creating an email/password user in Firebase Authentication alone does not grant Admin access. An authorized project owner must create the Firestore admin role document (or assign Custom Claims via the Admin SDK script).',
    adminBootstrapFirestoreTitle: 'Firestore Console Required Document',
    adminBootstrapSecurityNote:
      'Zero-trust rule: Self-registration cannot create Admin accounts. Unprovisioned Auth accounts are safely treated as least-privilege Patient accounts.',
    statusBadgePrefix: 'Verification Status:',
    statusPendingLabel: 'Pending Verification',
    statusApprovedLabel: 'Approved Practitioner',
    statusRejectedLabel: 'Application Rejected',
    statusInfoRequiredLabel: 'Additional Information Required',
    statusSuspendedLabel: 'Suspended',
    docRejectedTitle: 'Clinician Verification Declined',
    docRejectedBody:
      'Your clinician verification application was not approved. Access to patient charts and clinical workflows remains restricted.',
    docInfoReqTitle: 'Additional Verification Information Required',
    docInfoReqBody:
      'An administrator requested clarification or updated credential information before approving clinical access.',
    docReviewNoteLabel: 'Administrator Review Note',
    docSubmittedCredsTitle: 'Submitted Credentials',
    docClarificationLabel: 'Clarification Response for Administrator',
    docClarificationPlaceholder:
      'Provide your updated registration details, institution verification contact, or clarification...',
    docSubmitClarificationBtn: 'Submit Clarification Note',
    docClarificationSent:
      'Your clarification response has been recorded. An administrator will review your application.',
    docClarificationErr: 'Unable to save clarification note.',
    docSignOutReturn: 'Sign Out & Return to Login',
    tabDoctors: 'Doctor Verification',
    tabUsers: 'User Management',
    tabAudit: 'Audit & Reviews',
    tabSystem: 'System & Setup',
    tabDiagnostics: 'Diagnostics',
    statPendingDoctors: 'Pending Doctors',
    statApprovedDoctors: 'Approved Doctors',
    statPatients: 'Patients',
    statCaregivers: 'Caregivers',
    statRestricted: 'Rejected / Suspended',
    filterAll: 'All',
    filterPending: 'Pending',
    filterInfoReq: 'Info Requested',
    filterApproved: 'Approved',
    filterRejected: 'Rejected',
    filterSuspended: 'Suspended',
    docAppsTitle: 'Clinician Credential Verification Queue',
    docAppsEmpty: 'No clinician applications match the selected filter.',
    fieldPhone: 'Phone',
    fieldQualification: 'Qualification',
    fieldLicense: 'License / Reg. No.',
    fieldAuthority: 'Authority',
    fieldSpecialty: 'Specialty',
    fieldInstitution: 'Institution',
    fieldDocument: 'Verification Doc',
    fieldSubmittedAt: 'Submitted',
    fieldReviewedAt: 'Last Reviewed',
    fieldApplicantResponse: 'Applicant Clarification',
    reviewNoteInputLabel: 'Reviewer Decision Note',
    reviewNotePlaceholder: 'Enter verification verification notes, license check outcome, or reason...',
    btnApproveDoctor: 'Approve Doctor',
    btnRequestInfo: 'Request Info',
    btnRejectDoctor: 'Reject',
    btnSuspendAccount: 'Suspend',
    btnReactivateAccount: 'Reactivate',
    btnAssignPatient: 'Assign Patient',
    btnRevokeAssignment: 'Revoke',
    selectPatientPlaceholder: 'Select verified patient to assign...',
    assignedPatientsLabel: 'Assigned Patients',
    noPatientsToAssign: 'No patient profiles available',
    docReviewRequiredErr: 'Please enter a review note when rejecting or requesting additional information.',
    userSearchPlaceholder: 'Search by name, email, UID, or license...',
    roleAll: 'All Roles',
    btnDeleteProfile: 'Remove Profile',
    btnSoftDeactivate: 'Deactivate',
    deleteModalTitle: 'Confirm Account Profile Removal',
    deleteModalHonestNote:
      'Removes the user registry profile from Firestore and revokes active clinical/caregiver links. Because Saksham operates on Firebase Spark Free client rules without paid Admin Cloud Functions, deleting their Firebase Authentication login credential requires removing the Auth user in Firebase Console -> Authentication -> Users or running the trusted Admin SDK CLI script.',
    deleteConfirmBtn: 'Remove Firestore Profile & Revoke Links',
    cancelBtn: 'Cancel',
    refreshRegistryBtn: 'Refresh',
    adminBootstrapRefTitle: 'Trusted Admin Bootstrap Architecture (Spark Free)',
    adminBootstrapRefSub:
      'Provision administrators via Firestore `users/{uid}` (`role: "admin"`, `status: "verified"`) or `backend/src/scripts/bootstrapAdmin.ts` using Firebase Admin SDK.',
    verificationHistoryTitle: 'Review History',
    docStatusRuleBlockedNotice:
      'Clinical workspace locked until verification status becomes Approved.',
  },
  hi: {
    regDoctorPhoneLabel: 'संपर्क फ़ोन नंबर',
    regQualificationLabel: 'चिकित्सा योग्यता',
    regAuthorityLabel: 'पंजीकरण परिषद / प्राधिकरण',
    regCredentialDocLabel: 'सत्यापन दस्तावेज़ (वैकल्पिक, PDF/JPG/PNG)',
    regCredentialDocHint: 'लाइसेंस या डिग्री प्रमाणपत्र संलग्न करें (अधिकतम 5 MB)',
    adminBootstrapTitle: 'प्रशासक खाता प्रावधान और बूटस्ट्रैप गाइड',
    adminBootstrapIntro:
      'केवल Firebase Authentication में ईमेल/पासवर्ड उपयोगकर्ता बनाने से प्रशासक अधिकार नहीं मिलते। अधिकृत प्रोजेक्ट स्वामी को Firestore में `users/{uid}` दस्तावेज़ बनाना या Admin SDK स्क्रिप्ट से कस्टम क्लेम सेट करना होगा।',
    adminBootstrapFirestoreTitle: 'Firestore Console में आवश्यक दस्तावेज़',
    adminBootstrapSecurityNote:
      'जीरो-ट्रस्ट नियम: सार्वजनिक पंजीकरण से एडमिन खाते नहीं बन सकते। अप्रावधानित Auth खाते सुरक्षित रूप से न्यूनतम-अधिकार रोगी के रूप में देखे जाते हैं।',
    statusBadgePrefix: 'सत्यापन स्थिति:',
    statusPendingLabel: 'सत्यापन लंबित',
    statusApprovedLabel: 'स्वीकृत चिकित्सक',
    statusRejectedLabel: 'आवेदन अस्वीकृत',
    statusInfoRequiredLabel: 'अतिरिक्त जानकारी आवश्यक',
    statusSuspendedLabel: 'निलंबित',
    docRejectedTitle: 'चिकित्सक सत्यापन अस्वीकृत',
    docRejectedBody:
      'आपका चिकित्सक सत्यापन आवेदन स्वीकृत नहीं हुआ है। रोगी चार्ट और क्लिनिकल वर्कफ़्लो तक पहुंच अवरुद्ध है।',
    docInfoReqTitle: 'अतिरिक्त सत्यापन जानकारी आवश्यक',
    docInfoReqBody:
      'क्लिनिकल प्रवेश स्वीकृत करने से पहले प्रशासक ने स्पष्टीकरण या अद्यतन प्रमाणपत्र विवरण मांगा है।',
    docReviewNoteLabel: 'प्रशासक समीक्षा टिप्पणी',
    docSubmittedCredsTitle: 'प्रस्तुत प्रमाणपत्र विवरण',
    docClarificationLabel: 'प्रशासक के लिए स्पष्टीकरण उत्तर',
    docClarificationPlaceholder:
      'अपना अद्यतन पंजीकरण विवरण, संस्थान संपर्क या स्पष्टीकरण लिखें...',
    docSubmitClarificationBtn: 'स्पष्टीकरण भेजें',
    docClarificationSent:
      'आपका स्पष्टीकरण सहेजा गया है। प्रशासक जल्द ही आपके आवेदन की समीक्षा करेंगे।',
    docClarificationErr: 'स्पष्टीकरण सहेजा नहीं जा सका।',
    docSignOutReturn: 'साइन आउट करें और लॉगिन पर लौटें',
    tabDoctors: 'चिकित्सक सत्यापन',
    tabUsers: 'उपयोगकर्ता प्रबंधन',
    tabAudit: 'ऑडिट और समीक्षाएँ',
    tabSystem: 'सिस्टम और सेटअप',
    tabDiagnostics: 'निदान',
    statPendingDoctors: 'लंबित चिकित्सक',
    statApprovedDoctors: 'स्वीकृत चिकित्सक',
    statPatients: 'रोगी',
    statCaregivers: 'देखभालकर्ता',
    statRestricted: 'अस्वीकृत / निलंबित',
    filterAll: 'सभी',
    filterPending: 'लंबित',
    filterInfoReq: 'जानकारी मांगी',
    filterApproved: 'स्वीकृत',
    filterRejected: 'अस्वीकृत',
    filterSuspended: 'निलंबित',
    docAppsTitle: 'चिकित्सक प्रमाणपत्र सत्यापन कतार',
    docAppsEmpty: 'चयनित फ़िल्टर से कोई चिकित्सक आवेदन मेल नहीं खाता।',
    fieldPhone: 'फ़ोन',
    fieldQualification: 'योग्यता',
    fieldLicense: 'लाइसेंस / पंजी. क्र.',
    fieldAuthority: 'प्राधिकरण',
    fieldSpecialty: 'विशेषज्ञता',
    fieldInstitution: 'संस्थान',
    fieldDocument: 'सत्यापन दस्तावेज़',
    fieldSubmittedAt: 'प्रस्तुत तिथि',
    fieldReviewedAt: 'अंतिम समीक्षा',
    fieldApplicantResponse: 'आवेदक स्पष्टीकरण',
    reviewNoteInputLabel: 'समीक्षक निर्णय टिप्पणी',
    reviewNotePlaceholder: 'सत्यापन टिप्पणी, लाइसेंस जांच परिणाम या कारण दर्ज करें...',
    btnApproveDoctor: 'चिकित्सक स्वीकृत करें',
    btnRequestInfo: 'जानकारी मांगें',
    btnRejectDoctor: 'अस्वीकृत करें',
    btnSuspendAccount: 'निलंबित करें',
    btnReactivateAccount: 'पुनः सक्रिय करें',
    btnAssignPatient: 'रोगी असाइन करें',
    btnRevokeAssignment: 'रद्द करें',
    selectPatientPlaceholder: 'असाइन करने के लिए सत्यापित रोगी चुनें...',
    assignedPatientsLabel: 'असाइन किए गए रोगी',
    noPatientsToAssign: 'कोई रोगी प्रोफ़ाइल उपलब्ध नहीं है',
    docReviewRequiredErr: 'अस्वीकार करने या अतिरिक्त जानकारी मांगने के लिए कृपया समीक्षा टिप्पणी लिखें।',
    userSearchPlaceholder: 'नाम, ईमेल, UID या लाइसेंस से खोजें...',
    roleAll: 'सभी भूमिकाएँ',
    btnDeleteProfile: 'प्रोफ़ाइल हटाएँ',
    btnSoftDeactivate: 'निष्क्रिय करें',
    deleteModalTitle: 'खाता प्रोफ़ाइल हटाने की पुष्टि करें',
    deleteModalHonestNote:
      'यह Firestore से उपयोगकर्ता प्रोफ़ाइल हटाता है और सक्रिय क्लिनिकल/देखभाल लिंक रद्द करता है। Spark Free क्लाइंट आर्किटेक्चर के कारण Firebase Authentication लॉगिन हटाने के लिए Firebase Console -> Authentication -> Users या Admin SDK स्क्रिप्ट का उपयोग करें।',
    deleteConfirmBtn: 'प्रोफ़ाइल हटाएँ और लिंक रद्द करें',
    cancelBtn: 'रद्द करें',
    refreshRegistryBtn: 'रिफ्रेश',
    adminBootstrapRefTitle: 'विश्वसनीय एडमिन बूटस्ट्रैप (Spark Free)',
    adminBootstrapRefSub:
      'Firestore `users/{uid}` (`role: "admin"`, `status: "verified"`) या `bootstrapAdmin.ts` के माध्यम से एडमिन प्रावधान करें।',
    verificationHistoryTitle: 'समीक्षा इतिहास',
    docStatusRuleBlockedNotice: 'सत्यापन स्वीकृत होने तक क्लिनिकल कार्यक्षेत्र लॉक रहता है।',
  },
  mr: {
    regDoctorPhoneLabel: 'संपर्क फोन नंबर',
    regQualificationLabel: 'वैद्यकीय पात्रता',
    regAuthorityLabel: 'नोंदणी परिषद / प्राधिकरण',
    regCredentialDocLabel: 'सत्यापन दस्तऐवज (ऐच्छिक, PDF/JPG/PNG)',
    regCredentialDocHint: 'परवाना किंवा पदवी प्रमाणपत्र जोडा (कमाल 5 MB)',
    adminBootstrapTitle: 'प्रशासक तरतूद आणि बूटस्ट्रॅप मार्गदर्शक',
    adminBootstrapIntro:
      'फक्त Firebase Authentication मध्ये ईमेल/पासवर्ड वापरकर्ता तयार केल्याने प्रशासक प्रवेश मिळत नाही. अधिकृत प्रकल्प मालकाने Firestore मध्ये `users/{uid}` दस्तऐवज तयार करावा.',
    adminBootstrapFirestoreTitle: 'Firestore Console मधील आवश्यक दस्तऐवज',
    adminBootstrapSecurityNote:
      'शून्य-विश्वास नियम: सार्वजनिक नोंदणीद्वारे प्रशासक खाती तयार करता येत नाहीत.',
    statusBadgePrefix: 'पडताळणी स्थिती:',
    statusPendingLabel: 'पडताळणी प्रलंबित',
    statusApprovedLabel: 'मंजूर चिकित्सक',
    statusRejectedLabel: 'अर्ज नाकारला',
    statusInfoRequiredLabel: 'अतिरिक्त माहिती आवश्यक',
    statusSuspendedLabel: 'निलंबित',
    docRejectedTitle: 'चिकित्सक पडताळणी नाकारली',
    docRejectedBody: 'तुमचा चिकित्सक पडताळणी अर्ज मंजूर झालेला नाही. रुग्ण नोंदी प्रतिबंधित आहेत.',
    docInfoReqTitle: 'अतिरिक्त पडताळणी माहिती आवश्यक',
    docInfoReqBody: 'प्रवेश मंजूर करण्यापूर्वी प्रशासकाने अधिक माहिती मागवली आहे.',
    docReviewNoteLabel: 'प्रशासक पुनरावलोकन टीप',
    docSubmittedCredsTitle: 'सादर केलेली प्रमाणपत्रे',
    docClarificationLabel: 'प्रशासकासाठी स्पष्टीकरण',
    docClarificationPlaceholder: 'अद्यतन नोंदणी तपशील किंवा स्पष्टीकरण लिहा...',
    docSubmitClarificationBtn: 'स्पष्टीकरण पाठवा',
    docClarificationSent: 'तुमचे स्पष्टीकरण जतन केले आहे.',
    docClarificationErr: 'स्पष्टीकरण जतन करता आले नाही.',
    docSignOutReturn: 'साइन आउट करा आणि लॉगिनवर परत जा',
    tabDoctors: 'चिकित्सक पडताळणी',
    tabUsers: 'वापरकर्ता व्यवस्थापन',
    tabAudit: 'ऑडिट आणि पुनरावलोकने',
    tabSystem: 'सिस्टम आणि सेटअप',
    tabDiagnostics: 'निदान',
    statPendingDoctors: 'प्रलंबित चिकित्सक',
    statApprovedDoctors: 'मंजूर चिकित्सक',
    statPatients: 'रुग्ण',
    statCaregivers: 'काळजीवाहू',
    statRestricted: 'नाकारलेले / निलंबित',
    filterAll: 'सर्व',
    filterPending: 'प्रलंबित',
    filterInfoReq: 'माहिती मागवली',
    filterApproved: 'मंजूर',
    filterRejected: 'नाकारलेले',
    filterSuspended: 'निलंबित',
    docAppsTitle: 'चिकित्सक प्रमाणपत्र पडताळणी रांग',
    docAppsEmpty: 'निवडलेल्या फिल्टरनुसार कोणताही अर्ज नाही.',
    fieldPhone: 'फोन',
    fieldQualification: 'पात्रता',
    fieldLicense: 'परवाना क्र.',
    fieldAuthority: 'प्राधिकरण',
    fieldSpecialty: 'विशेषज्ञता',
    fieldInstitution: 'संस्था',
    fieldDocument: 'पडताळणी दस्तऐवज',
    fieldSubmittedAt: 'सादर केले',
    fieldReviewedAt: 'अंतिम पुनरावलोकन',
    fieldApplicantResponse: 'अर्जदार स्पष्टीकरण',
    reviewNoteInputLabel: 'पुनरावलोकन टीप',
    reviewNotePlaceholder: 'पडताळणी टीप किंवा कारण प्रविष्ट करा...',
    btnApproveDoctor: 'मंजूर करा',
    btnRequestInfo: 'माहिती मागा',
    btnRejectDoctor: 'नाकारा',
    btnSuspendAccount: 'निलंबित करा',
    btnReactivateAccount: 'पुन्हा सक्रिय करा',
    btnAssignPatient: 'रुग्ण नियुक्त करा',
    btnRevokeAssignment: 'रद्द करा',
    selectPatientPlaceholder: 'नियुक्त करण्यासाठी रुग्ण निवडा...',
    assignedPatientsLabel: 'नियुक्त केलेले रुग्ण',
    noPatientsToAssign: 'कोणतेही रुग्ण उपलब्ध नाहीत',
    docReviewRequiredErr: 'नाकारताना किंवा माहिती मागवताना कृपया टीप लिहा.',
    userSearchPlaceholder: 'नाव, ईमेल, UID किंवा परवाना शोधा...',
    roleAll: 'सर्व भूमिका',
    btnDeleteProfile: 'प्रोफाइल काढा',
    btnSoftDeactivate: 'निष्क्रिय करा',
    deleteModalTitle: 'वापरकर्ता प्रोफाइल काढण्याची पुष्टी',
    deleteModalHonestNote:
      'Firestore प्रोफाइल काढते आणि सक्रिय लिंक रद्द करते. Firebase Authentication लॉगिन काढण्यासाठी Firebase Console किंवा Admin SDK स्क्रिप्ट वापरा.',
    deleteConfirmBtn: 'प्रोफाइल काढा व लिंक रद्द करा',
    cancelBtn: 'रद्द करा',
    refreshRegistryBtn: 'रिफ्रेश',
    adminBootstrapRefTitle: 'विश्वसनीय प्रशासक बूटस्ट्रॅप (Spark Free)',
    adminBootstrapRefSub: 'Firestore `users/{uid}` किंवा `bootstrapAdmin.ts` द्वारे प्रशासक सेट करा.',
    verificationHistoryTitle: 'पुनरावलोकन इतिहास',
    docStatusRuleBlockedNotice: 'पडताळणी मंजूर होईपर्यंत क्लिनिकल डॅशबोर्ड लॉक आहे.',
  },
  bn: {
    regDoctorPhoneLabel: 'যোগাযোগের ফোন নম্বর',
    regQualificationLabel: 'চিকিৎসা যোগ্যতা',
    regAuthorityLabel: 'নিবন্ধন পরিষদ / কর্তৃপক্ষ',
    regCredentialDocLabel: 'যাচাইকরণ নথি (ঐচ্ছিক, PDF/JPG/PNG)',
    regCredentialDocHint: 'লাইসেন্স বা ডিগ্রি সনদ সংযুক্ত করুন (সর্বোচ্চ 5 MB)',
    adminBootstrapTitle: 'প্রশাসক অ্যাকাউন্ট প্রোভিশনিং ও বুটস্ট্র্যাপ গাইড',
    adminBootstrapIntro:
      'শুধুমাত্র Firebase Authentication-এ ইমেল/পাসওয়ার্ড তৈরি করলে অ্যাডমিন অধিকার পাওয়া যায় না। প্রকল্প মালিককে Firestore-এ `users/{uid}` ডকুমেন্ট তৈরি করতে হবে।',
    adminBootstrapFirestoreTitle: 'Firestore Console-এ প্রয়োজনীয় ডকুমেন্ট',
    adminBootstrapSecurityNote:
      'জিরো-ট্রাস্ট নিয়ম: পাবলিক নিবন্ধনের মাধ্যমে অ্যাডমিন অ্যাকাউন্ট তৈরি করা যায় না।',
    statusBadgePrefix: 'যাচাইকরণের অবস্থা:',
    statusPendingLabel: 'যাচাইকরণ মুলতুবি',
    statusApprovedLabel: 'অনুমোদিত চিকিৎসক',
    statusRejectedLabel: 'আবেদন প্রত্যাখ্যাত',
    statusInfoRequiredLabel: 'অতিরিক্ত তথ্য প্রয়োজন',
    statusSuspendedLabel: 'স্থগিত',
    docRejectedTitle: 'চিকিৎসক যাচাইকরণ প্রত্যাখ্যাত',
    docRejectedBody: 'আপনার চিকিৎসক আবেদন অনুমোদিত হয়নি। রোগীর নথি প্রবেশাধিকার সীমাবদ্ধ।',
    docInfoReqTitle: 'অতিরিক্ত যাচাইকরণ তথ্য প্রয়োজন',
    docInfoReqBody: 'অ্যাডমিন অনুমোদনের আগে আরও তথ্য চেয়েছেন।',
    docReviewNoteLabel: 'প্রশাসকের পর্যালোচনা নোট',
    docSubmittedCredsTitle: 'জমা দেওয়া সনদপত্র',
    docClarificationLabel: 'প্রশাসকের জন্য ব্যাখ্যা',
    docClarificationPlaceholder: 'আপনার হালনাগাদ নিবন্ধন তথ্য বা ব্যাখ্যা লিখুন...',
    docSubmitClarificationBtn: 'ব্যাখ্যা জমা দিন',
    docClarificationSent: 'আপনার ব্যাখ্যা সংরক্ষণ করা হয়েছে।',
    docClarificationErr: 'ব্যাখ্যা সংরক্ষণ করা যায়নি।',
    docSignOutReturn: 'সাইন আউট করে লগইনে ফিরুন',
    tabDoctors: 'চিকিৎসক যাচাইকরণ',
    tabUsers: 'ব্যবহারকারী ব্যবস্থাপনা',
    tabAudit: 'অডিট ও পর্যালোচনা',
    tabSystem: 'সিস্টেম ও সেটআপ',
    tabDiagnostics: 'ডায়াগনস্টিক্স',
    statPendingDoctors: 'মুলতুবি চিকিৎসক',
    statApprovedDoctors: 'অনুমোদিত চিকিৎসক',
    statPatients: 'রোগী',
    statCaregivers: 'যত্নকারী',
    statRestricted: 'প্রত্যাখ্যাত / স্থগিত',
    filterAll: 'সব',
    filterPending: 'মুলতুবি',
    filterInfoReq: 'তথ্য চাওয়া হয়েছে',
    filterApproved: 'অনুমোদিত',
    filterRejected: 'প্রত্যাখ্যাত',
    filterSuspended: 'স্থগিত',
    docAppsTitle: 'চিকিৎসক সনদ যাচাইকরণ সারি',
    docAppsEmpty: 'নির্বাচিত ফিল্টারে কোনো আবেদন নেই।',
    fieldPhone: 'ফোন',
    fieldQualification: 'যোগ্যতা',
    fieldLicense: 'লাইসেন্স নম্বর',
    fieldAuthority: 'কর্তৃপক্ষ',
    fieldSpecialty: 'বিশেষজ্ঞতা',
    fieldInstitution: 'প্রতিষ্ঠান',
    fieldDocument: 'নথি',
    fieldSubmittedAt: 'জমা হয়েছে',
    fieldReviewedAt: 'সর্বশেষ পর্যালোচনা',
    fieldApplicantResponse: 'আবেদনকারীর ব্যাখ্যা',
    reviewNoteInputLabel: 'পর্যালোচনা নোট',
    reviewNotePlaceholder: 'যাচাইকরণ নোট বা কারণ লিখুন...',
    btnApproveDoctor: 'অনুমোদন করুন',
    btnRequestInfo: 'তথ্য চান',
    btnRejectDoctor: 'প্রত্যাখ্যান করুন',
    btnSuspendAccount: 'স্থগিত করুন',
    btnReactivateAccount: 'পুনরায় সক্রিয় করুন',
    btnAssignPatient: 'রোগী নির্ধারণ করুন',
    btnRevokeAssignment: 'বাতিল করুন',
    selectPatientPlaceholder: 'নির্ধারণ করতে রোগী বেছে নিন...',
    assignedPatientsLabel: 'নির্ধারিত রোগী',
    noPatientsToAssign: 'কোনো রোগী উপলব্ধ নেই',
    docReviewRequiredErr: 'প্রত্যাখ্যান বা তথ্য চাওয়ার সময় নোট লিখুন।',
    userSearchPlaceholder: 'নাম, ইমেল, UID বা লাইসেন্স খুঁজুন...',
    roleAll: 'সব ভূমিকা',
    btnDeleteProfile: 'প্রোফাইল সরান',
    btnSoftDeactivate: 'নিষ্ক্রিয় করুন',
    deleteModalTitle: 'প্রোফাইল অপসারণ নিশ্চিত করুন',
    deleteModalHonestNote:
      'Firestore প্রোফাইল সরিয়ে সক্রিয় লিঙ্ক বাতিল করে। Auth লগইন মুছতে Firebase Console বা Admin SDK স্ক্রিপ্ট ব্যবহার করুন।',
    deleteConfirmBtn: 'প্রোফাইল সরান ও লিঙ্ক বাতিল করুন',
    cancelBtn: 'বাতিল',
    refreshRegistryBtn: 'রিফ্রেশ',
    adminBootstrapRefTitle: 'বিশ্বস্ত অ্যাডমিন বুটস্ট্র্যাপ (Spark Free)',
    adminBootstrapRefSub: 'Firestore `users/{uid}` বা `bootstrapAdmin.ts` দিয়ে অ্যাডমিন সেট করুন।',
    verificationHistoryTitle: 'পর্যালোচনার ইতিহাস',
    docStatusRuleBlockedNotice: 'অনুমোদন না হওয়া পর্যন্ত ক্লিনিক্যাল কর্মক্ষেত্র লক থাকবে।',
  },
  ta: {
    regDoctorPhoneLabel: 'தொடர்பு தொலைபேசி எண்',
    regQualificationLabel: 'மருத்துவ தகுதி',
    regAuthorityLabel: 'பதிவு சபை / அதிகாரம்',
    regCredentialDocLabel: 'சான்றிதழ் ஆவணம் (விருப்பம், PDF/JPG/PNG)',
    regCredentialDocHint: 'உரிமம் அல்லது பட்டச் சான்றிதழை இணைக்கவும் (அதிகபட்சம் 5 MB)',
    adminBootstrapTitle: 'நிர்வாகி அமைப்பு மற்றும் பூட்ஸ்டிராப் வழிகாட்டி',
    adminBootstrapIntro:
      'Firebase Authentication இல் மட்டும் மின்னஞ்சல்/கடவுச்சொல் உருவாக்குவது நிர்வாக அணுகலைத் தராது. Firestore இல் `users/{uid}` ஆவணத்தை உருவாக்க வேண்டும்.',
    adminBootstrapFirestoreTitle: 'Firestore Console தேவையான ஆவணம்',
    adminBootstrapSecurityNote:
      'ஜீரோ-டிரஸ்ட் விதி: பொதுப் பதிவு மூலம் நிர்வாக கணக்குகளை உருவாக்க முடியாது.',
    statusBadgePrefix: 'சரிபார்ப்பு நிலை:',
    statusPendingLabel: 'சரிபார்ப்பு நிலுவையில்',
    statusApprovedLabel: 'அங்கீகரிக்கப்பட்ட மருத்துவர்',
    statusRejectedLabel: 'விண்ணப்பம் நிராகரிக்கப்பட்டது',
    statusInfoRequiredLabel: 'கூடுதல் தகவல் தேவை',
    statusSuspendedLabel: 'இடைநிறுத்தப்பட்டது',
    docRejectedTitle: 'மருத்துவர் சரிபார்ப்பு நிராகரிக்கப்பட்டது',
    docRejectedBody: 'உங்கள் மருத்துவர் சரிபார்ப்பு விண்ணப்பம் அங்கீகரிக்கப்படவில்லை.',
    docInfoReqTitle: 'கூடுதல் சரிபார்ப்பு தகவல் தேவை',
    docInfoReqBody: 'நிர்வாகி கூடுதல் விளக்கத்தை கோரியுள்ளார்.',
    docReviewNoteLabel: 'நிர்வாகி மதிப்பாய்வு குறிப்பு',
    docSubmittedCredsTitle: 'சமர்ப்பிக்கப்பட்ட சான்றுகள்',
    docClarificationLabel: 'நிர்வாகிக்கான விளக்கம்',
    docClarificationPlaceholder: 'உங்கள் புதுப்பிக்கப்பட்ட பதிவு விவரங்களை உள்ளிடவும்...',
    docSubmitClarificationBtn: 'விளக்கத்தை சமர்ப்பிக்கவும்',
    docClarificationSent: 'உங்கள் விளக்கம் சேமிக்கப்பட்டது.',
    docClarificationErr: 'விளக்கத்தை சேமிக்க முடியவில்லை.',
    docSignOutReturn: 'வெளியேறி உள்நுழைவுக்குத் திரும்புக',
    tabDoctors: 'மருத்துவர் சரிபார்ப்பு',
    tabUsers: 'பயனர் மேலாண்மை',
    tabAudit: 'தணிக்கை மற்றும் மதிப்பாய்வு',
    tabSystem: 'கணினி மற்றும் அமைப்பு',
    tabDiagnostics: 'நோயறிதல்',
    statPendingDoctors: 'நிலுவையில் உள்ள மருத்துவர்கள்',
    statApprovedDoctors: 'அங்கீகரிக்கப்பட்ட மருத்துவர்கள்',
    statPatients: 'நோயாளிகள்',
    statCaregivers: 'பராமரிப்பாளர்கள்',
    statRestricted: 'நிராகரிக்கப்பட்ட / இடைநிறுத்தப்பட்ட',
    filterAll: 'அனைத்தும்',
    filterPending: 'நிலுவை',
    filterInfoReq: 'தகவல் தேவை',
    filterApproved: 'அங்கீகரிக்கப்பட்டது',
    filterRejected: 'நிராகரிக்கப்பட்டது',
    filterSuspended: 'இடைநிறுத்தப்பட்டது',
    docAppsTitle: 'மருத்துவர் சான்றிதழ் சரிபார்ப்பு வரிசை',
    docAppsEmpty: 'தேர்ந்தெடுக்கப்பட்ட வடிகட்டிக்கு விண்ணப்பங்கள் இல்லை.',
    fieldPhone: 'தொலைபேசி',
    fieldQualification: 'தகுதி',
    fieldLicense: 'உரிம எண்',
    fieldAuthority: 'அதிகாரம்',
    fieldSpecialty: 'சிறப்புத் துறை',
    fieldInstitution: 'நிறுவனம்',
    fieldDocument: 'ஆவணம்',
    fieldSubmittedAt: 'சமர்ப்பிக்கப்பட்டது',
    fieldReviewedAt: 'கடைசி மதிப்பாய்வு',
    fieldApplicantResponse: 'விண்ணப்பதாரர் விளக்கம்',
    reviewNoteInputLabel: 'மதிப்பாய்வு குறிப்பு',
    reviewNotePlaceholder: 'சரிபார்ப்பு குறிப்பு அல்லது காரணத்தை உள்ளிடவும்...',
    btnApproveDoctor: 'அங்கீகரிக்கவும்',
    btnRequestInfo: 'தகவல் கோரவும்',
    btnRejectDoctor: 'நிராகரிக்கவும்',
    btnSuspendAccount: 'இடைநிறுத்தவும்',
    btnReactivateAccount: 'மீண்டும் செயல்படுத்தவும்',
    btnAssignPatient: 'நோயாளியை ஒதுக்கவும்',
    btnRevokeAssignment: 'ரத்து செய்',
    selectPatientPlaceholder: 'ஒதுக்க நோயாளியைத் தேர்ந்தெடுக்கவும்...',
    assignedPatientsLabel: 'ஒதுக்கப்பட்ட நோயாளிகள்',
    noPatientsToAssign: 'நோயாளிகள் இல்லை',
    docReviewRequiredErr: 'நிராகரிக்க அல்லது தகவல் கோர குறிப்பை உள்ளிடவும்.',
    userSearchPlaceholder: 'பெயர், மின்னஞ்சல், UID அல்லது உரிமம் தேடவும்...',
    roleAll: 'அனைத்து பாத்திரங்கள்',
    btnDeleteProfile: 'சுயவிவரத்தை நீக்கு',
    btnSoftDeactivate: 'முடக்கு',
    deleteModalTitle: 'பயனர் சுயவிவர நீக்கத்தை உறுதிப்படுத்தவும்',
    deleteModalHonestNote:
      'Firestore சுயவிவரத்தை நீக்கி இணைப்புகளை ரத்து செய்கிறது. Firebase Auth பயனரை நீக்க Firebase Console அல்லது Admin SDK ஸ்கிரிப்டைப் பயன்படுத்தவும்.',
    deleteConfirmBtn: 'சுயவிவரத்தை நீக்கு',
    cancelBtn: 'ரத்து செய்',
    refreshRegistryBtn: 'புதுப்பி',
    adminBootstrapRefTitle: 'நம்பகமான நிர்வாகி பூட்ஸ்டிராப் (Spark Free)',
    adminBootstrapRefSub: 'Firestore `users/{uid}` அல்லது `bootstrapAdmin.ts` மூலம் அமைக்கவும்.',
    verificationHistoryTitle: 'மதிப்பாய்வு வரலாறு',
    docStatusRuleBlockedNotice: 'சரிபார்ப்பு அங்கீகரிக்கப்படும் வரை மருத்துவப் பகுதி பூட்டப்பட்டிருக்கும்.',
  },
  te: {
    regDoctorPhoneLabel: 'సంప్రదింపు ఫోన్ నంబర్',
    regQualificationLabel: 'వైద్య అర్హత',
    regAuthorityLabel: 'నమోదు మండలి / అధికారం',
    regCredentialDocLabel: 'ధృవీకరణ పత్రం (ఐచ్ఛికం, PDF/JPG/PNG)',
    regCredentialDocHint: 'లైసెన్స్ లేదా డిగ్రీ సర్టిఫికెట్ జోడించండి (గరిష్టంగా 5 MB)',
    adminBootstrapTitle: 'నిర్వాహక ప్రొవిజనింగ్ & బూట్‌స్ట్రాప్ గైడ్',
    adminBootstrapIntro:
      'Firebase Authenticationలో మాత్రమే ఖాతా సృష్టించడం ద్వారా అడ్మిన్ అనుమతి రాదు. Firestoreలో `users/{uid}` పత్రాన్ని సృష్టించాలి.',
    adminBootstrapFirestoreTitle: 'Firestore Console అవసరమైన పత్రం',
    adminBootstrapSecurityNote:
      'జీరో-ట్రస్ట్ నియమం: పబ్లిక్ రిజిస్ట్రేషన్ ద్వారా అడ్మిన్ ఖాతాలు సృష్టించబడవు.',
    statusBadgePrefix: 'ధృవీకరణ స్థితి:',
    statusPendingLabel: 'ధృవీకరణ పెండింగ్',
    statusApprovedLabel: 'ఆమోదించబడిన వైద్యుడు',
    statusRejectedLabel: 'దరఖాస్తు తిరస్కరించబడింది',
    statusInfoRequiredLabel: 'అదనపు సమాచారం అవసరం',
    statusSuspendedLabel: 'సస్పెండ్ చేయబడింది',
    docRejectedTitle: 'వైద్యుని ధృవీకరణ తిరస్కరించబడింది',
    docRejectedBody: 'మీ వైద్య ధృవీకరణ దరఖాస్తు ఆమోదించబడలేదు.',
    docInfoReqTitle: 'అదనపు ధృవీకరణ సమాచారం అవసరం',
    docInfoReqBody: 'అడ్మిన్ ఆమోదానికి ముందు అదనపు వివరణ కోరారు.',
    docReviewNoteLabel: 'నిర్వాహక సమీక్ష గమనిక',
    docSubmittedCredsTitle: 'సమర్పించిన ఆధారాలు',
    docClarificationLabel: 'నిర్వాహకుడికి వివరణ',
    docClarificationPlaceholder: 'మీ నవీకరించిన రిజిస్ట్రేషన్ వివరాలను నమోదు చేయండి...',
    docSubmitClarificationBtn: 'వివరణ పంపండి',
    docClarificationSent: 'మీ వివరణ నమోదు చేయబడింది.',
    docClarificationErr: 'వివరణ సేవ్ చేయలేకపోయాము.',
    docSignOutReturn: 'సైన్ అవుట్ చేసి లాగిన్‌కు తిరిగి వెళ్ళండి',
    tabDoctors: 'వైద్యుల ధృవీకరణ',
    tabUsers: 'వినియోగదారు నిర్వహణ',
    tabAudit: 'ఆడిట్ & సమీక్షలు',
    tabSystem: 'సిస్టమ్ & సెటప్',
    tabDiagnostics: 'డయాగ్నోస్టిక్స్',
    statPendingDoctors: 'పెండింగ్ వైద్యులు',
    statApprovedDoctors: 'ఆమోదించిన వైద్యులు',
    statPatients: 'రోగులు',
    statCaregivers: 'సంరక్షకులు',
    statRestricted: 'తిరస్కరించిన / సస్పెండ్',
    filterAll: 'అన్నీ',
    filterPending: 'పెండింగ్',
    filterInfoReq: 'సమాచారం కోరింది',
    filterApproved: 'ఆమోదించినవి',
    filterRejected: 'తిరస్కరించినవి',
    filterSuspended: 'సస్పెండ్',
    docAppsTitle: 'వైద్యుల ఆధారాల ధృవీకరణ వరుస',
    docAppsEmpty: 'ఎంచుకున్న ఫిల్టర్‌కు దరఖాస్తులు లేవు.',
    fieldPhone: 'ఫోన్',
    fieldQualification: 'అర్హత',
    fieldLicense: 'లైసెన్స్ నం.',
    fieldAuthority: 'అధికారం',
    fieldSpecialty: 'ప్రత్యేకత',
    fieldInstitution: 'సంస్థ',
    fieldDocument: 'పత్రం',
    fieldSubmittedAt: 'సమర్పించిన తేదీ',
    fieldReviewedAt: 'చివరి సమీక్ష',
    fieldApplicantResponse: 'దరఖాస్తుదారు వివరణ',
    reviewNoteInputLabel: 'సమీక్ష గమనిక',
    reviewNotePlaceholder: 'ధృవీకరణ గమనిక లేదా కారణం నమోదు చేయండి...',
    btnApproveDoctor: 'ఆమోదించండి',
    btnRequestInfo: 'సమాచారం కోరండి',
    btnRejectDoctor: 'తిరస్కరించండి',
    btnSuspendAccount: 'సస్పెండ్ చేయండి',
    btnReactivateAccount: 'మళ్ళీ యాక్టివేట్ చేయండి',
    btnAssignPatient: 'రోగిని కేటాయించండి',
    btnRevokeAssignment: 'రద్దు చేయండి',
    selectPatientPlaceholder: 'కేటాయించడానికి రోగిని ఎంచుకోండి...',
    assignedPatientsLabel: 'కేటాయించిన రోగులు',
    noPatientsToAssign: 'రోగులు అందుబాటులో లేరు',
    docReviewRequiredErr: 'తిరస్కరించేటప్పుడు లేదా సమాచారం కోరేటప్పుడు గమనిక నమోదు చేయండి.',
    userSearchPlaceholder: 'పేరు, ఇమెయిల్, UID లేదా లైసెన్స్ ద్వారా శోధించండి...',
    roleAll: 'అన్ని పాత్రలు',
    btnDeleteProfile: 'ప్రొఫైల్ తొలగించండి',
    btnSoftDeactivate: 'నిష్క్రియం చేయండి',
    deleteModalTitle: 'ప్రొఫైల్ తొలగింపును నిర్ధారించండి',
    deleteModalHonestNote:
      'Firestore ప్రొఫైల్‌ను తొలగించి లింక్‌లను రద్దు చేస్తుంది. Auth లాగిన్ తొలగించడానికి Firebase Console లేదా Admin SDK స్క్రిప్ట్ ఉపయోగించండి.',
    deleteConfirmBtn: 'ప్రొఫైల్ తొలగించండి',
    cancelBtn: 'రద్దు',
    refreshRegistryBtn: 'రిఫ్రెష్',
    adminBootstrapRefTitle: 'విశ్వసనీయ అడ్మిన్ బూట్‌స్ట్రాప్ (Spark Free)',
    adminBootstrapRefSub: 'Firestore `users/{uid}` లేదా `bootstrapAdmin.ts` ద్వారా సెటప్ చేయండి.',
    verificationHistoryTitle: 'సమీక్ష చరిత్ర',
    docStatusRuleBlockedNotice: 'ఆమోదం పొందే వరకు క్లినికల్ వర్క్‌స్పేస్ లాక్ చేయబడుతుంది.',
  },
  kn: {
    regDoctorPhoneLabel: 'ಸಂಪರ್ಕ ಫೋನ್ ಸಂಖ್ಯೆ',
    regQualificationLabel: 'ವೈದ್ಯಕೀಯ ಅರ್ಹತೆ',
    regAuthorityLabel: 'ನೋಂದಣಿ ಮಂಡಳಿ / ಪ್ರಾಧಿಕಾರ',
    regCredentialDocLabel: 'ದೃಢೀಕರಣ ದಾಖಲೆ (ಐಚ್ಛಿಕ, PDF/JPG/PNG)',
    regCredentialDocHint: 'ಪರವಾನಗಿ ಅಥವಾ ಪದವಿ ಪ್ರಮಾಣಪತ್ರ ಲಗತ್ತಿಸಿ (ಗರಿಷ್ಠ 5 MB)',
    adminBootstrapTitle: 'ನಿರ್ವಾಹಕ ಪಾತ್ರ ಮತ್ತು ಬೂಟ್‌ಸ್ಟ್ರ್ಯಾಪ್ ಮಾರ್ಗದರ್ಶಿ',
    adminBootstrapIntro:
      'Firebase Authentication ನಲ್ಲಿ ಮಾತ್ರ ಖಾತೆ ರಚಿಸುವುದರಿಂದ ನಿರ್ವಾಹಕ ಪ್ರವೇಶ ಸಿಗುವುದಿಲ್ಲ. Firestore ನಲ್ಲಿ `users/{uid}` ದಾಖಲೆ ರಚಿಸಬೇಕು.',
    adminBootstrapFirestoreTitle: 'Firestore Console ಅಗತ್ಯ ದಾಖಲೆ',
    adminBootstrapSecurityNote:
      'ಶೂನ್ಯ-ನಂಬಿಕೆ ನಿಯಮ: ಸಾರ್ವಜನಿಕ ನೋಂದಣಿಯಿಂದ ನಿರ್ವಾಹಕ ಖಾತೆಗಳನ್ನು ರಚಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.',
    statusBadgePrefix: 'ಪರಿಶೀಲನಾ ಸ್ಥಿತಿ:',
    statusPendingLabel: 'ಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ',
    statusApprovedLabel: 'ಅನುಮೋದಿತ ವೈದ್ಯರು',
    statusRejectedLabel: 'ಅರ್ಜಿ ತಿರಸ್ಕರಿಸಲಾಗಿದೆ',
    statusInfoRequiredLabel: 'ಹೆಚ್ಚುವರಿ ಮಾಹಿತಿ ಅಗತ್ಯವಿದೆ',
    statusSuspendedLabel: 'ಅಮಾನತುಗೊಳಿಸಲಾಗಿದೆ',
    docRejectedTitle: 'ವೈದ್ಯರ ಪರಿಶೀಲನೆ ತಿರಸ್ಕರಿಸಲಾಗಿದೆ',
    docRejectedBody: 'ನಿಮ್ಮ ವೈದ್ಯಕೀಯ ಪರಿಶೀಲನಾ ಅರ್ಜಿಯನ್ನು ಅನುಮೋದಿಸಲಾಗಿಲ್ಲ.',
    docInfoReqTitle: 'ಹೆಚ್ಚುವರಿ ಪರಿಶೀಲನಾ ಮಾಹಿತಿ ಅಗತ್ಯ',
    docInfoReqBody: 'ಅನುಮೋದಿಸುವ ಮೊದಲು ನಿರ್ವಾಹಕರು ಹೆಚ್ಚುವರಿ ಸ್ಪಷ್ಟೀಕರಣ ಕೇಳಿದ್ದಾರೆ.',
    docReviewNoteLabel: 'ನಿರ್ವಾಹಕರ ವಿಮರ್ಶೆ ಟಿಪ್ಪಣಿ',
    docSubmittedCredsTitle: 'ಸಲ್ಲಿಸಿದ ಪ್ರಮಾಣಪತ್ರಗಳು',
    docClarificationLabel: 'ನಿರ್ವಾಹಕರಿಗೆ ಸ್ಪಷ್ಟೀಕರಣ',
    docClarificationPlaceholder: 'ನಿಮ್ಮ ನವೀಕರಿಸಿದ ನೋಂದಣಿ ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ...',
    docSubmitClarificationBtn: 'ಸ್ಪಷ್ಟೀಕರಣ ಸಲ್ಲಿಸಿ',
    docClarificationSent: 'ನಿಮ್ಮ ಸ್ಪಷ್ಟೀಕರಣವನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ.',
    docClarificationErr: 'ಸ್ಪಷ್ಟೀಕರಣವನ್ನು ಉಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
    docSignOutReturn: 'ಸೈನ್ ಔಟ್ ಮಾಡಿ ಮತ್ತು ಲಾಗಿನ್‌ಗೆ ಹಿಂತಿರುಗಿ',
    tabDoctors: 'ವೈದ್ಯರ ಪರಿಶೀಲನೆ',
    tabUsers: 'ಬಳಕೆದಾರ ನಿರ್ವಹಣೆ',
    tabAudit: 'ಆಡಿಟ್ ಮತ್ತು ವಿಮರ್ಶೆಗಳು',
    tabSystem: 'ವ್ಯವಸ್ಥೆ ಮತ್ತು ಸೆಟಪ್',
    tabDiagnostics: 'ರೋಗನಿರ್ಣಯ',
    statPendingDoctors: 'ಬಾಕಿ ವೈದ್ಯರು',
    statApprovedDoctors: 'ಅನುಮೋದಿತ ವೈದ್ಯರು',
    statPatients: 'ರೋಗಿಗಳು',
    statCaregivers: 'ಆರೈಕೆದಾರರು',
    statRestricted: 'ತಿರಸ್ಕೃತ / ಅಮಾನತು',
    filterAll: 'ಎಲ್ಲಾ',
    filterPending: 'ಬಾಕಿ',
    filterInfoReq: 'ಮಾಹಿತಿ ಕೋರಲಾಗಿದೆ',
    filterApproved: 'ಅನುಮೋದಿತ',
    filterRejected: 'ತಿರಸ್ಕೃತ',
    filterSuspended: 'ಅಮಾನತು',
    docAppsTitle: 'ವೈದ್ಯರ ಪ್ರಮಾಣಪತ್ರ ಪರಿಶೀಲನಾ ಸರತಿ',
    docAppsEmpty: 'ಆಯ್ಕೆ ಮಾಡಿದ ಫಿಲ್ಟರ್‌ಗೆ ಯಾವುದೇ ಅರ್ಜಿಗಳಿಲ್ಲ.',
    fieldPhone: 'ಫೋನ್',
    fieldQualification: 'ಅರ್ಹತೆ',
    fieldLicense: 'ಪರವಾನಗಿ ಸಂಖ್ಯೆ',
    fieldAuthority: 'ಪ್ರಾಧಿಕಾರ',
    fieldSpecialty: 'ವಿಶೇಷತೆ',
    fieldInstitution: 'ಸಂಸ್ಥೆ',
    fieldDocument: 'ದಾಖಲೆ',
    fieldSubmittedAt: 'ಸಲ್ಲಿಸಲಾಗಿದೆ',
    fieldReviewedAt: 'ಕೊನೆಯ ವಿಮರ್ಶೆ',
    fieldApplicantResponse: 'ಅರ್ಜಿದಾರರ ಸ್ಪಷ್ಟೀಕರಣ',
    reviewNoteInputLabel: 'ವಿಮರ್ಶೆ ಟಿಪ್ಪಣಿ',
    reviewNotePlaceholder: 'ಪರಿಶೀಲನಾ ಟಿಪ್ಪಣಿ ಅಥವಾ ಕಾರಣವನ್ನು ನಮೂದಿಸಿ...',
    btnApproveDoctor: 'ಅನುಮೋದಿಸಿ',
    btnRequestInfo: 'ಮಾಹಿತಿ ಕೋರಿ',
    btnRejectDoctor: 'ತಿರಸ್ಕರಿಸಿ',
    btnSuspendAccount: 'ಅಮಾನತುಗೊಳಿಸಿ',
    btnReactivateAccount: 'ಮರುಸಕ್ರಿಯಗೊಳಿಸಿ',
    btnAssignPatient: 'ರೋಗಿಯನ್ನು ನಿಯೋಜಿಸಿ',
    btnRevokeAssignment: 'ರದ್ದುಮಾಡಿ',
    selectPatientPlaceholder: 'ನಿಯೋಜಿಸಲು ರೋಗಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ...',
    assignedPatientsLabel: 'ನಿಯೋಜಿತ ರೋಗಿಗಳು',
    noPatientsToAssign: 'ಯಾವುದೇ ರೋಗಿಗಳು ಲಭ್ಯವಿಲ್ಲ',
    docReviewRequiredErr: 'ತಿರಸ್ಕರಿಸುವಾಗ ಅಥವಾ ಮಾಹಿತಿ ಕೋರುವಾಗ ಟಿಪ್ಪಣಿ ನಮೂದಿಸಿ.',
    userSearchPlaceholder: 'ಹೆಸರು, ಇಮೇಲ್, UID ಅಥವಾ ಪರವಾನಗಿ ಹುಡುಕಿ...',
    roleAll: 'ಎಲ್ಲಾ ಪಾತ್ರಗಳು',
    btnDeleteProfile: 'ಪ್ರೊಫೈಲ್ ತೆಗೆದುಹಾಕಿ',
    btnSoftDeactivate: 'ನಿಷ್ಕ್ರಿಯಗೊಳಿಸಿ',
    deleteModalTitle: 'ಪ್ರೊಫೈಲ್ ತೆಗೆದುಹಾಕುವಿಕೆ ದೃಢೀಕರಿಸಿ',
    deleteModalHonestNote:
      'Firestore ಪ್ರೊಫೈಲ್ ತೆಗೆದು ಸಕ್ರಿಯ ಲಿಂಕ್‌ಗಳನ್ನು ರದ್ದುಗೊಳಿಸುತ್ತದೆ. Auth ಲಾಗಿನ್ ಅಳಿಸಲು Firebase Console ಅಥವಾ Admin SDK ಸ್ಕ್ರಿಪ್ಟ್ ಬಳಸಿ.',
    deleteConfirmBtn: 'ಪ್ರೊಫೈಲ್ ತೆಗೆದುಹಾಕಿ',
    cancelBtn: 'ರದ್ದುಮಾಡಿ',
    refreshRegistryBtn: 'ರಿಫ್ರೆಶ್',
    adminBootstrapRefTitle: 'ವಿಶ್ವಾಸಾರ್ಹ ಅಡ್ಮಿನ್ ಬೂಟ್‌ಸ್ಟ್ರ್ಯಾಪ್ (Spark Free)',
    adminBootstrapRefSub: 'Firestore `users/{uid}` ಅಥವಾ `bootstrapAdmin.ts` ಮೂಲಕ ಹೊಂದಿಸಿ.',
    verificationHistoryTitle: 'ವಿಮರ್ಶೆ ಇತಿಹಾಸ',
    docStatusRuleBlockedNotice: 'ಅನುಮೋದನೆಗೊಳ್ಳುವವರೆಗೆ ಕ್ಲಿನಿಕಲ್ ಕಾರ್ಯಕ್ಷೇತ್ರ ಲಾಕ್ ಆಗಿರುತ್ತದೆ.',
  },
};

export const getGovernanceUi = (language?: string): GovernanceUi =>
  GOV_UI[normLang(language)];
